import { isAxiosError } from 'axios'
import type { ApiErrorBody } from '../features/auth/types'

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError<ApiErrorBody>(error) && error.response?.data?.message) {
    return error.response.data.message
  }
  return fallback
}
