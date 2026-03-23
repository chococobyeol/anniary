import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  AppState,
  AppSettings,
  BoardState,
  InteractionMode,
  LeftPanelMode,
  RangeEditPreview,
  RightPanelMode,
  SelectionTarget,
  ViewState,
} from '../types/state'
import type {
  BoardEntity,
  ItemEntity,
  RangeEntity,
  OverlayEntity,
  ItemKind,
  ItemStatus,
  RangeKind,
  RangeStatus,
  OverlayType,
  OverlayRole,
  OverlayAnchorType,
} from '../types/entities'
import { generateId, now } from '../utils/id'
import { getZoomLevel, BASE_CELL_WIDTH, BASE_CELL_HEIGHT, MONTH_HEADER_WIDTH, MONTH_GAP, DAY_HEADER_HEIGHT, MAX_SCALE } from '../utils/zoom'
import { getMaxColumnsForYear } from '../utils/date'

type Actions = {
  createBoard: (year: number, title?: string) => string
  setActiveBoard: (boardId: string) => void

  setView: (view: Partial<ViewState>) => void
  updateZoomLevel: () => void
  resetView: (containerWidth: number, containerHeight: number) => void

  toggleLeftPanel: (mode?: LeftPanelMode) => void
  toggleRightPanel: (mode?: RightPanelMode) => void
  closeAllPanels: () => void

  setInteractionMode: (mode: InteractionMode) => void
  setSelection: (target: SelectionTarget | null) => void
  /** 저장 전 간트 미리보기만 (dirty 변경 없음) */
  setRangeEditPreview: (preview: RangeEditPreview | null) => void

  updateSettings: (patch: Partial<AppSettings>) => void

  createItem: (boardId: string, kind: ItemKind, opts?: {
    title?: string; body?: string; date?: string; endDate?: string; startTime?: string; endTime?: string;
    rangeId?: string; tags?: string[]; status?: ItemStatus; progress?: number; pinned?: boolean
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
  }) => string
  updateOverlay: (overlayId: string, patch: Partial<OverlayEntity>) => void
  deleteOverlay: (overlayId: string) => void
}

const initialState: AppState = {
  _hydrated: false,
  activeBoardId: null,
  boards: {},
  view: { scale: 1, translateX: 0, translateY: 0, zoomLevel: 'Z1' },
  panel: { leftOpen: false, leftMode: 'backlog', rightOpen: false, rightMode: 'settings' },
  interactionMode: 'pan',
  selection: null,
  settings: { dayLayout: 'linear', zoomInverted: false, backlogDisplayLimit: null },
  rangeEditPreview: null,
  dirty: false,
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

export const useBoardStore = create<AppState & Actions>()(
  persist(
    (set, get) => ({
  ...initialState,

  createBoard: (year, title) => {
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
  setSelection: (target) => set({ selection: target }),

  setRangeEditPreview: (preview) => set({ rangeEditPreview: preview }),

  updateSettings: (patch) => set(s => ({
    settings: { ...s.settings, ...patch },
  })),

  createItem: (boardId, kind, opts) => {
    const id = generateId()
    const item: ItemEntity = {
      id, boardId, kind,
      title: opts?.title, body: opts?.body, date: opts?.date, endDate: opts?.endDate,
      startTime: opts?.startTime, endTime: opts?.endTime, rangeId: opts?.rangeId,
      tags: opts?.tags && opts.tags.length > 0 ? opts.tags : ['General'],
      status: opts?.status || 'none', progress: opts?.progress,
      pinned: opts?.pinned || false,
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

  updateItem: (itemId, patch) => set(s => {
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
  }),

  deleteItem: (itemId) => set(s => {
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
  }),

  createRange: (boardId, kind, startDate, endDate, opts) => {
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

  updateRange: (rangeId, patch) => set(s => {
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
  }),

  deleteRange: (rangeId) => set(s => {
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
  }),

  createOverlay: (boardId, type, role, x, y, width, height, opts) => {
    const id = generateId()
    const overlay: OverlayEntity = {
      id, boardId, type, role, x, y, width, height,
      opacity: opts?.opacity ?? 1, locked: opts?.locked ?? false,
      anchorType: opts?.anchorType || 'none',
      text: opts?.text, assetId: opts?.assetId,
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

  updateOverlay: (overlayId, patch) => set(s => {
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
  }),

  deleteOverlay: (overlayId) => set(s => {
    const boardId = findBoardForEntity(s.boards, 'overlays', overlayId)
    if (!boardId) return s
    const bs = s.boards[boardId]
    const { [overlayId]: _removed, ...rest } = bs.overlays
    return {
      boards: { ...s.boards, [boardId]: { ...bs, overlays: rest } },
      dirty: true,
    }
  }),
    }),
    {
      name: 'anniary-storage',
      version: 1,
      partialize: (state) => ({
        activeBoardId: state.activeBoardId,
        boards: state.boards,
        settings: state.settings,
      }),
    }
  )
)

useBoardStore.persist.onFinishHydration(() => {
  useBoardStore.setState({ _hydrated: true })
})
if (useBoardStore.persist.hasHydrated()) {
  useBoardStore.setState({ _hydrated: true })
}
