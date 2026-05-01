from pydantic_settings import BaseSettings
from typing import List
from pathlib import Path

# Resolve .env regardless of which directory uvicorn is launched from
_ENV_FILE = Path(__file__).resolve().parents[3] / ".env"

# Force-load .env into os.environ BEFORE pydantic_settings reads it.
# This ensures keys added after the initial server start are always picked up.
try:
    from dotenv import load_dotenv
    load_dotenv(dotenv_path=_ENV_FILE, override=True)
except ImportError:
    pass  # python-dotenv not installed; pydantic_settings will handle it

class Settings(BaseSettings):
    PROJECT_NAME: str = "Solar Analytics API"
    API_V1_STR: str = "/api/v1"

    # Supabase cache
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""           # anon key — frontend reads
    SUPABASE_SERVICE_KEY: str = ""   # service_role key — backend writes (bypasses RLS)

    # Google Drive configuration
    GOOGLE_CREDENTIALS_JSON_PATH: str = "solarapp-drive-5a7a621a3732.json"
    GOOGLE_DRIVE_ROOT_FOLDER: str = "Paneles Solares"  # Nombre de la carpeta o ID directo

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
