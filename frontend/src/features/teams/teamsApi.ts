import { apiClient } from '../../api/client'
import type { Team } from './types'

export async function getTeams(): Promise<Team[]> {
  const { data } = await apiClient.get<Team[]>('/teams')
  return data
}

export async function createTeam(name: string): Promise<Team> {
  const { data } = await apiClient.post<Team>('/teams', { name })
  return data
}

export async function renameTeam(id: string, name: string): Promise<Team> {
  const { data } = await apiClient.put<Team>(`/teams/${id}`, { name })
  return data
}

export async function deleteTeam(id: string): Promise<void> {
  await apiClient.delete(`/teams/${id}`)
}
