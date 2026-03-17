import { memo } from 'react'
import type { ItemEntity } from '../../types/entities'
import { BASE_CELL_WIDTH, BASE_CELL_HEIGHT } from '../../utils/zoom'
import { parseDateKey, getDayOfWeekLabel, getDayOfWeek } from '../../utils/date'

type Props = {
  dateKey: string
  items: ItemEntity[]
  x: number
  y: number
  onClose: () => void
}

const EXPANDED_WIDTH = BASE_CELL_WIDTH * 4
const LINE_HEIGHT = 5
const PADDING = 4
const HEADER_HEIGHT = 10

const STATUS_DOT: Record<string, string> = {
  'none': '#ccc',
  'in-progress': '#1a73e8',
  'done': '#34a853',
  'delayed': '#ea4335',
}

export const ExpandedCell = memo(function ExpandedCell({ dateKey, items, x, y, onClose }: Props) {
  const { month, day } = parseDateKey(dateKey)
  const dow = getDayOfWeek(
    parseInt(dateKey.slice(0, 4)),
    month,
    day
  )
  const dowLabel = getDayOfWeekLabel(dow)

  const contentLines = items.length
  const expandedHeight = Math.max(
    BASE_CELL_HEIGHT,
    HEADER_HEIGHT + PADDING + contentLines * LINE_HEIGHT + PADDING * 2
  )

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

      {items.map((item, i) => {
        const iy = HEADER_HEIGHT + PADDING + i * LINE_HEIGHT
        return (
          <g key={item.id}>
            <circle
              cx={PADDING + 2}
              cy={iy + 2}
              r={1.5}
              fill={STATUS_DOT[item.status] || STATUS_DOT['none']}
            />
            <text
              x={PADDING + 6}
              y={iy + 3}
              fontSize={3.8}
              fill={item.status === 'done' ? 'var(--text-muted)' : 'var(--text-primary)'}
              textDecoration={item.status === 'done' ? 'line-through' : 'none'}
            >
              {(item.title || '(untitled)').slice(0, 20)}
              {(item.title || '').length > 20 ? '…' : ''}
            </text>
            <text
              x={EXPANDED_WIDTH - PADDING}
              y={iy + 3}
              fontSize={3}
              fill="var(--text-muted)"
              textAnchor="end"
            >
              {item.kind}
            </text>
          </g>
        )
      })}
    </g>
  )
})
