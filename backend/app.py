import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
import os
import re
from pathlib import Path

# Import services to initialize them
from services.cache import recipe_cache
from services.firebase import db_async
import services.firebase  # noqa: F401
from config import FRONTEND_URLS, IS_LOCAL, PORT
from routes.favorites import router as favorites_router
from routes.health import router as health_router
from routes.images import router as images_router
from routes.preferences import router as preferences_router
from routes.share import router as share_router

# Import route routers
from routes.recipes import router as recipes_router

logger = logging.getLogger(__name__)

# Setup rate limiting (disabled in local development)
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[] if IS_LOCAL else ["200 per day", "50 per hour"],
    enabled=not IS_LOCAL,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting RecipeLab backend...")
    yield
    # Shutdown
    logger.info("Shutting down RecipeLab backend...")


app = FastAPI(
    title="RecipeLab API",
    description="AI-powered recipe generation backend",
    version="0.1.0",
    lifespan=lifespan,
)

# Add rate limiter to app state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_URLS + ["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(recipes_router)
app.include_router(favorites_router)
app.include_router(images_router)
app.include_router(health_router)
app.include_router(preferences_router)
app.include_router(share_router)

# --- Frontend Serving & OG Tag Injection ---

# Path to the frontend build directory
# Assuming backend/app.py is running, and frontend is at ../frontend relative to backend
BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIST = BASE_DIR.parent / "frontend" / "dist"

@app.get("/recipe/{recipe_id}", response_class=HTMLResponse)
async def serve_recipe_page(request: Request, recipe_id: str):
    """
    Serve the React app's index.html but with injected Open Graph tags
    for the specific recipe.
    """
    index_path = FRONTEND_DIST / "index.html"
    if not index_path.exists():
        # Fallback if build not found (e.g. in dev without build)
        return JSONResponse(status_code=404, content={"error": "Frontend build not found. Run 'npm run build'"})

    # Fetch recipe data for metadata
    # Try cache first
    cache_key = f"recipe_{recipe_id}"
    recipe_dict = recipe_cache.get(cache_key)
    
    image_url = ""
    title = "RecipeLab"
    description = "AI-powered recipe generation"

    if not recipe_dict:
        # Fallback to Firestore
        try:
            doc_ref = db_async.collection("recipes").document(recipe_id)
            doc = await doc_ref.get()
            if doc.exists:
                data = doc.to_dict()
                recipe_dict = data.get("recipe", {})
                image_url = data.get("image_url", "")
        except Exception as e:
            logger.error(f"Error fetching recipe for metadata: {e}")
    
    if recipe_dict:
        raw_title = recipe_dict.get("title", "Recipe")
        title = re.sub(r'<[^>]*>', '', raw_title)
        
        raw_desc = recipe_dict.get("description", "")
        clean_desc = re.sub(r'<[^>]*>', '', raw_desc)
        if len(clean_desc) > 200:
            clean_desc = clean_desc[:197] + "..."
        if clean_desc:
            description = clean_desc

    # Read index.html
    stats_html = index_path.read_text(encoding="utf-8")

    # Inject tags
    # We replace strict exact strings or standard meta tags in the built HTML.
    # Vite templates usually have <title>...</title> and maybe some default metas.
    # A robust way is to replace the <head> closing tag with our tags + </head>.
    
    og_tags = f"""
    <title>{title}</title>
    <meta property="og:type" content="website" />
    <meta property="og:title" content="{title}" />
    <meta property="og:description" content="{description}" />
    <meta property="og:url" content="{str(request.url)}" />
    """
    if image_url:
        og_tags += f'<meta property="og:image" content="{image_url}" />\n'
        og_tags += f'<meta property="twitter:image" content="{image_url}" />\n'
    
    og_tags += f"""
    <meta property="twitter:card" content="summary_large_image" />
    <meta property="twitter:title" content="{title}" />
    <meta property="twitter:description" content="{description}" />
    """

    # Replace title
    # Note: Vite might minify HTML, so regex replacement is safer than exact string match for <title>
    stats_html = re.sub(r'<title>.*?</title>', '', stats_html)
    
    # Inject before </head>
    final_html = stats_html.replace('</head>', f'{og_tags}</head>')

    return HTMLResponse(content=final_html)


# Serve static assets (JS, CSS, images)
# We mount this AFTER specific routes so it doesn't shadow them.
if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")
    # You might also want to mount other root files like favicon.svg, manifest, etc.
    # For simplicity, let's just catch-all everything else and serve index.html or the file if it exists?
    # Actually, explicit mounts are safer.
    # Typically Vite build puts assets in /assets. Root files need handling.
    
    @app.get("/{catchall:path}")
    async def serve_catchall(request: Request, catchall: str):
        # Check if file exists in dist (e.g. favicon.svg, robots.txt)
        file_path = FRONTEND_DIST / catchall
        if file_path.is_file():
            from fastapi.responses import FileResponse
            return FileResponse(file_path)
            
        # Otherwise serve index.html for SPA routing
        return FileResponse(FRONTEND_DIST / "index.html")
else:
    logger.warning("Frontend dist directory not found. Static serving disabled.")


@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    return JSONResponse(status_code=404, content={"error": "Resource not found"})


@app.exception_handler(500)
async def server_error_handler(request: Request, exc):
    logger.error(f"Server error: {str(exc)}")
    return JSONResponse(status_code=500, content={"error": "Internal server error"})


if __name__ == "__main__":
    import uvicorn

    # Use a production ASGI server in production!
    # For development only:
    uvicorn.run("app:app", host="0.0.0.0", port=PORT, reload=True)
