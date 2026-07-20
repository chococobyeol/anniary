import { useEffect, useMemo, useRef, useCallback, useState } from 'react'
import { MonthRow } from './MonthRow'
import { WeekdayHeader } from './WeekdayHeader'
import { ExpandedCell } from './ExpandedCell'
import { BoardOverlays } from './BoardOverlays'
import { useBoardStore } from '../../store/board-store'
import { useZoomPan } from '../../hooks/useZoomPan'
import { BASE_CELL_WIDTH, BASE_CELL_HEIGHT, MONTH_HEADER_WIDTH, MONTH_GAP, DAY_HEADER_HEIGHT } from '../../utils/zoom'
import { getMaxColumnsForYear, parseDateKey, getFirstDayOfWeek, getDateKeysBetween } from '../../utils/date'
import { getDateKeyFromPoint, toggleDateKeyInSelection } from '../../utils/dateSelection'
import { buildItemDateIndex } from '../../utils/indexing'
import { filterItemsByBoardView, normalizeBoardViewFilter } from '../../utils/boardViewFilter'
import { fitToScreenRef } from '../../utils/fitToScreen'
import { clientToBoardPoint, pointsBBox, pointsToPathD } from '../../utils/boardCoords'
import { highlighterStroke, penStroke, shapeStrokeFill } from '../../utils/overlayDraw'
import { topOverlayIdAt } from '../../utils/overlayHit'
import type { PanelState, SelectionTarget } from '../../types/state'
import './YearBoard.css'

type DrawSession =
  | { kind: 'stroke'; pointerId: number; points: [number, number][]; tool: 'pen' | 'highlighter' }
  | { kind: 'shape'; pointerId: number; start: [number, number]; tool: 'rect' | 'ellipse' | 'textbox' }

