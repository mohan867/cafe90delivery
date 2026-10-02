import os
from flask import Flask
from werkzeug.middleware.proxy_fix import ProxyFix
from flask_cors import CORS
from sqlalchemy import text

from config import Config
from database.connection import db, ensure_database_exists
from utils.response import success_response, error_response
from utils.logger import logger, setup_request_logging

# Import Blueprints
from routes.auth_routes import auth_bp
from routes.food_routes import food_bp
from routes.cart_routes import cart_bp
from routes.order_routes import order_bp
from routes.delivery_routes import delivery_bp
from routes.admin_routes import admin_bp


from utils.limiter import limiter

def create_app(config_class=Config, skip_autoseed=False):
    app = Flask(__name__)
    app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)
    app.config.from_object(config_class)

    # ── Rate Limiting ────────────────────────────
    limiter.init_app(app)

    # ── Request Logging ─────────────────────────
    setup_request_logging(app)

    # ── Database Initialization ─────────────────
    db_uri = app.config.get("SQLALCHEMY_DATABASE_URI")
    if db_uri and app.config.get("ENVIRONMENT") == "development":
        ensure_database_exists(db_uri)

    db.init_app(app)

    # In local development mode, auto-create tables & seed if missing
    if app.config.get("ENVIRONMENT") == "development" and not skip_autoseed:
        with app.app_context():
            try:
                db.create_all()
                from sqlalchemy import text
                db.session.execute(text("ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;"))
                db.session.execute(text("ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS admin_reply TEXT;"))
                db.session.execute(text("ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;"))
                db.session.commit()

                from database.models.user import User
                user_exists = db.session.query(User).first() is not None
                db.session.remove()
                if not user_exists:
                    logger.info("[DB Auto-Init] No users found. Running initial database seed...")
                    from database.seed import seed_database
                    seed_database(app)
            except Exception as e:
                db.session.remove()
                logger.warning(f"[DB Auto-Init] Local database initialization warning: {e}")

    # ── Security Response Headers ────────────────
    @app.after_request
    def apply_security_headers(response):
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        if app.config.get("ENVIRONMENT") == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

    # ── CORS Setup ──────────────────────────────
    CORS(
        app,
        resources={r"/*": {"origins": app.config["CORS_ORIGINS"]}},
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin", "Cookie"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"]
    )

    # ── Register Blueprints ─────────────────────
    app.register_blueprint(auth_bp, url_prefix="/api/v1/auth")
    app.register_blueprint(food_bp, url_prefix="/api/v1/food")
    app.register_blueprint(cart_bp, url_prefix="/api/v1/cart")
    app.register_blueprint(order_bp, url_prefix="/api/v1/orders")
    app.register_blueprint(delivery_bp, url_prefix="/api/v1/delivery")
    app.register_blueprint(admin_bp, url_prefix="/api/v1/admin")

    # ── Health Checks ───────────────────────────
    @app.route("/", methods=["GET"])
    @app.route("/health", methods=["GET"])
    def health_check():
        return success_response(
            data={"status": "healthy", "service": "Cafe 90s REST API", "version": "1.0.0"},
            message="Cafe 90s API is running"
        )

    @app.route("/health/db", methods=["GET"])
    def db_health_check():
        try:
            db.session.execute(text("SELECT 1"))
            return success_response(
                data={"status": "connected", "database": "PostgreSQL"},
                message="Database connection verified"
            )
        except Exception as e:
            logger.error(f"Database health check failed: {e}", exc_info=True)
            return error_response(
                message="Database connection failed. Please verify PostgreSQL credentials.",
                code="DATABASE_UNAVAILABLE",
                status_code=500
            )

    # ── Error Handlers ───────────────────────────
    @app.errorhandler(404)
    def not_found_error(e):
        return error_response(message="Resource not found", code="NOT_FOUND", status_code=404)

    @app.errorhandler(405)
    def method_not_allowed_error(e):
        return error_response(message="Method not allowed", code="METHOD_NOT_ALLOWED", status_code=405)

    @app.errorhandler(429)
    def ratelimit_handler(e):
        return error_response(
            message="Too many requests. Please slow down and try again later.",
            code="RATE_LIMIT_EXCEEDED",
            status_code=429
        )

    @app.errorhandler(500)
    def internal_server_error(e):
        logger.error(f"Unhandled 500 error: {e}", exc_info=True)
        return error_response(message="Internal server error", code="INTERNAL_SERVER_ERROR", status_code=500)

    @app.teardown_request
    def teardown_db_session(exception=None):
        if exception:
            try:
                db.session.rollback()
            except Exception:
                pass
        db.session.remove()

    @app.errorhandler(Exception)
    def unhandled_exception(e):
        try:
            db.session.rollback()
        except Exception:
            pass
        logger.error(f"Unhandled Exception: {e}", exc_info=True)
        return error_response(message="An unexpected server error occurred", code="UNHANDLED_EXCEPTION", status_code=500)

    return app


app = create_app()

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    print(f"\nCafe 90s PostgreSQL Backend running on http://localhost:{port}\n")
    app.run(host="0.0.0.0", port=port, debug=True)