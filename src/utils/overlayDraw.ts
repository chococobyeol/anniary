import type { DrawStrokeWeight } from '../types/state'
import type { DrawToolKind } from '../types/entities'

const PEN_W = 0.9
const HI_W = 3.2

export function hexToRgba(hex: string, a: number): string {
  const h = hex.replace('#', '').trim()
  if (h.length !== 6) return `rgba(37, 99, 235, ${a})`
  const n = parseInt(h, 16)
  if (Number.isNaN(n)) return `rgba(37, 99, 235, ${a})`
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return `rgba(${r},${g},${b},${a})`
}

export function weightToPenWidth(w: DrawStrokeWeight): number {
  return w === 'thin' ? 0.48 : w === 'medium' ? 0.88 : 1.42
}

export function weightToHighlighterWidth(w: DrawStrokeWeight): number {
  return w === 'thin' ? 2.1 : w === 'medium' ? 3.35 : 4.7
}

export function weightToShapeStrokeWidth(w: DrawStrokeWeight): number {
  return w === 'thin' ? 0.32 : w === 'medium' ? 0.52 : 0.88
}

export function penStroke(colorHex: string, weight: DrawStrokeWeight): {
  color: string
  width: number
  fill: 'none'
} {
  return {
    color: colorHex,
    width: weightToPenWidth(weight),
    fill: 'none',
  }
}

/** 형광펜: 색 + 굵기, 알파는 고정 비슷하게 */
export function highlighterStroke(colorHex: string, weight: DrawStrokeWeight): {
  color: string
  width: number
  fill: 'none'
} {
  return {
    color: hexToRgba(colorHex, 0.44),
    width: weightToHighlighterWidth(weight),
    fill: 'none',
  }
}

export function shapeStrokeFill(
  strokeColorHex: string,
  fillColor: string,
  weight: DrawStrokeWeight
): { color: string; width: number; fill: string } {
  const fill =
    fillColor === 'transparent' || fillColor === 'none' || fillColor === ''
      ? 'none'
      : fillColor
  return {
    color: strokeColorHex,
    width: weightToShapeStrokeWidth(weight),
    fill,
  }
}

/** 레거시 / 지우개 등 */
export function defaultStrokeForTool(tool: DrawToolKind): { color: string; width: number; fill?: string } {
  if (tool === 'highlighter') {
    return { color: hexToRgba('#facc15', 0.44), width: HI_W, fill: 'none' }
  }
  if (tool === 'pen') {
    return { color: 'var(--status-in-progress)', width: PEN_W, fill: 'none' }
  }
  if (tool === 'eraser') {
    return { color: 'rgba(239, 68, 68, 0.5)', width: 2.2, fill: 'rgba(239, 68, 68, 0.08)' }
  }
  if (tool === 'rect') {
    return { color: 'var(--border-selected)', width: 0.6, fill: 'rgba(59, 130, 246, 0.12)' }
  }
  return { color: 'var(--status-in-progress)', width: 0.6, fill: 'rgba(16, 185, 129, 0.15)' }
}
