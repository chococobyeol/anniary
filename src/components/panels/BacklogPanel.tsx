import { useState, useMemo } from 'react'
import { useBoardStore } from '../../store/board-store'
import { ANNIARY_BACKLOG_ITEM_MIME } from '../../constants/dnd'
import { markdownToPlainText } from '../../utils/markdown'
import { MarkdownView } from '../common/MarkdownView'
import { sortDateKeys, isContiguousDateSpan } from '../../utils/date'
import { formatRepeatSummary, getEffectiveItemRepeat, itemOccursOnDate } from '../../utils/repeat'
import type { ItemStatus } from '../../types/entities'
import { IconPlus, IconTrash, IconChevronDown, IconChevronUp, IconCheck } from '../icons/Icons'
import './BacklogPanel.css'

const DEFAULT_TAG = 'General'

function backlogListTitle(item: { title?: string; body?: string }): string {
  const t = item.title?.trim()
  if (t) return t
  if (!item.body?.trim()) return '(제목 없음)'
  const line = markdownToPlainText(item.body)
    .split('\n')
    .map(l => l.trim())
    .find(Boolean)
  return line ? (line.length > 100 ? `${line.slice(0, 100)}…` : line) : '(제목 없음)'
}

function backlogBodyPreviewPlain(body: string): string {
  return markdownToPlainText(body).replace(/\s+/g, ' ').trim()
}

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
  const boardYear = useBoardStore(s =>
    s.activeBoardId ? s.boards[s.activeBoardId]?.board.year ?? new Date().getFullYear() : new Date().getFullYear()
  )

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
        if (itemOccursOnDate(it, dateKey, boardYear)) return true
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
          if (itemOccursOnDate(it, dateKey, boardYear)) return true
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
      if (item.date) return list.filter(it => itemOccursOnDate(it, item.date!, boardYear))
      if (item.rangeId) return list.filter(it => it.rangeId === item.rangeId)
      return list
    }
    return list
  }, [items, ranges, selection, boardYear])

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

  /** 보드 전체 item 기준 — 선택 날짜의 목록(allBacklog)이 아니라 어디에든 쓰인 태그를 칩에 표시 */
  const uniqueTags = useMemo(() => {
    const set = new Set<string>([DEFAULT_TAG])
    for (const it of Object.values(items)) {
      if (it.tags?.length) {
        for (const t of it.tags) {
          set.add((t && t.trim()) || DEFAULT_TAG)
        }
      } else {
        set.add(DEFAULT_TAG)
      }
    }
    return [...set].sort((a, b) => (a === DEFAULT_TAG ? -1 : b === DEFAULT_TAG ? 1 : a.localeCompare(b)))
  }, [items])


  const handleAdd = () => {
    if (!activeBoardId) return
    const raw = text.replace(/\r\n/g, '\n').trimEnd()
    if (!raw.trim()) return
    const lines = raw.split('\n')
    const title = (lines[0] ?? '').trim()
    const bodyRest = lines.length > 1 ? lines.slice(1).join('\n') : ''
    const body = bodyRest.trim() ? bodyRest : undefined
    if (!title && !body?.trim()) return

    const tagToUse = customTag.trim() || selectedTag
    const tag = tagToUse || DEFAULT_TAG
    const titleStored = title || undefined
    const rangeLabel =
      title || body?.trim().split('\n').find(l => l.trim())?.slice(0, 80) || '(untitled)'
    const itemFields = { title: titleStored, body, tags: [tag] }

    if (selection?.type === 'day') {
      const dk = selection.dateKey
      const rangeId = createRange(activeBoardId, 'period', dk, dk, { label: rangeLabel })
      createItem(activeBoardId, 'task', {
        ...itemFields,
        date: dk,
        endDate: dk,
        rangeId,
      })
    } else if (selection?.type === 'days' && selection.dateKeys.length > 0) {
      const keys = sortDateKeys([...new Set(selection.dateKeys)])
      if (isContiguousDateSpan(keys)) {
        const start = keys[0]
        const end = keys[keys.length - 1]
        const rangeId = createRange(activeBoardId, 'period', start, end, { label: rangeLabel })
        createItem(activeBoardId, 'task', {
          ...itemFields,
          date: start,
          endDate: end,
          rangeId,
        })
      } else {
        for (const dk of keys) {
          createItem(activeBoardId, 'task', { ...itemFields, date: dk })
        }
      }
    } else {
      createItem(activeBoardId, 'task', itemFields)
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

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
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
          <div
            className="backlog-item-content"
            draggable
            onDragStart={e => {
              e.dataTransfer.setData(ANNIARY_BACKLOG_ITEM_MIME, item.id)
              e.dataTransfer.setData('text/plain', item.id)
              e.dataTransfer.effectAllowed = 'copy'
            }}
            onClick={() => openItemDetail(item.id)}
          >
            <span className={`backlog-item-title ${item.status === 'done' ? 'line-through' : ''}`}>
              {backlogListTitle(item)}
            </span>
            {!isExpanded && item.body && (
              <span className="backlog-item-body-preview">
                {(() => {
                  const one = backlogBodyPreviewPlain(item.body)
                  return one.length > 72 ? `${one.slice(0, 72)}…` : one
                })()}
              </span>
            )}
            {(item.date || item.endDate || item.startTime || item.endTime || getEffectiveItemRepeat(item)) && (
              <span className="backlog-item-meta-date">
                {item.date ?? ''}
                {item.endDate && item.endDate !== item.date ? `–${item.endDate}` : ''}
                {(item.startTime || item.endTime) && (
                  <> {item.startTime && item.endTime ? `${item.startTime}~${item.endTime}` : item.startTime || item.endTime || ''}</>
                )}
                {getEffectiveItemRepeat(item) && (
                  <> · {formatRepeatSummary(item)}</>
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
            <MarkdownView source={item.body} />
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
            placeholder="첫 줄: 제목 · 이후: 본문(마크다운) · Enter=추가 · Shift+Enter=줄바꿈"
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
              onKeyDown={handleTagInputKeyDown}
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
