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
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [exportFilename, setExportFilename] = useState(draft?.title || 'Untitled Draft')
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [wordCount, setWordCount] = useState(0)
  const [copyFeedback, setCopyFeedback] = useState(false)
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const draftIdRef = useRef<string>(draft?.id || crypto.randomUUID())
  const exportMenuRef = useRef<HTMLDivElement>(null)

  // Sync exportFilename when title changes
  useEffect(() => {
    setExportFilename(title)
  }, [title])

  // Close export menu on outside click
  useEffect(() => {
    if (!showExportMenu) return
    const handler = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showExportMenu])

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({
        placeholder: 'Start writing your draft here…',
      }),
    ],
    content: draft?.content ? JSON.parse(draft.content) : '',
    onUpdate: ({ editor: e }) => {
      // Update word count immediately
      const text = e.getText()
      setWordCount(text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0)
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

  // Initialize word count from existing content
  useEffect(() => {
    if (editor) {
      const text = editor.getText()
      setWordCount(text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0)
    }
  }, [editor])

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

  const handleExportPDF = () => {
    if (!editor) return
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    const safe = exportFilename.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${safe}</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:760px;margin:40px auto;padding:0 24px;line-height:1.7;color:#111827}
h1{font-size:1.75rem;font-weight:700;margin:0 0 1.5rem}
h2{font-size:1.4rem;font-weight:600;margin:1.25rem 0 0.5rem}
h3{font-size:1.2rem;font-weight:600;margin:1rem 0 0.5rem}
p{margin:0.75rem 0}
blockquote{border-left:4px solid #d1d5db;padding-left:1rem;margin:1rem 0;color:#4b5563;font-style:italic}
ul{list-style:disc;padding-left:1.75rem;margin:0.75rem 0}
ol{list-style:decimal;padding-left:1.75rem;margin:0.75rem 0}
li{margin:0.25rem 0}
strong{font-weight:700}em{font-style:italic}u{text-decoration:underline}
</style></head><body><h1>${safe}</h1>${editor.getHTML()}</body></html>`)
    printWindow.document.close()
    printWindow.print()
    setShowExportMenu(false)
  }

  const handleExportWord = () => {
    if (!editor) return
    const safe = exportFilename.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>${safe}</title></head><body><h1>${safe}</h1>${editor.getHTML()}</body></html>`
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${exportFilename || 'draft'}.doc`
    a.click()
    URL.revokeObjectURL(url)
    setShowExportMenu(false)
  }

  const handleCopyFormatted = async () => {
    if (!editor) return
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([editor.getHTML()], { type: 'text/html' }),
          'text/plain': new Blob([editor.getText()], { type: 'text/plain' }),
        }),
      ])
      setCopyFeedback(true)
      setTimeout(() => setCopyFeedback(false), 2000)
    } catch {
      // Fallback: copy plain text
      await navigator.clipboard.writeText(editor.getText())
      setCopyFeedback(true)
      setTimeout(() => setCopyFeedback(false), 2000)
    }
    setShowExportMenu(false)
  }

  const themePassages = selectedThemeId
    ? passages.filter(p => p.themeIds.includes(selectedThemeId))
    : []

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Draft header */}
      <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 flex-shrink-0">
        <div className="flex items-center justify-between gap-4">
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="text-lg font-semibold text-gray-900 dark:text-gray-100 bg-transparent border-none outline-none flex-1 placeholder-gray-300 dark:placeholder-gray-600"
            placeholder="Draft title"
          />
          <div className="flex items-center gap-3 flex-shrink-0">
            {wordCount > 0 && (
              <span className="text-xs text-gray-400 dark:text-gray-500">{wordCount} words</span>
            )}
            {lastSaved && (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {saving ? 'Saving…' : `Saved ${formatTime(lastSaved)}`}
              </span>
            )}
            {copyFeedback && (
              <span className="text-xs text-green-600 dark:text-green-400">Copied!</span>
            )}

            {/* Export menu */}
            <div className="relative" ref={exportMenuRef}>
              <button
                onClick={() => setShowExportMenu(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                  showExportMenu
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
                    : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export
              </button>

              {showExportMenu && (
                <div className="absolute right-0 top-full mt-1 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-3 z-50">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Filename</p>
                  <input
                    type="text"
                    value={exportFilename}
                    onChange={e => setExportFilename(e.target.value)}
                    className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm mb-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="filename"
                  />
                  <div className="space-y-1">
                    <button
                      onClick={handleExportPDF}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors text-left"
                    >
                      <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Save as PDF
                    </button>
                    <button
                      onClick={handleExportWord}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors text-left"
                    >
                      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Save as Word (.doc)
                    </button>
                    <button
                      onClick={handleCopyFormatted}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors text-left"
                    >
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                      Copy (preserves formatting)
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowInsertPanel(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                showInsertPanel
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
                  : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
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
          <div className="w-px h-4 bg-gray-200 dark:bg-gray-600 mx-1" />
          <ToolbarButton onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} active={editor?.isActive('heading', { level: 1 })}>
            <span className="text-xs font-semibold">H1</span>
          </ToolbarButton>
          <ToolbarButton onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive('heading', { level: 2 })}>
            <span className="text-xs font-semibold">H2</span>
          </ToolbarButton>
          <div className="w-px h-4 bg-gray-200 dark:bg-gray-600 mx-1" />
          {/* Bullet list — circle dots + lines */}
          <ToolbarButton onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive('bulletList')}>
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeWidth={3.5} d="M4 6h0M4 12h0M4 18h0" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 6h11M9 12h11M9 18h11" />
            </svg>
          </ToolbarButton>
          {/* Ordered list — "1 2 3" markers + lines */}
          <ToolbarButton onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive('orderedList')}>
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
              <path strokeWidth={2} d="M10 6h11M10 12h11M10 18h11" />
              <path strokeWidth={1.5} d="M4 5v3.5M3 8.5h2" />
              <path strokeWidth={1.5} d="M3 12h2l-2 2.5h2" />
              <path strokeWidth={1.5} d="M3 17h1.5a.5.5 0 010 1H3v.5h2" />
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
        <div className="flex-1 overflow-y-auto px-8 py-6 bg-white dark:bg-gray-900">
          <div className="max-w-2xl mx-auto">
            <EditorContent editor={editor} className="min-h-96 text-gray-900 dark:text-gray-100" />
          </div>
        </div>

        {/* Insert passage panel */}
        {showInsertPanel && (
          <div className="w-72 border-l border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex flex-col overflow-hidden">
            <div className="p-3 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900">
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">Insert passage</p>
            </div>
            {/* Theme selector */}
            <div className="p-3 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900">
              <select
                value={selectedThemeId || ''}
                onChange={e => setSelectedThemeId(e.target.value || null)}
                className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">No passages in this theme</p>
              )}
              {!selectedThemeId && (
                <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">Choose a theme to see passages</p>
              )}
              {themePassages.map(passage => {
                const source = sources.find(s => s.id === passage.sourceId)
                return (
                  <button
                    key={passage.id}
                    onClick={() => insertPassage(passage)}
                    className="w-full text-left p-2.5 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-700 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/20 transition-colors"
                  >
                    <p className="text-xs text-gray-700 dark:text-gray-300 italic line-clamp-3">"{passage.text}"</p>
                    {source && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-medium">— {source.title}</p>
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
          ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200'
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
