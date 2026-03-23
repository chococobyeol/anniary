export const RANGE_COLORS = [
  '#1a73e8', '#34a853', '#ea4335', '#fbbc04',
  '#ff6d00', '#ab47bc', '#00acc1', '#8d6e63',
]

export const TIMELINE_PRIORITY_MIN = -50
export const TIMELINE_PRIORITY_MAX = 50

export const DEFAULT_TAG = 'General'

export function clampTimelinePriority(n: number): number {
  const x = Number.isFinite(n) ? Math.round(n) : 0
  return Math.max(TIMELINE_PRIORITY_MIN, Math.min(TIMELINE_PRIORITY_MAX, x))
}

export const COPY_PERIOD_BAR_SECTION_TIP =
  'Colored strip under each month row on the year board for this date range.'
export const COPY_PERIOD_BAR_HIDE_HINT =
  'Your schedule is unchanged; only that strip is hidden on the year board.'
export const COPY_DISPLAY_ORDER_HINT = `Higher numbers appear on top in day cells and use upper tracks when period bars overlap. Range ${TIMELINE_PRIORITY_MIN}–${TIMELINE_PRIORITY_MAX}. Applied when you save.`
export const COPY_FIRST_PERIOD_SAVE_HINT =
  'Save once to create the range; then the bar and display order appear on the year board.'
export const COPY_PERIOD_COLOR_TIP = 'Bar color on the year board. You can change it before saving; Cancel discards.'
