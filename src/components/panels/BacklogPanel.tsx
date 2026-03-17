import { useState } from 'react'
import { useBoardStore } from '../../store/board-store'
import type { ItemKind, ItemStatus } from '../../types/entities'
import { IconPlus, IconTrash, IconChevronDown, IconChevronUp, IconCheck } from '../icons/Icons'
import './BacklogPanel.css'

function toggleDone(current: ItemStatus): ItemStatus {
  return current === 'done' ? 'none' : 'done'
}

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
  const [newBody, setNewBody] = useState('')
  const [newKind, setNewKind] = useState<ItemKind>('task')
  const [showBody, setShowBody] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showDone, setShowDone] = useState(false)

  const allBacklog = Object.values(items).filter(it => !it.date && !it.rangeId)
  const activeItems = allBacklog.filter(it => it.status !== 'done')
  const doneItems = allBacklog.filter(it => it.status === 'done')

  const handleAdd = () => {
    if (!activeBoardId || !newTitle.trim()) return
    createItem(activeBoardId, newKind, {
      title: newTitle.trim(),
      body: newBody.trim() || undefined,
    })
    setNewTitle('')
    setNewBody('')
    setShowBody(false)
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault()
      handleAdd()
    }
  }

  const handleBodyKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      handleAdd()
    }
  }

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id)
  }

  const renderItem = (item: typeof allBacklog[0]) => {
    const isExpanded = expandedId === item.id
    return (
      <div key={item.id} className={`backlog-item ${item.status === 'done' ? 'done' : ''}`}>
        <div className="backlog-item-row">
          <button
            className={`backlog-status-btn status-${item.status}`}
            onClick={() => updateItem(item.id, { status: toggleDone(item.status) })}
            title={`Status: ${item.status}`}
          >
            {item.status === 'done' && <IconCheck size={8} />}
          </button>
          <div
            className="backlog-item-content"
            onClick={() => toggleExpand(item.id)}
          >
            <span className={`backlog-item-title ${item.status === 'done' ? 'line-through' : ''}`}>
              {item.title || '(untitled)'}
            </span>
            {!isExpanded && item.body && (
              <span className="backlog-item-body-preview">
                {item.body.slice(0, 60)}{item.body.length > 60 ? '…' : ''}
              </span>
            )}
          </div>
          <span className="backlog-item-kind">{item.kind}</span>
          {item.body && (
            <button
              className="backlog-expand-btn"
              onClick={() => toggleExpand(item.id)}
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? <IconChevronUp size={12} /> : <IconChevronDown size={12} />}
            </button>
          )}
          <button
            className="backlog-delete-btn"
            onClick={() => deleteItem(item.id)}
            title="Delete"
          >
            <IconTrash size={12} />
          </button>
        </div>
        {isExpanded && item.body && (
          <div className="backlog-item-body-full">
            <pre className="backlog-item-body-text">{item.body}</pre>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="backlog-panel">
      <div className="backlog-input-group">
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
            placeholder="새로운 할 일을 추가하세요..."
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={handleTitleKeyDown}
          />
          <button className="backlog-add-btn" onClick={handleAdd} title="Add">
            <IconPlus size={16} />
          </button>
        </div>

        {!showBody && (
          <button className="backlog-toggle-body" onClick={() => setShowBody(true)}>
            + 메모 추가
          </button>
        )}

        {showBody && (
          <div className="backlog-body-group">
            <textarea
              className="backlog-body-input"
              placeholder="메모 (마크다운 지원: **굵게**, *기울임*, `코드`, [링크](URL))"
              value={newBody}
              onChange={e => setNewBody(e.target.value)}
              onKeyDown={handleBodyKeyDown}
              rows={4}
            />
            <div className="backlog-body-hint">Enter: 추가 | Shift+Enter: 줄바꿈</div>
          </div>
        )}
      </div>

      <div className="backlog-list">
        {activeItems.length === 0 && doneItems.length === 0 && (
          <div className="backlog-empty">백로그 항목 없음</div>
        )}
        {activeItems.map(renderItem)}
      </div>

      {doneItems.length > 0 && (
        <div className="backlog-done-section">
          <button
            className="backlog-done-toggle"
            onClick={() => setShowDone(prev => !prev)}
          >
            {showDone ? <IconChevronUp size={12} /> : <IconChevronDown size={12} />}
            <span>완료됨 ({doneItems.length})</span>
          </button>
          {showDone && (
            <div className="backlog-list">
              {doneItems.map(renderItem)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
