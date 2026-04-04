import { memo, useRef, useCallback, useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import type { OverlayEntity } from '../../types/entities'
import type { InteractionMode } from '../../types/state'
import { useBoardStore } from '../../store/board-store'
import { ANNIARY_BACKLOG_ITEM_MIME, dataTransferHasBacklogItem } from '../../constants/dnd'
import { MarkdownView } from '../common/MarkdownView'
import './BoardOverlays.css'

const EMPTY_ITEMS: Record<string, never> = {}

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

const LONG_PRESS_MS = 520
const DRAG_THRESHOLD_PX = 8

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

  const boardItemsRecord = useBoardStore(s => {
    const id = s.activeBoardId
    if (!id) return undefined
    return s.boards[id]?.items ?? EMPTY_ITEMS
  })

  const itemMenuOptions = useMemo(() => {
    if (!boardItemsRecord) return [] as { id: string; title: string }[]
    return Object.values(boardItemsRecord)
      .map(it => ({ id: it.id, title: it.title || '(no title)' }))
      .sort((a, b) => a.title.localeCompare(b.title, 'en'))
  }, [boardItemsRecord])

  const dragRef = useRef<{
    id: string
    startClientX: number
    startClientY: number
    origX: number
    origY: number
    scale: number
  } | null>(null)
  const [dragDelta, setDragDelta] = useState<{ id: string; dx: number; dy: number } | null>(null)

  const pendingMemoDragRef = useRef<{
    id: string
    startCX: number
    startCY: number
    origX: number
    origY: number
    scale: number
  } | null>(null)
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [overlayMenu, setOverlayMenu] = useState<{
    clientX: number
    clientY: number
    overlayId: string
  } | null>(null)

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

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!overlayMenu) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOverlayMenu(null)
    }
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node
      const menu = document.querySelector('.board-overlay-ctx-menu')
      if (menu && !menu.contains(t)) setOverlayMenu(null)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onPointerDown, true)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onPointerDown, true)
    }
  }, [overlayMenu])

  const openOverlayMenuAt = useCallback((clientX: number, clientY: number, overlayId: string) => {
    clearLongPressTimer()
    pendingMemoDragRef.current = null
    dragRef.current = null
    setDragDelta(null)
    setOverlayMenu({
      clientX: Math.min(clientX, window.innerWidth - 16),
      clientY: Math.min(clientY, window.innerHeight - 16),
      overlayId,
    })
  }, [clearLongPressTimer])

  const startMemoLongPress = useCallback(
    (clientX: number, clientY: number, overlayId: string) => {
      clearLongPressTimer()
      longPressTimerRef.current = setTimeout(() => {
        longPressTimerRef.current = null
        pendingMemoDragRef.current = null
        openOverlayMenuAt(clientX, clientY, overlayId)
      }, LONG_PRESS_MS)
    },
    [clearLongPressTimer, openOverlayMenuAt]
  )

  const onOverlayPointerDown = useCallback(
    (e: React.PointerEvent, o: OverlayEntity) => {
      if (interactionMode !== 'select' || o.locked) return
      e.stopPropagation()
      e.preventDefault()
      const view = useBoardStore.getState().view
      setSelection({ type: 'overlay', overlayId: o.id })
      ensureLeftPanelOpen('detail')

      const isPostit = o.type === 'text' && o.role === 'semantic'
      if (isPostit) {
        pendingMemoDragRef.current = {
          id: o.id,
          startCX: e.clientX,
          startCY: e.clientY,
          origX: o.x,
          origY: o.y,
          scale: view.scale,
        }
        startMemoLongPress(e.clientX, e.clientY, o.id)
        ;(e.target as Element).setPointerCapture?.(e.pointerId)
        return
      }

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
    [ensureLeftPanelOpen, interactionMode, setSelection, startMemoLongPress]
  )

  const onOverlayPointerMove = useCallback(
    (e: React.PointerEvent, o: OverlayEntity) => {
      const pending = pendingMemoDragRef.current
      if (pending && pending.id === o.id && interactionMode === 'select') {
        const dxPx = e.clientX - pending.startCX
        const dyPx = e.clientY - pending.startCY
        if (Math.hypot(dxPx, dyPx) > DRAG_THRESHOLD_PX) {
          clearLongPressTimer()
          dragRef.current = {
            id: pending.id,
            startClientX: pending.startCX,
            startClientY: pending.startCY,
            origX: pending.origX,
            origY: pending.origY,
            scale: pending.scale,
          }
          pendingMemoDragRef.current = null
          setDragDelta({ id: o.id, dx: dxPx / pending.scale, dy: dyPx / pending.scale })
        }
        return
      }

      const d = dragRef.current
      if (!d || d.id !== o.id) return
      const dx = (e.clientX - d.startClientX) / d.scale
      const dy = (e.clientY - d.startClientY) / d.scale
      setDragDelta({ id: o.id, dx, dy })
    },
    [clearLongPressTimer, interactionMode]
  )

  const onOverlayPointerUp = useCallback(
    (e: React.PointerEvent, o: OverlayEntity) => {
      clearLongPressTimer()
      const pending = pendingMemoDragRef.current
      if (pending && pending.id === o.id) {
        pendingMemoDragRef.current = null
      }

      const d = dragRef.current
      if (!d || d.id !== o.id) {
        try {
          ;(e.target as Element).releasePointerCapture?.(e.pointerId)
        } catch {
          /* ignore */
        }
        return
      }
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
    [clearLongPressTimer, updateOverlay]
  )

  const onMemoContextMenu = useCallback(
    (e: React.MouseEvent, o: OverlayEntity) => {
      if (interactionMode !== 'select' || o.locked) return
      e.preventDefault()
      e.stopPropagation()
      clearLongPressTimer()
      pendingMemoDragRef.current = null
      openOverlayMenuAt(e.clientX, e.clientY, o.id)
    },
    [clearLongPressTimer, interactionMode, openOverlayMenuAt]
  )

  /** dragenter + dragover 모두 preventDefault 해야 drop 이 일관되게 허용됨 */
  const onMemoDragHover = useCallback(
    (e: React.DragEvent) => {
      if (interactionMode !== 'select') return
      if (!dataTransferHasBacklogItem(e.dataTransfer)) return
      e.preventDefault()
      e.stopPropagation()
      // effectAllowed 가 copy 이면 dropEffect 도 copy 여야 함(링크는 거절될 수 있음)
      e.dataTransfer.dropEffect = 'copy'
    },
    [interactionMode]
  )

  const onMemoDrop = useCallback(
    (e: React.DragEvent, o: OverlayEntity) => {
      if (interactionMode !== 'select' || o.locked) return
      if (!dataTransferHasBacklogItem(e.dataTransfer)) return
      const raw =
        e.dataTransfer.getData(ANNIARY_BACKLOG_ITEM_MIME)
        || e.dataTransfer.getData('text/plain')
      const itemId = raw?.trim()
      if (!itemId || !boardItemsRecord || !(itemId in boardItemsRecord)) return
      e.preventDefault()
      e.stopPropagation()
      updateOverlay(o.id, { linkedItemId: itemId })
      setOverlayMenu(null)
    },
    [boardItemsRecord, interactionMode, updateOverlay]
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

  const menuOverlay = overlayMenu ? overlays[overlayMenu.overlayId] : null
  const menuLinkedId = menuOverlay?.linkedItemId

  const ctxMenu =
    overlayMenu && menuOverlay
      ? createPortal(
          <div
            className="board-overlay-ctx-menu"
            style={{
              position: 'fixed',
              left: overlayMenu.clientX,
              top: overlayMenu.clientY,
            }}
            role="menu"
          >
            <div className="board-overlay-ctx-menu-title">Memo · link item</div>
            {menuLinkedId ? (
              <button
                type="button"
                className="board-overlay-ctx-menu-item board-overlay-ctx-menu-item--danger"
                onClick={() => {
                  updateOverlay(overlayMenu.overlayId, { linkedItemId: undefined })
                  setOverlayMenu(null)
                }}
              >
                Unlink
              </button>
            ) : null}
            <div className="board-overlay-ctx-sub">Choose item</div>
            <div className="board-overlay-ctx-scroll">
              {itemMenuOptions.length === 0 ? (
                <div className="board-overlay-ctx-empty">No items on this board</div>
              ) : (
                itemMenuOptions.map(it => (
                  <button
                    key={it.id}
                    type="button"
                    className="board-overlay-ctx-menu-item"
                    onClick={() => {
                      updateOverlay(overlayMenu.overlayId, { linkedItemId: it.id })
                      setOverlayMenu(null)
                    }}
                  >
                    {it.title}
                  </button>
                ))
              )}
            </div>
          </div>,
          document.body
        )
      : null

  const list = Object.values(overlays).filter(o => o.visible !== false)
  list.sort(overlayZOrder)

  return (
    <>
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
          const linked = o.linkedItemId && boardItemsRecord ? boardItemsRecord[o.linkedItemId] : undefined
          const bodyText = (o.text ?? '').trim()
          const showPostitHtml =
            isPostitMemo && (Boolean(bodyText) || Boolean(linked))

          return (
            <g
              key={o.id}
              transform={`translate(${ox}, ${oy})`}
              onPointerDown={e => onOverlayPointerDown(e, o)}
              onPointerMove={e => onOverlayPointerMove(e, o)}
              onPointerUp={e => onOverlayPointerUp(e, o)}
              onPointerCancel={e => onOverlayPointerUp(e, o)}
              onContextMenu={isPostitMemo ? e => onMemoContextMenu(e, o) : undefined}
              style={{
                cursor: interactionMode === 'select' && !o.locked ? 'grab' : undefined,
                touchAction: isPostitMemo ? 'none' : undefined,
              }}
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
                    pointerEvents="visiblePainted"
                  />
                  <polygon
                    className="board-overlay-postit-fold"
                    points={`${rw - 2.2},0 ${rw},0 ${rw},2.2`}
                    pointerEvents="none"
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
              {showPostitHtml ? (
                <foreignObject
                  x={0}
                  y={0}
                  width={rw}
                  height={rh}
                  className="board-overlay-postit-fobject"
                  pointerEvents="none"
                >
                  {/* XHTML 루트 — SVG foreignObject 유효 마크업 */}
                  <div
                    className="board-overlay-postit-fobj-root"
                    {...{ xmlns: 'http://www.w3.org/1999/xhtml' } as { xmlns: string }}
                  >
                    {bodyText ? (
                      <MarkdownView source={o.text ?? ''} className="board-postit-md-memo" />
                    ) : null}
                    {bodyText && linked ? <div className="board-postit-linked-sep" /> : null}
                    {linked ? (
                      <div className="board-postit-linked-block">
                        {linked.title?.trim() ? (
                          <div className="board-postit-linked-title">{linked.title}</div>
                        ) : null}
                        {linked.body?.trim() ? (
                          <MarkdownView source={linked.body} className="board-postit-md-linked" />
                        ) : !linked.title?.trim() ? (
                          <div className="board-postit-linked-empty">Linked item has no title or body.</div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </foreignObject>
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
              {isPostitMemo && interactionMode === 'select' && !o.locked ? (
                <rect
                  className="board-overlay-postit-dropzone"
                  width={rw}
                  height={rh}
                  rx={0.7}
                  fill="transparent"
                  pointerEvents="all"
                  onDragEnter={onMemoDragHover}
                  onDragOver={onMemoDragHover}
                  onDrop={e => onMemoDrop(e, o)}
                />
              ) : null}
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
      {ctxMenu}
    </>
  )
})
