import { fireEvent, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../test/renderWithProviders'
import { TicketForm } from './TicketForm'
import type { Ticket } from './types'

const TEAM_A_ID = 'team-a'
const TEAM_B_ID = 'team-b'

const epicsForTeamA = [{ id: 'epic-a1', teamId: TEAM_A_ID, title: 'Epic A1', description: null, createdAt: '', updatedAt: '' }]
const epicsForTeamB = [{ id: 'epic-b1', teamId: TEAM_B_ID, title: 'Epic B1', description: null, createdAt: '', updatedAt: '' }]

// TeamSelector reads teams via useTeams — mocked here (rather than the underlying teamsApi module)
// so no real HTTP call is attempted and a team switch is possible without a network round trip.
vi.mock('../teams/useTeams', () => ({
  useTeams: () => ({
    data: [
      { id: TEAM_A_ID, name: 'Team A', createdAt: '', updatedAt: '' },
      { id: TEAM_B_ID, name: 'Team B', createdAt: '', updatedAt: '' },
    ],
    isLoading: false,
  }),
}))

// Epics are scoped per-team (T04.8) — team A and team B resolve to two DIFFERENT fixed lists so a
// team switch is observable both by the epic select's cleared value and by its changed options.
vi.mock('../epics/useEpics', () => ({
  useEpics: (teamId: string | null) => ({
    data: teamId === TEAM_A_ID ? epicsForTeamA : teamId === TEAM_B_ID ? epicsForTeamB : [],
    isLoading: false,
  }),
}))

// TicketForm's edit mode always renders CommentsSection as a sibling — mocked so it doesn't fire a
// real HTTP request for comments, which this test has nothing to do with.
vi.mock('../comments/useComments', () => ({
  useComments: () => ({ data: [], isLoading: false, isError: false }),
  useCreateComment: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

const ticket: Ticket = {
  id: 'ticket-1',
  teamId: TEAM_A_ID,
  epicId: epicsForTeamA[0].id,
  type: 'bug',
  state: 'new',
  title: 'Existing ticket',
  body: '',
  createdBy: { id: 'user-1', email: 'user@example.com' },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

// TicketForm's labels aren't associated to their <select>s via htmlFor/id (same as production
// markup relied on by the Playwright suite's `label:has-text("X") + select` selectors) — mirror
// that here instead of reaching for getByLabelText, which would never find a match.
function selectAfterLabel(labelText: string) {
  return screen.getByText(labelText).nextElementSibling as HTMLSelectElement
}

describe('TicketForm', () => {
  it('clears the selected epic when the team changes (T04.8)', () => {
    renderWithProviders(
      <MemoryRouter>
        <TicketForm teamId={TEAM_A_ID} ticket={ticket} onSaved={() => {}} onCancel={() => {}} />
      </MemoryRouter>,
    )

    const teamSelect = selectAfterLabel('Team')
    const epicSelect = selectAfterLabel('Epic')

    expect(teamSelect.value).toBe(TEAM_A_ID)
    expect(epicSelect.value).toBe(epicsForTeamA[0].id)

    fireEvent.change(teamSelect, { target: { value: TEAM_B_ID } })

    expect(epicSelect.value).toBe('')
    // Re-scoped, not just cleared — team A's epic must no longer even be selectable.
    expect(screen.queryByRole('option', { name: epicsForTeamA[0].title })).not.toBeInTheDocument()
    expect(screen.getByRole('option', { name: epicsForTeamB[0].title })).toBeInTheDocument()
  })
})
