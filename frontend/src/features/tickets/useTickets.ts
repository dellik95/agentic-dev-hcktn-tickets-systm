import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createTicket,
  deleteTicket,
  getTickets,
  patchTicketState,
  updateTicket,
  type CreateTicketInput,
  type TicketFilters,
  type UpdateTicketInput,
} from './ticketsApi'
import type { TicketState } from './types'

const ticketsQueryKey = (teamId: string | null, filters: TicketFilters) => ['tickets', teamId, filters]

// Mutations invalidate by this prefix (teamId only, no filters) so ANY filter variant cached for
// this team refetches — TanStack Query's invalidateQueries matches by key prefix by default.
const ticketsTeamQueryKey = (teamId: string | null) => ['tickets', teamId]

export function useTickets(teamId: string | null, filters: TicketFilters = {}) {
  return useQuery({
    queryKey: ticketsQueryKey(teamId, filters),
    queryFn: () => getTickets(teamId as string, filters),
    enabled: !!teamId,
  })
}

export function useCreateTicket(teamId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateTicketInput) => createTicket(teamId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ticketsTeamQueryKey(teamId) }),
  })
}

export function useUpdateTicket(teamId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTicketInput }) => updateTicket(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ticketsTeamQueryKey(teamId) }),
  })
}

export function useDeleteTicket(teamId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteTicket(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ticketsTeamQueryKey(teamId) }),
  })
}

export function usePatchTicketState(teamId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, state }: { id: string; state: TicketState }) => patchTicketState(id, state),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ticketsTeamQueryKey(teamId) }),
  })
}
