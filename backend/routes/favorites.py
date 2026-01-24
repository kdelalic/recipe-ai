import re
import logging
from flask import Blueprint, request, jsonify, g

from auth import auth_required
from services.firebase import db

logger = logging.getLogger(__name__)

favorites_bp = Blueprint("favorites", __name__)


@favorites_bp.route("/api/favorites", methods=["GET"])
@auth_required
def get_favorites():
    """Get the list of favorited recipes for the current user.

    Returns favorites as a list of objects with id and title.
    Also returns a list of just IDs for backward compatibility.
    """
    uid = g.uid

    try:
        user_ref = db.collection("users").document(uid)
        user_doc = user_ref.get()

        if user_doc.exists:
            data = user_doc.to_dict()
            favorites = data.get("favorites", [])
        else:
            favorites = []

        # Extract just the IDs for backward compatibility
        favorite_ids = [f["id"] if isinstance(f, dict) else f for f in favorites]

        return jsonify({"favorites": favorites, "favoriteIds": favorite_ids})
    except Exception as e:
        logger.error(f"Error getting favorites for user {uid}: {str(e)}")
        return jsonify({"error": "Error retrieving favorites"}), 500


@favorites_bp.route("/api/favorites/<recipe_id>", methods=["POST"])
@auth_required
def add_favorite(recipe_id):
    """Add a recipe to favorites. Expects title in request body."""
    uid = g.uid

    # Validate recipe_id format
    if not re.match(r"^[a-zA-Z0-9]+$", recipe_id):
        return jsonify({"error": "Invalid recipe ID format"}), 400

    data = request.get_json() or {}
    title = data.get("title", "")

    try:
        user_ref = db.collection("users").document(uid)
        user_doc = user_ref.get()

        if user_doc.exists:
            favorites = user_doc.to_dict().get("favorites", [])
        else:
            favorites = []

        # Check if already favorited (handle both old and new format)
        existing_ids = [f["id"] if isinstance(f, dict) else f for f in favorites]
        if recipe_id not in existing_ids:
            if len(favorites) >= 500:
                return jsonify({"error": "Maximum 500 favorites allowed"}), 400
            favorites.append({"id": recipe_id, "title": title})
            user_ref.set({"favorites": favorites}, merge=True)

        favorite_ids = [f["id"] if isinstance(f, dict) else f for f in favorites]
        logger.info(f"Added favorite {recipe_id} for user {uid}")
        return jsonify({"favorites": favorites, "favoriteIds": favorite_ids})
    except Exception as e:
        logger.error(f"Error adding favorite for user {uid}: {str(e)}")
        return jsonify({"error": "Error adding favorite"}), 500


@favorites_bp.route("/api/favorites/<recipe_id>", methods=["DELETE"])
@auth_required
def remove_favorite(recipe_id):
    """Remove a recipe from favorites."""
    uid = g.uid

    # Validate recipe_id format
    if not re.match(r"^[a-zA-Z0-9]+$", recipe_id):
        return jsonify({"error": "Invalid recipe ID format"}), 400

    try:
        user_ref = db.collection("users").document(uid)
        user_doc = user_ref.get()

        if user_doc.exists:
            favorites = user_doc.to_dict().get("favorites", [])
            # Handle both old format (string) and new format (dict)
            favorites = [
                f
                for f in favorites
                if (f["id"] if isinstance(f, dict) else f) != recipe_id
            ]
            user_ref.set({"favorites": favorites}, merge=True)
        else:
            favorites = []

        favorite_ids = [f["id"] if isinstance(f, dict) else f for f in favorites]
        logger.info(f"Removed favorite {recipe_id} for user {uid}")
        return jsonify({"favorites": favorites, "favoriteIds": favorite_ids})
    except Exception as e:
        logger.error(f"Error removing favorite for user {uid}: {str(e)}")
        return jsonify({"error": "Error removing favorite"}), 500
