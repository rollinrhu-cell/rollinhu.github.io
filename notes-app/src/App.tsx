import { useState, useCallback, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import ProjectHome from './components/ProjectHome'
import SourceViewer from './components/SourceViewer'
import ThemeBucket from './components/ThemeBucket'
import DraftEditor from './components/DraftEditor'
import SplitView from './components/SplitView'
import NewSourceModal from './components/NewSourceModal'
import SearchPanel from './components/SearchPanel'
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
  const { projects, createProject, removeProject, refresh: refreshProjects } = useProjects()
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [showNewSource, setShowNewSource] = useState(false)
  const [showNewTheme, setShowNewTheme] = useState(false)
  const [newThemeName, setNewThemeName] = useState('')
  const [splitMode, setSplitMode] = useState(false)
  const [pane1, setPane1] = useState<PaneState>(defaultPane())
  const [pane2, setPane2] = useState<PaneState>(defaultPane())
  const [sidebarHidden, setSidebarHidden] = useState(false)
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true')
  const [showSearch, setShowSearch] = useState(false)
  const [projectOrder, setProjectOrder] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('project-order') || '[]') } catch { return [] }
  })

  useEffect(() => {
    localStorage.setItem('darkMode', String(darkMode))
  }, [darkMode])

  const { sources, createSource, removeSource } = useSources(activeProjectId)
  const { themes, createTheme, updateTheme, removeTheme } = useThemes(activeProjectId)
  const { passages, createPassage, updatePassage, removePassage, getPassagesForTheme } = usePassages(activeProjectId)

  const sortedProjects = [...projects].sort((a, b) => {
    const ai = projectOrder.indexOf(a.id)
    const bi = projectOrder.indexOf(b.id)
    if (ai === -1 && bi === -1) return b.createdAt - a.createdAt
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })

  const handleReorderProjects = useCallback((newOrder: string[]) => {
    setProjectOrder(newOrder)
    localStorage.setItem('project-order', JSON.stringify(newOrder))
  }, [])

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
        if (!data.project || !Array.isArray(data.sources)) {
          alert('Invalid project file.')
          return
        }
        await importProject(data)
        await refreshProjects()
        setActiveProjectId(data.project.id)
        setPane1(defaultPane())
        alert(`Project "${data.project.name}" imported successfully!`)
      } catch {
        alert('Failed to import project. Make sure it is a valid project JSON file.')
      }
    }
    input.click()
  }

  const handleDeleteProject = useCallback(async (id: string) => {
    await removeProject(id)
    if (id === activeProjectId) {
      setActiveProjectId(null)
      setPane1(defaultPane())
      setSplitMode(false)
    }
  }, [removeProject, activeProjectId])

  const activePane1Source = sources.find(s => s.id === pane1.itemId)
  const activePane1Theme = themes.find(t => t.id === pane1.itemId)
  const activePane2Source = sources.find(s => s.id === pane2.itemId)
  const activePane2Theme = themes.find(t => t.id === pane2.itemId)

  const activeProject = projects.find(p => p.id === activeProjectId)

  const renderPaneContent = (pane: PaneState, which: 1 | 2): React.ReactNode => {
    if (!activeProject) {
      return (
        <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-500">
          <div className="text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-200 dark:text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="text-sm font-medium text-gray-400 dark:text-gray-500">Select or create a project</p>
            <button
              onClick={handleImportProject}
              className="mt-3 text-sm text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              or import an existing project
            </button>
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
          onCreatePassage={async (text, themeIds) => { await createPassage(source.id, text, themeIds) }}
          onDeleteSource={id => { removeSource(id); setPane(which, defaultPane()) }}
          onCreateTheme={async name => { const t = await createTheme(name); return t as Theme | undefined }}
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
          onDeleteTheme={id => { removeTheme(id); setPane(which, defaultPane()) }}
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
    <div className={`flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950 ${darkMode ? 'dark' : ''}`}>
      {/* Sidebar */}
      <div className={`flex-shrink-0 transition-all duration-200 overflow-hidden ${sidebarHidden ? 'w-0' : ''}`}>
        <Sidebar
          projects={sortedProjects}
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
          onDeleteProject={handleDeleteProject}
          onToggleSidebar={() => setSidebarHidden(v => !v)}
          onReorderProjects={handleReorderProjects}
          onCreateSource={() => setShowNewSource(true)}
          onCreateTheme={() => setShowNewTheme(true)}
          onImport={handleImportProject}
        />
      </div>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top bar — always visible */}
        <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 min-w-0">
            {sidebarHidden && (
              <button
                onClick={() => setSidebarHidden(false)}
                className="mr-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
                title="Show sidebar"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>
            )}
            {activeProject && pane1.view !== 'home' && (
              <>
                <button
                  onClick={() => { setPane1(defaultPane()); setSplitMode(false) }}
                  className="hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                >
                  {activeProject.name}
                </button>
                <span>›</span>
              </>
            )}
            {pane1.view === 'source' && activePane1Source && (
              <span className="font-medium text-gray-700 dark:text-gray-200 truncate">{activePane1Source.title}</span>
            )}
            {pane1.view === 'theme' && activePane1Theme && (
              <span className="font-medium text-gray-700 dark:text-gray-200 truncate">{activePane1Theme.name}</span>
            )}
            {pane1.view === 'draft' && <span className="font-medium text-gray-700 dark:text-gray-200">Draft</span>}
            {pane1.view === 'home' && activeProject && (
              <span className="font-medium text-gray-700 dark:text-gray-200">{activeProject.name}</span>
            )}
            {!activeProject && <span className="text-gray-400 dark:text-gray-500 text-sm">Research Notes</span>}
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Import — always visible */}
            <button
              onClick={handleImportProject}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Import
            </button>

            {/* Search */}
            {activeProject && (
              <button
                onClick={() => setShowSearch(v => !v)}
                title="Search sources"
                className={`p-1.5 rounded transition-colors ${
                  showSearch
                    ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30'
                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            )}

            {/* Dark mode */}
            <button
              onClick={() => setDarkMode(v => !v)}
              title={darkMode ? 'Light mode' : 'Dark mode'}
              className="p-1.5 rounded text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {darkMode ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            {/* Split view */}
            {activeProject && (
              <button
                onClick={() => setSplitMode(v => !v)}
                title={splitMode ? 'Exit split view' : 'Split view'}
                className={`p-1.5 rounded transition-colors ${
                  splitMode
                    ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30'
                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v14a2 2 0 002 2h4M9 3v18M9 3h10a2 2 0 012 2v14a2 2 0 01-2 2H9" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {splitMode && activeProject ? (
            <SplitView
              onClose={() => setSplitMode(false)}
              left={
                <div className="flex flex-col h-full overflow-hidden">
                  <div className="flex gap-1 p-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex-shrink-0 overflow-x-auto">
                    <PanePicker label="Overview" active={pane1.view === 'home'} onClick={() => setPane1(defaultPane())} />
                    {sources.map(s => <PanePicker key={s.id} label={s.title} active={pane1.view === 'source' && pane1.itemId === s.id} onClick={() => handleSelectSource(s.id, 1)} />)}
                    {themes.map(t => <PanePicker key={t.id} label={t.name} active={pane1.view === 'theme' && pane1.itemId === t.id} onClick={() => handleSelectTheme(t.id, 1)} color={t.color} />)}
                    <PanePicker label="Draft" active={pane1.view === 'draft'} onClick={() => handleSelectDraft(1)} />
                  </div>
                  <div className="flex-1 overflow-hidden flex flex-col">{renderPaneContent(pane1, 1)}</div>
                </div>
              }
              right={
                <div className="flex flex-col h-full overflow-hidden">
                  <div className="flex gap-1 p-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex-shrink-0 overflow-x-auto">
                    <PanePicker label="Overview" active={pane2.view === 'home'} onClick={() => setPane2(defaultPane())} />
                    {sources.map(s => <PanePicker key={s.id} label={s.title} active={pane2.view === 'source' && pane2.itemId === s.id} onClick={() => handleSelectSource(s.id, 2)} />)}
                    {themes.map(t => <PanePicker key={t.id} label={t.name} active={pane2.view === 'theme' && pane2.itemId === t.id} onClick={() => handleSelectTheme(t.id, 2)} color={t.color} />)}
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

      {/* Search Panel overlay */}
      {showSearch && activeProject && (
        <SearchPanel
          sources={sources}
          themes={themes}
          passages={passages}
          onClose={() => setShowSearch(false)}
          onSelectSource={id => { handleSelectSource(id, 1); setShowSearch(false) }}
        />
      )}

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

      {/* New Theme Modal */}
      {showNewTheme && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowNewTheme(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">New theme</h2>
            <input
              type="text"
              autoFocus
              value={newThemeName}
              onChange={e => setNewThemeName(e.target.value)}
              placeholder="Theme name"
              className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
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
              <button onClick={() => setShowNewTheme(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
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
        active
          ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
          : 'text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200'
      }`}
    >
      {color && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />}
      {label}
    </button>
  )
}
