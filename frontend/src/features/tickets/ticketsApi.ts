import { apiClient } from '../../api/client'
import type { Ticket, TicketType, TicketState } from './types'

export interface TicketFilters {
  type?: TicketType
  epicId?: string
  state?: TicketState
  q?: string
}

export async function getTickets(teamId: string, filters: TicketFilters = {}): Promise<Ticket[]> {
  const { data } = await apiClient.get<Ticket[]>(`/teams/${teamId}/tickets`, { params: filters })
  return data
}

export async function getTicket(id: string): Promise<Ticket> {
  const { data } = await apiClient.get<Ticket>(`/tickets/${id}`)
  return data
}

export interface CreateTicketInput {
  type: TicketType
  title: string
  body: string
  epicId: string | null
}

export async function createTicket(teamId: string, input: CreateTicketInput): Promise<Ticket> {
  const { data } = await apiClient.post<Ticket>(`/teams/${teamId}/tickets`, input)
  return data
}

export interface UpdateTicketInput {
  type: TicketType
  teamId: string
  epicId: string | null
  title: string
  body: string
  state: TicketState
}

export async function updateTicket(id: string, input: UpdateTicketInput): Promise<Ticket> {
  const { data } = await apiClient.put<Ticket>(`/tickets/${id}`, input)
  return data
}

export async function patchTicketState(id: string, state: TicketState): Promise<Ticket> {
  const { data } = await apiClient.patch<Ticket>(`/tickets/${id}/state`, { state })
  return data
}

export async function deleteTicket(id: string): Promise<void> {
  await apiClient.delete(`/tickets/${id}`)
}
