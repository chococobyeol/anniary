import type { ItemEntity, RangeEntity } from '../types/entities'
import type { DayLayout, RangeEditPreview } from '../types/state'
import { compareDateKeys, getDaysInMonth, parseDateKey, toDateKey } from './date'
import { parseTimeToDayFraction } from './timeOfDay'
import {
  expandRepeatDateKeysInMonth,
  getEffectiveItemRepeat,
  hasRepeatDatesExpanded,
  isSingleDayItemForRepeat,
  rangeIdsWithRepeatBars,
} from './repeat'
import { BASE_CELL_WIDTH, MONTH_HEADER_WIDTH } from './zoom'

export type MonthGanttSegment = {
  rangeId: string
  startKey: string
  endKey: string
  dayStart: number
  dayEnd: number
  color: string
  kind: RangeEntity['kind']
  track: number
  x: number
  width: number
  y: number
  height: number
}

/** Clip range to this calendar month; return day-of-month span (1-based, inclusive). */
export function rangeClipToMonth(
  range: RangeEntity,
  year: number,
  month: number
): { startKey: string; endKey: string; dayStart: number; dayEnd: number } | null {
  const dim = getDaysInMonth(year, month)
  const monthFirst = toDateKey(year, month, 1)
  const monthLast = toDateKey(year, month, dim)
  if (compareDateKeys(range.endDate, monthFirst) < 0 || compareDateKeys(range.startDate, monthLast) > 0) {
    return null
  }
  const visStart = compareDateKeys(range.startDate, monthFirst) < 0 ? monthFirst : range.startDate
  const visEnd = compareDateKeys(range.endDate, monthLast) > 0 ? monthLast : range.endDate
  const ps = parseDateKey(visStart)
  const pe = parseDateKey(visEnd)
  const dayStart = ps.year === year && ps.month === month ? ps.day : 1
  const dayEnd = pe.year === year && pe.month === month ? pe.day : dim
  return { startKey: visStart, endKey: visEnd, dayStart, dayEnd }
}

export function dayColumn(day: number, dayLayout: DayLayout, firstDow: number): number {
  return dayLayout === 'weekday-aligned' ? firstDow + (day - 1) : day - 1
}

export function cellOuterLeft(col: number): number {
  return MONTH_HEADER_WIDTH + col * (BASE_CELL_WIDTH + 1)
}

const BAR_H = 2.4
const BAR_GAP = 1.2
const BOTTOM_PAD = 3.5
const MAX_TRACKS = 5

/** Layout horizontal bars + non-overlapping tracks for this month row */
function resolveRangeVisual(range: RangeEntity, preview: RangeEditPreview | null): { color: string; kind: RangeEntity['kind'] } {
  if (!preview || preview.rangeId !== range.id) {
    return { color: range.color || 'var(--range-default)', kind: range.kind }
  }
  return {
    color: (preview.color !== undefined ? preview.color : range.color) || 'var(--range-default)',
    kind: preview.kind !== undefined ? preview.kind : range.kind,
  }
}

function effectiveTimelineBarHidden(range: RangeEntity, preview: RangeEditPreview | null): boolean {
  if (preview?.rangeId === range.id && preview.timelineBarHidden !== undefined) {
    return preview.timelineBarHidden
  }
  return range.timelineBarHidden === true
}

function effectiveTimelinePriority(range: RangeEntity, preview: RangeEditPreview | null): number {
  if (preview?.rangeId === range.id && preview.timelinePriority !== undefined) {
    return preview.timelinePriority
  }
  return range.timelinePriority ?? 0
}

function effectiveBarStartTime(range: RangeEntity, preview: RangeEditPreview | null): string | undefined {
  if (preview?.rangeId === range.id && Object.prototype.hasOwnProperty.call(preview, 'barStartTime')) {
    const v = preview.barStartTime?.trim()
    return v || undefined
  }
  return range.barStartTime
}

function effectiveBarEndTime(range: RangeEntity, preview: RangeEditPreview | null): string | undefined {
  if (preview?.rangeId === range.id && Object.prototype.hasOwnProperty.call(preview, 'barEndTime')) {
    const v = preview.barEndTime?.trim()
    return v || undefined
  }
  return range.barEndTime
}

/** Fractions of cell width [0,1] for first/last visible day in this month clip */
function cellTimeFractionsForClip(
  range: RangeEntity,
  clip: { startKey: string; endKey: string; dayStart: number; dayEnd: number },
  preview: RangeEditPreview | null
): { startCellFrac: number; endCellFrac: number } {
  let startCellFrac = 0
  if (clip.startKey === range.startDate) {
    const f = parseTimeToDayFraction(effectiveBarStartTime(range, preview))
    if (f !== undefined) startCellFrac = Math.min(1, Math.max(0, f))
  }
  let endCellFrac = 1
  if (clip.endKey === range.endDate) {
    const f = parseTimeToDayFraction(effectiveBarEndTime(range, preview))
    if (f !== undefined) endCellFrac = Math.min(1, Math.max(0, f))
  }
  if (clip.startKey === clip.endKey && startCellFrac >= endCellFrac) {
    return { startCellFrac: 0, endCellFrac: 1 }
  }
  return { startCellFrac, endCellFrac }
}

