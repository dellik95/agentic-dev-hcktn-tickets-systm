import { useState, type FormEvent } from 'react'
import { resendVerification } from './authApi'

export function ResendVerificationForm({ initialEmail = '' }: { initialEmail?: string }) {
  const [email, setEmail] = useState(initialEmail)
  const [status, setStatus] = useState<'idle' | 'submitting' | 'sent'>('idle')

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setStatus('submitting')
    // Always shows the same neutral message, matching the backend's anti-enumeration
    // behavior (a 202 is returned whether or not the account exists or is already verified).
    await resendVerification(email).catch(() => {})
    setStatus('sent')
  }

  if (status === 'sent') {
    return (
      <p className="rounded-md bg-gray-100 p-3 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-300">
        If an account exists for that email and isn't verified yet, a new verification link was sent.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 text-left">
      <label htmlFor="resend-email" className="text-sm text-gray-900 dark:text-gray-100">
        Resend verification email
      </label>
      <div className="flex gap-2">
        <input
          id="resend-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="min-w-0 flex-1 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        />
        <button
          type="submit"
          disabled={status === 'submitting'}
          className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-gray-100 dark:text-gray-900"
        >
          Resend
        </button>
      </div>
    </form>
  )
}
