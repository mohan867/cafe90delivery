import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    PORT = int(os.getenv("PORT", 5000))
    ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
    
    SECRET_KEY = os.getenv("JWT_SECRET_KEY")
    if not SECRET_KEY:
        if ENVIRONMENT == "production":
            raise RuntimeError("CRITICAL CONFIGURATION ERROR: JWT_SECRET_KEY environment variable must be set in production mode!")
        SECRET_KEY = "dev_only_jwt_secret_cafe90"
    
    TESTING = os.getenv("TESTING", "False").lower() in ("true", "1", "yes")

    # PostgreSQL Connection URL (formatted for psycopg 3)
    default_db = "cafe90s_test" if TESTING else "cafe90s"
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL", 
        f"postgresql+psycopg://postgres:postgres@localhost:5432/{default_db}"
    )
    # Fix potential Heroku/Render legacy postgres:// URLs
    if SQLALCHEMY_DATABASE_URI.startswith("postgres://"):
        SQLALCHEMY_DATABASE_URI = SQLALCHEMY_DATABASE_URI.replace("postgres://", "postgresql+psycopg://", 1)
    elif SQLALCHEMY_DATABASE_URI.startswith("postgresql://") and not SQLALCHEMY_DATABASE_URI.startswith("postgresql+psycopg://"):
        SQLALCHEMY_DATABASE_URI = SQLALCHEMY_DATABASE_URI.replace("postgresql://", "postgresql+psycopg://", 1)


    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_size": int(os.getenv("DB_POOL_SIZE", 2)),
        "max_overflow": int(os.getenv("DB_MAX_OVERFLOW", 2)),
        "pool_pre_ping": True,
        "pool_recycle": int(os.getenv("DB_POOL_RECYCLE", 300)),
        "pool_timeout": int(os.getenv("DB_POOL_TIMEOUT", 30)),
    }
    
    raw_origins = os.getenv(
        "CORS_ORIGINS", 
        "https://cafe90delivery.vercel.app,https://cafe90.vercel.app,http://localhost:5173,http://localhost:3000"
    ).split(",")
    parsed_origins = set([
        r"https://.*\.vercel\.app",
        r"http://localhost:\d+",
        r"http://127\.0\.0\.1:\d+"
    ])
    for origin in raw_origins:
        o = origin.strip()
        if o:
            parsed_origins.add(o.rstrip("/"))
            parsed_origins.add(o.rstrip("/") + "/")
    CORS_ORIGINS = list(parsed_origins)
    ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
    DELIVERY_RADIUS_KM = float(os.getenv("DELIVERY_RADIUS_KM", 8.0))
    RESTAURANT_LATITUDE = float(os.getenv("RESTAURANT_LAT", 11.2447993))
    RESTAURANT_LONGITUDE = float(os.getenv("RESTAURANT_LNG", 77.5172581))

