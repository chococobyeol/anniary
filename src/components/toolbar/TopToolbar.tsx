import { useBoardStore } from '../../store/board-store'
import type { InteractionMode } from '../../types/state'
import './TopToolbar.css'

const MODES: { mode: InteractionMode; label: string; icon: string }[] = [
  { mode: 'pan', label: 'Pan', icon: '✋' },
  { mode: 'select', label: 'Select', icon: '⬚' },
  { mode: 'draw', label: 'Draw', icon: '✏' },
  { mode: 'place', label: 'Place', icon: '⭐' },
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
            {m.icon}
          </button>
        ))}
      </div>

      <div className="toolbar-right">
        <button
          className="toolbar-btn"
          onClick={() => toggleRightPanel('settings')}
          title="Settings"
        >
          ⚙
        </button>
      </div>
    </div>
  )
}
