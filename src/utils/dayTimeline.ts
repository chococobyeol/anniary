import type { ItemEntity } from '../types/entities'

export const MINUTES_PER_DAY = 24 * 60

/** Parses `HH:mm` or `H:mm` → minutes from midnight, or null. */
export function parseTimeToMinutes(t: string | undefined): number | null {
  if (!t?.trim()) return null
  const m = t.trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return null
  const h = parseInt(m[1], 10)
  const min = parseInt(m[2], 10)
  if (h < 0 || h > 23 || min < 0 || min > 59) return null
  return h * 60 + min
}

export type TimedSegment = {
  item: ItemEntity
  /** Minutes from today's 00:00 */
  startOff: number
  /** May exceed MINUTES_PER_DAY when end is on the next calendar day */
  endOff: number
}

export function buildTimedSegments(items: ItemEntity[]): TimedSegment[] {
  const out: TimedSegment[] = []
  for (const item of items) {
    const s = parseTimeToMinutes(item.startTime)
    if (s === null) continue
    const eParsed = parseTimeToMinutes(item.endTime)
    let endOff: number
    if (eParsed === null) {
      endOff = s
    } else if (eParsed >= s) {
      endOff = eParsed
    } else {
      endOff = MINUTES_PER_DAY + eParsed
    }
    out.push({ item, startOff: s, endOff })
  }
  return out
}

export function timelineWindow(segments: TimedSegment[]): { minT: number; maxT: number } | null {
  if (segments.length === 0) return null
  let minT = Infinity
  let maxT = -Infinity
  for (const seg of segments) {
    minT = Math.min(minT, seg.startOff)
    maxT = Math.max(maxT, seg.endOff)
  }
  return { minT, maxT }
}

export const MIDNIGHT_OFF = MINUTES_PER_DAY

/**
 * Lane index per item for overlapping segments. Point events use +1 minute for overlap checks.
 */
export function assignTimelineLanes(segments: TimedSegment[]): Map<string, number> {
  const sorted = [...segments].sort((a, b) => a.startOff - b.startOff || a.endOff - b.endOff)
  const laneEnds: number[] = []
  const map = new Map<string, number>()
  for (const seg of sorted) {
    const effEnd = Math.max(seg.endOff, seg.startOff + 1)
    let lane = 0
    while (lane < laneEnds.length && laneEnds[lane] > seg.startOff) lane++
    if (lane === laneEnds.length) laneEnds.push(effEnd)
    else laneEnds[lane] = effEnd
    map.set(seg.item.id, lane)
  }
  return map
}

/** Label for minute offset from today's 00:00 (next-day portion uses wall clock after midnight). */
export function formatMinuteOffsetLabel(off: number): string {
  if (off < MINUTES_PER_DAY) {
    const h = Math.floor(off / 60)
    const mi = off % 60
    return `${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`
  }
  if (off === MINUTES_PER_DAY) return '24:00'
  const m2 = off - MINUTES_PER_DAY
  const h = Math.floor(m2 / 60)
  const mi = m2 % 60
  return `${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`
}

/** 눈금 간격(분): 구간 길이에 따라 선택 */
export function timelineTickStep(spanMinutes: number): number {
  if (spanMinutes <= 90) return 15
  if (spanMinutes <= 180) return 30
  if (spanMinutes <= 480) return 60
  if (spanMinutes <= 960) return 120
  return 240
}

/**
 * [minT, maxT] 안의 눈금 시각(분 오프셋). 양 끝 + 정렬된 중간 눈금 + (필요 시) 자정.
 */
export function buildTimelineTickTimes(minT: number, maxT: number): number[] {
  const span = maxT - minT
  if (span <= 0) return [minT]
  const step = timelineTickStep(span)
  const set = new Set<number>([minT, maxT])
  let t = Math.ceil(minT / step) * step
  while (t < maxT) {
    if (t > minT) set.add(t)
    t += step
  }
  if (minT < MIDNIGHT_OFF && maxT > MIDNIGHT_OFF) set.add(MIDNIGHT_OFF)
  return [...set].sort((a, b) => a - b)
}

/** 일정 막대 옆에 붙일 시작–끝 시각 (같은 시각이면 한 번만). */
export function formatItemTimeRangeLabel(startOff: number, endOff: number): string {
  const a = formatMinuteOffsetLabel(startOff)
  if (startOff === endOff) return a
  return `${a}–${formatMinuteOffsetLabel(endOff)}`
}
