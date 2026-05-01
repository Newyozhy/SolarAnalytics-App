from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Set all CORS enabled origins
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Health check endpoint para UptimeRobot/cron-job.org
@app.get("/api/health", tags=["healthcheck"])
def health_check():
    return {"status": "ok", "message": "Server is awake"}

# TODO: Include routers here
from app.api.v1.endpoints import projects

app.include_router(projects.router, prefix=f"{settings.API_V1_STR}/projects", tags=["projects"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
