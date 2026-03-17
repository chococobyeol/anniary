import { memo, useMemo } from 'react'
import { getDateKeysBetween, parseDateKey, getFirstDayOfWeek } from '../../utils/date'
import { BASE_CELL_WIDTH, BASE_CELL_HEIGHT, MONTH_HEADER_WIDTH, MONTH_GAP, DAY_HEADER_HEIGHT } from '../../utils/zoom'
import type { DayLayout } from '../../types/state'

type Props = {
  startDateKey: string
  endDateKey: string
  year: number
  dayLayout: DayLayout
  color?: string
}

export const RangePreview = memo(function RangePreview({ startDateKey, endDateKey, year, dayLayout, color }: Props) {
  const isAligned = dayLayout === 'weekday-aligned'
  const headerH = isAligned ? DAY_HEADER_HEIGHT : 0
  const rowHeight = BASE_CELL_HEIGHT + MONTH_GAP

  const cells = useMemo(() => {
    const dateKeys = getDateKeysBetween(startDateKey, endDateKey)
    return dateKeys.map(dateKey => {
      const { month, day } = parseDateKey(dateKey)
      const col = isAligned ? getFirstDayOfWeek(year, month) + (day - 1) : (day - 1)
      return {
        dateKey,
        x: MONTH_HEADER_WIDTH + col * (BASE_CELL_WIDTH + 1),
        y: headerH + month * rowHeight,
      }
    })
  }, [startDateKey, endDateKey, year, isAligned, headerH, rowHeight])

  const fill = color || 'var(--range-default)'

  return (
    <g pointerEvents="none">
      {cells.map(c => (
        <rect
          key={c.dateKey}
          x={c.x}
          y={c.y}
          width={BASE_CELL_WIDTH}
          height={BASE_CELL_HEIGHT}
          rx={1}
          fill={fill}
          opacity={0.25}
        />
      ))}
    </g>
  )
})
