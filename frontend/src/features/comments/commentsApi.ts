import { apiClient } from '../../api/client'
import type { Comment } from './types'

export async function getComments(ticketId: string): Promise<Comment[]> {
  const { data } = await apiClient.get<Comment[]>(`/tickets/${ticketId}/comments`)
  return data
}

export async function createComment(ticketId: string, body: string): Promise<Comment> {
  const { data } = await apiClient.post<Comment>(`/tickets/${ticketId}/comments`, { body })
  return data
}
