import os
import re
import logging
from flask import Blueprint, request, jsonify, g
from google import genai
from google.genai import types

from config import GOOGLE_API_KEY, GEMINI_IMAGE_MODEL, ENABLE_IMAGE_GENERATION
from auth import auth_required
from services.firebase import db
from services.storage import storage_bucket, compress_image

logger = logging.getLogger(__name__)

images_bp = Blueprint("images", __name__)

# Initialize Gemini client (for image generation)
gemini_client = genai.Client(api_key=GOOGLE_API_KEY)


@images_bp.route("/api/generate-image", methods=["POST"])
@auth_required
def generate_image():
    if not ENABLE_IMAGE_GENERATION:
        return jsonify({"error": "Image generation feature is disabled."}), 403

    if not storage_bucket:
        return jsonify({"error": "Cloud Storage not configured."}), 503

    uid = g.uid
    data = request.get_json()
    recipe = data.get("recipe", {})
    recipe_id = data.get("recipe_id", "")

    if not recipe_id or not re.match(r"^[a-zA-Z0-9]+$", recipe_id):
        return jsonify({"error": "Valid recipe_id is required"}), 400

    # Build recipe text from recipe object
    if isinstance(recipe, dict):
        recipe_text = f"{recipe.get('title', '')}: {recipe.get('description', '')}"
    else:
        recipe_text = str(recipe)

    if not recipe_text or len(recipe_text) < 10:
        return jsonify({"error": "Valid recipe data is required"}), 400

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

                # Store image URL in Firestore
                try:
                    doc_ref = db.collection("recipes").document(recipe_id)
                    doc = doc_ref.get()
                    if doc.exists and doc.to_dict().get("uid") == uid:
                        doc_ref.update({"image_url": image_url})
                        logger.info(f"Saved image URL for recipe {recipe_id}")
                    else:
                        logger.warning(f"Recipe {recipe_id} not found or not owned by user")
                except Exception as e:
                    logger.error(f"Failed to save image URL to recipe: {str(e)}")

                logger.info(f"Generated image for user {uid}")
                return jsonify({"image_url": image_url})

        return jsonify({"error": "No image generated"}), 500
    except Exception as e:
        logger.error(f"Error generating image: {str(e)}")
        return jsonify({"error": "Error generating image"}), 500
