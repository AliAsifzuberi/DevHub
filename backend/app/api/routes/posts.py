"""
Post feed, detail, create, and vote endpoints.

Matches the Phase 1 mock contract:
  GET  /api/posts?sort=
  GET  /api/posts/{id}
  POST /api/posts
  POST /api/posts/{id}/vote
"""

from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DbSession, OptionalUser
from app.api.serializers import post_to_out
from app.models.community import Community, CommunityMembership
from app.models.post import Post
from app.models.vote import PostVote
from app.schemas.post import FeedSort, PostCreate, PostOut, VoteRequest

router = APIRouter(prefix="/posts", tags=["posts"])


def _hot_rank(post: Post, now: datetime) -> float:
    age_hours = max((now - post.created_at).total_seconds() / 3600.0, 0.0)
    return post.score / ((age_hours + 2) ** 1.5)


async def _membership_set(db: DbSession, user_id: UUID | None) -> set[UUID]:
    if user_id is None:
        return set()
    result = await db.execute(
        select(CommunityMembership.community_id).where(
            CommunityMembership.user_id == user_id
        )
    )
    return set(result.scalars().all())


async def _post_votes_map(
    db: DbSession, user_id: UUID | None, post_ids: list[UUID]
) -> dict[UUID, int]:
    if user_id is None or not post_ids:
        return {}
    result = await db.execute(
        select(PostVote).where(
            PostVote.user_id == user_id, PostVote.post_id.in_(post_ids)
        )
    )
    return {vote.post_id: vote.value for vote in result.scalars().all()}


def _post_query():
    """Always load author + community in one round trip — avoids N+1."""
    return select(Post).options(
        selectinload(Post.author),
        selectinload(Post.community),
    )


@router.get("", response_model=list[PostOut])
async def list_posts(
    db: DbSession,
    viewer: OptionalUser,
    sort: FeedSort = Query(default="hot"),
) -> list[PostOut]:
    result = await db.execute(_post_query())
    posts = list(result.scalars().all())

    if sort == "new":
        posts.sort(key=lambda p: p.created_at, reverse=True)
    elif sort == "top":
        posts.sort(key=lambda p: p.score, reverse=True)
    else:
        now = datetime.now(UTC)
        posts.sort(key=lambda p: _hot_rank(p, now), reverse=True)

    member_of = await _membership_set(db, viewer.id if viewer else None)
    votes = await _post_votes_map(
        db, viewer.id if viewer else None, [p.id for p in posts]
    )

    return [
        post_to_out(
            post,
            viewer_vote=votes.get(post.id, 0),
            is_member=post.community_id in member_of,
        )
        for post in posts
    ]


@router.get("/{post_id}", response_model=PostOut)
async def get_post(
    post_id: UUID,
    db: DbSession,
    viewer: OptionalUser,
) -> PostOut:
    result = await db.execute(_post_query().where(Post.id == post_id))
    post = result.scalar_one_or_none()
    if post is None:
        raise HTTPException(status_code=404, detail="Post not found")

    member_of = await _membership_set(db, viewer.id if viewer else None)
    votes = await _post_votes_map(
        db, viewer.id if viewer else None, [post.id]
    )
    return post_to_out(
        post,
        viewer_vote=votes.get(post.id, 0),
        is_member=post.community_id in member_of,
    )


@router.post("", response_model=PostOut, status_code=status.HTTP_201_CREATED)
async def create_post(
    body: PostCreate,
    db: DbSession,
    user: CurrentUser,
) -> PostOut:
    result = await db.execute(
        select(Community).where(Community.slug == body.community_slug)
    )
    community = result.scalar_one_or_none()
    if community is None:
        raise HTTPException(status_code=404, detail="Community not found")

    post = Post(
        title=body.title.strip(),
        body=body.body.strip(),
        author_id=user.id,
        community_id=community.id,
        score=1,
        comment_count=0,
    )
    db.add(post)
    await db.flush()

    # Author's automatic upvote — same behaviour as the Phase 1 mock.
    db.add(PostVote(user_id=user.id, post_id=post.id, value=1))
    await db.flush()

    loaded = await db.execute(_post_query().where(Post.id == post.id))
    post = loaded.scalar_one()
    member_of = await _membership_set(db, user.id)
    return post_to_out(
        post,
        viewer_vote=1,
        is_member=post.community_id in member_of,
    )


@router.post("/{post_id}/vote", response_model=PostOut)
async def vote_post(
    post_id: UUID,
    body: VoteRequest,
    db: DbSession,
    user: CurrentUser,
) -> PostOut:
    """
    Toggle semantics: clicking the same arrow again clears the vote.

    Score delta is (next - previous), not simply ±1 — switching from downvote
    to upvote moves the score by 2.
    """
    result = await db.execute(_post_query().where(Post.id == post_id))
    post = result.scalar_one_or_none()
    if post is None:
        raise HTTPException(status_code=404, detail="Post not found")

    vote_result = await db.execute(
        select(PostVote).where(
            PostVote.user_id == user.id, PostVote.post_id == post_id
        )
    )
    existing = vote_result.scalar_one_or_none()
    previous = existing.value if existing else 0
    next_vote = 0 if previous == body.value else body.value

    post.score += next_vote - previous

    if next_vote == 0:
        if existing is not None:
            await db.delete(existing)
    elif existing is None:
        db.add(PostVote(user_id=user.id, post_id=post_id, value=next_vote))
    else:
        existing.value = next_vote

    await db.flush()

    member_of = await _membership_set(db, user.id)
    return post_to_out(
        post,
        viewer_vote=next_vote,
        is_member=post.community_id in member_of,
    )
