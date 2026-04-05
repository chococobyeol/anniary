import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  AppState,
  AppSettings,
  BoardState,
  BoardViewFilter,
  DrawStrokeWeight,
  InteractionMode,
  LeftPanelMode,
  RangeEditPreview,
  RightPanelMode,
  SelectionTarget,
  ViewState,
} from '../types/state'
import { DEFAULT_BOARD_VIEW_FILTER } from '../types/state'
import { normalizeBoardViewFilter } from '../utils/boardViewFilter'
import type {
  BoardEntity,
  ItemEntity,
  RangeEntity,
  OverlayEntity,
  ItemKind,
  ItemStatus,
  ItemStoredRepeat,
  RangeKind,
  RangeStatus,
  OverlayType,
  OverlayRole,
  OverlayAnchorType,
  DrawToolKind,
  TextBoxFontKey,
} from '../types/entities'
import { generateId, now } from '../utils/id'
import { getZoomLevel, BASE_CELL_WIDTH, BASE_CELL_HEIGHT, MONTH_HEADER_WIDTH, MONTH_GAP, DAY_HEADER_HEIGHT, MAX_SCALE } from '../utils/zoom'
import { getMaxColumnsForYear } from '../utils/date'
import {
  normImportedView,
  normImportedPanel,
  normImportedInteractionMode,
  parseSelectionJson,
  parseRangeEditPreviewJson,
  sanitizeSelectionForActiveBoard,
  sanitizeLastTouchedItemId,
  sanitizeRangeEditPreview,
  type ImportUiBlob,
} from '../utils/persistedAppSlice'

type Actions = {
  createBoard: (year: number, title?: string) => string
  setActiveBoard: (boardId: string) => void

  setView: (view: Partial<ViewState>) => void
  updateZoomLevel: () => void
  resetView: (containerWidth: number, containerHeight: number) => void

  toggleLeftPanel: (mode?: LeftPanelMode) => void
  /** 같은 모드여도 닫지 않고 연다(디테일 유지·오버레이 선택 등). */
  ensureLeftPanelOpen: (mode: LeftPanelMode) => void
  toggleRightPanel: (mode?: RightPanelMode) => void
  closeAllPanels: () => void

  setInteractionMode: (mode: InteractionMode) => void
  setSelection: (target: SelectionTarget | null) => void
  /** 저장 전 간트 미리보기만 (dirty 변경 없음) */
  setRangeEditPreview: (preview: RangeEditPreview | null) => void

  updateSettings: (patch: Partial<AppSettings>) => void
  updateBoardViewFilter: (patch: Partial<BoardViewFilter>) => void
  resetBoardViewFilter: () => void

  createItem: (boardId: string, kind: ItemKind, opts?: {
    title?: string; body?: string; date?: string; endDate?: string; startTime?: string; endTime?: string;
    rangeId?: string; tags?: string[]; status?: ItemStatus; progress?: number; pinned?: boolean; repeat?: ItemStoredRepeat
  }) => string
  updateItem: (itemId: string, patch: Partial<ItemEntity>) => void
  deleteItem: (itemId: string) => void

  createRange: (boardId: string, kind: RangeKind, startDate: string, endDate: string, opts?: {
    label?: string; body?: string; status?: RangeStatus; color?: string
    timelineBarHidden?: boolean; timelinePriority?: number
    barStartTime?: string; barEndTime?: string
  }) => string
  updateRange: (rangeId: string, patch: Partial<RangeEntity>) => void
  deleteRange: (rangeId: string) => void

  createOverlay: (boardId: string, type: OverlayType, role: OverlayRole, x: number, y: number, w: number, h: number, opts?: {
    opacity?: number; locked?: boolean; anchorType?: OverlayAnchorType; text?: string; assetId?: string
    pathD?: string
    drawTool?: DrawToolKind
    strokeColor?: string
    fillColor?: string
    strokeWidthPx?: number
    fillOpacity?: number
    strokeOpacity?: number
    textBoxFontSizePx?: number
    textBoxFontKey?: TextBoxFontKey
    textBoxTextColor?: string
    textBoxContentHeight?: number
    visible?: boolean
    linkedItemId?: string
  }) => string
  updateOverlay: (overlayId: string, patch: Partial<OverlayEntity>) => void
  deleteOverlay: (overlayId: string) => void

  undo: () => void
  redo: () => void
  /** 여러 `updateItem` 등을 한 번의 undo로 묶기 시작 */
  beginHistoryBatch: () => void
  endHistoryBatch: () => void
  /** JSON 가져오기용 — boards 전체 교체 */
  replaceBoardsState: (boards: Record<string, BoardState>, activeBoardId: string | null) => void
  /** 가져오기: 보드+설정을 한 번에 적용하고, undo 시 둘 다 이전 값으로 복원 */
  importBoardsAndSettings: (
    boards: Record<string, BoardState>,
    activeBoardId: string | null,
    settings: AppSettings,
    /** 생략 시: 뷰·패널·모드·선택 등 UI 상태는 유지하고 selection만 null (기존 동작) */
    ui?: ImportUiBlob
  ) => void
  /** localStorage·undo 스택 포함 앱 데이터 전부 초기화(확인은 UI에서) */
  resetAllData: () => void
}

