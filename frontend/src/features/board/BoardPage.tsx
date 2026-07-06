import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { TeamSelector } from '../teams/TeamSelector'
import { useEpics } from '../epics/useEpics'
import { useTickets, usePatchTicketState } from '../tickets/useTickets'
import { TICKET_STATES, TICKET_TYPES, type Ticket, type TicketState } from '../tickets/types'
import { Modal } from '../../components/Modal'
import { TicketForm } from '../tickets/TicketForm'
import { getApiErrorMessage } from '../../api/errors'
import { BoardColumn } from './BoardColumn'

const fieldClassName =
  'rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100'

// Distinct from '' ("All epics" / no filter) so tickets with no epic can be isolated (T06.5).
const NO_EPIC_FILTER = '__no_epic__'

// The Kanban board — the primary screen of the app (Epic 06). Team, type filter, epic filter, and
// title search all live in the URL search params so the exact view is shareable and survives a
// refresh (T06.5's nice-to-have).
export function BoardPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const teamId = searchParams.get('teamId')
  const filterType = searchParams.get('type') ?? ''
  const filterEpicId = searchParams.get('epicId') ?? ''
  const filterQ = searchParams.get('q') ?? ''

  // The search input is kept as local state so typing stays snappy; it's only pushed into the URL
  // (and therefore into the client-side filter below) ~300ms after the user stops typing.
  const [searchInput, setSearchInput] = useState(filterQ)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [dragError, setDragError] = useState<string | null>(null)

  // A small activation distance lets dnd-kit's PointerSensor tell a plain click (no movement) apart
  // from a real drag (movement past the threshold) — a click fires the card's onClick normally,
  // while exceeding the distance starts a drag and suppresses the click, per T06.6.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const setSearchParam = useCallback(
    (key: string, value: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (value) next.set(key, value)
          else next.delete(key)
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  useEffect(() => {
    const handle = setTimeout(() => setSearchParam('q', searchInput), 300)
    return () => clearTimeout(handle)
  }, [searchInput, setSearchParam])

  // Mirrors the URL's `q` back into the input on external changes (e.g. browser back/forward).
  // This is a no-op when the change originated from the debounce effect above, since by then the
  // URL already matches searchInput.
  useEffect(() => {
    setSearchInput(filterQ)
  }, [filterQ])

  function handleTeamChange(newTeamId: string) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('teamId', newTeamId)
        // An epic belongs to exactly one team (same rule TicketForm applies on team change) — an
        // epic filter carried over from a previously selected team can't apply here.
        next.delete('epicId')
        return next
      },
      { replace: true },
    )
  }

  // Fetch this team's tickets ONCE, unfiltered — filters are applied client-side below (T06.5).
  const { data: tickets, isLoading, isError, error } = useTickets(teamId)
  const { data: epics } = useEpics(teamId)
  const patchTicketState = usePatchTicketState(teamId ?? '')

  const epicsById = useMemo(() => new Map((epics ?? []).map((epic) => [epic.id, epic])), [epics])

  const filteredTickets = useMemo(() => {
    if (!tickets) return []
    const q = filterQ.trim().toLowerCase()
    return tickets.filter((ticket) => {
      if (filterType && ticket.type !== filterType) return false
      if (filterEpicId === NO_EPIC_FILTER) {
        if (ticket.epicId !== null) return false
      } else if (filterEpicId && ticket.epicId !== filterEpicId) {
        return false
      }
      if (q && !ticket.title.toLowerCase().includes(q)) return false
      return true
    })
  }, [tickets, filterType, filterEpicId, filterQ])

  // Bucketed, not re-sorted — the server already returns updatedAt DESC (T06.3).
  const ticketsByState = useMemo(() => {
    const buckets = new Map<TicketState, Ticket[]>(TICKET_STATES.map((state) => [state, []]))
    filteredTickets.forEach((ticket) => buckets.get(ticket.state)?.push(ticket))
    return buckets
  }, [filteredTickets])

  // Depend on the (stable, bound-method) `mutate` function itself, not the whole mutation result
  // object — @tanstack/react-query returns a brand-new result object on every render regardless of
  // whether the mutation's own state changed, which would otherwise recreate this callback (and
  // therefore defeat BoardCard's React.memo) on every incidental BoardPage re-render.
  const { mutate: patchState } = patchTicketState
  const handlePatchState = useCallback(
    (id: string, state: TicketState) => {
      patchState({ id, state }, { onError: (err) => setDragError(getApiErrorMessage(err, 'Could not move ticket.')) })
    },
    [patchState],
  )

  // Auto-clears so a stale error doesn't linger forever; the "Dismiss" button covers the impatient case.
  useEffect(() => {
    if (!dragError) return
    const handle = setTimeout(() => setDragError(null), 6000)
    return () => clearTimeout(handle)
  }, [dragError])

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return
    const ticketId = String(active.id)
    const newState = over.id as TicketState
    const ticket = tickets?.find((t) => t.id === ticketId)
    // Same-column drop (or dropped outside any known ticket) is a complete no-op — no API call —
    // per T06.4: drag-to-reorder-within-a-column isn't persisted and must not be implied.
    if (!ticket || ticket.state === newState) return
    handlePatchState(ticketId, newState)
  }

  const pendingTicketId = patchTicketState.isPending ? (patchTicketState.variables?.id ?? null) : null

  return (
    <div className="mx-auto mt-12 max-w-6xl px-6">
      <h1 className="mb-6 text-xl font-semibold text-gray-900 dark:text-gray-100">Board</h1>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <TeamSelector value={teamId} onChange={handleTeamChange} className={fieldClassName} />

        <select
          value={filterType}
          onChange={(e) => setSearchParam('type', e.target.value)}
          disabled={!teamId}
          className={fieldClassName}
        >
          <option value="">All types</option>
          {TICKET_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        <select
          value={filterEpicId}
          onChange={(e) => setSearchParam('epicId', e.target.value)}
          disabled={!teamId}
          className={fieldClassName}
        >
          <option value="">All epics</option>
          <option value={NO_EPIC_FILTER}>No epic</option>
          {epics?.map((epic) => (
            <option key={epic.id} value={epic.id}>
              {epic.title}
            </option>
          ))}
        </select>

        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search title…"
          disabled={!teamId}
          className={`min-w-0 flex-1 ${fieldClassName}`}
        />

        <button
          onClick={() => setShowCreateForm(true)}
          disabled={!teamId}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-gray-100 dark:text-gray-900"
        >
          Create ticket
        </button>
      </div>

      {showCreateForm && teamId && (
        <Modal title="Create ticket" onClose={() => setShowCreateForm(false)}>
          <TicketForm teamId={teamId} onSaved={() => setShowCreateForm(false)} onCancel={() => setShowCreateForm(false)} />
        </Modal>
      )}

      {dragError && (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          <span>Could not move ticket: {dragError}</span>
          <button onClick={() => setDragError(null)} className="shrink-0 font-medium">
            Dismiss
          </button>
        </div>
      )}

      {!teamId && <p className="text-sm text-gray-500">Select a team to see its board.</p>}

      {teamId && isError && (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400">{getApiErrorMessage(error, 'Could not load tickets.')}</p>
      )}

      {teamId && isLoading && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {TICKET_STATES.map((state) => (
            <div key={state} className="h-64 w-72 flex-shrink-0 animate-pulse rounded-md bg-gray-100 dark:bg-gray-900" />
          ))}
        </div>
      )}

      {teamId && !isLoading && !isError && tickets?.length === 0 && (
        <p className="mb-4 text-sm text-gray-500">This team has no tickets yet. Create one to get started.</p>
      )}

      {teamId && !isLoading && !isError && tickets && (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {TICKET_STATES.map((state) => (
              <BoardColumn
                key={state}
                state={state}
                tickets={ticketsByState.get(state) ?? []}
                epicsById={epicsById}
                pendingTicketId={pendingTicketId}
                onPatchState={handlePatchState}
              />
            ))}
          </div>
        </DndContext>
      )}
    </div>
  )
}
