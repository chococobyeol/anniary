import type {
  BoardEntity,
  ItemEntity,
  RangeEntity,
  OverlayEntity,
  AssetEntity,
  RangeKind,
  RangeStatus,
} from './entities'

export type ZoomLevel = 'Z0' | 'Z1' | 'Z2' | 'Z3' | 'Z4'

export type InteractionMode = 'pan' | 'select' | 'draw' | 'place'

export type LeftPanelMode =
  | 'backlog'
  | 'search'
  | 'filter'
  | 'layers'
  | 'ranges'
  | 'overlays'
  | 'detail'

export type RightPanelMode =
  | 'settings'
  | 'account'
  | 'sync'
  | 'export'
  | 'theme'
  | 'help'
  | 'about'

export type SelectionTarget =
  | { type: 'day'; dateKey: string }
  | { type: 'item'; itemId: string }
  | { type: 'range'; rangeId: string }
  | { type: 'overlay'; overlayId: string }
  | { type: 'days'; dateKeys: string[] }

export type ViewState = {
  scale: number
  translateX: number
  translateY: number
  zoomLevel: ZoomLevel
}

export type PanelState = {
  leftOpen: boolean
  leftMode: LeftPanelMode
  rightOpen: boolean
  rightMode: RightPanelMode
}

export type BoardState = {
  board: BoardEntity
  items: Record<string, ItemEntity>
  ranges: Record<string, RangeEntity>
  overlays: Record<string, OverlayEntity>
  assets: Record<string, AssetEntity>
}

export type DayLayout = 'linear' | 'weekday-aligned'

export type AppSettings = {
  dayLayout: DayLayout
  zoomInverted: boolean
  /** null = show all, number = show last N (by updatedAt) */
  backlogDisplayLimit: number | null
}

/** 저장 전 간트/스타일 미리보기 (persist/dirty 아님) */
export type RangeEditPreview = {
  rangeId: string
  /** undefined면 저장된 range.color 사용 */
  color?: string
  /** undefined면 저장된 range.kind 사용 */
  kind?: RangeKind
  status?: RangeStatus
  /** undefined면 저장된 range.timelineBarHidden 사용 */
  timelineBarHidden?: boolean
  /** undefined면 저장된 range.timelinePriority 사용 */
  timelinePriority?: number
}

export type AppState = {
  activeBoardId: string | null
  boards: Record<string, BoardState>
  view: ViewState
  panel: PanelState
  interactionMode: InteractionMode
  selection: SelectionTarget | null
  settings: AppSettings
  /** 디테일 편집 중 보드에만 반영, Save 시 스토어와 동기화 */
  rangeEditPreview: RangeEditPreview | null
  dirty: boolean
}