const initialState: AppState = {
  _hydrated: false,
  activeBoardId: null,
  boards: {},
  view: { scale: 1, translateX: 0, translateY: 0, zoomLevel: 'Z1' },
  panel: { leftOpen: false, leftMode: 'backlog', rightOpen: false, rightMode: 'settings' },
  interactionMode: 'pan',
  selection: null,
  lastTouchedItemId: null,
  settings: {
    dayLayout: 'linear',
    zoomInverted: false,
    backlogDisplayLimit: null,
    showNewlineInsertButton: false,
    boardViewFilter: { ...DEFAULT_BOARD_VIEW_FILTER },
    drawTool: 'pen',
    placeKind: 'memo',
    placeStickerChar: '⭐',
    drawPenColor: '#2563eb',
    placeMemoWidth: 40,
    placeMemoHeight: 16,
    placeMemoPaperColor: '#ffffff',
    drawPenWidthWeight: 'medium',
    drawHighlighterColor: '#facc15',
    drawHighlighterWidthWeight: 'medium',
    drawShapeStrokeColor: '#2563eb',
    drawShapeFillColor: 'transparent',
    drawShapeStrokeWeight: 'medium',
  },
  rangeEditPreview: null,
  dirty: false,
  _historyUi: { canUndo: false, canRedo: false },
}

function getResetAppState(): AppState {
  return {
    _hydrated: true,
    activeBoardId: null,
    boards: {},
    view: { scale: 1, translateX: 0, translateY: 0, zoomLevel: 'Z1' },
    panel: { leftOpen: false, leftMode: 'backlog', rightOpen: false, rightMode: 'settings' },
    interactionMode: 'pan',
    selection: null,
    lastTouchedItemId: null,
    settings: {
      dayLayout: 'linear',
      zoomInverted: false,
      backlogDisplayLimit: null,
      showNewlineInsertButton: false,
      boardViewFilter: { ...DEFAULT_BOARD_VIEW_FILTER },
      drawTool: 'pen',
      placeKind: 'memo',
      placeStickerChar: '⭐',
      drawPenColor: '#2563eb',
      placeMemoWidth: 40,
      placeMemoHeight: 16,
      placeMemoPaperColor: '#ffffff',
      drawPenWidthWeight: 'medium',
      drawHighlighterColor: '#facc15',
      drawHighlighterWidthWeight: 'medium',
      drawShapeStrokeColor: '#2563eb',
      drawShapeFillColor: 'transparent',
      drawShapeStrokeWeight: 'medium',
    },
    rangeEditPreview: null,
    dirty: false,
    _historyUi: { canUndo: false, canRedo: false },
  }
}

const MAX_HISTORY = 32
/** `settings`가 있으면 undo/redo 시 설정까지 복원(JSON 가져오기 등). 없으면 보드만 복원(필터 등 설정 유지). */
type HistorySnap = {
  boards: Record<string, BoardState>
  activeBoardId: string | null
  settings?: AppSettings
}

const historyPast: HistorySnap[] = []
const historyFuture: HistorySnap[] = []
let historyRestoring = false
let historyBatchDepth = 0

function snapshotBoardsOnly(s: AppState): HistorySnap {
  return { boards: structuredClone(s.boards), activeBoardId: s.activeBoardId }
}

