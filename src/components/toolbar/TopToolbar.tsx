import { useCallback } from 'react'
import { useBoardStore } from '../../store/board-store'
import type { InteractionMode } from '../../types/state'
import { fitToScreenRef } from '../../utils/fitToScreen'
import { IconMove, IconCursor, IconPencil, IconPin, IconSettings, IconMaximize } from '../icons/Icons'
import './TopToolbar.css'

const MODES: { mode: InteractionMode; label: string; Icon: typeof IconMove }[] = [
  { mode: 'pan', label: 'Pan', Icon: IconMove },
  { mode: 'select', label: 'Select', Icon: IconCursor },
  { mode: 'draw', label: 'Draw', Icon: IconPencil },
  { mode: 'place', label: 'Place', Icon: IconPin },
]

export function TopToolbar() {
  const interactionMode = useBoardStore(s => s.interactionMode)
  const setInteractionMode = useBoardStore(s => s.setInteractionMode)
  const view = useBoardStore(s => s.view)
  const boardState = useBoardStore(s => {
    const id = s.activeBoardId
    return id ? s.boards[id] : null
  })
  const toggleRightPanel = useBoardStore(s => s.toggleRightPanel)

  const year = boardState?.board.year || new Date().getFullYear()
  const zoomPercent = Math.round(view.scale * 100)

  const handleResetView = useCallback(() => {
    fitToScreenRef.current?.()
  }, [])

  return (
    <div className="top-toolbar">
      <div className="toolbar-left">
        <span className="toolbar-year">{year}</span>
        <span className="toolbar-zoom">{view.zoomLevel} · {zoomPercent}%</span>
      </div>

      <div className="toolbar-center">
        {MODES.map(m => (
          <button
            key={m.mode}
            className={`toolbar-mode-btn ${interactionMode === m.mode ? 'active' : ''}`}
            onClick={() => setInteractionMode(m.mode)}
            title={m.label}
          >
            <m.Icon size={16} />
          </button>
        ))}
        <div className="toolbar-divider" />
        <button
          className="toolbar-mode-btn"
          onClick={handleResetView}
          title="Fit to screen"
        >
          <IconMaximize size={16} />
        </button>
      </div>

      <div className="toolbar-right">
        <button
          className="toolbar-btn"
          onClick={() => toggleRightPanel('settings')}
          title="Settings"
        >
          <IconSettings size={16} />
        </button>
      </div>
    </div>
  )
}
