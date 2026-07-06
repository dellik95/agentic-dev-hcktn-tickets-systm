import { EditorContent, useEditor, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect } from 'react'

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  autoFocus?: boolean
  /** Stable hook for E2E tests — TipTap's DOM has no name/placeholder attribute to select by. */
  testId?: string
}

// Shared by any "description"/"body" field that wants formatting (epic description, ticket
// body). Stores/emits HTML — RichTextViewer sanitizes it before display, since the API accepts
// arbitrary strings and a direct API caller could submit a hostile payload even though the UI
// itself only ever produces safe TipTap-generated markup.
export function RichTextEditor({ value, onChange, placeholder, autoFocus, testId }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit, Placeholder.configure({ placeholder: placeholder ?? '' })],
    content: value,
    autofocus: autoFocus ? 'end' : false,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class:
          'rich-text-content min-h-24 rounded-b-md border border-t-0 border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100',
        ...(testId ? { 'data-testid': testId } : {}),
      },
    },
  })

  // TipTap is internally uncontrolled — if `value` changes for a reason other than this editor's
  // own typing (e.g. a parent reset), push it in explicitly rather than relying on the `content`
  // prop, which TipTap only reads once at creation.
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false })
    }
  }, [value, editor])

  if (!editor) return null

  return (
    <div>
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  )
}

function Toolbar({ editor }: { editor: Editor }) {
  return (
    <div className="flex gap-1 rounded-t-md border border-gray-300 bg-gray-100 p-1 dark:border-gray-700 dark:bg-gray-800">
      <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')}>
        <strong>B</strong>
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')}>
        <em>I</em>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive('bulletList')}
      >
        • List
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive('orderedList')}
      >
        1. List
      </ToolbarButton>
    </div>
  )
}

function ToolbarButton({
  onClick,
  active,
  children,
}: {
  onClick: () => void
  active?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded px-2 py-1 text-xs font-medium ${
        active
          ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
          : 'text-gray-600 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-800'
      }`}
    >
      {children}
    </button>
  )
}
