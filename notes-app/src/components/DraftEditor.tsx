import { useEffect, useRef, useState, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import type { Draft, Theme, Passage, Source } from '../db/types'
import { saveDraft } from '../db'

interface DraftEditorProps {
  draft: Draft | undefined
  projectId: string
  themes: Theme[]
  passages: Passage[]
  sources: Source[]
  onDraftSaved: () => void
}

export default function DraftEditor({
  draft,
  projectId,
  themes,
  passages,
  sources,
  onDraftSaved,
}: DraftEditorProps) {
  const [title, setTitle] = useState(draft?.title || 'Untitled Draft')
  const [showInsertPanel, setShowInsertPanel] = useState(false)
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const draftIdRef = useRef<string>(draft?.id || crypto.randomUUID())

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({
        placeholder: 'Start writing your draft here…',
      }),
    ],
    content: draft?.content ? JSON.parse(draft.content) : '',
    onUpdate: () => {
      // Debounced auto-save
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current)
      autoSaveRef.current = setTimeout(() => {
        handleSave()
      }, 2000)
    },
  })

  const handleSave = useCallback(async () => {
    if (!editor) return
    setSaving(true)
    try {
      const content = JSON.stringify(editor.getJSON())
      await saveDraft({
        id: draftIdRef.current,
        projectId,
        title: title,
        content,
        updatedAt: Date.now(),
      })
      setLastSaved(new Date())
      onDraftSaved()
    } finally {
      setSaving(false)
    }
  }, [editor, projectId, title, onDraftSaved])

  // Save on title change too
  useEffect(() => {
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current)
    autoSaveRef.current = setTimeout(() => {
      handleSave()
    }, 1000)
  }, [title, handleSave])

  // Cleanup
  useEffect(() => {
    return () => {
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current)
    }
  }, [])

  const insertPassage = (passage: Passage) => {
    if (!editor) return
    const source = sources.find(s => s.id === passage.sourceId)
    const citation = source ? `— ${source.title}` : ''

    editor.chain().focus()
      .insertContent({
        type: 'blockquote',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: `"${passage.text}"` }],
          },
          ...(citation ? [{
            type: 'paragraph',
            content: [{ type: 'text', text: citation, marks: [{ type: 'italic' }] }],
          }] : []),
        ],
      })
      .run()

    setShowInsertPanel(false)
  }

  const themePassages = selectedThemeId
    ? passages.filter(p => p.themeIds.includes(selectedThemeId))
    : []

  return (
    <div className="flex flex-col h-full">
      {/* Draft header */}
      <div className="px-6 py-3 border-b border-gray-100 bg-white flex-shrink-0">
        <div className="flex items-center justify-between gap-4">
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="text-lg font-semibold text-gray-900 bg-transparent border-none outline-none flex-1 placeholder-gray-300"
            placeholder="Draft title"
          />
          <div className="flex items-center gap-3 flex-shrink-0">
            {lastSaved && (
              <span className="text-xs text-gray-400">
                {saving ? 'Saving…' : `Saved ${formatTime(lastSaved)}`}
              </span>
            )}
            <button
              onClick={() => setShowInsertPanel(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                showInsertPanel
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              Insert passage
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-1 mt-2">
          <ToolbarButton onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive('bold')}>
            <span className="font-bold text-sm">B</span>
          </ToolbarButton>
          <ToolbarButton onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive('italic')}>
            <span className="italic text-sm">I</span>
          </ToolbarButton>
          <ToolbarButton onClick={() => editor?.chain().focus().toggleUnderline().run()} active={editor?.isActive('underline')}>
            <span className="underline text-sm">U</span>
          </ToolbarButton>
          <div className="w-px h-4 bg-gray-200 mx-1" />
          <ToolbarButton onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} active={editor?.isActive('heading', { level: 1 })}>
            <span className="text-xs font-semibold">H1</span>
          </ToolbarButton>
          <ToolbarButton onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive('heading', { level: 2 })}>
            <span className="text-xs font-semibold">H2</span>
          </ToolbarButton>
          <div className="w-px h-4 bg-gray-200 mx-1" />
          <ToolbarButton onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive('bulletList')}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
          </ToolbarButton>
          <ToolbarButton onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive('orderedList')}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h10m-7 4h7M3 8h.01M3 12h.01M3 16h.01" />
            </svg>
          </ToolbarButton>
          <ToolbarButton onClick={() => editor?.chain().focus().toggleBlockquote().run()} active={editor?.isActive('blockquote')}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </ToolbarButton>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Editor area */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-2xl mx-auto">
            <EditorContent editor={editor} className="min-h-96" />
          </div>
        </div>

        {/* Insert passage panel */}
        {showInsertPanel && (
          <div className="w-72 border-l border-gray-100 bg-gray-50 flex flex-col overflow-hidden">
            <div className="p-3 border-b border-gray-100 bg-white">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Insert passage</p>
            </div>
            {/* Theme selector */}
            <div className="p-3 border-b border-gray-100 bg-white">
              <select
                value={selectedThemeId || ''}
                onChange={e => setSelectedThemeId(e.target.value || null)}
                className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select a theme…</option>
                {themes.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            {/* Passages list */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {selectedThemeId && themePassages.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">No passages in this theme</p>
              )}
              {!selectedThemeId && (
                <p className="text-xs text-gray-400 text-center py-4">Choose a theme to see passages</p>
              )}
              {themePassages.map(passage => {
                const source = sources.find(s => s.id === passage.sourceId)
                return (
                  <button
                    key={passage.id}
                    onClick={() => insertPassage(passage)}
                    className="w-full text-left p-2.5 bg-white rounded-lg border border-gray-200 hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors"
                  >
                    <p className="text-xs text-gray-700 italic line-clamp-3">"{passage.text}"</p>
                    {source && (
                      <p className="text-xs text-gray-400 mt-1 font-medium">— {source.title}</p>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ToolbarButton({
  onClick, active, children,
}: {
  onClick: () => void
  active?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`p-1.5 rounded transition-colors ${
        active
          ? 'bg-indigo-100 text-indigo-700'
          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
      }`}
    >
      {children}
    </button>
  )
}

function formatTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
