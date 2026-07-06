import { apiClient } from '../../api/client'
import type { Epic } from './types'

export async function getEpics(teamId: string): Promise<Epic[]> {
  const { data } = await apiClient.get<Epic[]>(`/teams/${teamId}/epics`)
  return data
}

export async function createEpic(teamId: string, title: string, description: string): Promise<Epic> {
  const { data } = await apiClient.post<Epic>(`/teams/${teamId}/epics`, {
    title,
    description: description || null,
  })
  return data
}

export async function updateEpic(id: string, title: string, description: string): Promise<Epic> {
  const { data } = await apiClient.put<Epic>(`/epics/${id}`, { title, description: description || null })
  return data
}

export async function deleteEpic(id: string): Promise<void> {
  await apiClient.delete(`/epics/${id}`)
}
