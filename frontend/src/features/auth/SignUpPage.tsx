import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { signUp } from './authApi'
import { getApiErrorMessage } from '../../api/errors'

export function SignUpPage() {
  const [email, setEmail] = useState('Supervisor@test.com')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await signUp(email, password)
      setDone(true)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Sign up failed. Please try again.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="mx-auto mt-16 max-w-sm px-6 text-center">
        <h1 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">Check your email</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          We sent a verification link to <strong>{email}</strong>. Click it to activate your account, then log in.
        </p>
        <Link to="/login" className="mt-6 inline-block text-sm text-indigo-600 underline dark:text-indigo-400">
          Go to login
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto mt-16 max-w-sm px-6">
      <h1 className="mb-6 text-xl font-semibold text-gray-900 dark:text-gray-100">Sign up</h1>

      {error && (
        <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
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
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
          <span className="text-xs text-gray-500">At least 8 characters.</span>
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-gray-100 dark:text-gray-900"
        >
          {isSubmitting ? 'Signing up…' : 'Sign up'}
        </button>
      </form>

      <p className="mt-6 text-sm text-gray-600 dark:text-gray-400">
        Already have an account?{' '}
        <Link to="/login" className="text-indigo-600 underline dark:text-indigo-400">
          Log in
        </Link>
      </p>
    </div>
  )
}
