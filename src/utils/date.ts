const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

const DAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

export function getMonthName(month: number): string {
  return MONTH_NAMES[month]
}

export function getMonthShort(month: number): string {
  return MONTH_SHORT[month]
}

export function toDateKey(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  return `${year}-${m}-${d}`
}

export function parseDateKey(key: string): { year: number; month: number; day: number } {
  const [y, m, d] = key.split('-').map(Number)
  return { year: y, month: m - 1, day: d }
}

export function getTodayKey(): string {
  const now = new Date()
  return toDateKey(now.getFullYear(), now.getMonth(), now.getDate())
}

export function isWeekend(year: number, month: number, day: number): boolean {
  const d = new Date(year, month, day).getDay()
  return d === 0 || d === 6
}

export function getDayOfWeek(year: number, month: number, day: number): number {
  return new Date(year, month, day).getDay()
}

export function getDayOfWeekLabel(dow: number): string {
  return DAY_LABELS[dow]
}

export function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

export function getMaxColumnsForYear(year: number): number {
  let max = 0
  for (let m = 0; m < 12; m++) {
    const firstDow = getFirstDayOfWeek(year, m)
    const days = getDaysInMonth(year, m)
    const lastCol = firstDow + days - 1
    if (lastCol > max) max = lastCol
  }
  return max + 1
}
