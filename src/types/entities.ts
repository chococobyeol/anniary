/** mwohaji_v1과 동일: 1=월 … 7=일 */
export type Weekday1to7 = 1 | 2 | 3 | 4 | 5 | 6 | 7

/**
 * 반복 규칙 (mwohaji: 매일/매주/매월/시간 간격 + 매년).
 * `interval`은 연간 칸에는 시작일만 표시(알림·상세용); 날짜 확장 없음.
 */
export type ItemRepeatRule =
  | { kind: 'daily'; everyNDays: number; untilDate?: string }
  | { kind: 'weekly'; weekdays: Weekday1to7[]; everyNWeeks?: number; untilDate?: string }
  | { kind: 'monthly'; monthDays: number[]; everyNMonths?: number; untilDate?: string }
  | { kind: 'yearly'; untilDate?: string }
  | { kind: 'interval'; everyNMinutes: number; limit?: number }

/** 구버전 저장분 (frequency) — 런타임에서 `kind` 형식으로 정규화 */
export type LegacyItemRepeat = {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  untilDate?: string
}

export type ItemStoredRepeat = ItemRepeatRule | LegacyItemRepeat

export type ItemKind = 'task' | 'note' | 'event'
export type ItemStatus = 'none' | 'in-progress' | 'done' | 'delayed' | 'important'
export type RangeKind = 'period' | 'note' | 'highlight'
export type RangeStatus = 'none' | 'active' | 'done' | 'delayed'
export type OverlayType = 'sticker' | 'text' | 'shape' | 'image'
export type OverlayRole = 'semantic' | 'decorative'
export type OverlayAnchorType = 'none' | 'month' | 'day' | 'range'
/** 펜·형광펜(자유곡선 pathD), 도형(rect/ellipse), 지우개(오버레이 삭제) */
export type DrawToolKind = 'pen' | 'highlighter' | 'rect' | 'ellipse' | 'eraser'
export type AssetType = 'image'
export type AssetSourceType = 'builtin' | 'user' | 'external'

export type BoardEntity = {
  id: string
  year: number
  title: string
  weekStart: 'monday' | 'sunday'
  version: number
  createdAt: string
  updatedAt: string
}

export type ItemEntity = {
  id: string
  boardId: string
  kind: ItemKind
  title?: string
  body?: string
  date?: string
  /** Inclusive end of a multi-day task; should match linked range.endDate when rangeId is set */
  endDate?: string
  startTime?: string
  endTime?: string
  rangeId?: string
  tags?: string[]
  status: ItemStatus
  progress?: number
  pinned: boolean
  /**
   * 시작일=종료일인 경우 날짜·막대 확장( interval 제외: 시작일만 ).
   * 저장소에 구 `frequency` 형식이 있을 수 있음 → `getEffectiveItemRepeat`로 정규화.
   */
  repeat?: ItemStoredRepeat
  createdAt: string
  updatedAt: string
}

export type RangeEntity = {
  id: string
  boardId: string
  kind: RangeKind
  startDate: string
  endDate: string
  label?: string
  body?: string
  status: RangeStatus
  color?: string
  /** true면 연간 보드 하단 기간 막대(간트 바)를 그리지 않음. 일정·디테일·백로그는 유지 */
  timelineBarHidden?: boolean
  /**
   * `startDate` 칸 안에서 막대 시작 위치 (HH:mm, 24h). 없으면 그날 칸 왼쪽(자정)부터.
   */
  barStartTime?: string
  /**
   * `endDate` 칸 안에서 막대 끝 위치 (HH:mm, 24h). 없으면 그날 칸 오른쪽까지.
   */
  barEndTime?: string
  /** 표시 순서: 같은 날 셀 안 일정 줄·겹치는 막대 트랙에서 큰 값이 위쪽에 표시됨. 기본 0 */
  timelinePriority?: number
  createdAt: string
  updatedAt: string
}

export type OverlayEntity = {
  id: string
  boardId: string
  type: OverlayType
  role: OverlayRole
  x: number
  y: number
  width: number
  height: number
  rotation?: number
  opacity: number
  locked: boolean
  anchorType: OverlayAnchorType
  anchorId?: string
  text?: string
  assetId?: string
  /** `(x,y)` 기준 상대 좌표의 SVG path `d` — 펜/형광펜 */
  pathD?: string
  drawTool?: DrawToolKind
  strokeColor?: string
  fillColor?: string
  strokeWidthPx?: number
  /** false면 보드에서 숨김(목록에는 유지) */
  visible?: boolean
  /** 메모 등이 연결된 일정(item) — 보드에 있는 항목 id */
  linkedItemId?: string
  createdAt: string
  updatedAt: string
}

export type AssetEntity = {
  id: string
  boardId: string
  type: AssetType
  sourceType: AssetSourceType
  mimeType?: string
  storageKey: string
  width?: number
  height?: number
  createdAt: string
  updatedAt: string
}
