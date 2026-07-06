import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import './index.css'
import { router } from './app/router'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // TanStack Query's own default (retry 3x with backoff) treats every failure as transient —
      // including a 404 for a ticket id that will never exist, which would otherwise leave pages
      // like TicketDetailPage showing "Loading…" for several seconds before finally reporting the
      // real, permanent error. Only retry errors that might resolve on their own (network failures,
      // 5xx); a 4xx response is never going to succeed by trying again.
      retry: (failureCount, error) => {
        const status = isAxiosError(error) ? error.response?.status : undefined
        if (status !== undefined && status >= 400 && status < 500) return false
        return failureCount < 3
      },
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
