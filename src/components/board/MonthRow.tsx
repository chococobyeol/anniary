import { memo, useMemo } from 'react'
import { DayCell } from './DayCell'
import { getDaysInMonth, toDateKey, getTodayKey, getMonthShort, getDayOfWeek, getDayOfWeekLabel, isWeekend, getFirstDayOfWeek } from '../../utils/date'
import { BASE_CELL_WIDTH, BASE_CELL_HEIGHT, MONTH_HEADER_WIDTH } from '../../utils/zoom'
import type { ZoomLevel, DayLayout } from '../../types/state'
import type { DayCellViewModel } from '../../types/view-models'
import type { ItemEntity, RangeEntity } from '../../types/entities'

type Props = {
  year: number
  month: number
  y: number
  zoomLevel: ZoomLevel
  dayLayout: DayLayout
  items: Record<string, ItemEntity>
  ranges: Record<string, RangeEntity>
  selectedDateKey: string | null
  onCellClick: (dateKey: string) => void
}

export const MonthRow = memo(function MonthRow({
  year, month, y, zoomLevel, dayLayout, items, ranges, selectedDateKey, onCellClick,
}: Props) {
  const days = getDaysInMonth(year, month)
  const todayKey = getTodayKey()
  const firstDow = getFirstDayOfWeek(year, month)

  const cellVMs = useMemo((): DayCellViewModel[] => {
    const result: DayCellViewModel[] = []
    for (let d = 1; d <= days; d++) {
      const dateKey = toDateKey(year, month, d)
      const dow = getDayOfWeek(year, month, d)

      const dayItems = Object.values(items).filter(it => it.date === dateKey)
      const dayRanges = Object.values(ranges).filter(r => r.startDate <= dateKey && r.endDate >= dateKey)

      const sorted = [...dayItems].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1
        if (!a.pinned && b.pinned) return 1
        if (a.status === 'in-progress' && b.status !== 'in-progress') return -1
        return 0
      })

      const primaryItem = sorted[0]
      const summaryLines = sorted.slice(0, 4).map(it => ({
        id: it.id,
        kind: it.kind,
        title: it.title || '(untitled)',
        status: it.status,
      }))

      const rangeMarkers = dayRanges.slice(0, 3).map((r, i) => ({
        id: r.id,
        color: r.color || 'var(--range-default)',
        style: (r.kind === 'highlight' ? 'highlight' : r.kind === 'note' ? 'muted' : 'normal') as 'normal' | 'muted' | 'highlight',
        label: r.label,
        layerIndex: i,
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
        rangeMarkers,
      })
    }
    return result
  }, [year, month, days, items, ranges, todayKey])

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
            isSelected={vm.dateKey === selectedDateKey}
            showDow={showDow}
            onClick={onCellClick}
          />
        )
      })}
    </g>
  )
})
