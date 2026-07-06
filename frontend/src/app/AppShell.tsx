import { NavLink, Outlet, useNavigate, useRouteLoaderData } from 'react-router-dom'
import { logout } from '../features/auth/session'
import type { CurrentUser } from '../features/auth/types'

const NAV_LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/teams', label: 'Teams', end: false },
  // Epics/Tickets links land alongside their epics.
  { to: '/epics', label: 'Epics', end: false },
  { to: '/tickets', label: 'Tickets', end: false },
  { to: '/board', label: 'Board', end: false },
]

function navLinkClassName({ isActive }: { isActive: boolean }) {
  return isActive
    ? 'text-sm font-medium text-gray-900 dark:text-gray-100'
    : 'text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
}

// Wraps every authenticated page (see app/routes.tsx) — nav links, current user, and logout
// live here once instead of being duplicated on each page.
export function AppShell() {
  const { user } = useRouteLoaderData('protected') as { user: CurrentUser }
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="shrink-0 border-b border-gray-200 dark:border-gray-800">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-3">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Ticketing System</span>
            <nav className="flex flex-wrap gap-x-4 gap-y-2">
              {NAV_LINKS.map((link) => (
                <NavLink key={link.to} to={link.to} end={link.end} className={navLinkClassName}>
                  {link.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-gray-500 dark:text-gray-400">{user.email}</span>
            <button
              onClick={() => void handleLogout()}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-900 dark:border-gray-700 dark:text-gray-100"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
