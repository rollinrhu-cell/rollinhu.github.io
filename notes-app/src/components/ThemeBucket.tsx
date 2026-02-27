import { useState } from 'react'
import type { Theme, Passage, Source } from '../db/types'

interface ThemeBucketProps {
  theme: Theme
  passages: Passage[]
  sources: Source[]
  onUpdatePassage: (id: string, updates: { note: string }) => Promise<void>
  onRemovePassage: (id: string) => Promise<void>
  onDeleteTheme: (id: string) => void
  onUpdateTheme: (id: string, updates: { name: string; description: string }) => Promise<void>
}

export default function ThemeBucket({
  theme,
  passages,
  sources,
  onUpdatePassage,
  onRemovePassage,
  onDeleteTheme,
  onUpdateTheme,
}: ThemeBucketProps) {
  const [editingTheme, setEditingTheme] = useState(false)
  const [themeName, setThemeName] = useState(theme.name)
  const [themeDesc, setThemeDesc] = useState(theme.description)
  const [savingTheme, setSavingTheme] = useState(false)

  const getSource = (sourceId: string) => sources.find(s => s.id === sourceId)

  const handleSaveTheme = async () => {
    if (!themeName.trim()) return
    setSavingTheme(true)
    await onUpdateTheme(theme.id, { name: themeName.trim(), description: themeDesc.trim() })
    setSavingTheme(false)
    setEditingTheme(false)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Theme header */}
      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0">
        {editingTheme ? (
          <div className="space-y-2">
            <input
              type="text"
              value={themeName}
              onChange={e => setThemeName(e.target.value)}
              className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <input
              type="text"
              value={themeDesc}
              onChange={e => setThemeDesc(e.target.value)}
              placeholder="Description (optional)"
              className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setEditingTheme(false); setThemeName(theme.name); setThemeDesc(theme.description) }}
                className="px-3 py-1 text-xs text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTheme}
                disabled={savingTheme || !themeName.trim()}
                className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: theme.color }} />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{theme.name}</h2>
              </div>
              {theme.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400">{theme.description}</p>
              )}
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{passages.length} passage{passages.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => setEditingTheme(true)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Edit theme"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={() => {
                  if (confirm(`Delete theme "${theme.name}"? Passages will not be deleted, just unlinked from this theme.`)) {
                    onDeleteTheme(theme.id)
                  }
                }}
                className="text-gray-400 hover:text-red-500 p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                title="Delete theme"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Passages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {passages.length === 0 ? (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500">
            <svg className="w-10 h-10 mx-auto mb-3 text-gray-200 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <p className="text-sm">No passages yet</p>
            <p className="text-xs mt-1">Open a source and highlight text to add passages here</p>
          </div>
        ) : (
          passages.map(passage => (
            <PassageCard
              key={passage.id}
              passage={passage}
              source={getSource(passage.sourceId)}
              onUpdate={onUpdatePassage}
              onRemove={onRemovePassage}
              themeColor={theme.color}
            />
          ))
        )}
      </div>
    </div>
  )
}

function PassageCard({
  passage,
  source,
  onUpdate,
  onRemove,
  themeColor,
}: {
  passage: Passage
  source: Source | undefined
  onUpdate: (id: string, updates: { note: string }) => Promise<void>
  onRemove: (id: string) => Promise<void>
  themeColor: string
}) {
  const [note, setNote] = useState(passage.note || '')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSaveNote = async () => {
    setSaving(true)
    await onUpdate(passage.id, { note })
    setSaving(false)
    setEditing(false)
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      {/* Passage text */}
      <div className="p-4 border-l-4" style={{ borderLeftColor: themeColor }}>
        <blockquote className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed italic">
          "{passage.text}"
        </blockquote>
        {source && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 font-medium">— {source.title}</p>
        )}
      </div>

      {/* Note section */}
      <div className="px-4 pb-4 pt-2 bg-gray-50 dark:bg-gray-800/60 border-t border-gray-100 dark:border-gray-700">
        {editing ? (
          <div className="space-y-2">
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Add your notes or analysis…"
              rows={3}
              autoFocus
              className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
            />
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  if (confirm('Remove this passage from the theme?')) onRemove(passage.id)
                }}
                className="text-xs text-red-400 hover:text-red-600 dark:hover:text-red-400"
              >
                Remove passage
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => { setEditing(false); setNote(passage.note || '') }}
                  className="px-3 py-1 text-xs text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded hover:bg-white dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveNote}
                  disabled={saving}
                  className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div
            className="cursor-pointer group"
            onClick={() => setEditing(true)}
          >
            {note ? (
              <p className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-200">{note}</p>
            ) : (
              <p className="text-xs text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-400 italic">
                Click to add a note or analysis…
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
