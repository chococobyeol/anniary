import type { ItemEntity, RangeEntity } from '../types/entities'
import type { DayLayout, RangeEditPreview, ZoomLevel } from '../types/state'
import { compareDateKeys, getDateKeysBetween, getDaysInMonth, parseDateKey, toDateKey } from './date'
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
  /** In-bar label; null when zoom is low or bar is too narrow */
  displayLabel: string | null
  labelFontSize: number
  /** Stack-count etc.: center label in bar */
  labelCentered?: boolean
  /** Multi-day bars: center label on bar (`x + width/2`) */
  labelTextAnchor?: 'start' | 'middle'
  /** Same-rect overflow: bottom→top paint order, semi-transparent blend */
  stackLayers?: { color: string; kind: RangeEntity['kind'] }[]
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

const BAR_H_COMPACT = 2.4
const BAR_GAP_COMPACT = 1.2
const BOTTOM_PAD_COMPACT = 3.5

const MAX_TRACKS = 5

/** Bars must stay at or below this y so the day number (top ~12) stays readable */
const GANTT_RESERVED_TOP = 13.5

function ganttLayoutMetrics(zoomLevel: ZoomLevel): {
  barH: number
  barGap: number
  bottomPad: number
  labels: boolean
} {
  switch (zoomLevel) {
    case 'Z0':
    case 'Z1':
      return { barH: BAR_H_COMPACT, barGap: BAR_GAP_COMPACT, bottomPad: BOTTOM_PAD_COMPACT, labels: false }
    case 'Z2':
      return { barH: 2.75, barGap: 0.5, bottomPad: 2.4, labels: true }
    case 'Z3':
      return { barH: 3.0, barGap: 0.48, bottomPad: 2.35, labels: true }
    case 'Z4':
      return { barH: 3.25, barGap: 0.45, bottomPad: 2.3, labels: true }
    default:
      return { barH: BAR_H_COMPACT, barGap: BAR_GAP_COMPACT, bottomPad: BOTTOM_PAD_COMPACT, labels: false }
  }
}

/** Vertical stack height for up to MAX_TRACKS bars */
function ganttStackHeight(metrics: { barH: number; barGap: number; bottomPad: number }): number {
  return metrics.bottomPad + metrics.barH + (MAX_TRACKS - 1) * (metrics.barH + metrics.barGap)
}

function labelForRange(range: RangeEntity, items: Record<string, ItemEntity>): string {
  const lb = range.label?.trim()
  if (lb) return lb
  for (const it of Object.values(items)) {
    if (it.rangeId !== range.id) continue
    const t = it.title?.trim()
    if (t) return t
  }
  return ''
}

function countLinkedItems(items: Record<string, ItemEntity>, rangeId: string): number {
  let n = 0
  for (const it of Object.values(items)) {
    if (it.rangeId === rangeId) n += 1
  }
  return n
}

function computeBarLabel(
  range: RangeEntity,
  items: Record<string, ItemEntity>,
  barWidth: number,
  zoomLevel: ZoomLevel,
  barH: number,
  labelsEnabled: boolean
): { displayLabel: string | null; labelFontSize: number } {
  if (!labelsEnabled) return { displayLabel: null, labelFontSize: 0 }

  const minW = zoomLevel === 'Z2' ? 20 : zoomLevel === 'Z3' ? 18 : 16
  const nLinked = countLinkedItems(items, range.id)

  if (barWidth < minW) {
    if (nLinked >= 2) {
      const fs = Math.min(2.5, barH * 0.58)
      return { displayLabel: `+${nLinked}`, labelFontSize: fs }
    }
    return { displayLabel: null, labelFontSize: 0 }
  }

  const base = labelForRange(range, items)
  if (!base) return { displayLabel: null, labelFontSize: 0 }

  const charW = zoomLevel === 'Z4' ? 1.62 : zoomLevel === 'Z3' ? 1.55 : 1.5
  const inner = Math.max(0, barWidth - 3)
  const maxChars = Math.max(2, Math.floor(inner / charW))
  const truncated = base.length > maxChars ? `${base.slice(0, Math.max(1, maxChars - 1))}…` : base

  let fs = zoomLevel === 'Z4' ? 2.75 : zoomLevel === 'Z3' ? 2.6 : 2.45
  fs = Math.min(fs, barH * 0.58)

  return { displayLabel: truncated, labelFontSize: fs }
}

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

