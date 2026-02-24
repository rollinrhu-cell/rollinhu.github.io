import { useRef, useState, useCallback } from 'react'

interface SplitViewProps {
  left: React.ReactNode
  right: React.ReactNode
  onClose: () => void
}

export default function SplitView({ left, right, onClose }: SplitViewProps) {
  const [leftWidth, setLeftWidth] = useState(50) // percentage
  const isDragging = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDragging.current = true

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const pct = (x / rect.width) * 100
      setLeftWidth(Math.min(Math.max(pct, 20), 80))
    }

    const handleMouseUp = () => {
      isDragging.current = false
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [])

  return (
    <div className="flex flex-col h-full">
      {/* Split view header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200 flex-shrink-0">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Split View</span>
        <button
          onClick={onClose}
          className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Exit split view
        </button>
      </div>

      {/* Panes */}
      <div ref={containerRef} className="flex flex-1 overflow-hidden">
        {/* Left pane */}
        <div className="overflow-hidden flex flex-col" style={{ width: `${leftWidth}%` }}>
          {left}
        </div>

        {/* Drag divider */}
        <div
          className="w-1 bg-gray-200 hover:bg-indigo-400 cursor-col-resize flex-shrink-0 transition-colors active:bg-indigo-500"
          onMouseDown={handleMouseDown}
        />

        {/* Right pane */}
        <div className="overflow-hidden flex flex-col flex-1">
          {right}
        </div>
      </div>
    </div>
  )
}
