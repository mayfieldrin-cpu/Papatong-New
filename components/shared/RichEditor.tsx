'use client'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect } from 'react'
import clsx from 'clsx'

interface Props {
  content: string           // HTML string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: number
  className?: string
}

function ToolbarBtn({
  onClick, active, title, children
}: {
  onClick: () => void
  active?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onMouseDown={e => { e.preventDefault(); onClick() }}
      title={title}
      className={clsx(
        'w-7 h-7 flex items-center justify-center rounded text-[12px] transition-colors cursor-pointer border-none font-sans',
        active
          ? 'bg-text-primary text-bg'
          : 'bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface2'
      )}
    >
      {children}
    </button>
  )
}

export default function RichEditor({ content, onChange, placeholder = 'Write anything…', minHeight = 160, className }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList:    { keepMarks: true, keepAttributes: false },
        orderedList:   { keepMarks: true, keepAttributes: false },
        heading:       { levels: [1, 2, 3] },
        codeBlock:     { languageClassPrefix: 'language-' },
        blockquote:    {},
        bold:          {},
        italic:        {},
        strike:        {},
        code:          {},
        horizontalRule: {},
        hardBreak:     {},
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: content || '',
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'tiptap-editor focus:outline-none',
        style: `min-height:${minHeight}px; padding: 12px 14px;`,
      },
    },
  })

  // Sync external content changes (e.g. switching cards)
  useEffect(() => {
    if (!editor) return
    const current = editor.getHTML()
    if (content !== current) {
      editor.commands.setContent(content || '', false)
    }
  }, [content])

  if (!editor) return null

  const { state } = editor
  const { from, to } = state.selection

  return (
    <div className={clsx('border border-border-default rounded-lg overflow-hidden bg-surface', className)}>
      {/* Toolbar */}
      <div className="flex items-center flex-wrap gap-0.5 px-2 py-1.5 border-b border-border-subtle bg-surface2">
        {/* Headings */}
        <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Heading 1 (# + space)">H1</ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading 2 (## + space)">H2</ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Heading 3 (### + space)">H3</ToolbarBtn>

        <div className="w-px h-4 bg-border-default mx-0.5" />

        {/* Inline formatting */}
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold (Ctrl+B)"><strong>B</strong></ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic (Ctrl+I)"><em>I</em></ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Inline code">`</ToolbarBtn>

        <div className="w-px h-4 bg-border-default mx-0.5" />

        {/* Lists */}
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet list (- + space)">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="2" cy="4" r="1.2" fill="currentColor"/><rect x="5" y="3.2" width="8" height="1.6" rx=".8" fill="currentColor"/><circle cx="2" cy="8" r="1.2" fill="currentColor"/><rect x="5" y="7.2" width="8" height="1.6" rx=".8" fill="currentColor"/><circle cx="2" cy="12" r="1.2" fill="currentColor"/><rect x="5" y="11.2" width="8" height="1.6" rx=".8" fill="currentColor"/></svg>
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered list (1. + space)">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><text x="0" y="5" fontSize="5" fill="currentColor">1.</text><rect x="5" y="3.2" width="8" height="1.6" rx=".8" fill="currentColor"/><text x="0" y="9.5" fontSize="5" fill="currentColor">2.</text><rect x="5" y="7.2" width="8" height="1.6" rx=".8" fill="currentColor"/><text x="0" y="14" fontSize="5" fill="currentColor">3.</text><rect x="5" y="11.2" width="8" height="1.6" rx=".8" fill="currentColor"/></svg>
        </ToolbarBtn>

        <div className="w-px h-4 bg-border-default mx-0.5" />

        {/* Block formatting */}
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Blockquote (> + space)">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="0" y="2" width="2" height="10" rx="1" fill="currentColor"/><rect x="4" y="3" width="10" height="1.5" rx=".75" fill="currentColor" opacity=".6"/><rect x="4" y="6.25" width="8" height="1.5" rx=".75" fill="currentColor" opacity=".6"/><rect x="4" y="9.5" width="9" height="1.5" rx=".75" fill="currentColor" opacity=".6"/></svg>
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="Code block (``` + enter)">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><polyline points="4,4 1,7 4,10" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/><polyline points="10,4 13,7 10,10" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>
        </ToolbarBtn>

        <div className="w-px h-4 bg-border-default mx-0.5" />

        {/* Undo / Redo */}
        <ToolbarBtn onClick={() => editor.chain().focus().undo().run()} title="Undo (Ctrl+Z)">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 6.5a4.5 4.5 0 1 1 4.5 4.5H4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><polyline points="1.5,4 2,7 5,6.5" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().redo().run()} title="Redo (Ctrl+Shift+Z)">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M11 6.5a4.5 4.5 0 1 0-4.5 4.5H9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><polyline points="11.5,4 11,7 8,6.5" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </ToolbarBtn>

        {/* Shortcuts hint */}
        <span className="ml-auto font-mono text-[9px] text-text-hint hidden sm:block">
          # H1 · - list · &gt; quote · ``` code
        </span>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />
    </div>
  )
}
