import { useState, type FormEvent } from 'react'
import { TeamSelector } from '../teams/TeamSelector'
import { useEpics } from '../epics/useEpics'
import { useCreateTicket, useUpdateTicket } from './useTickets'
import { getApiErrorMessage } from '../../api/errors'
import { RichTextEditor } from '../../components/RichTextEditor'
import { TICKET_STATES, TICKET_STATE_LABELS, TICKET_TYPES, type Ticket, type TicketState, type TicketType } from './types'

interface TicketFormProps {
  /** The team this form is scoped to when creating; ignored (in favor of ticket.teamId) when editing. */
  teamId: string
  /** Present in edit mode, absent in create mode. */
  ticket?: Ticket
  onSaved: () => void
  onCancel: () => void
}

const fieldClassName =
  'w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100'
const labelClassName = 'mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400'

// Shared by the tickets list (Epic 04) and, later, the Kanban board (Epic 06) for opening a
// card's detail — one form drives both create and edit so the two never drift apart.
export function TicketForm({ teamId, ticket, onSaved, onCancel }: TicketFormProps) {
  const isEditMode = !!ticket

  const [formTeamId, setFormTeamId] = useState(ticket?.teamId ?? teamId)
  const [formType, setFormType] = useState<TicketType>(ticket?.type ?? 'bug')
  const [formEpicId, setFormEpicId] = useState<string | null>(ticket?.epicId ?? null)
  const [formTitle, setFormTitle] = useState(ticket?.title ?? '')
  const [formBody, setFormBody] = useState(ticket?.body ?? '')
  const [formState, setFormState] = useState<TicketState>(ticket?.state ?? 'new')
  const [error, setError] = useState<string | null>(null)

  // Epic options are scoped to whichever team is currently selected IN THIS FORM (not the page's
  // team) — this is why formTeamId, not teamId, drives the query key.
  const { data: epics } = useEpics(formTeamId)
  const createTicket = useCreateTicket(formTeamId)
  const updateTicket = useUpdateTicket(formTeamId)
  const isSaving = createTicket.isPending || updateTicket.isPending

  function handleTeamChange(newTeamId: string) {
    // Team-change-clears-epic rule (spec §6): an epic belongs to exactly one team, so switching
    // teams must clear any already-selected epic right here, in the same handler — not via a
    // separate effect that might not run before the user hits submit.
    setFormTeamId(newTeamId)
    setFormEpicId(null)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      if (isEditMode) {
        await updateTicket.mutateAsync({
          id: ticket.id,
          input: {
            type: formType,
            teamId: formTeamId,
            epicId: formEpicId,
            title: formTitle,
            body: formBody,
            state: formState,
          },
        })
      } else {
        await createTicket.mutateAsync({
          type: formType,
          title: formTitle,
          body: formBody,
          epicId: formEpicId,
        })
      }
      onSaved()
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not save ticket.'))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-md border border-gray-200 p-4 dark:border-gray-800">
      <div>
        <label className={labelClassName}>Team</label>
        <TeamSelector value={formTeamId} onChange={handleTeamChange} className={fieldClassName} />
      </div>

      <div>
        <label className={labelClassName}>Type</label>
        <select value={formType} onChange={(e) => setFormType(e.target.value as TicketType)} className={fieldClassName}>
          {TICKET_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClassName}>Epic</label>
        <select value={formEpicId ?? ''} onChange={(e) => setFormEpicId(e.target.value || null)} className={fieldClassName}>
          <option value="">No epic</option>
          {epics?.map((epic) => (
            <option key={epic.id} value={epic.id}>
              {epic.title}
            </option>
          ))}
        </select>
      </div>

      {isEditMode && (
        <div>
          <label className={labelClassName}>State</label>
          <select value={formState} onChange={(e) => setFormState(e.target.value as TicketState)} className={fieldClassName}>
            {TICKET_STATES.map((state) => (
              <option key={state} value={state}>
                {TICKET_STATE_LABELS[state]}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className={labelClassName}>Title</label>
        <input
          value={formTitle}
          onChange={(e) => setFormTitle(e.target.value)}
          placeholder="Ticket title"
          className={fieldClassName}
        />
      </div>

      <div>
        <label className={labelClassName}>Body</label>
        <RichTextEditor value={formBody} onChange={setFormBody} placeholder="Describe the ticket…" testId="ticket-form-body" />
      </div>

      {ticket && (
        <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
          <p>ID: {ticket.id}</p>
          <p>Created by: {ticket.createdBy.email}</p>
          <p>Created at: {new Date(ticket.createdAt).toLocaleString()}</p>
          <p>Updated at: {new Date(ticket.updatedAt).toLocaleString()}</p>
        </div>
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-gray-100 dark:text-gray-900"
        >
          {isEditMode ? 'Save' : 'Create'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 dark:border-gray-700 dark:text-gray-100"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
