import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getAvatar, updateAvatar } from './authApi'

const AVATAR_QUERY_KEY = ['avatar']

// Only ever rendered inside the protected AppShell, so no `enabled` gate is needed here.
export function useAvatar() {
  return useQuery({ queryKey: AVATAR_QUERY_KEY, queryFn: getAvatar })
}

export function useUpdateAvatar() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (avatarDataUrl: string) => updateAvatar(avatarDataUrl),
    // The current user (with hasAvatar) is tracked via a plain module-level variable in
    // session.ts, not a TanStack Query cache entry, so there's nothing else to invalidate.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: AVATAR_QUERY_KEY }),
  })
}
