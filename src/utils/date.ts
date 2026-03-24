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

export function compareDateKeys(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/** `dateKey`에서 달력 기준 `deltaDays`만큼 이동 (음수 허용). */
export function addDaysToDateKey(dateKey: string, deltaDays: number): string {
  const { year, month, day } = parseDateKey(dateKey)
  const d = new Date(year, month, day)
  d.setDate(d.getDate() + deltaDays)
  return toDateKey(d.getFullYear(), d.getMonth(), d.getDate())
}

export function normalizeDateRange(a: string, b: string): { start: string; end: string } {
  return a <= b ? { start: a, end: b } : { start: b, end: a }
}

export function getDateKeysBetween(startKey: string, endKey: string): string[] {
  const { start, end } = normalizeDateRange(startKey, endKey)
  const s = parseDateKey(start)
  const e = parseDateKey(end)
  const from = new Date(s.year, s.month, s.day)
  const to = new Date(e.year, e.month, e.day)
  const keys: string[] = []
  const cur = new Date(from)
  while (cur <= to) {
    keys.push(toDateKey(cur.getFullYear(), cur.getMonth(), cur.getDate()))
    cur.setDate(cur.getDate() + 1)
  }
  return keys
}

export function sortDateKeys(keys: string[]): string[] {
  return [...keys].sort(compareDateKeys)
}

/** True if sortedUnique is every calendar day from first to last with no gaps */
export function isContiguousDateSpan(sortedUniqueKeys: string[]): boolean {
  if (sortedUniqueKeys.length <= 1) return true
  const span = getDateKeysBetween(sortedUniqueKeys[0], sortedUniqueKeys[sortedUniqueKeys.length - 1])
  if (span.length !== sortedUniqueKeys.length) return false
  return span.every((k, i) => k === sortedUniqueKeys[i])
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