/** Date keys (yyyy-mm-dd) that have at least one gantt bar drawn through that day */
export function dateKeysUnderGanttBars(segments: MonthGanttSegment[]): Set<string> {
  const out = new Set<string>()
  for (const s of segments) {
    for (const k of getDateKeysBetween(s.startKey, s.endKey)) {
      out.add(k)
    }
  }
  return out
}

/** Same calendar day + same range stacked on multiple tracks → keep text on bottom track only */
function dedupeStackedSingleDayRangeLabels(segments: MonthGanttSegment[]): void {
  const groups = new Map<string, MonthGanttSegment[]>()
  for (const s of segments) {
    if (s.startKey !== s.endKey) continue
    const k = `${s.startKey}\0${s.rangeId}`
    const arr = groups.get(k) ?? []
    arr.push(s)
    groups.set(k, arr)
  }
  for (const arr of groups.values()) {
    if (arr.length < 2) continue
    const keeper = arr.reduce((a, b) => (a.track < b.track ? a : b))
    for (const s of arr) {
      if (s !== keeper) {
        s.displayLabel = null
        s.labelFontSize = 0
      }
    }
  }
}

/** Lower timeline priority = drawn earlier = bottom of stack; tie-break: earlier createdAt = bottom */
function compareRangeStackBottomOrder(
  aId: string,
  bId: string,
  ranges: Record<string, RangeEntity>,
  preview: RangeEditPreview | null
): number {
  const ra = ranges[aId]
  const rb = ranges[bId]
  if (!ra && !rb) return aId.localeCompare(bId)
  if (!ra) return 1
  if (!rb) return -1
  const pa = effectiveTimelinePriority(ra, preview)
  const pb = effectiveTimelinePriority(rb, preview)
  if (pa !== pb) return pa - pb
  const t = ra.createdAt.localeCompare(rb.createdAt)
  if (t !== 0) return t
  return aId.localeCompare(bId)
}

function stackSegmentsBottomToTop(
  arr: MonthGanttSegment[],
  ranges: Record<string, RangeEntity>,
  preview: RangeEditPreview | null
): MonthGanttSegment[] {
  return [...arr].sort((a, b) => compareRangeStackBottomOrder(a.rangeId, b.rangeId, ranges, preview))
}

/** 맨 위(표시 우선) range의 제목 + ` +n` (n = 그 아래 겹친 개수) */
function formatStackBarLabel(
  winner: RangeEntity | undefined,
  items: Record<string, ItemEntity>,
  stackCount: number,
  barWidth: number,
  zoomLevel: ZoomLevel,
  barH: number,
  labelsEnabled: boolean
): { displayLabel: string | null; labelFontSize: number } {
  const extras = stackCount - 1
  const suffix = ` +${extras}`
  const main = (winner ? labelForRange(winner, items).trim() : '') || '·'

  let fs = Math.min(barH * 0.58, zoomLevel === 'Z4' ? 2.65 : zoomLevel === 'Z3' ? 2.5 : 2.35)

  if (!labelsEnabled) {
    fs = Math.min(barH * 0.55, 2.4)
    const approxChar = 1.42
    const maxInner = Math.max(4, Math.floor((barWidth - 4) / approxChar))
    let text = `${main}${suffix}`
    if (text.length > maxInner) {
      const headBudget = Math.max(2, maxInner - suffix.length)
      const shortMain = main.length > headBudget ? `${main.slice(0, Math.max(1, headBudget - 1))}…` : main
      text = shortMain + suffix
    }
    return { displayLabel: text, labelFontSize: fs }
  }

  const full = `${main}${suffix}`
  const charW = zoomLevel === 'Z4' ? 1.52 : zoomLevel === 'Z3' ? 1.45 : 1.38
  const maxChars = Math.max(5, Math.floor((barWidth - 4) / charW))
  let displayLabel = full
  if (full.length > maxChars) {
    const sufLen = suffix.length
    const headBudget = Math.max(2, maxChars - sufLen)
    const shortMain = main.length > headBudget ? `${main.slice(0, Math.max(1, headBudget - 1))}…` : main
    displayLabel = shortMain + suffix
  }
  return { displayLabel, labelFontSize: fs }
}

