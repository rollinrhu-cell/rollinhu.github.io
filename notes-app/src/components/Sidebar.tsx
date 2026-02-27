import { useState, useEffect, useRef } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
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
  onToggleSidebar: () => void
  onReorderProjects: (newOrder: string[]) => void
  onCreateSource: () => void
  onCreateTheme: () => void
  onImport: () => void
}

interface ContextMenu {
  x: number
  y: number
  type: 'source' | 'theme'
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
  onToggleSidebar,
  onReorderProjects,
  onCreateSource,
  onCreateTheme,
  onImport,
}: SidebarProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    sources: true,
    themes: true,
  })
  // Any project can be expanded to show its sub-tree
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(() =>
    activeProjectId ? new Set([activeProjectId]) : new Set()
  )
  const [deleteModal, setDeleteModal] = useState<{ id: string; name: string } | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null)
  const [itemOrder, setItemOrder] = useState<string[]>(projects.map(p => p.id))
  const contextMenuRef = useRef<HTMLDivElement>(null)

  // Sync item order when projects list changes from outside (new project added etc.)
  useEffect(() => {
    setItemOrder(prev => {
      const newIds = projects.map(p => p.id)
      const merged = [...prev.filter(id => newIds.includes(id))]
      newIds.forEach(id => { if (!merged.includes(id)) merged.push(id) })
      return merged
    })
  }, [projects])

  // Expand active project automatically
  useEffect(() => {
    if (activeProjectId) {
      setExpandedProjects(prev => new Set([...prev, activeProjectId]))
    }
  }, [activeProjectId])

  // Close context menu on outside click or Escape
  useEffect(() => {
    if (!contextMenu) return
    const handleClick = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null)
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [contextMenu])

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const toggleProject = (id: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    onSelectProject(id)
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = itemOrder.indexOf(active.id as string)
    const newIdx = itemOrder.indexOf(over.id as string)
    const newOrder = arrayMove(itemOrder, oldIdx, newIdx)
    setItemOrder(newOrder)
    onReorderProjects(newOrder)
  }

  const sortedProjects = [...projects].sort((a, b) => {
    const ai = itemOrder.indexOf(a.id)
    const bi = itemOrder.indexOf(b.id)
    if (ai === -1 && bi === -1) return 0
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })

  return (
    <aside className="w-64 min-w-[220px] bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full overflow-hidden">
      {/* App header */}
      <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">Research Notes</h1>
        <button
          onClick={onToggleSidebar}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="Hide sidebar"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Project list */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-3 py-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1">Projects</span>
            <button
              onClick={onCreateProject}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded p-0.5 transition-colors"
              title="New project"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={itemOrder} strategy={verticalListSortingStrategy}>
              {sortedProjects.map(project => (
                <SortableProjectRow
                  key={project.id}
                  project={project}
                  isActive={activeProjectId === project.id}
                  isExpanded={expandedProjects.has(project.id)}
                  sources={activeProjectId === project.id ? sources : []}
                  themes={activeProjectId === project.id ? themes : []}
                  expandedSections={expandedSections}
                  activeView={activeView}
                  activeItemId={activeItemId}
                  onToggle={toggleProject}
                  onDeleteClick={() => setDeleteModal({ id: project.id, name: project.name })}
                  onSelectSource={onSelectSource}
                  onSelectTheme={onSelectTheme}
                  onSelectDraft={onSelectDraft}
                  onToggleSection={toggleSection}
                  onContextMenuSource={(e) => {
                    e.preventDefault()
                    setContextMenu({ x: e.clientX, y: e.clientY, type: 'source' })
                  }}
                  onContextMenuTheme={(e) => {
                    e.preventDefault()
                    setContextMenu({ x: e.clientX, y: e.clientY, type: 'theme' })
                  }}
                />
              ))}
            </SortableContext>
          </DndContext>

          {projects.length === 0 && (
            <div className="text-center py-8 text-gray-400 dark:text-gray-500">
              <p className="text-sm">No projects yet</p>
              <button
                onClick={onCreateProject}
                className="mt-2 text-sm text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                Create your first project
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer: import button */}
      <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-700">
        <button
          onClick={onImport}
          className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Import project
        </button>
      </div>

      {/* Delete confirmation modal */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-sm mx-4"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">Delete project?</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Delete <span className="font-medium">"{deleteModal.name}"</span>? All sources, passages, themes, and the draft will be permanently removed.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleteModal(null)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteProject(deleteModal.id)
                  setDeleteModal(null)
                }}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Right-click context menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 min-w-[140px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {contextMenu.type === 'source' ? (
            <button
              onClick={() => { onCreateSource(); setContextMenu(null) }}
              className="w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Add source
            </button>
          ) : (
            <button
              onClick={() => { onCreateTheme(); setContextMenu(null) }}
              className="w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Add theme
            </button>
          )}
        </div>
      )}
    </aside>
  )
}

// ─── Sortable project row ──────────────────────────────────────────────────

