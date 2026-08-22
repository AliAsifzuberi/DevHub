"""
Community endpoints.

  GET    /api/communities
  GET    /api/communities/{slug}
  GET    /api/communities/{slug}/posts
  POST   /api/communities/{slug}/join
  DELETE /api/communities/{slug}/join
"""

from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DbSession, OptionalUser
from app.api.serializers import community_to_out, post_to_out
from app.models.community import Community, CommunityMembership
from app.models.post import Post
from app.models.vote import PostVote
from app.schemas.community import CommunityOut
from app.schemas.post import FeedSort, PostOut

router = APIRouter(prefix="/communities", tags=["communities"])


async def _is_member(db: DbSession, user_id: UUID | None, community_id: UUID) -> bool:
    if user_id is None:
        return False
    result = await db.execute(
        select(CommunityMembership.id).where(
            CommunityMembership.user_id == user_id,
            CommunityMembership.community_id == community_id,
        )
    )
    return result.scalar_one_or_none() is not None


@router.get("", response_model=list[CommunityOut])
async def list_communities(db: DbSession, viewer: OptionalUser) -> list[CommunityOut]:
    result = await db.execute(
        select(Community).order_by(Community.member_count.desc())
    )
    communities = list(result.scalars().all())

    member_ids: set[UUID] = set()
    if viewer is not None:
        mem = await db.execute(
            select(CommunityMembership.community_id).where(
                CommunityMembership.user_id == viewer.id
            )
        )
        member_ids = set(mem.scalars().all())

    return [
        community_to_out(c, is_member=c.id in member_ids) for c in communities
    ]


@router.get("/{slug}", response_model=CommunityOut)
async def get_community(
    slug: str, db: DbSession, viewer: OptionalUser
) -> CommunityOut:
    result = await db.execute(select(Community).where(Community.slug == slug))
    community = result.scalar_one_or_none()
    if community is None:
        raise HTTPException(status_code=404, detail="Community not found")
    return community_to_out(
        community,
        is_member=await _is_member(db, viewer.id if viewer else None, community.id),
    )


@router.get("/{slug}/posts", response_model=list[PostOut])
async def community_posts(
    slug: str,
    db: DbSession,
    viewer: OptionalUser,
    sort: FeedSort = Query(default="hot"),
) -> list[PostOut]:
    result = await db.execute(select(Community).where(Community.slug == slug))
    community = result.scalar_one_or_none()
    if community is None:
        raise HTTPException(status_code=404, detail="Community not found")

    posts_result = await db.execute(
        select(Post)
        .where(Post.community_id == community.id)
        .options(selectinload(Post.author), selectinload(Post.community))
    )
    posts = list(posts_result.scalars().all())

    if sort == "new":
        posts.sort(key=lambda p: p.created_at, reverse=True)
    elif sort == "top":
        posts.sort(key=lambda p: p.score, reverse=True)
    else:
        now = datetime.now(UTC)
        posts.sort(
            key=lambda p: p.score
            / (((now - p.created_at).total_seconds() / 3600.0) + 2) ** 1.5,
            reverse=True,
        )

    votes: dict[UUID, int] = {}
    if viewer is not None and posts:
        vote_result = await db.execute(
            select(PostVote).where(
                PostVote.user_id == viewer.id,
                PostVote.post_id.in_([p.id for p in posts]),
            )
        )
        votes = {v.post_id: v.value for v in vote_result.scalars().all()}

    is_member = await _is_member(db, viewer.id if viewer else None, community.id)
    return [
        post_to_out(p, viewer_vote=votes.get(p.id, 0), is_member=is_member)
        for p in posts
    ]


@router.post("/{slug}/join", response_model=CommunityOut)
async def join_community(
    slug: str, db: DbSession, user: CurrentUser
) -> CommunityOut:
    result = await db.execute(select(Community).where(Community.slug == slug))
    community = result.scalar_one_or_none()
    if community is None:
        raise HTTPException(status_code=404, detail="Community not found")

    if await _is_member(db, user.id, community.id):
        return community_to_out(community, is_member=True)

    db.add(CommunityMembership(user_id=user.id, community_id=community.id))
    community.member_count += 1
    await db.flush()
    return community_to_out(community, is_member=True)


@router.delete("/{slug}/join", response_model=CommunityOut)
async def leave_community(
    slug: str, db: DbSession, user: CurrentUser
) -> CommunityOut:
    result = await db.execute(select(Community).where(Community.slug == slug))
    community = result.scalar_one_or_none()
    if community is None:
        raise HTTPException(status_code=404, detail="Community not found")

    mem = await db.execute(
        select(CommunityMembership).where(
            CommunityMembership.user_id == user.id,
            CommunityMembership.community_id == community.id,
        )
    )
    membership = mem.scalar_one_or_none()
    if membership is None:
        return community_to_out(community, is_member=False)

    await db.delete(membership)
    community.member_count = max(0, community.member_count - 1)
    await db.flush()
    return community_to_out(community, is_member=False)
