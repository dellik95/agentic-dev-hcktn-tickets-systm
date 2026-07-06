// Plain module (no React) so route loaders — which run outside the component tree — can read
// and drive auth state directly, instead of going through a context hook.
import { getMe, login as loginRequest, logout as logoutRequest, refresh as refreshRequest } from './authApi'
import { clearSession, getAccessToken, getRefreshToken, setAccessToken, setRefreshToken } from '../../api/tokenStore'
import type { CurrentUser } from './types'

let cachedUser: CurrentUser | null = null

// Called from the protected route's loader on every navigation into it. The access token
// lives only in memory, so after a hard refresh this exchanges the persisted refresh token
// for a fresh session before falling back to redirecting to /login.
export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (getAccessToken()) {
    if (cachedUser) return cachedUser
    return fetchAndCacheUser()
  }

  const storedRefreshToken = getRefreshToken()
  if (!storedRefreshToken) return null

  try {
    const tokens = await refreshRequest(storedRefreshToken)
    setAccessToken(tokens.accessToken)
    setRefreshToken(tokens.refreshToken)
    return fetchAndCacheUser()
  } catch {
    clearSession()
    return null
  }
}

async function fetchAndCacheUser(): Promise<CurrentUser | null> {
  try {
    cachedUser = await getMe()
    return cachedUser
  } catch {
    clearSession()
    cachedUser = null
    return null
  }
}

export async function login(email: string, password: string): Promise<CurrentUser> {
  const tokens = await loginRequest(email, password)
  setAccessToken(tokens.accessToken)
  setRefreshToken(tokens.refreshToken)
  cachedUser = await getMe()
  return cachedUser
}

export async function logout(): Promise<void> {
  const storedRefreshToken = getRefreshToken()
  if (storedRefreshToken) {
    await logoutRequest(storedRefreshToken).catch(() => {})
  }
  clearSession()
  cachedUser = null
}
