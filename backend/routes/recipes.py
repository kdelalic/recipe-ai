import datetime
import re
import logging
from flask import Blueprint, request, jsonify, g
from google.cloud.firestore_v1.base_query import FieldFilter
from firebase_admin import auth as firebase_auth
from firebase_admin import firestore

from auth import auth_required, validate_request
from models import RecipeRequest, UpdateRecipeRequest
from services.firebase import db
from services.cache import recipe_cache
from services.llm import generate_recipe_from_prompt, update_recipe_with_modifications

logger = logging.getLogger(__name__)

recipes_bp = Blueprint("recipes", __name__)


@recipes_bp.route("/api/generate-recipe", methods=["POST"])
@auth_required
@validate_request(RecipeRequest)
def generate_recipe():
    data = request.get_json()
    prompt = data.get("prompt", "")
    uid = g.uid

    logger.info(f"Generate recipe request from user {uid}")

    try:
        recipe, _ = generate_recipe_from_prompt(prompt)
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


@recipes_bp.route("/api/update-recipe", methods=["POST"])
@auth_required
@validate_request(UpdateRecipeRequest)
def update_recipe():
    data = request.get_json()
    recipe_id = data.get("id")
    original_recipe = data.get("original_recipe", {})
    modifications = data.get("modifications", "")
    uid = g.uid

    # Sanitize inputs
    recipe_id = recipe_id.strip()
    modifications = modifications.strip()

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

    try:
        updated_recipe, _ = update_recipe_with_modifications(original_recipe, modifications)
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


@recipes_bp.route("/api/recipe/<recipe_id>", methods=["GET"])
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
        image_url = data.get("image_url", "")

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
                "image_url": image_url,
                "timestamp": timestamp,
                "uid": uid,
                "displayName": user_info["displayName"],
            }
        )
    except Exception as e:
        logger.error(f"Error retrieving recipe {recipe_id}: {str(e)}")
        return jsonify({"error": "Error retrieving recipe"}), 500


@recipes_bp.route("/api/recipe-history", methods=["GET"])
@auth_required
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
            recipe = data.get("recipe", {})
            history.append(
                {
                    "id": doc.id,
                    "title": recipe.get("title", "") if isinstance(recipe, dict) else "",
                    "timestamp": data.get("timestamp", ""),
                }
            )

        return jsonify({"history": history, "offset": offset, "limit": limit})
    except Exception as e:
        logger.error(f"Error retrieving recipe history for user {uid}: {str(e)}")
        return jsonify({"error": "Error retrieving recipe history"}), 500


@recipes_bp.route("/api/recipe/<recipe_id>/archive", methods=["PATCH"])
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
