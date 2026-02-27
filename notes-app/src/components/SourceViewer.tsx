import { useState, useRef, useCallback, useEffect } from 'react'
import type { Source, Theme, Passage } from '../db/types'

interface PassagePopover {
  text: string
  x: number
  y: number
  flipUp: boolean
}

interface SourceViewerProps {
  source: Source
  themes: Theme[]
  passages: Passage[]
  onCreatePassage: (text: string, themeIds: string[]) => Promise<void>
  onDeleteSource: (id: string) => void
  onCreateTheme: (name: string) => Promise<Theme | undefined>
  onToggleRead: () => void
}

// Render a paragraph with inline passage highlights and theme tooltips
function renderParagraphWithHighlights(
  text: string,
  passages: Passage[],
  themes: Theme[]
): React.ReactNode[] {
  if (passages.length === 0) return [text]

  // Find all passage positions within this paragraph text
  type Match = { start: number; end: number; passage: Passage }
  const matches: Match[] = []

  for (const passage of passages) {
    let searchFrom = 0
    while (true) {
      const idx = text.indexOf(passage.text, searchFrom)
      if (idx === -1) break
      // Check for overlap with existing matches; skip if overlapping
      const end = idx + passage.text.length
      const overlaps = matches.some(m => idx < m.end && end > m.start)
      if (!overlaps) {
        matches.push({ start: idx, end, passage })
      }
      searchFrom = idx + 1
    }
  }

  if (matches.length === 0) return [text]

  matches.sort((a, b) => a.start - b.start)

  const nodes: React.ReactNode[] = []
  let pos = 0

  for (const match of matches) {
    if (match.start > pos) {
      nodes.push(text.slice(pos, match.start))
    }
    const themeNames = match.passage.themeIds
      .map(tid => themes.find(t => t.id === tid)?.name)
      .filter(Boolean)
      .join(', ')
    nodes.push(
      <span key={match.start} className="passage-highlight">
        {text.slice(match.start, match.end)}
        {themeNames && <span className="passage-tooltip">{themeNames}</span>}
      </span>
    )
    pos = match.end
  }

  if (pos < text.length) {
    nodes.push(text.slice(pos))
  }

  return nodes
}

