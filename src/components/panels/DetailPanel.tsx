import { useState, useEffect, useMemo } from 'react'
import { useBoardStore } from '../../store/board-store'
import { parseDateKey, getDayOfWeekLabel, getDayOfWeek } from '../../utils/date'
import type { ItemKind, RangeKind, RangeStatus } from '../../types/entities'
import { IconPlus, IconTrash, IconCheck, IconInfo } from '../icons/Icons'
import './DetailPanel.css'

const RANGE_COLORS = [
  '#1a73e8', '#34a853', '#ea4335', '#fbbc04',
  '#ff6d00', '#ab47bc', '#00acc1', '#8d6e63',
]

/** Year board period bars: higher priority → upper track when overlapping */
const TIMELINE_PRIORITY_MIN = -50
const TIMELINE_PRIORITY_MAX = 50

function clampTimelinePriority(n: number): number {
  const x = Number.isFinite(n) ? Math.round(n) : 0
  return Math.max(TIMELINE_PRIORITY_MIN, Math.min(TIMELINE_PRIORITY_MAX, x))
}

const COPY_PERIOD_BAR_SECTION_TIP =
  'Colored strip under each month row on the year board for this date range.'
const COPY_PERIOD_BAR_HIDE_HINT =
  'Your schedule is unchanged; only that strip is hidden on the year board.'
const COPY_PRIORITY_HINT = `Higher numbers sort first in day cells and use upper tracks when period bars overlap. Range ${TIMELINE_PRIORITY_MIN}–${TIMELINE_PRIORITY_MAX}. Applied when you save.`
const COPY_FIRST_PERIOD_SAVE_HINT =
  'Save once to create the range; then the bar and priority appear on the year board.'
const COPY_PERIOD_COLOR_TIP = 'Bar color on the year board. You can change it before saving; Cancel discards.'

function HelpTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  return (
    <span className="detail-help-tip-wrap">
      <button
        type="button"
        className="detail-help-tip"
        aria-label={text}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        <IconInfo size={14} />
      </button>
      {open ? (
        <span className="detail-help-tooltip" aria-hidden>
          {text}
        </span>
      ) : null}
    </span>
  )
}

