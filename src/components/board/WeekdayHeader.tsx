import { memo } from 'react'
import { getDayOfWeekLabel } from '../../utils/date'
import { BASE_CELL_WIDTH, MONTH_HEADER_WIDTH, DAY_HEADER_HEIGHT } from '../../utils/zoom'

type Props = {
  totalColumns: number
  y: number
}

const DOW_COLOR_SUNDAY = 'var(--status-delayed)'
const DOW_COLOR_SATURDAY = 'var(--status-in-progress)'
const DOW_COLOR_DEFAULT = 'var(--text-secondary)'

export const WeekdayHeader = memo(function WeekdayHeader({ totalColumns, y }: Props) {
  const headers: { col: number; dow: number; label: string }[] = []
  for (let c = 0; c < totalColumns; c++) {
    const dow = c % 7
    headers.push({ col: c, dow, label: getDayOfWeekLabel(dow) })
  }

  return (
    <g transform={`translate(0, ${y})`}>
      {headers.map(h => {
        const x = MONTH_HEADER_WIDTH + h.col * (BASE_CELL_WIDTH + 1) + BASE_CELL_WIDTH / 2
        const color = h.dow === 0 ? DOW_COLOR_SUNDAY
          : h.dow === 6 ? DOW_COLOR_SATURDAY
          : DOW_COLOR_DEFAULT
        return (
          <text
            key={h.col}
            x={x}
            y={DAY_HEADER_HEIGHT - 3}
            fontSize={5}
            fontWeight={600}
            fill={color}
            textAnchor="middle"
          >
            {h.label}
          </text>
        )
      })}
    </g>
  )
})
