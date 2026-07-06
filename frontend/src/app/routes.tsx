import { Navigate, redirect, type RouteObject } from 'react-router-dom'
import { AppShell } from './AppShell'
import { SignUpPage } from '../features/auth/SignUpPage'
import { LoginPage } from '../features/auth/LoginPage'
import { VerifyEmailPage } from '../features/auth/VerifyEmailPage'
import { HomePage } from '../features/home/HomePage'
import { TeamsPage } from '../features/teams/TeamsPage'
import { EpicsPage } from '../features/epics/EpicsPage'
import { TicketsPage } from '../features/tickets/TicketsPage'
import { getCurrentUser } from '../features/auth/session'

// Runs before the protected layout renders — redirects to /login before any child route's
// element (or its own loader) ever executes. `useRouteLoaderData('protected')` in AppShell
// and its descendants reads the resolved user without re-fetching it.
async function protectedLoader() {
  const user = await getCurrentUser()
  if (!user) throw redirect('/login')
  return { user }
}

// Plain data — exported separately from the browser-specific router so tests can build a
// `createMemoryRouter` from the same route tree instead of duplicating it.
export const routes: RouteObject[] = [
  { path: '/signup', element: <SignUpPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/verify-email', element: <VerifyEmailPage /> },
  {
    id: 'protected',
    loader: protectedLoader,
    element: <AppShell />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/teams', element: <TeamsPage /> },
      { path: '/epics', element: <EpicsPage /> },
      { path: '/tickets', element: <TicketsPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]
