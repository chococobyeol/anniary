import { create } from 'zustand'
import type {
  AppState,
  BoardState,
  InteractionMode,
  LeftPanelMode,
  RightPanelMode,
  SelectionTarget,
  ViewState,
  ZoomLevel,
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
import { getZoomLevel, BASE_CELL_WIDTH } from '../utils/zoom'

type Actions = {
  // Board
  createBoard: (year: number, title?: string) => string
  setActiveBoard: (boardId: string) => void

  // View
  setView: (view: Partial<ViewState>) => void
  updateZoomLevel: () => void

  // Panel
  toggleLeftPanel: (mode?: LeftPanelMode) => void
  toggleRightPanel: (mode?: RightPanelMode) => void
  closeAllPanels: () => void

  // Interaction
  setInteractionMode: (mode: InteractionMode) => void
  setSelection: (target: SelectionTarget | null) => void

  // Item commands
  createItem: (boardId: string, kind: ItemKind, opts?: {
    title?: string; body?: string; date?: string; rangeId?: string;
    status?: ItemStatus; progress?: number; pinned?: boolean
  }) => string
  updateItem: (itemId: string, patch: Partial<ItemEntity>) => void
  deleteItem: (itemId: string) => void

  // Range commands
  createRange: (boardId: string, kind: RangeKind, startDate: string, endDate: string, opts?: {
    label?: string; body?: string; status?: RangeStatus; color?: string
  }) => string
  updateRange: (rangeId: string, patch: Partial<RangeEntity>) => void
  deleteRange: (rangeId: string) => void

  // Overlay commands
  createOverlay: (boardId: string, type: OverlayType, role: OverlayRole, x: number, y: number, w: number, h: number, opts?: {
    opacity?: number; locked?: boolean; anchorType?: OverlayAnchorType; text?: string; assetId?: string
  }) => string
  updateOverlay: (overlayId: string, patch: Partial<OverlayEntity>) => void
  deleteOverlay: (overlayId: string) => void
}

const initialState: AppState = {
  activeBoardId: null,
  boards: {},
  view: { scale: 1, translateX: 0, translateY: 0, zoomLevel: 'Z1' },
  panel: { leftOpen: false, leftMode: 'backlog', rightOpen: false, rightMode: 'settings' },
  interactionMode: 'pan',
  selection: null,
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

export const useBoardStore = create<AppState & Actions>()((set, get) => ({
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

  // Item
  createItem: (boardId, kind, opts) => {
    const id = generateId()
    const item: ItemEntity = {
      id, boardId, kind,
      title: opts?.title, body: opts?.body, date: opts?.date, rangeId: opts?.rangeId,
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
    const { [itemId]: _, ...rest } = bs.items
    return {
      boards: { ...s.boards, [boardId]: { ...bs, items: rest } },
      dirty: true,
    }
  }),

  // Range
  createRange: (boardId, kind, startDate, endDate, opts) => {
    const id = generateId()
    const range: RangeEntity = {
      id, boardId, kind, startDate, endDate,
      label: opts?.label, body: opts?.body,
      status: opts?.status || 'none', color: opts?.color,
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
    const { [rangeId]: _, ...rest } = bs.ranges
    return {
      boards: { ...s.boards, [boardId]: { ...bs, ranges: rest } },
      dirty: true,
    }
  }),

  // Overlay
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
    const { [overlayId]: _, ...rest } = bs.overlays
    return {
      boards: { ...s.boards, [boardId]: { ...bs, overlays: rest } },
      dirty: true,
    }
  }),
}))
