import { memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { TICKET_STATES, TICKET_STATE_LABELS, type Ticket, type TicketState } from '../tickets/types'

interface BoardCardProps {
  ticket: Ticket
  /** Looked up by BoardColumn from the epics list BoardPage already fetched — never fetched here. */
  epicTitle: string | undefined
  /** True while THIS ticket's usePatchTicketState mutation (drag or dropdown) is in flight. */
  isPending: boolean
  onPatchState: (id: string, state: TicketState) => void
}

// Wrapped in React.memo — a board can hold 100+ cards (T06.8), so without this, any unrelated
// state change on the page (typing in the search box, another card's drag) would re-render every
// card instead of just the ones whose own props changed.
export const BoardCard = memo(function BoardCard({ ticket, epicTitle, isPending, onPatchState }: BoardCardProps) {
  const navigate = useNavigate()
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: ticket.id })

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined

  return (
    <div
      ref={setNodeRef}
      data-testid={`board-card-${ticket.id}`}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => navigate(`/tickets/${ticket.id}`)}
      className={`touch-none cursor-pointer rounded-md border border-gray-200 bg-white p-2 shadow-sm dark:border-gray-800 dark:bg-gray-900 ${
        isDragging || isPending ? 'opacity-50' : ''
      }`}
    >
      <p className="text-sm text-gray-900 dark:text-gray-100">{ticket.title}</p>

      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <span className="rounded-full bg-gray-100 px-2 py-0.5 dark:bg-gray-800">{ticket.type}</span>
        {epicTitle && <span>Epic: {epicTitle}</span>}
      </div>

      {/* Jira-style quick status change — an alternative to drag-and-drop. Its own pointerdown/click
          must never bubble up to this div: dnd-kit's drag `listeners` are spread on the div itself,
          and the div also has the navigate-on-click handler above, so without stopPropagation here
          every interaction with the dropdown would either start a drag or navigate away. */}
      <select
        value={ticket.state}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => onPatchState(ticket.id, event.target.value as TicketState)}
        className="mt-2 w-full rounded-md border border-gray-300 bg-gray-50 px-2 py-1 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
      >
        {TICKET_STATES.map((state) => (
          <option key={state} value={state}>
            {TICKET_STATE_LABELS[state]}
          </option>
        ))}
      </select>
    </div>
  )
})
