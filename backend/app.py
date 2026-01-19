import os
import datetime
import re
from functools import wraps
import logging
from cachetools import TTLCache
import litellm
from openai import OpenAI
from flask import Flask, request, jsonify, g
import firebase_admin
from firebase_admin import credentials, firestore
from firebase_admin import auth as firebase_auth
from google.cloud.firestore_v1.base_query import FieldFilter
from dotenv import load_dotenv
from flask_cors import CORS
from pydantic import BaseModel, Field
from typing import List
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# Initialize Firebase Admin with your service account key
try:
    cred = credentials.Certificate("serviceAccountKey.json")
    firebase_admin.initialize_app(cred)
    db = firestore.client()
except Exception as e:
    logger.error(f"Firebase initialization error: {e}")
    raise

# Initialize OpenAI client (for image generation)
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# LiteLLM model configuration
LLM_MODEL = os.getenv("LLM_MODEL", "claude-sonnet-4-5")

app = Flask(__name__)

# Cache for tokens and recipe data
token_cache = TTLCache(maxsize=1000, ttl=3600)  # Cache tokens for 1 hour
recipe_cache = TTLCache(maxsize=100, ttl=300)  # Cache recipes for 5 minutes

# Setup rate limiting
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://",
)

# Configure CORS with secure options
frontend_urls = os.getenv("FRONTEND_URLS", "http://localhost:5173").split(",")
CORS(
    app,
    resources={r"/api/*": {"origins": frontend_urls + ["http://localhost:5173"]}},
)


class Recipe(BaseModel):
    title: str
    description: str
    ingredients: List[str]
    instructions: List[str]
    notes: List[str] = []


class RecipeRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=1000)


class UpdateRecipeRequest(BaseModel):
    id: str = Field(..., min_length=10, max_length=100)
    original_recipe: Recipe
    modifications: str = Field(..., min_length=1, max_length=1000)


# Function to validate token and get UID
def get_uid_from_token(token):
    # Check cache first
    if token in token_cache:
        return token_cache[token]

    try:
        decoded_token = firebase_auth.verify_id_token(token)
        uid = decoded_token["uid"]
        # Store in cache
        token_cache[token] = uid
        return uid
    except Exception as e:
        logger.warning(f"Invalid token: {str(e)}")
        return None


# Authentication decorator
def auth_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            return jsonify({"error": "Authorization header missing"}), 401

        token = auth_header.split("Bearer ")[-1]
        uid = get_uid_from_token(token)

        if not uid:
            return jsonify({"error": "Invalid or expired token"}), 401

        g.uid = uid
        return f(*args, **kwargs)

    return decorated_function


# Validate input data with Pydantic
def validate_request(model_class):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                data = request.get_json()
                logger.info(f"Received request data: {data}")
                model_class(**data)
                return f(*args, **kwargs)
            except Exception as e:
                logger.error(f"Validation error: {str(e)}")
                return jsonify({"error": f"Invalid request data: {str(e)}"}), 400

        return decorated_function

    return decorator


@app.route("/api/generate-recipe", methods=["POST"])
@auth_required
@validate_request(RecipeRequest)
@limiter.limit("10 per minute")
def generate_recipe():
    data = request.get_json()
    prompt = data.get("prompt", "")
    uid = g.uid

    logger.info(f"Generate recipe request from user {uid}")

    system_message = """You are a creative chef with the precision and depth of recipes found on Serious Eats and the expertise of Chef J. Kenji López-Alt and Chef Chris Young. 
When given a prompt, generate a recipe that is both detailed and practical, reflecting the thorough testing and clear instructions characteristic of those sources. Write with warmth and personality while maintaining technical accuracy."""

    try:
        response = litellm.completion(
            model=LLM_MODEL,
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": prompt},
            ],
            max_tokens=2000,
            response_format=Recipe,
        )

        usage = response.usage
        logger.info(
            f"Token usage - Prompt: {usage.prompt_tokens}, Completion: {usage.completion_tokens}, Total: {usage.total_tokens}"
        )

        recipe = Recipe.model_validate_json(response.choices[0].message.content)
        recipe_dict = recipe.model_dump()

        # Save the generated recipe into Firestore
        recipe_data = {
            "uid": uid,
            "prompt": prompt,
            "recipe": recipe_dict,
            "timestamp": datetime.datetime.now(datetime.timezone.utc),
            "archived": False,
        }

        _, doc_ref = db.collection("recipes").add(recipe_data)
        recipe_id = doc_ref.id

        # Update cache
        cache_key = f"recipe_{recipe_id}"
        recipe_cache[cache_key] = recipe_dict

        return jsonify({"recipe": recipe_dict, "id": recipe_id})
    except Exception as e:
        logger.error(f"Error generating recipe: {str(e)}")
        return jsonify({"error": "Error generating recipe"}), 500