interface SortableProjectRowProps {
  project: Project
  isActive: boolean
  isExpanded: boolean
  sources: Source[]
  themes: Theme[]
  expandedSections: Record<string, boolean>
  activeView: PaneView
  activeItemId: string | null
  onToggle: (id: string) => void
  onDeleteClick: () => void
  onSelectSource: (id: string) => void
  onSelectTheme: (id: string) => void
  onSelectDraft: () => void
  onToggleSection: (section: string) => void
  onContextMenuSource: (e: React.MouseEvent) => void
  onContextMenuTheme: (e: React.MouseEvent) => void
}

function SortableProjectRow({
  project,
  isActive,
  isExpanded,
  sources,
  themes,
  expandedSections,
  activeView,
  activeItemId,
  onToggle,
  onDeleteClick,
  onSelectSource,
  onSelectTheme,
  onSelectDraft,
  onToggleSection,
  onContextMenuSource,
  onContextMenuTheme,
}: SortableProjectRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: project.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  return (
    <div ref={setNodeRef} style={style} className="mb-0.5">
      <div
        className={`group flex items-center justify-between rounded-md px-2 py-1.5 cursor-pointer transition-colors ${
          isActive
            ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
        }`}
        onClick={() => onToggle(project.id)}
      >
        {/* Drag handle */}
        <span
          {...attributes}
          {...listeners}
          className="mr-1 cursor-grab text-gray-300 dark:text-gray-600 hover:text-gray-400 dark:hover:text-gray-500 opacity-0 group-hover:opacity-100 flex-shrink-0"
          onClick={e => e.stopPropagation()}
          title="Drag to reorder"
        >
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="8" cy="6" r="1.5"/><circle cx="16" cy="6" r="1.5"/>
            <circle cx="8" cy="12" r="1.5"/><circle cx="16" cy="12" r="1.5"/>
            <circle cx="8" cy="18" r="1.5"/><circle cx="16" cy="18" r="1.5"/>
          </svg>
        </span>
        {/* Collapse chevron */}
        <svg
          className={`w-3 h-3 flex-shrink-0 mr-1 transition-transform text-gray-400 dark:text-gray-500 ${isExpanded ? 'rotate-90' : ''}`}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M8 5l8 7-8 7V5z" />
        </svg>
        <span className="text-sm font-medium truncate flex-1">{project.name}</span>
        {/* Delete button */}
        <button
          onClick={e => { e.stopPropagation(); onDeleteClick() }}
          className="ml-1 opacity-0 group-hover:opacity-100 rounded p-0.5 text-gray-400 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all flex-shrink-0"
          title="Delete project"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* Project sub-tree (shown when expanded AND this is the active project) */}
      {isExpanded && isActive && (
        <div className="ml-3 border-l border-gray-100 dark:border-gray-700 pl-2 mb-2">
          {/* Sources section */}
          <button
            className="w-full flex items-center gap-1 px-1 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            onClick={() => onToggleSection('sources')}
            onContextMenu={onContextMenuSource}
          >
            <svg className={`w-3 h-3 transition-transform ${expandedSections.sources ? 'rotate-90' : ''}`} fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5l8 7-8 7V5z" />
            </svg>
            <span className="uppercase tracking-wide">Sources</span>
            <span className="ml-auto text-gray-400 dark:text-gray-500 font-normal">{sources.length}</span>
          </button>

          {expandedSections.sources && sources.map(source => (
            <button
              key={source.id}
              className={`w-full flex items-center gap-1.5 px-2 py-1 rounded text-left text-sm transition-colors ${
                activeView === 'source' && activeItemId === source.id
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
              onClick={() => onSelectSource(source.id)}
              onContextMenu={onContextMenuSource}
            >
              <SourceIcon type={source.type} />
              <span className="truncate flex-1">{source.title}</span>
              {source.readAt && (
                <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" title="Read" />
              )}
            </button>
          ))}

          {/* Themes section */}
          <button
            className="w-full flex items-center gap-1 px-1 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors mt-1"
            onClick={() => onToggleSection('themes')}
            onContextMenu={onContextMenuTheme}
          >
            <svg className={`w-3 h-3 transition-transform ${expandedSections.themes ? 'rotate-90' : ''}`} fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5l8 7-8 7V5z" />
            </svg>
            <span className="uppercase tracking-wide">Themes</span>
            <span className="ml-auto text-gray-400 dark:text-gray-500 font-normal">{themes.length}</span>
          </button>

          {expandedSections.themes && themes.map(theme => (
            <button
              key={theme.id}
              className={`w-full flex items-center gap-1.5 px-2 py-1 rounded text-left text-sm transition-colors ${
                activeView === 'theme' && activeItemId === theme.id
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
              onClick={() => onSelectTheme(theme.id)}
              onContextMenu={onContextMenuTheme}
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: theme.color }} />
              <span className="truncate">{theme.name}</span>
            </button>
          ))}

          {/* Draft section */}
          <button
            className={`w-full flex items-center gap-1.5 px-2 py-1 rounded text-left text-sm transition-colors mt-1 ${
              activeView === 'draft'
                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
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
  return (
    <svg className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
    </svg>
  )
}
