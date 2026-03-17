import { useEffect, useMemo, useRef, useCallback, useState } from 'react'
import { MonthRow } from './MonthRow'
import { WeekdayHeader } from './WeekdayHeader'
import { ExpandedCell } from './ExpandedCell'
import { RangePreview } from './RangePreview'
import { useBoardStore } from '../../store/board-store'
import { useZoomPan } from '../../hooks/useZoomPan'
import { BASE_CELL_WIDTH, BASE_CELL_HEIGHT, MONTH_HEADER_WIDTH, MONTH_GAP, DAY_HEADER_HEIGHT } from '../../utils/zoom'
import { getMaxColumnsForYear, parseDateKey, getFirstDayOfWeek, getDaysInMonth, toDateKey, normalizeDateRange } from '../../utils/date'
import { buildItemDateIndex, buildRangeDateIndex } from '../../utils/indexing'
import type { DayLayout, ViewState } from '../../types/state'
import './YearBoard.css'

export const fitToScreenRef: { current: (() => void) | null } = { current: null }

function screenToDateKey(
  clientX: number, clientY: number,
  containerRect: DOMRect, view: ViewState,
  year: number, dayLayout: DayLayout,
): string | null {
  const headerH = dayLayout === 'weekday-aligned' ? DAY_HEADER_HEIGHT : 0
  const rowHeight = BASE_CELL_HEIGHT + MONTH_GAP

  const boardX = (clientX - containerRect.left - view.translateX) / view.scale
  const boardY = (clientY - containerRect.top - view.translateY) / view.scale

  const month = Math.floor((boardY - headerH) / rowHeight)
  if (month < 0 || month > 11) return null

  const rowY = headerH + month * rowHeight
  if (boardY > rowY + BASE_CELL_HEIGHT) return null

  const col = Math.floor((boardX - MONTH_HEADER_WIDTH) / (BASE_CELL_WIDTH + 1))
  if (col < 0) return null

  let day: number
  if (dayLayout === 'weekday-aligned') {
    const firstDow = getFirstDayOfWeek(year, month)
    day = col - firstDow + 1
  } else {
    day = col + 1
  }

  const daysInMonth = getDaysInMonth(year, month)
  if (day < 1 || day > daysInMonth) return null

  return toDateKey(year, month, day)
}

