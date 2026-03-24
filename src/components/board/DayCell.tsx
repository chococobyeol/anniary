import { memo } from 'react'
import type { DayCellViewModel, DayCellRenderPolicy } from '../../types/view-models'
import type { ZoomLevel, InteractionMode } from '../../types/state'
import { DAY_CELL_POLICY } from '../../types/view-models'
import { BASE_CELL_WIDTH, BASE_CELL_HEIGHT } from '../../utils/zoom'

type Props = {
  vm: DayCellViewModel
  x: number
  y: number
  zoomLevel: ZoomLevel
  isHighlighted: boolean
  highlightPreview?: boolean
  showDow: boolean
  /** When true, hide summary/progress/+N under timeline bars for this day */
  suppressListUnderGantt?: boolean
  interactionMode: InteractionMode
  onPanCellClick?: (dateKey: string) => void
  onSelectPointerDown?: (e: React.PointerEvent, dateKey: string) => void
  onModifierCellClick?: (dateKey: string) => void
  onDoubleClick?: (dateKey: string) => void
}

const STATUS_COLOR: Record<string, string> = {
  'none': 'var(--status-none)',
  'in-progress': 'var(--status-in-progress)',
  'done': 'var(--status-done)',
  'delayed': 'var(--status-delayed)',
  'important': 'var(--status-important)',
}

const DOW_COLOR_SUNDAY = 'var(--status-delayed)'
const DOW_COLOR_SATURDAY = 'var(--status-in-progress)'
const DOW_COLOR_DEFAULT = 'var(--text-muted)'

export const DayCell = memo(function DayCell({
  vm, x, y, zoomLevel, isHighlighted, highlightPreview, showDow, suppressListUnderGantt = false, interactionMode,
  onPanCellClick, onSelectPointerDown, onModifierCellClick, onDoubleClick,
}: Props) {
  const policy: DayCellRenderPolicy = DAY_CELL_POLICY[zoomLevel]
  const w = BASE_CELL_WIDTH
  const h = BASE_CELL_HEIGHT

  const hasStatus = vm.primaryStatus && vm.primaryStatus !== 'none'
  const statusColor = STATUS_COLOR[vm.primaryStatus] || STATUS_COLOR['none']

  const dowColor = vm.dayOfWeek === 0 ? DOW_COLOR_SUNDAY
    : vm.dayOfWeek === 6 ? DOW_COLOR_SATURDAY
    : DOW_COLOR_DEFAULT

  const bgFill = vm.isToday ? 'var(--bg-cell-today)'
    : vm.isWeekend ? 'var(--bg-cell-weekend)'
    : 'var(--bg-cell)'

  const strokeColor = isHighlighted
    ? (highlightPreview ? 'var(--status-in-progress)' : 'var(--border-selected)')
    : 'var(--border-light)'
  const strokeW = isHighlighted ? 1.5 : 0.5

  return (
    <g
      data-date-key={vm.dateKey}
      transform={`translate(${x}, ${y})`}
      onClick={(e) => {
        if (interactionMode === 'pan') {
          onPanCellClick?.(vm.dateKey)
          return
        }
        if (interactionMode === 'select' && (e.metaKey || e.ctrlKey)) {
          e.preventDefault()
          onModifierCellClick?.(vm.dateKey)
        }
      }}
      onPointerDown={(e) => {
        if (interactionMode !== 'select' || e.button !== 0) return
        if (e.metaKey || e.ctrlKey) return
        e.stopPropagation()
        onSelectPointerDown?.(e, vm.dateKey)
      }}
      onDoubleClick={() => onDoubleClick?.(vm.dateKey)}
      style={{ cursor: 'pointer' }}
    >
      <rect
        width={w}
        height={h}
        rx={1}
        fill={bgFill}
        fillOpacity={highlightPreview ? 0.88 : 1}
        stroke={strokeColor}
        strokeWidth={strokeW}
      />

      {showDow && (
        <text
          x={w - 2} y={5}
          fontSize={3.5} fontWeight={400}
          fill={dowColor} textAnchor="end" opacity={0.8}
        >
          {vm.dayOfWeekLabel}
        </text>
      )}

      <text
        x={2}
        y={zoomLevel === 'Z0' ? h / 2 + 1 : 9}
        fontSize={zoomLevel === 'Z0' ? 7 : 8}
        fill={vm.isToday ? 'var(--status-in-progress)' : vm.isWeekend ? dowColor : 'var(--text-primary)'}
        fontWeight={vm.isToday ? 700 : 400}
      >
        {vm.dayNumber}
      </text>

      {hasStatus && (
        <circle
          cx={w - 4}
          cy={10}
          r={1.8}
          fill={statusColor}
        />
      )}

      {!suppressListUnderGantt && policy.showProgress && vm.progressPercent != null && (
        <rect
          x={2} y={12}
          width={(w - 4) * (vm.progressPercent / 100)}
          height={1.5} rx={0.5}
          fill="var(--status-in-progress)" opacity={0.6}
        />
      )}

      {!suppressListUnderGantt && policy.showSummaryLines > 0
        && vm.summaryLines.slice(0, policy.showSummaryLines).map((line, i) => (
          <text key={line.id} x={2} y={16 + i * 4.5} fontSize={3.5} fill="var(--text-secondary)">
            {line.title.length > 8 ? line.title.slice(0, 7) + '…' : line.title}
          </text>
        ))}

      {!suppressListUnderGantt && policy.showHiddenCount && vm.hiddenCount > 0 && (
        <text x={w - 2} y={h - 2} fontSize={3} fill="var(--text-muted)" textAnchor="end">
          +{vm.hiddenCount}
        </text>
      )}
    </g>
  )
})
