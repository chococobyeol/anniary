import { useMemo } from 'react'
import { useBoardStore } from '../../store/board-store'
import type { ItemEntity } from '../../types/entities'
import { collectTagsFromItems, normalizeBoardViewFilter, normalizeFilterTag } from '../../utils/boardViewFilter'
import './SettingsPanel.css'
import './FilterPanel.css'

const EMPTY_ITEMS: Record<string, ItemEntity> = {}

export function FilterPanel() {
  const items = useBoardStore(s => {
    const id = s.activeBoardId
    if (!id) return EMPTY_ITEMS
    return s.boards[id]?.items ?? EMPTY_ITEMS
  })
  const boardViewFilterRaw = useBoardStore(s => s.settings.boardViewFilter)
  const filter = useMemo(
    () => normalizeBoardViewFilter(boardViewFilterRaw),
    [boardViewFilterRaw]
  )
  const updateBoardViewFilter = useBoardStore(s => s.updateBoardViewFilter)
  const resetBoardViewFilter = useBoardStore(s => s.resetBoardViewFilter)

  const tagList = useMemo(() => collectTagsFromItems(items), [items])

  const toggleTag = (tag: string) => {
    const key = normalizeFilterTag(tag)
    const inc = new Set(filter.includeTags.map(normalizeFilterTag))
    if (inc.size === 0) {
      updateBoardViewFilter({ includeTags: [key] })
      return
    }
    if (inc.has(key)) inc.delete(key)
    else inc.add(key)
    updateBoardViewFilter({ includeTags: [...inc].sort() })
  }

  const clearTagFilter = () => updateBoardViewFilter({ includeTags: [] })

  const isTagActive = (tag: string) => {
    const key = normalizeFilterTag(tag)
    if (filter.includeTags.length === 0) return false
    return filter.includeTags.some(t => normalizeFilterTag(t) === key)
  }

  const isDefaultState =
    filter.includeTags.length === 0
    && !filter.hideDoneItems
    && filter.showTimelineBarsMultiDay
    && filter.showTimelineBarsSingleDay
    && filter.showTimelineBarsTimeOfDay

  return (
    <div className="settings-panel filter-panel">
      <div className="settings-section">
        <div className="settings-section-title">Tags</div>
        <p className="settings-hint-block filter-panel-hint">
          No chip selected = show all tags. Select one or more to narrow (OR).
        </p>
        <div className="filter-tag-chips">
          {tagList.map(tag => (
            <button
              key={tag}
              type="button"
              className={`filter-tag-chip ${isTagActive(tag) ? 'active' : ''}`}
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
        {filter.includeTags.length > 0 && (
          <button type="button" className="filter-clear-tags" onClick={clearTagFilter}>
            Clear tag filter
          </button>
        )}
      </div>

      <div className="settings-section">
        <div className="settings-section-title">Items</div>
        <label className="settings-row">
          <span className="settings-label">Hide done</span>
          <div className="settings-toggle-wrap">
            <span className="settings-hint">{filter.hideDoneItems ? 'Hidden' : 'Visible'}</span>
            <button
              type="button"
              className={`settings-toggle ${filter.hideDoneItems ? 'active' : ''}`}
              onClick={() => updateBoardViewFilter({ hideDoneItems: !filter.hideDoneItems })}
              role="switch"
              aria-checked={filter.hideDoneItems}
            >
              <span className="settings-toggle-thumb" />
            </button>
          </div>
        </label>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">Timeline</div>
        <label className="settings-row">
          <span className="settings-label">Hide multi-day period bars</span>
          <div className="settings-toggle-wrap">
            <span className="settings-hint">{filter.showTimelineBarsMultiDay ? 'Visible' : 'Hidden'}</span>
            <button
              type="button"
              className={`settings-toggle ${!filter.showTimelineBarsMultiDay ? 'active' : ''}`}
              onClick={() =>
                updateBoardViewFilter({ showTimelineBarsMultiDay: !filter.showTimelineBarsMultiDay })
              }
              role="switch"
              aria-checked={!filter.showTimelineBarsMultiDay}
            >
              <span className="settings-toggle-thumb" />
            </button>
          </div>
        </label>
        <label className="settings-row">
          <span className="settings-label">Hide all-day single-day bars</span>
          <div className="settings-toggle-wrap">
            <span className="settings-hint">{filter.showTimelineBarsSingleDay ? 'Visible' : 'Hidden'}</span>
            <button
              type="button"
              className={`settings-toggle ${!filter.showTimelineBarsSingleDay ? 'active' : ''}`}
              onClick={() =>
                updateBoardViewFilter({ showTimelineBarsSingleDay: !filter.showTimelineBarsSingleDay })
              }
              role="switch"
              aria-checked={!filter.showTimelineBarsSingleDay}
            >
              <span className="settings-toggle-thumb" />
            </button>
          </div>
        </label>
        <label className="settings-row">
          <span className="settings-label">Hide same-day time bars</span>
          <div className="settings-toggle-wrap">
            <span className="settings-hint">{filter.showTimelineBarsTimeOfDay ? 'Visible' : 'Hidden'}</span>
            <button
              type="button"
              className={`settings-toggle ${!filter.showTimelineBarsTimeOfDay ? 'active' : ''}`}
              onClick={() =>
                updateBoardViewFilter({ showTimelineBarsTimeOfDay: !filter.showTimelineBarsTimeOfDay })
              }
              role="switch"
              aria-checked={!filter.showTimelineBarsTimeOfDay}
            >
              <span className="settings-toggle-thumb" />
            </button>
          </div>
        </label>
      </div>

      <div className="settings-section">
        <button
          type="button"
          className="filter-reset-btn"
          disabled={isDefaultState}
          onClick={() => resetBoardViewFilter()}
        >
          Reset filters
        </button>
      </div>
    </div>
  )
}
