import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createComment, getComments } from './commentsApi'

const commentsQueryKey = (ticketId: string) => ['comments', ticketId]

export function useComments(ticketId: string) {
  return useQuery({
    queryKey: commentsQueryKey(ticketId),
    queryFn: () => getComments(ticketId),
  })
}

export function useCreateComment(ticketId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: string) => createComment(ticketId, body),
    // Invalidate ONLY the comments list for this ticket — never a 'tickets'-prefixed key. Per
    // EPIC-05-comments.md T05.5, adding a comment must never appear to refetch or change the
    // parent ticket's displayed updatedAt.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: commentsQueryKey(ticketId) }),
  })
}
