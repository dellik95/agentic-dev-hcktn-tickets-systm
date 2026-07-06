import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { resetPassword } from './authApi'
import { getApiErrorMessage } from '../../api/errors'

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  if (!token) {
    return (
      <div className="mx-auto mt-16 max-w-sm px-6 text-center">
        <h1 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">Reset failed</h1>
        <p className="mb-6 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          This reset link is missing its token.
        </p>
        <Link to="/forgot-password" className="text-sm text-indigo-600 underline dark:text-indigo-400">
          Request a new reset link
        </Link>
      </div>
    )
  }

  if (done) {
    return (
      <div className="mx-auto mt-16 max-w-sm px-6 text-center">
        <h1 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">Password reset</h1>
        <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
          Your password has been changed. You can log in now.
        </p>
        <Link
          to="/login"
          className="inline-block rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white dark:bg-gray-100 dark:text-gray-900"
        >
          Go to login
        </Link>
      </div>
    )
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    if (newPassword !== confirmNewPassword) {
      setError('New password and confirmation do not match.')
      return
    }

    setIsSubmitting(true)
    try {
      await resetPassword(token as string, newPassword)
      setDone(true)
    } catch (err) {
      setError(getApiErrorMessage(err, 'This reset link is invalid or has expired.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto mt-16 max-w-sm px-6">
      <h1 className="mb-6 text-xl font-semibold text-gray-900 dark:text-gray-100">Reset password</h1>

      {error && (
        <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1 text-left">
          <label htmlFor="newPassword" className="text-sm text-gray-900 dark:text-gray-100">
            New password
          </label>
          <input
            id="newPassword"
            type="password"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
          <span className="text-xs text-gray-500">At least 8 characters.</span>
        </div>
        <div className="flex flex-col gap-1 text-left">
          <label htmlFor="confirmNewPassword" className="text-sm text-gray-900 dark:text-gray-100">
            Confirm new password
          </label>
          <input
            id="confirmNewPassword"
            type="password"
            required
            minLength={8}
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
            className="rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-gray-100 dark:text-gray-900"
        >
          {isSubmitting ? 'Resetting…' : 'Reset password'}
        </button>
      </form>
    </div>
  )
}
