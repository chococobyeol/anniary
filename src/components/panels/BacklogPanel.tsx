import { useState } from 'react'
import { useBoardStore } from '../../store/board-store'
import type { ItemKind } from '../../types/entities'
import './BacklogPanel.css'

export function BacklogPanel() {
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

  const backlogItems = Object.values(items).filter(
    it => !it.date && !it.rangeId && it.status !== 'done'
  )

  const handleAdd = () => {
    if (!activeBoardId || !newTitle.trim()) return
    createItem(activeBoardId, newKind, { title: newTitle.trim() })
    setNewTitle('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd()
  }

  return (
    <div className="backlog-panel">
      <div className="backlog-input-row">
        <select
          value={newKind}
          onChange={e => setNewKind(e.target.value as ItemKind)}
          className="backlog-kind-select"
        >
          <option value="task">Task</option>
          <option value="note">Note</option>
          <option value="event">Event</option>
        </select>
        <input
          className="backlog-input"
          placeholder="Add item..."
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button className="backlog-add-btn" onClick={handleAdd}>+</button>
      </div>

      <div className="backlog-list">
        {backlogItems.length === 0 && (
          <div className="backlog-empty">No backlog items</div>
        )}
        {backlogItems.map(item => (
          <div key={item.id} className="backlog-item">
            <button
              className={`backlog-status-btn status-${item.status}`}
              onClick={() => {
                const next = item.status === 'none' ? 'in-progress' : item.status === 'in-progress' ? 'done' : 'none'
                updateItem(item.id, { status: next })
              }}
            />
            <span className="backlog-item-title">{item.title || '(untitled)'}</span>
            <span className="backlog-item-kind">{item.kind}</span>
            <button
              className="backlog-delete-btn"
              onClick={() => deleteItem(item.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