function DayDetail() {
  const selection = useBoardStore(s => s.selection)
  const activeBoardId = useBoardStore(s => s.activeBoardId)
  const items = useBoardStore(s => {
    if (!s.activeBoardId) return {}
    return s.boards[s.activeBoardId]?.items || {}
  })
  const createItem = useBoardStore(s => s.createItem)
  const createRange = useBoardStore(s => s.createRange)
  const updateItem = useBoardStore(s => s.updateItem)
  const deleteItem = useBoardStore(s => s.deleteItem)
  const setSelection = useBoardStore(s => s.setSelection)

  const [newTitle, setNewTitle] = useState('')
  const [newKind, setNewKind] = useState<ItemKind>('task')
  const [showAddOptions, setShowAddOptions] = useState(false)
  const [addStartTime, setAddStartTime] = useState('')
  const [addEndTime, setAddEndTime] = useState('')
  const [addEndDate, setAddEndDate] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editBody, setEditBody] = useState('')
  const [editStartTime, setEditStartTime] = useState('')
  const [editEndTime, setEditEndTime] = useState('')

  if (!selection || selection.type !== 'day') return null

  const { year, month, day } = parseDateKey(selection.dateKey)
  const dow = getDayOfWeek(year, month, day)
  const dowLabel = getDayOfWeekLabel(dow)
  const dayItems = Object.values(items).filter(it => it.date === selection.dateKey)

  const handleAdd = () => {
    if (!activeBoardId || !newTitle.trim()) return

    if (addEndDate) {
      const rangeId = createRange(activeBoardId, 'period', selection.dateKey, addEndDate, {
        label: newTitle.trim(),
      })
      createItem(activeBoardId, newKind, {
        title: newTitle.trim(),
        date: selection.dateKey,
        endDate: addEndDate,
        rangeId,
        startTime: addStartTime || undefined,
        endTime: addEndTime || undefined,
      })
      setSelection({ type: 'range', rangeId })
    } else {
      createItem(activeBoardId, newKind, {
        date: selection.dateKey,
        title: newTitle.trim(),
        startTime: addStartTime || undefined,
        endTime: addEndTime || undefined,
      })
    }

    setNewTitle('')
    setAddStartTime('')
    setAddEndTime('')
    setAddEndDate('')
    setShowAddOptions(false)
  }

  const handleAddKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault()
      handleAdd()
    }
  }

  const startEdit = (itemId: string) => {
    const item = items[itemId]
    if (!item) return
    setEditingId(itemId)
    setEditTitle(item.title || '')
    setEditBody(item.body || '')
    setEditStartTime(item.startTime || '')
    setEditEndTime(item.endTime || '')
  }

  const saveEdit = () => {
    if (!editingId) return
    updateItem(editingId, {
      title: editTitle.trim() || undefined,
      body: editBody.trim() || undefined,
      startTime: editStartTime || undefined,
      endTime: editEndTime || undefined,
    })
    setEditingId(null)
  }

  const cancelEdit = () => setEditingId(null)

  const moveToBacklog = (itemId: string) => {
    updateItem(itemId, { date: undefined, endDate: undefined, rangeId: undefined })
  }

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing && !(e.target instanceof HTMLTextAreaElement)) {
      e.preventDefault()
      saveEdit()
    }
    if (e.key === 'Escape') cancelEdit()
  }

  const formatTime = (start?: string, end?: string) => {
    if (!start && !end) return null
    if (start && end) return `${start} ~ ${end}`
    return start || end
  }

  return (
    <div className="detail-panel">
      <div className="detail-date-header">
        <span className="detail-date-main">{month + 1}/{day}</span>
        <span className="detail-date-dow">{dowLabel}</span>
        <span className="detail-date-year">{year}</span>
      </div>

      <div className="detail-add-section">
        <div className="detail-add-row">
          <select className="detail-kind-select" value={newKind} onChange={e => setNewKind(e.target.value as ItemKind)}>
            <option value="task">Task</option>
            <option value="note">Note</option>
            <option value="event">Event</option>
          </select>
          <input
            className="detail-add-input"
            placeholder="Add item..."
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={handleAddKeyDown}
          />
          <button className="detail-add-btn" onClick={handleAdd} title="Add">
            <IconPlus size={14} />
          </button>
        </div>
        {!showAddOptions && (
          <button className="detail-toggle-options" onClick={() => setShowAddOptions(true)}>
            + Time / period
          </button>
        )}
        {showAddOptions && (
          <div className="detail-add-options">
            <div className="detail-time-row">
              <label className="detail-time-label">Time</label>
              <input type="time" className="detail-time-input" value={addStartTime} onChange={e => setAddStartTime(e.target.value)} />
              <span className="detail-time-sep">~</span>
              <input type="time" className="detail-time-input" value={addEndTime} onChange={e => setAddEndTime(e.target.value)} />
            </div>
            <div className="detail-time-row">
              <label className="detail-time-label">End date</label>
              <input type="date" className="detail-date-input" value={addEndDate} onChange={e => setAddEndDate(e.target.value)} placeholder="For period" />
            </div>
            {addEndDate && (
              <div className="detail-period-hint">
                Will create period from {selection.dateKey} to {addEndDate}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="detail-items-list">
        {dayItems.length === 0 && (
          <div className="detail-empty">No items on this date</div>
        )}
        {dayItems.map(item => (
          <div key={item.id} className="detail-item">
            {editingId === item.id ? (
              <div className="detail-item-edit" onKeyDown={handleEditKeyDown}>
                <input className="detail-edit-title" value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Title" autoFocus />
                <textarea className="detail-edit-body" value={editBody} onChange={e => setEditBody(e.target.value)} placeholder="Memo" rows={3} />
                <div className="detail-time-row">
                  <label className="detail-time-label">Time</label>
                  <input type="time" className="detail-time-input" value={editStartTime} onChange={e => setEditStartTime(e.target.value)} />
                  <span className="detail-time-sep">~</span>
                  <input type="time" className="detail-time-input" value={editEndTime} onChange={e => setEditEndTime(e.target.value)} />
                </div>
                <div className="detail-edit-actions">
                  <button className="detail-save-btn" onClick={saveEdit}>Save</button>
                  <button className="detail-cancel-btn" onClick={cancelEdit}>Cancel</button>
                </div>
              </div>
            ) : (
              <div className="detail-item-view">
                <button
                  className={`detail-status-btn status-${item.status}`}
                  onClick={() => updateItem(item.id, { status: item.status === 'done' ? 'none' : 'done' })}
                >
                  {item.status === 'done' && <IconCheck size={8} />}
                </button>
                <div className="detail-item-content" onClick={() => startEdit(item.id)}>
                  <span className={`detail-item-title ${item.status === 'done' ? 'done' : ''}`}>
                    {item.title || '(untitled)'}
                  </span>
                  {formatTime(item.startTime, item.endTime) && (
                    <span className="detail-item-time">{formatTime(item.startTime, item.endTime)}</span>
                  )}
                  {item.body && <span className="detail-item-body">{item.body.slice(0, 80)}</span>}
                  <span className="detail-item-meta">{item.kind}</span>
                </div>
                <div className="detail-item-actions">
                  <button className="detail-action-btn" onClick={() => moveToBacklog(item.id)} title="Move to backlog">←</button>
                  <button className="detail-action-btn danger" onClick={() => deleteItem(item.id)} title="Delete">
                    <IconTrash size={12} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function RangeDetail() {
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

  const [draftLabel, setDraftLabel] = useState('')
  const [draftBody, setDraftBody] = useState('')
  const [draftKind, setDraftKind] = useState<RangeKind>('period')
  const [draftStatus, setDraftStatus] = useState<RangeStatus>('none')
  const [draftColor, setDraftColor] = useState<string | undefined>(undefined)
  const [draftTimelineBarHidden, setDraftTimelineBarHidden] = useState(false)
  const [draftTimelinePriority, setDraftTimelinePriority] = useState(0)

  useEffect(() => {
    if (!rangeId) return
    const st = useBoardStore.getState()
    const bid = st.activeBoardId
    if (!bid) return
    const r = st.boards[bid]?.ranges[rangeId]
    if (!r) return
    setDraftLabel(r.label || '')
    setDraftBody(r.body || '')
    setDraftKind(r.kind)
    setDraftStatus(r.status)
    setDraftColor(r.color)
    setDraftTimelineBarHidden(r.timelineBarHidden === true)
    setDraftTimelinePriority(r.timelinePriority ?? 0)
  }, [rangeId])

  useEffect(() => {
    if (!range) {
      setRangeEditPreview(null)
      return
    }
    setRangeEditPreview({
      rangeId: range.id,
      color: draftColor,
      kind: draftKind,
      timelineBarHidden: draftTimelineBarHidden,
      timelinePriority: clampTimelinePriority(draftTimelinePriority),
    })
    return () => setRangeEditPreview(null)
  }, [range?.id, draftColor, draftKind, draftTimelineBarHidden, draftTimelinePriority, setRangeEditPreview])

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
          <label className="range-field-label" htmlFor={`range-priority-${range.id}`}>Priority</label>
          <HelpTip text={COPY_PRIORITY_HINT} />
        </div>
        <input
          id={`range-priority-${range.id}`}
          type="number"
          className="detail-edit-title"
          min={TIMELINE_PRIORITY_MIN}
          max={TIMELINE_PRIORITY_MAX}
          value={draftTimelinePriority}
          onChange={e => setDraftTimelinePriority(Number(e.target.value))}
          title={COPY_PRIORITY_HINT}
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

const DEFAULT_TAG = 'General'

function ItemDetail() {
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

  const [editContent, setEditContent] = useState('')
  const [editTag, setEditTag] = useState(DEFAULT_TAG)
  const [editDate, setEditDate] = useState('')
  const [editStartTime, setEditStartTime] = useState('')
  const [editEndTime, setEditEndTime] = useState('')
  const [editEndDate, setEditEndDate] = useState('')
  /** Period color: local until Save (Cancel discards) */
  const [editPeriodColor, setEditPeriodColor] = useState<string | undefined>(undefined)
  const [editTimelineBarHidden, setEditTimelineBarHidden] = useState(false)
  const [editTimelinePriority, setEditTimelinePriority] = useState(0)

  const tagsFromItems = useMemo(() => {
    const set = new Set<string>([DEFAULT_TAG])
    Object.values(items).forEach(it => {
      const t = it.tags?.[0]?.trim()
      if (t) set.add(t)
    })
    return [...set].sort((a, b) => (a === DEFAULT_TAG ? -1 : b === DEFAULT_TAG ? 1 : a.localeCompare(b)))
  }, [items])

  const item = selection?.type === 'item' ? items[selection.itemId] : undefined

  useEffect(() => {
    if (!item) return
    const body = item.body ?? ''
    const title = item.title ?? ''
    setEditContent(title ? (body ? `${title}\n${body}` : title) : body)
    setEditTag((item.tags?.[0]?.trim()) || DEFAULT_TAG)
    setEditDate(item.date || '')
    setEditStartTime(item.startTime || '')
    setEditEndTime(item.endTime || '')
    const linked = item.rangeId ? ranges[item.rangeId] : undefined
    setEditEndDate(item.endDate || linked?.endDate || '')
    setEditPeriodColor(linked?.color)
    setEditTimelineBarHidden(linked?.timelineBarHidden === true)
    setEditTimelinePriority(linked?.timelinePriority ?? 0)
  }, [item?.id, item?.title, item?.body, item?.date, item?.endDate, item?.startTime, item?.endTime, item?.tags, item?.rangeId, item?.rangeId ? ranges[item.rangeId]?.endDate : undefined, item?.rangeId ? ranges[item.rangeId]?.color : undefined, item?.rangeId ? ranges[item.rangeId]?.timelineBarHidden : undefined, item?.rangeId ? ranges[item.rangeId]?.timelinePriority : undefined])

  useEffect(() => {
    if (!item?.rangeId) {
      setRangeEditPreview(null)
      return
    }
    setRangeEditPreview({
      rangeId: item.rangeId,
      color: editPeriodColor,
      timelineBarHidden: editTimelineBarHidden,
      timelinePriority: clampTimelinePriority(editTimelinePriority),
    })
    return () => setRangeEditPreview(null)
  }, [item?.rangeId, editPeriodColor, editTimelineBarHidden, editTimelinePriority, setRangeEditPreview])

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
    const hasPeriod = Boolean(editEndDate.trim() && startDate && editEndDate >= startDate)
    const periodEnd = hasPeriod ? editEndDate.trim() : undefined
    const pr = clampTimelinePriority(editTimelinePriority)
    setEditTimelinePriority(pr)

    let newRangeId: string | undefined
    if (hasPeriod && startDate && periodEnd) {
      if (item.rangeId && bs.ranges[item.rangeId]) {
        updateRange(item.rangeId, {
          startDate,
          endDate: periodEnd,
          label: firstLine || undefined,
          color: editPeriodColor,
          timelineBarHidden: editTimelineBarHidden ? true : undefined,
          timelinePriority: pr !== 0 ? pr : undefined,
        })
        newRangeId = item.rangeId
      } else {
        newRangeId = createRange(activeBoardId, 'period', startDate, periodEnd, {
          label: firstLine || undefined,
          color: editPeriodColor,
          timelineBarHidden: editTimelineBarHidden ? true : undefined,
          timelinePriority: pr !== 0 ? pr : undefined,
        })
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
      startTime: editStartTime || undefined,
      endTime: editEndTime || undefined,
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
  const headerEndDate = item.endDate || (item.rangeId ? ranges[item.rangeId]?.endDate : undefined)
  const linkedRange = item.rangeId ? ranges[item.rangeId] : undefined
  const draftHasPeriod = Boolean(editDate.trim() && editEndDate.trim() && editDate <= editEndDate)
  const periodAccentColor = draftHasPeriod ? (editPeriodColor ?? linkedRange?.color) : undefined
  const showTimelineFields = draftHasPeriod

  return (
    <div className="detail-panel">
      <div
        className="detail-date-header"
        style={periodAccentColor ? { borderLeft: `3px solid ${periodAccentColor}`, paddingLeft: 8, marginLeft: -2 } : undefined}
      >
        <span className="detail-date-main">{headerTitle}</span>
        {item.date && (
          <span className="detail-date-dow">
            {headerEndDate && headerEndDate !== item.date ? `${item.date} – ${headerEndDate}` : item.date}
            {formatTime(item.startTime, item.endTime) && ` · ${formatTime(item.startTime, item.endTime)}`}
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
                <label className="detail-time-label" htmlFor={`item-priority-${item.id}`}>Priority</label>
                <HelpTip text={COPY_PRIORITY_HINT} />
              </div>
              <input
                id={`item-priority-${item.id}`}
                type="number"
                className="detail-edit-title"
                min={TIMELINE_PRIORITY_MIN}
                max={TIMELINE_PRIORITY_MAX}
                value={editTimelinePriority}
                onChange={e => setEditTimelinePriority(Number(e.target.value))}
                title={COPY_PRIORITY_HINT}
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

export function DetailPanel() {
  const selection = useBoardStore(s => s.selection)

  if (!selection) {
    return <div className="panel-placeholder">Select a cell to open detail</div>
  }

  if (selection.type === 'day') return <DayDetail />
  if (selection.type === 'range') return <RangeDetail />
  if (selection.type === 'item') return <ItemDetail />

  return <div className="panel-placeholder">Selection: {selection.type}</div>
}
