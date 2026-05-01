from pydantic_settings import BaseSettings
from typing import List
from pathlib import Path

# Resolve .env regardless of which directory uvicorn is launched from
_ENV_FILE = Path(__file__).resolve().parents[3] / ".env"

class Settings(BaseSettings):
    PROJECT_NAME: str = "Solar Analytics API"
    API_V1_STR: str = "/api/v1"

    # Supabase cache
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""

    # Google credentials path
    GOOGLE_CREDENTIALS_JSON_PATH: str = "credentials.json"

    # CORS Configuration
    # Allow localhost for dev, and Netlify domain for production
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",  # Vite default port
        "http://localhost:3000",
        "https://*.netlify.app",  # Allowed netlify subdomains
    ]

    class Config:
        case_sensitive = True
        env_file = str(_ENV_FILE)
        env_file_encoding = "utf-8"

settings = Settings()
