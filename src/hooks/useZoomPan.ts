import { useCallback, useRef } from 'react'
import { useBoardStore } from '../store/board-store'
import { MIN_SCALE, MAX_SCALE } from '../utils/zoom'

export function useZoomPan() {
  const setView = useBoardStore(s => s.setView)
  const updateZoomLevel = useBoardStore(s => s.updateZoomLevel)
  const interactionMode = useBoardStore(s => s.interactionMode)

  const panningRef = useRef(false)
  const lastPosRef = useRef({ x: 0, y: 0 })
  const pinchRef = useRef<{ dist: number; scale: number } | null>(null)

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault()
    const { view } = useBoardStore.getState()
    const rect = e.currentTarget.getBoundingClientRect()

    if (e.ctrlKey || e.metaKey) {
      const zoomFactor = e.deltaY > 0 ? 0.92 : 1.08
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, view.scale * zoomFactor))

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
  }, [setView, updateZoomLevel])

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (interactionMode !== 'pan' && e.button !== 1) return
    panningRef.current = true
    lastPosRef.current = { x: e.clientX, y: e.clientY }
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [interactionMode])

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
    handleWheel,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  }
}