function snapshotBoardsAndSettings(s: AppState): HistorySnap {
  return {
    boards: structuredClone(s.boards),
    activeBoardId: s.activeBoardId,
    settings: structuredClone(s.settings),
  }
}

function findBoardForEntity(
  boards: Record<string, BoardState>,
  entityType: 'items' | 'ranges' | 'overlays',
  entityId: string
): string | null {
  for (const [boardId, bs] of Object.entries(boards)) {
    if (entityId in bs[entityType]) return boardId
  }
  return null
}

function getBoardColumns(state: AppState): number {
  if (state.settings.dayLayout === 'linear') return 31
  const boardId = state.activeBoardId
  if (!boardId) return 37
  const bs = state.boards[boardId]
  if (!bs) return 37
  return getMaxColumnsForYear(bs.board.year)
}

const VALID_DRAW_TOOLS: DrawToolKind[] = ['pen', 'highlighter', 'rect', 'ellipse', 'textbox', 'eraser']

function normDrawWeight(w: unknown): DrawStrokeWeight {
  return w === 'thin' || w === 'medium' || w === 'thick' ? w : 'medium'
}

export const useBoardStore = create<AppState & Actions>()(
  persist(
    (set, get) => {
  const syncHistoryUi = () => {
    set({
      _historyUi: {
        canUndo: historyPast.length > 0,
        canRedo: historyFuture.length > 0,
      },
    })
  }

  const maybePushHistory = () => {
    if (historyRestoring || historyBatchDepth > 0) return
    const s = get()
    historyPast.push(snapshotBoardsOnly(s))
    if (historyPast.length > MAX_HISTORY) historyPast.shift()
    historyFuture.length = 0
    syncHistoryUi()
  }

  return {
  ...initialState,

  createBoard: (year, title) => {
    maybePushHistory()
    const id = generateId()
    const board: BoardEntity = {
      id, year, title: title || `${year}`, weekStart: 'monday',
      version: 1, createdAt: now(), updatedAt: now(),
    }
    const boardState: BoardState = { board, items: {}, ranges: {}, overlays: {}, assets: {} }
    set(s => ({
      boards: { ...s.boards, [id]: boardState },
      activeBoardId: s.activeBoardId || id,
      dirty: true,
    }))
    return id
  },

  setActiveBoard: (boardId) => set({ activeBoardId: boardId }),

  setView: (partial) => set(s => ({ view: { ...s.view, ...partial } })),

  updateZoomLevel: () => {
    const { view } = get()
    const cellScreenWidth = BASE_CELL_WIDTH * view.scale
    const zoomLevel = getZoomLevel(cellScreenWidth)
    if (zoomLevel !== view.zoomLevel) {
      set(s => ({ view: { ...s.view, zoomLevel } }))
    }
  },

  resetView: (containerWidth, containerHeight) => {
    const state = get()
    const cols = getBoardColumns(state)
    const headerH = state.settings.dayLayout === 'weekday-aligned' ? DAY_HEADER_HEIGHT : 0
    const boardWidth = MONTH_HEADER_WIDTH + cols * (BASE_CELL_WIDTH + 1)
    const boardHeight = headerH + 12 * (BASE_CELL_HEIGHT + MONTH_GAP)
    const padX = 16
    const padY = 16
    const scaleX = (containerWidth - padX * 2) / boardWidth
    const scaleY = (containerHeight - padY * 2) / boardHeight
    const scale = Math.min(scaleX, scaleY, MAX_SCALE)
    const scaledW = boardWidth * scale
    const scaledH = boardHeight * scale
    const translateX = (containerWidth - scaledW) / 2
    const translateY = (containerHeight - scaledH) / 2
    const zoomLevel = getZoomLevel(BASE_CELL_WIDTH * scale)
    set({ view: { scale, translateX, translateY, zoomLevel } })
  },

  toggleLeftPanel: (mode) => set(s => {
    if (mode && s.panel.leftOpen && s.panel.leftMode === mode) {
      return { panel: { ...s.panel, leftOpen: false } }
    }
    return { panel: { ...s.panel, leftOpen: true, leftMode: mode || s.panel.leftMode } }
  }),

  ensureLeftPanelOpen: mode => set(s => ({
    panel: { ...s.panel, leftOpen: true, leftMode: mode },
  })),

  toggleRightPanel: (mode) => set(s => {
    if (mode && s.panel.rightOpen && s.panel.rightMode === mode) {
      return { panel: { ...s.panel, rightOpen: false } }
    }
    return { panel: { ...s.panel, rightOpen: true, rightMode: mode || s.panel.rightMode } }
  }),

  closeAllPanels: () => set(s => ({
    panel: { ...s.panel, leftOpen: false, rightOpen: false },
  })),

  setInteractionMode: (mode) => set({ interactionMode: mode }),
  setSelection: (target) => set(s => ({
    selection: target,
    lastTouchedItemId: target?.type === 'item' ? target.itemId : s.lastTouchedItemId,
  })),

  setRangeEditPreview: (preview) => set({ rangeEditPreview: preview }),

  updateSettings: (patch) => set(s => {
    const next: AppSettings = { ...s.settings, ...patch }
    next.boardViewFilter = normalizeBoardViewFilter(
      patch.boardViewFilter
        ? { ...normalizeBoardViewFilter(s.settings.boardViewFilter), ...patch.boardViewFilter }
        : s.settings.boardViewFilter
    )
    return { settings: next }
  }),

  updateBoardViewFilter: (patch) => set(s => ({
    settings: {
      ...s.settings,
      boardViewFilter: normalizeBoardViewFilter({ ...s.settings.boardViewFilter, ...patch }),
    },
  })),

  resetBoardViewFilter: () => set(s => ({
    settings: {
      ...s.settings,
      boardViewFilter: { ...DEFAULT_BOARD_VIEW_FILTER },
    },
  })),

  createItem: (boardId, kind, opts) => {
    maybePushHistory()
    const id = generateId()
    const item: ItemEntity = {
      id, boardId, kind,
      title: opts?.title, body: opts?.body, date: opts?.date, endDate: opts?.endDate,
      startTime: opts?.startTime, endTime: opts?.endTime, rangeId: opts?.rangeId,
      tags: opts?.tags && opts.tags.length > 0 ? opts.tags : ['General'],
      status: opts?.status || 'none', progress: opts?.progress,
      pinned: opts?.pinned || false,
      repeat: opts?.repeat,
      createdAt: now(), updatedAt: now(),
    }
    set(s => {
      const bs = s.boards[boardId]
      if (!bs) return s
      return {
        boards: { ...s.boards, [boardId]: { ...bs, items: { ...bs.items, [id]: item } } },
        dirty: true,
      }
    })
    return id
  },

  updateItem: (itemId, patch) => {
    maybePushHistory()
    return set(s => {
    const boardId = findBoardForEntity(s.boards, 'items', itemId)
    if (!boardId) return s
    const bs = s.boards[boardId]
    const old = bs.items[itemId]
    if (!old) return s
    const updated = { ...old, ...patch, updatedAt: now() }
    return {
      boards: { ...s.boards, [boardId]: { ...bs, items: { ...bs.items, [itemId]: updated } } },
      dirty: true,
    }
    })
  },

  deleteItem: (itemId) => {
    maybePushHistory()
    return set(s => {
    const boardId = findBoardForEntity(s.boards, 'items', itemId)
    if (!boardId) return s
    const bs = s.boards[boardId]
    const item = bs.items[itemId]
    if (!item) return s

    let ranges = bs.ranges
    if (item.rangeId) {
      const rid = item.rangeId
      const stillUsed = Object.values(bs.items).some(
        it => it.id !== itemId && it.rangeId === rid
      )
      if (!stillUsed) {
        const { [rid]: _removed, ...restRanges } = ranges
        ranges = restRanges
      }
    }

    const { [itemId]: _, ...rest } = bs.items
    return {
      boards: { ...s.boards, [boardId]: { ...bs, items: rest, ranges } },
      dirty: true,
    }
    })
  },

  createRange: (boardId, kind, startDate, endDate, opts) => {
    maybePushHistory()
    const id = generateId()
    const range: RangeEntity = {
      id, boardId, kind, startDate, endDate,
      label: opts?.label, body: opts?.body,
      status: opts?.status || 'none', color: opts?.color,
      timelineBarHidden: opts?.timelineBarHidden,
      timelinePriority: opts?.timelinePriority,
      barStartTime: opts?.barStartTime,
      barEndTime: opts?.barEndTime,
      createdAt: now(), updatedAt: now(),
    }
    set(s => {
      const bs = s.boards[boardId]
      if (!bs) return s
      return {
        boards: { ...s.boards, [boardId]: { ...bs, ranges: { ...bs.ranges, [id]: range } } },
        dirty: true,
      }
    })
    return id
  },

  updateRange: (rangeId, patch) => {
    maybePushHistory()
    return set(s => {
      const boardId = findBoardForEntity(s.boards, 'ranges', rangeId)
      if (!boardId) return s
      const bs = s.boards[boardId]
      const old = bs.ranges[rangeId]
      if (!old) return s
      const updated = { ...old, ...patch, updatedAt: now() }
      return {
        boards: { ...s.boards, [boardId]: { ...bs, ranges: { ...bs.ranges, [rangeId]: updated } } },
        dirty: true,
      }
    })
  },

  deleteRange: (rangeId) => {
    maybePushHistory()
    return set(s => {
    const boardId = findBoardForEntity(s.boards, 'ranges', rangeId)
    if (!boardId) return s
    const bs = s.boards[boardId]
    const { [rangeId]: _removed, ...restRanges } = bs.ranges

    const updatedItems: Record<string, ItemEntity> = {}
    let itemsChanged = false
    for (const [id, item] of Object.entries(bs.items)) {
      if (item.rangeId === rangeId) {
        updatedItems[id] = { ...item, rangeId: undefined, updatedAt: now() }
        itemsChanged = true
      } else {
        updatedItems[id] = item
      }
    }

    return {
      boards: { ...s.boards, [boardId]: { ...bs, ranges: restRanges, items: itemsChanged ? updatedItems : bs.items } },
      dirty: true,
    }
    })
  },

  createOverlay: (boardId, type, role, x, y, width, height, opts) => {
    maybePushHistory()
    const id = generateId()
    const overlay: OverlayEntity = {
      id, boardId, type, role, x, y, width, height,
      opacity: opts?.opacity ?? 1, locked: opts?.locked ?? false,
      anchorType: opts?.anchorType || 'none',
      text: opts?.text, assetId: opts?.assetId,
      pathD: opts?.pathD,
      drawTool: opts?.drawTool,
      strokeColor: opts?.strokeColor,
      fillColor: opts?.fillColor,
      strokeWidthPx: opts?.strokeWidthPx,
      fillOpacity: opts?.fillOpacity,
      strokeOpacity: opts?.strokeOpacity,
      textBoxFontSizePx: opts?.textBoxFontSizePx,
      textBoxFontKey: opts?.textBoxFontKey,
      textBoxTextColor: opts?.textBoxTextColor,
      textBoxContentHeight: opts?.textBoxContentHeight,
      visible: opts?.visible ?? true,
      linkedItemId: opts?.linkedItemId,
      createdAt: now(), updatedAt: now(),
    }
    set(s => {
      const bs = s.boards[boardId]
      if (!bs) return s
      return {
        boards: { ...s.boards, [boardId]: { ...bs, overlays: { ...bs.overlays, [id]: overlay } } },
        dirty: true,
      }
    })
    return id
  },

  updateOverlay: (overlayId, patch) => {
    maybePushHistory()
    return set(s => {
      const boardId = findBoardForEntity(s.boards, 'overlays', overlayId)
      if (!boardId) return s
      const bs = s.boards[boardId]
      const old = bs.overlays[overlayId]
      if (!old) return s
      const updated = { ...old, ...patch, updatedAt: now() }
      return {
        boards: { ...s.boards, [boardId]: { ...bs, overlays: { ...bs.overlays, [overlayId]: updated } } },
        dirty: true,
      }
    })
  },

  deleteOverlay: (overlayId) => {
    maybePushHistory()
    return set(s => {
      const boardId = findBoardForEntity(s.boards, 'overlays', overlayId)
      if (!boardId) return s
      const bs = s.boards[boardId]
      const { [overlayId]: _removed, ...rest } = bs.overlays
      return {
        boards: { ...s.boards, [boardId]: { ...bs, overlays: rest } },
        dirty: true,
      }
    })
  },

  undo: () => {
    if (historyPast.length === 0) return
    const s = get()
    const cur: HistorySnap = {
      boards: structuredClone(s.boards),
      activeBoardId: s.activeBoardId,
      settings: structuredClone(s.settings),
    }
    const prev = historyPast.pop()!
    historyFuture.push(cur)
    historyRestoring = true
    set({
      boards: prev.boards,
      activeBoardId: prev.activeBoardId,
      ...(prev.settings !== undefined ? { settings: prev.settings } : {}),
      selection: null,
      _historyUi: {
        canUndo: historyPast.length > 0,
        canRedo: historyFuture.length > 0,
      },
    })
    historyRestoring = false
  },

  redo: () => {
    if (historyFuture.length === 0) return
    const s = get()
    const cur: HistorySnap = {
      boards: structuredClone(s.boards),
      activeBoardId: s.activeBoardId,
      settings: structuredClone(s.settings),
    }
    const next = historyFuture.pop()!
    historyPast.push(cur)
    historyRestoring = true
    set({
      boards: next.boards,
      activeBoardId: next.activeBoardId,
      ...(next.settings !== undefined ? { settings: next.settings } : {}),
      selection: null,
      _historyUi: {
        canUndo: historyPast.length > 0,
        canRedo: historyFuture.length > 0,
      },
    })
    historyRestoring = false
  },

  beginHistoryBatch: () => {
    if (historyRestoring) return
    if (historyBatchDepth === 0) {
      const s = get()
      historyPast.push(snapshotBoardsOnly(s))
      if (historyPast.length > MAX_HISTORY) historyPast.shift()
      historyFuture.length = 0
      syncHistoryUi()
    }
    historyBatchDepth++
  },

  endHistoryBatch: () => {
    historyBatchDepth = Math.max(0, historyBatchDepth - 1)
  },

  replaceBoardsState: (boards, activeBoardId) => {
    maybePushHistory()
    historyFuture.length = 0
    historyRestoring = true
    set({
      boards: structuredClone(boards),
      activeBoardId,
      selection: null,
      dirty: true,
      _historyUi: {
        canUndo: historyPast.length > 0,
        canRedo: historyFuture.length > 0,
      },
    })
    historyRestoring = false
  },

  importBoardsAndSettings: (boards, activeBoardId, settings, ui) => {
    if (historyRestoring) return
    if (historyBatchDepth === 0) {
      const s = get()
      historyPast.push(snapshotBoardsAndSettings(s))
      if (historyPast.length > MAX_HISTORY) historyPast.shift()
      historyFuture.length = 0
    }
    historyRestoring = true
    const b = structuredClone(boards)
    const aid = activeBoardId
    if (ui === undefined) {
      set({
        boards: b,
        activeBoardId: aid,
        settings,
        selection: null,
        dirty: true,
        _historyUi: {
          canUndo: historyPast.length > 0,
          canRedo: historyFuture.length > 0,
        },
      })
    } else {
      const view = normImportedView(ui.view)
      const panel = normImportedPanel(ui.panel)
      const interactionMode = normImportedInteractionMode(ui.interactionMode)
      const selRaw = parseSelectionJson(ui.selection)
      const selection = sanitizeSelectionForActiveBoard(b, aid, selRaw)
      const ltRaw = ui.lastTouchedItemId
      const lastTouchedItemId = sanitizeLastTouchedItemId(
        b,
        aid,
        ltRaw !== undefined && ltRaw !== null && typeof ltRaw === 'string' ? ltRaw : null,
      )
      const rangeEditPreview = sanitizeRangeEditPreview(
        b,
        aid,
        parseRangeEditPreviewJson(ui.rangeEditPreview),
      )
      const dirty = typeof ui.dirty === 'boolean' ? ui.dirty : true
      set({
        boards: b,
        activeBoardId: aid,
        settings,
        view,
        panel,
        interactionMode,
        selection,
        lastTouchedItemId,
        rangeEditPreview,
        dirty,
        _historyUi: {
          canUndo: historyPast.length > 0,
          canRedo: historyFuture.length > 0,
        },
      })
    }
    historyRestoring = false
  },

  resetAllData: () => {
    historyPast.length = 0
    historyFuture.length = 0
    useBoardStore.persist.clearStorage()
    historyRestoring = true
    set(getResetAppState())
    historyRestoring = false
  },
  }
  }
  ,
    {
      name: 'anniary-storage',
      version: 9,
      migrate: (persisted, _version) => {
        const p = { ...(persisted as Record<string, unknown>) }
        if (p.settings && typeof p.settings === 'object') {
          const ps = p.settings as AppSettings & { backlogShowNewlineButton?: boolean }
          const legacyNewlineBtn = ps.backlogShowNewlineButton === true
          const rawTool = ps.drawTool
          const drawTool: DrawToolKind =
            rawTool && VALID_DRAW_TOOLS.includes(rawTool) ? rawTool : 'pen'
          const paper =
            ps.placeMemoPaperColor?.startsWith('#') ? ps.placeMemoPaperColor : '#ffffff'
          const next: AppSettings = {
            ...ps,
            boardViewFilter: normalizeBoardViewFilter(ps.boardViewFilter),
            drawTool,
            placeKind: ps.placeKind ?? 'memo',
            placeStickerChar: ps.placeStickerChar?.trim() || '⭐',
            drawPenColor: ps.drawPenColor?.startsWith('#') ? ps.drawPenColor : '#2563eb',
            placeMemoWidth: Math.min(120, Math.max(12, ps.placeMemoWidth ?? 40)),
            placeMemoHeight: Math.min(80, Math.max(8, ps.placeMemoHeight ?? 16)),
            placeMemoPaperColor: paper,
            drawPenWidthWeight: normDrawWeight(ps.drawPenWidthWeight),
            drawHighlighterColor: ps.drawHighlighterColor?.startsWith('#')
              ? ps.drawHighlighterColor
              : '#facc15',
            drawHighlighterWidthWeight: normDrawWeight(ps.drawHighlighterWidthWeight),
            drawShapeStrokeColor: ps.drawShapeStrokeColor?.startsWith('#')
              ? ps.drawShapeStrokeColor
              : '#2563eb',
            drawShapeFillColor:
              ps.drawShapeFillColor === 'transparent'
              || ps.drawShapeFillColor === 'none'
              || (typeof ps.drawShapeFillColor === 'string'
                && ps.drawShapeFillColor.startsWith('#'))
                ? (ps.drawShapeFillColor as string)
                : 'transparent',
            drawShapeStrokeWeight: normDrawWeight(ps.drawShapeStrokeWeight),
            showNewlineInsertButton:
              ps.showNewlineInsertButton === true || legacyNewlineBtn,
          }
          delete (next as { backlogShowNewlineButton?: boolean }).backlogShowNewlineButton
          p.settings = next
        }

        p.view = normImportedView(p.view)
        p.panel = normImportedPanel(p.panel)
        p.interactionMode = normImportedInteractionMode(p.interactionMode)
        p.selection = parseSelectionJson(p.selection)
        p.lastTouchedItemId =
          typeof p.lastTouchedItemId === 'string' ? p.lastTouchedItemId : null
        p.rangeEditPreview = parseRangeEditPreviewJson(p.rangeEditPreview)
        if (typeof p.dirty !== 'boolean') p.dirty = false

        return p
      },
      partialize: (state) => ({
        activeBoardId: state.activeBoardId,
        boards: state.boards,
        settings: state.settings,
        view: state.view,
        panel: state.panel,
        interactionMode: state.interactionMode,
        selection: state.selection,
        lastTouchedItemId: state.lastTouchedItemId,
        rangeEditPreview: state.rangeEditPreview,
        dirty: state.dirty,
      }),
    }
  )
)

function rehydrateSanitizedUiPatch() {
  const s = useBoardStore.getState()
  return {
    selection: sanitizeSelectionForActiveBoard(s.boards, s.activeBoardId, s.selection),
    lastTouchedItemId: sanitizeLastTouchedItemId(s.boards, s.activeBoardId, s.lastTouchedItemId),
    rangeEditPreview: sanitizeRangeEditPreview(s.boards, s.activeBoardId, s.rangeEditPreview),
  }
}

useBoardStore.persist.onFinishHydration(() => {
  useBoardStore.setState({
    _hydrated: true,
    ...rehydrateSanitizedUiPatch(),
    _historyUi: {
      canUndo: historyPast.length > 0,
      canRedo: historyFuture.length > 0,
    },
  })
})
if (useBoardStore.persist.hasHydrated()) {
  useBoardStore.setState({
    _hydrated: true,
    ...rehydrateSanitizedUiPatch(),
    _historyUi: {
      canUndo: historyPast.length > 0,
      canRedo: historyFuture.length > 0,
    },
  })
}
