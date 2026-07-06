import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { TeamSelector } from '../teams/TeamSelector'
import { useCreateEpic, useDeleteEpic, useEpics, useUpdateEpic } from './useEpics'
import { getApiErrorMessage } from '../../api/errors'
import { RichTextEditor } from '../../components/RichTextEditor'
import { RichTextViewer } from '../../components/RichTextViewer'
import { Modal } from '../../components/Modal'
import type { Epic } from './types'

const fieldClassName =
  'w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100'

export function EpicsPage() {
  const [searchParams] = useSearchParams()
  // Seeds the selector from ?teamId=... so arriving from TeamsPage's "View epics" link (or any
  // other deep link) lands with that team already selected — the TeamSelector itself is untouched.
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(searchParams.get('teamId'))

  return (
    <div className="mx-auto mt-12 w-[80%]">
      <h1 className="mb-6 text-xl font-semibold text-gray-900 dark:text-gray-100">Epics</h1>

      <TeamSelector value={selectedTeamId} onChange={setSelectedTeamId} className={`mb-6 w-full ${fieldClassName}`} />

      {selectedTeamId ? (
        <EpicsList teamId={selectedTeamId} />
      ) : (
        <p className="text-sm text-gray-500">Select a team to manage its epics.</p>
      )}
    </div>
  )
}

function EpicsList({ teamId }: { teamId: string }) {
  const { data: epics, isLoading, isError } = useEpics(teamId)
  const createEpic = useCreateEpic(teamId)
  const updateEpic = useUpdateEpic(teamId)
  const deleteEpic = useDeleteEpic(teamId)

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingEpic, setEditingEpic] = useState<Epic | null>(null)
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({})

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this epic? This cannot be undone.')) return
    setRowErrors((prev) => ({ ...prev, [id]: '' }))
    try {
      await deleteEpic.mutateAsync(id)
    } catch (err) {
      setRowErrors((prev) => ({ ...prev, [id]: getApiErrorMessage(err, 'Could not delete epic.') }))
    }
  }

  return (
    <>
      <button
        onClick={() => setShowCreateModal(true)}
        className="mb-4 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white dark:bg-gray-100 dark:text-gray-900"
      >
        Create epic
      </button>

      {isLoading && <p className="mt-4 text-sm text-gray-500">Loading…</p>}
      {isError && <p className="mt-4 text-sm text-red-600 dark:text-red-400">Could not load epics.</p>}
      {epics?.length === 0 && <p className="mt-4 text-sm text-gray-500">No epics yet.</p>}

      <ul className="mt-4 divide-y divide-gray-200 dark:divide-gray-800">
        {epics?.map((epic) => (
          <li key={epic.id} className="py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-900 dark:text-gray-100">{epic.title}</p>
                {epic.description && (
                  <RichTextViewer
                    html={epic.description}
                    className="rich-text-content mt-1 text-sm text-gray-500 dark:text-gray-400"
                  />
                )}
              </div>

              <div className="flex shrink-0 gap-3 text-sm">
                <Link to={`/board?teamId=${teamId}&epicId=${epic.id}`} className="text-indigo-600 dark:text-indigo-400">
                  View tickets
                </Link>
                <button onClick={() => setEditingEpic(epic)} className="text-indigo-600 dark:text-indigo-400">
                  Rename
                </button>
                <button onClick={() => handleDelete(epic.id)} className="text-red-600 dark:text-red-400">
                  Delete
                </button>
              </div>
            </div>
            {rowErrors[epic.id] && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{rowErrors[epic.id]}</p>
            )}
          </li>
        ))}
      </ul>

      {showCreateModal && (
        <Modal title="Create epic" onClose={() => setShowCreateModal(false)}>
          <EpicForm
            onSubmit={async (title, description) => {
              await createEpic.mutateAsync({ title, description })
              setShowCreateModal(false)
            }}
            onCancel={() => setShowCreateModal(false)}
            submitLabel="Create"
            titleTestId="epic-create-title"
            descriptionTestId="epic-create-description"
          />
        </Modal>
      )}

      {editingEpic && (
        <Modal title="Rename epic" onClose={() => setEditingEpic(null)}>
          <EpicForm
            initialTitle={editingEpic.title}
            initialDescription={editingEpic.description ?? ''}
            onSubmit={async (title, description) => {
              await updateEpic.mutateAsync({ id: editingEpic.id, title, description })
              setEditingEpic(null)
            }}
            onCancel={() => setEditingEpic(null)}
            submitLabel="Save"
            titleTestId="epic-edit-title"
            descriptionTestId="epic-edit-description"
          />
        </Modal>
      )}
    </>
  )
}

interface EpicFormProps {
  initialTitle?: string
  initialDescription?: string
  submitLabel: string
  titleTestId: string
  descriptionTestId: string
  onSubmit: (title: string, description: string) => Promise<void>
  onCancel: () => void
}

function EpicForm({
  initialTitle = '',
  initialDescription = '',
  submitLabel,
  titleTestId,
  descriptionTestId,
  onSubmit,
  onCancel,
}: EpicFormProps) {
  const [title, setTitle] = useState(initialTitle)
  const [description, setDescription] = useState(initialDescription)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await onSubmit(title, description)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not save epic.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Epic title"
        className={fieldClassName}
        data-testid={titleTestId}
      />
      <RichTextEditor
        value={description}
        onChange={setDescription}
        placeholder="Description (optional)"
        testId={descriptionTestId}
      />
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-gray-100 dark:text-gray-900"
        >
          {submitLabel}
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
