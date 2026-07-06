import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createTeam, deleteTeam, getTeams, renameTeam } from './teamsApi'

const TEAMS_QUERY_KEY = ['teams']

export function useTeams() {
  return useQuery({ queryKey: TEAMS_QUERY_KEY, queryFn: getTeams })
}

export function useCreateTeam() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => createTeam(name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TEAMS_QUERY_KEY }),
  })
}

export function useRenameTeam() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => renameTeam(id, name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TEAMS_QUERY_KEY }),
  })
}

export function useDeleteTeam() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteTeam(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TEAMS_QUERY_KEY }),
  })
}
