export type ItemKind = 'task' | 'note' | 'event'
export type ItemStatus = 'none' | 'in-progress' | 'done' | 'delayed' | 'important'
export type RangeKind = 'period' | 'note' | 'highlight'
export type RangeStatus = 'none' | 'active' | 'done' | 'delayed'
export type OverlayType = 'sticker' | 'text' | 'shape' | 'image'
export type OverlayRole = 'semantic' | 'decorative'
export type OverlayAnchorType = 'none' | 'month' | 'day' | 'range'
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
