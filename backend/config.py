import logging
import os

from dotenv import load_dotenv

# Load environment variables (.env.local takes precedence over .env)
load_dotenv(".env.local", override=True)
load_dotenv(".env")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# LLM configuration
LLM_MODEL = os.getenv("LLM_MODEL", "claude-sonnet-4-5")

# Gemini configuration (for image generation)
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
GEMINI_IMAGE_MODEL = os.getenv("GEMINI_IMAGE_MODEL", "gemini-2.5-flash-image")

# Cloud Storage configuration
GCS_BUCKET_NAME = os.getenv("GCS_BUCKET_NAME", "")

# Feature flags
ENABLE_IMAGE_GENERATION = os.getenv("ENABLE_IMAGE_GENERATION", "false").lower() == "true"
MOCK_MODE = os.getenv("MOCK_MODE", "false").lower() == "true"

# Flask configuration
PORT = int(os.getenv("PORT", 5001))
FLASK_ENV = os.getenv("FLASK_ENV")
LOCAL_DEV = os.getenv("LOCAL_DEV", "false").lower() == "true"
IS_LOCAL = FLASK_ENV == "development" or LOCAL_DEV

# CORS configuration
FRONTEND_URLS = os.getenv("FRONTEND_URLS", "http://localhost:5173").split(",")
