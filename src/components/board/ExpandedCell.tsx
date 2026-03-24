import { memo, useMemo } from 'react'
import type { ItemEntity, RangeEntity } from '../../types/entities'
import { BASE_CELL_WIDTH, BASE_CELL_HEIGHT } from '../../utils/zoom'
import { parseDateKey, getDayOfWeekLabel, getDayOfWeek } from '../../utils/date'
import {
  assignTimelineLanes,
  buildTimedSegments,
  buildTimelineTickTimes,
  formatItemTimeRangeLabel,
  formatMinuteOffsetLabel,
  MIDNIGHT_OFF,
  timelineWindow,
} from '../../utils/dayTimeline'

type Props = {
  dateKey: string
  items: ItemEntity[]
  ranges: Record<string, RangeEntity>
  x: number
  y: number
  onClose: () => void
}

const EXPANDED_WIDTH = BASE_CELL_WIDTH * 4
const LINE_HEIGHT = 5
const PADDING = 4
const HEADER_HEIGHT = 10
const LABEL_W = 26
const RANGE_TITLE_ROW = 8
const MIN_TIMELINE_INNER_H = 36
const MAX_TIMELINE_INNER_H = 120
const MIN_BAR_PX = 4
const SECTION_GAP = 6
const PX_PER_MINUTE = 0.32
const MIN_LABEL_DY = 9

const STATUS_DOT: Record<string, string> = {
  'none': '#cccccc',
  'in-progress': '#1a73e8',
  'done': '#34a853',
  'delayed': '#ea4335',
}

function barFill(
  item: ItemEntity,
  ranges: Record<string, RangeEntity>,
  done: boolean,
  nextZone: boolean
): { fill: string; fillOpacity: number } {
  const rid = item.rangeId
  const c = rid && ranges[rid]?.color ? ranges[rid].color! : 'var(--range-default)'
  if (done) {
    return { fill: c, fillOpacity: nextZone ? 0.2 : 0.38 }
  }
  return { fill: c, fillOpacity: nextZone ? 0.38 : 0.72 }
}

function barParts(
  startOff: number,
  endOff: number,
  minT: number,
  span: number,
  innerH: number
): { y: number; h: number; nextZone: boolean }[] {
  const yAt = (t: number) => ((t - minT) / span) * innerH
  const y0 = yAt(startOff)
  let y1 = startOff === endOff ? y0 + MIN_BAR_PX : yAt(endOff)
  if (y1 - y0 < MIN_BAR_PX) y1 = y0 + MIN_BAR_PX

  const crosses = startOff < MIDNIGHT_OFF && endOff > MIDNIGHT_OFF
  if (!crosses) {
    return [{ y: y0, h: y1 - y0, nextZone: endOff > MIDNIGHT_OFF }]
  }
  const yMid = yAt(MIDNIGHT_OFF)
  const h1 = Math.max(MIN_BAR_PX * 0.5, yMid - y0)
  const h2 = Math.max(MIN_BAR_PX * 0.5, y1 - yMid)
  return [
    { y: y0, h: h1, nextZone: false },
    { y: yMid, h: h2, nextZone: true },
  ]
}

