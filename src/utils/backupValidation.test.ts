import { describe, expect, it } from 'vitest'
import { validateBackupPayload } from './backupValidation'

function validBackup() {
  return {
    anniaryExportVersion: 2,
    activeBoardId: 'board-1',
    boards: {
      'board-1': {
        board: {
          id: 'board-1',
          year: 2026,
          title: '2026',
          weekStart: 'monday',
          version: 1,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        items: {},
        ranges: {},
        overlays: {},
      },
    },
  }
}

describe('backup validation', () => {
  it('accepts a legacy board without assets and normalizes the collection', () => {
    const parsed = validateBackupPayload(validBackup())
    expect(parsed.boards['board-1'].assets).toEqual({})
    expect(parsed.boards['board-1'].tagCatalog).toEqual([])
  })

  it('converts old empty tag-holder items into catalog entries', () => {
    const backup = validBackup()
    Object.assign(backup.boards['board-1'].items, {
      placeholder: {
        id: 'placeholder',
        boardId: 'board-1',
        kind: 'task',
        title: '',
        tags: ['Work'],
        status: 'none',
        pinned: false,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    })
    const parsed = validateBackupPayload(backup)
    expect(parsed.boards['board-1'].tagCatalog).toEqual(['Work'])
    expect(parsed.boards['board-1'].items).toEqual({})
  })

  it('rejects an active board that is not in the backup', () => {
    const backup = validBackup()
    backup.activeBoardId = 'missing-board'
    expect(() => validateBackupPayload(backup)).toThrow(/activeBoardId/)
  })

  it('rejects board years that cannot be represented as four-digit date keys', () => {
    const backup = validBackup()
    backup.boards['board-1'].board.year = 999
    expect(() => validateBackupPayload(backup)).toThrow(/1000 to 9999/)
  })

  it('rejects malformed overlay dimensions before they enter app state', () => {
    const backup = validBackup()
    Object.assign(backup.boards['board-1'].overlays, {
      bad: {
        id: 'bad',
        boardId: 'board-1',
        type: 'sticker',
        role: 'decorative',
        anchorType: 'none',
        x: 0,
        y: 0,
        width: -10,
        height: 10,
        opacity: 1,
        locked: false,
      },
    })
    expect(() => validateBackupPayload(backup)).toThrow(/width and height/)
  })
})
