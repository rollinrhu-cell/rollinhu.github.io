import { useState, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import ProjectHome from './components/ProjectHome'
import SourceViewer from './components/SourceViewer'
import ThemeBucket from './components/ThemeBucket'
import DraftEditor from './components/DraftEditor'
import SplitView from './components/SplitView'
import NewSourceModal from './components/NewSourceModal'
import { useProjects } from './hooks/useProjects'
import { useSources } from './hooks/useSources'
import { useThemes } from './hooks/useThemes'
import { usePassages } from './hooks/usePassages'
import { getDraft, exportProject, importProject } from './db'
import type { Draft, Source, Theme } from './db/types'

type PaneView = 'home' | 'source' | 'theme' | 'draft'

interface PaneState {
  view: PaneView
  itemId: string | null
  draft: Draft | undefined
}

const defaultPane = (): PaneState => ({ view: 'home', itemId: null, draft: undefined })

export default function App() {
  const { projects, createProject, removeProject } = useProjects()
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [showNewSource, setShowNewSource] = useState(false)
  const [showNewTheme, setShowNewTheme] = useState(false)
  const [newThemeName, setNewThemeName] = useState('')
  const [splitMode, setSplitMode] = useState(false)
  const [pane1, setPane1] = useState<PaneState>(defaultPane())
  const [pane2, setPane2] = useState<PaneState>(defaultPane())

  const { sources, createSource, removeSource } = useSources(activeProjectId)
  const { themes, createTheme, updateTheme, removeTheme } = useThemes(activeProjectId)
  const { passages, createPassage, updatePassage, removePassage, getPassagesForTheme } = usePassages(activeProjectId)

  const setPane = useCallback((which: 1 | 2, state: Partial<PaneState>) => {
    if (which === 1) setPane1(prev => ({ ...prev, ...state }))
    else setPane2(prev => ({ ...prev, ...state }))
  }, [])

  const handleSelectProject = async (id: string) => {
    setActiveProjectId(id)
    setPane1(defaultPane())
    setSplitMode(false)
  }

  const handleCreateProject = async () => {
    const name = prompt('Project name:')
    if (!name?.trim()) return
    const desc = prompt('Short description (optional):') || ''
    const project = await createProject(name.trim(), desc)
    if (project) {
      setActiveProjectId(project.id)
      setPane1(defaultPane())
    }
  }

  const openDraftForPane = useCallback(async (which: 1 | 2) => {
    if (!activeProjectId) return
    const draft = await getDraft(activeProjectId)
    setPane(which, { view: 'draft', itemId: null, draft })
  }, [activeProjectId, setPane])

  const handleSelectSource = useCallback((id: string, which: 1 | 2 = 1) => {
    setPane(which, { view: 'source', itemId: id, draft: undefined })
  }, [setPane])

  const handleSelectTheme = useCallback((id: string, which: 1 | 2 = 1) => {
    setPane(which, { view: 'theme', itemId: id, draft: undefined })
  }, [setPane])

  const handleSelectDraft = useCallback((which: 1 | 2 = 1) => {
    openDraftForPane(which)
  }, [openDraftForPane])

  const handleExportProject = async () => {
    if (!activeProjectId) return
    const data = await exportProject(activeProjectId)
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const project = projects.find(p => p.id === activeProjectId)
    a.href = url
    a.download = `${project?.name || 'project'}-notes.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImportProject = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const data = JSON.parse(text)
        if (!data.project || !data.sources) {
          alert('Invalid project file.')
          return
        }
        await importProject(data)
        alert(`Project "${data.project.name}" imported successfully!`)
        setActiveProjectId(data.project.id)
      } catch {
        alert('Failed to import project. Make sure it is a valid project JSON file.')
      }
    }
    input.click()
  }

  const activePane1Source = sources.find(s => s.id === pane1.itemId)
  const activePane1Theme = themes.find(t => t.id === pane1.itemId)
  const activePane2Source = sources.find(s => s.id === pane2.itemId)
  const activePane2Theme = themes.find(t => t.id === pane2.itemId)

  const activeProject = projects.find(p => p.id === activeProjectId)

  const renderPaneContent = (
    pane: PaneState,
    which: 1 | 2
  ): React.ReactNode => {
    if (!activeProject) {
      return (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="text-sm font-medium text-gray-400">Select or create a project</p>
          </div>
        </div>
      )
    }

    if (pane.view === 'home' || (!pane.itemId && pane.view !== 'draft')) {
      return (
        <div className="flex-1 overflow-y-auto">
          <ProjectHome
            project={activeProject}
            sources={sources}
            themes={themes}
            passages={passages}
            onAddSource={() => setShowNewSource(true)}
            onAddTheme={() => setShowNewTheme(true)}
            onSelectSource={id => handleSelectSource(id, which)}
            onSelectTheme={id => handleSelectTheme(id, which)}
            onSelectDraft={() => handleSelectDraft(which)}
            onExport={handleExportProject}
          />
        </div>
      )
    }

    if (pane.view === 'source') {
      const source: Source | undefined = which === 1 ? activePane1Source : activePane2Source
      if (!source) return null
      return (
        <SourceViewer
          source={source}
          themes={themes}
          passages={passages.filter(p => p.sourceId === source.id)}
          onCreatePassage={async (text, themeIds) => {
            await createPassage(source.id, text, themeIds)
          }}
          onDeleteSource={id => {
            removeSource(id)
            setPane(which, defaultPane())
          }}
          onCreateTheme={async name => {
            const t = await createTheme(name)
            return t as Theme | undefined
          }}
        />
      )
    }

    if (pane.view === 'theme') {
      const theme: Theme | undefined = which === 1 ? activePane1Theme : activePane2Theme
      if (!theme) return null
      return (
        <ThemeBucket
          theme={theme}
          passages={getPassagesForTheme(theme.id)}
          sources={sources}
          onUpdatePassage={async (id, updates) => { await updatePassage(id, updates) }}
          onRemovePassage={async id => { await removePassage(id) }}
          onDeleteTheme={id => {
            removeTheme(id)
            setPane(which, defaultPane())
          }}
          onUpdateTheme={async (id, updates) => { await updateTheme(id, updates) }}
        />
      )
    }

    if (pane.view === 'draft') {
      return (
        <DraftEditor
          draft={pane.draft}
          projectId={activeProjectId!}
          themes={themes}
          passages={passages}
          sources={sources}
          onDraftSaved={async () => {
            const draft = await getDraft(activeProjectId!)
            setPane(which, { draft })
          }}
        />
      )
    }

    return null
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <Sidebar
        projects={projects}
        activeProjectId={activeProjectId}
        sources={sources}
        themes={themes}
        activeView={pane1.view}
        activeItemId={pane1.itemId}
        onSelectProject={handleSelectProject}
        onCreateProject={handleCreateProject}
        onSelectSource={id => handleSelectSource(id, 1)}
        onSelectTheme={id => handleSelectTheme(id, 1)}
        onSelectDraft={() => handleSelectDraft(1)}
        onDeleteProject={removeProject}
      />

      {/* Main content area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        {activeProject && (
          <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-100 flex-shrink-0">
            <div className="flex items-center gap-2 text-sm text-gray-500 min-w-0">
              {pane1.view !== 'home' && (
                <button
                  onClick={() => { setPane1(defaultPane()); setSplitMode(false) }}
                  className="hover:text-gray-700 transition-colors"
                >
                  {activeProject.name}
                </button>
              )}
              {pane1.view !== 'home' && <span>›</span>}
              {pane1.view === 'source' && activePane1Source && (
                <span className="font-medium text-gray-700 truncate">{activePane1Source.title}</span>
              )}
              {pane1.view === 'theme' && activePane1Theme && (
                <span className="font-medium text-gray-700 truncate">{activePane1Theme.name}</span>
              )}
              {pane1.view === 'draft' && <span className="font-medium text-gray-700">Draft</span>}
              {pane1.view === 'home' && <span className="font-medium text-gray-700">{activeProject.name}</span>}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleImportProject}
                className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
              >
                Import
              </button>
              <button
                onClick={() => setSplitMode(v => !v)}
                title={splitMode ? 'Exit split view' : 'Enter split view'}
                className={`p-1.5 rounded transition-colors ${
                  splitMode ? 'text-indigo-600 bg-indigo-50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v14a2 2 0 002 2h4M9 3v18M9 3h10a2 2 0 012 2v14a2 2 0 01-2 2H9" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {splitMode && activeProject ? (
            <SplitView
              onClose={() => setSplitMode(false)}
              left={
                <div className="flex flex-col h-full overflow-hidden">
                  <div className="flex gap-1 p-2 bg-gray-50 border-b border-gray-100 flex-shrink-0 overflow-x-auto">
                    <PanePicker label="Overview" active={pane1.view === 'home'} onClick={() => setPane1(defaultPane())} />
                    {sources.map(s => (
                      <PanePicker key={s.id} label={s.title} active={pane1.view === 'source' && pane1.itemId === s.id} onClick={() => handleSelectSource(s.id, 1)} />
                    ))}
                    {themes.map(t => (
                      <PanePicker key={t.id} label={t.name} active={pane1.view === 'theme' && pane1.itemId === t.id} onClick={() => handleSelectTheme(t.id, 1)} color={t.color} />
                    ))}
                    <PanePicker label="Draft" active={pane1.view === 'draft'} onClick={() => handleSelectDraft(1)} />
                  </div>
                  <div className="flex-1 overflow-hidden flex flex-col">{renderPaneContent(pane1, 1)}</div>
                </div>
              }
              right={
                <div className="flex flex-col h-full overflow-hidden">
                  <div className="flex gap-1 p-2 bg-gray-50 border-b border-gray-100 flex-shrink-0 overflow-x-auto">
                    <PanePicker label="Overview" active={pane2.view === 'home'} onClick={() => setPane2(defaultPane())} />
                    {sources.map(s => (
                      <PanePicker key={s.id} label={s.title} active={pane2.view === 'source' && pane2.itemId === s.id} onClick={() => handleSelectSource(s.id, 2)} />
                    ))}
                    {themes.map(t => (
                      <PanePicker key={t.id} label={t.name} active={pane2.view === 'theme' && pane2.itemId === t.id} onClick={() => handleSelectTheme(t.id, 2)} color={t.color} />
                    ))}
                    <PanePicker label="Draft" active={pane2.view === 'draft'} onClick={() => handleSelectDraft(2)} />
                  </div>
                  <div className="flex-1 overflow-hidden flex flex-col">{renderPaneContent(pane2, 2)}</div>
                </div>
              }
            />
          ) : (
            <div className="flex flex-col h-full overflow-hidden">
              {renderPaneContent(pane1, 1)}
            </div>
          )}
        </div>
      </main>

      {/* New Source Modal */}
      {showNewSource && (
        <NewSourceModal
          onClose={() => setShowNewSource(false)}
          onSave={async (title, content, type, url) => {
            const source = await createSource(title, content, type, url)
            if (source) handleSelectSource(source.id, 1)
            setShowNewSource(false)
          }}
        />
      )}

      {/* New Theme Quick Modal */}
      {showNewTheme && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowNewTheme(false)}>
          <div
            className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold text-gray-900 mb-4">New theme</h2>
            <input
              type="text"
              autoFocus
              value={newThemeName}
              onChange={e => setNewThemeName(e.target.value)}
              placeholder="Theme name"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
              onKeyDown={async e => {
                if (e.key === 'Enter' && newThemeName.trim()) {
                  const theme = await createTheme(newThemeName.trim())
                  if (theme) handleSelectTheme(theme.id, 1)
                  setNewThemeName('')
                  setShowNewTheme(false)
                }
                if (e.key === 'Escape') setShowNewTheme(false)
              }}
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowNewTheme(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!newThemeName.trim()) return
                  const theme = await createTheme(newThemeName.trim())
                  if (theme) handleSelectTheme(theme.id, 1)
                  setNewThemeName('')
                  setShowNewTheme(false)
                }}
                disabled={!newThemeName.trim()}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                Create theme
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PanePicker({ label, active, onClick, color }: {
  label: string; active: boolean; onClick: () => void; color?: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors ${
        active ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-white hover:text-gray-700'
      }`}
    >
      {color && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />}
      {label}
    </button>
  )
}
