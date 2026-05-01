from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "Solar Analytics API"
    API_V1_STR: str = "/api/v1"
    
    # CORS Configuration
    # Allow localhost for dev, and Netlify domain for production
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",  # Vite default port
        "http://localhost:3000",
        "https://*.netlify.app",  # Allowed netlify subdomains
    ]

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
