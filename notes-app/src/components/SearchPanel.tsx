import { useState, useEffect, useRef, useCallback } from 'react'
import type { Source, Theme, Passage } from '../db/types'

// ─── Semantic search module-level state ──────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let embeddingPipeline: any = null
let pipelineLoading = false
const pipelineCallbacks: Array<(p: unknown) => void> = []

async function getEmbeddingPipeline(
  onProgress: (pct: number) => void
): Promise<unknown> {
  if (embeddingPipeline) return embeddingPipeline
  if (pipelineLoading) {
    return new Promise(resolve => pipelineCallbacks.push(resolve))
  }
  pipelineLoading = true
  const { pipeline, env } = await import('@xenova/transformers')
  env.allowLocalModels = false
  const pipe = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
    progress_callback: (info: { progress?: number }) => {
      if (info.progress != null) onProgress(Math.round(info.progress))
    },
  })
  embeddingPipeline = pipe
  pipelineLoading = false
  pipelineCallbacks.forEach(cb => cb(pipe))
  pipelineCallbacks.length = 0
  return pipe
}

// Embedding cache: sourceId → Float32Array[]
const embeddingCache = new Map<string, Float32Array[]>()

function chunkText(text: string, maxWords = 250): string[] {
  const paragraphs = text.split(/\n{2,}/).filter(p => p.trim())
  const chunks: string[] = []
  let current = ''
  let wordCount = 0
  for (const para of paragraphs) {
    const words = para.trim().split(/\s+/).length
    if (wordCount + words > maxWords && current) {
      chunks.push(current.trim())
      current = para
      wordCount = words
    } else {
      current = current ? current + '\n\n' + para : para
      wordCount += words
    }
  }
  if (current.trim()) chunks.push(current.trim())
  return chunks.length > 0 ? chunks : [text.slice(0, 1000)]
}


function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom === 0 ? 0 : dot / denom
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function embed(pipe: any, texts: string[]): Promise<Float32Array[]> {
  const output = await pipe(texts, { pooling: 'mean', normalize: true })
  // output is a Tensor with shape [batch, hidden]
  const hiddenSize = output.dims[1]
  const results: Float32Array[] = []
  for (let i = 0; i < texts.length; i++) {
    const vec = new Float32Array(hiddenSize)
    for (let j = 0; j < hiddenSize; j++) {
      vec[j] = (output.data as Float32Array)[i * hiddenSize + j]
    }
    results.push(vec)
  }
  return results
}

// ─── Component ────────────────────────────────────────────────────────────────

interface SearchPanelProps {
  sources: Source[]
  themes: Theme[]
  passages: Passage[]
  onClose: () => void
  onSelectSource: (id: string) => void
}

type Tab = 'keyword' | 'semantic'

interface KeywordResult {
  source: Source
  excerpts: { before: string; match: string; after: string }[]
}

interface SemanticResult {
  source: Source
  chunkText: string
  score: number
}

