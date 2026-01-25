import datetime
import logging
import re
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from firebase_admin import auth as firebase_auth
from firebase_admin import firestore
from google.cloud.firestore_v1.base_query import FieldFilter
from slowapi import Limiter
from slowapi.util import get_remote_address

from auth import get_current_user, get_current_user_optional
from models import (
    GenerateRecipeResponse,
    GetRecipeResponse,
    MessageResponse,
    RecipeHistoryItem,
    RecipeHistoryResponse,
    RecipeRequest,
    UpdateRecipeRequest,
    UpdateRecipeResponse,
)
from services.cache import recipe_cache
from services.firebase import db
from services.llm import generate_recipe_from_prompt, update_recipe_with_modifications

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["recipes"])

limiter = Limiter(key_func=get_remote_address)


@router.post("/generate-recipe", response_model=GenerateRecipeResponse)
@limiter.limit("10/minute")
def generate_recipe(
    request: Request,
    data: RecipeRequest,
    uid: Annotated[str, Depends(get_current_user)],
):
    logger.info(f"Generate recipe request from user {uid}")

    try:
        recipe, _ = generate_recipe_from_prompt(
            data.prompt,
            complexity=data.complexity,
            diet=data.diet,
            time=data.time,
            servings=data.servings,
        )
        recipe_dict = recipe.model_dump()

        # Save the generated recipe into Firestore
        recipe_data = {
            "uid": uid,
            "prompt": data.prompt,
            "complexity": data.complexity,
            "diet": data.diet,
            "time": data.time,
            "servings": data.servings,
            "recipe": recipe_dict,
            "timestamp": datetime.datetime.now(datetime.timezone.utc),
            "archived": False,
        }

        _, doc_ref = db.collection("recipes").add(recipe_data)
        recipe_id = doc_ref.id

        # Update cache
        cache_key = f"recipe_{recipe_id}"
        recipe_cache[cache_key] = recipe_dict

        return {"recipe": recipe_dict, "id": recipe_id}
    except Exception as e:
        logger.error(f"Error generating recipe: {str(e)}")
        raise HTTPException(status_code=500, detail="Error generating recipe") from e


@router.post("/update-recipe", response_model=UpdateRecipeResponse)
@limiter.limit("10/minute")
def update_recipe(
    request: Request,
    data: UpdateRecipeRequest,
    uid: Annotated[str, Depends(get_current_user)],
):
    recipe_id = data.id.strip()
    modifications = data.modifications.strip()

    logger.info(f"Update recipe request for recipe {recipe_id} from user {uid}")

    doc_ref = db.collection("recipes").document(recipe_id)
    doc = doc_ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Recipe not found")

    data_doc = doc.to_dict()

    # Check if the recipe belongs to the current user
    if data_doc.get("uid") != uid:
        logger.warning(
            f"Unauthorized access attempt to recipe {recipe_id} by user {uid}"
        )
        raise HTTPException(status_code=403, detail="Unauthorized access")

    try:
        updated_recipe, _ = update_recipe_with_modifications(
            data.original_recipe.model_dump(), modifications
        )
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

        return {"recipe": updated_recipe_dict}
    except Exception as e:
        logger.error(f"Error updating recipe {recipe_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Error updating recipe") from e


@router.get("/recipe/{recipe_id}", response_model=GetRecipeResponse)
def get_recipe(
    recipe_id: str,
    current_uid: Annotated[str | None, Depends(get_current_user_optional)] = None,
):
    try:
        # Validate recipe_id format
        if not re.match(r"^[a-zA-Z0-9]+$", recipe_id):
            raise HTTPException(status_code=400, detail="Invalid recipe ID format")

        doc_ref = db.collection("recipes").document(recipe_id)
        doc = doc_ref.get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Recipe not found")

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

        response = {
            "recipe": recipe,
            "image_url": image_url,
            "timestamp": str(timestamp),
            "uid": uid,
            "displayName": user_info["displayName"],
        }

        # Include prompt only if the current user is the recipe owner
        if current_uid and current_uid == uid:
            response["prompt"] = data.get("prompt", "")

        return response
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error retrieving recipe {recipe_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving recipe") from e


@router.get("/recipe-history", response_model=RecipeHistoryResponse)
def get_recipe_history(
    uid: Annotated[str, Depends(get_current_user)],
    limit: Annotated[int, Query(le=50)] = 20,
    offset: int = 0,
):
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
                RecipeHistoryItem(
                    id=doc.id,
                    title=recipe.get("title", "") if isinstance(recipe, dict) else "",
                    timestamp=str(data.get("timestamp", "")),
                )
            )

        return {"history": history, "offset": offset, "limit": limit}
    except Exception as e:
        logger.error(f"Error retrieving recipe history for user {uid}: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving recipe history") from e


@router.patch("/recipe/{recipe_id}/archive", response_model=MessageResponse)
def archive_recipe(
    recipe_id: str,
    uid: Annotated[str, Depends(get_current_user)],
):
    # Validate recipe_id format
    if not re.match(r"^[a-zA-Z0-9]+$", recipe_id):
        raise HTTPException(status_code=400, detail="Invalid recipe ID format")

    logger.info(f"Archive recipe request for recipe {recipe_id} from user {uid}")

    try:
        doc_ref = db.collection("recipes").document(recipe_id)
        doc = doc_ref.get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Recipe not found")

        data = doc.to_dict()
        if data.get("uid") != uid:
            logger.warning(
                f"Unauthorized archive attempt for recipe {recipe_id} by user {uid}"
            )
            raise HTTPException(status_code=403, detail="Unauthorized access")

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

        return {"message": "Recipe archived successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error archiving recipe {recipe_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Error archiving recipe") from e
