import { useState, type FormEvent } from 'react'
import { TeamSelector } from '../teams/TeamSelector'
import { useCreateEpic, useDeleteEpic, useEpics, useUpdateEpic } from './useEpics'
import { getApiErrorMessage } from '../../api/errors'

export function EpicsPage() {
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)

  return (
    <div className="mx-auto mt-12 max-w-2xl px-6">
      <h1 className="mb-6 text-xl font-semibold text-gray-900 dark:text-gray-100">Epics</h1>

      <TeamSelector value={selectedTeamId} onChange={setSelectedTeamId} className="mb-6 w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" />

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

  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [editingDescription, setEditingDescription] = useState('')
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({})

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    setCreateError(null)
    try {
      await createEpic.mutateAsync({ title: newTitle, description: newDescription })
      setNewTitle('')
      setNewDescription('')
    } catch (err) {
      setCreateError(getApiErrorMessage(err, 'Could not create epic.'))
    }
  }

  function startEditing(id: string, currentTitle: string, currentDescription: string | null) {
    setEditingId(id)
    setEditingTitle(currentTitle)
    setEditingDescription(currentDescription ?? '')
    setRowErrors((prev) => ({ ...prev, [id]: '' }))
  }

  async function handleRename(id: string) {
    try {
      await updateEpic.mutateAsync({ id, title: editingTitle, description: editingDescription })
      setEditingId(null)
    } catch (err) {
      setRowErrors((prev) => ({ ...prev, [id]: getApiErrorMessage(err, 'Could not update epic.') }))
    }
  }

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
      <form onSubmit={handleCreate} className="mb-2 flex flex-col gap-2">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="New epic title"
          className="min-w-0 flex-1 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        />
        <textarea
          value={newDescription}
          onChange={(e) => setNewDescription(e.target.value)}
          placeholder="Description (optional)"
          className="min-w-0 flex-1 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        />
        <button
          type="submit"
          disabled={createEpic.isPending}
          className="self-start rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-gray-100 dark:text-gray-900"
        >
          Create
        </button>
      </form>
      {createError && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{createError}</p>}

      {isLoading && <p className="mt-4 text-sm text-gray-500">Loading…</p>}
      {isError && <p className="mt-4 text-sm text-red-600 dark:text-red-400">Could not load epics.</p>}
      {epics?.length === 0 && <p className="mt-4 text-sm text-gray-500">No epics yet.</p>}

      <ul className="mt-4 divide-y divide-gray-200 dark:divide-gray-800">
        {epics?.map((epic) => (
          <li key={epic.id} className="py-3">
            <div className="flex items-start justify-between gap-3">
              {editingId === epic.id ? (
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <input
                    autoFocus
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    className="min-w-0 flex-1 rounded-md border border-gray-300 bg-gray-50 px-2 py-1 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                  />
                  <textarea
                    value={editingDescription}
                    onChange={(e) => setEditingDescription(e.target.value)}
                    className="min-w-0 flex-1 rounded-md border border-gray-300 bg-gray-50 px-2 py-1 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                  />
                </div>
              ) : (
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-900 dark:text-gray-100">{epic.title}</p>
                  {epic.description && (
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{epic.description}</p>
                  )}
                </div>
              )}

              <div className="flex shrink-0 gap-3 text-sm">
                {editingId === epic.id ? (
                  <>
                    <button onClick={() => handleRename(epic.id)} className="text-indigo-600 dark:text-indigo-400">
                      Save
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-gray-500">
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => startEditing(epic.id, epic.title, epic.description)}
                      className="text-indigo-600 dark:text-indigo-400"
                    >
                      Rename
                    </button>
                    <button onClick={() => handleDelete(epic.id)} className="text-red-600 dark:text-red-400">
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
            {rowErrors[epic.id] && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{rowErrors[epic.id]}</p>
            )}
          </li>
        ))}
      </ul>
    </>
  )
}
