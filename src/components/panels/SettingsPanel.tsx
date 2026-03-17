import { useBoardStore } from '../../store/board-store'
import type { DayLayout } from '../../types/state'
import './SettingsPanel.css'

export function SettingsPanel() {
  const settings = useBoardStore(s => s.settings)
  const updateSettings = useBoardStore(s => s.updateSettings)

  return (
    <div className="settings-panel">
      <div className="settings-section">
        <div className="settings-section-title">Layout</div>

        <label className="settings-row">
          <span className="settings-label">Day display</span>
          <select
            className="settings-select"
            value={settings.dayLayout}
            onChange={e => updateSettings({ dayLayout: e.target.value as DayLayout })}
          >
            <option value="linear">Cell inline (sequence)</option>
            <option value="weekday-aligned">Top header (weekday aligned)</option>
          </select>
        </label>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">Zoom</div>

        <label className="settings-row">
          <span className="settings-label">Zoom direction inverted</span>
          <div className="settings-toggle-wrap">
            <span className="settings-hint">
              {settings.zoomInverted ? 'down=zoom out' : 'down=zoom in'}
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

      <div className="settings-section">
        <div className="settings-section-title">Backlog</div>

        <label className="settings-row">
          <span className="settings-label">Display count</span>
          <select
            className="settings-select"
            value={settings.backlogDisplayLimit == null ? '' : String(settings.backlogDisplayLimit)}
            onChange={e => {
              const v = e.target.value
              updateSettings({ backlogDisplayLimit: v === '' ? null : Number(v) })
            }}
          >
            <option value="">Show all</option>
            <option value="50">Last 50</option>
            <option value="100">Last 100</option>
            <option value="200">Last 200</option>
          </select>
        </label>
        <p className="settings-hint-block">Based on last updated (updatedAt).</p>
      </div>
    </div>
  )
}
