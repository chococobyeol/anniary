import { memo, useMemo, type PointerEvent as ReactPointerEvent } from 'react'
import { DayCell } from './DayCell'
import { getDaysInMonth, toDateKey, getTodayKey, getMonthShort, getDayOfWeek, getDayOfWeekLabel, isWeekend, getFirstDayOfWeek } from '../../utils/date'
import { BASE_CELL_WIDTH, BASE_CELL_HEIGHT, MONTH_HEADER_WIDTH } from '../../utils/zoom'
import type { ZoomLevel, DayLayout, InteractionMode, RangeEditPreview } from '../../types/state'
import type { DayCellViewModel } from '../../types/view-models'
import type { ItemEntity, RangeEntity } from '../../types/entities'
import type { DateIndex } from '../../utils/indexing'
import { layoutMonthGanttSegments } from '../../utils/monthGantt'
import { linkedRangeTimelinePriority } from '../../utils/itemTimelinePriority'

type Props = {
  year: number
  month: number
  y: number
  zoomLevel: ZoomLevel
  dayLayout: DayLayout
  interactionMode: InteractionMode
  itemIndex: DateIndex<ItemEntity>
  items: Record<string, ItemEntity>
  ranges: Record<string, RangeEntity>
  rangeEditPreview: RangeEditPreview | null
  highlightDateKeys: Set<string>
  dragSelecting: boolean
  onPanCellClick: (dateKey: string) => void
  onSelectPointerDown: (e: ReactPointerEvent<Element>, dateKey: string) => void
  onModifierCellClick: (dateKey: string) => void
  onCellDoubleClick: (dateKey: string) => void
}

export const MonthRow = memo(function MonthRow({
  year, month, y, zoomLevel, dayLayout, interactionMode, itemIndex, items, ranges, rangeEditPreview,
  highlightDateKeys, dragSelecting, onPanCellClick, onSelectPointerDown, onModifierCellClick, onCellDoubleClick,
}: Props) {
  const days = getDaysInMonth(year, month)
  const todayKey = getTodayKey()
  const firstDow = getFirstDayOfWeek(year, month)

  const cellVMs = useMemo((): DayCellViewModel[] => {
    const result: DayCellViewModel[] = []
    for (let d = 1; d <= days; d++) {
      const dateKey = toDateKey(year, month, d)
      const dow = getDayOfWeek(year, month, d)

      const dayItems = itemIndex[dateKey] || []

      const sorted = [...dayItems].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1
        if (!a.pinned && b.pinned) return 1
        const pr =
          linkedRangeTimelinePriority(b, ranges, rangeEditPreview)
          - linkedRangeTimelinePriority(a, ranges, rangeEditPreview)
        if (pr !== 0) return pr
        if (a.status === 'in-progress' && b.status !== 'in-progress') return -1
        if (a.status !== 'in-progress' && b.status === 'in-progress') return 1
        return 0
      })

      const primaryItem = sorted[0]
      const summaryLines = sorted.slice(0, 4).map(it => ({
        id: it.id,
        kind: it.kind,
        title: it.title || '(untitled)',
        status: it.status,
      }))

      result.push({
        dateKey,
        dayNumber: d,
        monthIndex: month,
        dayOfWeek: dow,
        dayOfWeekLabel: getDayOfWeekLabel(dow),
        isWeekend: isWeekend(year, month, d),
        isToday: dateKey === todayKey,
        primaryStatus: primaryItem?.status || 'none',
        progressPercent: primaryItem?.progress,
        summaryLines,
        hiddenCount: Math.max(0, dayItems.length - 3),
        rangeMarkers: [],
      })
    }
    return result
  }, [year, month, days, itemIndex, todayKey, ranges, rangeEditPreview])

  const ganttSegments = useMemo(
    () => layoutMonthGanttSegments(ranges, items, year, month, dayLayout, firstDow, BASE_CELL_HEIGHT, rangeEditPreview),
    [ranges, items, year, month, dayLayout, firstDow, rangeEditPreview]
  )

  const showDow = dayLayout === 'linear'

  return (
    <g transform={`translate(0, ${y})`}>
      <text
        x={MONTH_HEADER_WIDTH - 4}
        y={BASE_CELL_HEIGHT / 2 + 1}
        fontSize={9}
        fontWeight={600}
        fill="var(--text-secondary)"
        textAnchor="end"
        dominantBaseline="middle"
      >
        {getMonthShort(month)}
      </text>

      {cellVMs.map((vm, i) => {
        const col = dayLayout === 'weekday-aligned' ? firstDow + i : i
        return (
          <DayCell
            key={vm.dateKey}
            vm={vm}
            x={MONTH_HEADER_WIDTH + col * (BASE_CELL_WIDTH + 1)}
            y={0}
            zoomLevel={zoomLevel}
            isHighlighted={highlightDateKeys.has(vm.dateKey)}
            highlightPreview={dragSelecting && highlightDateKeys.has(vm.dateKey)}
            showDow={showDow}
            interactionMode={interactionMode}
            onPanCellClick={onPanCellClick}
            onSelectPointerDown={onSelectPointerDown}
            onModifierCellClick={onModifierCellClick}
            onDoubleClick={onCellDoubleClick}
          />
        )
      })}

      {/* Above cells: otherwise opaque cell rects hide the bar except in 1px grid gaps */}
      <g className="month-row-gantt" pointerEvents="none">
        {ganttSegments.map(s => (
          <rect
            key={`${s.rangeId}-${s.startKey}-${s.track}`}
            x={s.x}
            y={s.y}
            width={s.width}
            height={s.height}
            rx={0.45}
            fill={s.color}
            opacity={s.kind === 'highlight' ? 0.92 : s.kind === 'note' ? 0.5 : 0.85}
          />
        ))}
      </g>
    </g>
  )
})
