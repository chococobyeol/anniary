/**
 * Parse "HH:mm" or "H:mm" (24h) to fraction of a calendar day in [0, 1).
 * Returns undefined if empty or invalid.
 */
export function parseTimeToDayFraction(t: string | undefined | null): number | undefined {
  if (t == null) return undefined
  const s = String(t).trim()
  if (!s) return undefined
  const m = /^(\d{1,2}):(\d{2})$/.exec(s)
  if (!m) return undefined
  const h = Number(m[1])
  const min = Number(m[2])
  if (!Number.isFinite(h) || !Number.isFinite(min) || h < 0 || h > 23 || min < 0 || min > 59) {
    return undefined
  }
  return (h * 60 + min) / (24 * 60)
}
