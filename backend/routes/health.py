import logging
from fastapi import APIRouter, Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from services.firebase import db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["health"])

limiter = Limiter(key_func=get_remote_address)


@router.get("/health")
@limiter.limit("30/minute")
async def health(request: Request):
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

    return {"status": overall_status, "services": services_status}
