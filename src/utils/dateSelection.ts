import type { SelectionTarget } from '../types/state'
import { sortDateKeys } from './date'

/** Find YYYY-MM-DD cell under screen coordinates (see DayCell `data-date-key`) */
export function getDateKeyFromPoint(clientX: number, clientY: number): string | null {
  const el = document.elementFromPoint(clientX, clientY)
  const node = el?.closest?.('[data-date-key]')
  if (!node) return null
  const v = node.getAttribute('data-date-key')
  return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null
}

/** Cmd/Ctrl multi-select: toggle one date in the current selection */
export function toggleDateKeyInSelection(prev: SelectionTarget | null, key: string): SelectionTarget | null {
  const set = new Set<string>()
  if (prev?.type === 'day') set.add(prev.dateKey)
  else if (prev?.type === 'days') prev.dateKeys.forEach(k => set.add(k))
  if (set.has(key)) set.delete(key)
  else set.add(key)
  if (set.size === 0) return null
  const sorted = sortDateKeys([...set])
  if (sorted.length === 1) return { type: 'day', dateKey: sorted[0] }
  return { type: 'days', dateKeys: sorted }
}
