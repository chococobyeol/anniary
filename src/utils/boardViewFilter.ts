import type { ItemEntity } from '../types/entities'
import type { BoardViewFilter } from '../types/state'
import { DEFAULT_BOARD_VIEW_FILTER } from '../types/state'

/** BacklogPanel `DEFAULT_TAG` 과 동일 */
export const FILTER_DEFAULT_TAG = 'General'

export function normalizeFilterTag(t: string | undefined): string {
  const s = (t ?? '').trim()
  return s || FILTER_DEFAULT_TAG
}

export function itemPassesBoardViewFilter(item: ItemEntity, f: BoardViewFilter): boolean {
  if (f.hideDoneItems && item.status === 'done') return false
  if (f.includeTags.length > 0) {
    const itemTags = (item.tags && item.tags.length > 0 ? item.tags : [FILTER_DEFAULT_TAG]).map(normalizeFilterTag)
    const tagSet = new Set(itemTags)
    const hit = f.includeTags.some(sel => tagSet.has(normalizeFilterTag(sel)))
    if (!hit) return false
  }
  return true
}

export function filterItemsByBoardView(
  items: Record<string, ItemEntity>,
  f: BoardViewFilter
): Record<string, ItemEntity> {
  const out: Record<string, ItemEntity> = {}
  for (const [id, item] of Object.entries(items)) {
    if (itemPassesBoardViewFilter(item, f)) out[id] = item
  }
  return out
}

/** 필터 UI용: 보드 item 에서 등장하는 태그 목록 (정렬) */
export function collectTagsFromItems(items: Record<string, ItemEntity>): string[] {
  const set = new Set<string>()
  set.add(FILTER_DEFAULT_TAG)
  for (const it of Object.values(items)) {
    if (it.tags?.length) {
      for (const t of it.tags) set.add(normalizeFilterTag(t))
    } else {
      set.add(FILTER_DEFAULT_TAG)
    }
  }
  const list = [...set]
  list.sort((a, b) => {
    if (a === FILTER_DEFAULT_TAG) return -1
    if (b === FILTER_DEFAULT_TAG) return 1
    return a.localeCompare(b)
  })
  return list
}

export function normalizeBoardViewFilter(raw: Partial<BoardViewFilter> | undefined): BoardViewFilter {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_BOARD_VIEW_FILTER }
  return {
    includeTags: Array.isArray(raw.includeTags) ? [...raw.includeTags] : DEFAULT_BOARD_VIEW_FILTER.includeTags,
    hideDoneItems: raw.hideDoneItems ?? DEFAULT_BOARD_VIEW_FILTER.hideDoneItems,
    showTimelineBars: raw.showTimelineBars ?? DEFAULT_BOARD_VIEW_FILTER.showTimelineBars,
  }
}
