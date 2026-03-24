import { useBoardStore } from '../../store/board-store'
import type { LeftPanelMode } from '../../types/state'
import { IconClipboard, IconSearch, IconFilter, IconTag, IconStar, IconFileText } from '../icons/Icons'
import './LeftIconBar.css'

const ICONS: { mode: LeftPanelMode; Icon: typeof IconClipboard; label: string }[] = [
  { mode: 'backlog', Icon: IconClipboard, label: 'Backlog' },
  { mode: 'search', Icon: IconSearch, label: 'Search' },
  { mode: 'filter', Icon: IconFilter, label: 'Filter' },
  { mode: 'tags', Icon: IconTag, label: 'Tags' },
  { mode: 'overlays', Icon: IconStar, label: 'Overlays' },
  { mode: 'detail', Icon: IconFileText, label: 'Detail' },
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
          <item.Icon size={18} />
        </button>
      ))}
    </div>
  )
}
