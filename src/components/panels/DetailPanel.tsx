import { useState } from 'react'
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
  const updateItem = useBoardStore(s => s.updateItem)
  const deleteItem = useBoardStore(s => s.deleteItem)

  const [newTitle, setNewTitle] = useState('')
  const [newKind, setNewKind] = useState<ItemKind>('task')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editBody, setEditBody] = useState('')

  if (!selection || selection.type !== 'day') return null

  const { year, month, day } = parseDateKey(selection.dateKey)
  const dow = getDayOfWeek(year, month, day)
  const dowLabel = getDayOfWeekLabel(dow)
  const dayItems = Object.values(items).filter(it => it.date === selection.dateKey)

  const handleAdd = () => {
    if (!activeBoardId || !newTitle.trim()) return
    createItem(activeBoardId, newKind, {
      date: selection.dateKey,
      title: newTitle.trim(),
    })
    setNewTitle('')
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
  }

  const saveEdit = () => {
    if (!editingId) return
    updateItem(editingId, {
      title: editTitle.trim() || undefined,
      body: editBody.trim() || undefined,
    })
    setEditingId(null)
  }

  const cancelEdit = () => setEditingId(null)

  const moveToBacklog = (itemId: string) => {
    updateItem(itemId, { date: undefined })
  }

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing && !(e.target instanceof HTMLTextAreaElement)) {
      e.preventDefault()
      saveEdit()
    }
    if (e.key === 'Escape') cancelEdit()
  }

  return (
    <div className="detail-panel">
      <div className="detail-date-header">
        <span className="detail-date-main">{month + 1}월 {day}일</span>
        <span className="detail-date-dow">{dowLabel}</span>
        <span className="detail-date-year">{year}</span>
      </div>

      <div className="detail-add-row">
        <select
          className="detail-kind-select"
          value={newKind}
          onChange={e => setNewKind(e.target.value as ItemKind)}
        >
          <option value="task">Task</option>
          <option value="note">Note</option>
          <option value="event">Event</option>
        </select>
        <input
          className="detail-add-input"
          placeholder="항목 추가..."
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          onKeyDown={handleAddKeyDown}
        />
        <button className="detail-add-btn" onClick={handleAdd} title="추가">
          <IconPlus size={14} />
        </button>
      </div>

      <div className="detail-items-list">
        {dayItems.length === 0 && (
          <div className="detail-empty">이 날짜에 항목이 없습니다</div>
        )}
        {dayItems.map(item => (
          <div key={item.id} className="detail-item">
            {editingId === item.id ? (
              <div className="detail-item-edit" onKeyDown={handleEditKeyDown}>
                <input
                  className="detail-edit-title"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  placeholder="제목"
                  autoFocus
                />
                <textarea
                  className="detail-edit-body"
                  value={editBody}
                  onChange={e => setEditBody(e.target.value)}
                  placeholder="메모 (마크다운 지원)"
                  rows={3}
                />
                <div className="detail-edit-actions">
                  <button className="detail-save-btn" onClick={saveEdit}>저장</button>
                  <button className="detail-cancel-btn" onClick={cancelEdit}>취소</button>
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
                  {item.body && (
                    <span className="detail-item-body">{item.body.slice(0, 80)}</span>
                  )}
                  <span className="detail-item-meta">{item.kind}</span>
                </div>
                <div className="detail-item-actions">
                  <button className="detail-action-btn" onClick={() => moveToBacklog(item.id)} title="백로그로 이동">←</button>
                  <button className="detail-action-btn danger" onClick={() => deleteItem(item.id)} title="삭제">
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
  const ranges = useBoardStore(s => {
    if (!s.activeBoardId) return {}
    return s.boards[s.activeBoardId]?.ranges || {}
  })
  const updateRange = useBoardStore(s => s.updateRange)
  const deleteRange = useBoardStore(s => s.deleteRange)
  const setSelection = useBoardStore(s => s.setSelection)

  const [editingField, setEditingField] = useState<'label' | 'body' | null>(null)
  const [editValue, setEditValue] = useState('')

  if (!selection || selection.type !== 'range') return null

  const range = ranges[selection.rangeId]
  if (!range) return <div className="panel-placeholder">Range를 찾을 수 없습니다</div>

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
    deleteRange(range.id)
    setSelection(null)
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
        <span className="range-period-label">기간</span>
        <span className="range-period-value">
          {startP.month + 1}/{startP.day} ~ {endP.month + 1}/{endP.day}
        </span>
      </div>

      <div className="range-field" onKeyDown={handleKeyDown}>
        <label className="range-field-label">이름</label>
        {editingField === 'label' ? (
          <div className="range-field-edit">
            <input
              className="detail-edit-title"
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              autoFocus
            />
            <div className="detail-edit-actions">
              <button className="detail-save-btn" onClick={saveEdit}>저장</button>
              <button className="detail-cancel-btn" onClick={() => setEditingField(null)}>취소</button>
            </div>
          </div>
        ) : (
          <span className="range-field-value clickable" onClick={() => startEdit('label')}>
            {range.label || '클릭하여 이름 입력...'}
          </span>
        )}
      </div>

      <div className="range-field" onKeyDown={handleKeyDown}>
        <label className="range-field-label">메모</label>
        {editingField === 'body' ? (
          <div className="range-field-edit">
            <textarea
              className="detail-edit-body"
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              rows={3}
              autoFocus
            />
            <div className="detail-edit-actions">
              <button className="detail-save-btn" onClick={saveEdit}>저장</button>
              <button className="detail-cancel-btn" onClick={() => setEditingField(null)}>취소</button>
            </div>
          </div>
        ) : (
          <span className="range-field-value clickable" onClick={() => startEdit('body')}>
            {range.body || '클릭하여 메모 입력...'}
          </span>
        )}
      </div>

      <div className="range-field">
        <label className="range-field-label">종류</label>
        <select
          className="detail-kind-select range-select"
          value={range.kind}
          onChange={e => updateRange(range.id, { kind: e.target.value as RangeKind })}
        >
          <option value="period">Period</option>
          <option value="note">Note</option>
          <option value="highlight">Highlight</option>
        </select>
      </div>

      <div className="range-field">
        <label className="range-field-label">상태</label>
        <select
          className="detail-kind-select range-select"
          value={range.status}
          onChange={e => updateRange(range.id, { status: e.target.value as RangeStatus })}
        >
          <option value="none">None</option>
          <option value="active">Active</option>
          <option value="done">Done</option>
          <option value="delayed">Delayed</option>
        </select>
      </div>

      <div className="range-field">
        <label className="range-field-label">색상</label>
        <div className="range-color-picker">
          {RANGE_COLORS.map(c => (
            <button
              key={c}
              className={`range-color-swatch ${range.color === c ? 'active' : ''}`}
              style={{ background: c }}
              onClick={() => updateRange(range.id, { color: c })}
            />
          ))}
        </div>
      </div>

      <button className="range-delete-btn" onClick={handleDelete}>
        <IconTrash size={12} /> Range 삭제
      </button>
    </div>
  )
}

export function DetailPanel() {
  const selection = useBoardStore(s => s.selection)

  if (!selection) {
    return <div className="panel-placeholder">셀을 선택하면 상세 편집이 열립니다</div>
  }

  if (selection.type === 'day') return <DayDetail />
  if (selection.type === 'range') return <RangeDetail />

  return <div className="panel-placeholder">Selection: {selection.type}</div>
}
