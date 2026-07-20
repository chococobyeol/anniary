import { describe, expect, it } from 'vitest'
import type { ItemEntity } from '../types/entities'
import {
  countItemsPerTag,
  isLegacyTagPlaceholder,
  remapTagFilter,
  sortedTagRows,
} from './tagManagement'

function placeholder(): ItemEntity {
  return {
    id: 'legacy-tag-work',
    boardId: 'board-1',
    kind: 'task',
    title: '',
    tags: ['Work'],
    status: 'none',
    pinned: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

describe('tag catalog', () => {
  it('keeps an empty custom tag without counting a fake backlog item', () => {
    const legacy = placeholder()
    expect(isLegacyTagPlaceholder(legacy)).toBe(true)
    const rows = sortedTagRows(countItemsPerTag({ [legacy.id]: legacy }), ['Work'])
    expect(rows).toEqual([
      { tag: 'General', count: 0 },
      { tag: 'Work', count: 0 },
    ])
  })

  it('keeps an active tag filter valid across rename and removal', () => {
    expect(remapTagFilter(['Work'], 'Work', 'Office')).toEqual(['Office'])
    expect(remapTagFilter(['Work', 'Personal'], 'Work')).toEqual(['Personal'])
  })
})
