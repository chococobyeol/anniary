import type { ZoomLevel } from '../types'

export const ZOOM_BREAKPOINTS: { level: ZoomLevel; minWidth: number }[] = [
  { level: 'Z0', minWidth: 0 },
  { level: 'Z1', minWidth: 28 },
  { level: 'Z2', minWidth: 48 },
  { level: 'Z3', minWidth: 80 },
  { level: 'Z4', minWidth: 128 },
]

export function getZoomLevel(cellScreenWidth: number): ZoomLevel {
  let level: ZoomLevel = 'Z0'
  for (const bp of ZOOM_BREAKPOINTS) {
    if (cellScreenWidth >= bp.minWidth) level = bp.level
  }
  return level
}

export const BASE_CELL_WIDTH = 28
export const BASE_CELL_HEIGHT = 22
export const MONTH_HEADER_WIDTH = 48
export const MONTH_GAP = 4
export const MIN_SCALE = 0.3
export const MAX_SCALE = 8
