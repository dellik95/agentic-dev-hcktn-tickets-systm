// Mirrors the backend's error codes (see Application/Auth/AuthDtos.cs, Teams/TeamDtos.cs) so
// call sites compare against a named constant instead of a magic string.
export const AUTH_ERROR_CODES = {
  EMAIL_TAKEN: 'EMAIL_TAKEN',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
} as const

export const TEAM_ERROR_CODES = {
  NAME_TAKEN: 'TEAM_NAME_TAKEN',
  NOT_FOUND: 'TEAM_NOT_FOUND',
  HAS_DEPENDENTS: 'TEAM_HAS_DEPENDENTS',
} as const

export const VALIDATION_ERROR_CODE = 'VALIDATION_ERROR'
