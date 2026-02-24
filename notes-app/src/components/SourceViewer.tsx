import { useState, useRef, useCallback, useEffect } from 'react'
import type { Source, Theme, Passage } from '../db/types'

interface PassagePopover {
  text: string
  x: number
  y: number
}

interface SourceViewerProps {
  source: Source
  themes: Theme[]
  passages: Passage[]
  onCreatePassage: (text: string, themeIds: string[]) => Promise<void>
  onDeleteSource: (id: string) => void
  onCreateTheme: (name: string) => Promise<Theme | undefined>
}

export default function SourceViewer({
  source,
  themes,
  passages,
  onCreatePassage,
  onDeleteSource,
  onCreateTheme,
}: SourceViewerProps) {
  const [popover, setPopover] = useState<PassagePopover | null>(null)
  const [selectedThemeIds, setSelectedThemeIds] = useState<string[]>([])
  const [newThemeName, setNewThemeName] = useState('')
  const [showNewTheme, setShowNewTheme] = useState(false)
  const [saving, setSaving] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  // Build a set of all highlighted passage texts for visual indication
  const sourcePassages = passages.filter(p => p.sourceId === source.id)
  const highlightedTexts = new Set(sourcePassages.map(p => p.text))

  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed) {
      return
    }
    const text = selection.toString().trim()
    if (!text || text.length < 10) {
      return
    }

    // Check if the selection is inside our content div
    if (contentRef.current && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      if (!contentRef.current.contains(range.commonAncestorContainer)) return
    }

    const range = selection.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    setPopover({
      text,
      x: rect.left + rect.width / 2,
      y: rect.bottom + window.scrollY + 8,
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

  // Render content with passage highlights
  const renderContent = () => {
    if (!source.content) return <p className="text-gray-400 italic">No content</p>

    // Simple paragraph rendering with highlight classes for known passages
    const paragraphs = source.content.split(/\n+/).filter(Boolean)
    return paragraphs.map((para, i) => {
      const isHighlighted = [...highlightedTexts].some(t => para.includes(t))
      return (
        <p
          key={i}
          className={`mb-4 leading-relaxed text-gray-800 ${isHighlighted ? 'bg-yellow-50 rounded px-1' : ''}`}
        >
          {para}
        </p>
      )
    })
  }

  return (
    <div className="flex flex-col h-full relative">
      {/* Source header */}
      <div className="px-6 py-4 border-b border-gray-100 bg-white flex-shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs uppercase font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
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
            <h2 className="text-lg font-semibold text-gray-900">{source.title}</h2>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-gray-400">{sourcePassages.length} passages</span>
            <button
              onClick={() => {
                if (confirm(`Delete "${source.title}"? This will also remove all passages from this source.`)) {
                  onDeleteSource(source.id)
                }
              }}
              className="text-gray-400 hover:text-red-500 p-1.5 rounded hover:bg-red-50 transition-colors"
              title="Delete source"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-2">Select any text to add it to a theme</p>
      </div>

      {/* Content */}
      <div
        ref={contentRef}
        className="flex-1 overflow-y-auto px-6 py-5 text-sm"
        onMouseUp={handleMouseUp}
        style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
      >
        {renderContent()}
      </div>

      {/* Passage popover */}
      {popover && (
        <div
          ref={popoverRef}
          className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-200 p-4 w-80"
          style={{
            left: Math.min(popover.x - 160, window.innerWidth - 340),
            top: popover.y,
          }}
        >
          <div className="mb-3">
            <p className="text-xs font-medium text-gray-500 mb-1">Selected passage:</p>
            <p className="text-sm text-gray-700 bg-yellow-50 rounded p-2 border border-yellow-100 line-clamp-3">
              {popover.text}
            </p>
          </div>

          {themes.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-medium text-gray-500 mb-1.5">Add to theme:</p>
              <div className="flex flex-wrap gap-1.5">
                {themes.map(theme => (
                  <button
                    key={theme.id}
                    onClick={() => toggleTheme(theme.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                      selectedThemeIds.includes(theme.id)
                        ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
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
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                onKeyDown={e => { if (e.key === 'Enter') handleAddToTheme() }}
              />
            </div>
          ) : (
            <button
              onClick={() => setShowNewTheme(true)}
              className="text-xs text-indigo-600 hover:text-indigo-700 mb-3 block"
            >
              + New theme
            </button>
          )}

          <div className="flex gap-2">
            <button
              onClick={closePopover}
              className="flex-1 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
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
