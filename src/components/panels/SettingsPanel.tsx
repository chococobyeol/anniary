import { useBoardStore } from '../../store/board-store'
import type { DayLayout } from '../../types/state'
import './SettingsPanel.css'

export function SettingsPanel() {
  const settings = useBoardStore(s => s.settings)
  const updateSettings = useBoardStore(s => s.updateSettings)

  return (
    <div className="settings-panel">
      <div className="settings-section">
        <div className="settings-section-title">레이아웃</div>

        <label className="settings-row">
          <span className="settings-label">요일 표시 모드</span>
          <select
            className="settings-select"
            value={settings.dayLayout}
            onChange={e => updateSettings({ dayLayout: e.target.value as DayLayout })}
          >
            <option value="linear">셀 내 요일 (순차 배치)</option>
            <option value="weekday-aligned">상단 헤더 (요일 정렬)</option>
          </select>
        </label>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">줌</div>

        <label className="settings-row">
          <span className="settings-label">줌 방향 반전</span>
          <div className="settings-toggle-wrap">
            <span className="settings-hint">
              {settings.zoomInverted ? '아래=축소' : '아래=확대'}
            </span>
            <button
              className={`settings-toggle ${settings.zoomInverted ? 'active' : ''}`}
              onClick={() => updateSettings({ zoomInverted: !settings.zoomInverted })}
              role="switch"
              aria-checked={settings.zoomInverted}
            >
              <span className="settings-toggle-thumb" />
            </button>
          </div>
        </label>
      </div>
    </div>
  )
}
