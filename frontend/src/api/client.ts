import axios, { type InternalAxiosRequestConfig } from 'axios'
import { clearSession, getAccessToken, getRefreshToken, setAccessToken, setRefreshToken } from './tokenStore'

export const apiClient = axios.create({ baseURL: '/api/v1' })

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Endpoints that legitimately return 401 for reasons other than "access token expired"
// (bad credentials, invalid refresh token) — retrying those through a refresh would be
// either pointless or would mask the real error.
const SKIP_REFRESH_RETRY = ['/auth/login', '/auth/refresh']

let refreshPromise: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return null

  try {
    // Through apiClient (not raw axios) so the {success, data, error} envelope below is
    // unwrapped the same way as every other call.
    const { data } = await apiClient.post('/auth/refresh', { refreshToken })
    setAccessToken(data.accessToken)
    setRefreshToken(data.refreshToken)
    return data.accessToken as string
  } catch {
    clearSession()
    return null
  }
}

apiClient.interceptors.response.use(
  // Every backend response has the same {success, data, error} shape — unwrap so callers
  // (authApi.ts etc.) can keep treating response.data as the actual payload type.
  (response) => {
    response.data = response.data?.data;
    return response;
  },
  async (error) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined

    const shouldRetry =
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !SKIP_REFRESH_RETRY.some((path) => originalRequest.url?.includes(path))

    if (!shouldRetry) return Promise.reject(error)

    originalRequest._retry = true
    refreshPromise ??= refreshAccessToken().finally(() => {
      refreshPromise = null
    })

    const newToken = await refreshPromise
    if (!newToken) return Promise.reject(error)

    originalRequest.headers.Authorization = `Bearer ${newToken}`
    return apiClient(originalRequest)
  },
)