@app.route("/api/update-recipe", methods=["POST"])
@auth_required
@validate_request(UpdateRecipeRequest)
@limiter.limit("10 per minute")
def update_recipe():
    data = request.get_json()
    recipe_id = data.get("id")
    original_recipe = data.get("original_recipe", {})
    modifications = data.get("modifications", "")
    uid = g.uid

    # Sanitize inputs
    recipe_id = recipe_id.strip()
    modifications = modifications.strip()

    # Convert recipe dict to formatted string for the prompt
    original_recipe_str = (
        f"Title: {original_recipe.get('title', '')}\n\n"
        f"Description: {original_recipe.get('description', '')}\n\n"
        f"Ingredients:\n"
        + "\n".join(f"- {i}" for i in original_recipe.get("ingredients", []))
        + "\n\n"
        f"Instructions:\n"
        + "\n".join(
            f"{n+1}. {s}" for n, s in enumerate(original_recipe.get("instructions", []))
        )
        + "\n\n"
        f"Notes:\n" + "\n".join(f"- {n}" for n in original_recipe.get("notes", []))
    )

    logger.info(f"Update recipe request for recipe {recipe_id} from user {uid}")

    doc_ref = db.collection("recipes").document(recipe_id)
    doc = doc_ref.get()
    if not doc.exists:
        return jsonify({"error": "Recipe not found"}), 404

    data_doc = doc.to_dict()

    # Check if the recipe belongs to the current user
    if data_doc.get("uid") != uid:
        logger.warning(
            f"Unauthorized access attempt to recipe {recipe_id} by user {uid}"
        )
        return jsonify({"error": "Unauthorized access"}), 403

    # Build a prompt that instructs the model to update the recipe
    update_prompt = (
        "Below is a recipe:\n\n"
        f"{original_recipe_str}\n\n"
        "Modify this recipe based on the following instructions, changing only the specified parts:\n\n"
        f"{modifications}"
    )

    try:
        response = litellm.completion(
            model=LLM_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": "You are a creative chef who is skilled at editing recipes while preserving their original structure and style.",
                },
                {"role": "user", "content": update_prompt},
            ],
            max_tokens=2000,
            response_format=Recipe,
        )

        usage = response.usage
        logger.info(
            f"Update token usage - Prompt: {usage.prompt_tokens}, Completion: {usage.completion_tokens}, Total: {usage.total_tokens}"
        )

        updated_recipe = Recipe.model_validate_json(response.choices[0].message.content)
        updated_recipe_dict = updated_recipe.model_dump()

        # Update the existing document in Firestore
        doc_ref.update(
            {
                "recipe": updated_recipe_dict,
                "timestamp": datetime.datetime.now(datetime.timezone.utc),
            }
        )

        # Update cache
        cache_key = f"recipe_{recipe_id}"
        recipe_cache[cache_key] = updated_recipe_dict

        return jsonify({"recipe": updated_recipe_dict})
    except Exception as e:
        logger.error(f"Error updating recipe {recipe_id}: {str(e)}")
        return jsonify({"error": "Error updating recipe"}), 500


@app.route("/api/recipe/<recipe_id>", methods=["GET"])
def get_recipe(recipe_id):
    try:
        # Validate recipe_id format
        if not re.match(r"^[a-zA-Z0-9]+$", recipe_id):
            return jsonify({"error": "Invalid recipe ID format"}), 400

        doc_ref = db.collection("recipes").document(recipe_id)
        doc = doc_ref.get()
        if not doc.exists:
            return jsonify({"error": "Recipe not found"}), 404

        data = doc.to_dict()

        # Get recipe data from cache or Firestore
        cache_key = f"recipe_{recipe_id}"
        recipe = recipe_cache.get(cache_key, data.get("recipe", ""))
        if recipe != data.get("recipe", ""):
            recipe_cache[cache_key] = data.get("recipe", "")

        uid = data.get("uid", "")
        timestamp = data.get("timestamp", "")

        # Get user info once and cache it
        user_info = {"displayName": ""}
        try:
            user = firebase_auth.get_user(uid)
            user_info["displayName"] = user.display_name if user.display_name else ""
        except Exception as e:
            logger.warning(f"Could not get user info for {uid}: {str(e)}")

        return jsonify(
            {
                "recipe": recipe,
                "timestamp": timestamp,
                "uid": uid,
                "displayName": user_info["displayName"],
            }
        )
    except Exception as e:
        logger.error(f"Error retrieving recipe {recipe_id}: {str(e)}")
        return jsonify({"error": "Error retrieving recipe"}), 500


