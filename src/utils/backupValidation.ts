import type { AppSettings, BoardState } from '../types/state'
import type { ItemEntity } from '../types/entities'
import { isValidBoardYear, MAX_BOARD_YEAR, MIN_BOARD_YEAR } from '../constants/boardYear'
import { isLegacyTagPlaceholder, normalizeTagCatalog } from './tagManagement'

const BOARD_KEYS = ['items', 'ranges', 'overlays'] as const
const ITEM_KINDS = new Set(['task', 'note', 'event'])
const ITEM_STATUSES = new Set(['none', 'in-progress', 'done', 'delayed', 'important'])
const RANGE_KINDS = new Set(['period', 'note', 'highlight'])
const RANGE_STATUSES = new Set(['none', 'active', 'done', 'delayed'])
const OVERLAY_TYPES = new Set(['sticker', 'text', 'shape', 'image'])
const OVERLAY_ROLES = new Set(['semantic', 'decorative'])
const ANCHOR_TYPES = new Set(['none', 'month', 'day', 'range'])

export type ValidatedBackup = {
  boards: Record<string, BoardState>
  activeBoardId: string | null
  settings?: Partial<AppSettings>
  view?: unknown
  panel?: unknown
  interactionMode?: unknown
  selection?: unknown
  lastTouchedItemId?: string | null
  rangeEditPreview?: unknown
  dirty?: boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function fail(path: string, message: string): never {
  throw new Error(`Invalid backup at ${path}: ${message}`)
}

function stringAt(value: unknown, path: string): asserts value is string {
  if (typeof value !== 'string' || value.length === 0) fail(path, 'expected a non-empty string')
}

function finiteAt(value: unknown, path: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value)) fail(path, 'expected a finite number')
}

function recordAt(value: unknown, path: string): asserts value is Record<string, unknown> {
  if (!isRecord(value)) fail(path, 'expected an object')
}

function validateEntityMap(
  value: unknown,
  path: string,
  validate: (entity: Record<string, unknown>, entityPath: string) => void,
): Record<string, unknown> {
  recordAt(value, path)
  for (const [key, entity] of Object.entries(value)) {
    const entityPath = `${path}.${key}`
    recordAt(entity, entityPath)
    stringAt(entity.id, `${entityPath}.id`)
    if (entity.id !== key) fail(`${entityPath}.id`, 'must match its record key')
    validate(entity, entityPath)
  }
  return value
}

