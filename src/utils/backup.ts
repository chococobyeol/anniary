import type { AppSettings, AppState, BoardState } from '../types/state'
import type { DrawStrokeWeight } from '../types/state'
import { normalizeBoardViewFilter } from './boardViewFilter'

export type SyncPayload = {
  anniaryExportVersion: 2
  boards: Record<string, BoardState>
  activeBoardId: string | null
  settings: AppSettings
}

export type ManualBackupPayload = SyncPayload & {
  exportedAt: string
  view: AppState['view']
  panel: AppState['panel']
  interactionMode: AppState['interactionMode']
  selection: AppState['selection']
  lastTouchedItemId: AppState['lastTouchedItemId']
  rangeEditPreview: AppState['rangeEditPreview']
  dirty: boolean
}

type BackupSource = Pick<
  AppState,
  | 'boards'
  | 'activeBoardId'
  | 'settings'
  | 'view'
  | 'panel'
  | 'interactionMode'
  | 'selection'
  | 'lastTouchedItemId'
  | 'rangeEditPreview'
  | 'dirty'
>

function normImportedDrawWeight(w: unknown, fallback: DrawStrokeWeight): DrawStrokeWeight {
  return w === 'thin' || w === 'medium' || w === 'thick' ? w : fallback
}

function finiteBetween(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback
}

function hexColor(value: unknown, fallback: string): string {
  return typeof value === 'string'
    && /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value)
    ? value
    : fallback
}

export function normalizeImportedSettings(
  imported: Partial<AppSettings> | undefined,
  current: AppSettings,
  selectedAssetExists: (assetId: string) => boolean,
): AppSettings {
  if (!imported) return current
  const drawTools = ['pen', 'highlighter', 'rect', 'ellipse', 'textbox', 'eraser']
  const backlogLimit = imported.backlogDisplayLimit
  const selectedAssetId = imported.placeStickerAssetId
  return {
    ...current,
    dayLayout:
      imported.dayLayout === 'linear' || imported.dayLayout === 'weekday-aligned'
        ? imported.dayLayout
        : current.dayLayout,
    zoomInverted:
      typeof imported.zoomInverted === 'boolean' ? imported.zoomInverted : current.zoomInverted,
    backlogDisplayLimit:
      backlogLimit === null
        ? null
        : typeof backlogLimit === 'number' && Number.isFinite(backlogLimit) && backlogLimit > 0
          ? Math.round(backlogLimit)
          : current.backlogDisplayLimit,
    showNewlineInsertButton:
      typeof imported.showNewlineInsertButton === 'boolean'
        ? imported.showNewlineInsertButton
        : current.showNewlineInsertButton,
    boardViewFilter: normalizeBoardViewFilter(imported.boardViewFilter ?? current.boardViewFilter),
    drawTool: drawTools.includes(String(imported.drawTool))
      ? imported.drawTool!
      : current.drawTool,
    placeKind:
      imported.placeKind === 'memo' || imported.placeKind === 'sticker'
        ? imported.placeKind
        : current.placeKind,
    placeStickerChar:
      typeof imported.placeStickerChar === 'string' && imported.placeStickerChar.trim()
        ? imported.placeStickerChar.trim()
        : current.placeStickerChar,
    placeStickerAssetId:
      typeof selectedAssetId === 'string' && selectedAssetExists(selectedAssetId)
        ? selectedAssetId
        : null,
    drawPenColor: hexColor(imported.drawPenColor, current.drawPenColor),
    placeMemoWidth: finiteBetween(imported.placeMemoWidth, 12, 120, current.placeMemoWidth),
    placeMemoHeight: finiteBetween(imported.placeMemoHeight, 8, 80, current.placeMemoHeight),
    placeMemoPaperColor: hexColor(imported.placeMemoPaperColor, current.placeMemoPaperColor),
    drawPenWidthWeight: normImportedDrawWeight(
      imported.drawPenWidthWeight,
      current.drawPenWidthWeight,
    ),
    drawHighlighterColor: hexColor(
      imported.drawHighlighterColor,
      current.drawHighlighterColor,
    ),
    drawHighlighterWidthWeight: normImportedDrawWeight(
      imported.drawHighlighterWidthWeight,
      current.drawHighlighterWidthWeight,
    ),
    drawShapeStrokeColor: hexColor(
      imported.drawShapeStrokeColor,
      current.drawShapeStrokeColor,
    ),
    drawShapeFillColor:
      imported.drawShapeFillColor === 'transparent' || imported.drawShapeFillColor === 'none'
        ? imported.drawShapeFillColor
        : hexColor(imported.drawShapeFillColor, current.drawShapeFillColor),
    drawShapeStrokeWeight: normImportedDrawWeight(
      imported.drawShapeStrokeWeight,
      current.drawShapeStrokeWeight,
    ),
  }
}

export function createSyncPayload(state: Pick<BackupSource, 'boards' | 'activeBoardId' | 'settings'>): SyncPayload {
  return {
    anniaryExportVersion: 2,
    boards: state.boards,
    activeBoardId: state.activeBoardId,
    settings: state.settings,
  }
}

export function createManualBackupPayload(state: BackupSource): ManualBackupPayload {
  return {
    ...createSyncPayload(state),
    exportedAt: new Date().toISOString(),
    view: state.view,
    panel: state.panel,
    interactionMode: state.interactionMode,
    selection: state.selection,
    lastTouchedItemId: state.lastTouchedItemId,
    rangeEditPreview: state.rangeEditPreview,
    dirty: state.dirty,
  }
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue)
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    return Object.fromEntries(
      Object.keys(record)
        .sort()
        .filter(key => record[key] !== undefined)
        .map(key => [key, stableValue(record[key])]),
    )
  }
  return value
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(stableValue(value))
}

export async function hashSyncPayload(payload: SyncPayload): Promise<string> {
  const bytes = new TextEncoder().encode(stableStringify(payload))
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}
