import { useBoardStore } from '../../store/board-store'
import { BacklogPanel } from './BacklogPanel'
import { DetailPanel } from './DetailPanel'
import './LeftPanel.css'

export function LeftPanel() {
  const leftOpen = useBoardStore(s => s.panel.leftOpen)
  const leftMode = useBoardStore(s => s.panel.leftMode)

  if (!leftOpen) return null

  return (
    <div className="left-panel">
      <div className="left-panel-header">
        <span className="left-panel-title">{leftMode}</span>
      </div>
      <div className="left-panel-content">
        {leftMode === 'backlog' && <BacklogPanel />}
        {leftMode === 'detail' && <DetailPanel />}
        {leftMode === 'search' && <div className="panel-placeholder">Search</div>}
        {leftMode === 'filter' && <div className="panel-placeholder">Filter</div>}
        {leftMode === 'ranges' && <div className="panel-placeholder">Ranges</div>}
        {leftMode === 'overlays' && <div className="panel-placeholder">Overlays</div>}
      </div>
    </div>
  )
}