/** Same track + same rect (overflow) → 반투명 색 겹침 + 최상단 range 라벨 + ` +n` */
function mergeCoincidentBarRects(
  segments: MonthGanttSegment[],
  ranges: Record<string, RangeEntity>,
  items: Record<string, ItemEntity>,
  zoomLevel: ZoomLevel,
  labelsEnabled: boolean,
  rangeEditPreview: RangeEditPreview | null
): MonthGanttSegment[] {
  const q = (n: number) => Math.round(n * 8) / 8
  const keyOf = (s: MonthGanttSegment) =>
    `${s.track}|${q(s.x)}|${q(s.y)}|${q(s.width)}|${q(s.height)}`

  const buckets = new Map<string, MonthGanttSegment[]>()
  for (const s of segments) {
    const k = keyOf(s)
    const arr = buckets.get(k) ?? []
    arr.push(s)
    buckets.set(k, arr)
  }

  const out: MonthGanttSegment[] = []
  let mergeIdx = 0
  for (const arr of buckets.values()) {
    if (arr.length === 1) {
      out.push(arr[0])
      continue
    }
    mergeIdx += 1
    const base = arr[0]
    const count = arr.length
    const bottomToTop = stackSegmentsBottomToTop(arr, ranges, rangeEditPreview)
    const stackLayers = bottomToTop.map(s => ({ color: s.color, kind: s.kind }))
    const topSeg = bottomToTop[bottomToTop.length - 1]
    const winnerRange = ranges[topSeg.rangeId]
    const { displayLabel, labelFontSize } = formatStackBarLabel(
      winnerRange,
      items,
      count,
      base.width,
      zoomLevel,
      base.height,
      labelsEnabled
    )
    out.push({
      ...topSeg,
      rangeId: `_merge_${mergeIdx}_${count}_${base.track}_${base.startKey}`,
      startKey: base.startKey,
      endKey: base.endKey,
      dayStart: base.dayStart,
      dayEnd: base.dayEnd,
      track: base.track,
      x: base.x,
      width: base.width,
      y: base.y,
      height: base.height,
      color: topSeg.color,
      kind: topSeg.kind,
      displayLabel,
      labelFontSize,
      labelCentered: false,
      labelTextAnchor: 'start',
      stackLayers,
    })
  }

  return out
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

const FRAC_EPS = 1e-9

/** barStart/barEnd로 첫·끝 칸이 종일(0~1)보다 좁게 그려지는지 */
function segmentUsesTimeOfDayClip(fracs: { startCellFrac: number; endCellFrac: number }): boolean {
  return fracs.startCellFrac > FRAC_EPS || fracs.endCellFrac < 1 - FRAC_EPS
}

/**
 * Hide time-of-day: **하루짜리 기간 + 이 달 한 칸**일 때만, 칸 안 시간 클립 막대를 숨김(null).
 * 여러 날짜 기간이거나 이 달 클립이 여러 칸이면 분수 그대로(시간 막대 유지, 종일로 펼치지 않음).
 */
function resolveFracsForTimeOfDayToggle(
  fracs: { startCellFrac: number; endCellFrac: number },
  rangeSpansMultipleCalendarDays: boolean,
  spanMultiDayInMonth: boolean,
  showTimeOfDay: boolean
): { startCellFrac: number; endCellFrac: number } | null {
  if (showTimeOfDay) return fracs
  const singleDayStrip =
    !rangeSpansMultipleCalendarDays && !spanMultiDayInMonth
  if (!singleDayStrip) return fracs
  if (segmentUsesTimeOfDayClip(fracs)) return null
  return fracs
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

/** Range bar only if at least one board-visible item links (respects hide-done / tag filter). */
function rangeHasLinkedItemInBoardItems(rangeId: string, items: Record<string, ItemEntity>): boolean {
  for (const it of Object.values(items)) {
    if (it.rangeId === rangeId) return true
  }
  return false
}

export type TimelineBarSpanVisibility = {
  multiDay: boolean
  singleDay: boolean
  /** false면 하루·한 칸+시간 클립만 숨김; 다일 막대는 분수 유지(펼치지 않음) */
  showTimeOfDay: boolean
}

const DEFAULT_TIMELINE_SPAN_VISIBILITY: TimelineBarSpanVisibility = {
  multiDay: true,
  singleDay: true,
  showTimeOfDay: true,
}

export function layoutMonthGanttSegments(
  ranges: Record<string, RangeEntity>,
  items: Record<string, ItemEntity>,
  year: number,
  month: number,
  dayLayout: DayLayout,
  firstDow: number,
  cellHeight: number,
  zoomLevel: ZoomLevel,
  rangeEditPreview: RangeEditPreview | null = null,
  spanVisibility: TimelineBarSpanVisibility = DEFAULT_TIMELINE_SPAN_VISIBILITY
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
    if (!rangeHasLinkedItemInBoardItems(range.id, items)) continue
    if (effectiveTimelineBarHidden(range, rangeEditPreview)) continue
    const clip = rangeClipToMonth(range, year, month)
    if (!clip) continue
    const spanMultiDayInMonth = clip.dayStart !== clip.dayEnd
    if (spanMultiDayInMonth && !spanVisibility.multiDay) continue
    const fracs0 = cellTimeFractionsForClip(range, clip, rangeEditPreview)
    if (!spanMultiDayInMonth && !spanVisibility.singleDay && !segmentUsesTimeOfDayClip(fracs0)) {
      continue
    }
    const vis = resolveRangeVisual(range, rangeEditPreview)
    const rangeSpansMultipleCalendarDays = range.startDate !== range.endDate
    const fracs = resolveFracsForTimeOfDayToggle(
      fracs0,
      rangeSpansMultipleCalendarDays,
      spanMultiDayInMonth,
      spanVisibility.showTimeOfDay
    )
    if (fracs === null) continue
    const { startCellFrac, endCellFrac } = fracs
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
      const spanMultiDayInMonth = clip.dayStart !== clip.dayEnd
      const rangeSpansMultipleCalendarDays = synth.startDate !== synth.endDate
      const fracs0 = cellTimeFractionsForClip(synth, clip, rangeEditPreview)
      if (!spanVisibility.singleDay && !segmentUsesTimeOfDayClip(fracs0)) continue
      const fracs = resolveFracsForTimeOfDayToggle(
        fracs0,
        rangeSpansMultipleCalendarDays,
        spanMultiDayInMonth,
        spanVisibility.showTimeOfDay
      )
      if (fracs === null) continue
      const { startCellFrac, endCellFrac } = fracs
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

  const metrics0 = ganttLayoutMetrics(zoomLevel)
  let barH = metrics0.barH
  let barGap = metrics0.barGap
  const bottomPad = metrics0.bottomPad
  const labelsEnabled = metrics0.labels

  const topOfHighestTrack = (): number =>
    cellHeight - bottomPad - barH - (MAX_TRACKS - 1) * (barH + barGap)

  while (
    (topOfHighestTrack() < GANTT_RESERVED_TOP - 0.02
      || ganttStackHeight({ barH, barGap, bottomPad }) > cellHeight - 0.25)
    && (barH > BAR_H_COMPACT + 0.02 || barGap > 0.38)
  ) {
    barH = Math.max(BAR_H_COMPACT, barH - 0.16)
    barGap = Math.max(0.38, barGap - 0.05)
  }

  const tracks: { start: string; end: string }[][] = []
  const out: MonthGanttSegment[] = []

  const pushSegment = (seg: Raw, track: number) => {
    const { x, width } = segmentLeftWidth(seg, dayLayout, firstDow)
    const y = cellHeight - bottomPad - barH - track * (barH + barGap)
    const { startCellFrac: _sc, endCellFrac: _ec, ...restSeg } = seg
    const rangeEnt = ranges[seg.rangeId]
    const { displayLabel, labelFontSize } = rangeEnt
      ? computeBarLabel(rangeEnt, items, width, zoomLevel, barH, labelsEnabled)
      : { displayLabel: null, labelFontSize: 0 }
    const spansMultipleDays = seg.dayStart !== seg.dayEnd
    const labelTextAnchor: 'start' | 'middle' =
      spansMultipleDays && width >= BASE_CELL_WIDTH + 2 ? 'middle' : 'start'
    out.push({
      ...restSeg,
      track,
      x,
      width,
      y,
      height: barH,
      displayLabel,
      labelFontSize,
      labelTextAnchor,
    })
  }

  for (const seg of raw) {
    let placed = false
    for (let track = 0; track < MAX_TRACKS; track++) {
      const row = tracks[track] ?? (tracks[track] = [])
      const noOverlap = row.every(
        t => compareDateKeys(seg.endKey, t.start) < 0 || compareDateKeys(seg.startKey, t.end) > 0
      )
      if (noOverlap) {
        row.push({ start: seg.startKey, end: seg.endKey })
        pushSegment(seg, track)
        placed = true
        break
      }
    }
    if (!placed) {
      pushSegment(seg, MAX_TRACKS - 1)
    }
  }

  dedupeStackedSingleDayRangeLabels(out)
  return mergeCoincidentBarRects(out, ranges, items, zoomLevel, labelsEnabled, rangeEditPreview)
}
