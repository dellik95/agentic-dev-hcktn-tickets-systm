import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { forgotPassword } from './authApi'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setIsSubmitting(true)
    try {
      // Always shows the same confirmation, matching the backend's anti-enumeration behavior
      // (a 200 is returned whether or not the email is registered).
      await forgotPassword(email).catch(() => {})
    } finally {
      setIsSubmitting(false)
      setDone(true)
    }
  }

  if (done) {
    return (
      <div className="mx-auto mt-16 max-w-sm px-6 text-center">
        <h1 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">Check your email</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          If an account exists for that email, we've sent a password reset link.
        </p>
        <Link to="/login" className="mt-6 inline-block text-sm text-indigo-600 underline dark:text-indigo-400">
          Go to login
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto mt-16 max-w-sm px-6">
      <h1 className="mb-6 text-xl font-semibold text-gray-900 dark:text-gray-100">Forgot password</h1>
      <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
        Enter your email and we'll send you a link to reset your password.
      </p>

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
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-gray-100 dark:text-gray-900"
        >
          {isSubmitting ? 'Sending…' : 'Send reset link'}
        </button>
      </form>

      <p className="mt-6 text-sm text-gray-600 dark:text-gray-400">
        Remembered your password?{' '}
        <Link to="/login" className="text-indigo-600 underline dark:text-indigo-400">
          Log in
        </Link>
      </p>
    </div>
  )
}
