"""Aggregate all route modules under /api."""

from fastapi import APIRouter

from app.api.routes import auth, comments, communities, notifications, posts, users, ws

api_router = APIRouter(prefix="/api")
api_router.include_router(auth.router)
api_router.include_router(posts.router)
api_router.include_router(comments.posts_router)
api_router.include_router(comments.comments_router)
api_router.include_router(communities.router)
api_router.include_router(users.router)
api_router.include_router(notifications.router)
api_router.include_router(ws.router)
