import { useCallback, useRef, useEffect, type RefObject } from 'react'
import { useBoardStore } from '../store/board-store'
import { MIN_SCALE, MAX_SCALE } from '../utils/zoom'
import { getPinchFrame, viewAfterPinch, type ClientPoint, type PinchFrame } from '../utils/pinch'

/** deltaMode별로 픽셀에 가깝게 환산 — 무한 휠 등에서 이벤트당 고정 8% 곱셈 시 MIN/MAX까지 순식간에 도달하는 문제 완화 */
function wheelDeltaYPixels(e: WheelEvent): number {
  let d = e.deltaY
  switch (e.deltaMode) {
    case WheelEvent.DOM_DELTA_LINE:
      d *= 32
      break
    case WheelEvent.DOM_DELTA_PAGE:
      d *= 480
      break
    default:
      break
  }
  return d
}

type UseZoomPanOptions = {
  onTouchSequenceStart?: () => void
  onPinchStart?: () => void
  onTouchSequenceEnd?: (hadPinch: boolean) => void
}

export function useZoomPan(
  containerRef: RefObject<HTMLDivElement | null>,
  options: UseZoomPanOptions = {},
) {
  const setView = useBoardStore(s => s.setView)
  const updateZoomLevel = useBoardStore(s => s.updateZoomLevel)

  const panningRef = useRef<{ pointerId: number; last: ClientPoint } | null>(null)
  const touchPointersRef = useRef(new Map<number, ClientPoint>())
  const suppressedPointerIdsRef = useRef(new Set<number>())
  const pinchRef = useRef<PinchFrame | null>(null)
  const onTouchSequenceStartRef = useRef(options.onTouchSequenceStart)
  const onPinchStartRef = useRef(options.onPinchStart)
  const onTouchSequenceEndRef = useRef(options.onTouchSequenceEnd)
  const touchSequenceHadPinchRef = useRef(false)

  useEffect(() => {
    onTouchSequenceStartRef.current = options.onTouchSequenceStart
    onPinchStartRef.current = options.onPinchStart
    onTouchSequenceEndRef.current = options.onTouchSequenceEnd
  }, [options.onPinchStart, options.onTouchSequenceEnd, options.onTouchSequenceStart])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const { view, settings } = useBoardStore.getState()
      const rect = el.getBoundingClientRect()

      if (e.ctrlKey || e.metaKey) {
        const dy = wheelDeltaYPixels(e)
        if (dy === 0) return
        const zoomIn = settings.zoomInverted ? dy > 0 : dy < 0
        const magnitude = Math.min(Math.abs(dy) * 0.00600, 0.60)
        const mult = zoomIn ? 1 + magnitude : 1 / (1 + magnitude)
        const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, view.scale * mult))
        const cursorX = e.clientX - rect.left
        const cursorY = e.clientY - rect.top
        const ratio = newScale / view.scale
        setView({
          scale: newScale,
          translateX: cursorX - (cursorX - view.translateX) * ratio,
          translateY: cursorY - (cursorY - view.translateY) * ratio,
        })
        updateZoomLevel()
      } else {
        setView({
          translateX: view.translateX - e.deltaX,
          translateY: view.translateY - e.deltaY,
        })
      }
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [containerRef, setView, updateZoomLevel])

  const isPointerSuppressed = useCallback((pointerId: number) => {
    return suppressedPointerIdsRef.current.has(pointerId)
  }, [])

  const handlePointerDownCapture = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'touch') return
    const touches = touchPointersRef.current
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (touches.size === 1) {
      touchSequenceHadPinchRef.current = false
      onTouchSequenceStartRef.current?.()
    }
    if (touches.size < 2) return

    for (const pointerId of touches.keys()) {
      suppressedPointerIdsRef.current.add(pointerId)
    }
    touchSequenceHadPinchRef.current = true
    panningRef.current = null
    const [a, b] = [...touches.values()]
    const startingPinch = pinchRef.current == null
    pinchRef.current = getPinchFrame(a, b)
    if (startingPinch) onPinchStartRef.current?.()
  }, [])

  const handlePointerMoveCapture = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'touch') return
    const touches = touchPointersRef.current
    if (!touches.has(e.pointerId)) return
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (!pinchRef.current || touches.size < 2) return

    const [a, b] = [...touches.values()]
    const nextFrame = getPinchFrame(a, b)
    const { view } = useBoardStore.getState()
    const rect = e.currentTarget.getBoundingClientRect()
    setView(viewAfterPinch(view, pinchRef.current, nextFrame, rect.left, rect.top))
    pinchRef.current = nextFrame
    updateZoomLevel()
  }, [setView, updateZoomLevel])

  const endTouchPointer = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'touch') return
    const touches = touchPointersRef.current
    touches.delete(e.pointerId)
    if (touches.size < 2) pinchRef.current = null
    if (touches.size === 0) {
      onTouchSequenceEndRef.current?.(touchSequenceHadPinchRef.current)
      touchSequenceHadPinchRef.current = false
    }
    queueMicrotask(() => suppressedPointerIdsRef.current.delete(e.pointerId))
  }, [])

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const mode = useBoardStore.getState().interactionMode
    const canPan = e.button === 1 || (mode === 'pan' && e.button === 0)
    if (!canPan || isPointerSuppressed(e.pointerId) || pinchRef.current) return
    panningRef.current = {
      pointerId: e.pointerId,
      last: { x: e.clientX, y: e.clientY },
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [isPointerSuppressed])

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const pan = panningRef.current
    if (!pan || pan.pointerId !== e.pointerId || isPointerSuppressed(e.pointerId) || pinchRef.current) return
    const dx = e.clientX - pan.last.x
    const dy = e.clientY - pan.last.y
    pan.last = { x: e.clientX, y: e.clientY }
    const { view } = useBoardStore.getState()
    setView({
      translateX: view.translateX + dx,
      translateY: view.translateY + dy,
    })
  }, [isPointerSuppressed, setView])

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (panningRef.current?.pointerId === e.pointerId) panningRef.current = null
  }, [])

  return {
    handlePointerDownCapture,
    handlePointerMoveCapture,
    handlePointerUpCapture: endTouchPointer,
    handlePointerCancelCapture: endTouchPointer,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    isPointerSuppressed,
  }
}