export const ExpandedCell = memo(function ExpandedCell({ dateKey, items, ranges, x, y, onClose }: Props) {
  const { month, day } = parseDateKey(dateKey)
  const dow = getDayOfWeek(
    parseInt(dateKey.slice(0, 4)),
    month,
    day
  )
  const dowLabel = getDayOfWeekLabel(dow)

  const segments = useMemo(() => buildTimedSegments(items), [items])
  const timedIds = useMemo(() => new Set(segments.map(s => s.item.id)), [segments])
  const untimedItems = useMemo(() => items.filter(i => !timedIds.has(i.id)), [items, timedIds])
  const win = useMemo(() => timelineWindow(segments), [segments])
  const lanes = useMemo(() => assignTimelineLanes(segments), [segments])

  const tickTimes = useMemo(
    () => (win ? buildTimelineTickTimes(win.minT, win.maxT) : []),
    [win]
  )

  const span = win ? Math.max(1, win.maxT - win.minT) : 1
  const innerH = win
    ? Math.min(MAX_TIMELINE_INNER_H, Math.max(MIN_TIMELINE_INNER_H, (win.maxT - win.minT) * PX_PER_MINUTE))
    : MIN_TIMELINE_INNER_H

  const numLanes = segments.length === 0
    ? 1
    : Math.max(...segments.map(s => lanes.get(s.item.id) ?? 0)) + 1

  const areaX = PADDING + LABEL_W
  const areaW = Math.max(8, EXPANDED_WIDTH - areaX - PADDING)
  const laneW = numLanes > 0 ? (areaW - (numLanes - 1) * 1) / numLanes : areaW

  const showMidnightBand = win != null && win.minT < MIDNIGHT_OFF && win.maxT > MIDNIGHT_OFF
  const yMidnight = win != null ? ((MIDNIGHT_OFF - win.minT) / span) * innerH : 0

  const yAt =
    win == null
      ? (_t: number) => 0
      : (t: number) => ((t - win.minT) / span) * innerH

  let expandedHeight = HEADER_HEIGHT + PADDING
  if (items.length === 0) {
    expandedHeight += 12 + PADDING
  } else {
    if (segments.length > 0) expandedHeight += RANGE_TITLE_ROW + innerH
    if (untimedItems.length > 0) {
      if (segments.length > 0) expandedHeight += SECTION_GAP
      expandedHeight += untimedItems.length * LINE_HEIGHT
    }
    expandedHeight += PADDING
  }
  expandedHeight = Math.max(BASE_CELL_HEIGHT, expandedHeight)

  const tickLabelYs: { t: number; yy: number; show: boolean }[] = []
  if (win && tickTimes.length > 0) {
    let lastShownY = -1e9
    for (const t of tickTimes) {
      const yy = yAt(t)
      const isEdge = t === win.minT || t === win.maxT || t === MIDNIGHT_OFF
      const crowded = !isEdge && yy - lastShownY < MIN_LABEL_DY && win.maxT - win.minT > 45
      const show = !crowded
      if (show) lastShownY = yy
      tickLabelYs.push({ t, yy, show })
    }
  }

  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect
        x={-2}
        y={-2}
        width={EXPANDED_WIDTH + 4}
        height={expandedHeight + 4}
        rx={3}
        fill="rgba(0,0,0,0.08)"
      />

      <rect
        width={EXPANDED_WIDTH}
        height={expandedHeight}
        rx={2}
        fill="var(--bg-panel)"
        stroke="var(--border-selected)"
        strokeWidth={1}
      />

      <text x={PADDING} y={8} fontSize={6} fontWeight={700} fill="var(--text-primary)">
        {month + 1}/{day}
      </text>
      <text x={PADDING + 20} y={8} fontSize={5} fontWeight={400} fill="var(--text-muted)">
        {dowLabel}
      </text>

      <text
        x={EXPANDED_WIDTH - PADDING}
        y={8}
        fontSize={5}
        fill="var(--text-muted)"
        textAnchor="end"
        style={{ cursor: 'pointer' }}
        onPointerDown={e => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onClose() }}
      >
        ✕
      </text>

      <line
        x1={PADDING} y1={HEADER_HEIGHT}
        x2={EXPANDED_WIDTH - PADDING} y2={HEADER_HEIGHT}
        stroke="var(--border-light)" strokeWidth={0.5}
      />

      {items.length === 0 && (
        <text x={EXPANDED_WIDTH / 2} y={HEADER_HEIGHT + 10} fontSize={4} fill="var(--text-muted)" textAnchor="middle">
          No items
        </text>
      )}

      {items.length > 0 && segments.length > 0 && win != null && (
        <g transform={`translate(0, ${HEADER_HEIGHT + PADDING})`}>
          <text x={PADDING} y={5} fontSize={3.6} fontWeight={600} fill="var(--text-primary)">
            {formatMinuteOffsetLabel(win.minT)} – {formatMinuteOffsetLabel(win.maxT)}
          </text>

          <g transform={`translate(0, ${RANGE_TITLE_ROW})`}>
            {tickLabelYs.map(({ t, yy, show }) =>
              show ? (
                <text
                  key={`lbl-${t}`}
                  x={PADDING}
                  y={yy + 2.5}
                  fontSize={3.2}
                  fill={t === MIDNIGHT_OFF ? 'var(--text-secondary)' : 'var(--text-muted)'}
                  textAnchor="start"
                >
                  {formatMinuteOffsetLabel(t)}
                </text>
              ) : null
            )}

            <g transform={`translate(${areaX}, 0)`}>
              {showMidnightBand ? (
                <>
                  <rect x={0} y={0} width={areaW} height={yMidnight} fill="var(--bg-cell)" />
                  <rect
                    x={0}
                    y={yMidnight}
                    width={areaW}
                    height={innerH - yMidnight}
                    fill="var(--bg-cell-hover)"
                    opacity={0.88}
                  />
                </>
              ) : (
                <rect x={0} y={0} width={areaW} height={innerH} fill="var(--bg-cell)" />
              )}

              {tickTimes.map(t => {
                const yy = yAt(t)
                const emphasize = t === MIDNIGHT_OFF && showMidnightBand
                return (
                  <line
                    key={`grid-${t}`}
                    x1={0}
                    x2={areaW}
                    y1={yy}
                    y2={yy}
                    stroke={emphasize ? 'var(--border-medium)' : 'var(--border-light)'}
                    strokeWidth={emphasize ? 0.7 : 0.4}
                    strokeDasharray={emphasize ? '2 1' : undefined}
                    opacity={0.95}
                  />
                )
              })}

              <rect
                x={0}
                y={0}
                width={areaW}
                height={innerH}
                fill="none"
                stroke="var(--border-light)"
                strokeWidth={0.35}
              />

              {segments.map(seg => {
                const lane = lanes.get(seg.item.id) ?? 0
                const bx = lane * (laneW + 1)
                const parts = barParts(seg.startOff, seg.endOff, win.minT, span, innerH)
                const done = seg.item.status === 'done'
                const timeLbl = formatItemTimeRangeLabel(seg.startOff, seg.endOff)
                const title = (seg.item.title || '(untitled)').slice(0, 12)
                const dotFill = STATUS_DOT[seg.item.status] || STATUS_DOT['none']
                return (
                  <g key={seg.item.id}>
                    {parts.map((p, idx) => {
                      const { fill, fillOpacity } = barFill(seg.item, ranges, done, p.nextZone)
                      return (
                        <rect
                          key={idx}
                          x={bx + 0.5}
                          y={p.y}
                          width={Math.max(2, laneW - 1)}
                          height={p.h}
                          rx={1}
                          fill={fill}
                          fillOpacity={fillOpacity}
                          stroke="var(--border-medium)"
                          strokeWidth={0.2}
                        />
                      )
                    })}
                    <circle cx={bx + 3} cy={parts[0].y + 2.2} r={1.2} fill={dotFill} style={{ pointerEvents: 'none' }} />
                    <text
                      x={bx + 5.5}
                      y={parts[0].y + (parts[0].h >= 9 ? 3.2 : 2.8)}
                      fontSize={2.8}
                      fill="var(--text-primary)"
                      style={{ pointerEvents: 'none' }}
                    >
                      {timeLbl}
                    </text>
                    {parts[0].h >= 9 && (
                      <text
                        x={bx + 5.5}
                        y={parts[0].y + 7}
                        fontSize={3}
                        fill="var(--text-primary)"
                        style={{ pointerEvents: 'none' }}
                      >
                        {title}{(seg.item.title || '').length > 12 ? '…' : ''}
                      </text>
                    )}
                  </g>
                )
              })}
            </g>
          </g>
        </g>
      )}

      {items.length > 0 && untimedItems.length > 0 && (
        <g
          transform={`translate(0, ${
            HEADER_HEIGHT + PADDING + (segments.length > 0 ? RANGE_TITLE_ROW + innerH + SECTION_GAP : 0)
          })`}
        >
          {untimedItems.map((item, i) => {
            const iy = i * LINE_HEIGHT
            const dotFill =
              item.rangeId && ranges[item.rangeId]?.color
                ? ranges[item.rangeId].color!
                : STATUS_DOT[item.status] || STATUS_DOT['none']
            return (
              <g key={item.id}>
                <circle cx={PADDING + 2} cy={iy + 2} r={1.5} fill={dotFill} />
                <text
                  x={PADDING + 6}
                  y={iy + 3}
                  fontSize={3.8}
                  fill={item.status === 'done' ? 'var(--text-muted)' : 'var(--text-primary)'}
                  textDecoration={item.status === 'done' ? 'line-through' : 'none'}
                >
                  {(item.title || '(untitled)').slice(0, 28)}
                  {(item.title || '').length > 28 ? '…' : ''}
                </text>
              </g>
            )
          })}
        </g>
      )}

      {items.length > 0 && segments.length === 0 && (
        <g transform={`translate(0, ${HEADER_HEIGHT + PADDING})`}>
          {items.map((item, i) => {
            const iy = i * LINE_HEIGHT
            const dotFill =
              item.rangeId && ranges[item.rangeId]?.color
                ? ranges[item.rangeId].color!
                : STATUS_DOT[item.status] || STATUS_DOT['none']
            return (
              <g key={item.id}>
                <circle cx={PADDING + 2} cy={iy + 2} r={1.5} fill={dotFill} />
                <text
                  x={PADDING + 6}
                  y={iy + 3}
                  fontSize={3.8}
                  fill={item.status === 'done' ? 'var(--text-muted)' : 'var(--text-primary)'}
                  textDecoration={item.status === 'done' ? 'line-through' : 'none'}
                >
                  {(item.title || '(untitled)').slice(0, 28)}
                  {(item.title || '').length > 28 ? '…' : ''}
                </text>
              </g>
            )
          })}
        </g>
      )}
    </g>
  )
})
