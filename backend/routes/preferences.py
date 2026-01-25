import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth import get_current_user
from services.firebase import db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["preferences"])


class PreferencesUpdate(BaseModel):
    imageGenerationEnabled: bool = True


@router.get("/preferences")
async def get_preferences(uid: Annotated[str, Depends(get_current_user)]):
    """Get the user's preferences."""
    try:
        user_ref = db.collection("users").document(uid)
        user_doc = user_ref.get()

        if user_doc.exists:
            data = user_doc.to_dict()
            preferences = data.get("preferences", {})
        else:
            preferences = {}

        return {"preferences": preferences}
    except Exception as e:
        logger.error(f"Error getting preferences for user {uid}: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving preferences") from e


@router.put("/preferences")
async def update_preferences(
    uid: Annotated[str, Depends(get_current_user)],
    data: PreferencesUpdate,
):
    """Update the user's preferences."""
    try:
        user_ref = db.collection("users").document(uid)

        preferences = {
            "imageGenerationEnabled": data.imageGenerationEnabled,
        }

        user_ref.set({"preferences": preferences}, merge=True)

        logger.info(f"Updated preferences for user {uid}")
        return {"preferences": preferences}
    except Exception as e:
        logger.error(f"Error updating preferences for user {uid}: {str(e)}")
        raise HTTPException(status_code=500, detail="Error updating preferences") from e
