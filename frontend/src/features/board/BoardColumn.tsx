import { useDroppable } from '@dnd-kit/core'
import type { Epic } from '../epics/types'
import { TICKET_STATE_LABELS, type Ticket, type TicketState } from '../tickets/types'
import { BoardCard } from './BoardCard'

interface BoardColumnProps {
  state: TicketState
  /** Already filtered + bucketed by BoardPage, in the server's updatedAt-DESC order — never re-sorted here. */
  tickets: Ticket[]
  /** Epic id -> Epic, built once in BoardPage so no card/column re-fetches epics. */
  epicsById: Map<string, Epic>
  pendingTicketId: string | null
  onPatchState: (id: string, state: TicketState) => void
}

// One Kanban column — also a dnd-kit droppable zone (id = the column's own state value) so
// BoardPage's DndContext.onDragEnd can read `over.id` to know which column a card landed in.
export function BoardColumn({ state, tickets, epicsById, pendingTicketId, onPatchState }: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: state })

  return (
    <div
      ref={setNodeRef}
      data-testid={`board-column-${state}`}
      className={`flex w-72 flex-shrink-0 flex-col rounded-md border transition-colors ${
        isOver ? 'border-gray-400 bg-gray-50 dark:border-gray-600 dark:bg-gray-800' : 'border-gray-200 dark:border-gray-800'
      }`}
    >
      <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2 dark:border-gray-800">
        <h2 className="text-sm font-medium text-gray-900 dark:text-gray-100">{TICKET_STATE_LABELS[state]}</h2>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
          {tickets.length}
        </span>
      </div>

      <div className="flex min-h-[140px] flex-1 flex-col gap-2 overflow-y-auto p-2">
        {tickets.length === 0 && <p className="px-1 py-2 text-xs text-gray-400 dark:text-gray-600">No tickets</p>}
        {tickets.map((ticket) => (
          <BoardCard
            key={ticket.id}
            ticket={ticket}
            epicTitle={ticket.epicId ? epicsById.get(ticket.epicId)?.title : undefined}
            isPending={ticket.id === pendingTicketId}
            onPatchState={onPatchState}
          />
        ))}
      </div>
    </div>
  )
}
