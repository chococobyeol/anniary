import { useMemo, useState } from 'react'
import { useBoardStore } from '../../store/board-store'
import type { OverlayEntity } from '../../types/entities'
import { IconTrash } from '../icons/Icons'
import './OverlaysPanel.css'

function overlayLabel(o: OverlayEntity): string {
  if (o.text) return o.text.slice(0, 32) + (o.text.length > 32 ? '…' : '')
  if (o.pathD) return o.drawTool === 'highlighter' ? 'Highlighter stroke' : 'Pen stroke'
  if (o.drawTool === 'rect') return 'Rectangle'
  if (o.drawTool === 'ellipse') return 'Ellipse'
  return o.type
}

export function OverlaysPanel() {
  const activeBoardId = useBoardStore(s => s.activeBoardId)
  const overlays = useBoardStore(s => {
    const id = s.activeBoardId
    if (!id) return {} as Record<string, OverlayEntity>
    return s.boards[id]?.overlays ?? {}
  })
  const selection = useBoardStore(s => s.selection)
  const setSelection = useBoardStore(s => s.setSelection)
  const updateOverlay = useBoardStore(s => s.updateOverlay)
  const deleteOverlay = useBoardStore(s => s.deleteOverlay)
  const items = useBoardStore(s =>
    s.activeBoardId ? s.boards[s.activeBoardId]?.items ?? {} : {}
  )

  const list = useMemo(
    () => Object.values(overlays).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [overlays]
  )

  const [editId, setEditId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  const selectedId = selection?.type === 'overlay' ? selection.overlayId : null

  const startEdit = (o: OverlayEntity) => {
    if (o.type !== 'text' && o.type !== 'sticker') return
    setEditId(o.id)
    setEditText(o.text ?? '')
  }

  const applyEdit = () => {
    if (!editId) return
    updateOverlay(editId, { text: editText })
    setEditId(null)
  }

  return (
    <div className="overlays-panel">
      <p className="overlays-panel-intro">
        Draw / Place creates overlays here. Select mode: drag on board. Toggle eye to hide.
      </p>
      {!activeBoardId && <p className="overlays-panel-empty">No board.</p>}
      {list.length === 0 && activeBoardId && (
        <p className="overlays-panel-empty">No overlays yet. Use Draw or Place on the toolbar.</p>
      )}
      <ul className="overlays-panel-list">
        {list.map(o => (
          <li
            key={o.id}
            className={`overlays-panel-row ${selectedId === o.id ? 'selected' : ''}`}
          >
            <button
              type="button"
              className="overlays-panel-select"
              onClick={() => setSelection({ type: 'overlay', overlayId: o.id })}
            >
              <span className="overlays-panel-type">
                {o.type}{o.drawTool ? ` · ${o.drawTool}` : ''}
                {o.linkedItemId && items[o.linkedItemId] ? ' · 🔗' : ''}
              </span>
              <span className="overlays-panel-label">{overlayLabel(o)}</span>
            </button>
            <button
              type="button"
              className={`overlays-panel-eye ${o.visible === false ? 'off' : ''}`}
              title={o.visible === false ? 'Show' : 'Hide'}
              onClick={() => updateOverlay(o.id, { visible: o.visible === false ? true : false })}
            >
              {o.visible === false ? '○' : '●'}
            </button>
            {(o.type === 'text' || o.type === 'sticker') && (
              <button type="button" className="overlays-panel-mini" onClick={() => startEdit(o)}>
                Edit
              </button>
            )}
            <button
              type="button"
              className="overlays-panel-trash"
              title="Delete"
              onClick={() => {
                deleteOverlay(o.id)
                if (selectedId === o.id) setSelection(null)
              }}
            >
              <IconTrash size={12} />
            </button>
            {editId === o.id && (
              <div className="overlays-panel-edit">
                <input
                  className="overlays-panel-input"
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.nativeEvent.isComposing) applyEdit()
                    if (e.key === 'Escape') setEditId(null)
                  }}
                  autoFocus
                />
                <button type="button" className="overlays-panel-mini primary" onClick={applyEdit}>
                  OK
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
