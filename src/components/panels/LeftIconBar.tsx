import { useBoardStore } from '../../store/board-store'
import type { LeftPanelMode } from '../../types/state'
import './LeftIconBar.css'

const ICONS: { mode: LeftPanelMode; icon: string; label: string }[] = [
  { mode: 'backlog', icon: '📋', label: 'Backlog' },
  { mode: 'search', icon: '🔍', label: 'Search' },
  { mode: 'filter', icon: '⚙', label: 'Filter' },
  { mode: 'ranges', icon: '📅', label: 'Ranges' },
  { mode: 'overlays', icon: '⭐', label: 'Overlays' },
  { mode: 'detail', icon: '📄', label: 'Detail' },
]

export function LeftIconBar() {
  const leftOpen = useBoardStore(s => s.panel.leftOpen)
  const leftMode = useBoardStore(s => s.panel.leftMode)
  const toggleLeftPanel = useBoardStore(s => s.toggleLeftPanel)

  return (
    <div className="left-icon-bar">
      {ICONS.map(item => (
        <button
          key={item.mode}
          className={`icon-bar-btn ${leftOpen && leftMode === item.mode ? 'active' : ''}`}
          onClick={() => toggleLeftPanel(item.mode)}
          title={item.label}
        >
          {item.icon}
        </button>
      ))}
    </div>
  )
}
