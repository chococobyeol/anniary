import { useEffect, useMemo, useRef, useCallback, useState } from 'react'
import { MonthRow } from './MonthRow'
import { WeekdayHeader } from './WeekdayHeader'
import { ExpandedCell } from './ExpandedCell'
import { useBoardStore } from '../../store/board-store'
import { useZoomPan } from '../../hooks/useZoomPan'
import { BASE_CELL_WIDTH, BASE_CELL_HEIGHT, MONTH_HEADER_WIDTH, MONTH_GAP, DAY_HEADER_HEIGHT } from '../../utils/zoom'
import { getMaxColumnsForYear, parseDateKey, getFirstDayOfWeek } from '../../utils/date'
import { buildItemDateIndex, buildRangeDateIndex } from '../../utils/indexing'
import './YearBoard.css'

export const fitToScreenRef: { current: (() => void) | null } = { current: null }

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

  const containerRef = useRef<HTMLDivElement>(null)
  const didInitRef = useRef(false)
  const [expandedDateKey, setExpandedDateKey] = useState<string | null>(null)

  const {
    handlePointerDown, handlePointerMove, handlePointerUp,
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
      const alreadySelected = selection?.type === 'day' && selection.dateKey === dateKey
      setSelection(alreadySelected ? null : { type: 'day', dateKey })
      if (!alreadySelected && (!state.panel.leftOpen || state.panel.leftMode !== 'backlog')) {
        toggleLeftPanel('backlog')
      }
    }
  }, [selection, setSelection, toggleLeftPanel])

  const handleCellDoubleClick = useCallback((dateKey: string) => {
    setExpandedDateKey(prev => prev === dateKey ? null : dateKey)
  }, [])

  const closeExpanded = useCallback(() => {
    setExpandedDateKey(null)
  }, [])

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
  const cursorStyle = interactionMode === 'pan' ? 'grab' : 'default'

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
