import type {
  BoardEntity,
  ItemEntity,
  RangeEntity,
  OverlayEntity,
  AssetEntity,
  RangeKind,
  RangeStatus,
  DrawToolKind,
} from './entities'

export type ZoomLevel = 'Z0' | 'Z1' | 'Z2' | 'Z3' | 'Z4'

export type InteractionMode = 'pan' | 'select' | 'draw' | 'place'

export type LeftPanelMode =
  | 'backlog'
  | 'search'
  | 'filter'
  | 'layers'
  | 'tags'
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

/** 연간 보드 뷰 전용 (엔티티 변경 없음). `includeTags` 빈 배열 = 모든 태그 표시. */
export type BoardViewFilter = {
  /** 비어 있지 않으면, item의 tags 중 하나라도 일치하면 표시 (OR) */
  includeTags: string[]
  hideDoneItems: boolean
  /** 이 달 클립에서 여러 날에 걸친 기간 막대 */
  showTimelineBarsMultiDay: boolean
  /**
   * false면 **종일(시간 미지정)** 하루 막대·해당 반복 일칸만 숨김. bar 시간으로 칸이 잘리는 하루 막대는 유지.
   */
  showTimelineBarsSingleDay: boolean
  /**
   * false면 **같은 날·이 달에서 한 칸**인 막대만, bar 시간으로 칸이 잘리는 경우 숨김.
   * 여러 날짜 기간은 막대·시간 폭 그대로(종일로 펼치지 않음).
   */
  showTimelineBarsTimeOfDay: boolean
}

export const DEFAULT_BOARD_VIEW_FILTER: BoardViewFilter = {
  includeTags: [],
  hideDoneItems: false,
  showTimelineBarsMultiDay: true,
  showTimelineBarsSingleDay: true,
  showTimelineBarsTimeOfDay: true,
}

/** Place 모드에서 찍는 오버레이 종류 */
export type PlaceKind = 'memo' | 'sticker'

/** 펜·형광펜·도형 선 굵기 프리셋 */
export type DrawStrokeWeight = 'thin' | 'medium' | 'thick'

export type AppSettings = {
  dayLayout: DayLayout
  zoomInverted: boolean
  /** null = show all, number = show last N (by updatedAt) */
  backlogDisplayLimit: number | null
  boardViewFilter: BoardViewFilter
  /** Draw 모드 도구 */
  drawTool: DrawToolKind
  /** Place 모드: 텍스트 메모 vs 스티커(이모지) */
  placeKind: PlaceKind
  /** Place 스티커로 찍을 때 사용할 이모지(한 글자) */
  placeStickerChar: string
  /** 펜·사각형·타원 테두리 색 (SVG hex) */
  drawPenColor: string
  /** Place 메모 기본 가로·세로(보드 단위) */
  placeMemoWidth: number
  placeMemoHeight: number
  /** 새 메모 종이 배경색 */
  placeMemoPaperColor: string
  /** 펜 선 굵기 */
  drawPenWidthWeight: DrawStrokeWeight
  /** 형광펜 색(hex) */
  drawHighlighterColor: string
  drawHighlighterWidthWeight: DrawStrokeWeight
  /** 사각·타원 테두리·채우기 */
  drawShapeStrokeColor: string
  drawShapeFillColor: string
  drawShapeStrokeWeight: DrawStrokeWeight
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
  /**
   * 키가 있으면 미리보기 값 사용. 빈 문자열이면 해당 끝을 “칸 전체”로(시간 자름 없음).
   */
  barStartTime?: string
  barEndTime?: string
}

export type AppState = {
  _hydrated: boolean
  activeBoardId: string | null
  boards: Record<string, BoardState>
  view: ViewState
  panel: PanelState
  interactionMode: InteractionMode
  selection: SelectionTarget | null
  /** 마지막으로 선택한 일정(item) — 오버레이 선택 중에도 메모 연결에 사용 */
  lastTouchedItemId: string | null
  settings: AppSettings
  /** 디테일 편집 중 보드에만 반영, Save 시 스토어와 동기화 */
  rangeEditPreview: RangeEditPreview | null
  dirty: boolean
  /** undo/redo 버튼 비활성화용 (히스토리 스택은 모듈 전역) */
  _historyUi: { canUndo: boolean; canRedo: boolean }
}
