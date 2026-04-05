import type {
  BoardState,
  InteractionMode,
  LeftPanelMode,
  PanelState,
  RangeEditPreview,
  RightPanelMode,
  SelectionTarget,
  ViewState,
  ZoomLevel,
} from '../types/state'
import { MIN_SCALE, MAX_SCALE } from './zoom'

/** JSON 가져오기 / 테스트용 — 필드 누락 시 정규화 단계에서 기본값 */
export type ImportUiBlob = {
  view?: unknown
  panel?: unknown
  interactionMode?: unknown
  selection?: unknown
  lastTouchedItemId?: string | null
  rangeEditPreview?: unknown
  dirty?: boolean
}

const LEFT_MODES: LeftPanelMode[] = [
  'backlog', 'search', 'filter', 'layers', 'tags', 'overlays', 'detail',
]
const RIGHT_MODES: RightPanelMode[] = [
  'settings', 'account', 'sync', 'export', 'theme', 'help', 'about',
]

const DEFAULT_VIEW: ViewState = {
  scale: 1,
  translateX: 0,
  translateY: 0,
  zoomLevel: 'Z1',
}

const DEFAULT_PANEL: PanelState = {
  leftOpen: false,
  leftMode: 'backlog',
  rightOpen: false,
  rightMode: 'settings',
}

export function normImportedView(v: unknown): ViewState {
  if (!v || typeof v !== 'object') return { ...DEFAULT_VIEW }
  const o = v as Record<string, unknown>
  const scaleRaw = o.scale
  const scale =
    typeof scaleRaw === 'number' && Number.isFinite(scaleRaw)
      ? Math.min(MAX_SCALE, Math.max(MIN_SCALE, scaleRaw))
      : DEFAULT_VIEW.scale
  const tx =
    typeof o.translateX === 'number' && Number.isFinite(o.translateX)
      ? o.translateX
      : DEFAULT_VIEW.translateX
  const ty =
    typeof o.translateY === 'number' && Number.isFinite(o.translateY)
      ? o.translateY
      : DEFAULT_VIEW.translateY
  const z = o.zoomLevel
  const zoomLevel: ZoomLevel =
    z === 'Z0' || z === 'Z1' || z === 'Z2' || z === 'Z3' || z === 'Z4'
      ? z
      : DEFAULT_VIEW.zoomLevel
  return { scale, translateX: tx, translateY: ty, zoomLevel }
}

export function normImportedPanel(v: unknown): PanelState {
  if (!v || typeof v !== 'object') return { ...DEFAULT_PANEL }
  const o = v as Record<string, unknown>
  const leftOpen = typeof o.leftOpen === 'boolean' ? o.leftOpen : DEFAULT_PANEL.leftOpen
  const rightOpen = typeof o.rightOpen === 'boolean' ? o.rightOpen : DEFAULT_PANEL.rightOpen
  const lm = o.leftMode
  const leftMode = LEFT_MODES.includes(lm as LeftPanelMode) ? (lm as LeftPanelMode) : DEFAULT_PANEL.leftMode
  const rm = o.rightMode
  const rightMode = RIGHT_MODES.includes(rm as RightPanelMode)
    ? (rm as RightPanelMode)
    : DEFAULT_PANEL.rightMode
  return { leftOpen, leftMode, rightOpen, rightMode }
}

export function normImportedInteractionMode(v: unknown): InteractionMode {
  return v === 'pan' || v === 'select' || v === 'draw' || v === 'place' ? v : 'pan'
}

export function parseSelectionJson(v: unknown): SelectionTarget | null {
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  const t = o.type
  if (t === 'day' && typeof o.dateKey === 'string') {
    return { type: 'day', dateKey: o.dateKey }
  }
  if (t === 'item' && typeof o.itemId === 'string') {
    return { type: 'item', itemId: o.itemId }
  }
  if (t === 'range' && typeof o.rangeId === 'string') {
    return { type: 'range', rangeId: o.rangeId }
  }
  if (t === 'overlay' && typeof o.overlayId === 'string') {
    return { type: 'overlay', overlayId: o.overlayId }
  }
  if (t === 'days' && Array.isArray(o.dateKeys) && o.dateKeys.every(x => typeof x === 'string')) {
    const dateKeys = o.dateKeys as string[]
    if (dateKeys.length === 0) return null
    return { type: 'days', dateKeys }
  }
  return null
}

export function parseRangeEditPreviewJson(v: unknown): RangeEditPreview | null {
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  if (typeof o.rangeId !== 'string') return null
  return {
    rangeId: o.rangeId,
    color: typeof o.color === 'string' ? o.color : undefined,
    kind: o.kind === 'period' || o.kind === 'note' || o.kind === 'highlight' ? o.kind : undefined,
    status: o.status === 'none' || o.status === 'active' || o.status === 'done' || o.status === 'delayed'
      ? o.status
      : undefined,
    timelineBarHidden: typeof o.timelineBarHidden === 'boolean' ? o.timelineBarHidden : undefined,
    timelinePriority: typeof o.timelinePriority === 'number' ? o.timelinePriority : undefined,
    barStartTime: typeof o.barStartTime === 'string' ? o.barStartTime : undefined,
    barEndTime: typeof o.barEndTime === 'string' ? o.barEndTime : undefined,
  }
}

export function sanitizeSelectionForActiveBoard(
  boards: Record<string, BoardState>,
  activeBoardId: string | null,
  sel: SelectionTarget | null
): SelectionTarget | null {
  if (!sel || !activeBoardId) return null
  const bs = boards[activeBoardId]
  if (!bs) return null
  switch (sel.type) {
    case 'day':
    case 'days':
      return sel.type === 'days' && sel.dateKeys.length === 0 ? null : sel
    case 'item':
      return bs.items[sel.itemId] ? sel : null
    case 'range':
      return bs.ranges[sel.rangeId] ? sel : null
    case 'overlay':
      return bs.overlays[sel.overlayId] ? sel : null
    default:
      return null
  }
}

export function sanitizeLastTouchedItemId(
  boards: Record<string, BoardState>,
  activeBoardId: string | null,
  id: string | null
): string | null {
  if (!id || !activeBoardId) return null
  return boards[activeBoardId]?.items[id] ? id : null
}

export function sanitizeRangeEditPreview(
  boards: Record<string, BoardState>,
  activeBoardId: string | null,
  preview: RangeEditPreview | null
): RangeEditPreview | null {
  if (!preview || !activeBoardId) return null
  return boards[activeBoardId]?.ranges[preview.rangeId] ? preview : null
}
