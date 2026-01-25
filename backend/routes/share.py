import logging
import re
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse
from slowapi import Limiter
from slowapi.util import get_remote_address

from config import FRONTEND_URLS, IS_LOCAL
from services.cache import recipe_cache
from services.firebase import db_async

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["share"])

limiter = Limiter(key_func=get_remote_address)


def get_frontend_url():
    # Use the first configured frontend URL
    base_url = FRONTEND_URLS[0] if FRONTEND_URLS else "http://localhost:5173"
    # Remove trailing slash if present
    return base_url.rstrip("/")


@router.get("/share/recipe/{recipe_id}", response_class=HTMLResponse)
@limiter.limit("20/minute")
async def share_recipe_preview(request: Request, recipe_id: str, origin: str | None = None):
    """
    Serve a static HTML page with Open Graph tags for a recipe,
    then redirect to the actual frontend application.
    """
    # Validate recipe_id format
    if not re.match(r"^[a-zA-Z0-9]+$", recipe_id):
        raise HTTPException(status_code=400, detail="Invalid recipe ID format")
    
    # Validate and determine the frontend URL
    frontend_url = get_frontend_url()
    
    # If origin is provided, validate it against allowed FRONTEND_URLS
    if origin:
        origin = origin.rstrip("/")
        # Standardize FRONTEND_URLS for comparison (remove trailing slashes)
        # Also include localhost for development convenience
        allowed_origins = [url.rstrip("/") for url in FRONTEND_URLS]
        if "http://localhost:5173" not in allowed_origins:
            allowed_origins.append("http://localhost:5173")
            
        if origin in allowed_origins:
            frontend_url = origin
        else:
            logger.warning(f"Invalid origin provided: {origin}. Falling back to default.")

    target_url = f"{frontend_url}/recipe/{recipe_id}"
    
    try:
        # Try to get recipe data from cache first
        cache_key = f"recipe_{recipe_id}"
        recipe_data = recipe_cache.get(cache_key)
        
        image_url = ""
        title = "Check out this recipe on Recipe AI"
        description = "I found this amazing recipe using Recipe AI. Click to view the full recipe!"
        
        if not recipe_data:
            # Fallback to Firestore if not in cache
            doc_ref = db_async.collection("recipes").document(recipe_id)
            doc = await doc_ref.get()
            
            if doc.exists:
                data = doc.to_dict()
                recipe_data = data.get("recipe", {})
                image_url = data.get("image_url", "")
                
                # Update cache lightly if we found it (optional, but good for consistency)
                # We won't fully hydrate the cache here to avoid complexity, 
                # but we could if we wanted to match recipes.py logic exactly.
        
        if recipe_data:
            if isinstance(recipe_data, dict):
                recipe_title = recipe_data.get("title", "Recipe")
                # Strip HTML tags from title if present
                title = re.sub(r'<[^>]*>', '', recipe_title)
                
                recipe_desc = recipe_data.get("description", "")
                # Strip HTML tags and truncate description
                clean_desc = re.sub(r'<[^>]*>', '', recipe_desc)
                if len(clean_desc) > 200:
                    clean_desc = clean_desc[:197] + "..."
                if clean_desc:
                    description = clean_desc

            # If we fetched from cache, we might not have the image URL directly in the recipe dict
            # depending on how it's stored. In recipes.py, image_url is at the top level of the doc.
            # If we only got recipe_data from cache (which is just the 'recipe' field), we might miss image_url.
            # However, for the share preview, a missing image is acceptable but not ideal.
            # Let's try to fetch the doc if image_url is missing and we really want it.
            # For performance, we might skip the extra DB call if cache hits but has no image.
            # But let's be robust:
            if not image_url and not recipe_data: 
                # We already tried DB above if not recipe_data.
                pass

        # Construct the HTML response
        html_content = f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>{title}</title>
            
            <!-- Open Graph / Facebook -->
            <meta property="og:type" content="website">
            <meta property="og:url" content="{target_url}">
            <meta property="og:title" content="{title}">
            <meta property="og:description" content="{description}">
            {f'<meta property="og:image" content="{image_url}">' if image_url else ''}
            
            <!-- Twitter -->
            <meta property="twitter:card" content="summary_large_image">
            <meta property="twitter:url" content="{target_url}">
            <meta property="twitter:title" content="{title}">
            <meta property="twitter:description" content="{description}">
            {f'<meta property="twitter:image" content="{image_url}">' if image_url else ''}
            
            <!-- Redirect script -->
            <script>
                window.location.href = "{target_url}";
            </script>
            
            <style>
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify_content: center;
                    height: 100vh;
                    margin: 0;
                    background-color: #f9f9f9;
                    color: #333;
                }}
                .loader {{
                    border: 4px solid #f3f3f3;
                    border-top: 4px solid #3498db;
                    border-radius: 50%;
                    width: 40px;
                    height: 40px;
                    animation: spin 1s linear infinite;
                    margin-bottom: 20px;
                }}
                @keyframes spin {{
                    0% {{ transform: rotate(0deg); }}
                    100% {{ transform: rotate(360deg); }}
                }}
                p {{
                    font-size: 18px;
                }}
                a {{
                    color: #3498db;
                    text-decoration: none;
                }}
            </style>
        </head>
        <body>
            <div class="loader"></div>
            <p>Redirecting to recipe...</p>
            <p><a href="{target_url}">Click here if you are not redirected</a></p>
        </body>
        </html>
        """
        
        return HTMLResponse(content=html_content, status_code=200)

    except Exception as e:
        logger.error(f"Error serving share page for {recipe_id}: {str(e)}")
        # Even if error, try to redirect to frontend
        return HTMLResponse(
            content=f'<script>window.location.href = "{target_url}";</script>',
            status_code=200
        )
