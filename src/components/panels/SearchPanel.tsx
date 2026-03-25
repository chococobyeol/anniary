import { useMemo, useState } from 'react'
import { useBoardStore } from '../../store/board-store'
import './SearchPanel.css'

type Hit =
  | { kind: 'item'; id: string; title: string; snippet: string }
  | { kind: 'range'; id: string; title: string; snippet: string }

function norm(s: string | undefined): string {
  return (s ?? '').toLowerCase()
}

export function SearchPanel() {
  const activeBoardId = useBoardStore(s => s.activeBoardId)
  const boardState = useBoardStore(s => (s.activeBoardId ? s.boards[s.activeBoardId] : null))
  const setSelection = useBoardStore(s => s.setSelection)
  const toggleLeftPanel = useBoardStore(s => s.toggleLeftPanel)

  const [q, setQ] = useState('')

  const hits = useMemo((): Hit[] => {
    const needle = q.trim().toLowerCase()
    if (!needle || !boardState) return []
    const out: Hit[] = []
    for (const it of Object.values(boardState.items)) {
      const t = norm(it.title)
      const b = norm(it.body)
      if (t.includes(needle) || b.includes(needle)) {
        const title = it.title?.trim() || '(untitled)'
        const snippet = (it.body || '').replace(/\s+/g, ' ').slice(0, 80)
        out.push({ kind: 'item', id: it.id, title, snippet })
      }
    }
    for (const r of Object.values(boardState.ranges)) {
      const l = norm(r.label)
      const body = norm(r.body)
      if (l.includes(needle) || body.includes(needle)) {
        const title = r.label?.trim() || '(range)'
        const snippet = (r.body || '').replace(/\s+/g, ' ').slice(0, 80)
        out.push({ kind: 'range', id: r.id, title, snippet })
      }
    }
    return out.slice(0, 80)
  }, [boardState, q])

  const openHit = (h: Hit) => {
    if (h.kind === 'item') {
      setSelection({ type: 'item', itemId: h.id })
      toggleLeftPanel('detail')
    } else {
      setSelection({ type: 'range', rangeId: h.id })
      toggleLeftPanel('detail')
    }
  }

  return (
    <div className="search-panel">
      <p className="search-panel-intro">Search item titles, notes, and range labels on this board.</p>
      <input
        type="search"
        className="search-panel-input"
        placeholder="Search…"
        value={q}
        onChange={e => setQ(e.target.value)}
        autoFocus
      />
      {!activeBoardId && <p className="search-panel-empty">No board.</p>}
      {activeBoardId && q.trim() && hits.length === 0 && (
        <p className="search-panel-empty">No matches.</p>
      )}
      <ul className="search-panel-list">
        {hits.map(h => (
          <li key={`${h.kind}-${h.id}`}>
            <button type="button" className="search-panel-hit" onClick={() => openHit(h)}>
              <span className="search-panel-hit-kind">{h.kind}</span>
              <span className="search-panel-hit-title">{h.title}</span>
              {h.snippet ? <span className="search-panel-hit-snippet">{h.snippet}</span> : null}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
