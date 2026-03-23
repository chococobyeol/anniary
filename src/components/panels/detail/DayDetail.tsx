import { useState } from 'react'
import { useBoardStore } from '../../../store/board-store'
import { parseDateKey, getDayOfWeekLabel, getDayOfWeek } from '../../../utils/date'
import type { ItemKind } from '../../../types/entities'
import { IconPlus, IconTrash, IconCheck } from '../../icons/Icons'
import '../DetailPanel.css'

export function DayDetail() {
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
      const barStart = addStartTime.trim() || undefined
      const barEnd = addEndTime.trim() || undefined
      const rangeId = createRange(activeBoardId, 'period', selection.dateKey, addEndDate, {
        label: newTitle.trim(),
        barStartTime: barStart,
        barEndTime: barEnd,
      })
      createItem(activeBoardId, newKind, {
        title: newTitle.trim(),
        date: selection.dateKey,
        endDate: addEndDate,
        rangeId,
        startTime: barStart,
        endTime: barEnd,
      })
      setSelection({ type: 'range', rangeId })
    } else {
      const dk = selection.dateKey
      const barStart = addStartTime.trim() || undefined
      const barEnd = addEndTime.trim() || undefined
      const rangeId = createRange(activeBoardId, 'period', dk, dk, {
        label: newTitle.trim(),
        barStartTime: barStart,
        barEndTime: barEnd,
      })
      createItem(activeBoardId, newKind, {
        date: dk,
        endDate: dk,
        title: newTitle.trim(),
        startTime: barStart,
        endTime: barEnd,
        rangeId,
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
