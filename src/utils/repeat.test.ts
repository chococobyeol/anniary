import { describe, expect, it } from 'vitest'
import type { ItemEntity } from '../types/entities'
import { itemOccursOnDate } from './repeat'

function item(date: string, repeat?: ItemEntity['repeat']): ItemEntity {
  return {
    id: 'item-1',
    boardId: 'board-1',
    kind: 'task',
    title: 'Example',
    date,
    endDate: date,
    status: 'none',
    pinned: false,
    repeat,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

describe('itemOccursOnDate', () => {
  it('still finds an item from another year after the visible board year changes', () => {
    expect(itemOccursOnDate(item('2026-03-10'), '2026-03-10', 2027)).toBe(true)
  })

  it('evaluates yearly repeats in the requested year, not only the visible board year', () => {
    expect(itemOccursOnDate(item('2026-03-10', { kind: 'yearly' }), '2028-03-10', 2027)).toBe(true)
  })
})
