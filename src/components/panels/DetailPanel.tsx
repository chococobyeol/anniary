import { useBoardStore } from '../../store/board-store'
import { parseDateKey } from '../../utils/date'

export function DetailPanel() {
  const selection = useBoardStore(s => s.selection)
  const items = useBoardStore(s => {
    if (!s.activeBoardId) return {}
    return s.boards[s.activeBoardId]?.items || {}
  })

  if (!selection) {
    return <div className="panel-placeholder">Select a cell or item to see details</div>
  }

  if (selection.type === 'day') {
    const { year, month, day } = parseDateKey(selection.dateKey)
    const dayItems = Object.values(items).filter(it => it.date === selection.dateKey)

    return (
      <div style={{ padding: 8 }}>
        <h3 style={{ fontSize: 14, marginBottom: 8 }}>
          {year}-{String(month + 1).padStart(2, '0')}-{String(day).padStart(2, '0')}
        </h3>
        {dayItems.length === 0 && (
          <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>No items for this day</div>
        )}
        {dayItems.map(it => (
          <div key={it.id} style={{ padding: '4px 0', fontSize: 12, borderBottom: '1px solid var(--border-light)' }}>
            <div><strong>{it.title || '(untitled)'}</strong></div>
            <div style={{ color: 'var(--text-muted)' }}>{it.kind} · {it.status}</div>
          </div>
        ))}
      </div>
    )
  }

  return <div className="panel-placeholder">Selection type: {selection.type}</div>
}
