import DOMPurify from 'dompurify'

interface RichTextViewerProps {
  html: string
  className?: string
}

// Renders stored HTML (epic description, ticket body) read-only. Always sanitizes — the API
// accepts arbitrary strings for these fields, so a direct API caller (not just the UI) could
// submit a hostile payload; this is the one place stored XSS would land if we skipped it.
export function RichTextViewer({ html, className }: RichTextViewerProps) {
  const sanitized = DOMPurify.sanitize(html)
  return (
    <div
      className={className ?? 'rich-text-content text-sm text-gray-900 dark:text-gray-100'}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  )
}
