import asyncio
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.boards import router as boards_router
from app.api.columns import router as columns_router
from app.api.comments import router as comments_router
from app.api.realtime import router as realtime_router
from app.api.tasks import router as tasks_router
from app.core.config import settings
from app.services.redis_pubsub import close_redis_connection, listen_for_board_events
from app.services.websockets import connection_manager
from app.api.activity_logs import router as activity_logs_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    async def handle_redis_board_event(board_id, message):
        await connection_manager.broadcast_to_board(board_id, message)

    redis_listener_task = asyncio.create_task(
        listen_for_board_events(handle_redis_board_event),
    )

    try:
        yield
    finally:
        redis_listener_task.cancel()

        with suppress(asyncio.CancelledError):
            await redis_listener_task

        await close_redis_connection()


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="Backend API for CollabBoard, a real-time collaborative workspace platform.",
    lifespan=lifespan,
)

app.include_router(auth_router)
app.include_router(boards_router)
app.include_router(columns_router)
app.include_router(comments_router)
app.include_router(tasks_router)
app.include_router(realtime_router)
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
