import type {
  BoardEntity,
  ItemEntity,
  RangeEntity,
  OverlayEntity,
  AssetEntity,
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

export type AppState = {
  activeBoardId: string | null
  boards: Record<string, BoardState>
  view: ViewState
  panel: PanelState
  interactionMode: InteractionMode
  selection: SelectionTarget | null
  dirty: boolean
}