function segmentLeftWidth(
  seg: { dayStart: number; dayEnd: number; startCellFrac: number; endCellFrac: number },
  dayLayout: DayLayout,
  firstDow: number
): { x: number; width: number } {
  const col0 = dayColumn(seg.dayStart, dayLayout, firstDow)
  const col1 = dayColumn(seg.dayEnd, dayLayout, firstDow)
  const left = cellOuterLeft(col0) + seg.startCellFrac * BASE_CELL_WIDTH
  const right = cellOuterLeft(col1) + seg.endCellFrac * BASE_CELL_WIDTH
  const width = Math.max(right - left, 1)
  return { x: left, width }
}

export function layoutMonthGanttSegments(
  ranges: Record<string, RangeEntity>,
  items: Record<string, ItemEntity>,
  year: number,
  month: number,
  dayLayout: DayLayout,
  firstDow: number,
  cellHeight: number,
  rangeEditPreview: RangeEditPreview | null = null
): MonthGanttSegment[] {
  type Raw = {
    rangeId: string
    startKey: string
    endKey: string
    dayStart: number
    dayEnd: number
    startCellFrac: number
    endCellFrac: number
    color: string
    kind: RangeEntity['kind']
    priority: number
  }
  const raw: Raw[] = []
  const skipRangeIds = rangeIdsWithRepeatBars(items)

  for (const range of Object.values(ranges)) {
    if (skipRangeIds.has(range.id)) continue
    if (effectiveTimelineBarHidden(range, rangeEditPreview)) continue
    const clip = rangeClipToMonth(range, year, month)
    if (!clip) continue
    const vis = resolveRangeVisual(range, rangeEditPreview)
    const { startCellFrac, endCellFrac } = cellTimeFractionsForClip(range, clip, rangeEditPreview)
    raw.push({
      rangeId: range.id,
      startKey: clip.startKey,
      endKey: clip.endKey,
      dayStart: clip.dayStart,
      dayEnd: clip.dayEnd,
      startCellFrac,
      endCellFrac,
      color: vis.color,
      kind: vis.kind,
      priority: effectiveTimelinePriority(range, rangeEditPreview),
    })
  }

  for (const item of Object.values(items)) {
    if (!item.rangeId || !hasRepeatDatesExpanded(item) || !isSingleDayItemForRepeat(item)) continue
    const range = ranges[item.rangeId]
    if (!range) continue
    if (range.startDate !== range.endDate || range.startDate !== item.date) continue
    if (effectiveTimelineBarHidden(range, rangeEditPreview)) continue
    const rule = getEffectiveItemRepeat(item)
    if (!rule) continue
    const occKeys = expandRepeatDateKeysInMonth(item.date, rule, year, month)
    const vis = resolveRangeVisual(range, rangeEditPreview)
    const pr = effectiveTimelinePriority(range, rangeEditPreview)
    for (const occKey of occKeys) {
      const synth: RangeEntity = { ...range, startDate: occKey, endDate: occKey }
      const clip = rangeClipToMonth(synth, year, month)
      if (!clip) continue
      const { startCellFrac, endCellFrac } = cellTimeFractionsForClip(synth, clip, rangeEditPreview)
      raw.push({
        rangeId: range.id,
        startKey: clip.startKey,
        endKey: clip.endKey,
        dayStart: clip.dayStart,
        dayEnd: clip.dayEnd,
        startCellFrac,
        endCellFrac,
        color: vis.color,
        kind: vis.kind,
        priority: pr,
      })
    }
  }

  raw.sort(
    (a, b) =>
      a.priority - b.priority
      || compareDateKeys(a.startKey, b.startKey)
      || compareDateKeys(a.endKey, b.endKey)
      || a.rangeId.localeCompare(b.rangeId)
  )

  const tracks: { start: string; end: string }[][] = []
  const out: MonthGanttSegment[] = []

  for (const seg of raw) {
    let placed = false
    for (let track = 0; track < MAX_TRACKS; track++) {
      const row = tracks[track] ?? (tracks[track] = [])
      const noOverlap = row.every(
        t => compareDateKeys(seg.endKey, t.start) < 0 || compareDateKeys(seg.startKey, t.end) > 0
      )
      if (noOverlap) {
        row.push({ start: seg.startKey, end: seg.endKey })
        const { x, width } = segmentLeftWidth(seg, dayLayout, firstDow)
        const y = cellHeight - BOTTOM_PAD - BAR_H - track * (BAR_H + BAR_GAP)
        const { startCellFrac: _sc, endCellFrac: _ec, ...restSeg } = seg
        out.push({ ...restSeg, track, x, width, y, height: BAR_H })
        placed = true
        break
      }
    }
    if (!placed) {
      const track = MAX_TRACKS - 1
      const { x, width } = segmentLeftWidth(seg, dayLayout, firstDow)
      const y = cellHeight - BOTTOM_PAD - BAR_H - track * (BAR_H + BAR_GAP)
      const { startCellFrac: _sc2, endCellFrac: _ec2, ...restSeg } = seg
      out.push({ ...restSeg, track, x, width, y, height: BAR_H })
    }
  }

  return out
}
