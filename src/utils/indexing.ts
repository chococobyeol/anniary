import type { ItemEntity, RangeEntity } from '../types/entities'
import { getDateKeysBetween } from './date'

export type DateIndex<T> = Record<string, T[]>

/** One entry per item.date only — task title lines appear on the anchor day, not on every day of a period */
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
