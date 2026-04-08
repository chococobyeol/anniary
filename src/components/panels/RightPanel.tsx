import { useBoardStore } from '../../store/board-store'
import { IconX } from '../icons/Icons'
import { SettingsPanel } from './SettingsPanel'
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
        <button
          type="button"
          className="right-panel-close"
          onClick={() => toggleRightPanel()}
          aria-label="Close panel"
        >
          <IconX size={16} />
        </button>
      </div>
      <div className="right-panel-content">
        {rightMode === 'settings' ? (
          <SettingsPanel />
        ) : (
          <div className="panel-placeholder">{rightMode} panel</div>
        )}
      </div>
    </div>
  )
}
