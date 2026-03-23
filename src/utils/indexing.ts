import type { ItemEntity, RangeEntity } from '../types/entities'
import { getDateKeysBetween } from './date'
import { getIndexedDateKeysForItem } from './repeat'

export type DateIndex<T> = Record<string, T[]>

/**
 * 각 날짜 키에 그날 보여줄 item 목록.
 * `repeat`가 있으면 보드 연도 안 발생일마다 동일 item을 인덱싱(참조 동일).
 */
export function buildItemDateIndex(
  items: Record<string, ItemEntity>,
  boardYear: number
): DateIndex<ItemEntity> {
  const index: DateIndex<ItemEntity> = {}
  for (const item of Object.values(items)) {
    if (!item.date) continue
    for (const key of getIndexedDateKeysForItem(item, boardYear)) {
      if (!index[key]) index[key] = []
      index[key].push(item)
    }
  }
  return index
}

/** Period / range bars: one entry per calendar day from startDate through endDate (see getDateKeysBetween) */
export function buildRangeDateIndex(ranges: Record<string, RangeEntity>): DateIndex<RangeEntity> {
  const index: DateIndex<RangeEntity> = {}
  for (const range of Object.values(ranges)) {
    for (const key of getDateKeysBetween(range.startDate, range.endDate)) {
      if (!index[key]) index[key] = []
      index[key].push(range)
    }
  }
  return index
}
