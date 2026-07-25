/**
 * Application entry point.
 *
 * Purpose: mount React into the DOM and install the providers that every
 * component depends on.
 *
 * PROVIDER ORDER MATTERS
 * A provider can only be consumed by components *below* it in the tree, so the
 * nesting here is a dependency graph:
 *
 *   QueryClientProvider   - server state; nothing above it can fetch
 *     AuthProvider        - uses no router or query hooks, so its position is
 *                           flexible, but it sits high so every page can read
 *                           the current user
 *       BrowserRouter     - URL state; must wrap anything using Link/useParams
 *         App             - the route table
 *
 * Getting this wrong produces errors like "useNavigate may be used only in the
 * context of a Router", which are confusing until you realise they are always
 * describing a provider that is nested too low.
 *
 * Dependencies: React DOM, React Query, React Router, and the auth provider.
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import App from '@/App'
import { AuthProvider } from '@/context/AuthProvider'
import { queryClient } from '@/lib/queryClient'
import '@/index.css'

const container = document.getElementById('root')

/**
 * A missing root element means index.html is wrong, and every subsequent error
 * would be a confusing downstream symptom. Failing immediately with a specific
 * message is far kinder than a null-reference exception deep inside React.
 */
if (!container) {
  throw new Error('Root element #root not found in index.html')
}

createRoot(container).render(
  /**
   * StrictMode is development-only and deliberately double-invokes renders,
   * effects, and state updaters. It is not a bug when you see an effect run
   * twice — it is StrictMode surfacing effects that are not safely repeatable,
   * which is exactly the class of bug that becomes intermittent in production.
   * It compiles out of the production build entirely.
   */
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>

      {/*
        The devtools panel is a genuinely excellent way to *see* the cache:
        which queries exist, whether they are fresh or stale, and what
        invalidation actually did. It ships only in development — Vite strips
        it from the production bundle via the DEV constant below.
      */}
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  </StrictMode>,
)
