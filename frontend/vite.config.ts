/**
 * Vite build & dev-server configuration.
 *
 * Vite plays two very different roles depending on the command:
 *   - `npm run dev`   -> a dev server that serves your source files over native
 *                        ES modules, so startup stays fast no matter how large
 *                        the app grows.
 *   - `npm run build` -> a production bundler (Rollup) that emits static
 *                        HTML/CSS/JS into `dist/`, which is what we will later
 *                        serve from a container on Cloud Run.
 *
 * Dependencies:
 *   @vitejs/plugin-react - enables JSX transform + Fast Refresh (hot reload
 *                          that preserves component state while you edit).
 *   @tailwindcss/vite    - Tailwind v4's first-party plugin. Tailwind v4 no
 *                          longer needs postcss.config.js or tailwind.config.js
 *                          for basic use; configuration lives in CSS instead.
 */
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],

  resolve: {
    /**
     * The `@` alias maps to `src/`, so imports read `@/components/ui/Button`
     * instead of `../../../components/ui/Button`. Relative-path chains break
     * whenever a file moves; an absolute alias does not. This must be kept in
     * sync with `paths` in tsconfig.app.json — Vite resolves the import at
     * runtime, TypeScript resolves it at type-check time, and they are
     * independent systems that each need to be told about the alias.
     */
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  server: {
    port: 5173,
    /**
     * Phase 3 preparation. The browser enforces the same-origin policy: a page
     * served from localhost:5173 calling localhost:8000 is a cross-origin
     * request, which triggers CORS preflights and cookie restrictions.
     *
     * By proxying, the browser only ever talks to localhost:5173, and Vite
     * forwards `/api/*` to FastAPI server-side. Same-origin as far as the
     * browser is concerned, so no CORS configuration is needed in development.
     * In production both tiers sit behind one domain, so the same relative
     * `/api` URLs keep working untouched.
     */
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
