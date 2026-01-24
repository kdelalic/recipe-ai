import logging
import firebase_admin
from firebase_admin import credentials, firestore

logger = logging.getLogger(__name__)

# Initialize Firebase Admin with service account key
try:
    cred = credentials.Certificate("serviceAccountKey.json")
    firebase_admin.initialize_app(cred)
    db = firestore.client()
except Exception as e:
    logger.error(f"Firebase initialization error: {e}")
    raise
