import { NavLink, Outlet, useNavigate, useRouteLoaderData } from 'react-router-dom'
import { logout } from '../features/auth/session'
import type { CurrentUser } from '../features/auth/types'

const NAV_LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/teams', label: 'Teams', end: false },
  // Epics/Tickets links land alongside their epics.
  { to: '/epics', label: 'Epics', end: false },
  { to: '/tickets', label: 'Tickets', end: false },
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
    <div className="min-h-screen">
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Ticketing System</span>
            <nav className="flex gap-4">
              {NAV_LINKS.map((link) => (
                <NavLink key={link.to} to={link.to} end={link.end} className={navLinkClassName}>
                  {link.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
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

      <main>
        <Outlet />
      </main>
    </div>
  )
}
