import type { OverlayEntity } from '../types/entities'

function pointInOverlayRect(px: number, py: number, o: OverlayEntity, pad = 0.4): boolean {
  return (
    px >= o.x - pad
    && px <= o.x + o.width + pad
    && py >= o.y - pad
    && py <= o.y + o.height + pad
  )
}

/** 아래에서 위로 쌓인 순(먼저 그린 것 → 나중에 그린 것). 맨 마지막이 최상단. */
export function overlayIdsTopFirst(overlays: Record<string, OverlayEntity>): OverlayEntity[] {
  const list = Object.values(overlays).filter(o => o.visible !== false && !o.locked)
  list.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  return list
}

/** 보드 좌표 (px, py)에서 맨 위에 걸린 오버레이 id (없으면 null) */
export function topOverlayIdAt(
  overlays: Record<string, OverlayEntity>,
  px: number,
  py: number
): string | null {
  const list = overlayIdsTopFirst(overlays)
  for (let i = list.length - 1; i >= 0; i--) {
    const o = list[i]!
    if (pointInOverlayRect(px, py, o)) return o.id
  }
  return null
}
