import logging

from fastapi import APIRouter, Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from models import HealthResponse, ServicesStatus
from services.firebase import db_async

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["health"])

limiter = Limiter(key_func=get_remote_address)


@router.get("/health", response_model=HealthResponse)
@limiter.limit("30/minute")
async def health(request: Request):
    """Simple health check to verify services are up."""
    services_status = ServicesStatus()

    # Check Firebase connection
    try:
        query = db_async.collection("recipes").limit(1)
        async for _ in query.stream():
            break
    except Exception as e:
        services_status.firebase = "error"
        logger.error(f"Firebase health check failed: {str(e)}")

    # Overall status
    status_values = [services_status.app, services_status.firebase, services_status.gemini]
    overall_status = "ok" if all(v == "ok" for v in status_values) else "degraded"

    return HealthResponse(status=overall_status, services=services_status)
