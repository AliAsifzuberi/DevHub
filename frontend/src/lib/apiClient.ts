/**
 * The single configured Axios instance for talking to the DevHub backend.
 *
 * Purpose: centralise every cross-cutting concern of HTTP communication —
 * base URL, timeouts, auth headers, and global error handling — in one place.
 *
 * Why not just call `axios.get()` directly from components?
 * Because those cross-cutting concerns then get duplicated everywhere. When
 * the auth scheme changes, or the API moves to a new path, or you need to log
 * every 500 response, you would be editing dozens of files instead of one.
 * A configured instance is the standard answer to that problem.
 *
 * This file is not used by Phase 1 (which runs on mocks) but is written now
 * because it defines the contract the mock layer is imitating.
 *
 * Dependencies: axios only. Deliberately knows nothing about React, so it can
 * be unit-tested without rendering anything.
 */
import axios, { AxiosError } from 'axios'

/**
 * A relative base URL, not `http://localhost:8000`.
 *
 * In development, Vite's proxy (see vite.config.ts) forwards `/api` to
 * FastAPI, so the browser sees a same-origin request and CORS never enters the
 * picture. In production the same relative path resolves against whatever
 * domain the app is served from. Hardcoding an absolute URL would mean the
 * production build points at your laptop, which is a genuinely common and
 * very confusing deployment bug.
 */
export const apiClient = axios.create({
  baseURL: '/api',
  timeout: 10_000,
  headers: {
    'Content-Type': 'application/json',
  },
  /**
   * Send cookies with cross-origin requests. Relevant once refresh tokens live
   * in an HttpOnly cookie, which is the approach we will take in Phase 3.
   */
  withCredentials: true,
})

/**
 * Where the access token is held.
 *
 * It is kept in a module variable rather than `localStorage` on purpose.
 * Anything in localStorage is readable by any JavaScript running on the page,
 * so a single successful XSS attack — from a compromised npm dependency, for
 * instance — hands the attacker a token they can exfiltrate and reuse. A
 * variable in module scope dies when the tab closes and is not reachable from
 * injected script that does not already have a reference to this module.
 *
 * The trade-off is that a page refresh loses the token, which is precisely why
 * Phase 3 will pair this with a long-lived HttpOnly refresh cookie: the cookie
 * cannot be read by JavaScript at all, and it is used once on startup to mint
 * a fresh access token.
 */
let accessToken: string | null = null

export const setAccessToken = (token: string | null): void => {
  accessToken = token
}

/**
 * Request interceptor: attach the bearer token to every outgoing call.
 *
 * Doing this centrally means no endpoint can be accidentally called without
 * authentication because a developer forgot the header.
 */
apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

/**
 * Response interceptor: normalise errors before they reach calling code.
 *
 * Axios rejects with a large `AxiosError` whose useful information is buried
 * several levels deep. Components should not have to know that the server's
 * message lives at `error.response.data.detail` (which is FastAPI's convention
 * specifically). Flattening it here keeps that knowledge in one file.
 */
export interface ApiError {
  status: number
  message: string
}

const toApiError = (error: AxiosError<{ detail?: string }>): ApiError => {
  if (error.response) {
    return {
      status: error.response.status,
      message:
        error.response.data?.detail ??
        `Request failed with status ${error.response.status}`,
    }
  }
  // No response at all means the request never completed — the server is
  // unreachable, DNS failed, or the timeout fired. Status 0 is the convention
  // for "no HTTP response was received".
  return { status: 0, message: 'Unable to reach the server. Check your connection.' }
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ detail?: string }>) =>
    Promise.reject(toApiError(error)),
)