function validateBoardState(value: unknown, key: string): BoardState {
  const path = `boards.${key}`
  recordAt(value, path)
  recordAt(value.board, `${path}.board`)
  const board = value.board
  stringAt(board.id, `${path}.board.id`)
  if (board.id !== key) fail(`${path}.board.id`, 'must match its record key')
  finiteAt(board.year, `${path}.board.year`)
  if (!isValidBoardYear(board.year)) {
    fail(`${path}.board.year`, `expected an integer from ${MIN_BOARD_YEAR} to ${MAX_BOARD_YEAR}`)
  }
  stringAt(board.title, `${path}.board.title`)
  finiteAt(board.version, `${path}.board.version`)
  stringAt(board.createdAt, `${path}.board.createdAt`)
  stringAt(board.updatedAt, `${path}.board.updatedAt`)
  if (board.weekStart !== 'monday' && board.weekStart !== 'sunday') {
    fail(`${path}.board.weekStart`, 'expected monday or sunday')
  }

  for (const collection of BOARD_KEYS) {
    if (!(collection in value)) fail(`${path}.${collection}`, 'missing collection')
  }

  const validatedItems = validateEntityMap(value.items, `${path}.items`, (item, itemPath) => {
    if (item.boardId !== key) fail(`${itemPath}.boardId`, 'must match its board')
    if (!ITEM_KINDS.has(String(item.kind))) fail(`${itemPath}.kind`, 'unknown item kind')
    if (!ITEM_STATUSES.has(String(item.status))) fail(`${itemPath}.status`, 'unknown item status')
    if (typeof item.pinned !== 'boolean') fail(`${itemPath}.pinned`, 'expected a boolean')
    stringAt(item.createdAt, `${itemPath}.createdAt`)
    stringAt(item.updatedAt, `${itemPath}.updatedAt`)
  })
  const items = { ...validatedItems } as Record<string, ItemEntity>
  const legacyTags: string[] = []
  for (const [itemId, item] of Object.entries(items)) {
    if (!isLegacyTagPlaceholder(item)) continue
    legacyTags.push(item.tags![0])
    delete items[itemId]
  }

  validateEntityMap(value.ranges, `${path}.ranges`, (range, rangePath) => {
    if (range.boardId !== key) fail(`${rangePath}.boardId`, 'must match its board')
    if (!RANGE_KINDS.has(String(range.kind))) fail(`${rangePath}.kind`, 'unknown range kind')
    if (!RANGE_STATUSES.has(String(range.status))) {
      fail(`${rangePath}.status`, 'unknown range status')
    }
    stringAt(range.startDate, `${rangePath}.startDate`)
    stringAt(range.endDate, `${rangePath}.endDate`)
    stringAt(range.createdAt, `${rangePath}.createdAt`)
    stringAt(range.updatedAt, `${rangePath}.updatedAt`)
  })

  validateEntityMap(value.overlays, `${path}.overlays`, (overlay, overlayPath) => {
    if (overlay.boardId !== key) fail(`${overlayPath}.boardId`, 'must match its board')
    if (!OVERLAY_TYPES.has(String(overlay.type))) fail(`${overlayPath}.type`, 'unknown overlay type')
    if (!OVERLAY_ROLES.has(String(overlay.role))) fail(`${overlayPath}.role`, 'unknown overlay role')
    if (!ANCHOR_TYPES.has(String(overlay.anchorType))) {
      fail(`${overlayPath}.anchorType`, 'unknown anchor type')
    }
    for (const field of ['x', 'y', 'width', 'height', 'opacity'] as const) {
      finiteAt(overlay[field], `${overlayPath}.${field}`)
    }
    if ((overlay.width as number) <= 0 || (overlay.height as number) <= 0) {
      fail(overlayPath, 'overlay width and height must be positive')
    }
    if (typeof overlay.locked !== 'boolean') fail(`${overlayPath}.locked`, 'expected a boolean')
    stringAt(overlay.createdAt, `${overlayPath}.createdAt`)
    stringAt(overlay.updatedAt, `${overlayPath}.updatedAt`)
  })

  const assets = value.assets ?? {}
  validateEntityMap(assets, `${path}.assets`, (asset, assetPath) => {
    if (asset.boardId !== key) fail(`${assetPath}.boardId`, 'must match its board')
    if (asset.type !== 'image') fail(`${assetPath}.type`, 'unknown asset type')
    if (!['builtin', 'user', 'external'].includes(String(asset.sourceType))) {
      fail(`${assetPath}.sourceType`, 'unknown asset source')
    }
    stringAt(asset.storageKey, `${assetPath}.storageKey`)
    stringAt(asset.createdAt, `${assetPath}.createdAt`)
    stringAt(asset.updatedAt, `${assetPath}.updatedAt`)
  })

  const rawTagCatalog = Array.isArray(value.tagCatalog)
    ? value.tagCatalog.filter((tag): tag is string => typeof tag === 'string')
    : []
  const tagCatalog = normalizeTagCatalog([
    ...rawTagCatalog,
    ...legacyTags,
    ...Object.values(items).flatMap(item => item.tags ?? []),
  ])

  return { ...value, tagCatalog, items, assets } as BoardState
}

export function validateBackupPayload(value: unknown): ValidatedBackup {
  recordAt(value, 'root')
  const version = value.anniaryExportVersion
  if (version !== undefined && version !== 1 && version !== 2) {
    fail('anniaryExportVersion', 'unsupported export version')
  }
  recordAt(value.boards, 'boards')

  const boards: Record<string, BoardState> = {}
  for (const [key, board] of Object.entries(value.boards)) {
    boards[key] = validateBoardState(board, key)
  }

  const activeBoardId = value.activeBoardId ?? null
  if (activeBoardId !== null && typeof activeBoardId !== 'string') {
    fail('activeBoardId', 'expected a string or null')
  }
  if (activeBoardId !== null && !boards[activeBoardId]) {
    fail('activeBoardId', 'does not reference an imported board')
  }
  if (value.settings !== undefined && !isRecord(value.settings)) {
    fail('settings', 'expected an object')
  }

  return {
    boards,
    activeBoardId,
    settings: value.settings as Partial<AppSettings> | undefined,
    view: value.view,
    panel: value.panel,
    interactionMode: value.interactionMode,
    selection: value.selection,
    lastTouchedItemId:
      typeof value.lastTouchedItemId === 'string' || value.lastTouchedItemId === null
        ? value.lastTouchedItemId
        : undefined,
    rangeEditPreview: value.rangeEditPreview,
    dirty: typeof value.dirty === 'boolean' ? value.dirty : undefined,
  }
}
