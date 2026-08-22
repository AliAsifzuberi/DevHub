"""
Serialisers: ORM rows → API response shapes.

Purpose: one place that knows how to attach viewer-relative fields
(is_member, viewer_vote) and nest related objects. Route handlers stay thin.
"""

from uuid import UUID

from app.models.comment import Comment
from app.models.community import Community
from app.models.post import Post
from app.models.user import User
from app.schemas.comment import CommentOut
from app.schemas.community import CommunityOut
from app.schemas.notification import NotificationOut
from app.schemas.post import PostOut
from app.schemas.user import UserPublic
from app.models.notification import Notification


def user_to_public(user: User) -> UserPublic:
    return UserPublic.model_validate(user)


def community_to_out(
    community: Community,
    *,
    is_member: bool = False,
) -> CommunityOut:
    data = CommunityOut.model_validate(community)
    return data.model_copy(update={"is_member": is_member})


def post_to_out(
    post: Post,
    *,
    viewer_vote: int = 0,
    is_member: bool = False,
) -> PostOut:
    return PostOut(
        id=post.id,
        title=post.title,
        body=post.body,
        author=user_to_public(post.author),
        community=community_to_out(post.community, is_member=is_member),
        created_at=post.created_at,
        score=post.score,
        comment_count=post.comment_count,
        viewer_vote=viewer_vote,  # type: ignore[arg-type]
    )


def build_comment_tree(
    comments: list[Comment],
    *,
    votes_by_comment: dict[UUID, int],
) -> list[CommentOut]:
    """
    Turn a flat list of comments into a nested tree.

    We load all comments for a post in one query (no N+1), then assemble the
    tree in memory. That is cheap for typical thread sizes and far simpler
    than a recursive SQL CTE for Phase 2.
    """
    nodes: dict[UUID, CommentOut] = {}
    for comment in comments:
        nodes[comment.id] = CommentOut(
            id=comment.id,
            post_id=comment.post_id,
            parent_id=comment.parent_id,
            author=user_to_public(comment.author),
            body=comment.body,
            created_at=comment.created_at,
            score=comment.score,
            viewer_vote=votes_by_comment.get(comment.id, 0),  # type: ignore[arg-type]
            replies=[],
        )

    roots: list[CommentOut] = []
    for comment in comments:
        node = nodes[comment.id]
        if comment.parent_id is None:
            roots.append(node)
        else:
            parent = nodes.get(comment.parent_id)
            if parent is not None:
                parent.replies.append(node)
            else:
                # Orphan (parent deleted) — treat as top-level rather than drop.
                roots.append(node)
    return roots


def notification_to_out(notification: Notification) -> NotificationOut:
    return NotificationOut.model_validate(notification)
