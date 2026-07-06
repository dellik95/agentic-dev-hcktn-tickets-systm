import { Navigate, Outlet, redirect, type RouteObject } from 'react-router-dom'
import { SignUpPage } from '../features/auth/SignUpPage'
import { LoginPage } from '../features/auth/LoginPage'
import { VerifyEmailPage } from '../features/auth/VerifyEmailPage'
import { HomePage } from '../features/home/HomePage'
import { getCurrentUser } from '../features/auth/session'

// Runs before the protected layout renders — redirects to /login before any child route's
// element (or its own loader) ever executes. `useRouteLoaderData('protected')` in a
// descendant reads the resolved user without re-fetching it.
async function protectedLoader() {
  const user = await getCurrentUser()
  if (!user) throw redirect('/login')
  return { user }
}

function ProtectedLayout() {
  return <Outlet />
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
    element: <ProtectedLayout />,
    children: [{ path: '/', element: <HomePage /> }],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]
