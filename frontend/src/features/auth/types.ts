export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresInSeconds: number
}

export interface CurrentUser {
  id: string
  email: string
  emailVerified: boolean
}
