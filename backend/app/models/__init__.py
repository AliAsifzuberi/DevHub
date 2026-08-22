"""
ORM models — the Python mirror of PostgreSQL tables.

Import every model here so Alembic's `Base.metadata` sees all tables when
env.py does `from app.models import *` (or imports this package).
"""

from app.models.comment import Comment
from app.models.community import Community, CommunityMembership
from app.models.notification import Notification
from app.models.post import Post
from app.models.user import User
from app.models.vote import CommentVote, PostVote

__all__ = [
    "User",
    "Community",
    "CommunityMembership",
    "Post",
    "Comment",
    "PostVote",
    "CommentVote",
    "Notification",
]
