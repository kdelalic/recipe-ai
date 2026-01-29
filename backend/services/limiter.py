from slowapi import Limiter
from slowapi.util import get_remote_address
from config import IS_LOCAL

# Centralized rate limiter
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[] if IS_LOCAL else ["200 per day", "50 per hour"],
    enabled=not IS_LOCAL,
)
