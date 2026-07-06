// Access token: in-memory only (module-level closure, never localStorage) — shrinks the
// XSS token-theft window since it can't be read by a script that merely runs, it needs one
// running at the exact moment a request is made.
// Refresh token: localStorage — accepted trade-off at this scope so a page refresh doesn't
// force re-login. See docs/epics/EPIC-01-auth-and-accounts.md (T01.14).

const REFRESH_TOKEN_KEY = 'ticketing.refreshToken'

let accessToken: string | null = null
const listeners = new Set<() => void>()

export function getAccessToken(): string | null {
  return accessToken
}

export function setAccessToken(token: string | null): void {
  accessToken = token
  listeners.forEach((listener) => listener())
}

export function subscribeToAccessToken(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// `window.localStorage` explicitly (not the bare `localStorage` global) — Node 22+'s own
// experimental global Storage API otherwise shadows jsdom's implementation under Vitest.
export function getRefreshToken(): string | null {
  return window.localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function setRefreshToken(token: string | null): void {
  if (token) window.localStorage.setItem(REFRESH_TOKEN_KEY, token)
  else window.localStorage.removeItem(REFRESH_TOKEN_KEY)
}

export function clearSession(): void {
  setAccessToken(null)
  setRefreshToken(null)
}
