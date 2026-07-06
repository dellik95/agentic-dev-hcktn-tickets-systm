import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { routes } from './routes'

describe('routes', () => {
  it('redirects an unauthenticated visitor from the protected route to /login', async () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/'] })
    render(<RouterProvider router={router} />)

    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument()
  })
})
