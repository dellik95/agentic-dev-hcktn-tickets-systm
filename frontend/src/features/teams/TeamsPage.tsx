import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useCreateTeam, useDeleteTeam, useRenameTeam, useTeams } from './useTeams'
import { getApiErrorMessage } from '../../api/errors'
import { Modal } from '../../components/Modal'

const fieldClassName =
  'w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100'

export function TeamsPage() {
  const { data: teams, isLoading, isError } = useTeams()
  const createTeam = useCreateTeam()
  const renameTeam = useRenameTeam()
  const deleteTeam = useDeleteTeam()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingTeam, setEditingTeam] = useState<{ id: string; name: string } | null>(null)
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({})

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this team? This cannot be undone.')) return
    setRowErrors((prev) => ({ ...prev, [id]: '' }))
    try {
      await deleteTeam.mutateAsync(id)
    } catch (err) {
      setRowErrors((prev) => ({ ...prev, [id]: getApiErrorMessage(err, 'Could not delete team.') }))
    }
  }

  return (
    <div className="mx-auto mt-12 max-w-2xl px-6">
      <h1 className="mb-6 text-xl font-semibold text-gray-900 dark:text-gray-100">Teams</h1>

      <button
        onClick={() => setShowCreateModal(true)}
        className="mb-4 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white dark:bg-gray-100 dark:text-gray-900"
      >
        Create team
      </button>

      {isLoading && <p className="mt-4 text-sm text-gray-500">Loading…</p>}
      {isError && <p className="mt-4 text-sm text-red-600 dark:text-red-400">Could not load teams.</p>}
      {teams?.length === 0 && <p className="mt-4 text-sm text-gray-500">No teams yet.</p>}

      <ul className="mt-4 divide-y divide-gray-200 dark:divide-gray-800">
        {teams?.map((team) => (
          <li key={team.id} className="py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-gray-900 dark:text-gray-100">{team.name}</span>

              <div className="flex shrink-0 gap-3 text-sm">
                <Link to={`/epics?teamId=${team.id}`} className="text-indigo-600 dark:text-indigo-400">
                  View epics
                </Link>
                <button
                  onClick={() => setEditingTeam({ id: team.id, name: team.name })}
                  className="text-indigo-600 dark:text-indigo-400"
                >
                  Rename
                </button>
                <button onClick={() => handleDelete(team.id)} className="text-red-600 dark:text-red-400">
                  Delete
                </button>
              </div>
            </div>
            {rowErrors[team.id] && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{rowErrors[team.id]}</p>
            )}
          </li>
        ))}
      </ul>

      {showCreateModal && (
        <Modal title="Create team" onClose={() => setShowCreateModal(false)}>
          <TeamForm
            onSubmit={async (name) => {
              await createTeam.mutateAsync(name)
              setShowCreateModal(false)
            }}
            onCancel={() => setShowCreateModal(false)}
            submitLabel="Create"
          />
        </Modal>
      )}

      {editingTeam && (
        <Modal title="Rename team" onClose={() => setEditingTeam(null)}>
          <TeamForm
            initialName={editingTeam.name}
            onSubmit={async (name) => {
              await renameTeam.mutateAsync({ id: editingTeam.id, name })
              setEditingTeam(null)
            }}
            onCancel={() => setEditingTeam(null)}
            submitLabel="Save"
          />
        </Modal>
      )}
    </div>
  )
}

interface TeamFormProps {
  initialName?: string
  submitLabel: string
  onSubmit: (name: string) => Promise<void>
  onCancel: () => void
}

function TeamForm({ initialName = '', submitLabel, onSubmit, onCancel }: TeamFormProps) {
  const [name, setName] = useState(initialName)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await onSubmit(name)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not save team.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Team name"
        className={fieldClassName}
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
