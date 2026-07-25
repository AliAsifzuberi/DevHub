/**
 * Seed data for local development.
 *
 * Purpose: let Phase 1 build and validate the entire UI before a backend
 * exists. This is scaffolding with a deliberate shelf life — in Phase 3 the
 * real API replaces it and this file is deleted.
 *
 * Why bother with fake data instead of just building the backend first?
 * Because it decouples the two tiers. Working against a fixed, known dataset
 * means UI bugs are unambiguous: if the feed renders wrong, the bug is in the
 * feed, not in a half-finished SQL query. It also forces us to define the API
 * contract up front, which is the part that actually matters.
 *
 * Dependencies: only the domain types, so the compiler guarantees this mock
 * data stays structurally identical to what the real API must return. If
 * someone adds a required field to `Post`, this file stops compiling — which
 * is exactly the reminder we want.
 */
import type {
  AppNotification,
  Comment,
  Community,
  Post,
  User,
} from '@/types'

/**
 * Timestamps are generated relative to "now" rather than hardcoded, so the
 * seed data never goes stale. A fixed date like "2024-01-01" would render as
 * "2 years ago" forever and make the relative-time formatting look broken.
 */
const hoursAgo = (hours: number): string =>
  new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

const daysAgo = (days: number): string => hoursAgo(days * 24)

export const users: Record<string, User> = {
  maya: {
    id: 'u_1',
    username: 'maya_builds',
    displayName: 'Maya Chen',
    avatarUrl: null,
    bio: 'Platform engineer. Terraform apologist. I like boring technology.',
    createdAt: daysAgo(420),
    karma: 12840,
  },
  dev: {
    id: 'u_2',
    username: 'devon_ops',
    displayName: 'Devon Okafor',
    avatarUrl: null,
    bio: 'SRE. On call so you do not have to be.',
    createdAt: daysAgo(310),
    karma: 8390,
  },
  sam: {
    id: 'u_3',
    username: 'sam_writes_sql',
    displayName: 'Sam Rivera',
    avatarUrl: null,
    bio: 'Database nerd. Ask me about query plans.',
    createdAt: daysAgo(190),
    karma: 5120,
  },
  priya: {
    id: 'u_4',
    username: 'priya_ts',
    displayName: 'Priya Nair',
    avatarUrl: null,
    bio: 'Frontend. Accessibility is not optional.',
    createdAt: daysAgo(95),
    karma: 3410,
  },
}

/**
 * The signed-in user for Phase 1. Real authentication arrives in Phase 3;
 * until then this constant stands in for "whoever is logged in", which is
 * what makes the viewer-relative fields (`isMember`, `viewerVote`) meaningful.
 */
export const currentUser: User = users.maya

export const communities: Community[] = [
  {
    id: 'c_1',
    slug: 'devops',
    name: 'DevOps',
    description:
      'Deployment pipelines, infrastructure as code, and the eternal search for a green build.',
    memberCount: 48210,
    createdAt: daysAgo(700),
    accentColor: '#4f46e5',
    isMember: true,
  },
  {
    id: 'c_2',
    slug: 'databases',
    name: 'Databases',
    description:
      'Schema design, query optimisation, migrations, and war stories about production indexes.',
    memberCount: 31980,
    createdAt: daysAgo(650),
    accentColor: '#0ea5e9',
    isMember: true,
  },
  {
    id: 'c_3',
    slug: 'react',
    name: 'React',
    description:
      'Components, hooks, rendering behaviour, and state management debates that never end.',
    memberCount: 92450,
    createdAt: daysAgo(880),
    accentColor: '#06b6d4',
    isMember: false,
  },
  {
    id: 'c_4',
    slug: 'python',
    name: 'Python',
    description:
      'From async web services to the packaging situation. Especially the packaging situation.',
    memberCount: 76310,
    createdAt: daysAgo(910),
    accentColor: '#f59e0b',
    isMember: true,
  },
  {
    id: 'c_5',
    slug: 'cloud',
    name: 'Cloud',
    description:
      'GCP, AWS, Azure. Architecture, cost control, and reading the bill with your eyes closed.',
    memberCount: 54070,
    createdAt: daysAgo(540),
    accentColor: '#10b981',
    isMember: false,
  },
]

