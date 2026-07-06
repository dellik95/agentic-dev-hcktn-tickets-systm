import { apiClient } from '../../api/client'

export interface TransitionRule {
  fromState: string
  toState: string
}

export async function getTransitionRules(): Promise<TransitionRule[]> {
  const { data } = await apiClient.get<TransitionRule[]>('/ticket-state-transition-rules')
  return data
}

export async function replaceTransitionRules(rules: TransitionRule[]): Promise<TransitionRule[]> {
  const { data } = await apiClient.put<TransitionRule[]>('/ticket-state-transition-rules', { rules })
  return data
}
