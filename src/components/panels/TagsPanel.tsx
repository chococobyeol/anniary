import { useMemo, useState, useEffect } from 'react'
import { useBoardStore } from '../../store/board-store'
import type { ItemEntity } from '../../types/entities'
import { FILTER_DEFAULT_TAG, normalizeFilterTag } from '../../utils/boardViewFilter'
import {
  countItemsPerTag,
  sortedTagRows,
  tagsAfterRename,
  tagsAfterRemove,
  itemIdsHavingTag,
} from '../../utils/tagManagement'
import { IconPencil, IconTrash, IconPlus } from '../icons/Icons'
import './TagsPanel.css'

const EMPTY_ITEMS: Record<string, ItemEntity> = {}

type RemoveMode = 'reassign' | 'deleteItems'

export function TagsPanel() {
  const activeBoardId = useBoardStore(s => s.activeBoardId)
  const items = useBoardStore(s => {
    const id = s.activeBoardId
    if (!id) return EMPTY_ITEMS
    return s.boards[id]?.items ?? EMPTY_ITEMS
  })
  const updateItem = useBoardStore(s => s.updateItem)
  const deleteItem = useBoardStore(s => s.deleteItem)
  const beginHistoryBatch = useBoardStore(s => s.beginHistoryBatch)
  const endHistoryBatch = useBoardStore(s => s.endHistoryBatch)
  const createItem = useBoardStore(s => s.createItem)

  const rows = useMemo(() => {
    const counts = countItemsPerTag(items)
    return sortedTagRows(counts)
  }, [items])

  const [renameFor, setRenameFor] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const [removeFor, setRemoveFor] = useState<string | null>(null)
  const [removeMode, setRemoveMode] = useState<RemoveMode>('reassign')
  const [replaceWith, setReplaceWith] = useState('')
  const [replaceCustom, setReplaceCustom] = useState('')

  const [newTagName, setNewTagName] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)

  const replacementOptions = useMemo(() => {
    if (!removeFor) return [] as string[]
    return rows
      .map(r => r.tag)
      .filter(t => normalizeFilterTag(t) !== normalizeFilterTag(removeFor))
  }, [rows, removeFor])

  const removeAffectedCount = useMemo(() => {
    if (!removeFor) return 0
    return itemIdsHavingTag(items, removeFor).length
  }, [items, removeFor])

  useEffect(() => {
    if (!removeFor) return
    setRemoveMode('reassign')
    if (replacementOptions.length > 0) {
      setReplaceWith(replacementOptions[0])
      setReplaceCustom('')
    } else {
      setReplaceWith('')
      setReplaceCustom('')
    }
  }, [removeFor, replacementOptions])

  const openRename = (tag: string) => {
    setRenameFor(tag)
    setRenameValue(tag)
  }

  const cancelRename = () => {
    setRenameFor(null)
    setRenameValue('')
  }

  const applyRename = () => {
    if (!renameFor) return
    const to = renameValue.trim()
    if (!to) return
    if (normalizeFilterTag(to) === normalizeFilterTag(renameFor)) {
      cancelRename()
      return
    }
    beginHistoryBatch()
    try {
      for (const [id, item] of Object.entries(items)) {
        const next = tagsAfterRename(item, renameFor, to)
        if (next) updateItem(id, { tags: next })
      }
    } finally {
      endHistoryBatch()
    }
    cancelRename()
  }

  const cancelRemove = () => {
    setRemoveFor(null)
    setRemoveMode('reassign')
    setReplaceWith('')
    setReplaceCustom('')
  }

  const applyRemoveReassign = () => {
    if (!removeFor) return
    const rep = replacementOptions.length > 0
      ? replaceWith
      : replaceCustom.trim()
    if (!rep) return
    if (normalizeFilterTag(rep) === normalizeFilterTag(removeFor)) return

    beginHistoryBatch()
    try {
      for (const [id, item] of Object.entries(items)) {
        const next = tagsAfterRemove(item, removeFor, rep)
        if (next) updateItem(id, { tags: next })
      }
    } finally {
      endHistoryBatch()
    }
    cancelRemove()
  }

  const applyRemoveDeleteItems = () => {
    if (!removeFor) return
    const ids = itemIdsHavingTag(items, removeFor)
    if (ids.length === 0) {
      cancelRemove()
      return
    }
    const msg =
      normalizeFilterTag(removeFor) === FILTER_DEFAULT_TAG
        ? `Delete ${ids.length} item(s) with no tag / "${FILTER_DEFAULT_TAG}"? This cannot be undone.`
        : `Delete ${ids.length} item(s) that use "${removeFor}" (including items with multiple tags)? Cannot be undone.`
    if (!window.confirm(msg)) return
    beginHistoryBatch()
    try {
      for (const id of ids) deleteItem(id)
    } finally {
      endHistoryBatch()
    }
    cancelRemove()
  }

  const applyRemove = () => {
    if (removeMode === 'deleteItems') applyRemoveDeleteItems()
    else applyRemoveReassign()
  }

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') cancelRename()
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault()
      applyRename()
    }
  }

  const openRemove = (tag: string) => {
    setRemoveFor(tag)
  }

  const tagAlreadyExists = (raw: string) =>
    rows.some(r => normalizeFilterTag(r.tag) === normalizeFilterTag(raw))

  const handleCreateTag = () => {
    setCreateError(null)
    if (!activeBoardId) return
    const name = newTagName.trim()
    if (!name) {
      setCreateError('Enter a tag name.')
      return
    }
    if (tagAlreadyExists(name)) {
      setCreateError('That tag already exists.')
      return
    }
    createItem(activeBoardId, 'task', { tags: [name], title: '' })
    setNewTagName('')
  }

  const handleCreateKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault()
      handleCreateTag()
    }
  }

  return (
    <div className="tags-panel">
      <p className="tags-panel-intro">
        Rename applies to all items with that tag. Remove: move to another tag, or delete those items entirely.
        Add tag creates one backlog item with that tag (empty title) so it appears in backlog and filters.
      </p>

      <div className="tags-panel-create">
        <input
          type="text"
          className="tags-panel-input tags-panel-create-input"
          placeholder="New tag name"
          value={newTagName}
          onChange={e => { setNewTagName(e.target.value); setCreateError(null) }}
          onKeyDown={handleCreateKeyDown}
          disabled={!activeBoardId}
          aria-invalid={createError != null}
        />
        <button
          type="button"
          className="tags-panel-create-btn"
          title="Add tag"
          onClick={handleCreateTag}
          disabled={!activeBoardId}
        >
          <IconPlus size={14} />
        </button>
      </div>
      {createError && <p className="tags-panel-create-error">{createError}</p>}

      {rows.length === 0 && (
        <div className="tags-panel-empty">No tags on items yet. Add a tag above, or add items from Backlog.</div>
      )}

      <ul className="tags-panel-list">
        {rows.map(({ tag, count }) => (
          <li key={tag} className="tags-panel-row">
            {renameFor === tag ? (
              <div className="tags-panel-expand">
                <input
                  className="tags-panel-input"
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  onKeyDown={handleRenameKeyDown}
                  autoFocus
                />
                <div className="tags-panel-expand-actions">
                  <button type="button" className="tags-panel-btn primary" onClick={applyRename}>
                    Apply
                  </button>
                  <button type="button" className="tags-panel-btn" onClick={cancelRename}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : removeFor === tag ? (
              <div className="tags-panel-expand tags-panel-remove-expand">
                <div className="tags-panel-remove-modes">
                  <label className="tags-panel-radio">
                    <input
                      type="radio"
                      name={`remove-mode-${tag}`}
                      checked={removeMode === 'reassign'}
                      onChange={() => setRemoveMode('reassign')}
                    />
                    <span>Move to tag</span>
                  </label>
                  <label className="tags-panel-radio">
                    <input
                      type="radio"
                      name={`remove-mode-${tag}`}
                      checked={removeMode === 'deleteItems'}
                      onChange={() => setRemoveMode('deleteItems')}
                    />
                    <span>Delete {removeAffectedCount} item(s)</span>
                  </label>
                </div>

                {removeMode === 'reassign' ? (
                  <>
                    {replacementOptions.length > 0 ? (
                      <select
                        className="tags-panel-select"
                        value={replaceWith}
                        onChange={e => setReplaceWith(e.target.value)}
                      >
                        {replacementOptions.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        className="tags-panel-input"
                        placeholder="New tag name"
                        value={replaceCustom}
                        onChange={e => setReplaceCustom(e.target.value)}
                      />
                    )}
                  </>
                ) : (
                  <p className="tags-panel-warn">
                    Permanently deletes items that use this tag ({removeAffectedCount}).
                  </p>
                )}

                <div className="tags-panel-expand-actions">
                  <button
                    type="button"
                    className="tags-panel-btn danger"
                    onClick={applyRemove}
                    disabled={
                      removeMode === 'reassign'
                        ? !replacementOptions.length && !replaceCustom.trim()
                        : removeAffectedCount === 0
                    }
                  >
                    {removeMode === 'deleteItems' ? 'Delete items' : 'Remove tag'}
                  </button>
                  <button type="button" className="tags-panel-btn" onClick={cancelRemove}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="tags-panel-row-compact">
                <span className="tags-panel-name" title={tag}>{tag}</span>
                <span className="tags-panel-count">{count}</span>
                <div className="tags-panel-icon-group">
                  <button
                    type="button"
                    className="tags-panel-icon-btn"
                    title="Rename"
                    onClick={() => openRename(tag)}
                  >
                    <IconPencil size={12} />
                  </button>
                  <button
                    type="button"
                    className="tags-panel-icon-btn danger"
                    title="Remove tag…"
                    onClick={() => openRemove(tag)}
                  >
                    <IconTrash size={12} />
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      <p className="tags-panel-footnote">
        “{FILTER_DEFAULT_TAG}” = no tag. Delete-items on it removes those backlog-style items.
      </p>
    </div>
  )
}
