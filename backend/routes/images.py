import logging
import re
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request
from google import genai
from google.genai import types
from slowapi import Limiter
from slowapi.util import get_remote_address

from auth import get_current_user
from config import ENABLE_IMAGE_GENERATION, GEMINI_IMAGE_MODEL, GOOGLE_API_KEY, MOCK_MODE
from models import GenerateImageRequest, GenerateImageResponse
from services.firebase import db_async
from services.storage import compress_image, storage_bucket

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["images"])

limiter = Limiter(key_func=get_remote_address)

# Initialize Gemini client (for image generation)
gemini_client = genai.Client(api_key=GOOGLE_API_KEY)


@router.post("/generate-image", response_model=GenerateImageResponse)
@limiter.limit("5/minute")
async def generate_image(
    request: Request,
    data: GenerateImageRequest,
    uid: Annotated[str, Depends(get_current_user)],
):
    if not ENABLE_IMAGE_GENERATION:
        raise HTTPException(status_code=403, detail="Image generation feature is disabled.")

    if MOCK_MODE:
        logger.info("MOCK_MODE enabled: Returning mock image")
        # Return a nice placeholder food image
        return {"image_url": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c"}

    if not storage_bucket:
        raise HTTPException(status_code=503, detail="Cloud Storage not configured.")

    recipe = data.recipe
    recipe_id = data.recipe_id

    if not recipe_id or not re.match(r"^[a-zA-Z0-9]+$", recipe_id):
        raise HTTPException(status_code=400, detail="Valid recipe_id is required")

    # Build recipe text from recipe object
    if isinstance(recipe, dict):
        recipe_text = f"{recipe.get('title', '')}: {recipe.get('description', '')}"
    else:
        recipe_text = str(recipe)

    if not recipe_text or len(recipe_text) < 10:
        raise HTTPException(status_code=400, detail="Valid recipe data is required")

    # Limit recipe text length
    recipe_text = recipe_text[:4000]

    logger.info(f"Generate image request from user {uid}")

    # Build an image prompt for Gemini
    image_prompt = (
        f"Generate a realistic, high-quality photo of the finished dish: {recipe_text}. "
        "The image should show appetizing food photography with professional plating, "
        "natural lighting, and a clean background. Show only the food, no text or labels."
    )

    try:
        # Note: genai client doesn't have async version, keeping sync call
        # This will still run in thread pool via FastAPI's handling
        response = gemini_client.models.generate_content(
            model=GEMINI_IMAGE_MODEL,
            contents=image_prompt,
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE"],
                image_config=types.ImageConfig(
                    aspect_ratio="16:9",
                ),
            ),
        )

        # Extract image from response
        for part in response.candidates[0].content.parts:
            if part.inline_data is not None:
                image_data = part.inline_data.data
                original_size_kb = len(image_data) / 1024
                logger.info(f"Generated image size: {original_size_kb:.1f} KB")

                # Compress image to reduce storage costs
                image_data, mime_type = compress_image(image_data, max_size_kb=500)

                # Upload to Cloud Storage
                blob_name = f"recipe-images/{recipe_id}.jpg"
                blob = storage_bucket.blob(blob_name)
                blob.upload_from_string(image_data, content_type=mime_type)
                blob.make_public()
                image_url = blob.public_url
                logger.info(f"Uploaded image to GCS: {blob_name}")

                # Store image URL in Firestore (async)
                try:
                    doc_ref = db_async.collection("recipes").document(recipe_id)
                    doc = await doc_ref.get()
                    if doc.exists and doc.to_dict().get("uid") == uid:
                        await doc_ref.update({"image_url": image_url})
                        logger.info(f"Saved image URL for recipe {recipe_id}")
                    else:
                        logger.warning(f"Recipe {recipe_id} not found or not owned by user")
                except Exception as e:
                    logger.error(f"Failed to save image URL to recipe: {str(e)}")

                logger.info(f"Generated image for user {uid}")
                return {"image_url": image_url}

        raise HTTPException(status_code=500, detail="No image generated")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating image: {str(e)}")
        raise HTTPException(status_code=500, detail="Error generating image") from e
