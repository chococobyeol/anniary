import { memo, useRef, useCallback, useState } from 'react'
import type { OverlayEntity } from '../../types/entities'
import type { InteractionMode } from '../../types/state'
import { useBoardStore } from '../../store/board-store'
import './BoardOverlays.css'

type Props = {
  overlays: Record<string, OverlayEntity>
  interactionMode: InteractionMode
  selectedOverlayId: string | null
}

function overlayZOrder(a: OverlayEntity, b: OverlayEntity): number {
  return a.createdAt.localeCompare(b.createdAt)
}

function minOverlaySize(o: OverlayEntity): { minW: number; minH: number } {
  if (o.type === 'sticker') return { minW: 6, minH: 6 }
  if (o.type === 'text' && o.role === 'semantic') return { minW: 12, minH: 8 }
  return { minW: 0.45, minH: 0.45 }
}

export const BoardOverlays = memo(function BoardOverlays({
  overlays,
  interactionMode,
  selectedOverlayId,
}: Props) {
  const updateOverlay = useBoardStore(s => s.updateOverlay)
  const setSelection = useBoardStore(s => s.setSelection)
  const ensureLeftPanelOpen = useBoardStore(s => s.ensureLeftPanelOpen)
  const beginHistoryBatch = useBoardStore(s => s.beginHistoryBatch)
  const endHistoryBatch = useBoardStore(s => s.endHistoryBatch)
  const boardItems = useBoardStore(s =>
    s.activeBoardId ? s.boards[s.activeBoardId]?.items ?? {} : {}
  )

  const dragRef = useRef<{
    id: string
    startClientX: number
    startClientY: number
    origX: number
    origY: number
    scale: number
  } | null>(null)
  const [dragDelta, setDragDelta] = useState<{ id: string; dx: number; dy: number } | null>(null)

  const resizeRef = useRef<{
    id: string
    origW: number
    origH: number
    startCX: number
    startCY: number
    scale: number
    type: OverlayEntity['type']
    role: OverlayEntity['role']
  } | null>(null)
  const [resizeDelta, setResizeDelta] = useState<{ id: string; dw: number; dh: number } | null>(null)

  const onOverlayPointerDown = useCallback(
    (e: React.PointerEvent, o: OverlayEntity) => {
      if (interactionMode !== 'select' || o.locked) return
      e.stopPropagation()
      e.preventDefault()
      const view = useBoardStore.getState().view
      setSelection({ type: 'overlay', overlayId: o.id })
      ensureLeftPanelOpen('detail')
      dragRef.current = {
        id: o.id,
        startClientX: e.clientX,
        startClientY: e.clientY,
        origX: o.x,
        origY: o.y,
        scale: view.scale,
      }
      setDragDelta({ id: o.id, dx: 0, dy: 0 })
      ;(e.target as Element).setPointerCapture?.(e.pointerId)
    },
    [ensureLeftPanelOpen, interactionMode, setSelection]
  )

  const onOverlayPointerMove = useCallback((e: React.PointerEvent, o: OverlayEntity) => {
    const d = dragRef.current
    if (!d || d.id !== o.id) return
    const dx = (e.clientX - d.startClientX) / d.scale
    const dy = (e.clientY - d.startClientY) / d.scale
    setDragDelta({ id: o.id, dx, dy })
  }, [])

  const onOverlayPointerUp = useCallback(
    (e: React.PointerEvent, o: OverlayEntity) => {
      const d = dragRef.current
      if (!d || d.id !== o.id) return
      dragRef.current = null
      const dx = (e.clientX - d.startClientX) / d.scale
      const dy = (e.clientY - d.startClientY) / d.scale
      setDragDelta(null)
      if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
        updateOverlay(o.id, { x: d.origX + dx, y: d.origY + dy })
      }
      try {
        ;(e.target as Element).releasePointerCapture?.(e.pointerId)
      } catch {
        /* ignore */
      }
    },
    [updateOverlay]
  )

  const onResizePointerDown = useCallback(
    (e: React.PointerEvent, o: OverlayEntity) => {
      if (interactionMode !== 'select' || o.locked) return
      e.stopPropagation()
      e.preventDefault()
      const view = useBoardStore.getState().view
      setSelection({ type: 'overlay', overlayId: o.id })
      ensureLeftPanelOpen('detail')
      beginHistoryBatch()
      resizeRef.current = {
        id: o.id,
        origW: o.width,
        origH: o.height,
        startCX: e.clientX,
        startCY: e.clientY,
        scale: view.scale,
        type: o.type,
        role: o.role,
      }
      setResizeDelta({ id: o.id, dw: 0, dh: 0 })
      const el = e.currentTarget
      el.setPointerCapture(e.pointerId)

      const onMove = (ev: PointerEvent) => {
        const r = resizeRef.current
        if (!r || r.id !== o.id) return
        const dw = (ev.clientX - r.startCX) / r.scale
        const dh = (ev.clientY - r.startCY) / r.scale
        setResizeDelta({ id: o.id, dw, dh })
      }

      const onUp = (ev: PointerEvent) => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        window.removeEventListener('pointercancel', onUp)
        const r = resizeRef.current
        resizeRef.current = null
        setResizeDelta(null)
        if (r) {
          const dw = (ev.clientX - r.startCX) / r.scale
          const dh = (ev.clientY - r.startCY) / r.scale
          const ghost = { type: r.type, role: r.role } as OverlayEntity
          const { minW, minH } = minOverlaySize(ghost)
          const nw = Math.max(minW, r.origW + dw)
          const nh = Math.max(minH, r.origH + dh)
          updateOverlay(r.id, { width: nw, height: nh })
        }
        endHistoryBatch()
        try {
          el.releasePointerCapture(ev.pointerId)
        } catch {
          /* ignore */
        }
      }

      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
      window.addEventListener('pointercancel', onUp)
    },
    [beginHistoryBatch, endHistoryBatch, ensureLeftPanelOpen, interactionMode, setSelection, updateOverlay]
  )

  const list = Object.values(overlays).filter(o => o.visible !== false)
  list.sort(overlayZOrder)

  return (
    <g className="board-overlays" style={{ pointerEvents: interactionMode === 'select' ? 'auto' : 'none' }}>
      {list.map(o => {
        const isSel = o.id === selectedOverlayId
        const dd = dragDelta?.id === o.id ? dragDelta : null
        const rd = resizeDelta?.id === o.id ? resizeDelta : null
        const ox = o.x + (dd?.dx ?? 0)
        const oy = o.y + (dd?.dy ?? 0)
        const rw = o.width + (rd?.dw ?? 0)
        const rh = o.height + (rd?.dh ?? 0)
        const sw = o.strokeWidthPx ?? 0.8
        const stroke = o.strokeColor || 'var(--status-in-progress)'
        const fill = o.fillColor || 'none'

        const isPostitMemo = o.type === 'text' && o.role === 'semantic'
        const linked = o.linkedItemId ? boardItems[o.linkedItemId] : undefined
        const linkRaw = linked ? (linked.title || '(제목 없음)') : ''
        const linkLabel = linked
          ? `→ ${linkRaw.length > 26 ? `${linkRaw.slice(0, 26)}…` : linkRaw}`
          : ''
        const bodyText = (o.text ?? '').trim()

        return (
          <g
            key={o.id}
            transform={`translate(${ox}, ${oy})`}
            onPointerDown={e => onOverlayPointerDown(e, o)}
            onPointerMove={e => onOverlayPointerMove(e, o)}
            onPointerUp={e => onOverlayPointerUp(e, o)}
            onPointerCancel={e => onOverlayPointerUp(e, o)}
            style={{ cursor: interactionMode === 'select' && !o.locked ? 'grab' : undefined }}
          >
            {isPostitMemo ? (
              <>
                <rect
                  className="board-overlay-postit-bg"
                  width={rw}
                  height={rh}
                  rx={0.7}
                  fill={o.fillColor || '#ffffff'}
                  stroke={o.strokeColor || 'rgba(0, 0, 0, 0.1)'}
                />
                <polygon
                  className="board-overlay-postit-fold"
                  points={`${rw - 2.2},0 ${rw},0 ${rw},2.2`}
                />
              </>
            ) : (
              <rect width={rw} height={rh} fill="transparent" />
            )}
            {o.pathD ? (
              <path
                d={o.pathD}
                fill="none"
                stroke={stroke}
                strokeWidth={sw}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}
            {o.type === 'shape' && o.drawTool === 'rect' && !o.pathD ? (
              <rect
                width={rw}
                height={rh}
                rx={0.5}
                fill={fill}
                stroke={stroke}
                strokeWidth={sw}
              />
            ) : null}
            {o.type === 'shape' && o.drawTool === 'ellipse' && !o.pathD ? (
              <ellipse
                cx={rw / 2}
                cy={rh / 2}
                rx={Math.max(rw / 2 - sw / 2, 0.2)}
                ry={Math.max(rh / 2 - sw / 2, 0.2)}
                fill={fill}
                stroke={stroke}
                strokeWidth={sw}
              />
            ) : null}
            {o.type === 'text' && o.role === 'semantic' && bodyText ? (
              <>
                <text x={1.6} y={3.4} className="board-overlay-postit-text">
                  {bodyText.slice(0, 200)}
                </text>
                {linkLabel ? (
                  <text
                    x={1.6}
                    y={Math.max(5, Math.min(rh - 1.2, rh * 0.72))}
                    className="board-overlay-postit-link"
                  >
                    {linkLabel}
                  </text>
                ) : null}
              </>
            ) : null}
            {o.type === 'text' && o.role === 'semantic' && !bodyText && linkLabel ? (
              <text x={1.6} y={Math.min(rh * 0.45, 6)} className="board-overlay-postit-link">
                {linkLabel}
              </text>
            ) : null}
            {o.type === 'text' && o.role !== 'semantic' && (
              <text
                x={2}
                y={Math.min(rh * 0.55, 8)}
                fontSize={3.2}
                fill="var(--text-primary)"
                style={{ userSelect: 'none' }}
              >
                {o.text || 'Note'}
              </text>
            )}
            {o.type === 'sticker' && (
              <text
                x={rw / 2}
                y={rh / 2}
                textAnchor="middle"
                dominantBaseline="central"
                className="board-overlay-sticker-emoji"
              >
                {o.text?.trim() || '⭐'}
              </text>
            )}
            {isSel && interactionMode === 'select' ? (
              <>
                <rect
                  width={rw}
                  height={rh}
                  fill="none"
                  stroke="var(--border-selected)"
                  strokeWidth={0.35}
                  strokeDasharray="1 1"
                  pointerEvents="none"
                />
                {!o.locked && (
                  <rect
                    className="board-overlay-resize-handle"
                    x={rw - 2.8}
                    y={rh - 2.8}
                    width={4.2}
                    height={4.2}
                    rx={0.4}
                    onPointerDown={e => onResizePointerDown(e, o)}
                  />
                )}
              </>
            ) : null}
          </g>
        )
      })}
    </g>
  )
})
