/**
 * The shell every page renders inside.
 *
 * Purpose: hold the header and sidebar so they persist across navigation.
 *
 * WHY A LAYOUT ROUTE
 * React Router's `<Outlet />` renders whichever child route currently matches.
 * Because the layout itself never unmounts as the URL changes, the header
 * keeps its state — an open dropdown stays open, and the sidebar's community
 * query is not refetched on every navigation.
 *
 * The alternative, importing `<Header />` at the top of all eight page
 * components, means the header unmounts and remounts on every navigation.
 * That throws away its state, re-runs its queries, and produces a visible
 * flicker. It is also eight places to update instead of one.
 *
 * Dependencies: React Router, the header, and the sidebar.
 */
import { Outlet } from 'react-router-dom'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'

interface AppLayoutProps {
  /** Pages like login are full-width and look wrong beside a sidebar. */
  withSidebar?: boolean
}

export function AppLayout({ withSidebar = true }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-canvas">
      <Header />

      <div className="mx-auto flex max-w-6xl gap-6 px-4 py-6">
        {/*
          `min-w-0` on a flex child is the fix for a problem that catches
          almost everyone once: flex items default to `min-width: auto`, which
          refuses to shrink below their content's intrinsic width. A long
          unbroken string — a URL in a post title — then forces the column
          wider than the viewport and the whole page scrolls sideways.
        */}
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>

        {withSidebar && <Sidebar />}
      </div>
    </div>
  )
}
