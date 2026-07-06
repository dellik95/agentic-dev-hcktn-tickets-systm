export type TicketType = 'bug' | 'feature' | 'fix'
export type TicketState = 'new' | 'ready_for_implementation' | 'in_progress' | 'ready_for_acceptance' | 'done'

export interface Ticket {
  id: string
  teamId: string
  epicId: string | null
  type: TicketType
  state: TicketState
  title: string
  body: string
  createdBy: { id: string; email: string }
  createdAt: string
  updatedAt: string
}

export const TICKET_TYPES: TicketType[] = ['bug', 'feature', 'fix']
export const TICKET_STATES: TicketState[] = ['new', 'ready_for_implementation', 'in_progress', 'ready_for_acceptance', 'done']

// Human-readable labels with spaces, per spec — the API's snake_case values are for the wire only.
export const TICKET_STATE_LABELS: Record<TicketState, string> = {
  new: 'New',
  ready_for_implementation: 'Ready for Implementation',
  in_progress: 'In Progress',
  ready_for_acceptance: 'Ready for Acceptance',
  done: 'Done',
}
