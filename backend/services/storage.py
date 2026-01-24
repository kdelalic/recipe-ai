import io
import logging
from PIL import Image
from google.cloud import storage

from config import GCS_BUCKET_NAME

logger = logging.getLogger(__name__)

# Initialize Cloud Storage for image uploads
storage_bucket = None
if GCS_BUCKET_NAME:
    try:
        storage_client = storage.Client.from_service_account_json("serviceAccountKey.json")
        storage_bucket = storage_client.bucket(GCS_BUCKET_NAME)
        logger.info(f"Cloud Storage initialized with bucket: {GCS_BUCKET_NAME}")
    except Exception as e:
        logger.warning(f"Cloud Storage not configured: {e}")
        storage_bucket = None


def compress_image(image_data: bytes, max_size_kb: int = 500) -> tuple[bytes, str]:
    """Compress image to reduce storage costs. Returns (compressed_data, mime_type)."""
    img = Image.open(io.BytesIO(image_data))

    # Convert to RGB if necessary (for PNG with transparency)
    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")

    # Start with high quality and reduce until under max size
    quality = 85
    while quality >= 30:
        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=quality, optimize=True)
        compressed_data = buffer.getvalue()

        if len(compressed_data) / 1024 <= max_size_kb:
            logger.info(f"Compressed image to {len(compressed_data)/1024:.1f} KB (quality={quality})")
            return compressed_data, "image/jpeg"

        quality -= 10

    # If still too large, resize the image
    width, height = img.size
    while len(compressed_data) / 1024 > max_size_kb and width > 800:
        width = int(width * 0.8)
        height = int(height * 0.8)
        resized = img.resize((width, height), Image.Resampling.LANCZOS)
        buffer = io.BytesIO()
        resized.save(buffer, format="JPEG", quality=70, optimize=True)
        compressed_data = buffer.getvalue()

    logger.info(f"Compressed image to {len(compressed_data)/1024:.1f} KB ({width}x{height})")
    return compressed_data, "image/jpeg"
