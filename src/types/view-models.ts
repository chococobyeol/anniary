export type SummaryLine = {
  id: string
  kind: 'task' | 'note' | 'event'
  title: string
  status: string
}

export type RangeMarker = {
  id: string
  color: string
  style: 'normal' | 'muted' | 'highlight'
  label?: string
  layerIndex: number
}

export type DayCellViewModel = {
  dateKey: string
  dayNumber: number
  monthIndex: number
  dayOfWeek: number
  dayOfWeekLabel: string
  isWeekend: boolean
  isToday: boolean
  primaryStatus: string
  progressPercent?: number
  summaryLines: SummaryLine[]
  hiddenCount: number
  rangeMarkers: RangeMarker[]
}

export type DayCellRenderPolicy = {
  showSummaryLines: number
  showProgress: boolean
  showChecklistSummary: boolean
  showHiddenCount: boolean
  showRangeLabel: boolean
}

export const DAY_CELL_POLICY: Record<string, DayCellRenderPolicy> = {
  Z0: { showSummaryLines: 0, showProgress: false, showChecklistSummary: false, showHiddenCount: false, showRangeLabel: false },
  Z1: { showSummaryLines: 1, showProgress: true, showChecklistSummary: false, showHiddenCount: false, showRangeLabel: false },
  Z2: { showSummaryLines: 1, showProgress: true, showChecklistSummary: false, showHiddenCount: true, showRangeLabel: false },
  Z3: { showSummaryLines: 2, showProgress: true, showChecklistSummary: true, showHiddenCount: true, showRangeLabel: true },
  Z4: { showSummaryLines: 3, showProgress: true, showChecklistSummary: true, showHiddenCount: true, showRangeLabel: true },
}
