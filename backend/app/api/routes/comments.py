"""
Comment thread endpoints nested under posts.

  GET  /api/posts/{post_id}/comments
  POST /api/posts/{post_id}/comments
  POST /api/comments/{comment_id}/vote
"""

from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DbSession, OptionalUser
from app.api.serializers import build_comment_tree
from app.models.comment import Comment
from app.models.post import Post
from app.models.vote import CommentVote
from app.schemas.comment import CommentCreate, CommentOut
from app.schemas.post import VoteRequest

posts_router = APIRouter(prefix="/posts", tags=["comments"])
comments_router = APIRouter(prefix="/comments", tags=["comments"])


@posts_router.get("/{post_id}/comments", response_model=list[CommentOut])
async def list_comments(
    post_id: UUID,
    db: DbSession,
    viewer: OptionalUser,
) -> list[CommentOut]:
    post = await db.get(Post, post_id)
    if post is None:
        raise HTTPException(status_code=404, detail="Post not found")

    result = await db.execute(
        select(Comment)
        .where(Comment.post_id == post_id)
        .options(selectinload(Comment.author))
        .order_by(Comment.created_at.asc())
    )
    comments = list(result.scalars().all())

    votes: dict[UUID, int] = {}
    if viewer is not None and comments:
        vote_result = await db.execute(
            select(CommentVote).where(
                CommentVote.user_id == viewer.id,
                CommentVote.comment_id.in_([c.id for c in comments]),
            )
        )
        votes = {v.comment_id: v.value for v in vote_result.scalars().all()}

    return build_comment_tree(comments, votes_by_comment=votes)


@posts_router.post(
    "/{post_id}/comments",
    response_model=CommentOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_comment(
    post_id: UUID,
    body: CommentCreate,
    db: DbSession,
    user: CurrentUser,
) -> CommentOut:
    post = await db.get(Post, post_id)
    if post is None:
        raise HTTPException(status_code=404, detail="Post not found")

    if body.parent_id is not None:
        parent = await db.get(Comment, body.parent_id)
        if parent is None or parent.post_id != post_id:
            raise HTTPException(status_code=404, detail="Parent comment not found")

    comment = Comment(
        post_id=post_id,
        parent_id=body.parent_id,
        author_id=user.id,
        body=body.body.strip(),
        score=1,
    )
    db.add(comment)
    post.comment_count += 1
    await db.flush()

    db.add(CommentVote(user_id=user.id, comment_id=comment.id, value=1))
    await db.flush()

    loaded = await db.execute(
        select(Comment)
        .where(Comment.id == comment.id)
        .options(selectinload(Comment.author))
    )
    comment = loaded.scalar_one()
    return build_comment_tree([comment], votes_by_comment={comment.id: 1})[0]


@comments_router.post("/{comment_id}/vote", status_code=status.HTTP_204_NO_CONTENT)
async def vote_comment(
    comment_id: UUID,
    body: VoteRequest,
    db: DbSession,
    user: CurrentUser,
) -> None:
    comment = await db.get(Comment, comment_id)
    if comment is None:
        raise HTTPException(status_code=404, detail="Comment not found")

    vote_result = await db.execute(
        select(CommentVote).where(
            CommentVote.user_id == user.id, CommentVote.comment_id == comment_id
        )
    )
    existing = vote_result.scalar_one_or_none()
    previous = existing.value if existing else 0
    next_vote = 0 if previous == body.value else body.value

    comment.score += next_vote - previous

    if next_vote == 0:
        if existing is not None:
            await db.delete(existing)
    elif existing is None:
        db.add(
            CommentVote(user_id=user.id, comment_id=comment_id, value=next_vote)
        )
    else:
        existing.value = next_vote

    await db.flush()