const communityBySlug = (slug: string): Community => {
  const found = communities.find((c) => c.slug === slug)
  // Fail loudly on a typo rather than rendering a blank card. During
  // development, a crash with a clear message beats silent wrong output.
  if (!found) throw new Error(`Seed data references unknown community: ${slug}`)
  return found
}

export const posts: Post[] = [
  {
    id: 'p_1',
    title: 'We cut our Cloud Run cold starts from 4s to 300ms. Here is what actually mattered.',
    body: `Everyone told us to "just increase minimum instances" and pay the bill. That works, but it hides the real problem instead of fixing it.

The three changes that actually moved the needle:

1. Slimming the container image from 1.2GB to 180MB using a multi-stage build. Cloud Run has to pull the image before it can start your process, so image size is directly on the critical path.

2. Moving database connection setup out of module import and into a lazy startup hook. We were opening a connection pool at import time, which meant every cold start paid for a TCP handshake plus TLS negotiation before serving a single byte.

3. Deferring imports of heavy libraries that only two endpoints needed.

Minimum instances went from a workaround to a genuine optimisation on top of an already-fast start.`,
    author: users.maya,
    community: communityBySlug('cloud'),
    createdAt: hoursAgo(5),
    score: 1284,
    commentCount: 6,
    viewerVote: 1,
  },
  {
    id: 'p_2',
    title: 'Your ORM is not slow. Your query is doing 400 round trips.',
    body: `I keep seeing teams rip out a perfectly good ORM because "it is slow", when the actual problem is the N+1 query pattern.

You fetch 100 posts. Then you access post.author inside the render loop. That is 1 query for the posts and 100 more for the authors. The ORM did exactly what you asked. You just asked for something expensive without noticing.

Turn on query logging in development. Count the queries on your slowest endpoint. I promise the number will surprise you.`,
    author: users.sam,
    community: communityBySlug('databases'),
    createdAt: hoursAgo(11),
    score: 942,
    commentCount: 4,
    viewerVote: 0,
  },
  {
    id: 'p_3',
    title: 'Terraform state is not a build artifact. Stop putting it in git.',
    body: `Committing terraform.tfstate to version control feels harmless right up until two engineers apply at the same time and one of them silently destroys a production database.

State belongs in a remote backend with locking. On GCP that is a Cloud Storage bucket with versioning enabled. It takes about six lines of configuration and it is the difference between a recoverable mistake and an outage.

Also: state files contain secrets in plaintext. If yours is in git, treat every credential in it as compromised.`,
    author: users.maya,
    community: communityBySlug('devops'),
    createdAt: hoursAgo(19),
    score: 2103,
    commentCount: 3,
    viewerVote: 0,
  },
  {
    id: 'p_4',
    title: 'useEffect is not a lifecycle method and treating it like one is why your code is confusing',
    body: `The mental model that unlocked this for me: useEffect does not mean "run after render". It means "synchronise this component with something outside React".

Fetching data on mount? That is synchronisation with a server. Subscribing to a WebSocket? Synchronisation with a connection. Setting document.title? Synchronisation with the DOM outside your tree.

If your effect is not synchronising with something external, it probably should not be an effect. Derived state belongs in a plain variable during render, not in useState plus useEffect.`,
    author: users.priya,
    community: communityBySlug('react'),
    createdAt: daysAgo(2),
    score: 1567,
    commentCount: 2,
    viewerVote: -1,
  },
  {
    id: 'p_5',
    title: 'async def does not make your endpoint faster if you call blocking code inside it',
    body: `Saw this in a code review this week and it is worth a PSA.

Declaring a FastAPI endpoint as async def and then calling a synchronous library inside it is worse than not using async at all. The blocking call occupies the event loop thread, and every other concurrent request waits behind it.

Either use an async-native driver, or declare the endpoint as a regular def and let FastAPI run it in a threadpool. The second option is genuinely fine and much better than blocking the loop.`,
    author: users.dev,
    community: communityBySlug('python'),
    createdAt: daysAgo(3),
    score: 811,
    commentCount: 2,
    viewerVote: 0,
  },
  {
    id: 'p_6',
    title: 'Redis is not a database and the moment you treat it like one you will lose data',
    body: `Redis is superb at what it is for: caching, rate limiting, ephemeral session state, pub/sub fan-out.

It is not where your source of truth lives. Default persistence settings can lose the last few seconds of writes on a crash, and that is a completely acceptable trade for a cache and a catastrophic one for an order record.

Rule of thumb I use: if losing this key would require an apology email, it does not belong only in Redis.`,
    author: users.dev,
    community: communityBySlug('devops'),
    createdAt: daysAgo(4),
    score: 1330,
    commentCount: 1,
    viewerVote: 0,
  },
]

