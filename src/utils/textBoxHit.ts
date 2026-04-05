import type { OverlayEntity } from '../types/entities'

const PAD = 1.2
const MIN_HIT = 4

/** 본문 쪽으로 잡은 높이(보드 단위, `textBoxContentHeight`) + 패딩. 프레임이 더 크면 빈 아래쪽은 포인터 통과 */
export function textBoxInteractiveHeight(
  o: OverlayEntity,
  _frameW: number,
  frameH: number
): number {
  const raw = o.textBoxContentHeight
  const ch = raw != null && raw > 0 ? raw : Math.min(frameH, 6)
  return Math.min(frameH, Math.max(MIN_HIT, ch + PAD))
}
