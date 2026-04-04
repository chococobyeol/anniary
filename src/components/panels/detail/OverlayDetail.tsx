import { useState, useMemo } from 'react'
import { useBoardStore } from '../../../store/board-store'
import type { OverlayEntity } from '../../../types/entities'
import {
  DRAW_PEN_COLOR_PRESETS,
  DRAW_SHAPE_FILL_PRESETS,
  MEMO_PAPER_COLOR_PRESETS,
} from '../../../constants/overlayUi'
import { hexToRgba, weightToHighlighterWidth, weightToPenWidth, weightToShapeStrokeWidth } from '../../../utils/overlayDraw'
import '../DetailPanel.css'

const EMPTY_ITEM_LIST: { id: string; title: string }[] = []

/** `items`가 일시적으로 비어 있을 때 스냅샷이 매번 새 `{}`로 바뀌는 것을 막기 위한 고정 참조 */
const EMPTY_ITEMS: Record<string, never> = {}

function OverlayTextField({ overlay }: { overlay: OverlayEntity }) {
  const [text, setText] = useState(overlay.text ?? '')
  const updateOverlay = useBoardStore(s => s.updateOverlay)
  const emptyBody = !(overlay.text ?? '').trim()
  return (
    <textarea
      className="detail-add-input"
      style={{ minHeight: '4rem', resize: 'vertical' }}
      rows={3}
      autoFocus={emptyBody}
      value={text}
      onChange={e => setText(e.target.value)}
      onBlur={() => updateOverlay(overlay.id, { text })}
    />
  )
}

