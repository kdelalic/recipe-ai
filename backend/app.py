import logging
from flask import Flask, jsonify
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

from config import IS_LOCAL, FRONTEND_URLS, PORT

# Import services to initialize them
import services.firebase  # noqa: F401

# Import route blueprints
from routes.recipes import recipes_bp
from routes.favorites import favorites_bp
from routes.images import images_bp
from routes.health import health_bp

logger = logging.getLogger(__name__)

app = Flask(__name__)

# Setup rate limiting (disabled in local development)
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=[] if IS_LOCAL else ["200 per day", "50 per hour"],
    storage_uri="memory://",
    enabled=not IS_LOCAL,
)

# Configure CORS with secure options
CORS(
    app,
    resources={r"/api/*": {"origins": FRONTEND_URLS + ["http://localhost:5173"]}},
)

# Register blueprints
app.register_blueprint(recipes_bp)
app.register_blueprint(favorites_bp)
app.register_blueprint(images_bp)
app.register_blueprint(health_bp)

# Apply rate limits to specific endpoints
limiter.limit("10 per minute")(recipes_bp)
limiter.limit("5 per minute")(images_bp)
limiter.limit("30 per minute")(health_bp)


@app.errorhandler(429)
def ratelimit_handler(e):
    return jsonify({"error": "Rate limit exceeded", "message": str(e.description)}), 429


@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Resource not found"}), 404


@app.errorhandler(500)
def server_error(e):
    logger.error(f"Server error: {str(e)}")
    return jsonify({"error": "Internal server error"}), 500


if __name__ == "__main__":
    # Use a production WSGI server in production!
    # For development only:
    app.run(host="0.0.0.0", port=PORT, debug=False)
