import type { OverlayEntity } from '../types/entities'
import { hexToRgba } from './overlayDraw'

export function clamp01(x: number): number {
  if (Number.isNaN(x)) return 1
  return Math.min(1, Math.max(0, x))
}

export function resolveTextBoxFill(o: OverlayEntity): string {
  const fc = o.fillColor
  if (!fc || fc === 'none' || fc === 'transparent') return 'none'
  const a = clamp01(o.fillOpacity ?? 1)
  if (a <= 0) return 'none'
  if (fc.startsWith('rgba') || fc.startsWith('rgb(')) return fc
  if (fc.startsWith('#')) return hexToRgba(fc, a)
  return fc
}

export function resolveTextBoxStroke(o: OverlayEntity): string {
  const a = clamp01(o.strokeOpacity ?? 1)
  if (a <= 0) return 'none'
  const sc = o.strokeColor
  if (!sc || sc === 'none') return 'none'
  if (sc.startsWith('rgba') || sc.startsWith('rgb(')) return sc
  if (sc.startsWith('#')) return hexToRgba(sc, a)
  return sc
}
