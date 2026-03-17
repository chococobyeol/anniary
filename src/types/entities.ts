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
  rangeId?: string
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
