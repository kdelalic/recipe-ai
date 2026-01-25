import logging
from typing import Annotated

from fastapi import Header, HTTPException
from firebase_admin import auth as firebase_auth

from services.cache import token_cache

logger = logging.getLogger(__name__)


def get_uid_from_token(token: str) -> str | None:
    """Validate Firebase token and return user UID."""
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


def get_current_user(authorization: Annotated[str | None, Header()] = None) -> str:
    """FastAPI dependency to require authentication and return user UID."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")

    token = authorization.split("Bearer ")[-1]
    uid = get_uid_from_token(token)

    if not uid:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return uid


def get_current_user_optional(
    authorization: Annotated[str | None, Header()] = None,
) -> str | None:
    """FastAPI dependency to optionally get user UID (returns None if not authenticated)."""
    if not authorization:
        return None

    token = authorization.split("Bearer ")[-1]
    return get_uid_from_token(token)
