import type { RangeEntity } from '../types/entities'
import type { DayLayout, RangeEditPreview } from '../types/state'
import { compareDateKeys, getDaysInMonth, parseDateKey, toDateKey } from './date'
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

export function layoutMonthGanttSegments(
  ranges: Record<string, RangeEntity>,
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
    color: string
    kind: RangeEntity['kind']
    priority: number
  }
  const raw: Raw[] = []
  for (const range of Object.values(ranges)) {
    if (effectiveTimelineBarHidden(range, rangeEditPreview)) continue
    const clip = rangeClipToMonth(range, year, month)
    if (!clip) continue
    const vis = resolveRangeVisual(range, rangeEditPreview)
    raw.push({
      rangeId: range.id,
      startKey: clip.startKey,
      endKey: clip.endKey,
      dayStart: clip.dayStart,
      dayEnd: clip.dayEnd,
      color: vis.color,
      kind: vis.kind,
      priority: effectiveTimelinePriority(range, rangeEditPreview),
    })
  }

  raw.sort(
    (a, b) =>
      b.priority - a.priority
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
        const col0 = dayColumn(seg.dayStart, dayLayout, firstDow)
        const col1 = dayColumn(seg.dayEnd, dayLayout, firstDow)
        const x = cellOuterLeft(col0)
        const x2 = cellOuterLeft(col1) + BASE_CELL_WIDTH
        const width = Math.max(x2 - x, 1)
        const y = cellHeight - BOTTOM_PAD - BAR_H - track * (BAR_H + BAR_GAP)
        out.push({ ...seg, track, x, width, y, height: BAR_H })
        placed = true
        break
      }
    }
    if (!placed) {
      const track = MAX_TRACKS - 1
      const col0 = dayColumn(seg.dayStart, dayLayout, firstDow)
      const col1 = dayColumn(seg.dayEnd, dayLayout, firstDow)
      const x = cellOuterLeft(col0)
      const x2 = cellOuterLeft(col1) + BASE_CELL_WIDTH
      const width = Math.max(x2 - x, 1)
      const y = cellHeight - BOTTOM_PAD - BAR_H - track * (BAR_H + BAR_GAP)
      out.push({ ...seg, track, x, width, y, height: BAR_H })
    }
  }

  return out
}