export function YearBoard() {
  const activeBoardId = useBoardStore(s => s.activeBoardId)
  const boardState = useBoardStore(s => activeBoardId ? s.boards[activeBoardId] : null)
  const view = useBoardStore(s => s.view)
  const selection = useBoardStore(s => s.selection)
  const setSelection = useBoardStore(s => s.setSelection)
  const toggleLeftPanel = useBoardStore(s => s.toggleLeftPanel)
  const interactionMode = useBoardStore(s => s.interactionMode)
  const resetView = useBoardStore(s => s.resetView)
  const dayLayout = useBoardStore(s => s.settings.dayLayout)
  const createRange = useBoardStore(s => s.createRange)

  const containerRef = useRef<HTMLDivElement>(null)
  const didInitRef = useRef(false)
  const [expandedDateKey, setExpandedDateKey] = useState<string | null>(null)
  const [draftRange, setDraftRange] = useState<{ start: string; end: string } | null>(null)
  const draftRef = useRef<{ start: string; end: string } | null>(null)
  const drawingRef = useRef(false)

  const {
    handlePointerDown: panPointerDown,
    handlePointerMove: panPointerMove,
    handlePointerUp: panPointerUp,
    handleTouchStart, handleTouchMove, handleTouchEnd,
  } = useZoomPan(containerRef)

  const year = boardState?.board.year || new Date().getFullYear()
  const isAligned = dayLayout === 'weekday-aligned'
  const totalColumns = useMemo(() => isAligned ? getMaxColumnsForYear(year) : 31, [isAligned, year])

  const itemIndex = useMemo(
    () => boardState ? buildItemDateIndex(boardState.items) : {},
    [boardState?.items]
  )
  const rangeIndex = useMemo(
    () => boardState ? buildRangeDateIndex(boardState.ranges) : {},
    [boardState?.ranges]
  )

  const selectedDateKey = useMemo(() => {
    if (selection?.type === 'day') return selection.dateKey
    return null
  }, [selection])

  const handleCellClick = useCallback((dateKey: string) => {
    const state = useBoardStore.getState()
    const mode = state.interactionMode

    if (mode === 'select' || mode === 'pan') {
      setExpandedDateKey(null)
      setSelection({ type: 'day', dateKey })
      if (!state.panel.leftOpen || state.panel.leftMode !== 'detail') {
        toggleLeftPanel('detail')
      }
    }
  }, [setSelection, toggleLeftPanel])

  const handleCellDoubleClick = useCallback((dateKey: string) => {
    const mode = useBoardStore.getState().interactionMode
    if (mode === 'draw') return
    setExpandedDateKey(prev => prev === dateKey ? null : dateKey)
  }, [])

  const closeExpanded = useCallback(() => {
    setExpandedDateKey(null)
  }, [])

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const state = useBoardStore.getState()
    if (state.interactionMode === 'draw' && e.button === 0) {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      const dateKey = screenToDateKey(e.clientX, e.clientY, rect, state.view, year, state.settings.dayLayout)
      if (dateKey) {
        drawingRef.current = true
        draftRef.current = { start: dateKey, end: dateKey }
        setDraftRange({ start: dateKey, end: dateKey })
        e.currentTarget.setPointerCapture(e.pointerId)
      }
    } else {
      panPointerDown(e)
    }
  }, [panPointerDown, year])

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (drawingRef.current && draftRef.current) {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      const state = useBoardStore.getState()
      const dateKey = screenToDateKey(e.clientX, e.clientY, rect, state.view, year, state.settings.dayLayout)
      if (dateKey && dateKey !== draftRef.current.end) {
        draftRef.current = { ...draftRef.current, end: dateKey }
        setDraftRange({ ...draftRef.current })
      }
    } else {
      panPointerMove(e)
    }
  }, [panPointerMove, year])

  const handlePointerUp = useCallback((_e: React.PointerEvent<HTMLDivElement>) => {
    if (drawingRef.current && draftRef.current) {
      const state = useBoardStore.getState()
      if (state.activeBoardId) {
        const { start, end } = normalizeDateRange(draftRef.current.start, draftRef.current.end)
        const rangeId = createRange(state.activeBoardId, 'period', start, end)
        setSelection({ type: 'range', rangeId })
        if (!state.panel.leftOpen || state.panel.leftMode !== 'detail') {
          toggleLeftPanel('detail')
        }
      }
      drawingRef.current = false
      draftRef.current = null
      setDraftRange(null)
    } else {
      panPointerUp()
    }
  }, [panPointerUp, createRange, setSelection, toggleLeftPanel])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (drawingRef.current) {
          drawingRef.current = false
          draftRef.current = null
          setDraftRange(null)
        }
        if (expandedDateKey) {
          setExpandedDateKey(null)
        }
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
  const cursorStyle = interactionMode === 'pan' ? 'grab'
    : interactionMode === 'draw' ? 'crosshair'
    : 'default'

  return (
    <div
      ref={containerRef}
      className="year-board-container"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
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
                itemIndex={itemIndex}
                rangeIndex={rangeIndex}
                selectedDateKey={selectedDateKey}
                onCellClick={handleCellClick}
                onCellDoubleClick={handleCellDoubleClick}
              />
            ))}
            {draftRange && (
              <RangePreview
                startDateKey={draftRange.start}
                endDateKey={draftRange.end}
                year={year}
                dayLayout={dayLayout}
              />
            )}
            {expandedDateKey && expandedPosition && (
              <ExpandedCell
                dateKey={expandedDateKey}
                items={itemIndex[expandedDateKey] || []}
                x={expandedPosition.x}
                y={expandedPosition.y}
                onClose={closeExpanded}
              />
            )}
          </g>
        </svg>
      )}
    </div>
  )
}
