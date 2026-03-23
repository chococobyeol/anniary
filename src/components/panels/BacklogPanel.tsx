import { useState, useMemo } from 'react'
import { useBoardStore } from '../../store/board-store'
import { sortDateKeys, isContiguousDateSpan } from '../../utils/date'
import type { ItemStatus } from '../../types/entities'
import { IconPlus, IconTrash, IconChevronDown, IconChevronUp, IconCheck } from '../icons/Icons'
import './BacklogPanel.css'

const DEFAULT_TAG = 'General'

function toggleDone(current: ItemStatus): ItemStatus {
  return current === 'done' ? 'none' : 'done'
}

function getItemTag(item: { tags?: string[] }): string {
  const t = item.tags && item.tags[0]
  return (t && t.trim()) || DEFAULT_TAG
}

export function BacklogPanel() {
  const activeBoardId = useBoardStore(s => s.activeBoardId)
  const items = useBoardStore(s => {
    if (!s.activeBoardId) return {}
    return s.boards[s.activeBoardId]?.items || {}
  })
  const ranges = useBoardStore(s => {
    if (!s.activeBoardId) return {}
    return s.boards[s.activeBoardId]?.ranges || {}
  })
  const selection = useBoardStore(s => s.selection)
  const backlogDisplayLimit = useBoardStore(s => s.settings.backlogDisplayLimit)
  const createItem = useBoardStore(s => s.createItem)
  const createRange = useBoardStore(s => s.createRange)
  const updateItem = useBoardStore(s => s.updateItem)
  const deleteItem = useBoardStore(s => s.deleteItem)
  const setSelection = useBoardStore(s => s.setSelection)
  const toggleLeftPanel = useBoardStore(s => s.toggleLeftPanel)

  const [text, setText] = useState('')
  const [selectedTag, setSelectedTag] = useState(DEFAULT_TAG)
  const [customTag, setCustomTag] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showDone, setShowDone] = useState(false)

  const allBacklog = useMemo(() => {
    const list = Object.values(items)
    if (!selection) return list
    if (selection.type === 'day') {
      const dateKey = selection.dateKey
      return list.filter(it => {
        if (it.date === dateKey) return true
        if (it.rangeId) {
          const r = ranges[it.rangeId]
          return r != null && dateKey >= r.startDate && dateKey <= r.endDate
        }
        return false
      })
    }
    if (selection.type === 'days') {
      const dateKeys = selection.dateKeys
      return list.filter(it => {
        for (const dateKey of dateKeys) {
          if (it.date === dateKey) return true
          if (it.rangeId) {
            const r = ranges[it.rangeId]
            if (r != null && dateKey >= r.startDate && dateKey <= r.endDate) return true
          }
        }
        return false
      })
    }
    if (selection.type === 'range') return list.filter(it => it.rangeId === selection.rangeId)
    if (selection.type === 'item') {
      const item = items[selection.itemId]
      if (!item) return list
      if (item.date) return list.filter(it => it.date === item.date)
      if (item.rangeId) return list.filter(it => it.rangeId === item.rangeId)
      return list
    }
    return list
  }, [items, ranges, selection])

  const sortedByUpdated = useMemo(
    () => [...allBacklog].sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1)),
    [allBacklog]
  )

  const limited = useMemo(() => {
    if (backlogDisplayLimit == null) return sortedByUpdated
    return sortedByUpdated.slice(0, backlogDisplayLimit)
  }, [sortedByUpdated, backlogDisplayLimit])

  const activeInView = useMemo(() => limited.filter(it => it.status !== 'done'), [limited])
  const doneInView = useMemo(() => limited.filter(it => it.status === 'done'), [limited])

  const groupedByTag = useMemo(() => {
    const map = new Map<string, typeof activeInView>()
    for (const item of activeInView) {
      const tag = getItemTag(item)
      if (!map.has(tag)) map.set(tag, [])
      map.get(tag)!.push(item)
    }
    const order = [DEFAULT_TAG]
    const rest = [...map.keys()].filter(k => k !== DEFAULT_TAG).sort()
    return [...order, ...rest].filter(k => map.has(k)).map(tag => ({ tag, list: map.get(tag)! }))
  }, [activeInView])

  const uniqueTags = useMemo(() => {
    const set = new Set<string>([DEFAULT_TAG])
    allBacklog.forEach(it => set.add(getItemTag(it)))
    return [...set].sort((a, b) => (a === DEFAULT_TAG ? -1 : b === DEFAULT_TAG ? 1 : a.localeCompare(b)))
  }, [allBacklog])


  const handleAdd = () => {
    if (!activeBoardId || !text.trim()) return
    const tagToUse = customTag.trim() || selectedTag
    const tag = tagToUse || DEFAULT_TAG
    const title = text.trim()

    if (selection?.type === 'day') {
      const dk = selection.dateKey
      const rangeId = createRange(activeBoardId, 'period', dk, dk, { label: title })
      createItem(activeBoardId, 'task', {
        title,
        tags: [tag],
        date: dk,
        endDate: dk,
        rangeId,
      })
    } else if (selection?.type === 'days' && selection.dateKeys.length > 0) {
      const keys = sortDateKeys([...new Set(selection.dateKeys)])
      if (isContiguousDateSpan(keys)) {
        const start = keys[0]
        const end = keys[keys.length - 1]
        const rangeId = createRange(activeBoardId, 'period', start, end, { label: title })
        createItem(activeBoardId, 'task', {
          title,
          tags: [tag],
          date: start,
          endDate: end,
          rangeId,
        })
      } else {
        for (const dk of keys) {
          createItem(activeBoardId, 'task', { title, tags: [tag], date: dk })
        }
      }
    } else {
      createItem(activeBoardId, 'task', { title, tags: [tag] })
    }
    setText('')
    setCustomTag('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      handleAdd()
    }
  }

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id))
  }

  const openItemDetail = (itemId: string) => {
    setSelection({ type: 'item', itemId })
    toggleLeftPanel('detail')
  }

  const renderItem = (item: (typeof allBacklog)[0]) => {
    const isExpanded = expandedId === item.id
    const isSelected = selection?.type === 'item' && selection.itemId === item.id
    return (
      <div key={item.id} className={`backlog-item ${item.status === 'done' ? 'done' : ''} ${isSelected ? 'selected' : ''}`}>
        <div className="backlog-item-row">
          <button
            className={`backlog-status-btn status-${item.status}`}
            onClick={() => updateItem(item.id, { status: toggleDone(item.status) })}
            title={`Status: ${item.status}`}
          >
            {item.status === 'done' && <IconCheck size={8} />}
          </button>
          <div className="backlog-item-content" onClick={() => openItemDetail(item.id)}>
            <span className={`backlog-item-title ${item.status === 'done' ? 'line-through' : ''}`}>
              {item.title || '(untitled)'}
            </span>
            {!isExpanded && item.body && (
              <span className="backlog-item-body-preview">
                {item.body.slice(0, 60)}
                {item.body.length > 60 ? '…' : ''}
              </span>
            )}
            {(item.date || item.endDate || item.startTime || item.endTime) && (
              <span className="backlog-item-meta-date">
                {item.date ?? ''}
                {item.endDate && item.endDate !== item.date ? `–${item.endDate}` : ''}
                {(item.startTime || item.endTime) && (
                  <> {item.startTime && item.endTime ? `${item.startTime}~${item.endTime}` : item.startTime || item.endTime || ''}</>
                )}
              </span>
            )}
          </div>
          <span className="backlog-item-tag">{getItemTag(item)}</span>
          {item.body && (
            <button
              className="backlog-expand-btn"
              onClick={(e) => { e.stopPropagation(); toggleExpand(item.id) }}
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? <IconChevronUp size={12} /> : <IconChevronDown size={12} />}
            </button>
          )}
          <button className="backlog-delete-btn" onClick={(e) => { e.stopPropagation(); deleteItem(item.id) }} title="Delete">
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
        <div className="backlog-input-row backlog-textarea-row">
          <textarea
            className="backlog-textarea"
            placeholder="Add a new item... (Enter: add, Shift+Enter: newline)"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
          />
          <button className="backlog-add-btn" onClick={handleAdd} title="Add">
            <IconPlus size={16} />
          </button>
        </div>

        <div className="backlog-tag-row">
          <span className="backlog-tag-label">Tag</span>
          <div className="backlog-tag-chips">
            {uniqueTags.map(tag => (
              <button
                key={tag}
                type="button"
                className={`backlog-tag-chip ${selectedTag === tag && !customTag.trim() ? 'active' : ''}`}
                onClick={() => { setSelectedTag(tag); setCustomTag('') }}
              >
                {tag}
              </button>
            ))}
            <input
              type="text"
              className="backlog-tag-input"
              placeholder="+ New tag"
              value={customTag}
              onChange={e => setCustomTag(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="backlog-list">
        {limited.length === 0 && (
          <div className="backlog-empty">No backlog items</div>
        )}
        {groupedByTag.map(({ tag, list }) => (
          <div key={tag} className="backlog-tag-group">
            <div className="backlog-tag-group-title">{tag} ({list.length})</div>
            {list.map(renderItem)}
          </div>
        ))}
      </div>

      {doneInView.length > 0 && (
        <div className="backlog-done-section">
          <button className="backlog-done-toggle" onClick={() => setShowDone(prev => !prev)}>
            {showDone ? <IconChevronUp size={12} /> : <IconChevronDown size={12} />}
            <span>Completed ({doneInView.length})</span>
          </button>
          {showDone && (
            <div className="backlog-list">
              {doneInView.map(renderItem)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