export default function SourceViewer({
  source,
  themes,
  passages,
  onCreatePassage,
  onDeleteSource,
  onCreateTheme,
  onToggleRead,
}: SourceViewerProps) {
  const [popover, setPopover] = useState<PassagePopover | null>(null)
  const [selectedThemeIds, setSelectedThemeIds] = useState<string[]>([])
  const [newThemeName, setNewThemeName] = useState('')
  const [showNewTheme, setShowNewTheme] = useState(false)
  const [saving, setSaving] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  const sourcePassages = passages.filter(p => p.sourceId === source.id)

  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed) return
    const text = selection.toString().trim()
    if (!text || text.length < 10) return

    if (contentRef.current && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      if (!contentRef.current.contains(range.commonAncestorContainer)) return
    }

    const range = selection.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    const POPUP_HEIGHT_EST = 320
    const flipUp = (window.innerHeight - rect.bottom) < POPUP_HEIGHT_EST + 16
    setPopover({
      text,
      x: rect.left + rect.width / 2,
      y: flipUp ? rect.top - 8 : rect.bottom + 8,
      flipUp,
    })
    setSelectedThemeIds([])
    setShowNewTheme(false)
    setNewThemeName('')
  }, [])

  const closePopover = useCallback(() => {
    setPopover(null)
    window.getSelection()?.removeAllRanges()
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        closePopover()
      }
    }
    if (popover) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [popover, closePopover])

  const handleAddToTheme = async () => {
    if (!popover) return
    let themeIds = [...selectedThemeIds]

    if (showNewTheme && newThemeName.trim()) {
      const theme = await onCreateTheme(newThemeName.trim())
      if (theme) themeIds = [...themeIds, theme.id]
    }

    if (themeIds.length === 0) return
    setSaving(true)
    try {
      await onCreatePassage(popover.text, themeIds)
      closePopover()
    } finally {
      setSaving(false)
    }
  }

  const toggleTheme = (id: string) => {
    setSelectedThemeIds(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    )
  }

  const renderContent = () => {
    if (!source.content) return <p className="text-gray-400 dark:text-gray-500 italic">No content</p>

    const paragraphs = source.content.split(/\n+/).filter(Boolean)
    return paragraphs.map((para, i) => (
      <p key={i} className="mb-4 leading-relaxed text-gray-800 dark:text-gray-200">
        {renderParagraphWithHighlights(para, sourcePassages, themes)}
      </p>
    ))
  }

  return (
    <div className="flex flex-col h-full relative bg-white dark:bg-gray-900">
      {/* Source header */}
      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 flex-shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs uppercase font-medium px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                {source.type}
              </span>
              {source.url && (
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-500 hover:text-blue-600 truncate max-w-xs"
                >
                  {source.url}
                </a>
              )}
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{source.title}</h2>
            {(source.author || source.publishedDate) && (
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {source.author && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">{source.author}</span>
                )}
                {source.author && source.publishedDate && (
                  <span className="text-xs text-gray-300 dark:text-gray-600">·</span>
                )}
                {source.publishedDate && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">{source.publishedDate}</span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-gray-400 dark:text-gray-500">{sourcePassages.length} passages</span>
            <button
              onClick={onToggleRead}
              className={`p-1.5 rounded transition-colors ${
                source.readAt
                  ? 'text-green-500 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30'
                  : 'text-gray-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20'
              }`}
              title={source.readAt ? 'Mark as unread' : 'Mark as read'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
            <button
              onClick={() => {
                if (confirm(`Delete "${source.title}"? This will also remove all passages from this source.`)) {
                  onDeleteSource(source.id)
                }
              }}
              className="text-gray-400 hover:text-red-500 p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              title="Delete source"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Select any text to add it to a theme</p>
      </div>

      {/* Content */}
      <div
        ref={contentRef}
        className="flex-1 overflow-y-auto px-6 py-5 text-sm bg-white dark:bg-gray-900"
        onMouseUp={handleMouseUp}
        style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
      >
        {renderContent()}
      </div>

      {/* Passage popover */}
      {popover && (
        <div
          ref={popoverRef}
          className="fixed z-50 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 w-80"
          style={{
            left: Math.min(Math.max(popover.x - 160, 8), window.innerWidth - 340),
            top: popover.y,
            transform: popover.flipUp ? 'translateY(calc(-100% - 8px))' : undefined,
          }}
        >
          <div className="mb-3">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Selected passage:</p>
            <p className="text-sm text-gray-700 dark:text-gray-300 bg-yellow-50 dark:bg-yellow-900/20 rounded p-2 border border-yellow-100 dark:border-yellow-800/30 line-clamp-3">
              {popover.text}
            </p>
          </div>

          {themes.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Add to theme:</p>
              <div className="flex flex-wrap gap-1.5">
                {themes.map(theme => (
                  <button
                    key={theme.id}
                    onClick={() => toggleTheme(theme.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                      selectedThemeIds.includes(theme.id)
                        ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                        : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.color }} />
                    {theme.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* New theme */}
          {showNewTheme ? (
            <div className="mb-3">
              <input
                type="text"
                autoFocus
                value={newThemeName}
                onChange={e => setNewThemeName(e.target.value)}
                placeholder="New theme name"
                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                onKeyDown={e => { if (e.key === 'Enter') handleAddToTheme() }}
              />
            </div>
          ) : (
            <button
              onClick={() => setShowNewTheme(true)}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 mb-3 block"
            >
              + New theme
            </button>
          )}

          <div className="flex gap-2">
            <button
              onClick={closePopover}
              className="flex-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddToTheme}
              disabled={saving || (selectedThemeIds.length === 0 && (!showNewTheme || !newThemeName.trim()))}
              className="flex-1 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium"
            >
              {saving ? 'Saving…' : 'Add to theme'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
