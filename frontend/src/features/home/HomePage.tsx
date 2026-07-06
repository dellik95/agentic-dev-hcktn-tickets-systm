import { useRouteLoaderData } from 'react-router-dom'
import type { CurrentUser } from '../auth/types'

export function HomePage() {
  const { user } = useRouteLoaderData('protected') as { user: CurrentUser }

  return (
    <div className="mx-auto mt-16 max-w-sm px-6 text-center">
      <h1 className="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-100">Welcome</h1>
      <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">Logged in as {user.email}</p>
      <p className="text-xs text-gray-500">Epics, tickets, and the board land epic-by-epic.</p>
    </div>
  )
}
