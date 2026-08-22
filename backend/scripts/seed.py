"""
Seed the database with the same sample content used in Phase 1 mocks.

Purpose: give the API something interesting to return during development.
Idempotent — safe to run twice; it clears existing seed-tagged rows first
by wiping all tables (dev only!).

Usage:
  cd backend && poetry run python -m scripts.seed
"""

from __future__ import annotations

import asyncio
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import text

from app.core.security import hash_password
from app.db.session import AsyncSessionLocal
from app.models.comment import Comment
from app.models.community import Community, CommunityMembership
from app.models.notification import Notification
from app.models.post import Post
from app.models.user import User
from app.models.vote import PostVote


def hours_ago(hours: float) -> datetime:
    return datetime.now(UTC) - timedelta(hours=hours)


def days_ago(days: float) -> datetime:
    return hours_ago(days * 24)


# Stable UUIDs so seed data is predictable across re-runs.
UID = {
    "maya": uuid.UUID("11111111-1111-1111-1111-111111111111"),
    "devon": uuid.UUID("22222222-2222-2222-2222-222222222222"),
    "sam": uuid.UUID("33333333-3333-3333-3333-333333333333"),
    "priya": uuid.UUID("44444444-4444-4444-4444-444444444444"),
}
CID = {
    "devops": uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
    "databases": uuid.UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
    "react": uuid.UUID("cccccccc-cccc-cccc-cccc-cccccccccccc"),
    "python": uuid.UUID("dddddddd-dddd-dddd-dddd-dddddddddddd"),
    "cloud": uuid.UUID("eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"),
}
PID = {
    f"p{i}": uuid.UUID(f"00000000-0000-4000-8000-{i:012d}") for i in range(1, 7)
}


async def wipe(session) -> None:
    """Dev-only full reset. Never run this against production."""
    for table in (
        "comment_votes",
        "post_votes",
        "notifications",
        "comments",
        "posts",
        "community_memberships",
        "communities",
        "users",
    ):
        await session.execute(text(f"TRUNCATE TABLE {table} CASCADE"))


