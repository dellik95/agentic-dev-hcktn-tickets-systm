import { apiClient } from '../../api/client'
import type { AuthTokens, CurrentUser } from './types'

export async function signUp(email: string, password: string): Promise<void> {
  await apiClient.post('/auth/signup', { email, password })
}

export async function login(email: string, password: string): Promise<AuthTokens> {
  const { data } = await apiClient.post<AuthTokens>('/auth/login', { email, password })
  return data
}

export async function logout(refreshToken: string): Promise<void> {
  await apiClient.post('/auth/logout', { refreshToken })
}

export async function refresh(refreshToken: string): Promise<AuthTokens> {
  const { data } = await apiClient.post<AuthTokens>('/auth/refresh', { refreshToken })
  return data
}

export async function verifyEmail(token: string): Promise<void> {
  await apiClient.get('/auth/verify-email', { params: { token } })
}

export async function resendVerification(email: string): Promise<void> {
  await apiClient.post('/auth/resend-verification', { email })
}

export async function getMe(): Promise<CurrentUser> {
  const { data } = await apiClient.get<CurrentUser>('/auth/me')
  return data
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await apiClient.put('/auth/password', { currentPassword, newPassword })
}

export async function forgotPassword(email: string): Promise<void> {
  await apiClient.post('/auth/forgot-password', { email })
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await apiClient.post('/auth/reset-password', { token, newPassword })
}

export async function getAvatar(): Promise<string | null> {
  const { data } = await apiClient.get<{ avatarDataUrl: string | null }>('/auth/me/avatar')
  return data.avatarDataUrl
}

export async function updateAvatar(avatarDataUrl: string): Promise<void> {
  await apiClient.put('/auth/me/avatar', { avatarDataUrl })
}
