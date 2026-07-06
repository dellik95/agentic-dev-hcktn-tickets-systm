import { useState } from 'react'
import { TeamSelector } from '../teams/TeamSelector'
import { useEpics } from '../epics/useEpics'
import { useDeleteTicket, useTickets } from './useTickets'
import type { TicketFilters } from './ticketsApi'
import { TicketForm } from './TicketForm'
import { getApiErrorMessage } from '../../api/errors'
import { RichTextViewer } from '../../components/RichTextViewer'
import { Modal } from '../../components/Modal'
import { TICKET_STATE_LABELS, TICKET_TYPES, type Ticket, type TicketType } from './types'

const fieldClassName =
  'rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100'

export function TicketsPage() {
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)

  return (
    <div className="mx-auto mt-12 max-w-2xl px-6">
      <h1 className="mb-6 text-xl font-semibold text-gray-900 dark:text-gray-100">Tickets</h1>

      <TeamSelector value={selectedTeamId} onChange={setSelectedTeamId} className={`mb-6 w-full ${fieldClassName}`} />

      {selectedTeamId ? (
        <TicketsList teamId={selectedTeamId} />
      ) : (
        <p className="text-sm text-gray-500">Select a team to manage its tickets.</p>
      )}
    </div>
  )
}

function TicketsList({ teamId }: { teamId: string }) {
  const [filterType, setFilterType] = useState<TicketType | ''>('')
  const [filterEpicId, setFilterEpicId] = useState('')
  const [filterQ, setFilterQ] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null)
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({})

  const filters: TicketFilters = {
    ...(filterType ? { type: filterType } : {}),
    ...(filterEpicId ? { epicId: filterEpicId } : {}),
    ...(filterQ ? { q: filterQ } : {}),
  }

  // Fetched here (in addition to inside TicketForm, which needs the FORM's own team's epics) so
  // the filter dropdown and the "Epic: <title>" lookup on each row have this team's epics to work with.
  const { data: epics } = useEpics(teamId)
  const { data: tickets, isLoading, isError } = useTickets(teamId, filters)
  const deleteTicket = useDeleteTicket(teamId)

  function openCreateForm() {
    setEditingTicket(null)
    setShowCreateForm(true)
  }

  function openEditForm(ticket: Ticket) {
    setShowCreateForm(false)
    setEditingTicket(ticket)
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this ticket? This cannot be undone.')) return
    setRowErrors((prev) => ({ ...prev, [id]: '' }))
    try {
      await deleteTicket.mutateAsync(id)
    } catch (err) {
      setRowErrors((prev) => ({ ...prev, [id]: getApiErrorMessage(err, 'Could not delete ticket.') }))
    }
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as TicketType | '')}
          className={fieldClassName}
        >
          <option value="">All types</option>
          {TICKET_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        <select value={filterEpicId} onChange={(e) => setFilterEpicId(e.target.value)} className={fieldClassName}>
          <option value="">All epics</option>
          {epics?.map((epic) => (
            <option key={epic.id} value={epic.id}>
              {epic.title}
            </option>
          ))}
        </select>

        <input
          value={filterQ}
          onChange={(e) => setFilterQ(e.target.value)}
          placeholder="Search title…"
          className={`min-w-0 flex-1 ${fieldClassName}`}
        />
      </div>

      <button
        onClick={openCreateForm}
        className="mb-4 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white dark:bg-gray-100 dark:text-gray-900"
      >
        Create ticket
      </button>

      {showCreateForm && (
        <Modal title="Create ticket" onClose={() => setShowCreateForm(false)}>
          <TicketForm teamId={teamId} onSaved={() => setShowCreateForm(false)} onCancel={() => setShowCreateForm(false)} />
        </Modal>
      )}

      {editingTicket && (
        <Modal title="Edit ticket" onClose={() => setEditingTicket(null)}>
          {/* key forces a remount when switching directly from editing one ticket to another —
              without it, React treats this as a prop update on the same TicketForm instance, and
              its useState-seeded fields (title/body/type/epic) would keep the PREVIOUS ticket's
              values while `ticket.id` silently updates underneath, so Save could write the old
              ticket's field values onto the new ticket's id. */}
          <TicketForm
            key={editingTicket.id}
            teamId={teamId}
            ticket={editingTicket}
            onSaved={() => setEditingTicket(null)}
            onCancel={() => setEditingTicket(null)}
          />
        </Modal>
      )}

      {isLoading && <p className="mt-4 text-sm text-gray-500">Loading…</p>}
      {isError && <p className="mt-4 text-sm text-red-600 dark:text-red-400">Could not load tickets.</p>}
      {tickets?.length === 0 && <p className="mt-4 text-sm text-gray-500">No tickets yet.</p>}

      <ul className="mt-4 divide-y divide-gray-200 dark:divide-gray-800">
        {tickets?.map((ticket) => {
          const epicTitle = epics?.find((e) => e.id === ticket.epicId)?.title
          return (
            <li key={ticket.id} className="py-3">
              <div className="flex items-start justify-between gap-3">
                <button onClick={() => openEditForm(ticket)} className="min-w-0 flex-1 text-left">
                  <p className="text-sm text-gray-900 dark:text-gray-100">{ticket.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 dark:bg-gray-800">{ticket.type}</span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 dark:bg-gray-800">
                      {TICKET_STATE_LABELS[ticket.state]}
                    </span>
                    {epicTitle && <span>Epic: {epicTitle}</span>}
                  </div>
                  {ticket.body && (
                    <RichTextViewer
                      html={ticket.body}
                      className="rich-text-content mt-1 line-clamp-2 text-xs text-gray-500 dark:text-gray-400"
                    />
                  )}
                </button>

                <button onClick={() => handleDelete(ticket.id)} className="shrink-0 text-sm text-red-600 dark:text-red-400">
                  Delete
                </button>
              </div>
              {rowErrors[ticket.id] && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{rowErrors[ticket.id]}</p>}
            </li>
          )
        })}
      </ul>
    </>
  )
}
