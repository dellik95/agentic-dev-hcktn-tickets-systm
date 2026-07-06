import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createEpic, deleteEpic, getEpics, updateEpic } from './epicsApi'

const epicsQueryKey = (teamId: string | null) => ['epics', teamId]

export function useEpics(teamId: string | null) {
  return useQuery({
    queryKey: epicsQueryKey(teamId),
    queryFn: () => getEpics(teamId as string),
    enabled: !!teamId,
  })
}

export function useCreateEpic(teamId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ title, description }: { title: string; description: string }) =>
      createEpic(teamId, title, description),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: epicsQueryKey(teamId) }),
  })
}

export function useUpdateEpic(teamId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, title, description }: { id: string; title: string; description: string }) =>
      updateEpic(id, title, description),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: epicsQueryKey(teamId) }),
  })
}

export function useDeleteEpic(teamId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteEpic(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: epicsQueryKey(teamId) }),
  })
}
