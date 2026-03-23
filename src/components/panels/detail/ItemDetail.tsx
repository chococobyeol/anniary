import { useState, useMemo, useEffect } from 'react'
import { useBoardStore } from '../../../store/board-store'
import {
  DEFAULT_TAG,
  RANGE_COLORS,
  clampTimelinePriority,
  TIMELINE_PRIORITY_MIN,
  TIMELINE_PRIORITY_MAX,
  COPY_PERIOD_COLOR_TIP,
  COPY_PERIOD_BAR_SECTION_TIP,
  COPY_PERIOD_BAR_HIDE_HINT,
  COPY_DISPLAY_ORDER_HINT,
  COPY_FIRST_PERIOD_SAVE_HINT,
} from './constants'
import { HelpTip } from './HelpTip'
import '../DetailPanel.css'

/**
 * Rendered with key={itemId} so it remounts when selection changes.
 * Draft state is initialized from the store on mount — no sync useEffect needed.
 */
export function ItemDetail() {
  const selection = useBoardStore(s => s.selection)
  const activeBoardId = useBoardStore(s => s.activeBoardId)
  const items = useBoardStore(s => (s.activeBoardId ? s.boards[s.activeBoardId]?.items || {} : {}))
  const ranges = useBoardStore(s => (s.activeBoardId ? s.boards[s.activeBoardId]?.ranges || {} : {}))
  const updateItem = useBoardStore(s => s.updateItem)
  const deleteItem = useBoardStore(s => s.deleteItem)
  const createRange = useBoardStore(s => s.createRange)
  const updateRange = useBoardStore(s => s.updateRange)
  const deleteRange = useBoardStore(s => s.deleteRange)
  const setSelection = useBoardStore(s => s.setSelection)
  const toggleLeftPanel = useBoardStore(s => s.toggleLeftPanel)
  const setRangeEditPreview = useBoardStore(s => s.setRangeEditPreview)

  const item = selection?.type === 'item' ? items[selection.itemId] : undefined
  const linkedRange = item?.rangeId ? ranges[item.rangeId] : undefined

  const [editContent, setEditContent] = useState(() => {
    if (!item) return ''
    const body = item.body ?? ''
    const title = item.title ?? ''
    return title ? (body ? `${title}\n${body}` : title) : body
  })
  const [editTag, setEditTag] = useState(() => (item?.tags?.[0]?.trim()) || DEFAULT_TAG)
  const [editDate, setEditDate] = useState(() => item?.date || '')
  const [editStartTime, setEditStartTime] = useState(() => item?.startTime || '')
  const [editEndTime, setEditEndTime] = useState(() => item?.endTime || '')
  const [editEndDate, setEditEndDate] = useState(() => item?.endDate || linkedRange?.endDate || item?.date || '')
  const [editPeriodColor, setEditPeriodColor] = useState<string | undefined>(() => linkedRange?.color)
  const [editTimelineBarHidden, setEditTimelineBarHidden] = useState(() => linkedRange?.timelineBarHidden === true)
  const [editTimelinePriority, setEditTimelinePriority] = useState(() => linkedRange?.timelinePriority ?? 0)

  const tagsFromItems = useMemo(() => {
    const tagSet = new Set<string>([DEFAULT_TAG])
    Object.values(items).forEach(it => {
      const t = it.tags?.[0]?.trim()
      if (t) tagSet.add(t)
    })
    return [...tagSet].sort((a, b) => (a === DEFAULT_TAG ? -1 : b === DEFAULT_TAG ? 1 : a.localeCompare(b)))
  }, [items])

  const itemRangeId = item?.rangeId
  useEffect(() => {
    if (!itemRangeId) {
      setRangeEditPreview(null)
      return
    }
    setRangeEditPreview({
      rangeId: itemRangeId,
      color: editPeriodColor,
      timelineBarHidden: editTimelineBarHidden,
      timelinePriority: clampTimelinePriority(editTimelinePriority),
      barStartTime: editStartTime.trim(),
      barEndTime: editEndTime.trim(),
    })
    return () => setRangeEditPreview(null)
  }, [itemRangeId, editPeriodColor, editTimelineBarHidden, editTimelinePriority, editStartTime, editEndTime, setRangeEditPreview])

  if (!selection || selection.type !== 'item') return null
  if (!item) {
    return (
      <div className="panel-placeholder">
        Item not found
        <button type="button" className="detail-cancel-btn" onClick={() => setSelection(null)}>Close</button>
      </div>
    )
  }

  const saveEdit = () => {
    if (!activeBoardId) return
    const state = useBoardStore.getState()
    const bs = state.boards[activeBoardId]
    if (!bs) return

    const trimmed = editContent.trim()
    const lines = trimmed.split('\n')
    const firstLine = lines[0] ?? ''
    const startDate = editDate.trim() || undefined
    const endInput = editEndDate.trim()
    const periodEnd =
      startDate && endInput && endInput >= startDate ? endInput : startDate
    const barStart = editStartTime.trim() || undefined
    const barEnd = editEndTime.trim() || undefined
    const pr = clampTimelinePriority(editTimelinePriority)
    setEditTimelinePriority(pr)

    let newRangeId: string | undefined
    if (startDate && periodEnd) {
      const rangeOpts = {
        label: firstLine || undefined,
        color: editPeriodColor,
        timelineBarHidden: editTimelineBarHidden ? true : undefined,
        timelinePriority: pr !== 0 ? pr : undefined,
        barStartTime: barStart,
        barEndTime: barEnd,
      }
      if (item.rangeId && bs.ranges[item.rangeId]) {
        updateRange(item.rangeId, {
          startDate,
          endDate: periodEnd,
          ...rangeOpts,
        })
        newRangeId = item.rangeId
      } else {
        newRangeId = createRange(activeBoardId, 'period', startDate, periodEnd, rangeOpts)
      }
    } else {
      newRangeId = undefined
    }

    const restJoined = lines.length > 1 ? lines.slice(1).join('\n') : ''
    updateItem(item.id, {
      title: firstLine || undefined,
      body: restJoined.trim() ? restJoined : undefined,
      tags: [editTag.trim() || DEFAULT_TAG],
      date: startDate,
      endDate: periodEnd,
      rangeId: newRangeId,
      startTime: barStart,
      endTime: barEnd,
    })

    const oldRid = item.rangeId
    if (oldRid && oldRid !== newRangeId) {
      const othersUse = Object.values(bs.items).some(it => it.id !== item.id && it.rangeId === oldRid)
      if (!othersUse) deleteRange(oldRid)
    }

    setRangeEditPreview(null)
    setSelection(null)
    toggleLeftPanel('backlog')
  }

  const cancelEdit = () => {
    setRangeEditPreview(null)
    setSelection(null)
    toggleLeftPanel('backlog')
  }

  const handleDelete = () => {
    setRangeEditPreview(null)
    deleteItem(item.id)
    setSelection(null)
    toggleLeftPanel('backlog')
  }

  const formatTime = (start?: string, end?: string) => {
    if (!start && !end) return null
    if (start && end) return `${start} ~ ${end}`
    return start || end
  }

  const headerTitle = editContent.trim().split('\n')[0] || '(untitled)'
  const draftEndForHeader = editEndDate.trim()
  const headerEndDate =
    draftEndForHeader && draftEndForHeader !== editDate.trim()
      ? draftEndForHeader
      : undefined
  const draftHasPeriod = Boolean(
    editDate.trim() && (!editEndDate.trim() || editEndDate >= editDate)
  )
  const periodAccentColor = draftHasPeriod ? (editPeriodColor ?? linkedRange?.color) : undefined
  const showTimelineFields = Boolean(editDate.trim())

  return (
    <div className="detail-panel">
      <div
        className="detail-date-header"
        style={periodAccentColor ? { borderLeft: `3px solid ${periodAccentColor}`, paddingLeft: 8, marginLeft: -2 } : undefined}
      >
        <span className="detail-date-main">{headerTitle}</span>
        {editDate.trim() && (
          <span className="detail-date-dow">
            {headerEndDate ? `${editDate.trim()} – ${headerEndDate}` : editDate.trim()}
            {formatTime(editStartTime, editEndTime) && ` · ${formatTime(editStartTime, editEndTime)}`}
          </span>
        )}
      </div>

      <div className="detail-item-edit" onKeyDown={e => e.key === 'Escape' && cancelEdit()}>
        <label className="detail-time-label">Tag</label>
        <select className="detail-kind-select" value={editTag} onChange={e => setEditTag(e.target.value)}>
          {tagsFromItems.map(tag => (
            <option key={tag} value={tag}>{tag}</option>
          ))}
        </select>
        <label className="detail-time-label">Content</label>
        <textarea className="detail-edit-body detail-edit-content-single" value={editContent} onChange={e => setEditContent(e.target.value)} placeholder="Content" rows={4} />
        <label className="detail-time-label">Start date</label>
        <input type="date" className="detail-date-input" value={editDate} onChange={e => setEditDate(e.target.value)} />
        <div className="detail-time-row">
          <label className="detail-time-label">Start time</label>
          <input type="time" className="detail-time-input" value={editStartTime} onChange={e => setEditStartTime(e.target.value)} />
        </div>
        <div className="detail-time-row">
          <label className="detail-time-label">End time</label>
          <input type="time" className="detail-time-input" value={editEndTime} onChange={e => setEditEndTime(e.target.value)} />
        </div>
        <label className="detail-time-label">Period end date</label>
        <input type="date" className="detail-date-input" value={editEndDate} onChange={e => setEditEndDate(e.target.value)} placeholder="Optional" />
        {showTimelineFields && (
          <>
            <div className="range-field">
              <div className="detail-label-row">
                <span className="detail-time-label">Period color</span>
                <HelpTip text={!item.rangeId ? `${COPY_PERIOD_COLOR_TIP} ${COPY_FIRST_PERIOD_SAVE_HINT}` : COPY_PERIOD_COLOR_TIP} />
              </div>
              <div className="range-color-picker">
                {RANGE_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    className={`range-color-swatch ${editPeriodColor === c ? 'active' : ''}`}
                    style={{ background: c }}
                    title={COPY_PERIOD_COLOR_TIP}
                    onClick={() => setEditPeriodColor(c)}
                  />
                ))}
              </div>
            </div>
            <div className="range-field">
              <div className="detail-label-row">
                <span className="detail-time-label">Period bar</span>
                <HelpTip text={COPY_PERIOD_BAR_SECTION_TIP} />
              </div>
              <label className="detail-checkbox-row" title={COPY_PERIOD_BAR_HIDE_HINT}>
                <input
                  type="checkbox"
                  checked={editTimelineBarHidden}
                  onChange={e => setEditTimelineBarHidden(e.target.checked)}
                />
                <span>Hide period bar on year board</span>
              </label>
            </div>
            <div className="range-field">
              <div className="detail-label-row">
                <label className="detail-time-label" htmlFor={`item-priority-${item.id}`}>Display order</label>
                <HelpTip text={COPY_DISPLAY_ORDER_HINT} />
              </div>
              <input
                id={`item-priority-${item.id}`}
                type="number"
                className="detail-edit-title"
                min={TIMELINE_PRIORITY_MIN}
                max={TIMELINE_PRIORITY_MAX}
                value={editTimelinePriority}
                onChange={e => setEditTimelinePriority(Number(e.target.value))}
                title={COPY_DISPLAY_ORDER_HINT}
              />
            </div>
          </>
        )}
        <div className="detail-edit-actions detail-edit-actions-item">
          <button className="detail-save-btn" onClick={saveEdit}>Save</button>
          <button className="detail-cancel-btn" onClick={cancelEdit}>Cancel</button>
          <button className="detail-cancel-btn danger" onClick={handleDelete}>Delete</button>
        </div>
      </div>
    </div>
  )
}
