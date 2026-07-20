import { describe, expect, it } from 'vitest'
import type { ViewState } from '../types/state'
import { getPinchFrame, viewAfterPinch } from './pinch'

const view: ViewState = {
  scale: 1,
  translateX: 20,
  translateY: 30,
  zoomLevel: 'Z1',
}

describe('pinch geometry', () => {
  it('zooms around the two-finger center', () => {
    const previous = getPinchFrame({ x: 100, y: 100 }, { x: 200, y: 100 })
    const next = getPinchFrame({ x: 50, y: 100 }, { x: 250, y: 100 })

    expect(viewAfterPinch(view, previous, next, 0, 0)).toEqual({
      scale: 2,
      translateX: -110,
      translateY: -40,
    })
  })

  it('pans by the movement of the two-finger center even when scale is unchanged', () => {
    const previous = getPinchFrame({ x: 100, y: 100 }, { x: 200, y: 100 })
    const next = getPinchFrame({ x: 125, y: 140 }, { x: 225, y: 140 })

    expect(viewAfterPinch(view, previous, next, 0, 0)).toEqual({
      scale: 1,
      translateX: 45,
      translateY: 70,
    })
  })
})
