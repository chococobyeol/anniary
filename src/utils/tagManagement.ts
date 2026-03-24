import type { ItemEntity } from '../types/entities'
import { FILTER_DEFAULT_TAG, normalizeFilterTag } from './boardViewFilter'

/** item이 암시적으로 쓰는 태그 집합(빈 tags → General) */
export function itemEffectiveTagSet(item: ItemEntity): Set<string> {
  const s = new Set<string>()
  if (item.tags?.length) {
    for (const t of item.tags) s.add(normalizeFilterTag(t))
  } else {
    s.add(FILTER_DEFAULT_TAG)
  }
  return s
}

export function countItemsPerTag(items: Record<string, ItemEntity>): Map<string, number> {
  const m = new Map<string, number>()
  for (const it of Object.values(items)) {
    for (const tag of itemEffectiveTagSet(it)) {
      m.set(tag, (m.get(tag) ?? 0) + 1)
    }
  }
  return m
}

export function sortedTagRows(counts: Map<string, number>): { tag: string; count: number }[] {
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => {
      if (a.tag === FILTER_DEFAULT_TAG) return -1
      if (b.tag === FILTER_DEFAULT_TAG) return 1
      return a.tag.localeCompare(b.tag)
    })
}

/** 이 태그가 effective set에 포함된 item id (다중 태그 item도 포함 → 삭제 시 전체 item 제거) */
export function itemIdsHavingTag(items: Record<string, ItemEntity>, tagRaw: string): string[] {
  const n = normalizeFilterTag(tagRaw)
  return Object.entries(items)
    .filter(([, item]) => itemEffectiveTagSet(item).has(n))
    .map(([id]) => id)
}

function dedupeTagsPreserveOrder(tags: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const t of tags) {
    const n = normalizeFilterTag(t)
    if (!seen.has(n)) {
      seen.add(n)
      out.push(n)
    }
  }
  return out
}

/** `from` → `to` 로 치환한 뒤의 tags. 변경 없으면 null */
export function tagsAfterRename(
  item: ItemEntity,
  fromRaw: string,
  toRaw: string
): string[] | null {
  const from = normalizeFilterTag(fromRaw)
  const to = normalizeFilterTag(toRaw)
  if (from === to) return null

  if (!item.tags?.length) {
    if (from === FILTER_DEFAULT_TAG) return [to]
    return null
  }

  let changed = false
  const mapped = item.tags.map(t => {
    const n = normalizeFilterTag(t)
    if (n === from) {
      changed = true
      return to
    }
    return n
  })
  if (!changed) return null
  return dedupeTagsPreserveOrder(mapped)
}

/** `from` 제거 후 비면 `replacement` 단일 태그. 변경 없으면 null */
export function tagsAfterRemove(
  item: ItemEntity,
  fromRaw: string,
  replacementRaw: string
): string[] | null {
  const from = normalizeFilterTag(fromRaw)
  const replacement = normalizeFilterTag(replacementRaw)
  if (from === replacement) return null

  if (!item.tags?.length) {
    if (from === FILTER_DEFAULT_TAG) return [replacement]
    return null
  }

  const filtered = item.tags.filter(t => normalizeFilterTag(t) !== from)
  if (filtered.length === item.tags.length) return null

  if (filtered.length === 0) return [replacement]
  return dedupeTagsPreserveOrder(filtered.map(normalizeFilterTag))
}
