import { useBoardStore } from '../../store/board-store'
import { DayDetail } from './detail/DayDetail'
import { RangeDetail } from './detail/RangeDetail'
import { ItemDetail } from './detail/ItemDetail'
import './DetailPanel.css'

export function DetailPanel() {
  const selection = useBoardStore(s => s.selection)

  if (!selection) {
    return <div className="panel-placeholder">Select a cell to open detail</div>
  }

  if (selection.type === 'day') return <DayDetail />
  if (selection.type === 'range') return <RangeDetail key={selection.rangeId} />
  if (selection.type === 'item') return <ItemDetail key={selection.itemId} />

  return <div className="panel-placeholder">Selection: {selection.type}</div>
}