/**
 * Comments are stored as a nested tree here to match what the API will
 * return. Note `p_1` has replies three levels deep — that is intentional test
 * data, because a recursive renderer that works at depth 1 can still be broken
 * at depth 3, and shallow seed data hides that bug.
 */
export const commentsByPostId: Record<string, Comment[]> = {
  p_1: [
    {
      id: 'cm_1',
      postId: 'p_1',
      parentId: null,
      author: users.dev,
      body: 'The lazy connection pool point is underrated. We had the exact same issue and it took us two weeks to find because it only showed up on cold starts, which our load tests never triggered.',
      createdAt: hoursAgo(4),
      score: 214,
      viewerVote: 1,
      replies: [
        {
          id: 'cm_2',
          postId: 'p_1',
          parentId: 'cm_1',
          author: users.maya,
          body: 'Load tests hiding cold-start problems is such a common trap. By the time your test ramps up, every instance is warm and you are measuring the happy path exclusively.',
          createdAt: hoursAgo(3),
          score: 98,
          viewerVote: 0,
          replies: [
            {
              id: 'cm_3',
              postId: 'p_1',
              parentId: 'cm_2',
              author: users.sam,
              body: 'We started running a separate synthetic check that deliberately hits a scaled-to-zero revision once an hour just to keep the cold-start number honest.',
              createdAt: hoursAgo(2),
              score: 45,
              viewerVote: 0,
              replies: [],
            },
          ],
        },
        {
          id: 'cm_4',
          postId: 'p_1',
          parentId: 'cm_1',
          author: users.priya,
          body: 'Does the multi-stage build change complicate your local development at all? Curious whether you kept a separate dev target.',
          createdAt: hoursAgo(2),
          score: 31,
          viewerVote: 0,
          replies: [],
        },
      ],
    },
    {
      id: 'cm_5',
      postId: 'p_1',
      parentId: null,
      author: users.sam,
      body: 'Worth adding that image pull time is cached per instance, so the benefit is largest exactly when you are scaling up fast — which is the moment you least want extra latency.',
      createdAt: hoursAgo(3),
      score: 156,
      viewerVote: 0,
      replies: [
        {
          id: 'cm_6',
          postId: 'p_1',
          parentId: 'cm_5',
          author: users.maya,
          body: 'Exactly. Cold starts correlate with traffic spikes, which is the worst possible correlation for user experience.',
          createdAt: hoursAgo(1),
          score: 62,
          viewerVote: 0,
          replies: [],
        },
      ],
    },
  ],
  p_2: [
    {
      id: 'cm_7',
      postId: 'p_2',
      parentId: null,
      author: users.maya,
      body: 'Query logging in development should honestly be a default. The feedback loop of "I wrote this line and it cost 40 queries" teaches more than any blog post.',
      createdAt: hoursAgo(9),
      score: 187,
      viewerVote: 0,
      replies: [
        {
          id: 'cm_8',
          postId: 'p_2',
          parentId: 'cm_7',
          author: users.sam,
          body: 'I add an assertion in tests that a given endpoint issues fewer than N queries. It fails loudly the moment someone reintroduces the pattern.',
          createdAt: hoursAgo(8),
          score: 143,
          viewerVote: 1,
          replies: [],
        },
      ],
    },
    {
      id: 'cm_9',
      postId: 'p_2',
      parentId: null,
      author: users.priya,
      body: 'The framing of "the ORM did exactly what you asked" reframed this for me. It is an interface problem, not a performance problem.',
      createdAt: hoursAgo(7),
      score: 76,
      viewerVote: 0,
      replies: [
        {
          id: 'cm_10',
          postId: 'p_2',
          parentId: 'cm_9',
          author: users.dev,
          body: 'Right, the ORM makes an expensive operation look free. That is the actual design flaw worth criticising.',
          createdAt: hoursAgo(6),
          score: 54,
          viewerVote: 0,
          replies: [],
        },
      ],
    },
  ],
  p_3: [
    {
      id: 'cm_11',
      postId: 'p_3',
      parentId: null,
      author: users.dev,
      body: 'The secrets-in-plaintext part is the one people miss. I have seen database passwords sitting in a state file in a public repo more than once.',
      createdAt: hoursAgo(17),
      score: 402,
      viewerVote: 1,
      replies: [
        {
          id: 'cm_12',
          postId: 'p_3',
          parentId: 'cm_11',
          author: users.maya,
          body: 'And rotating them after the fact is much harder than setting up a remote backend correctly on day one.',
          createdAt: hoursAgo(15),
          score: 188,
          viewerVote: 0,
          replies: [],
        },
      ],
    },
    {
      id: 'cm_13',
      postId: 'p_3',
      parentId: null,
      author: users.priya,
      body: 'Bucket versioning saved us once. Someone applied against the wrong workspace and we restored the previous state generation in about a minute.',
      createdAt: hoursAgo(12),
      score: 97,
      viewerVote: 0,
      replies: [],
    },
  ],
  p_4: [
    {
      id: 'cm_14',
      postId: 'p_4',
      parentId: null,
      author: users.maya,
      body: '"Synchronise with something outside React" is the clearest one-line explanation of effects I have read.',
      createdAt: daysAgo(1),
      score: 233,
      viewerVote: 0,
      replies: [
        {
          id: 'cm_15',
          postId: 'p_4',
          parentId: 'cm_14',
          author: users.priya,
          body: 'It also explains why the dependency array exists. It is not a performance knob, it describes what the synchronisation depends on.',
          createdAt: daysAgo(1),
          score: 145,
          viewerVote: 0,
          replies: [],
        },
      ],
    },
  ],
  p_5: [
    {
      id: 'cm_16',
      postId: 'p_5',
      parentId: null,
      author: users.sam,
      body: 'The threadpool fallback being genuinely fine is the part people resist. Plain def is not a failure state.',
      createdAt: daysAgo(2),
      score: 121,
      viewerVote: 0,
      replies: [
        {
          id: 'cm_17',
          postId: 'p_5',
          parentId: 'cm_16',
          author: users.dev,
          body: 'Agreed. Reaching for async everywhere without an async driver underneath is cargo cult concurrency.',
          createdAt: daysAgo(2),
          score: 88,
          viewerVote: 0,
          replies: [],
        },
      ],
    },
  ],
  p_6: [
    {
      id: 'cm_18',
      postId: 'p_6',
      parentId: null,
      author: users.priya,
      body: 'The apology-email heuristic is going straight into our onboarding docs.',
      createdAt: daysAgo(3),
      score: 264,
      viewerVote: 0,
      replies: [],
    },
  ],
}

export const notifications: AppNotification[] = [
  {
    id: 'n_1',
    type: 'reply',
    message: 'devon_ops replied to your comment in Cloud',
    link: '/posts/p_1',
    isRead: false,
    createdAt: hoursAgo(1),
  },
  {
    id: 'n_2',
    type: 'vote',
    message: 'Your post reached 1,000 upvotes in DevOps',
    link: '/posts/p_3',
    isRead: false,
    createdAt: hoursAgo(6),
  },
  {
    id: 'n_3',
    type: 'comment',
    message: 'sam_writes_sql commented on your post',
    link: '/posts/p_1',
    isRead: true,
    createdAt: hoursAgo(20),
  },
]
