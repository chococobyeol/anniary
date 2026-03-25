import type { ViewState } from '../types/state'

/** 보드 내부(SVG `g` transform 이전) 좌표 */
export function clientToBoardPoint(
  clientX: number,
  clientY: number,
  containerRect: DOMRectReadOnly,
  view: ViewState
): { x: number; y: number } {
  const lx = clientX - containerRect.left
  const ly = clientY - containerRect.top
  return {
    x: (lx - view.translateX) / view.scale,
    y: (ly - view.translateY) / view.scale,
  }
}

export function pointsBBox(
  points: readonly [number, number][],
  pad: number
): { x: number; y: number; width: number; height: number } | null {
  if (points.length === 0) return null
  let minX = points[0][0]
  let minY = points[0][1]
  let maxX = minX
  let maxY = minY
  for (const [px, py] of points) {
    minX = Math.min(minX, px)
    minY = Math.min(minY, py)
    maxX = Math.max(maxX, px)
    maxY = Math.max(maxY, py)
  }
  return {
    x: minX - pad,
    y: minY - pad,
    width: Math.max(maxX - minX + pad * 2, 0.5),
    height: Math.max(maxY - minY + pad * 2, 0.5),
  }
}

export function pointsToPathD(
  points: readonly [number, number][],
  originX: number,
  originY: number
): string {
  if (points.length === 0) return ''
  const [fx, fy] = points[0]
  let d = `M ${fx - originX} ${fy - originY}`
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i][0] - originX} ${points[i][1] - originY}`
  }
  return d
}
