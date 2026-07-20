import { beforeEach, describe, expect, it, vi } from 'vitest'

function memoryStorage(): Storage {
  const values = new Map<string, string>()
  return {
    get length() {
      return values.size
    },
    clear: () => values.clear(),
    getItem: key => values.get(key) ?? null,
    key: index => [...values.keys()][index] ?? null,
    removeItem: key => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  }
}

const localStorage = memoryStorage()
let narrowViewport = false
vi.stubGlobal('localStorage', localStorage)
vi.stubGlobal('window', {
  localStorage,
  matchMedia: (media: string) => ({
    matches: narrowViewport,
    media,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => true,
  }),
})

const { useBoardStore } = await import('./board-store')

describe('setBoardYear', () => {
  beforeEach(() => {
    narrowViewport = false
    useBoardStore.getState().resetAllData()
  })

  it('changes only the visible board year and keeps dated content on its original date', () => {
    const boardId = useBoardStore.getState().createBoard(2026)
    const itemId = useBoardStore.getState().createItem(boardId, 'task', {
      title: 'Original date',
      date: '2026-04-12',
    })
    useBoardStore.getState().setSelection({ type: 'item', itemId })

    useBoardStore.getState().setBoardYear(2027)

    const changed = useBoardStore.getState()
    expect(changed.boards[boardId].board.year).toBe(2027)
    expect(changed.boards[boardId].board.title).toBe('2027')
    expect(changed.boards[boardId].items[itemId].date).toBe('2026-04-12')
    expect(changed.selection).toBeNull()

    changed.undo()
    expect(useBoardStore.getState().boards[boardId].board.year).toBe(2026)
    expect(useBoardStore.getState().boards[boardId].items[itemId].date).toBe('2026-04-12')
  })

  it('preserves a custom board title and ignores invalid years', () => {
    const boardId = useBoardStore.getState().createBoard(2026, 'Work')
    useBoardStore.getState().setBoardYear(2040)
    useBoardStore.getState().setBoardYear(999)
    useBoardStore.getState().setBoardYear(10000)

    const board = useBoardStore.getState().boards[boardId].board
    expect(board.year).toBe(2040)
    expect(board.title).toBe('Work')
  })
})

describe('compact side-panel coordination', () => {
  beforeEach(() => {
    narrowViewport = true
    useBoardStore.getState().resetAllData()
  })

  it('keeps only one side panel open and clears panels for board-first tools', () => {
    useBoardStore.getState().toggleLeftPanel('backlog')
    expect(useBoardStore.getState().panel).toMatchObject({ leftOpen: true, rightOpen: false })

    useBoardStore.getState().toggleRightPanel('settings')
    expect(useBoardStore.getState().panel).toMatchObject({ leftOpen: false, rightOpen: true })

    useBoardStore.getState().ensureLeftPanelOpen('detail')
    expect(useBoardStore.getState().panel).toMatchObject({ leftOpen: true, rightOpen: false })

    useBoardStore.getState().setInteractionMode('place')
    expect(useBoardStore.getState().panel).toMatchObject({ leftOpen: false, rightOpen: false })
  })
})

describe('board tag catalog', () => {
  beforeEach(() => {
    narrowViewport = false
    useBoardStore.getState().resetAllData()
  })

  it('keeps a custom tag after its last item is deleted', () => {
    const boardId = useBoardStore.getState().createBoard(2026)
    const itemId = useBoardStore.getState().createItem(boardId, 'task', {
      title: 'Tagged item',
      tags: ['Work'],
    })
    expect(useBoardStore.getState().boards[boardId].tagCatalog).toEqual(['Work'])

    useBoardStore.getState().deleteItem(itemId)
    expect(useBoardStore.getState().boards[boardId].tagCatalog).toEqual(['Work'])
  })
})
