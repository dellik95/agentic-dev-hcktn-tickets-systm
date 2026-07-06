import { useTeams } from './useTeams'

interface TeamSelectorProps {
  value: string | null
  onChange: (teamId: string) => void
  className?: string
}

// Shared across epics — the Kanban board (Epic 06) and ticket create/edit (Epic 04) both need a
// team picker; built once here so it's ready for reuse.
export function TeamSelector({ value, onChange, className }: TeamSelectorProps) {
  const { data: teams, isLoading } = useTeams()

  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={isLoading}
      className={
        className ??
        'rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100'
      }
    >
      <option value="" disabled>
        {isLoading ? 'Loading teams…' : 'Select a team'}
      </option>
      {teams?.map((team) => (
        <option key={team.id} value={team.id}>
          {team.name}
        </option>
      ))}
    </select>
  )
}
