import { useBoardStore } from '../../store/board-store'
import { RangeDetail } from './detail/RangeDetail'
import { ItemDetail } from './detail/ItemDetail'
import { OverlayDetail } from './detail/OverlayDetail'
import './DetailPanel.css'

export function DetailPanel() {
  const selection = useBoardStore(s => s.selection)

  if (!selection) {
    return <div className="panel-placeholder">Select a cell to open detail</div>
  }

  if (selection.type === 'day' || selection.type === 'days') {
    return (
      <div className="panel-placeholder">
        Double-click a day on the board for its timeline. Open an item from the backlog to edit it here.
      </div>
    )
  }
  if (selection.type === 'range') return <RangeDetail key={selection.rangeId} />
  if (selection.type === 'item') return <ItemDetail key={selection.itemId} />
  if (selection.type === 'overlay') return <OverlayDetail key={selection.overlayId} />

  return null
}
