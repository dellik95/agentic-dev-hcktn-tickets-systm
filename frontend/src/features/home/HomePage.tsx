import { useNavigate, useRouteLoaderData } from 'react-router-dom'
import { logout } from '../auth/session'
import type { CurrentUser } from '../auth/types'

export function HomePage() {
  const { user } = useRouteLoaderData('protected') as { user: CurrentUser }
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div className="mx-auto mt-16 max-w-sm px-6 text-center">
      <h1 className="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-100">Ticketing System</h1>
      <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">Logged in as {user.email}</p>
      <p className="mb-6 text-xs text-gray-500">Teams, epics, tickets, and the board land epic-by-epic.</p>
      <button
        onClick={() => void handleLogout()}
        className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 dark:border-gray-700 dark:text-gray-100"
      >
        Log out
      </button>
    </div>
  )
}
