import { useRef } from 'react'
import { useBoardStore } from '../../store/board-store'
import type { AppSettings, BoardState, DayLayout, DrawStrokeWeight } from '../../types/state'

function normImportedDrawWeight(w: unknown, fallback: DrawStrokeWeight): DrawStrokeWeight {
  return w === 'thin' || w === 'medium' || w === 'thick' ? w : fallback
}
import { normalizeBoardViewFilter } from '../../utils/boardViewFilter'
import './SettingsPanel.css'

export function SettingsPanel() {
  const settings = useBoardStore(s => s.settings)
  const updateSettings = useBoardStore(s => s.updateSettings)
  const importBoardsAndSettings = useBoardStore(s => s.importBoardsAndSettings)
  const fileRef = useRef<HTMLInputElement>(null)

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

      <div className="settings-section">
        <div className="settings-section-title">Place — 새 메모 기본 크기</div>
        <p className="settings-hint-block">
          Place로 찍는 메모의 기본 너비·높이(보드 좌표). 이미 올린 메모는 디테일에서 개별 조정.
        </p>
        <label className="settings-row">
          <span className="settings-label">너비</span>
          <input
            type="number"
            className="settings-select"
            style={{ maxWidth: 100 }}
            min={12}
            max={120}
            value={settings.placeMemoWidth}
            onChange={e =>
              updateSettings({
                placeMemoWidth: Math.min(120, Math.max(12, Number(e.target.value) || 12)),
              })
            }
          />
        </label>
        <label className="settings-row">
          <span className="settings-label">높이</span>
          <input
            type="number"
            className="settings-select"
            style={{ maxWidth: 100 }}
            min={8}
            max={80}
            value={settings.placeMemoHeight}
            onChange={e =>
              updateSettings({
                placeMemoHeight: Math.min(80, Math.max(8, Number(e.target.value) || 8)),
              })
            }
          />
        </label>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">Data</div>
        <p className="settings-hint-block">
          Full backup (boards + settings). Also synced to browser localStorage automatically.
        </p>
        <div className="settings-row" style={{ flexWrap: 'wrap', gap: 8 }}>
          <button
            type="button"
            className="settings-select"
            style={{ cursor: 'pointer', padding: '6px 10px' }}
            onClick={() => {
              const s = useBoardStore.getState()
              const year = s.activeBoardId
                ? s.boards[s.activeBoardId]?.board.year
                : new Date().getFullYear()
              const payload = {
                anniaryExportVersion: 1,
                exportedAt: new Date().toISOString(),
                boards: s.boards,
                activeBoardId: s.activeBoardId,
                settings: s.settings,
              }
              const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
              const a = document.createElement('a')
              a.href = URL.createObjectURL(blob)
              a.download = `anniary-${year}.json`
              a.click()
              URL.revokeObjectURL(a.href)
            }}
          >
            Export JSON
          </button>
          <button
            type="button"
            className="settings-select"
            style={{ cursor: 'pointer', padding: '6px 10px' }}
            onClick={() => fileRef.current?.click()}
          >
            Import JSON…
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            style={{ display: 'none' }}
            onChange={async e => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (!f) return
              try {
                const text = await f.text()
                const data = JSON.parse(text) as {
                  boards?: Record<string, BoardState>
                  activeBoardId?: string | null
                  settings?: typeof settings
                }
                if (!data.boards || typeof data.boards !== 'object') {
                  window.alert('Invalid file: missing boards')
                  return
                }
                const cur = useBoardStore.getState()
                const nextSettings: AppSettings =
                  data.settings && typeof data.settings === 'object'
                    ? {
                        ...cur.settings,
                        ...data.settings,
                        boardViewFilter: normalizeBoardViewFilter(
                          data.settings.boardViewFilter !== undefined
                            ? {
                                ...normalizeBoardViewFilter(cur.settings.boardViewFilter),
                                ...data.settings.boardViewFilter,
                              }
                            : cur.settings.boardViewFilter
                        ),
                        drawTool: data.settings.drawTool ?? cur.settings.drawTool,
                        placeKind: data.settings.placeKind ?? cur.settings.placeKind,
                        placeStickerChar:
                          data.settings.placeStickerChar?.trim() || cur.settings.placeStickerChar,
                        drawPenColor:
                          data.settings.drawPenColor?.startsWith('#')
                            ? data.settings.drawPenColor
                            : cur.settings.drawPenColor,
                        placeMemoWidth: data.settings.placeMemoWidth ?? cur.settings.placeMemoWidth,
                        placeMemoHeight: data.settings.placeMemoHeight ?? cur.settings.placeMemoHeight,
                        placeMemoPaperColor:
                          data.settings.placeMemoPaperColor?.startsWith('#')
                            ? data.settings.placeMemoPaperColor
                            : cur.settings.placeMemoPaperColor,
                        drawPenWidthWeight: normImportedDrawWeight(
                          data.settings.drawPenWidthWeight,
                          cur.settings.drawPenWidthWeight
                        ),
                        drawHighlighterColor: data.settings.drawHighlighterColor?.startsWith('#')
                          ? data.settings.drawHighlighterColor
                          : cur.settings.drawHighlighterColor,
                        drawHighlighterWidthWeight: normImportedDrawWeight(
                          data.settings.drawHighlighterWidthWeight,
                          cur.settings.drawHighlighterWidthWeight
                        ),
                        drawShapeStrokeColor: data.settings.drawShapeStrokeColor?.startsWith('#')
                          ? data.settings.drawShapeStrokeColor
                          : cur.settings.drawShapeStrokeColor,
                        drawShapeFillColor: (() => {
                          const f = data.settings.drawShapeFillColor
                          if (f === 'transparent' || f === 'none') return f
                          if (typeof f === 'string' && f.startsWith('#')) return f
                          return cur.settings.drawShapeFillColor
                        })(),
                        drawShapeStrokeWeight: normImportedDrawWeight(
                          data.settings.drawShapeStrokeWeight,
                          cur.settings.drawShapeStrokeWeight
                        ),
                      }
                    : cur.settings
                importBoardsAndSettings(data.boards, data.activeBoardId ?? null, nextSettings)
              } catch (err) {
                window.alert(`Import failed: ${err instanceof Error ? err.message : String(err)}`)
              }
            }}
          />
        </div>
      </div>
    </div>
  )
}
