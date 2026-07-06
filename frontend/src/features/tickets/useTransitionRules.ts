import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getTransitionRules, replaceTransitionRules, type TransitionRule } from './transitionRulesApi'
import { TICKET_STATES, type TicketState } from './types'

const TRANSITION_RULES_QUERY_KEY = ['ticket-state-transition-rules']

export function useTransitionRules() {
  return useQuery({ queryKey: TRANSITION_RULES_QUERY_KEY, queryFn: getTransitionRules })
}

export function useReplaceTransitionRules() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (rules: TransitionRule[]) => replaceTransitionRules(rules),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TRANSITION_RULES_QUERY_KEY }),
  })
}

// Pure helper (no hook) so it's usable both from TransitionRulesPage (to preview allowed-from-here
// transitions is not needed there, but the same logic underlies it) and from BoardCard (to restrict
// its per-card status <select>). An empty rules array means "unrestricted" — every state is allowed,
// per the backend's Definition-of-Done (a fresh install has no preloaded rules). Otherwise, only the
// current state (always available, so staying put / a no-op re-save is always possible) plus every
// toState reachable from the current state via a rule.
export function getAllowedNextStates(rules: TransitionRule[], currentState: TicketState): TicketState[] {
  if (rules.length === 0) return TICKET_STATES

  const allowed = [currentState, ...rules.filter((rule) => rule.fromState === currentState).map((rule) => rule.toState as TicketState)]
  return Array.from(new Set(allowed))
}