export function YearBoard() {
  const activeBoardId = useBoardStore(s => s.activeBoardId)
  const boardState = useBoardStore(s => activeBoardId ? s.boards[activeBoardId] : null)
  const view = useBoardStore(s => s.view)
  const selection = useBoardStore(s => s.selection)
  const setSelection = useBoardStore(s => s.setSelection)
  const ensureLeftPanelOpen = useBoardStore(s => s.ensureLeftPanelOpen)
  const toggleLeftPanel = useBoardStore(s => s.toggleLeftPanel)
  const interactionMode = useBoardStore(s => s.interactionMode)
  const resetView = useBoardStore(s => s.resetView)
  const dayLayout = useBoardStore(s => s.settings.dayLayout)
  const boardViewFilterRaw = useBoardStore(s => s.settings.boardViewFilter)
  const boardViewFilter = useMemo(
    () => normalizeBoardViewFilter(boardViewFilterRaw),
    [boardViewFilterRaw]
  )
  const rangeEditPreview = useBoardStore(s => s.rangeEditPreview)
  const settingsDrawTool = useBoardStore(s => s.settings.drawTool)
  const drawUi = useBoardStore(s => s.settings)

  const containerRef = useRef<HTMLDivElement>(null)
  const didInitRef = useRef(false)
  const [expandedDateKey, setExpandedDateKey] = useState<string | null>(null)
  const [dragPreviewKeys, setDragPreviewKeys] = useState<string[] | null>(null)
  const dragSessionRef = useRef<{
    pointerId: number
    anchorKey: string
    currentKey: string
    startX: number
    startY: number
  } | null>(null)
  const selectWindowCleanupRef = useRef<(() => void) | null>(null)
  const drawWindowCleanupRef = useRef<(() => void) | null>(null)
  const touchUiSnapshotRef = useRef<{
    selection: SelectionTarget | null
    panel: PanelState
  } | null>(null)
  const drawSessionRef = useRef<DrawSession | null>(null)
  const latestPreviewShapeRef = useRef<{
    x: number
    y: number
    w: number
    h: number
    tool: 'rect' | 'ellipse' | 'textbox'
  } | null>(null)
  const [previewPoints, setPreviewPoints] = useState<[number, number][] | null>(null)
  const [previewStrokeTool, setPreviewStrokeTool] = useState<'pen' | 'highlighter' | null>(null)
  const [previewShape, setPreviewShape] = useState<{
    x: number
    y: number
    w: number
    h: number
    tool: 'rect' | 'ellipse' | 'textbox'
  } | null>(null)
  const suppressBoardClicksUntilRef = useRef(0)
  const [interactionCancelToken, setInteractionCancelToken] = useState(0)

  const handleTouchSequenceStart = useCallback(() => {
    const state = useBoardStore.getState()
    touchUiSnapshotRef.current = {
      selection: state.selection,
      panel: { ...state.panel },
    }
  }, [])

  const handlePinchStart = useCallback(() => {
    selectWindowCleanupRef.current?.()
    selectWindowCleanupRef.current = null
    drawWindowCleanupRef.current?.()
    drawWindowCleanupRef.current = null
    dragSessionRef.current = null
    drawSessionRef.current = null
    latestPreviewShapeRef.current = null
    setDragPreviewKeys(null)
    setPreviewPoints(null)
    setPreviewStrokeTool(null)
    setPreviewShape(null)
    setInteractionCancelToken(token => token + 1)
    suppressBoardClicksUntilRef.current = Date.now() + 500
    const snapshot = touchUiSnapshotRef.current
    if (snapshot) {
      useBoardStore.setState({
        selection: snapshot.selection,
        panel: snapshot.panel,
      })
    }
  }, [])

  const handleTouchSequenceEnd = useCallback((hadPinch: boolean) => {
    if (hadPinch) suppressBoardClicksUntilRef.current = Date.now() + 500
  }, [])

  const {
    handlePointerDownCapture,
    handlePointerMoveCapture,
    handlePointerUpCapture,
    handlePointerCancelCapture,
    handlePointerDown, handlePointerMove, handlePointerUp,
    isPointerSuppressed,
  } = useZoomPan(containerRef, {
    onTouchSequenceStart: handleTouchSequenceStart,
    onPinchStart: handlePinchStart,
    onTouchSequenceEnd: handleTouchSequenceEnd,
  })

  const year = boardState?.board.year || new Date().getFullYear()
  const isAligned = dayLayout === 'weekday-aligned'
  const totalColumns = useMemo(() => isAligned ? getMaxColumnsForYear(year) : 31, [isAligned, year])

  const boardItems = boardState?.items
  const filteredBoardItems = useMemo(
    () => (boardItems ? filterItemsByBoardView(boardItems, boardViewFilter) : {}),
    [boardItems, boardViewFilter]
  )
  const itemIndex = useMemo(
    () => buildItemDateIndex(filteredBoardItems, year),
    [filteredBoardItems, year]
  )
  const highlightDateKeys = useMemo(() => {
    if (dragPreviewKeys != null) return new Set(dragPreviewKeys)
    const s = new Set<string>()
    if (selection?.type === 'day') s.add(selection.dateKey)
    if (selection?.type === 'days') selection.dateKeys.forEach(k => s.add(k))
    return s
  }, [selection, dragPreviewKeys])

  const dragSelecting = dragPreviewKeys !== null

  const openBacklogIfNeeded = () => {
    const state = useBoardStore.getState()
    if (!state.panel.leftOpen || state.panel.leftMode !== 'backlog') {
      state.toggleLeftPanel('backlog')
    }
  }

  const handlePanCellClick = useCallback((dateKey: string) => {
    if (Date.now() < suppressBoardClicksUntilRef.current) return
    const state = useBoardStore.getState()
    if (state.interactionMode !== 'pan') return
    setExpandedDateKey(null)
    const alreadySelected = selection?.type === 'day' && selection.dateKey === dateKey
    setSelection(alreadySelected ? null : { type: 'day', dateKey })
    if (!alreadySelected && (!state.panel.leftOpen || state.panel.leftMode !== 'backlog')) {
      toggleLeftPanel('backlog')
    }
  }, [selection, setSelection, toggleLeftPanel])

  const handleModifierCellClick = useCallback((dateKey: string) => {
    if (Date.now() < suppressBoardClicksUntilRef.current) return
    const state = useBoardStore.getState()
    if (state.interactionMode !== 'select') return
    setExpandedDateKey(null)
    const next = toggleDateKeyInSelection(state.selection, dateKey)
    setSelection(next)
    if (next) openBacklogIfNeeded()
  }, [setSelection])

  const handleSelectPointerDown = useCallback((e: React.PointerEvent, anchorKey: string) => {
    if (
      useBoardStore.getState().interactionMode !== 'select'
      || isPointerSuppressed(e.pointerId)
    ) return
    selectWindowCleanupRef.current?.()
    setExpandedDateKey(null)
    dragSessionRef.current = {
      pointerId: e.pointerId,
      anchorKey,
      currentKey: anchorKey,
      startX: e.clientX,
      startY: e.clientY,
    }
    setDragPreviewKeys(getDateKeysBetween(anchorKey, anchorKey))

    const onMove = (ev: PointerEvent) => {
      const sess = dragSessionRef.current
      if (!sess || ev.pointerId !== sess.pointerId || isPointerSuppressed(ev.pointerId)) return
      const k = getDateKeyFromPoint(ev.clientX, ev.clientY)
      if (!k) return
      sess.currentKey = k
      setDragPreviewKeys(getDateKeysBetween(sess.anchorKey, k))
    }

    const cleanup = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      if (selectWindowCleanupRef.current === cleanup) selectWindowCleanupRef.current = null
    }

    const onUp = (ev: PointerEvent) => {
      const active = dragSessionRef.current
      if (!active || ev.pointerId !== active.pointerId) return
      cleanup()
      const sess = dragSessionRef.current
      dragSessionRef.current = null
      setDragPreviewKeys(null)
      if (!sess || ev.type === 'pointercancel' || isPointerSuppressed(ev.pointerId)) return

      const keys = getDateKeysBetween(sess.anchorKey, sess.currentKey)
      const state = useBoardStore.getState()
      if (keys.length === 1) {
        const dk = keys[0]
        const sel = state.selection
        const onlyThis =
          (sel?.type === 'day' && sel.dateKey === dk)
          || (sel?.type === 'days' && sel.dateKeys.length === 1 && sel.dateKeys[0] === dk)
        if (onlyThis) {
          state.setSelection(null)
        } else {
          state.setSelection({ type: 'day', dateKey: dk })
          openBacklogIfNeeded()
        }
      } else {
        state.setSelection({ type: 'days', dateKeys: keys })
        openBacklogIfNeeded()
      }
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    selectWindowCleanupRef.current = cleanup
  }, [isPointerSuppressed])

  useEffect(() => () => {
    selectWindowCleanupRef.current?.()
    drawWindowCleanupRef.current?.()
  }, [])

  const handleCellDoubleClick = useCallback((dateKey: string) => {
    if (Date.now() < suppressBoardClicksUntilRef.current) return
    setExpandedDateKey(prev => prev === dateKey ? null : dateKey)
    setSelection({ type: 'day', dateKey })
  }, [setSelection])

  const closeExpanded = useCallback(() => {
    setExpandedDateKey(null)
  }, [])

  const onSelectItemFromExpanded = useCallback(
    (itemId: string) => {
      setSelection({ type: 'item', itemId })
      ensureLeftPanelOpen('detail')
    },
    [setSelection, ensureLeftPanelOpen]
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && expandedDateKey) {
        setExpandedDateKey(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [expandedDateKey])

  const fitToScreen = useCallback(() => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    resetView(rect.width, rect.height)
  }, [resetView])

  useEffect(() => {
    fitToScreenRef.current = fitToScreen
    return () => { fitToScreenRef.current = null }
  }, [fitToScreen])

  useEffect(() => {
    if (boardState && !didInitRef.current && containerRef.current) {
      didInitRef.current = true
      fitToScreen()
    }
  }, [boardState, fitToScreen])

  useEffect(() => {
    if (didInitRef.current) fitToScreen()
  }, [dayLayout, fitToScreen])

  const expandedPosition = useMemo(() => {
    if (!expandedDateKey) return null
    const { month, day } = parseDateKey(expandedDateKey)
    const headerH = isAligned ? DAY_HEADER_HEIGHT : 0
    const rowHeight = BASE_CELL_HEIGHT + MONTH_GAP
    const col = isAligned ? getFirstDayOfWeek(year, month) + (day - 1) : (day - 1)
    const x = MONTH_HEADER_WIDTH + col * (BASE_CELL_WIDTH + 1)
    const y = headerH + month * rowHeight
    return { x, y }
  }, [expandedDateKey, isAligned, year])

  const headerH = isAligned ? DAY_HEADER_HEIGHT : 0
  const rowHeight = BASE_CELL_HEIGHT + MONTH_GAP
  const boardW = MONTH_HEADER_WIDTH + totalColumns * (BASE_CELL_WIDTH + 1)
  const boardH = headerH + 12 * rowHeight
  /** 달력 격자 밖(여백)에서도 그리기·배치 */
  const canvasPad = 140

  const selectedOverlayId = selection?.type === 'overlay' ? selection.overlayId : null

  const previewPolylineTool =
    previewStrokeTool ?? (settingsDrawTool === 'highlighter' ? 'highlighter' : 'pen')
  const previewLineStroke =
    previewPolylineTool === 'highlighter'
      ? highlighterStroke(drawUi.drawHighlighterColor, drawUi.drawHighlighterWidthWeight)
      : penStroke(drawUi.drawPenColor, drawUi.drawPenWidthWeight)

  const handleDrawSurfacePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return
      const st = useBoardStore.getState()
      const mode = st.interactionMode
      const bid = st.activeBoardId
      if (!bid || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const { x, y } = clientToBoardPoint(e.clientX, e.clientY, rect, st.view)
      if (
        x < -canvasPad
        || y < -canvasPad
        || x > boardW + canvasPad
        || y > boardH + canvasPad
      ) {
        return
      }

      if (mode === 'place') {
        e.stopPropagation()
        const placeAtClient = (clientX: number, clientY: number) => {
          const current = useBoardStore.getState()
          const currentBoardId = current.activeBoardId
          const currentContainer = containerRef.current
          if (!currentBoardId || !currentContainer || current.interactionMode !== 'place') return
          const currentRect = currentContainer.getBoundingClientRect()
          const point = clientToBoardPoint(clientX, clientY, currentRect, current.view)
          if (
            point.x < -canvasPad
            || point.y < -canvasPad
            || point.x > boardW + canvasPad
            || point.y > boardH + canvasPad
          ) return

          const settings = current.settings
          if (settings.placeKind === 'sticker') {
            const assetId = settings.placeStickerAssetId
            const asset = assetId ? current.boards[currentBoardId]?.assets[assetId] : undefined
            if (asset) {
              const naturalW = Math.max(1, asset.width ?? 1)
              const naturalH = Math.max(1, asset.height ?? 1)
              const maxSide = 14
              const scale = maxSide / Math.max(naturalW, naturalH)
              const width = Math.max(4, naturalW * scale)
              const height = Math.max(4, naturalH * scale)
              current.createOverlay(
                currentBoardId,
                'image',
                'decorative',
                point.x - width / 2,
                point.y - height / 2,
                width,
                height,
                { assetId: asset.id },
              )
            } else {
              const ch = settings.placeStickerChar?.trim() || '⭐'
              current.createOverlay(
                currentBoardId,
                'sticker',
                'decorative',
                point.x - 5.5,
                point.y - 5.5,
                11,
                11,
                { text: ch },
              )
            }
          } else {
            const mw = Math.min(120, Math.max(12, settings.placeMemoWidth))
            const mh = Math.min(80, Math.max(8, settings.placeMemoHeight))
            const linkId = current.selection?.type === 'item' ? current.selection.itemId : undefined
            const memoId = current.createOverlay(
              currentBoardId,
              'text',
              'semantic',
              point.x - mw / 2,
              point.y - mh / 2,
              mw,
              mh,
              {
                fillColor: settings.placeMemoPaperColor,
                linkedItemId: linkId,
                strokeColor: 'rgba(0, 0, 0, 0.1)',
              },
            )
            const after = useBoardStore.getState()
            after.setSelection({ type: 'overlay', overlayId: memoId })
            after.setInteractionMode('select')
            after.ensureLeftPanelOpen('detail')
          }
        }

        if (e.pointerType !== 'touch') {
          placeAtClient(e.clientX, e.clientY)
          return
        }

        const pointerId = e.pointerId
        const cleanup = () => {
          window.removeEventListener('pointerup', onUp)
          window.removeEventListener('pointercancel', onUp)
          if (drawWindowCleanupRef.current === cleanup) drawWindowCleanupRef.current = null
        }
        const onUp = (ev: PointerEvent) => {
          if (ev.pointerId !== pointerId) return
          cleanup()
          if (ev.type === 'pointercancel' || isPointerSuppressed(ev.pointerId)) return
          placeAtClient(ev.clientX, ev.clientY)
        }
        drawWindowCleanupRef.current?.()
        window.addEventListener('pointerup', onUp)
        window.addEventListener('pointercancel', onUp)
        drawWindowCleanupRef.current = cleanup
        return
      }

      if (mode !== 'draw') return
      e.stopPropagation()
      const tool = st.settings.drawTool
      const pointerId = e.pointerId

      if (tool === 'eraser') {
        let batchStarted = false
        let erased = false
        const ensureBatch = () => {
          if (batchStarted) return
          useBoardStore.getState().beginHistoryBatch()
          batchStarted = true
        }
        const eraseAt = (bx: number, by: number) => {
          const s2 = useBoardStore.getState()
          const bid2 = s2.activeBoardId
          if (!bid2) return
          const ovs = s2.boards[bid2]?.overlays
          if (!ovs) return
          const oid = topOverlayIdAt(ovs, bx, by)
          if (oid) {
            ensureBatch()
            s2.deleteOverlay(oid)
            erased = true
          }
        }
        if (e.pointerType !== 'touch') eraseAt(x, y)
        const onMove = (ev: PointerEvent) => {
          if (
            ev.pointerId !== pointerId
            || isPointerSuppressed(ev.pointerId)
            || !containerRef.current
          ) return
          const r = containerRef.current.getBoundingClientRect()
          const v = useBoardStore.getState().view
          const p = clientToBoardPoint(ev.clientX, ev.clientY, r, v)
          eraseAt(p.x, p.y)
        }
        const cleanup = () => {
          window.removeEventListener('pointermove', onMove)
          window.removeEventListener('pointerup', onUp)
          window.removeEventListener('pointercancel', onUp)
          if (batchStarted) useBoardStore.getState().endHistoryBatch()
          if (drawWindowCleanupRef.current === cleanup) drawWindowCleanupRef.current = null
        }
        const onUp = (ev: PointerEvent) => {
          if (ev.pointerId !== pointerId) return
          const cancelled = ev.type === 'pointercancel' || isPointerSuppressed(ev.pointerId)
          if (!cancelled && e.pointerType === 'touch' && !erased && containerRef.current) {
            const r = containerRef.current.getBoundingClientRect()
            const v = useBoardStore.getState().view
            const p = clientToBoardPoint(ev.clientX, ev.clientY, r, v)
            eraseAt(p.x, p.y)
          }
          cleanup()
        }
        window.addEventListener('pointermove', onMove)
        window.addEventListener('pointerup', onUp)
        window.addEventListener('pointercancel', onUp)
        drawWindowCleanupRef.current = cleanup
        return
      }

      if (tool === 'pen' || tool === 'highlighter') {
        drawSessionRef.current = { kind: 'stroke', pointerId, points: [[x, y]], tool }
        latestPreviewShapeRef.current = null
        setPreviewStrokeTool(tool)
        setPreviewPoints([[x, y]])
        setPreviewShape(null)
      } else if (tool === 'rect' || tool === 'ellipse' || tool === 'textbox') {
        drawSessionRef.current = { kind: 'shape', pointerId, start: [x, y], tool }
        setPreviewStrokeTool(null)
        const initial = { x, y, w: 0, h: 0, tool }
        latestPreviewShapeRef.current = initial
        setPreviewShape(initial)
        setPreviewPoints(null)
      } else {
        return
      }

      const onMove = (ev: PointerEvent) => {
        const sess = drawSessionRef.current
        if (
          !sess
          || ev.pointerId !== sess.pointerId
          || isPointerSuppressed(ev.pointerId)
          || !containerRef.current
        ) return
        const r = containerRef.current.getBoundingClientRect()
        const v = useBoardStore.getState().view
        const p = clientToBoardPoint(ev.clientX, ev.clientY, r, v)
        if (sess.kind === 'stroke') {
          const last = sess.points[sess.points.length - 1]
          const dx = p.x - last[0]
          const dy = p.y - last[1]
          if (dx * dx + dy * dy < 0.04) return
          sess.points.push([p.x, p.y])
          setPreviewPoints([...sess.points])
        } else {
          let w = Math.abs(p.x - sess.start[0])
          let h = Math.abs(p.y - sess.start[1])
          let x0 = Math.min(sess.start[0], p.x)
          let y0 = Math.min(sess.start[1], p.y)
          if (sess.tool === 'textbox' && ev.shiftKey) {
            const s = Math.max(w, h)
            w = s
            h = s
            x0 = p.x >= sess.start[0] ? sess.start[0] : sess.start[0] - s
            y0 = p.y >= sess.start[1] ? sess.start[1] : sess.start[1] - s
          }
          const next = { x: x0, y: y0, w, h, tool: sess.tool }
          latestPreviewShapeRef.current = next
          setPreviewShape(next)
        }
      }

      const cleanup = () => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        window.removeEventListener('pointercancel', onUp)
        if (drawWindowCleanupRef.current === cleanup) drawWindowCleanupRef.current = null
      }

      const onUp = (ev: PointerEvent) => {
        const active = drawSessionRef.current
        if (!active || ev.pointerId !== active.pointerId) return
        cleanup()
        const sess = drawSessionRef.current
        drawSessionRef.current = null
        setPreviewPoints(null)
        setPreviewStrokeTool(null)
        const sh = latestPreviewShapeRef.current
        latestPreviewShapeRef.current = null
        setPreviewShape(null)
        if (!sess || ev.type === 'pointercancel' || isPointerSuppressed(ev.pointerId)) return
        const state = useBoardStore.getState()
        const bId = state.activeBoardId
        if (!bId) return

        const sset = state.settings
        if (sess.kind === 'stroke') {
          if (sess.points.length < 2) return
          const bbox = pointsBBox(sess.points, 0.7)
          if (!bbox) return
          const stroke =
            sess.tool === 'highlighter'
              ? highlighterStroke(sset.drawHighlighterColor, sset.drawHighlighterWidthWeight)
              : penStroke(sset.drawPenColor, sset.drawPenWidthWeight)
          const pathD = pointsToPathD(sess.points, bbox.x, bbox.y)
          state.createOverlay(bId, 'shape', 'decorative', bbox.x, bbox.y, bbox.width, bbox.height, {
            pathD,
            drawTool: sess.tool,
            strokeColor: stroke.color,
            strokeWidthPx: stroke.width,
            fillColor: stroke.fill,
          })
        } else {
          if (!sh || sh.w < 0.8 || sh.h < 0.8) return
          if (sh.tool === 'textbox') {
            const stroke = shapeStrokeFill(
              sset.drawShapeStrokeColor,
              sset.drawShapeFillColor,
              sset.drawShapeStrokeWeight
            )
            const initialFont =
              Math.round(Math.min(32, Math.max(9, Math.min(sh.w, sh.h) * 0.38)) * 10) / 10
            const initialHit = Math.min(sh.h, initialFont * 1.35 + 2)
            const oid = state.createOverlay(bId, 'text', 'decorative', sh.x, sh.y, sh.w, sh.h, {
              text: '',
              drawTool: 'textbox',
              strokeColor: stroke.color,
              strokeWidthPx: stroke.width,
              strokeOpacity: 0,
              fillColor: stroke.fill === 'none' ? undefined : stroke.fill,
              fillOpacity: stroke.fill === 'none' ? 0 : 1,
              textBoxFontSizePx: initialFont,
              textBoxContentHeight: initialHit,
            })
            const after = useBoardStore.getState()
            after.setSelection({ type: 'overlay', overlayId: oid })
            after.setInteractionMode('select')
            after.ensureLeftPanelOpen('detail')
            return
          }
          const stroke = shapeStrokeFill(
            sset.drawShapeStrokeColor,
            sset.drawShapeFillColor,
            sset.drawShapeStrokeWeight
          )
          state.createOverlay(bId, 'shape', 'decorative', sh.x, sh.y, sh.w, sh.h, {
            drawTool: sess.tool,
            strokeColor: stroke.color,
            fillColor: stroke.fill,
            strokeWidthPx: stroke.width,
          })
        }
      }

      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
      window.addEventListener('pointercancel', onUp)
      drawWindowCleanupRef.current = cleanup
    },
    [boardH, boardW, canvasPad, isPointerSuppressed]
  )

  const cursorStyle =
    interactionMode === 'pan'
      ? 'grab'
      : interactionMode === 'draw'
        ? settingsDrawTool === 'eraser'
          ? 'cell'
          : 'crosshair'
        : interactionMode === 'place'
          ? 'copy'
          : 'default'

  const shapePreview = useMemo(() => {
    if (!previewShape || previewShape.w <= 0 || previewShape.h <= 0) return null
    const ps = shapeStrokeFill(
      drawUi.drawShapeStrokeColor,
      drawUi.drawShapeFillColor,
      drawUi.drawShapeStrokeWeight
    )
    return (
      <g pointerEvents="none">
        {previewShape.tool === 'rect' || previewShape.tool === 'textbox' ? (
          <rect
            x={previewShape.x}
            y={previewShape.y}
            width={previewShape.w}
            height={previewShape.h}
            fill={ps.fill}
            stroke={previewShape.tool === 'textbox' ? 'rgba(100, 100, 100, 0.45)' : ps.color}
            strokeWidth={previewShape.tool === 'textbox' ? 0.42 : ps.width}
            strokeDasharray={previewShape.tool === 'textbox' ? '1.2 1.2' : undefined}
            rx={0.5}
          />
        ) : (
          <ellipse
            cx={previewShape.x + previewShape.w / 2}
            cy={previewShape.y + previewShape.h / 2}
            rx={previewShape.w / 2}
            ry={previewShape.h / 2}
            fill={ps.fill}
            stroke={ps.color}
            strokeWidth={ps.width}
          />
        )}
      </g>
    )
  }, [
    previewShape,
    drawUi.drawShapeStrokeColor,
    drawUi.drawShapeFillColor,
    drawUi.drawShapeStrokeWeight,
  ])

  return (
    <div
      ref={containerRef}
      className="year-board-container"
      onPointerDownCapture={handlePointerDownCapture}
      onPointerMoveCapture={handlePointerMoveCapture}
      onPointerUpCapture={handlePointerUpCapture}
      onPointerCancelCapture={handlePointerCancelCapture}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{ cursor: cursorStyle }}
    >
      {!boardState ? (
        <div className="year-board-empty">No board loaded</div>
      ) : (
        <svg className="year-board-svg" width="100%" height="100%">
          <g transform={`translate(${view.translateX}, ${view.translateY}) scale(${view.scale})`}>
            {isAligned && <WeekdayHeader totalColumns={totalColumns} y={0} />}
            {Array.from({ length: 12 }, (_, month) => (
              <MonthRow
                key={month}
                year={year}
                month={month}
                y={headerH + month * rowHeight}
                zoomLevel={view.zoomLevel}
                dayLayout={dayLayout}
                interactionMode={interactionMode}
                itemIndex={itemIndex}
                items={filteredBoardItems}
                ranges={boardState.ranges}
                rangeEditPreview={rangeEditPreview}
                showTimelineBarsMultiDay={boardViewFilter.showTimelineBarsMultiDay}
                showTimelineBarsSingleDay={boardViewFilter.showTimelineBarsSingleDay}
                showTimelineBarsTimeOfDay={boardViewFilter.showTimelineBarsTimeOfDay}
                highlightDateKeys={highlightDateKeys}
                dragSelecting={dragSelecting}
                onPanCellClick={handlePanCellClick}
                onSelectPointerDown={handleSelectPointerDown}
                onModifierCellClick={handleModifierCellClick}
                onCellDoubleClick={handleCellDoubleClick}
              />
            ))}
            {(interactionMode === 'draw' || interactionMode === 'place') && (
              <rect
                x={-canvasPad}
                y={-canvasPad}
                width={boardW + 2 * canvasPad}
                height={boardH + 2 * canvasPad}
                fill="transparent"
                style={{ pointerEvents: 'all' }}
                onPointerDown={handleDrawSurfacePointerDown}
              />
            )}
            <BoardOverlays
              overlays={boardState.overlays}
              assets={boardState.assets}
              interactionMode={interactionMode}
              selectedOverlayId={selectedOverlayId}
              isPointerSuppressed={isPointerSuppressed}
              interactionCancelToken={interactionCancelToken}
            />
            {previewPoints && previewPoints.length > 1 && (
              <polyline
                fill="none"
                stroke={previewLineStroke.color}
                strokeWidth={previewLineStroke.width}
                strokeLinecap="round"
                strokeLinejoin="round"
                points={previewPoints.map(p => `${p[0]},${p[1]}`).join(' ')}
                pointerEvents="none"
              />
            )}
            {shapePreview}
            {expandedDateKey && expandedPosition && (
              <ExpandedCell
                dateKey={expandedDateKey}
                items={itemIndex[expandedDateKey] || []}
                ranges={boardState.ranges}
                x={expandedPosition.x}
                y={expandedPosition.y}
                onClose={closeExpanded}
                onSelectItem={onSelectItemFromExpanded}
              />
            )}
          </g>
        </svg>
      )}
    </div>
  )
}