export function OverlayDetail() {
  const selection = useBoardStore(s => s.selection)
  const lastTouchedItemId = useBoardStore(s => s.lastTouchedItemId)
  const activeBoardId = useBoardStore(s => s.activeBoardId)
  const deleteOverlay = useBoardStore(s => s.deleteOverlay)
  const setSelection = useBoardStore(s => s.setSelection)
  const updateOverlay = useBoardStore(s => s.updateOverlay)

  const boardItems = useBoardStore(s => {
    const id = s.activeBoardId
    if (!id) return undefined
    return s.boards[id]?.items ?? EMPTY_ITEMS
  })

  const itemList = useMemo(() => {
    if (!boardItems) return EMPTY_ITEM_LIST
    return Object.values(boardItems)
      .map(it => ({ id: it.id, title: it.title || '(제목 없음)' }))
      .sort((a, b) => a.title.localeCompare(b.title, 'ko'))
  }, [boardItems])

  const overlayId = selection?.type === 'overlay' ? selection.overlayId : null
  /** 클로저에 overlayId를 두지 않음 — React 19 useSyncExternalStore 스냅샷 안정화 */
  const overlay = useBoardStore(s => {
    const sel = s.selection
    if (sel?.type !== 'overlay') return null
    const bid = s.activeBoardId
    if (!bid) return null
    return s.boards[bid]?.overlays[sel.overlayId] ?? null
  })

  if (!overlayId || !activeBoardId || !overlay) {
    return <div className="panel-placeholder">Overlay not found</div>
  }

  const canText = overlay.type === 'text' || overlay.type === 'sticker'
  const memoLink = overlay.type === 'text' && overlay.role === 'semantic'

  return (
    <div className="detail-panel">
      <div className="detail-date-header">
        <span className="detail-date-main">Overlay</span>
        <span className="detail-date-dow">
          {overlay.type}
          {overlay.drawTool ? ` · ${overlay.drawTool}` : ''}
        </span>
      </div>
      {memoLink && (
        <div className="detail-add-section" style={{ marginBottom: 8 }}>
          <span className="detail-add-label">연결된 일정</span>
          <select
            className="detail-add-input"
            style={{ width: '100%', marginTop: 4, padding: '6px 8px' }}
            value={overlay.linkedItemId ?? ''}
            onChange={e =>
              updateOverlay(overlay.id, {
                linkedItemId: e.target.value || undefined,
              })
            }
          >
            <option value="">없음 (일반 메모)</option>
            {itemList.map(it => (
              <option key={it.id} value={it.id}>
                {it.title}
              </option>
            ))}
          </select>
          {lastTouchedItemId && (
            <button
              type="button"
              className="detail-action-btn"
              style={{ marginTop: 8, width: '100%' }}
              onClick={() =>
                updateOverlay(overlay.id, { linkedItemId: lastTouchedItemId })
              }
            >
              마지막으로 탭한 일정에 연결
            </button>
          )}
          <p className="detail-hint" style={{ marginTop: 6, fontSize: 12, color: 'var(--text-muted)' }}>
            <strong>자동 연결:</strong> 백로그 등에서 일정(item)을 선택한 뒤 Place로 메모를 찍으면 처음부터 그 일정에 묶입니다.
            보드에서 한 줄(제목)로 같이 보입니다.
          </p>
          <span className="detail-add-label" style={{ marginTop: 12 }}>메모 종이 색</span>
          <div className="overlay-memo-swatches">
            {MEMO_PAPER_COLOR_PRESETS.map(c => (
              <button
                key={c}
                type="button"
                className={`overlay-memo-swatch ${(overlay.fillColor || '#ffffff') === c ? 'active' : ''}`}
                style={{ backgroundColor: c }}
                title={c}
                onClick={() => updateOverlay(overlay.id, { fillColor: c })}
              />
            ))}
          </div>
          <span className="detail-add-label" style={{ marginTop: 12 }}>크기 (보드 단위)</span>
          <div className="detail-add-row" style={{ alignItems: 'center', gap: 8 }}>
            <label className="detail-time-row" style={{ flex: 1, margin: 0 }}>
              <span className="detail-time-label">너비</span>
              <input
                key={`mw-${overlay.id}-${overlay.width}`}
                type="number"
                className="detail-add-input"
                min={12}
                max={120}
                step={1}
                defaultValue={Math.round(overlay.width)}
                onBlur={e => {
                  const v = Math.min(120, Math.max(12, Number(e.target.value) || 12))
                  updateOverlay(overlay.id, { width: v })
                }}
              />
            </label>
            <label className="detail-time-row" style={{ flex: 1, margin: 0 }}>
              <span className="detail-time-label">높이</span>
              <input
                key={`mh-${overlay.id}-${overlay.height}`}
                type="number"
                className="detail-add-input"
                min={8}
                max={80}
                step={1}
                defaultValue={Math.round(overlay.height)}
                onBlur={e => {
                  const v = Math.min(80, Math.max(8, Number(e.target.value) || 8))
                  updateOverlay(overlay.id, { height: v })
                }}
              />
            </label>
          </div>
        </div>
      )}
      {overlay.type === 'shape' && (
        <div className="detail-add-section" style={{ marginBottom: 8 }}>
          <span className="detail-add-label">선 색</span>
          <div className="overlay-memo-swatches">
            {DRAW_PEN_COLOR_PRESETS.map(c => {
              const isHi = overlay.drawTool === 'highlighter'
              const active = isHi
                ? overlay.strokeColor === hexToRgba(c, 0.44)
                : overlay.strokeColor === c
              return (
                <button
                  key={c}
                  type="button"
                  className={`overlay-memo-swatch ${active ? 'active' : ''}`}
                  style={{ backgroundColor: c }}
                  title={c}
                  onClick={() =>
                    updateOverlay(overlay.id, {
                      strokeColor: isHi ? hexToRgba(c, 0.44) : c,
                    })
                  }
                />
              )
            })}
          </div>
          <span className="detail-add-label" style={{ marginTop: 12 }}>
            선 굵기
          </span>
          <div className="overlay-stroke-weight-row">
            {(() => {
              const rows = (['thin', 'medium', 'thick'] as const).map(w => ({
                w,
                px:
                  overlay.drawTool === 'highlighter'
                    ? weightToHighlighterWidth(w)
                    : overlay.pathD
                      ? weightToPenWidth(w)
                      : weightToShapeStrokeWidth(w),
              }))
              const cur = overlay.strokeWidthPx ?? rows[1].px
              let closest = rows[1].w
              let bestD = Infinity
              for (const { w, px } of rows) {
                const d = Math.abs(cur - px)
                if (d < bestD) {
                  bestD = d
                  closest = w
                }
              }
              return rows.map(({ w, px }) => (
                <button
                  key={w}
                  type="button"
                  className={`overlay-stroke-weight-btn ${closest === w ? 'active' : ''}`}
                  onClick={() => updateOverlay(overlay.id, { strokeWidthPx: px })}
                >
                  {w === 'thin' ? '가늘게' : w === 'thick' ? '굵게' : '보통'}
                </button>
              ))
            })()}
          </div>
          {!overlay.pathD && (overlay.drawTool === 'rect' || overlay.drawTool === 'ellipse') ? (
            <>
              <span className="detail-add-label" style={{ marginTop: 12 }}>
                채우기
              </span>
              <div className="overlay-memo-swatches">
                {DRAW_SHAPE_FILL_PRESETS.map(c => {
                  const noFill = !overlay.fillColor || overlay.fillColor === 'none'
                  const fillActive =
                    c === 'transparent' ? noFill : overlay.fillColor === c
                  return (
                  <button
                    key={c}
                    type="button"
                    className={`overlay-memo-swatch overlay-memo-swatch--fill ${fillActive ? 'active' : ''} ${c === 'transparent' ? 'overlay-memo-swatch--transparent' : ''}`}
                    style={c === 'transparent' ? undefined : { backgroundColor: c }}
                    title={c === 'transparent' ? '없음' : c}
                    onClick={() =>
                      updateOverlay(overlay.id, {
                        fillColor: c === 'transparent' ? 'none' : c,
                      })
                    }
                  />
                  )
                })}
              </div>
            </>
          ) : null}
        </div>
      )}
      {canText && (
        <div className="detail-add-section">
          <OverlayTextField key={overlay.id} overlay={overlay} />
        </div>
      )}
      <div className="detail-item-actions" style={{ marginTop: 8 }}>
        <button
          type="button"
          className="detail-action-btn"
          style={{ color: 'var(--status-delayed)' }}
          onClick={() => {
            deleteOverlay(overlay.id)
            setSelection(null)
          }}
        >
          Delete
        </button>
      </div>
    </div>
  )
}
