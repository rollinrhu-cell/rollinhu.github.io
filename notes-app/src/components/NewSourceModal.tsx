import { useState, useRef } from 'react'
import type { SourceType } from '../db/types'

interface NewSourceModalProps {
  onClose: () => void
  onSave: (title: string, content: string, type: SourceType, url?: string) => Promise<void>
}

type Tab = 'text' | 'url' | 'upload' | 'note'

export default function NewSourceModal({ onClose, onSave }: NewSourceModalProps) {
  const [tab, setTab] = useState<Tab>('text')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [url, setUrl] = useState('')
  const [fetchStatus, setFetchStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [fetchError, setFetchError] = useState('')
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFetchUrl = async () => {
    if (!url.trim()) return
    setFetchStatus('loading')
    setFetchError('')
    setContent('')
    try {
      const encoded = encodeURIComponent(url.trim())
      const res = await fetch(`https://api.allorigins.win/get?url=${encoded}`)
      if (!res.ok) throw new Error('Fetch failed')
      const data = await res.json()
      const html: string = data.contents || ''
      const text = stripHtml(html)
      if (!text || text.length < 50) throw new Error('Could not extract readable content')
      setContent(text)
      if (!title) {
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
        if (titleMatch) setTitle(titleMatch[1].trim().slice(0, 120))
      }
      setFetchStatus('idle')
    } catch {
      setFetchStatus('error')
      setFetchError('Could not fetch this URL automatically. Paste the content manually in the text below.')
      setFetchStatus('error')
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!title) setTitle(file.name.replace(/\.[^.]+$/, ''))

    if (file.name.endsWith('.pdf')) {
      try {
        const arrayBuffer = await file.arrayBuffer()
        const pdfjsLib = await import('pdfjs-dist')
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
        let text = ''
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i)
          const textContent = await page.getTextContent()
          text += textContent.items.map((item) => ('str' in item ? (item as { str: string }).str : '')).join(' ') + '\n'
        }
        setContent(text.trim())
      } catch {
        setContent('[Could not extract PDF text. Try copying and pasting the content manually.]')
      }
    } else if (file.name.endsWith('.docx')) {
      try {
        const arrayBuffer = await file.arrayBuffer()
        const mammoth = await import('mammoth')
        const result = await mammoth.extractRawText({ arrayBuffer })
        setContent(result.value.trim())
      } catch {
        setContent('[Could not extract Word document text. Try copying and pasting the content manually.]')
      }
    } else {
      const text = await file.text()
      setContent(text)
    }
  }

  const handleSave = async () => {
    const trimmedTitle = title.trim()
    const trimmedContent = content.trim()
    if (!trimmedTitle) return
    setSaving(true)
    try {
      const type: SourceType = tab === 'note' ? 'note' : tab === 'url' ? 'url' : tab === 'upload' ? (
        fileRef.current?.files?.[0]?.name.endsWith('.pdf') ? 'pdf' : 'docx'
      ) : 'text'
      await onSave(trimmedTitle, trimmedContent, type, tab === 'url' ? url.trim() : undefined)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'text', label: 'Paste text' },
    { id: 'url', label: 'Web URL' },
    { id: 'upload', label: 'Upload file' },
    { id: 'note', label: 'My notes' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Add source</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                tab === t.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Source title"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* URL tab */}
          {tab === 'url' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="https://example.com/article"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  onKeyDown={e => { if (e.key === 'Enter') handleFetchUrl() }}
                />
                <button
                  onClick={handleFetchUrl}
                  disabled={fetchStatus === 'loading'}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {fetchStatus === 'loading' ? 'Fetching…' : 'Fetch'}
                </button>
              </div>
              {fetchError && (
                <p className="mt-1.5 text-xs text-amber-600">{fetchError}</p>
              )}
            </div>
          )}

          {/* Upload tab */}
          {tab === 'upload' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">File (PDF or Word)</label>
              <div
                className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center cursor-pointer hover:border-indigo-300 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                <svg className="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-sm text-gray-500">
                  {fileRef.current?.files?.[0]?.name || 'Click to upload PDF or .docx'}
                </p>
                <p className="text-xs text-gray-400 mt-1">Text will be extracted automatically</p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.docx,.txt"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          )}

          {/* Content textarea (all tabs) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {tab === 'text' ? 'Paste content' : tab === 'note' ? 'Your notes' : 'Content'}
              {tab !== 'text' && tab !== 'note' && <span className="text-gray-400 font-normal ml-1">(auto-filled or edit below)</span>}
            </label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={12}
              placeholder={
                tab === 'note'
                  ? 'Write your own observations and thoughts here…'
                  : 'Paste source content here…'
              }
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-mono leading-relaxed"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Save source'}
          </button>
        </div>
      </div>
    </div>
  )
}

function stripHtml(html: string): string {
  // Remove script/style tags and their contents
  let text = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return text
}
