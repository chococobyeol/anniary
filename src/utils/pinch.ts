import type { ViewState } from '../types/state'
import { MIN_SCALE, MAX_SCALE } from './zoom'

export type ClientPoint = { x: number; y: number }

export type PinchFrame = {
  center: ClientPoint
  distance: number
}

export function getPinchFrame(a: ClientPoint, b: ClientPoint): PinchFrame {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return {
    center: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
    distance: Math.max(Math.hypot(dx, dy), 0.01),
  }
}

/**
 * 이전 두 손가락 중심 아래의 보드 좌표를 새 중심 아래에 유지한다.
 * 거리 변화는 확대/축소, 중심 이동은 두 손가락 팬으로 반영된다.
 */
export function viewAfterPinch(
  view: ViewState,
  previous: PinchFrame,
  next: PinchFrame,
  containerLeft: number,
  containerTop: number,
): Pick<ViewState, 'scale' | 'translateX' | 'translateY'> {
  const distanceRatio = next.distance / previous.distance
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, view.scale * distanceRatio))
  const scaleRatio = scale / view.scale
  const prevX = previous.center.x - containerLeft
  const prevY = previous.center.y - containerTop
  const nextX = next.center.x - containerLeft
  const nextY = next.center.y - containerTop

  return {
    scale,
    translateX: nextX - (prevX - view.translateX) * scaleRatio,
    translateY: nextY - (prevY - view.translateY) * scaleRatio,
  }
}
