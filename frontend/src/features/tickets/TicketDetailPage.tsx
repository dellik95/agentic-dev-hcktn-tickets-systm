import { Link, useNavigate, useParams } from 'react-router-dom'
import { Breadcrumb, type BreadcrumbItem } from '../../components/Breadcrumb'
import { useTeams } from '../teams/useTeams'
import { useEpics } from '../epics/useEpics'
import { useDeleteTicket, useTicket } from './useTickets'
import { TicketForm } from './TicketForm'
import { CommentsSection } from '../comments/CommentsSection'
import { getApiErrorMessage } from '../../api/errors'

// The page a ticket's cards/rows/breadcrumbs link INTO (Epic 06, T06.6). Reuses TicketForm — the
// same component the board and tickets list use for editing — so this page doesn't grow a second,
// divergent edit form. Team/epic names for the breadcrumb are cheap list fetches already cached
// elsewhere in the app; TanStack Query dedupes them if a caller landed here from the board/teams/epics pages.
export function TicketDetailPage() {
  const { ticketId } = useParams<{ ticketId: string }>()
  const navigate = useNavigate()

  const { data: ticket, isLoading, isError, error } = useTicket(ticketId)
  const { data: teams } = useTeams()
  const { data: epics } = useEpics(ticket?.teamId ?? null)
  const deleteTicket = useDeleteTicket(ticket?.teamId ?? '')

  async function handleDelete() {
    if (!ticket) return
    if (!window.confirm('Delete this ticket? This cannot be undone.')) return
    try {
      await deleteTicket.mutateAsync(ticket.id)
      navigate(`/board?teamId=${ticket.teamId}`)
    } catch (err) {
      // Deletion failures are rare enough here that an alert is acceptable — every other delete
      // button in this app surfaces its error inline in a list row, but this page has no row to pin it to.
      window.alert(getApiErrorMessage(err, 'Could not delete ticket.'))
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto mt-12 w-[80%]">
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    )
  }

  if (isError || !ticket) {
    return (
      <div className="mx-auto mt-12 w-[80%]">
        <p className="text-sm text-red-600 dark:text-red-400">{getApiErrorMessage(error, 'Ticket not found.')}</p>
        <Link to="/teams" className="mt-2 inline-block text-sm text-indigo-600 dark:text-indigo-400">
          Back to Teams
        </Link>
      </div>
    )
  }

  const team = teams?.find((t) => t.id === ticket.teamId)
  const epic = ticket.epicId ? epics?.find((e) => e.id === ticket.epicId) : null

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Teams', to: '/teams' },
    { label: team?.name ?? '…', to: `/board?teamId=${ticket.teamId}` },
    ticket.epicId
      ? { label: epic?.title ?? '…', to: `/board?teamId=${ticket.teamId}&epicId=${ticket.epicId}` }
      : { label: 'No epic', to: `/board?teamId=${ticket.teamId}` },
    { label: ticket.title },
  ]

  return (
    <div className="mx-auto mt-12 w-[80%]">
      <Breadcrumb items={breadcrumbItems} />

      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{ticket.title}</h1>
        <button onClick={() => void handleDelete()} className="shrink-0 text-sm text-red-600 dark:text-red-400">
          Delete ticket
        </button>
      </div>

      {/* Ticket info / comments split 70/30 on wide screens; comments drop below and take the
          full width on narrow ones, where a 30%-width column would be too cramped to use. */}
      <div className="flex flex-col gap-8 lg:flex-row">
        <div className="lg:w-[70%]">
          <TicketForm
            teamId={ticket.teamId}
            ticket={ticket}
            hideComments
            onSaved={() => navigate(`/board?teamId=${ticket.teamId}`)}
            onCancel={() => navigate(-1)}
          />
        </div>
        <div className="lg:w-[30%]">
          <CommentsSection ticketId={ticket.id} />
        </div>
      </div>
    </div>
  )
}
