import { useRef } from 'react'
import { useBoardStore } from '../../store/board-store'
import type { AppSettings, BoardState, DayLayout, DrawStrokeWeight } from '../../types/state'

function normImportedDrawWeight(w: unknown, fallback: DrawStrokeWeight): DrawStrokeWeight {
  return w === 'thin' || w === 'medium' || w === 'thick' ? w : fallback
}
import { normalizeBoardViewFilter } from '../../utils/boardViewFilter'
import { HelpTip } from './detail/HelpTip'
import './SettingsPanel.css'

const COPY_NEWLINE_BUTTON_HELP =
  'Adds ↵ next to backlog and markdown fields to insert a line break—useful when Shift+Enter is hard on touch keyboards.'

const COPY_PLACE_MEMO_SIZE_HELP =
  'Default width/height for memos created with Place (board units). Memos already on the board: edit size in the left detail panel.'

const COPY_DATA_BACKUP_HELP =
  'JSON backup includes boards (items, ranges, overlays, drawings, assets), settings, zoom/pan, panels, tool mode, and selection. Data syncs to this browser automatically. Undo history is not stored in the file.'

const COPY_DATA_RESET_HELP =
  'Deletes all data in this browser and clears undo. Use Export JSON first if you need a copy.'

/** 로컬 날짜·시간(파일명에 `:` 미사용) */
function formatBackupJsonFilename(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `anniary-backup-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}.json`
}

