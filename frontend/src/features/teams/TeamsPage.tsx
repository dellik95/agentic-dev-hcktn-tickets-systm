import { useState, type FormEvent } from 'react'
import { useCreateTeam, useDeleteTeam, useRenameTeam, useTeams } from './useTeams'
import { getApiErrorMessage } from '../../api/errors'

export function TeamsPage() {
  const { data: teams, isLoading, isError } = useTeams()
  const createTeam = useCreateTeam()
  const renameTeam = useRenameTeam()
  const deleteTeam = useDeleteTeam()

  const [newName, setNewName] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({})

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    setCreateError(null)
    try {
      await createTeam.mutateAsync(newName)
      setNewName('')
    } catch (err) {
      setCreateError(getApiErrorMessage(err, 'Could not create team.'))
    }
  }

  function startEditing(id: string, currentName: string) {
    setEditingId(id)
    setEditingName(currentName)
    setRowErrors((prev) => ({ ...prev, [id]: '' }))
  }

  async function handleRename(id: string) {
    try {
      await renameTeam.mutateAsync({ id, name: editingName })
      setEditingId(null)
    } catch (err) {
      setRowErrors((prev) => ({ ...prev, [id]: getApiErrorMessage(err, 'Could not rename team.') }))
    }
  }

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

      <form onSubmit={handleCreate} className="mb-2 flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New team name"
          className="min-w-0 flex-1 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        />
        <button
          type="submit"
          disabled={createTeam.isPending}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-gray-100 dark:text-gray-900"
        >
          Create
        </button>
      </form>
      {createError && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{createError}</p>}

      {isLoading && <p className="mt-4 text-sm text-gray-500">Loading…</p>}
      {isError && <p className="mt-4 text-sm text-red-600 dark:text-red-400">Could not load teams.</p>}
      {teams?.length === 0 && <p className="mt-4 text-sm text-gray-500">No teams yet.</p>}

      <ul className="mt-4 divide-y divide-gray-200 dark:divide-gray-800">
        {teams?.map((team) => (
          <li key={team.id} className="py-3">
            <div className="flex items-center justify-between gap-3">
              {editingId === team.id ? (
                <input
                  autoFocus
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRename(team.id)}
                  className="min-w-0 flex-1 rounded-md border border-gray-300 bg-gray-50 px-2 py-1 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                />
              ) : (
                <span className="text-sm text-gray-900 dark:text-gray-100">{team.name}</span>
              )}

              <div className="flex shrink-0 gap-3 text-sm">
                {editingId === team.id ? (
                  <>
                    <button onClick={() => handleRename(team.id)} className="text-indigo-600 dark:text-indigo-400">
                      Save
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-gray-500">
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => startEditing(team.id, team.name)}
                      className="text-indigo-600 dark:text-indigo-400"
                    >
                      Rename
                    </button>
                    <button onClick={() => handleDelete(team.id)} className="text-red-600 dark:text-red-400">
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
            {rowErrors[team.id] && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{rowErrors[team.id]}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
