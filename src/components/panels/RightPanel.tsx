import { useBoardStore } from '../../store/board-store'
import './RightPanel.css'

export function RightPanel() {
  const rightOpen = useBoardStore(s => s.panel.rightOpen)
  const rightMode = useBoardStore(s => s.panel.rightMode)
  const toggleRightPanel = useBoardStore(s => s.toggleRightPanel)

  if (!rightOpen) return null

  return (
    <div className="right-panel">
      <div className="right-panel-header">
        <span className="right-panel-title">{rightMode}</span>
        <button className="right-panel-close" onClick={() => toggleRightPanel()}>×</button>
      </div>
      <div className="right-panel-content">
        <div className="panel-placeholder">{rightMode} panel</div>
      </div>
    </div>
  )
}
