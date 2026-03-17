import { useEffect, useMemo, useRef, useCallback } from 'react'
import { MonthRow } from './MonthRow'
import { WeekdayHeader } from './WeekdayHeader'
import { useBoardStore } from '../../store/board-store'
import { useZoomPan } from '../../hooks/useZoomPan'
import { BASE_CELL_HEIGHT, MONTH_GAP, DAY_HEADER_HEIGHT } from '../../utils/zoom'
import { getMaxColumnsForYear } from '../../utils/date'
import './YearBoard.css'

export const fitToScreenRef: { current: (() => void) | null } = { current: null }

export function YearBoard() {
  const activeBoardId = useBoardStore(s => s.activeBoardId)
  const boardState = useBoardStore(s => activeBoardId ? s.boards[activeBoardId] : null)
  const view = useBoardStore(s => s.view)
  const selection = useBoardStore(s => s.selection)
  const setSelection = useBoardStore(s => s.setSelection)
  const interactionMode = useBoardStore(s => s.interactionMode)
  const resetView = useBoardStore(s => s.resetView)
  const dayLayout = useBoardStore(s => s.settings.dayLayout)

  const containerRef = useRef<HTMLDivElement>(null)
  const didInitRef = useRef(false)

  const {
    handlePointerDown, handlePointerMove, handlePointerUp,
    handleTouchStart, handleTouchMove, handleTouchEnd,
  } = useZoomPan(containerRef)

  const year = boardState?.board.year || new Date().getFullYear()
  const isAligned = dayLayout === 'weekday-aligned'
  const totalColumns = useMemo(() => isAligned ? getMaxColumnsForYear(year) : 31, [isAligned, year])

  const selectedDateKey = useMemo(() => {
    if (selection?.type === 'day') return selection.dateKey
    return null
  }, [selection])

  const handleCellClick = useCallback((dateKey: string) => {
    const mode = useBoardStore.getState().interactionMode
    if (mode === 'select') {
      setSelection({ type: 'day', dateKey })
    }
  }, [setSelection])

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
                items={boardState.items}
                ranges={boardState.ranges}
                selectedDateKey={selectedDateKey}
                onCellClick={handleCellClick}
              />
            ))}
          </g>
        </svg>
      )}
    </div>
  )
}
