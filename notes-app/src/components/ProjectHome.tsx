import type { Project, Source, Theme, Passage } from '../db/types'

interface ProjectHomeProps {
  project: Project
  sources: Source[]
  themes: Theme[]
  passages: Passage[]
  onAddSource: () => void
  onAddTheme: () => void
  onSelectSource: (id: string) => void
  onSelectTheme: (id: string) => void
  onSelectDraft: () => void
  onExport: () => void
}

export default function ProjectHome({
  project,
  sources,
  themes,
  passages,
  onAddSource,
  onAddTheme,
  onSelectSource,
  onSelectTheme,
  onSelectDraft,
  onExport,
}: ProjectHomeProps) {
  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">{project.name}</h2>
        {project.description && (
          <p className="text-gray-500 dark:text-gray-400">{project.description}</p>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Sources"
          count={sources.length}
          icon={
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          }
          onClick={onAddSource}
          actionLabel="Add source"
        />
        <StatCard
          label="Themes"
          count={themes.length}
          icon={
            <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          }
          onClick={onAddTheme}
          actionLabel="Add theme"
        />
        <StatCard
          label="Passages"
          count={passages.length}
          icon={
            <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          }
        />
      </div>

      {/* Sections */}
      <div className="space-y-6">
        {/* Sources list */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Sources</h3>
            <button
              onClick={onAddSource}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
            >
              + Add source
            </button>
          </div>

          {sources.length === 0 ? (
            <EmptyState
              message="No sources yet. Add your first source to start researching."
              action="Add source"
              onAction={onAddSource}
            />
          ) : (
            <div className="space-y-2">
              {sources.map(source => (
                <button
                  key={source.id}
                  className="w-full text-left p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-indigo-200 dark:hover:border-indigo-500 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/20 transition-colors group"
                  onClick={() => onSelectSource(source.id)}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-xs uppercase font-medium px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 flex-shrink-0 mt-0.5">
                      {source.type}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-indigo-700 dark:group-hover:text-indigo-400">
                        {source.title}
                      </p>
                      {source.content && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-1">
                          {source.content.slice(0, 100)}
                        </p>
                      )}
                    </div>
                    <span className="ml-auto text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                      {passages.filter(p => p.sourceId === source.id).length} passages
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Themes list */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Themes</h3>
            <button
              onClick={onAddTheme}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
            >
              + Add theme
            </button>
          </div>

          {themes.length === 0 ? (
            <EmptyState
              message="No themes yet. Themes help you group related passages from different sources."
              action="Add theme"
              onAction={onAddTheme}
            />
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {themes.map(theme => (
                <button
                  key={theme.id}
                  className="text-left p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-indigo-200 dark:hover:border-indigo-500 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/20 transition-colors"
                  onClick={() => onSelectTheme(theme.id)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: theme.color }} />
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{theme.name}</span>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {passages.filter(p => p.themeIds.includes(theme.id)).length} passages
                  </p>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Quick actions */}
        <section className="pt-2 border-t border-gray-100 dark:border-gray-700 flex gap-3">
          <button
            onClick={onSelectDraft}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Open Draft
          </button>
          <button
            onClick={onExport}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export Project
          </button>
        </section>
      </div>
    </div>
  )
}

function StatCard({
  label, count, icon, onClick, actionLabel,
}: {
  label: string
  count: number
  icon: React.ReactNode
  onClick?: () => void
  actionLabel?: string
}) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{count}</p>
      {onClick && actionLabel && (
        <button
          onClick={onClick}
          className="mt-2 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
        >
          {actionLabel} →
        </button>
      )}
    </div>
  )
}

function EmptyState({ message, action, onAction }: {
  message: string
  action: string
  onAction: () => void
}) {
  return (
    <div className="text-center py-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
      <p className="text-sm text-gray-400 dark:text-gray-500 mb-2">{message}</p>
      <button
        onClick={onAction}
        className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
      >
        {action}
      </button>
    </div>
  )
}
