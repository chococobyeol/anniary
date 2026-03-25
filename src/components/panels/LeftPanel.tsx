import { useBoardStore } from '../../store/board-store'
import { BacklogPanel } from './BacklogPanel'
import { DetailPanel } from './DetailPanel'
import { FilterPanel } from './FilterPanel'
import { TagsPanel } from './TagsPanel'
import { SearchPanel } from './SearchPanel'
import { OverlaysPanel } from './OverlaysPanel'
import './LeftPanel.css'

export function LeftPanel() {
  const leftOpen = useBoardStore(s => s.panel.leftOpen)
  const leftMode = useBoardStore(s => s.panel.leftMode)

  if (!leftOpen) return null

  return (
    <div className="left-panel">
      <div className="left-panel-header">
        <span className="left-panel-title">
          {leftMode === 'tags' ? 'Tags' : leftMode}
        </span>
      </div>
      <div className="left-panel-content">
        {leftMode === 'backlog' && <BacklogPanel />}
        {leftMode === 'detail' && <DetailPanel />}
        {leftMode === 'search' && <SearchPanel />}
        {leftMode === 'filter' && <FilterPanel />}
        {leftMode === 'tags' && <TagsPanel />}
        {leftMode === 'overlays' && <OverlaysPanel />}
      </div>
    </div>
  )
}
