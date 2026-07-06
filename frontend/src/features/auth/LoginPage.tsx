import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login } from './session'
import { ResendVerificationForm } from './ResendVerificationForm'
import { getApiErrorCode, getApiErrorMessage } from '../../api/errors'
import { AUTH_ERROR_CODES } from '../../api/errorCodes'

export function LoginPage() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('Supervisor@test.com')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showResend, setShowResend] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setShowResend(false)
    setIsSubmitting(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      if (getApiErrorCode(err) === AUTH_ERROR_CODES.EMAIL_NOT_VERIFIED) {
        setShowResend(true)
      } else {
        setError(getApiErrorMessage(err, 'Login failed. Please try again.'))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto mt-16 max-w-sm px-6">
      <h1 className="mb-6 text-xl font-semibold text-gray-900 dark:text-gray-100">Log in</h1>

      {error && (
        <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      )}

      {showResend && (
        <div className="mb-4 rounded-md bg-amber-50 p-3 dark:bg-amber-950">
          <p className="mb-3 text-sm text-amber-800 dark:text-amber-300">
            Please verify your email before logging in.
          </p>
          <ResendVerificationForm initialEmail={email} />
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1 text-left">
          <label htmlFor="email" className="text-sm text-gray-900 dark:text-gray-100">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
        </div>
        <div className="flex flex-col gap-1 text-left">
          <label htmlFor="password" className="text-sm text-gray-900 dark:text-gray-100">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-gray-100 dark:text-gray-900"
        >
          {isSubmitting ? 'Logging in…' : 'Log in'}
        </button>
      </form>

      <p className="mt-6 text-sm text-gray-600 dark:text-gray-400">
        Don't have an account?{' '}
        <Link to="/signup" className="text-indigo-600 underline dark:text-indigo-400">
          Sign up
        </Link>
      </p>
    </div>
  )
}