async def seed() -> None:
    async with AsyncSessionLocal() as session:
        async with session.begin():
            await wipe(session)

            users = [
                User(
                    id=UID["maya"],
                    username="maya_builds",
                    display_name="Maya Chen",
                    email="maya@devhub.local",
                    password_hash=hash_password("password123"),
                    bio="Platform engineer. Terraform apologist. I like boring technology.",
                    karma=12840,
                    created_at=days_ago(420),
                ),
                User(
                    id=UID["devon"],
                    username="devon_ops",
                    display_name="Devon Okafor",
                    email="devon@devhub.local",
                    password_hash=hash_password("password123"),
                    bio="SRE. On call so you do not have to be.",
                    karma=8390,
                    created_at=days_ago(310),
                ),
                User(
                    id=UID["sam"],
                    username="sam_writes_sql",
                    display_name="Sam Rivera",
                    email="sam@devhub.local",
                    password_hash=hash_password("password123"),
                    bio="Database nerd. Ask me about query plans.",
                    karma=5120,
                    created_at=days_ago(190),
                ),
                User(
                    id=UID["priya"],
                    username="priya_ts",
                    display_name="Priya Nair",
                    email="priya@devhub.local",
                    password_hash=hash_password("password123"),
                    bio="Frontend. Accessibility is not optional.",
                    karma=3410,
                    created_at=days_ago(95),
                ),
            ]
            session.add_all(users)

            communities = [
                Community(
                    id=CID["devops"],
                    slug="devops",
                    name="DevOps",
                    description="Deployment pipelines, infrastructure as code, and the eternal search for a green build.",
                    member_count=48210,
                    accent_color="#4f46e5",
                    created_at=days_ago(700),
                ),
                Community(
                    id=CID["databases"],
                    slug="databases",
                    name="Databases",
                    description="Schema design, query optimisation, migrations, and war stories about production indexes.",
                    member_count=31980,
                    accent_color="#0ea5e9",
                    created_at=days_ago(650),
                ),
                Community(
                    id=CID["react"],
                    slug="react",
                    name="React",
                    description="Components, hooks, rendering behaviour, and state management debates that never end.",
                    member_count=92450,
                    accent_color="#06b6d4",
                    created_at=days_ago(880),
                ),
                Community(
                    id=CID["python"],
                    slug="python",
                    name="Python",
                    description="From async web services to the packaging situation. Especially the packaging situation.",
                    member_count=76310,
                    accent_color="#f59e0b",
                    created_at=days_ago(910),
                ),
                Community(
                    id=CID["cloud"],
                    slug="cloud",
                    name="Cloud",
                    description="GCP, AWS, Azure. Architecture, cost control, and reading the bill with your eyes closed.",
                    member_count=54070,
                    accent_color="#10b981",
                    created_at=days_ago(540),
                ),
            ]
            session.add_all(communities)

            # Maya is a member of devops, databases, python
            for slug in ("devops", "databases", "python"):
                session.add(
                    CommunityMembership(
                        user_id=UID["maya"], community_id=CID[slug]
                    )
                )

            posts = [
                Post(
                    id=PID["p1"],
                    title="We cut our Cloud Run cold starts from 4s to 300ms. Here is what actually mattered.",
                    body=(
                        "Everyone told us to \"just increase minimum instances\" and pay the bill. "
                        "That works, but it hides the real problem instead of fixing it.\n\n"
                        "The three changes that actually moved the needle:\n\n"
                        "1. Slimming the container image from 1.2GB to 180MB using a multi-stage build.\n"
                        "2. Moving database connection setup out of module import and into a lazy startup hook.\n"
                        "3. Deferring imports of heavy libraries that only two endpoints needed."
                    ),
                    author_id=UID["maya"],
                    community_id=CID["cloud"],
                    score=1284,
                    comment_count=6,
                    created_at=hours_ago(5),
                ),
                Post(
                    id=PID["p2"],
                    title="Your ORM is not slow. Your query is doing 400 round trips.",
                    body=(
                        "I keep seeing teams rip out a perfectly good ORM because \"it is slow\", "
                        "when the actual problem is the N+1 query pattern.\n\n"
                        "Turn on query logging in development. Count the queries on your slowest endpoint."
                    ),
                    author_id=UID["sam"],
                    community_id=CID["databases"],
                    score=942,
                    comment_count=4,
                    created_at=hours_ago(11),
                ),
                Post(
                    id=PID["p3"],
                    title="Terraform state is not a build artifact. Stop putting it in git.",
                    body=(
                        "Committing terraform.tfstate to version control feels harmless right up until "
                        "two engineers apply at the same time and one of them silently destroys a "
                        "production database.\n\n"
                        "State belongs in a remote backend with locking."
                    ),
                    author_id=UID["maya"],
                    community_id=CID["devops"],
                    score=2103,
                    comment_count=3,
                    created_at=hours_ago(19),
                ),
                Post(
                    id=PID["p4"],
                    title="useEffect is not a lifecycle method and treating it like one is why your code is confusing",
                    body=(
                        "The mental model that unlocked this for me: useEffect does not mean "
                        "\"run after render\". It means \"synchronise this component with something outside React\"."
                    ),
                    author_id=UID["priya"],
                    community_id=CID["react"],
                    score=1567,
                    comment_count=2,
                    created_at=days_ago(2),
                ),
                Post(
                    id=PID["p5"],
                    title="async def does not make your endpoint faster if you call blocking code inside it",
                    body=(
                        "Declaring a FastAPI endpoint as async def and then calling a synchronous "
                        "library inside it is worse than not using async at all."
                    ),
                    author_id=UID["devon"],
                    community_id=CID["python"],
                    score=811,
                    comment_count=2,
                    created_at=days_ago(3),
                ),
                Post(
                    id=PID["p6"],
                    title="Redis is not a database and the moment you treat it like one you will lose data",
                    body=(
                        "Redis is superb at what it is for: caching, rate limiting, ephemeral session "
                        "state, pub/sub fan-out.\n\n"
                        "Rule of thumb: if losing this key would require an apology email, it does not "
                        "belong only in Redis."
                    ),
                    author_id=UID["devon"],
                    community_id=CID["devops"],
                    score=1330,
                    comment_count=1,
                    created_at=days_ago(4),
                ),
            ]
            session.add_all(posts)

            # Nested comments on p1
            cm1 = uuid.UUID("10000000-0000-4000-8000-000000000001")
            cm2 = uuid.UUID("10000000-0000-4000-8000-000000000002")
            cm3 = uuid.UUID("10000000-0000-4000-8000-000000000003")
            cm4 = uuid.UUID("10000000-0000-4000-8000-000000000004")
            cm5 = uuid.UUID("10000000-0000-4000-8000-000000000005")
            cm6 = uuid.UUID("10000000-0000-4000-8000-000000000006")

            session.add_all(
                [
                    Comment(
                        id=cm1,
                        post_id=PID["p1"],
                        parent_id=None,
                        author_id=UID["devon"],
                        body="The lazy connection pool point is underrated. We had the exact same issue.",
                        score=214,
                        created_at=hours_ago(4),
                    ),
                    Comment(
                        id=cm2,
                        post_id=PID["p1"],
                        parent_id=cm1,
                        author_id=UID["maya"],
                        body="Load tests hiding cold-start problems is such a common trap.",
                        score=98,
                        created_at=hours_ago(3),
                    ),
                    Comment(
                        id=cm3,
                        post_id=PID["p1"],
                        parent_id=cm2,
                        author_id=UID["sam"],
                        body="We started running a separate synthetic check that hits a scaled-to-zero revision.",
                        score=45,
                        created_at=hours_ago(2),
                    ),
                    Comment(
                        id=cm4,
                        post_id=PID["p1"],
                        parent_id=cm1,
                        author_id=UID["priya"],
                        body="Does the multi-stage build change complicate your local development?",
                        score=31,
                        created_at=hours_ago(2),
                    ),
                    Comment(
                        id=cm5,
                        post_id=PID["p1"],
                        parent_id=None,
                        author_id=UID["sam"],
                        body="Image pull time is cached per instance — benefit is largest when scaling up fast.",
                        score=156,
                        created_at=hours_ago(3),
                    ),
                    Comment(
                        id=cm6,
                        post_id=PID["p1"],
                        parent_id=cm5,
                        author_id=UID["maya"],
                        body="Exactly. Cold starts correlate with traffic spikes.",
                        score=62,
                        created_at=hours_ago(1),
                    ),
                    Comment(
                        id=uuid.UUID("10000000-0000-4000-8000-000000000018"),
                        post_id=PID["p6"],
                        parent_id=None,
                        author_id=UID["priya"],
                        body="The apology-email heuristic is going straight into our onboarding docs.",
                        score=264,
                        created_at=days_ago(3),
                    ),
                ]
            )

            session.add(
                PostVote(user_id=UID["maya"], post_id=PID["p1"], value=1)
            )

            session.add_all(
                [
                    Notification(
                        user_id=UID["maya"],
                        type="reply",
                        message="devon_ops replied to your comment in Cloud",
                        link=f"/posts/{PID['p1']}",
                        is_read=False,
                        created_at=hours_ago(1),
                    ),
                    Notification(
                        user_id=UID["maya"],
                        type="vote",
                        message="Your post reached 1,000 upvotes in DevOps",
                        link=f"/posts/{PID['p3']}",
                        is_read=False,
                        created_at=hours_ago(6),
                    ),
                    Notification(
                        user_id=UID["maya"],
                        type="comment",
                        message="sam_writes_sql commented on your post",
                        link=f"/posts/{PID['p1']}",
                        is_read=True,
                        created_at=hours_ago(20),
                    ),
                ]
            )

        print("Seed complete.")
        print("  Login: maya_builds / password123")
        print("  (also: devon_ops, sam_writes_sql, priya_ts — same password)")


if __name__ == "__main__":
    asyncio.run(seed())