@app.route("/api/recipe-history", methods=["GET"])
@auth_required
@limiter.limit("30 per minute")
def get_recipe_history():
    uid = g.uid

    # Optional pagination parameters
    limit = min(int(request.args.get("limit", 20)), 50)  # Max 50 items per page
    offset = int(request.args.get("offset", 0))

    logger.info(f"Recipe history request from user {uid}")

    try:
        # Create an efficient query with pagination
        recipes_ref = (
            db.collection("recipes")
            .where(filter=FieldFilter("uid", "==", uid))
            .where(filter=FieldFilter("archived", "==", False))
            .order_by("timestamp", direction=firestore.Query.DESCENDING)
            .limit(limit)
            .offset(offset)
        )

        docs = recipes_ref.stream()
        history = []

        for doc in docs:
            data = doc.to_dict()
            history.append(
                {
                    "id": doc.id,
                    "recipe": data.get("recipe", ""),
                    "timestamp": data.get("timestamp", ""),
                }
            )

        return jsonify({"history": history, "offset": offset, "limit": limit})
    except Exception as e:
        logger.error(f"Error retrieving recipe history for user {uid}: {str(e)}")
        return jsonify({"error": "Error retrieving recipe history"}), 500


@app.route("/api/recipe/<recipe_id>/archive", methods=["PATCH"])
@auth_required
def archive_recipe(recipe_id):
    uid = g.uid

    # Validate recipe_id format
    if not re.match(r"^[a-zA-Z0-9]+$", recipe_id):
        return jsonify({"error": "Invalid recipe ID format"}), 400

    logger.info(f"Archive recipe request for recipe {recipe_id} from user {uid}")

    try:
        doc_ref = db.collection("recipes").document(recipe_id)
        doc = doc_ref.get()
        if not doc.exists:
            return jsonify({"error": "Recipe not found"}), 404

        data = doc.to_dict()
        if data.get("uid") != uid:
            logger.warning(
                f"Unauthorized archive attempt for recipe {recipe_id} by user {uid}"
            )
            return jsonify({"error": "Unauthorized access"}), 403

        doc_ref.update(
            {
                "archived": True,
                "archivedAt": datetime.datetime.now(datetime.timezone.utc),
            }
        )

        # Remove from cache if present
        cache_key = f"recipe_{recipe_id}"
        if cache_key in recipe_cache:
            del recipe_cache[cache_key]

        return jsonify({"message": "Recipe archived successfully"}), 200
    except Exception as e:
        logger.error(f"Error archiving recipe {recipe_id}: {str(e)}")
        return jsonify({"error": "Error archiving recipe"}), 500


@app.route("/api/generate-image", methods=["POST"])
@auth_required
@limiter.limit("5 per minute")
def generate_image():
    enable_flag = os.getenv("ENABLE_IMAGE_GENERATION", "false").lower() == "true"
    if not enable_flag:
        return jsonify({"error": "Image generation feature is disabled."}), 403

    uid = g.uid
    data = request.get_json()
    recipe_text = data.get("recipe", "")

    if not recipe_text or len(recipe_text) < 10:
        return jsonify({"error": "Valid recipe text is required"}), 400

    # Limit recipe text length
    recipe_text = recipe_text[:4000]  # Truncate to avoid excessive tokens

    logger.info(f"Generate image request from user {uid}")

    # Build an image prompt
    image_prompt = (
        f"Generate a realistic, high-quality photo of the dish described in the following recipe:\n\n"
        f"{recipe_text}\n\n"
        "The image should capture the dish's essence with appealing plating and a gourmet presentation."
    )

    try:
        response = client.images.generate(
            model="dall-e-3",
            prompt=image_prompt,
            size="1024x1024",
            quality="standard",
            n=1,
        )
        image_url = response.data[0].url
        logger.info(f"Generated image for user {uid}")
        return jsonify({"image_url": image_url})
    except Exception as e:
        logger.error(f"Error generating image: {str(e)}")
        return jsonify({"error": "Error generating image"}), 500


@app.route("/api/health", methods=["GET"])
def health():
    # Simple health check to verify services are up
    services_status = {"app": "ok", "firebase": "ok", "openai": "ok"}

    # Check Firebase connection
    try:
        db.collection("recipes").limit(1).get()
    except Exception as e:
        services_status["firebase"] = "error"
        logger.error(f"Firebase health check failed: {str(e)}")

    # Overall status
    overall_status = (
        "ok" if all(v == "ok" for v in services_status.values()) else "degraded"
    )

    return jsonify({"status": overall_status, "services": services_status}), 200


@app.errorhandler(429)
def ratelimit_handler(e):
    return jsonify({"error": "Rate limit exceeded", "message": str(e.description)}), 429


@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Resource not found"}), 404


@app.errorhandler(500)
def server_error(e):
    logger.error(f"Server error: {str(e)}")
    return jsonify({"error": "Internal server error"}), 500


if __name__ == "__main__":
    # Use a production WSGI server in production!
    # For development only:
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 5001)), debug=False)
