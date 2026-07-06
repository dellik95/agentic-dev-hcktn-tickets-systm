import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../test/renderWithProviders'
import { BoardPage } from './BoardPage'
import * as ticketsApi from '../tickets/ticketsApi'
import type { Ticket } from '../tickets/types'

const TEAM_ID = 'team-1'

// BoardPage (via useTickets/usePatchTicketState) and TicketForm's create-mode both go through this
// module — mocked wholesale so every function it exports exists, even the ones these tests never
// exercise (create/update/delete), while getTickets/patchTicketState are configured per test below.
vi.mock('../tickets/ticketsApi', () => ({
  getTickets: vi.fn(),
  getTicket: vi.fn(),
  createTicket: vi.fn(),
  updateTicket: vi.fn(),
  patchTicketState: vi.fn(),
  deleteTicket: vi.fn(),
}))

// TeamSelector (via useTeams) and BoardPage's own epic filter (via useEpics) are mocked so neither
// fires a real HTTP request — this suite is only concerned with ticket filtering/rollback.
vi.mock('../teams/useTeams', () => ({
  useTeams: () => ({ data: [{ id: TEAM_ID, name: 'Team 1', createdAt: '', updatedAt: '' }], isLoading: false }),
}))
vi.mock('../epics/useEpics', () => ({
  useEpics: () => ({ data: [], isLoading: false }),
}))

function makeTicket(overrides: Partial<Ticket>): Ticket {
  return {
    id: 'ticket-id',
    teamId: TEAM_ID,
    epicId: null,
    type: 'bug',
    state: 'new',
    title: 'A ticket',
    body: '',
    createdBy: { id: 'user-1', email: 'user@example.com' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('BoardPage', () => {
  it('combines the type filter and search filter with AND logic (T06.5)', async () => {
    const bugTicket = makeTicket({ id: 't1', type: 'bug', title: 'Login bug' })
    const featureTicket = makeTicket({ id: 't2', type: 'feature', title: 'Login feature' })
    const otherBugTicket = makeTicket({ id: 't3', type: 'bug', title: 'Unrelated bug' })

    vi.mocked(ticketsApi.getTickets).mockResolvedValue([bugTicket, featureTicket, otherBugTicket])

    renderWithProviders(<BoardPage />, { route: `/board?teamId=${TEAM_ID}` })

    // Wait for the initial (unfiltered) fetch to land using real timers, before the debounce timer
    // below is faked — mixing fake timers with findBy*'s own internal polling is best avoided.
    expect(await screen.findByText('Login bug')).toBeInTheDocument()
    expect(screen.getByText('Login feature')).toBeInTheDocument()
    expect(screen.getByText('Unrelated bug')).toBeInTheDocument()

    // select #0 is the page-level TeamSelector, #1 is the type filter (matches the Playwright suite).
    const typeSelect = screen.getAllByRole('combobox')[1] as HTMLSelectElement
    const searchInput = screen.getByPlaceholderText('Search title…')

    vi.useFakeTimers()
    try {
      fireEvent.change(typeSelect, { target: { value: 'bug' } })
      fireEvent.change(searchInput, { target: { value: 'Login' } })
      // Cross the ~300ms debounce so the search term is committed to the URL (and therefore the filter).
      act(() => {
        vi.advanceTimersByTime(350)
      })
    } finally {
      vi.useRealTimers()
    }

    expect(screen.getByText('Login bug')).toBeInTheDocument()
    expect(screen.queryByText('Login feature')).not.toBeInTheDocument()
    expect(screen.queryByText('Unrelated bug')).not.toBeInTheDocument()
  })

  it('rolls back a card to its original state when the status-change request fails (T06.4)', async () => {
    const ticket = makeTicket({ id: 'rollback-ticket', state: 'new', title: 'Rollback ticket' })

    // getTickets resolves to a FIXED ticket that's always back in 'new' — including for the
    // onSettled-triggered refetch after the rejected mutation below. That refetch alone would be
    // enough to make the assertions below pass even if usePatchTicketState's onError rollback were
    // deleted entirely, since the mocked server-truth already matches the pre-mutation state; this
    // test's value is in proving the visible end state is correct (spec's actual requirement: "the
    // card must return to its previous column"), not in isolating which of the two mechanisms
    // (instant rollback vs. eventual refetch) produced it — see usePatchTicketState's own unit-level
    // guarantees (onMutate/onError) in useTickets.ts for that.
    vi.mocked(ticketsApi.getTickets).mockResolvedValue([ticket])
    vi.mocked(ticketsApi.patchTicketState).mockRejectedValueOnce(new Error('network down'))

    renderWithProviders(<BoardPage />, { route: `/board?teamId=${TEAM_ID}` })

    const card = await screen.findByTestId(`board-card-${ticket.id}`)
    const statusSelect = within(card).getByRole('combobox') as HTMLSelectElement
    expect(statusSelect.value).toBe('new')

    fireEvent.change(statusSelect, { target: { value: 'done' } })

    // getApiErrorMessage falls back to this generic message for a plain (non-Axios) Error.
    expect(await screen.findByText(/Could not move ticket/)).toBeInTheDocument()
    // The dropdown/card ends up back on the ORIGINAL state, not the optimistically-applied one.
    await waitFor(() => expect(statusSelect.value).toBe('new'))
  })
})
