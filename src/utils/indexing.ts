import type { ItemEntity, RangeEntity } from '../types/entities'

export type DateIndex<T> = Record<string, T[]>

export function buildItemDateIndex(items: Record<string, ItemEntity>): DateIndex<ItemEntity> {
  const index: DateIndex<ItemEntity> = {}
  for (const item of Object.values(items)) {
    if (item.date) {
      if (!index[item.date]) index[item.date] = []
      index[item.date].push(item)
    }
  }
  return index
}

export function buildRangeDateIndex(ranges: Record<string, RangeEntity>): DateIndex<RangeEntity> {
  const index: DateIndex<RangeEntity> = {}
  for (const range of Object.values(ranges)) {
    const start = new Date(range.startDate)
    const end = new Date(range.endDate)
    const cursor = new Date(start)
    while (cursor <= end) {
      const key = cursor.toISOString().slice(0, 10)
      if (!index[key]) index[key] = []
      index[key].push(range)
      cursor.setDate(cursor.getDate() + 1)
    }
  }
  return index
}
