import { describe, expect, it } from 'vitest'
import { DEFAULT_BOARD_VIEW_FILTER } from '../types/state'
import { normalizeBoardViewFilter } from './boardViewFilter'

describe('normalizeBoardViewFilter', () => {
  it('drops malformed imported values instead of leaking them into UI state', () => {
    const malformed = {
      includeTags: ['work', 42, null],
      hideDoneItems: 'yes',
      showTimelineBarsMultiDay: 1,
      showTimelineBarsSingleDay: false,
      showTimelineBarsTimeOfDay: 'no',
    }

    expect(normalizeBoardViewFilter(malformed as never)).toEqual({
      ...DEFAULT_BOARD_VIEW_FILTER,
      includeTags: ['work'],
      showTimelineBarsSingleDay: false,
    })
  })
})
