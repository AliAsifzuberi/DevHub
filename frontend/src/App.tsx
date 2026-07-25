/**
 * The application's route table.
 *
 * Purpose: map every URL to the component that renders it. This is the file to
 * open when you want to know what pages exist.
 *
 * HOW NESTED ROUTES WORK
 * The `<Route element={<AppLayout />}>` wrappers below are *layout routes*.
 * They match no path of their own; they render a shell containing an
 * `<Outlet />`, and whichever child route matches appears in that outlet. The
 * practical benefit is that the header and sidebar mount once and survive
 * navigation, keeping their state and avoiding a refetch on every page change.
 *
 * Two layout groups exist because login and registration are centred, focused
 * pages where a sidebar full of community links would be a distraction.
 *
 * URL DESIGN
 * Paths mirror the domain: `/c/:slug` for communities, `/u/:username` for
 * users, `/posts/:postId` for posts. Short, guessable, and — importantly —
 * they will match the backend's REST routes in Phase 2, so there is only one
 * naming scheme to keep in your head.
 *
 * Dependencies: React Router and every page component.
 */
import { Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute } from '@/components/routing/ProtectedRoute'
import { CommunitiesPage } from '@/pages/CommunitiesPage'
import { CommunityPage } from '@/pages/CommunityPage'
import { HomePage } from '@/pages/HomePage'
import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { PostDetailPage } from '@/pages/PostDetailPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { RegisterPage } from '@/pages/RegisterPage'
import { SubmitPage } from '@/pages/SubmitPage'

export default function App() {
  return (
    <Routes>
      {/* Main experience: feed-style pages with the discovery sidebar. */}
      <Route element={<AppLayout />}>
        {/* `index` is the child that renders when the parent's path matches
            exactly — here, the site root. */}
        <Route index element={<HomePage />} />
        <Route path="communities" element={<CommunitiesPage />} />
        <Route path="c/:slug" element={<CommunityPage />} />
        <Route path="posts/:postId" element={<PostDetailPage />} />
        <Route path="u/:username" element={<ProfilePage />} />

        {/*
          A pathless route whose element is the guard. Every route nested
          inside inherits the check, so protecting a new page is a matter of
          moving it into this block rather than remembering to add a guard.
          Forgetting is the failure mode worth designing against.
        */}
        <Route element={<ProtectedRoute />}>
          <Route path="submit" element={<SubmitPage />} />
        </Route>

        {/* `*` matches anything unmatched above. It must come last: React
            Router scores routes by specificity, but keeping the catch-all at
            the bottom also makes the intent obvious to the next reader. */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* Focused pages: same header, no sidebar. */}
      <Route element={<AppLayout withSidebar={false} />}>
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
      </Route>
    </Routes>
  )
}
