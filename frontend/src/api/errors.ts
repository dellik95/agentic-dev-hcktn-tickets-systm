import { isAxiosError } from 'axios'
import type { ApiErrorEnvelope } from './types'

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError<ApiErrorEnvelope>(error) && error.response?.data?.error) {
    const { message, fieldErrors } = error.response.data.error
    // Prefer the first field-level message (e.g. "Team name is required.") over the generic
    // "One or more fields are invalid." top-level message — much more useful on a single-field form.
    const firstFieldMessage = fieldErrors && Object.values(fieldErrors)[0]?.[0]
    return firstFieldMessage ?? message ?? fallback
  }
  return fallback
}

export function getApiErrorCode(error: unknown): string | undefined {
  return isAxiosError<ApiErrorEnvelope>(error) ? error.response?.data?.error?.code : undefined
}
