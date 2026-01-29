import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
import os

# Import services
from services.limiter import limiter
from config import FRONTEND_URLS, PORT

# Import route routers
from routes.recipes import router as recipes_router
from routes.favorites import router as favorites_router
from routes.health import router as health_router
from routes.images import router as images_router
from routes.preferences import router as preferences_router
from routes.share import router as share_router

logger = logging.getLogger(__name__)

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

@app.get("/")
async def root():
    return {"message": "RecipeLab API is running"}


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
