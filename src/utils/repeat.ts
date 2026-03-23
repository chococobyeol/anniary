import type {
  ItemEntity,
  ItemRepeatRule,
  ItemStoredRepeat,
  LegacyItemRepeat,
  Weekday1to7,
} from '../types/entities'
import {
  compareDateKeys,
  getDateKeysBetween,
  getDaysInMonth,
  parseDateKey,
  toDateKey,
} from './date'

function maxKey(a: string, b: string): string {
  return compareDateKeys(a, b) >= 0 ? a : b
}

function minKey(a: string, b: string): string {
  return compareDateKeys(a, b) <= 0 ? a : b
}

function addDaysToKey(key: string, days: number): string {
  const { year, month, day } = parseDateKey(key)
  const d = new Date(year, month, day)
  d.setDate(d.getDate() + days)
  return toDateKey(d.getFullYear(), d.getMonth(), d.getDate())
}

/** 해당 날짜가 속한 주의 월요일 (로컬 달력, ISO와 동일) */
function mondayOfWeekForKey(dateKey: string): string {
  const { year, month, day } = parseDateKey(dateKey)
  const d = new Date(year, month, day)
  const dow = d.getDay()
  const delta = dow === 0 ? -6 : 1 - dow
  d.setDate(d.getDate() + delta)
  return toDateKey(d.getFullYear(), d.getMonth(), d.getDate())
}

/** 두 날짜 각각이 속한 주의 월요일 사이가 몇 주인지 (같은 주면 0) */
function weeksBetweenMondays(anchorKey: string, candidateKey: string): number {
  const a = mondayOfWeekForKey(anchorKey)
  const b = mondayOfWeekForKey(candidateKey)
  const pa = parseDateKey(a)
  const pb = parseDateKey(b)
  const da = Date.UTC(pa.year, pa.month, pa.day)
  const db = Date.UTC(pb.year, pb.month, pb.day)
  return Math.round((db - da) / (7 * 86400000))
}

/** JS getDay() 0=일 → mwohaji 1=월…7=일 */
export function mwohajiWeekdayFromDateKey(dateKey: string): Weekday1to7 {
  const { year, month, day } = parseDateKey(dateKey)
  const js = new Date(year, month, day).getDay()
  return (js === 0 ? 7 : js) as Weekday1to7
}

function isLegacyRepeat(r: ItemStoredRepeat): r is LegacyItemRepeat {
  return 'frequency' in r && !('kind' in r)
}

/**
 * 저장된 repeat를 런타임 규칙으로 (구 frequency → kind).
 * `anchorDate`는 weekly/monthly 레거시 해석에 필요.
 */
export function getEffectiveItemRepeat(
  item: Pick<ItemEntity, 'date' | 'endDate' | 'repeat'>
): ItemRepeatRule | undefined {
  const raw = item.repeat
  if (!raw) return undefined
  if (!isLegacyRepeat(raw)) return raw

  const u = raw.untilDate
  const anchor = item.date
  if (!anchor) return undefined

  switch (raw.frequency) {
    case 'daily':
      return { kind: 'daily', everyNDays: 1, untilDate: u }
    case 'weekly':
      return { kind: 'weekly', weekdays: [mwohajiWeekdayFromDateKey(anchor)], untilDate: u }
    case 'monthly':
      return { kind: 'monthly', monthDays: [parseDateKey(anchor).day], untilDate: u }
    case 'yearly':
      return { kind: 'yearly', untilDate: u }
    default:
      return undefined
  }
}

export function isSingleDayItemForRepeat(item: ItemEntity): boolean {
  if (!item.date) return false
  const end = item.endDate ?? item.date
  return end === item.date
}

export function hasRepeatDatesExpanded(item: ItemEntity): boolean {
  const r = getEffectiveItemRepeat(item)
  if (!r || !isSingleDayItemForRepeat(item)) return false
  return r.kind !== 'interval'
}

