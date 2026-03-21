import type { ItemKind, ItemStatus, RangeKind, RangeStatus, OverlayType, OverlayRole, OverlayAnchorType } from './entities'

export type CommandActor = 'user' | 'system' | 'ai'

export type CommandEnvelope<TType extends string, TPayload> = {
  type: TType
  payload: TPayload
  commandId?: string
  issuedAt?: string
  actor?: CommandActor
}

// Board
export type CreateBoardCommand = CommandEnvelope<'createBoard', {
  year: number
  title?: string
  weekStart?: 'monday' | 'sunday'
}>

export type UpdateBoardCommand = CommandEnvelope<'updateBoard', {
  boardId: string
  patch: { title?: string; weekStart?: 'monday' | 'sunday' }
}>

// Item
export type CreateItemCommand = CommandEnvelope<'createItem', {
  boardId: string
  kind: ItemKind
  title?: string
  body?: string
  date?: string
  endDate?: string
  rangeId?: string
  status?: ItemStatus
  progress?: number
  pinned?: boolean
}>

export type UpdateItemCommand = CommandEnvelope<'updateItem', {
  itemId: string
  patch: {
    kind?: ItemKind
    title?: string
    body?: string
    date?: string | null
    endDate?: string | null
    rangeId?: string | null
    status?: ItemStatus
    progress?: number | null
    pinned?: boolean
  }
}>

export type DeleteItemCommand = CommandEnvelope<'deleteItem', { itemId: string }>

export type MoveItemToDateCommand = CommandEnvelope<'moveItemToDate', {
  itemId: string
  date: string | null
}>

export type SetItemStatusCommand = CommandEnvelope<'setItemStatus', {
  itemId: string
  status: ItemStatus
}>

// Range
export type CreateRangeCommand = CommandEnvelope<'createRange', {
  boardId: string
  kind: RangeKind
  startDate: string
  endDate: string
  label?: string
  body?: string
  status?: RangeStatus
  color?: string
}>

export type UpdateRangeCommand = CommandEnvelope<'updateRange', {
  rangeId: string
  patch: {
    kind?: RangeKind
    startDate?: string
    endDate?: string
    label?: string
    body?: string
    status?: RangeStatus
    color?: string
  }
}>

export type DeleteRangeCommand = CommandEnvelope<'deleteRange', { rangeId: string }>

// Overlay
export type CreateOverlayCommand = CommandEnvelope<'createOverlay', {
  boardId: string
  type: OverlayType
  role: OverlayRole
  x: number
  y: number
  width: number
  height: number
  opacity?: number
  locked?: boolean
  anchorType?: OverlayAnchorType
  text?: string
  assetId?: string
}>

export type UpdateOverlayCommand = CommandEnvelope<'updateOverlay', {
  overlayId: string
  patch: {
    role?: OverlayRole
    x?: number
    y?: number
    width?: number
    height?: number
    opacity?: number
    locked?: boolean
    anchorType?: OverlayAnchorType
    anchorId?: string | null
    text?: string
    assetId?: string | null
  }
}>

export type DeleteOverlayCommand = CommandEnvelope<'deleteOverlay', { overlayId: string }>

export type MoveOverlayCommand = CommandEnvelope<'moveOverlay', {
  overlayId: string
  x: number
  y: number
}>

export type SetOverlayLockCommand = CommandEnvelope<'setOverlayLock', {
  overlayId: string
  locked: boolean
}>

export type AnyCommand =
  | CreateBoardCommand
  | UpdateBoardCommand
  | CreateItemCommand
  | UpdateItemCommand
  | DeleteItemCommand
  | MoveItemToDateCommand
  | SetItemStatusCommand
  | CreateRangeCommand
  | UpdateRangeCommand
  | DeleteRangeCommand
  | CreateOverlayCommand
  | UpdateOverlayCommand
  | DeleteOverlayCommand
  | MoveOverlayCommand
  | SetOverlayLockCommand
