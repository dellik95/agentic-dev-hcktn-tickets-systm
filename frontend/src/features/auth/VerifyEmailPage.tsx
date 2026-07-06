import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { verifyEmail } from './authApi'
import { ResendVerificationForm } from './ResendVerificationForm'
import { getApiErrorMessage } from '../../api/errors'

type Status = 'verifying' | 'success' | 'failure'

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [status, setStatus] = useState<Status>('verifying')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setStatus('failure')
      setError('This verification link is missing its token.')
      return
    }

    verifyEmail(token)
      .then(() => setStatus('success'))
      .catch((err) => {
        setStatus('failure')
        setError(getApiErrorMessage(err, 'This verification link is invalid or has expired.'))
      })
  }, [token])

  return (
    <div className="mx-auto mt-16 max-w-sm px-6 text-center">
      {status === 'verifying' && <p className="text-sm text-gray-600 dark:text-gray-400">Verifying your email…</p>}

      {status === 'success' && (
        <>
          <h1 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">Email verified</h1>
          <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">Your account is active. You can log in now.</p>
          <Link
            to="/login"
            className="inline-block rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white dark:bg-gray-100 dark:text-gray-900"
          >
            Go to login
          </Link>
        </>
      )}

      {status === 'failure' && (
        <>
          <h1 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">Verification failed</h1>
          <p className="mb-6 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
            {error}
          </p>
          <ResendVerificationForm />
        </>
      )}
    </div>
  )
}