/** 하루짜리(시작일=종료일)일 때만 반복 날짜 확장 — 기간 막대는 range와 동일 색으로 발생일마다 */
export function expandRepeatDateKeys(
  anchor: string,
  rule: ItemRepeatRule,
  boardYear: number
): string[] {
  if (rule.kind === 'interval') return []

  const yStart = `${boardYear}-01-01`
  const yEnd = `${boardYear}-12-31`
  const cap = rule.untilDate != null ? minKey(rule.untilDate, yEnd) : yEnd
  if (compareDateKeys(anchor, cap) > 0) return []

  switch (rule.kind) {
    case 'daily': {
      const step = Math.max(1, Math.floor(rule.everyNDays))
      const keys: string[] = []
      let d = anchor
      if (compareDateKeys(d, yStart) < 0) {
        while (compareDateKeys(d, yStart) < 0) {
          d = addDaysToKey(d, step)
        }
      }
      while (compareDateKeys(d, cap) <= 0) {
        if (compareDateKeys(d, yEnd) <= 0 && compareDateKeys(d, yStart) >= 0) {
          keys.push(d)
        }
        d = addDaysToKey(d, step)
      }
      return keys
    }
    case 'weekly': {
      const nWeeks = Math.max(1, Math.floor(rule.everyNWeeks ?? 1))
      let days = rule.weekdays?.length ? [...new Set(rule.weekdays)] : [mwohajiWeekdayFromDateKey(anchor)]
      days = days.filter(w => w >= 1 && w <= 7)
      if (days.length === 0) days = [mwohajiWeekdayFromDateKey(anchor)]
      const set = new Set(days)
      const first = maxKey(anchor, yStart)
      const last = minKey(cap, yEnd)
      return getDateKeysBetween(first, last).filter(k => {
        if (!set.has(mwohajiWeekdayFromDateKey(k))) return false
        const w = weeksBetweenMondays(anchor, k)
        if (w < 0) return false
        return w % nWeeks === 0
      })
    }
    case 'monthly': {
      const nMonths = Math.max(1, Math.floor(rule.everyNMonths ?? 1))
      let mds = rule.monthDays?.length
        ? [...new Set(rule.monthDays)].filter(x => x >= 1 && x <= 31)
        : [parseDateKey(anchor).day]
      if (mds.length === 0) mds = [parseDateKey(anchor).day]
      const anchorP = parseDateKey(anchor)
      const anchorMonthIdx = anchorP.year * 12 + anchorP.month
      const keys: string[] = []
      for (let month = 0; month < 12; month++) {
        const curIdx = boardYear * 12 + month
        const diff = curIdx - anchorMonthIdx
        if (diff < 0 || diff % nMonths !== 0) continue
        const dim = getDaysInMonth(boardYear, month)
        for (const dom of mds) {
          const d = Math.min(dom, dim)
          const key = toDateKey(boardYear, month, d)
          if (compareDateKeys(key, anchor) < 0 || compareDateKeys(key, cap) > 0) continue
          if (compareDateKeys(key, yStart) >= 0 && compareDateKeys(key, yEnd) <= 0) {
            keys.push(key)
          }
        }
      }
      keys.sort(compareDateKeys)
      return keys
    }
    case 'yearly': {
      const an = parseDateKey(anchor)
      const dim = getDaysInMonth(boardYear, an.month)
      const dom = Math.min(an.day, dim)
      const d = toDateKey(boardYear, an.month, dom)
      if (compareDateKeys(d, anchor) < 0 || compareDateKeys(d, cap) > 0) return []
      if (compareDateKeys(d, yStart) < 0 || compareDateKeys(d, yEnd) > 0) return []
      return [d]
    }
  }
}

export function getIndexedDateKeysForItem(item: ItemEntity, boardYear: number): string[] {
  if (!item.date) return []
  const rule = getEffectiveItemRepeat(item)
  if (!rule || !isSingleDayItemForRepeat(item)) {
    return [item.date]
  }
  if (rule.kind === 'interval') {
    return [item.date]
  }
  return expandRepeatDateKeys(item.date, rule, boardYear)
}

