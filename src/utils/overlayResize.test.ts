import { describe, expect, it } from 'vitest'
import { proportionalResizeDelta } from './overlayResize'

describe('proportionalResizeDelta', () => {
  it('grows both dimensions when a sticker handle moves horizontally', () => {
    expect(proportionalResizeDelta(10, 10, 10, 1, 6, 6)).toEqual({ dw: 10, dh: 10 })
  })

  it('keeps the aspect ratio while clamping to the minimum size', () => {
    expect(proportionalResizeDelta(20, 10, -18, -9, 4, 4)).toEqual({ dw: -12, dh: -6 })
  })
})
