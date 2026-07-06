import type { ReactElement, ReactNode } from 'react'
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'

interface RenderWithProvidersOptions {
  /**
   * Initial route to mount a MemoryRouter around `ui` with. Omit if `ui` already brings its own
   * Router (e.g. it's wrapped in <MemoryRouter> itself) or no router context is needed at all.
   */
  route?: string
}

// Shared by every component test that touches TanStack Query. A fresh QueryClient per call keeps
// each test's cache isolated, and retries are disabled for both queries AND mutations so a mocked
// rejected request (e.g. a failed mutation used to exercise rollback logic) settles on the first
// attempt instead of retrying with backoff and dragging the test out / risking a timeout.
export function renderWithProviders(ui: ReactElement, { route }: RenderWithProvidersOptions = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  function Wrapper({ children }: { children: ReactNode }) {
    const tree = <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    return route !== undefined ? <MemoryRouter initialEntries={[route]}>{tree}</MemoryRouter> : tree
  }

  return { queryClient, ...render(ui, { wrapper: Wrapper }) }
}
