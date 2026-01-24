import logging
from functools import wraps
from flask import request, jsonify, g
from firebase_admin import auth as firebase_auth

from services.cache import token_cache

logger = logging.getLogger(__name__)


def get_uid_from_token(token):
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


def auth_required(f):
    """Decorator to require authentication for a route."""
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


def validate_request(model_class):
    """Decorator to validate request data with a Pydantic model."""
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