export default function SearchPanel({
  sources,
  onClose,
  onSelectSource,
}: SearchPanelProps) {
  const [tab, setTab] = useState<Tab>('keyword')
  const [query, setQuery] = useState('')
  const [keywordResults, setKeywordResults] = useState<KeywordResult[]>([])
  const [semanticResults, setSemanticResults] = useState<SemanticResult[]>([])
  const [modelProgress, setModelProgress] = useState<number | null>(null)
  const [modelReady, setModelReady] = useState(!!embeddingPipeline)
  const [semanticLoading, setSemanticLoading] = useState(false)
  const [semanticError, setSemanticError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    inputRef.current?.focus()
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  // Keyword search — runs on query change with debounce
  useEffect(() => {
    if (tab !== 'keyword') return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      runKeywordSearch(query)
    }, 250)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, tab, sources])

  const runKeywordSearch = useCallback((q: string) => {
    if (!q.trim()) { setKeywordResults([]); return }
    const lower = q.toLowerCase()
    const results: KeywordResult[] = []
    for (const source of sources) {
      const content = source.content
      const lowerContent = content.toLowerCase()
      const excerpts: KeywordResult['excerpts'] = []
      let searchFrom = 0
      while (true) {
        const idx = lowerContent.indexOf(lower, searchFrom)
        if (idx === -1) break
        const start = Math.max(0, idx - 70)
        const end = Math.min(content.length, idx + lower.length + 70)
        excerpts.push({
          before: content.slice(start, idx),
          match: content.slice(idx, idx + lower.length),
          after: content.slice(idx + lower.length, end),
        })
        searchFrom = idx + lower.length
        if (excerpts.length >= 3) break // cap per source
      }
      if (excerpts.length > 0) results.push({ source, excerpts })
    }
    setKeywordResults(results)
  }, [sources])

  const runSemanticSearch = async () => {
    if (!query.trim()) return
    setSemanticLoading(true)
    setSemanticError('')
    try {
      const pipe = await getEmbeddingPipeline((pct) => {
        setModelProgress(pct)
        if (pct >= 100) { setModelReady(true); setModelProgress(null) }
      })
      setModelReady(true)
      setModelProgress(null)

      // Build all chunks
      const allChunks: { sourceId: string; text: string }[] = []
      for (const source of sources) {
        if (!embeddingCache.has(source.id)) {
          const chunks = chunkText(source.content)
          const vecs = await embed(pipe, chunks)
          embeddingCache.set(source.id, vecs)
          allChunks.push(...chunks.map(text => ({ sourceId: source.id, text })))
        } else {
          const chunks = chunkText(source.content)
          allChunks.push(...chunks.map(text => ({ sourceId: source.id, text })))
        }
      }

      // Embed query
      const [queryVec] = await embed(pipe, [query])

      // Score all chunks
      const scored: { sourceId: string; chunkText: string; score: number }[] = []
      let chunkIdx = 0
      for (const source of sources) {
        const chunks = chunkText(source.content)
        const vecs = embeddingCache.get(source.id) || []
        for (let i = 0; i < chunks.length; i++) {
          const vec = vecs[i]
          if (vec) {
            scored.push({ sourceId: source.id, chunkText: chunks[i], score: cosineSimilarity(queryVec, vec) })
          }
          chunkIdx++
        }
      }
      void allChunks[chunkIdx] // suppress unused warning

      scored.sort((a, b) => b.score - a.score)
      const top8 = scored.slice(0, 8)

      setSemanticResults(top8.map(r => ({
        source: sources.find(s => s.id === r.sourceId)!,
        chunkText: r.chunkText,
        score: r.score,
      })).filter(r => r.source))
    } catch (err) {
      setSemanticError('Failed to load embedding model. Check your internet connection.')
      console.error(err)
    } finally {
      setSemanticLoading(false)
    }
  }

  const totalKeywordMatches = keywordResults.reduce((sum, r) => sum + r.excerpts.length, 0)

  return (
    <div className="fixed inset-0 z-40 flex justify-end" onClick={onClose}>
      <div
        className="w-full max-w-xl bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 flex flex-col h-full shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3 bg-white dark:bg-gray-900">
          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search across all sources…"
            className="flex-1 bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none"
            onKeyDown={e => {
              if (e.key === 'Enter' && tab === 'semantic') runSemanticSearch()
              if (e.key === 'Escape') onClose()
            }}
          />
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 dark:border-gray-700 px-4">
          {(['keyword', 'semantic'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px capitalize ${
                tab === t
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Results area */}
        <div className="flex-1 overflow-y-auto">
          {tab === 'keyword' && (
            <div className="p-3">
              {!query.trim() && (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">Type to search across all sources</p>
              )}
              {query.trim() && keywordResults.length === 0 && (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">No matches found</p>
              )}
              {keywordResults.length > 0 && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
                  {totalKeywordMatches} match{totalKeywordMatches !== 1 ? 'es' : ''} in {keywordResults.length} source{keywordResults.length !== 1 ? 's' : ''}
                </p>
              )}
              {keywordResults.map(({ source, excerpts }) => (
                <div key={source.id} className="mb-4">
                  <button
                    onClick={() => { onSelectSource(source.id); onClose() }}
                    className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 mb-1.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {source.title}
                  </button>
                  <div className="space-y-1.5 ml-1">
                    {excerpts.map((ex, i) => (
                      <button
                        key={i}
                        onClick={() => { onSelectSource(source.id); onClose() }}
                        className="w-full text-left px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                      >
                        …{ex.before}<mark className="bg-yellow-200 dark:bg-yellow-800/60 text-gray-900 dark:text-yellow-100 rounded px-0.5">{ex.match}</mark>{ex.after}…
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'semantic' && (
            <div className="p-3">
              {/* Model loading progress */}
              {modelProgress !== null && (
                <div className="mb-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Loading embedding model (~22MB, one-time download)…</p>
                  <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all"
                      style={{ width: `${modelProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{modelProgress}%</p>
                </div>
              )}

              {!query.trim() && (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">
                  Enter a concept or question and press Enter to search semantically
                </p>
              )}

              {query.trim() && !modelReady && !semanticLoading && modelProgress === null && (
                <button
                  onClick={runSemanticSearch}
                  className="w-full py-2 px-4 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors mb-4"
                >
                  Search (loads model on first use)
                </button>
              )}

              {query.trim() && modelReady && !semanticLoading && semanticResults.length === 0 && (
                <div>
                  <button
                    onClick={runSemanticSearch}
                    className="w-full py-2 px-4 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors mb-4"
                  >
                    Search
                  </button>
                </div>
              )}

              {semanticLoading && (
                <div className="text-center py-8">
                  <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-xs text-gray-400 dark:text-gray-500">Analyzing sources…</p>
                </div>
              )}

              {semanticError && (
                <p className="text-sm text-red-500 dark:text-red-400 text-center py-4">{semanticError}</p>
              )}

              {semanticResults.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">Top {semanticResults.length} relevant passages</p>
                  {semanticResults.map((r, i) => (
                    <div key={i} className="mb-3">
                      <button
                        onClick={() => { onSelectSource(r.source.id); onClose() }}
                        className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 mb-1"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {r.source.title}
                        <span className="ml-auto text-xs text-gray-400 dark:text-gray-500 font-normal">{Math.round(r.score * 100)}% match</span>
                      </button>
                      <button
                        onClick={() => { onSelectSource(r.source.id); onClose() }}
                        className="w-full text-left px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors line-clamp-4"
                      >
                        {r.chunkText.slice(0, 300)}{r.chunkText.length > 300 ? '…' : ''}
                      </button>
                      {/* Score bar */}
                      <div className="h-0.5 bg-gray-100 dark:bg-gray-700 rounded-full mt-1 ml-1">
                        <div className="h-full bg-indigo-400 dark:bg-indigo-500 rounded-full" style={{ width: `${Math.round(r.score * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Source count footer */}
        <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-400 dark:text-gray-500">
          Searching {sources.length} source{sources.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  )
}