export function itemOccursOnDate(item: ItemEntity, dateKey: string, boardYear: number): boolean {
  if (!item.date) return false
  const yStart = `${boardYear}-01-01`
  const yEnd = `${boardYear}-12-31`
  if (compareDateKeys(dateKey, yStart) < 0 || compareDateKeys(dateKey, yEnd) > 0) return false

  const rule = getEffectiveItemRepeat(item)
  if (!rule || !isSingleDayItemForRepeat(item)) {
    return item.date === dateKey
  }
  if (rule.kind === 'interval') {
    return item.date === dateKey
  }

  const cap = rule.untilDate != null ? minKey(rule.untilDate, yEnd) : yEnd
  if (compareDateKeys(dateKey, item.date) < 0 || compareDateKeys(dateKey, cap) > 0) return false

  switch (rule.kind) {
    case 'daily': {
      const step = Math.max(1, Math.floor(rule.everyNDays))
      const d = item.date
      if (compareDateKeys(d, dateKey) > 0) return false
      if (compareDateKeys(d, dateKey) === 0) return true
      const diff =
        (Date.UTC(parseDateKey(dateKey).year, parseDateKey(dateKey).month, parseDateKey(dateKey).day) -
          Date.UTC(parseDateKey(d).year, parseDateKey(d).month, parseDateKey(d).day)) /
        86400000
      return diff >= 0 && diff % step === 0
    }
    case 'weekly': {
      const nWeeks = Math.max(1, Math.floor(rule.everyNWeeks ?? 1))
      let days = rule.weekdays?.length ? rule.weekdays : [mwohajiWeekdayFromDateKey(item.date)]
      days = days.filter(w => w >= 1 && w <= 7)
      if (days.length === 0) days = [mwohajiWeekdayFromDateKey(item.date)]
      const set = new Set(days)
      if (!set.has(mwohajiWeekdayFromDateKey(dateKey))) return false
      const w = weeksBetweenMondays(item.date, dateKey)
      return w >= 0 && w % nWeeks === 0
    }
    case 'monthly': {
      const nMonths = Math.max(1, Math.floor(rule.everyNMonths ?? 1))
      const mds = rule.monthDays?.length
        ? [...new Set(rule.monthDays)].filter(x => x >= 1 && x <= 31)
        : [parseDateKey(item.date).day]
      const anchorP = parseDateKey(item.date)
      const c = parseDateKey(dateKey)
      const diffMonths = (c.year - anchorP.year) * 12 + (c.month - anchorP.month)
      if (diffMonths < 0 || diffMonths % nMonths !== 0) return false
      const dim = getDaysInMonth(c.year, c.month)
      const dom = c.day
      return mds.some(md => Math.min(md, dim) === dom)
    }
    case 'yearly': {
      const an = parseDateKey(item.date)
      const c = parseDateKey(dateKey)
      const dim = getDaysInMonth(c.year, an.month)
      const dom = Math.min(an.day, dim)
      const expected = toDateKey(c.year, an.month, dom)
      return expected === dateKey
    }
  }
}

export function expandRepeatDateKeysInMonth(
  anchor: string,
  rule: ItemRepeatRule,
  year: number,
  month: number
): string[] {
  const all = expandRepeatDateKeys(anchor, rule, year)
  const dim = getDaysInMonth(year, month)
  const first = toDateKey(year, month, 1)
  const last = toDateKey(year, month, dim)
  return all.filter(k => compareDateKeys(k, first) >= 0 && compareDateKeys(k, last) <= 0)
}

export function formatRepeatRule(rule: ItemRepeatRule): string {
  const u = rule.kind !== 'interval' && rule.untilDate ? ` ~${rule.untilDate}` : ''
  switch (rule.kind) {
    case 'daily': {
      const n = rule.everyNDays
      return n <= 1 ? `Every day${u}` : `Every ${n} days${u}`
    }
    case 'weekly': {
      const nw = Math.max(1, Math.floor(rule.everyNWeeks ?? 1))
      const wk = nw <= 1 ? 'Weekly' : `Every ${nw} weeks`
      return `${wk} (${rule.weekdays?.length ?? 0} weekdays)${u}`
    }
    case 'monthly': {
      const nm = Math.max(1, Math.floor(rule.everyNMonths ?? 1))
      const mo = nm <= 1 ? 'Monthly' : `Every ${nm} months`
      return `${mo} (${(rule.monthDays ?? []).length} dates)${u}`
    }
    case 'yearly':
      return `Yearly${u}`
    case 'interval': {
      const lim = rule.limit != null ? `, max ${rule.limit}×` : ''
      return `Every ${rule.everyNMinutes} min${lim}`
    }
  }
}

export function formatRepeatSummary(item: ItemEntity): string {
  const rule = getEffectiveItemRepeat(item)
  if (!rule) return ''
  return formatRepeatRule(rule)
}

/** range 막대를 반복 occurrence마다 그릴 때, 해당 rangeId를 스킵(중복 방지) */
export function rangeIdsWithRepeatBars(items: Record<string, ItemEntity>): Set<string> {
  const s = new Set<string>()
  for (const it of Object.values(items)) {
    if (!it.rangeId) continue
    if (!hasRepeatDatesExpanded(it)) continue
    if (!isSingleDayItemForRepeat(it)) continue
    s.add(it.rangeId)
  }
  return s
}
