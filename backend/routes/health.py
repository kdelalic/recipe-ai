import logging
from flask import Blueprint, jsonify

from services.firebase import db

logger = logging.getLogger(__name__)

health_bp = Blueprint("health", __name__)


@health_bp.route("/api/health", methods=["GET"])
def health():
    """Simple health check to verify services are up."""
    services_status = {"app": "ok", "firebase": "ok", "gemini": "ok"}

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
