import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createTicket,
  deleteTicket,
  getTicket,
  getTickets,
  patchTicketState,
  updateTicket,
  type CreateTicketInput,
  type TicketFilters,
  type UpdateTicketInput,
} from './ticketsApi'
import type { Ticket, TicketState } from './types'

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

export function useTicket(id: string | undefined) {
  return useQuery({
    queryKey: ['ticket', id],
    queryFn: () => getTicket(id as string),
    enabled: !!id,
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

// Used by the Kanban board (drag-and-drop + the per-card status dropdown, Epic 06) where the state
// change must be reflected the instant the user acts, not after a round-trip. onMutate optimistically
// rewrites this one ticket's state across every cached filter-variant of the team's ticket list;
// onError restores just that ticket's prior state; onSettled reconciles with the server either way.
//
// Rollback is scoped to the single mutated ticket (not a whole-list snapshot) on purpose: the board
// shares one mutation per team across every card, so two drags/dropdown-changes on DIFFERENT tickets
// can be in flight at once. A whole-list snapshot-and-restore would let one mutation's failure wipe
// out the other's still-pending (or already-succeeded) optimistic update.
export function usePatchTicketState(teamId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, state }: { id: string; state: TicketState }) => patchTicketState(id, state),
    onMutate: async ({ id, state }) => {
      await queryClient.cancelQueries({ queryKey: ticketsTeamQueryKey(teamId) })

      const queries = queryClient.getQueriesData<Ticket[]>({ queryKey: ticketsTeamQueryKey(teamId) })
      const previousStates = queries.map(
        ([queryKey, data]) => [queryKey, data?.find((ticket) => ticket.id === id)?.state] as const,
      )

      queryClient.setQueriesData<Ticket[]>({ queryKey: ticketsTeamQueryKey(teamId) }, (old) =>
        old?.map((ticket) => (ticket.id === id ? { ...ticket, state } : ticket)),
      )

      return { id, previousStates }
    },
    onError: (_err, _vars, context) => {
      context?.previousStates.forEach(([queryKey, previousState]) => {
        if (previousState === undefined) return
        queryClient.setQueryData<Ticket[]>(queryKey, (old) =>
          old?.map((ticket) => (ticket.id === context.id ? { ...ticket, state: previousState } : ticket)),
        )
      })
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ticketsTeamQueryKey(teamId) }),
  })
}
