import { useState, type FormEvent } from 'react'
import { useComments, useCreateComment } from './useComments'
import { getApiErrorMessage } from '../../api/errors'

const textareaClassName =
  'w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100'

interface CommentsSectionProps {
  ticketId: string
}

// Rendered inside TicketForm's edit mode, as a sibling AFTER the ticket form itself (not nested
// inside its <form>) — the composer below needs its own <form>, and forms cannot nest.
export function CommentsSection({ ticketId }: CommentsSectionProps) {
  const { data: comments, isLoading, isError } = useComments(ticketId)
  const createComment = useCreateComment(ticketId)

  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    const trimmedBody = body.trim()
    if (!trimmedBody) {
      setError('Comment cannot be empty.')
      return
    }

    try {
      await createComment.mutateAsync(trimmedBody)
      setBody('')
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not add comment.'))
    }
  }

  return (
    <div className="mt-6 border-t border-gray-200 pt-4 dark:border-gray-800">
      <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Comments</h3>

      {isLoading && <p className="text-sm text-gray-500">Loading…</p>}
      {isError && <p className="text-sm text-red-600 dark:text-red-400">Could not load comments.</p>}
      {comments?.length === 0 && <p className="text-sm text-gray-500">No comments yet.</p>}

      {comments && comments.length > 0 && (
        <ul className="mb-4 divide-y divide-gray-200 dark:divide-gray-800">
          {comments.map((comment) => (
            <li key={comment.id} className="py-2">
              <div className="flex flex-wrap items-baseline gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span className="font-medium text-gray-900 dark:text-gray-100">{comment.author.email}</span>
                <span>{new Date(comment.createdAt).toLocaleString()}</span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-gray-900 dark:text-gray-100">{comment.body}</p>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a comment..."
          data-testid="comment-body"
          rows={3}
          disabled={createComment.isPending}
          className={`${textareaClassName} disabled:opacity-60`}
        />

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div>
          <button
            type="submit"
            disabled={createComment.isPending}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-gray-100 dark:text-gray-900"
          >
            Add comment
          </button>
        </div>
      </form>
    </div>
  )
}
