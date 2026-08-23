"""
FastAPI application entry point.

Purpose: create the app, wire middleware, mount routers, expose /health.

Run with:
  poetry run uvicorn app.main:app --reload --port 8000
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import get_settings
from app.core.redis import close_redis, init_redis
from app.core.ws_manager import start_notification_listener, stop_notification_listener


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Connect Redis once for the process, then start the pub/sub fan-out task
    # that forwards notification events to local WebSockets.
    await init_redis()
    start_notification_listener()
    try:
        yield
    finally:
        await stop_notification_listener()
        await close_redis()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router)

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
