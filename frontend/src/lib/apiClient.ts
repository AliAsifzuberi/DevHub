/**
 * HTTP client for the DevHub API.
 *
 * Purpose: one Axios instance for base URL, auth headers, and error shaping.
 *
 * In development Vite proxies `/api` → `http://localhost:8000` (see
 * vite.config.ts), so the browser stays same-origin and CORS stays simple.
 */
import axios, { AxiosError } from 'axios'

export const apiClient = axios.create({
  baseURL: '/api',
  timeout: 10_000,
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * Access token lives in module memory (and is mirrored to sessionStorage by
 * AuthProvider so a refresh can restore the session).
 *
 * Why not localStorage as the source of truth?
 * Anything in localStorage is readable by any JS on the page (XSS). Memory is
 * better; sessionStorage is a pragmatic bridge until we add HttpOnly refresh
 * cookies. Never put long-lived credentials in localStorage.
 */
let accessToken: string | null = null

export const setAccessToken = (token: string | null): void => {
  accessToken = token
}

export const getAccessToken = (): string | null => accessToken

apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

export interface ApiError {
  status: number
  message: string
}

type FastApiDetail =
  | string
  | Array<{ msg?: string; loc?: Array<string | number> }>
  | undefined

const formatDetail = (detail: FastApiDetail): string | undefined => {
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail
      .map((item) => item.msg ?? JSON.stringify(item))
      .join('; ')
  }
  return undefined
}

export const toApiError = (error: AxiosError<{ detail?: FastApiDetail }>): ApiError => {
  if (error.response) {
    return {
      status: error.response.status,
      message:
        formatDetail(error.response.data?.detail) ??
        `Request failed with status ${error.response.status}`,
    }
  }
  return {
    status: 0,
    message: 'Unable to reach the server. Check your connection.',
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ detail?: FastApiDetail }>) =>
    Promise.reject(toApiError(error)),
)
