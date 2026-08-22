"""User profile endpoints."""

from uuid import UUID

from fastapi import APIRouter, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import DbSession, OptionalUser
from app.api.serializers import post_to_out, user_to_public
from app.models.community import CommunityMembership
from app.models.post import Post
from app.models.user import User
from app.models.vote import PostVote
from app.schemas.post import PostOut
from app.schemas.user import UserPublic

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/{username}", response_model=UserPublic)
async def get_user(username: str, db: DbSession) -> UserPublic:
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user_to_public(user)


@router.get("/{username}/posts", response_model=list[PostOut])
async def user_posts(
    username: str, db: DbSession, viewer: OptionalUser
) -> list[PostOut]:
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    posts_result = await db.execute(
        select(Post)
        .where(Post.author_id == user.id)
        .options(selectinload(Post.author), selectinload(Post.community))
        .order_by(Post.created_at.desc())
    )
    posts = list(posts_result.scalars().all())

    member_ids: set[UUID] = set()
    votes: dict[UUID, int] = {}
    if viewer is not None:
        mem = await db.execute(
            select(CommunityMembership.community_id).where(
                CommunityMembership.user_id == viewer.id
            )
        )
        member_ids = set(mem.scalars().all())
        if posts:
            vote_result = await db.execute(
                select(PostVote).where(
                    PostVote.user_id == viewer.id,
                    PostVote.post_id.in_([p.id for p in posts]),
                )
            )
            votes = {v.post_id: v.value for v in vote_result.scalars().all()}

    return [
        post_to_out(
            p,
            viewer_vote=votes.get(p.id, 0),
            is_member=p.community_id in member_ids,
        )
        for p in posts
    ]
