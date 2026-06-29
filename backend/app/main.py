from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.boards import router as boards_router
from app.api.columns import router as columns_router
from app.api.tasks import router as tasks_router
from app.core.config import settings
from app.api.activity_logs import router as activity_logs_router

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="Backend API for CollabBoard, a real-time collaborative workspace platform.",
)

app.include_router(auth_router)
app.include_router(boards_router)
app.include_router(columns_router)
app.include_router(tasks_router)
app.include_router(activity_logs_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root() -> dict[str, str]:
    return {
        "message": "CollabBoard API is running",
        "environment": settings.app_env,
    }


@app.get("/health")
def health_check() -> dict[str, str]:
    return {
        "status": "ok",
        "service": settings.app_name,
        "environment": settings.app_env,
    }
