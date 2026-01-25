import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from auth import get_current_user
from models import Preferences, PreferencesResponse, PreferencesUpdate
from services.firebase import db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["preferences"])


@router.get("/preferences", response_model=PreferencesResponse)
async def get_preferences(uid: Annotated[str, Depends(get_current_user)]):
    """Get the user's preferences."""
    try:
        user_ref = db.collection("users").document(uid)
        user_doc = user_ref.get()

        if user_doc.exists:
            data = user_doc.to_dict()
            prefs_data = data.get("preferences", {})
            preferences = Preferences(**prefs_data) if prefs_data else Preferences()
        else:
            preferences = Preferences()

        return PreferencesResponse(preferences=preferences)
    except Exception as e:
        logger.error(f"Error getting preferences for user {uid}: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving preferences") from e


@router.put("/preferences", response_model=PreferencesResponse)
async def update_preferences(
    uid: Annotated[str, Depends(get_current_user)],
    data: PreferencesUpdate,
):
    """Update the user's preferences."""
    try:
        user_ref = db.collection("users").document(uid)

        preferences = Preferences(
            imageGenerationEnabled=data.imageGenerationEnabled,
        )

        user_ref.set({"preferences": preferences.model_dump()}, merge=True)

        logger.info(f"Updated preferences for user {uid}")
        return PreferencesResponse(preferences=preferences)
    except Exception as e:
        logger.error(f"Error updating preferences for user {uid}: {str(e)}")
        raise HTTPException(status_code=500, detail="Error updating preferences") from e
