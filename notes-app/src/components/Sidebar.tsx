import { useState } from 'react'
import type { Project, Source, Theme } from '../db/types'

type PaneView = 'home' | 'source' | 'theme' | 'draft'

interface SidebarProps {
  projects: Project[]
  activeProjectId: string | null
  sources: Source[]
  themes: Theme[]
  activeView: PaneView
  activeItemId: string | null
  onSelectProject: (id: string) => void
  onCreateProject: () => void
  onSelectSource: (id: string) => void
  onSelectTheme: (id: string) => void
  onSelectDraft: () => void
  onDeleteProject: (id: string) => void
}

export default function Sidebar({
  projects,
  activeProjectId,
  sources,
  themes,
  activeView,
  activeItemId,
  onSelectProject,
  onCreateProject,
  onSelectSource,
  onSelectTheme,
  onSelectDraft,
  onDeleteProject,
}: SidebarProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    sources: true,
    themes: true,
  })
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const handleDeleteProject = (id: string) => {
    if (confirmDelete === id) {
      onDeleteProject(id)
      setConfirmDelete(null)
    } else {
      setConfirmDelete(id)
      setTimeout(() => setConfirmDelete(null), 3000)
    }
  }

  return (
    <aside className="w-64 min-w-[220px] bg-white border-r border-gray-200 flex flex-col h-full overflow-hidden">
      {/* App header */}
      <div className="px-4 py-4 border-b border-gray-100">
        <h1 className="text-base font-semibold text-gray-900">Research Notes</h1>
      </div>

      {/* Project list */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-3 py-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider px-1">Projects</span>
            <button
              onClick={onCreateProject}
              className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded p-0.5 transition-colors"
              title="New project"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          {projects.map(project => (
            <div key={project.id}>
              <div
                className={`group flex items-center justify-between rounded-md px-2 py-1.5 cursor-pointer mb-0.5 transition-colors ${
                  activeProjectId === project.id
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => onSelectProject(project.id)}
              >
                <span className="text-sm font-medium truncate">{project.name}</span>
                <button
                  onClick={e => { e.stopPropagation(); handleDeleteProject(project.id) }}
                  className={`opacity-0 group-hover:opacity-100 ml-1 rounded p-0.5 transition-all ${
                    confirmDelete === project.id
                      ? 'opacity-100 text-red-500 bg-red-50'
                      : 'text-gray-400 hover:text-red-400 hover:bg-red-50'
                  }`}
                  title={confirmDelete === project.id ? 'Click again to confirm' : 'Delete project'}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              {/* Project tree when active */}
              {activeProjectId === project.id && (
                <div className="ml-3 border-l border-gray-100 pl-2 mb-2">
                  {/* Sources section */}
                  <button
                    className="w-full flex items-center gap-1 px-1 py-1 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
                    onClick={() => toggleSection('sources')}
                  >
                    <svg className={`w-3 h-3 transition-transform ${expandedSections.sources ? 'rotate-90' : ''}`} fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5l8 7-8 7V5z" />
                    </svg>
                    <span className="uppercase tracking-wide">Sources</span>
                    <span className="ml-auto text-gray-400 font-normal">{sources.length}</span>
                  </button>

                  {expandedSections.sources && sources.map(source => (
                    <button
                      key={source.id}
                      className={`w-full flex items-center gap-1.5 px-2 py-1 rounded text-left text-sm transition-colors ${
                        activeView === 'source' && activeItemId === source.id
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                      onClick={() => onSelectSource(source.id)}
                    >
                      <SourceIcon type={source.type} />
                      <span className="truncate">{source.title}</span>
                    </button>
                  ))}

                  {/* Themes section */}
                  <button
                    className="w-full flex items-center gap-1 px-1 py-1 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors mt-1"
                    onClick={() => toggleSection('themes')}
                  >
                    <svg className={`w-3 h-3 transition-transform ${expandedSections.themes ? 'rotate-90' : ''}`} fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5l8 7-8 7V5z" />
                    </svg>
                    <span className="uppercase tracking-wide">Themes</span>
                    <span className="ml-auto text-gray-400 font-normal">{themes.length}</span>
                  </button>

                  {expandedSections.themes && themes.map(theme => (
                    <button
                      key={theme.id}
                      className={`w-full flex items-center gap-1.5 px-2 py-1 rounded text-left text-sm transition-colors ${
                        activeView === 'theme' && activeItemId === theme.id
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                      onClick={() => onSelectTheme(theme.id)}
                    >
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: theme.color }} />
                      <span className="truncate">{theme.name}</span>
                    </button>
                  ))}

                  {/* Draft section */}
                  <button
                    className={`w-full flex items-center gap-1.5 px-2 py-1 rounded text-left text-sm transition-colors mt-1 ${
                      activeView === 'draft'
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                    onClick={onSelectDraft}
                  >
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span className="font-medium uppercase text-xs tracking-wide">Draft</span>
                  </button>
                </div>
              )}
            </div>
          ))}

          {projects.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <p className="text-sm">No projects yet</p>
              <button
                onClick={onCreateProject}
                className="mt-2 text-sm text-indigo-500 hover:text-indigo-600"
              >
                Create your first project
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}

function SourceIcon({ type }: { type: string }) {
  if (type === 'url') return (
    <svg className="w-3.5 h-3.5 flex-shrink-0 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  )
  if (type === 'pdf') return (
    <svg className="w-3.5 h-3.5 flex-shrink-0 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
  if (type === 'docx') return (
    <svg className="w-3.5 h-3.5 flex-shrink-0 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
  if (type === 'note') return (
    <svg className="w-3.5 h-3.5 flex-shrink-0 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  )
  // text
  return (
    <svg className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
    </svg>
  )
}
