import { useState, useEffect } from 'react'
import { useBoardStore } from '../../../store/board-store'
import { parseDateKey } from '../../../utils/date'
import type { RangeKind, RangeStatus } from '../../../types/entities'
import { IconTrash } from '../../icons/Icons'
import {
  RANGE_COLORS,
  clampTimelinePriority,
  TIMELINE_PRIORITY_MIN,
  TIMELINE_PRIORITY_MAX,
  COPY_PERIOD_COLOR_TIP,
  COPY_PERIOD_BAR_SECTION_TIP,
  COPY_PERIOD_BAR_HIDE_HINT,
  COPY_DISPLAY_ORDER_HINT,
} from './constants'
import { HelpTip } from './HelpTip'
import '../DetailPanel.css'

/**
 * Rendered with key={rangeId} so it remounts when selection changes.
 * Draft state is initialized from the store on mount — no sync useEffect needed.
 */
export function RangeDetail() {
  const selection = useBoardStore(s => s.selection)
  const boardState = useBoardStore(s => {
    if (!s.activeBoardId) return null
    return s.boards[s.activeBoardId] || null
  })
  const updateRange = useBoardStore(s => s.updateRange)
  const deleteRange = useBoardStore(s => s.deleteRange)
  const updateItem = useBoardStore(s => s.updateItem)
  const setSelection = useBoardStore(s => s.setSelection)
  const setRangeEditPreview = useBoardStore(s => s.setRangeEditPreview)

  const rangeId = selection?.type === 'range' ? selection.rangeId : null
  const range = rangeId && boardState ? boardState.ranges[rangeId] : undefined

  const [draftLabel, setDraftLabel] = useState(() => range?.label || '')
  const [draftBody, setDraftBody] = useState(() => range?.body || '')
  const [draftKind, setDraftKind] = useState<RangeKind>(() => range?.kind || 'period')
  const [draftStatus, setDraftStatus] = useState<RangeStatus>(() => range?.status || 'none')
  const [draftColor, setDraftColor] = useState<string | undefined>(() => range?.color)
  const [draftTimelineBarHidden, setDraftTimelineBarHidden] = useState(() => range?.timelineBarHidden === true)
  const [draftTimelinePriority, setDraftTimelinePriority] = useState(() => range?.timelinePriority ?? 0)

  const currentRangeId = range?.id
  useEffect(() => {
    if (!currentRangeId) {
      setRangeEditPreview(null)
      return
    }
    setRangeEditPreview({
      rangeId: currentRangeId,
      color: draftColor,
      kind: draftKind,
      timelineBarHidden: draftTimelineBarHidden,
      timelinePriority: clampTimelinePriority(draftTimelinePriority),
    })
    return () => setRangeEditPreview(null)
  }, [currentRangeId, draftColor, draftKind, draftTimelineBarHidden, draftTimelinePriority, setRangeEditPreview])

  if (!selection || selection.type !== 'range' || !boardState) return null
  if (!range) return <div className="panel-placeholder">Range not found</div>

  const rangeItems = Object.values(boardState.items).filter(it => it.rangeId === range.id)

  const reloadDraftFromStore = () => {
    const st = useBoardStore.getState()
    const bid = st.activeBoardId
    if (!bid) return
    const r = st.boards[bid]?.ranges[range.id]
    if (!r) return
    setDraftLabel(r.label || '')
    setDraftBody(r.body || '')
    setDraftKind(r.kind)
    setDraftStatus(r.status)
    setDraftColor(r.color)
    setDraftTimelineBarHidden(r.timelineBarHidden === true)
    setDraftTimelinePriority(r.timelinePriority ?? 0)
  }

  const saveDraft = () => {
    const pr = clampTimelinePriority(draftTimelinePriority)
    setDraftTimelinePriority(pr)
    updateRange(range.id, {
      label: draftLabel.trim() || undefined,
      body: draftBody.trim() || undefined,
      kind: draftKind,
      status: draftStatus,
      color: draftColor,
      timelineBarHidden: draftTimelineBarHidden ? true : undefined,
      timelinePriority: pr !== 0 ? pr : undefined,
    })
    setRangeEditPreview(null)
  }

  const cancelDraft = () => {
    reloadDraftFromStore()
    setRangeEditPreview(null)
  }

  const handleDelete = () => {
    setRangeEditPreview(null)
    rangeItems.forEach(it => updateItem(it.id, { rangeId: undefined }))
    deleteRange(range.id)
    setSelection(null)
  }

  const unlinkItem = (itemId: string) => {
    updateItem(itemId, { rangeId: undefined })
  }

  const startP = parseDateKey(range.startDate)
  const endP = parseDateKey(range.endDate)

  return (
    <div className="detail-panel" onKeyDown={e => e.key === 'Escape' && cancelDraft()}>
      <div className="detail-date-header">
        <span className="detail-date-main">Range</span>
        <span className="detail-date-dow" style={{ color: draftColor || 'var(--range-default)' }}>
          {draftKind}
        </span>
      </div>

      <div className="range-period">
        <span className="range-period-label">Period</span>
        <span className="range-period-value">
          {startP.month + 1}/{startP.day} ~ {endP.month + 1}/{endP.day}
        </span>
      </div>

      <div className="range-field">
        <label className="range-field-label">Name</label>
        <input className="detail-edit-title" value={draftLabel} onChange={e => setDraftLabel(e.target.value)} placeholder="Name" />
      </div>

      <div className="range-field">
        <label className="range-field-label">Memo</label>
        <textarea className="detail-edit-body" value={draftBody} onChange={e => setDraftBody(e.target.value)} placeholder="Memo" rows={3} />
      </div>

      <div className="range-field">
        <label className="range-field-label">Kind</label>
        <select className="detail-kind-select range-select" value={draftKind} onChange={e => setDraftKind(e.target.value as RangeKind)}>
          <option value="period">Period</option>
          <option value="note">Note</option>
          <option value="highlight">Highlight</option>
        </select>
      </div>

      <div className="range-field">
        <label className="range-field-label">Status</label>
        <select className="detail-kind-select range-select" value={draftStatus} onChange={e => setDraftStatus(e.target.value as RangeStatus)}>
          <option value="none">None</option>
          <option value="active">Active</option>
          <option value="done">Done</option>
          <option value="delayed">Delayed</option>
        </select>
      </div>

      <div className="range-field">
        <div className="detail-label-row">
          <span className="range-field-label">Color</span>
          <HelpTip text={COPY_PERIOD_COLOR_TIP} />
        </div>
        <div className="range-color-picker">
          {RANGE_COLORS.map(c => (
            <button
              key={c}
              type="button"
              className={`range-color-swatch ${draftColor === c ? 'active' : ''}`}
              style={{ background: c }}
              title={COPY_PERIOD_COLOR_TIP}
              onClick={() => setDraftColor(c)}
            />
          ))}
        </div>
      </div>

      <div className="range-field">
        <div className="detail-label-row">
          <span className="range-field-label">Period bar</span>
          <HelpTip text={COPY_PERIOD_BAR_SECTION_TIP} />
        </div>
        <label className="detail-checkbox-row" title={COPY_PERIOD_BAR_HIDE_HINT}>
          <input
            type="checkbox"
            checked={draftTimelineBarHidden}
            onChange={e => setDraftTimelineBarHidden(e.target.checked)}
          />
          <span>Hide period bar on year board</span>
        </label>
      </div>

      <div className="range-field">
        <div className="detail-label-row">
          <label className="range-field-label" htmlFor={`range-priority-${range.id}`}>Display order</label>
          <HelpTip text={COPY_DISPLAY_ORDER_HINT} />
        </div>
        <input
          id={`range-priority-${range.id}`}
          type="number"
          className="detail-edit-title"
          min={TIMELINE_PRIORITY_MIN}
          max={TIMELINE_PRIORITY_MAX}
          value={draftTimelinePriority}
          onChange={e => setDraftTimelinePriority(Number(e.target.value))}
          title={COPY_DISPLAY_ORDER_HINT}
        />
      </div>

      {rangeItems.length > 0 && (
        <div className="range-field">
          <label className="range-field-label">Items ({rangeItems.length})</label>
          <div className="range-items-list">
            {rangeItems.map(it => (
              <div key={it.id} className="range-item-row">
                <span className="range-item-title">{it.title || '(untitled)'}</span>
                <span className="range-item-kind">{it.kind}</span>
                <button type="button" className="detail-action-btn" onClick={() => unlinkItem(it.id)} title="Unlink">✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="detail-edit-actions detail-edit-actions-item">
        <button type="button" className="detail-save-btn" onClick={saveDraft}>Save</button>
        <button type="button" className="detail-cancel-btn" onClick={cancelDraft}>Cancel</button>
      </div>

      <button type="button" className="range-delete-btn" onClick={handleDelete}>
        <IconTrash size={12} /> Delete range
      </button>
    </div>
  )
}
