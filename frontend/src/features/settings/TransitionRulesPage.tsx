import { useEffect, useState } from 'react'
import { useReplaceTransitionRules, useTransitionRules } from '../tickets/useTransitionRules'
import { TICKET_STATES, TICKET_STATE_LABELS } from '../tickets/types'
import { getApiErrorMessage } from '../../api/errors'

// "from|to" — a plain string key is simpler than a nested Map/object for a Set this small (at most
// 5*4 = 20 possible entries) and round-trips trivially to/from the TransitionRule[] the API expects.
function ruleKey(fromState: string, toState: string) {
  return `${fromState}|${toState}`
}

export function TransitionRulesPage() {
  const { data: rules, isLoading, isError } = useTransitionRules()
  const replaceRules = useReplaceTransitionRules()

  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  // Seeds local state from the fetched rules once they arrive — subsequent server refetches (e.g.
  // after Save invalidates the query) don't clobber in-progress edits, since this only re-seeds
  // when `rules` itself changes identity, which for an idle page only happens on first load.
  useEffect(() => {
    if (!rules) return
    setChecked(new Set(rules.map((rule) => ruleKey(rule.fromState, rule.toState))))
  }, [rules])

  function toggleCell(fromState: string, toState: string) {
    const key = ruleKey(fromState, toState)
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  async function handleSave() {
    setMessage(null)
    const nextRules = Array.from(checked).map((key) => {
      const [fromState, toState] = key.split('|')
      return { fromState, toState }
    })
    try {
      await replaceRules.mutateAsync(nextRules)
      setMessage({ kind: 'success', text: 'Transition rules saved.' })
    } catch (err) {
      setMessage({ kind: 'error', text: getApiErrorMessage(err, 'Could not save transition rules.') })
    }
  }

  async function handleResetToUnrestricted() {
    setMessage(null)
    try {
      await replaceRules.mutateAsync([])
      setChecked(new Set())
      setMessage({ kind: 'success', text: 'Reset to unrestricted — every transition is now allowed.' })
    } catch (err) {
      setMessage({ kind: 'error', text: getApiErrorMessage(err, 'Could not reset transition rules.') })
    }
  }

  return (
    <div className="mx-auto mt-12 w-[80%]">
      <h1 className="mb-6 text-xl font-semibold text-gray-900 dark:text-gray-100">Workflow Settings</h1>

      <p className="mb-4 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
        If no transitions are checked below, every transition is allowed (unrestricted) — this is the default.
        Checking at least one box restricts the board to only the checked transitions, so tickets can then only
        move from a row&apos;s state to a checked column&apos;s state.
      </p>

      {isLoading && <p className="text-sm text-gray-500">Loading…</p>}
      {isError && <p className="text-sm text-red-600 dark:text-red-400">Could not load transition rules.</p>}

      {!isLoading && !isError && (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border border-gray-200 bg-gray-50 px-3 py-2 text-left font-medium text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
                    From \ To
                  </th>
                  {TICKET_STATES.map((toState) => (
                    <th
                      key={toState}
                      className="border border-gray-200 bg-gray-50 px-3 py-2 text-left font-medium text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400"
                    >
                      {TICKET_STATE_LABELS[toState]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TICKET_STATES.map((fromState) => (
                  <tr key={fromState}>
                    <th className="border border-gray-200 bg-gray-50 px-3 py-2 text-left font-medium text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100">
                      {TICKET_STATE_LABELS[fromState]}
                    </th>
                    {TICKET_STATES.map((toState) => (
                      <td
                        key={toState}
                        className="border border-gray-200 px-3 py-2 text-center dark:border-gray-800"
                      >
                        {fromState === toState ? (
                          <span className="text-gray-300 dark:text-gray-700">—</span>
                        ) : (
                          <input
                            type="checkbox"
                            checked={checked.has(ruleKey(fromState, toState))}
                            onChange={() => toggleCell(fromState, toState)}
                            aria-label={`Allow ${TICKET_STATE_LABELS[fromState]} to ${TICKET_STATE_LABELS[toState]}`}
                          />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {message && (
            <p
              className={`mt-4 text-sm ${
                message.kind === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}
            >
              {message.text}
            </p>
          )}

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleSave}
              disabled={replaceRules.isPending}
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-gray-100 dark:text-gray-900"
            >
              Save
            </button>
            <button
              onClick={handleResetToUnrestricted}
              disabled={replaceRules.isPending}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 disabled:opacity-60 dark:border-gray-700 dark:text-gray-100"
            >
              Reset to unrestricted
            </button>
          </div>
        </>
      )}
    </div>
  )
}
