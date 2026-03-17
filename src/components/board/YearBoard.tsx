import { useMemo } from 'react'
import { MonthRow } from './MonthRow'
import { useBoardStore } from '../../store/board-store'
import { useZoomPan } from '../../hooks/useZoomPan'
import { BASE_CELL_HEIGHT, MONTH_GAP, BASE_CELL_WIDTH, MONTH_HEADER_WIDTH } from '../../utils/zoom'
import './YearBoard.css'

export function YearBoard() {
  const activeBoardId = useBoardStore(s => s.activeBoardId)
  const boardState = useBoardStore(s => activeBoardId ? s.boards[activeBoardId] : null)
  const view = useBoardStore(s => s.view)
  const selection = useBoardStore(s => s.selection)
  const setSelection = useBoardStore(s => s.setSelection)
  const interactionMode = useBoardStore(s => s.interactionMode)

  const {
    handleWheel, handlePointerDown, handlePointerMove, handlePointerUp,
    handleTouchStart, handleTouchMove, handleTouchEnd,
  } = useZoomPan()

  const year = boardState?.board.year || new Date().getFullYear()

  const selectedDateKey = useMemo(() => {
    if (selection?.type === 'day') return selection.dateKey
    return null
  }, [selection])

  const handleCellClick = (dateKey: string) => {
    if (interactionMode === 'select') {
      setSelection({ type: 'day', dateKey })
    }
  }

  const rowHeight = BASE_CELL_HEIGHT + MONTH_GAP
  const totalWidth = MONTH_HEADER_WIDTH + 31 * (BASE_CELL_WIDTH + 1) + 20
  const totalHeight = 12 * rowHeight + 20

  const cursorStyle = interactionMode === 'pan' ? 'grab' : 'default'

  if (!boardState) {
    return <div className="year-board-empty">No board loaded</div>
  }

  return (
    <div
      className="year-board-container"
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ cursor: cursorStyle }}
    >
      <svg
        className="year-board-svg"
        width="100%"
        height="100%"
      >
        <g transform={`translate(${view.translateX}, ${view.translateY}) scale(${view.scale})`}>
          {Array.from({ length: 12 }, (_, month) => (
            <MonthRow
              key={month}
              year={year}
              month={month}
              y={month * rowHeight + 10}
              zoomLevel={view.zoomLevel}
              items={boardState.items}
              ranges={boardState.ranges}
              selectedDateKey={selectedDateKey}
              onCellClick={handleCellClick}
            />
          ))}
        </g>
      </svg>
    </div>
  )
}
