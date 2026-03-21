import { useState, useEffect, useMemo } from 'react'
import { useBoardStore } from '../../store/board-store'
import { parseDateKey, getDayOfWeekLabel, getDayOfWeek } from '../../utils/date'
import type { ItemKind, RangeKind, RangeStatus } from '../../types/entities'
import { IconPlus, IconTrash, IconCheck } from '../icons/Icons'
import './DetailPanel.css'

const RANGE_COLORS = [
  '#1a73e8', '#34a853', '#ea4335', '#fbbc04',
  '#ff6d00', '#ab47bc', '#00acc1', '#8d6e63',
]

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

  const [editingField, setEditingField] = useState<'label' | 'body' | null>(null)
  const [editValue, setEditValue] = useState('')

  if (!selection || selection.type !== 'range' || !boardState) return null

  const range = boardState.ranges[selection.rangeId]
  if (!range) return <div className="panel-placeholder">Range not found</div>

  const rangeItems = Object.values(boardState.items).filter(it => it.rangeId === range.id)

  const startEdit = (field: 'label' | 'body') => {
    setEditingField(field)
    setEditValue(field === 'label' ? (range.label || '') : (range.body || ''))
  }

  const saveEdit = () => {
    if (!editingField) return
    updateRange(range.id, { [editingField]: editValue.trim() || undefined })
    setEditingField(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing && !(e.target instanceof HTMLTextAreaElement)) {
      e.preventDefault()
      saveEdit()
    }
    if (e.key === 'Escape') setEditingField(null)
  }

  const handleDelete = () => {
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
    <div className="detail-panel">
      <div className="detail-date-header">
        <span className="detail-date-main">Range</span>
        <span className="detail-date-dow" style={{ color: range.color || 'var(--range-default)' }}>
          {range.kind}
        </span>
      </div>

      <div className="range-period">
        <span className="range-period-label">Period</span>
        <span className="range-period-value">
          {startP.month + 1}/{startP.day} ~ {endP.month + 1}/{endP.day}
        </span>
      </div>

      <div className="range-field" onKeyDown={handleKeyDown}>
        <label className="range-field-label">Name</label>
        {editingField === 'label' ? (
          <div className="range-field-edit">
            <input className="detail-edit-title" value={editValue} onChange={e => setEditValue(e.target.value)} autoFocus />
            <div className="detail-edit-actions">
              <button className="detail-save-btn" onClick={saveEdit}>Save</button>
              <button className="detail-cancel-btn" onClick={() => setEditingField(null)}>Cancel</button>
            </div>
          </div>
        ) : (
          <span className="range-field-value clickable" onClick={() => startEdit('label')}>
            {range.label || 'Click to add name...'}
          </span>
        )}
      </div>

      <div className="range-field" onKeyDown={handleKeyDown}>
        <label className="range-field-label">Memo</label>
        {editingField === 'body' ? (
          <div className="range-field-edit">
            <textarea className="detail-edit-body" value={editValue} onChange={e => setEditValue(e.target.value)} rows={3} autoFocus />
            <div className="detail-edit-actions">
              <button className="detail-save-btn" onClick={saveEdit}>Save</button>
              <button className="detail-cancel-btn" onClick={() => setEditingField(null)}>Cancel</button>
            </div>
          </div>
        ) : (
          <span className="range-field-value clickable" onClick={() => startEdit('body')}>
            {range.body || 'Click to add memo...'}
          </span>
        )}
      </div>

      <div className="range-field">
        <label className="range-field-label">Kind</label>
        <select className="detail-kind-select range-select" value={range.kind} onChange={e => updateRange(range.id, { kind: e.target.value as RangeKind })}>
          <option value="period">Period</option>
          <option value="note">Note</option>
          <option value="highlight">Highlight</option>
        </select>
      </div>

      <div className="range-field">
        <label className="range-field-label">Status</label>
        <select className="detail-kind-select range-select" value={range.status} onChange={e => updateRange(range.id, { status: e.target.value as RangeStatus })}>
          <option value="none">None</option>
          <option value="active">Active</option>
          <option value="done">Done</option>
          <option value="delayed">Delayed</option>
        </select>
      </div>

      <div className="range-field">
        <label className="range-field-label">Color</label>
        <div className="range-color-picker">
          {RANGE_COLORS.map(c => (
            <button key={c} className={`range-color-swatch ${range.color === c ? 'active' : ''}`} style={{ background: c }} onClick={() => updateRange(range.id, { color: c })} />
          ))}
        </div>
      </div>

      {rangeItems.length > 0 && (
        <div className="range-field">
          <label className="range-field-label">Items ({rangeItems.length})</label>
          <div className="range-items-list">
            {rangeItems.map(it => (
              <div key={it.id} className="range-item-row">
                <span className="range-item-title">{it.title || '(untitled)'}</span>
                <span className="range-item-kind">{it.kind}</span>
                <button className="detail-action-btn" onClick={() => unlinkItem(it.id)} title="Unlink">✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <button className="range-delete-btn" onClick={handleDelete}>
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
  const setSelection = useBoardStore(s => s.setSelection)
  const toggleLeftPanel = useBoardStore(s => s.toggleLeftPanel)

  const [editContent, setEditContent] = useState('')
  const [editTag, setEditTag] = useState(DEFAULT_TAG)
  const [editDate, setEditDate] = useState('')
  const [editStartTime, setEditStartTime] = useState('')
  const [editEndTime, setEditEndTime] = useState('')
  const [editEndDate, setEditEndDate] = useState('')

  const tagsFromItems = useMemo(() => {
    const set = new Set<string>([DEFAULT_TAG])
    Object.values(items).forEach(it => {
      const t = it.tags?.[0]?.trim()
      if (t) set.add(t)
    })
    return [...set].sort((a, b) => (a === DEFAULT_TAG ? -1 : b === DEFAULT_TAG ? 1 : a.localeCompare(b)))
  }, [items])

  if (!selection || selection.type !== 'item') return null
  const item = items[selection.itemId]
  if (!item) {
    return (
      <div className="panel-placeholder">
        Item not found
        <button type="button" className="detail-cancel-btn" onClick={() => setSelection(null)}>Close</button>
      </div>
    )
  }

  useEffect(() => {
    const body = item.body ?? ''
    const title = item.title ?? ''
    setEditContent(title ? (body ? `${title}\n${body}` : title) : body)
    setEditTag((item.tags?.[0]?.trim()) || DEFAULT_TAG)
    setEditDate(item.date || '')
    setEditStartTime(item.startTime || '')
    setEditEndTime(item.endTime || '')
    const linked = item.rangeId ? ranges[item.rangeId] : undefined
    setEditEndDate(item.endDate || linked?.endDate || '')
  }, [item.id, item.title, item.body, item.date, item.endDate, item.startTime, item.endTime, item.tags, item.rangeId, item.rangeId ? ranges[item.rangeId]?.endDate : undefined])

  const saveEdit = () => {
    if (!activeBoardId) return
    const trimmed = editContent.trim()
    const firstLine = trimmed.split('\n')[0] ?? ''
    const rest = trimmed.includes('\n') ? trimmed.slice(firstLine.length).replace(/^\n/, '') : ''
    const startDate = editDate.trim() || undefined
    let rangeId: string | undefined
    if (editEndDate.trim() && startDate && editEndDate >= startDate) {
      rangeId = createRange(activeBoardId, 'period', startDate, editEndDate.trim(), { label: firstLine || undefined })
    } else {
      rangeId = undefined
    }
    const periodEnd = editEndDate.trim() && startDate && editEndDate >= startDate ? editEndDate.trim() : undefined
    updateItem(item.id, {
      title: firstLine || undefined,
      body: rest || undefined,
      tags: [editTag.trim() || DEFAULT_TAG],
      date: startDate,
      endDate: periodEnd,
      rangeId,
      startTime: editStartTime || undefined,
      endTime: editEndTime || undefined,
    })
    setSelection(null)
    toggleLeftPanel('backlog')
  }

  const cancelEdit = () => {
    setSelection(null)
    toggleLeftPanel('backlog')
  }

  const handleDelete = () => {
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

  return (
    <div className="detail-panel">
      <div className="detail-date-header">
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
        <label className="detail-time-label">Date</label>
        <input type="date" className="detail-date-input" value={editDate} onChange={e => setEditDate(e.target.value)} />
        <div className="detail-time-row">
          <label className="detail-time-label">Time</label>
          <input type="time" className="detail-time-input" value={editStartTime} onChange={e => setEditStartTime(e.target.value)} />
          <span className="detail-time-sep">~</span>
          <input type="time" className="detail-time-input" value={editEndTime} onChange={e => setEditEndTime(e.target.value)} />
        </div>
        <label className="detail-time-label">End date (period)</label>
        <input type="date" className="detail-date-input" value={editEndDate} onChange={e => setEditEndDate(e.target.value)} placeholder="Optional" />
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
