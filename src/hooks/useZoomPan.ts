import { useCallback, useRef, useEffect, type RefObject } from 'react'
import { useBoardStore } from '../store/board-store'
import { MIN_SCALE, MAX_SCALE } from '../utils/zoom'

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

export function useZoomPan(containerRef: RefObject<HTMLDivElement | null>) {
  const setView = useBoardStore(s => s.setView)
  const updateZoomLevel = useBoardStore(s => s.updateZoomLevel)

  const panningRef = useRef(false)
  const lastPosRef = useRef({ x: 0, y: 0 })
  const pinchRef = useRef<{ dist: number; scale: number } | null>(null)

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
        const magnitude = Math.min(Math.abs(dy) * 0.00250, 0.22)
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

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const mode = useBoardStore.getState().interactionMode
    if (mode !== 'pan' && e.button !== 1) return
    panningRef.current = true
    lastPosRef.current = { x: e.clientX, y: e.clientY }
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!panningRef.current) return
    const dx = e.clientX - lastPosRef.current.x
    const dy = e.clientY - lastPosRef.current.y
    lastPosRef.current = { x: e.clientX, y: e.clientY }
    const { view } = useBoardStore.getState()
    setView({
      translateX: view.translateX + dx,
      translateY: view.translateY + dy,
    })
  }, [setView])

  const handlePointerUp = useCallback(() => {
    panningRef.current = false
  }, [])

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.sqrt(dx * dx + dy * dy)
      pinchRef.current = { dist, scale: useBoardStore.getState().view.scale }
    }
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && pinchRef.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.sqrt(dx * dx + dy * dy)
      const ratio = dist / pinchRef.current.dist
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, pinchRef.current.scale * ratio))
      const { view } = useBoardStore.getState()
      const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2
      const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2
      const rect = e.currentTarget.getBoundingClientRect()
      const px = cx - rect.left
      const py = cy - rect.top
      const r = newScale / view.scale
      setView({
        scale: newScale,
        translateX: px - (px - view.translateX) * r,
        translateY: py - (py - view.translateY) * r,
      })
      updateZoomLevel()
    }
  }, [setView, updateZoomLevel])

  const handleTouchEnd = useCallback(() => {
    pinchRef.current = null
  }, [])

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  }
}
