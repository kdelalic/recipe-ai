import logging
import re
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from auth import get_current_user
from models import AddFavoriteRequest, FavoriteItem, FavoritesResponse
from services.firebase import db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["favorites"])


@router.get("/favorites", response_model=FavoritesResponse)
async def get_favorites(uid: Annotated[str, Depends(get_current_user)]):
    """Get the list of favorited recipes for the current user.

    Returns favorites as a list of objects with id and title.
    Also returns a list of just IDs for backward compatibility.
    """
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
        # Convert to FavoriteItem models
        favorite_items = [
            FavoriteItem(id=f["id"], title=f.get("title", "")) if isinstance(f, dict) else FavoriteItem(id=f)
            for f in favorites
        ]

        return FavoritesResponse(favorites=favorite_items, favoriteIds=favorite_ids)
    except Exception as e:
        logger.error(f"Error getting favorites for user {uid}: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving favorites") from e


@router.post("/favorites/{recipe_id}", response_model=FavoritesResponse)
async def add_favorite(
    recipe_id: str,
    uid: Annotated[str, Depends(get_current_user)],
    data: AddFavoriteRequest,
):
    """Add a recipe to favorites. Expects title in request body."""
    # Validate recipe_id format
    if not re.match(r"^[a-zA-Z0-9]+$", recipe_id):
        raise HTTPException(status_code=400, detail="Invalid recipe ID format")

    title = data.title

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
                raise HTTPException(status_code=400, detail="Maximum 500 favorites allowed")
            favorites.append({"id": recipe_id, "title": title})
            user_ref.set({"favorites": favorites}, merge=True)

        favorite_ids = [f["id"] if isinstance(f, dict) else f for f in favorites]
        favorite_items = [
            FavoriteItem(id=f["id"], title=f.get("title", "")) if isinstance(f, dict) else FavoriteItem(id=f)
            for f in favorites
        ]
        logger.info(f"Added favorite {recipe_id} for user {uid}")
        return FavoritesResponse(favorites=favorite_items, favoriteIds=favorite_ids)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding favorite for user {uid}: {str(e)}")
        raise HTTPException(status_code=500, detail="Error adding favorite") from e


@router.delete("/favorites/{recipe_id}", response_model=FavoritesResponse)
async def remove_favorite(
    recipe_id: str,
    uid: Annotated[str, Depends(get_current_user)],
):
    """Remove a recipe from favorites."""
    # Validate recipe_id format
    if not re.match(r"^[a-zA-Z0-9]+$", recipe_id):
        raise HTTPException(status_code=400, detail="Invalid recipe ID format")

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
        favorite_items = [
            FavoriteItem(id=f["id"], title=f.get("title", "")) if isinstance(f, dict) else FavoriteItem(id=f)
            for f in favorites
        ]
        logger.info(f"Removed favorite {recipe_id} for user {uid}")
        return FavoritesResponse(favorites=favorite_items, favoriteIds=favorite_ids)
    except Exception as e:
        logger.error(f"Error removing favorite for user {uid}: {str(e)}")
        raise HTTPException(status_code=500, detail="Error removing favorite") from e