export function SettingsPanel() {
  const settings = useBoardStore(s => s.settings)
  const updateSettings = useBoardStore(s => s.updateSettings)
  const importBoardsAndSettings = useBoardStore(s => s.importBoardsAndSettings)
  const resetAllData = useBoardStore(s => s.resetAllData)
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <div className="settings-panel">
      <div className="settings-section">
        <div className="settings-section-title">Layout</div>

        <div className="settings-row">
          <div className="settings-label-col">
            <span className="settings-label">Day display</span>
          </div>
          <div className="settings-control">
            <select
              className="settings-input"
              value={settings.dayLayout}
              onChange={e => updateSettings({ dayLayout: e.target.value as DayLayout })}
            >
              <option value="linear">Cell inline (sequence)</option>
              <option value="weekday-aligned">Top header (weekday aligned)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">Zoom</div>

        <div className="settings-row">
          <div className="settings-label-col">
            <span className="settings-label">Zoom direction inverted</span>
          </div>
          <div className="settings-control settings-control--toggle">
            <span className="settings-hint-inline">
              {settings.zoomInverted ? 'down=zoom out' : 'down=zoom in'}
            </span>
            <button
              type="button"
              className={`settings-toggle ${settings.zoomInverted ? 'active' : ''}`}
              onClick={() => updateSettings({ zoomInverted: !settings.zoomInverted })}
              role="switch"
              aria-checked={settings.zoomInverted}
            >
              <span className="settings-toggle-thumb" />
            </button>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">Backlog</div>

        <div className="settings-row">
          <div className="settings-label-col">
            <span className="settings-label">Display count</span>
            <span className="settings-hint-sub">Based on last updated (updatedAt).</span>
          </div>
          <div className="settings-control">
            <select
              className="settings-input"
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
          </div>
        </div>

        <div className="settings-row">
          <div className="settings-label-col">
            <span className="settings-label settings-label--with-help">
              Newline insert button
              <HelpTip text={COPY_NEWLINE_BUTTON_HELP} />
            </span>
          </div>
          <div className="settings-control settings-control--toggle">
            <span className="settings-hint-inline">
              {settings.showNewlineInsertButton ? '↵ next to fields' : 'Off'}
            </span>
            <button
              type="button"
              className={`settings-toggle ${settings.showNewlineInsertButton ? 'active' : ''}`}
              onClick={() =>
                updateSettings({ showNewlineInsertButton: !settings.showNewlineInsertButton })
              }
              role="switch"
              aria-checked={settings.showNewlineInsertButton}
            >
              <span className="settings-toggle-thumb" />
            </button>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-heading">
          <span className="settings-section-title">Place — default memo size</span>
          <HelpTip text={COPY_PLACE_MEMO_SIZE_HELP} />
        </div>
        <div className="settings-row">
          <div className="settings-label-col">
            <span className="settings-label">Width</span>
          </div>
          <div className="settings-control">
            <input
              type="number"
              className="settings-input"
              min={12}
              max={120}
              value={settings.placeMemoWidth}
              onChange={e =>
                updateSettings({
                  placeMemoWidth: Math.min(120, Math.max(12, Number(e.target.value) || 12)),
                })
              }
            />
          </div>
        </div>
        <div className="settings-row">
          <div className="settings-label-col">
            <span className="settings-label">Height</span>
          </div>
          <div className="settings-control">
            <input
              type="number"
              className="settings-input"
              min={8}
              max={80}
              value={settings.placeMemoHeight}
              onChange={e =>
                updateSettings({
                  placeMemoHeight: Math.min(80, Math.max(8, Number(e.target.value) || 8)),
                })
              }
            />
          </div>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-heading">
          <span className="settings-section-title">Data</span>
          <HelpTip text={COPY_DATA_BACKUP_HELP} />
        </div>
        <div className="settings-row">
          <div className="settings-label-col">
            <span className="settings-label">Backup</span>
            <span className="settings-hint-sub">JSON export / import</span>
          </div>
          <div className="settings-control">
            <div className="settings-btn-pair">
              <button
                type="button"
                className="settings-btn"
                onClick={() => {
                  const s = useBoardStore.getState()
                  const payload = {
                    anniaryExportVersion: 2,
                    exportedAt: new Date().toISOString(),
                    boards: s.boards,
                    activeBoardId: s.activeBoardId,
                    settings: s.settings,
                    view: s.view,
                    panel: s.panel,
                    interactionMode: s.interactionMode,
                    selection: s.selection,
                    lastTouchedItemId: s.lastTouchedItemId,
                    rangeEditPreview: s.rangeEditPreview,
                    dirty: s.dirty,
                  }
                  const blob = new Blob([JSON.stringify(payload, null, 2)], {
                    type: 'application/json',
                  })
                  const a = document.createElement('a')
                  a.href = URL.createObjectURL(blob)
                  a.download = formatBackupJsonFilename()
                  a.click()
                  URL.revokeObjectURL(a.href)
                }}
              >
                Export
              </button>
              <button type="button" className="settings-btn" onClick={() => fileRef.current?.click()}>
                Import
              </button>
            </div>
          </div>
        </div>
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
                anniaryExportVersion?: number
                boards?: Record<string, BoardState>
                activeBoardId?: string | null
                settings?: typeof settings
                view?: unknown
                panel?: unknown
                interactionMode?: unknown
                selection?: unknown
                lastTouchedItemId?: string | null
                rangeEditPreview?: unknown
                dirty?: boolean
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
                        const cf = data.settings.drawShapeFillColor
                        if (cf === 'transparent' || cf === 'none') return cf
                        if (typeof cf === 'string' && cf.startsWith('#')) return cf
                        return cur.settings.drawShapeFillColor
                      })(),
                      drawShapeStrokeWeight: normImportedDrawWeight(
                        data.settings.drawShapeStrokeWeight,
                        cur.settings.drawShapeStrokeWeight
                      ),
                    }
                  : cur.settings
              importBoardsAndSettings(data.boards, data.activeBoardId ?? null, nextSettings, {
                view: data.view,
                panel: data.panel,
                interactionMode: data.interactionMode,
                selection: data.selection,
                lastTouchedItemId: data.lastTouchedItemId ?? null,
                rangeEditPreview: data.rangeEditPreview,
                dirty: data.dirty,
              })
            } catch (err) {
              window.alert(`Import failed: ${err instanceof Error ? err.message : String(err)}`)
            }
          }}
        />
        <div className="settings-row">
          <div className="settings-label-col">
            <span className="settings-label settings-label--with-help">
              Reset
              <HelpTip text={COPY_DATA_RESET_HELP} />
            </span>
          </div>
          <div className="settings-control">
            <button
              type="button"
              className="settings-btn settings-btn-danger"
              onClick={() => {
                if (
                  !window.confirm(
                    'Delete ALL data in this browser for Anniary? This cannot be undone unless you have a JSON backup.',
                  )
                ) {
                  return
                }
                if (
                  !window.confirm(
                    'Final confirmation: everything will be removed and the app will start fresh.',
                  )
                ) {
                  return
                }
                resetAllData()
              }}
            >
              Erase all
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
