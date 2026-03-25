import { useEffect } from 'react'
import { useBoardStore } from './store/board-store'
import { TopToolbar } from './components/toolbar/TopToolbar'
import { LeftIconBar } from './components/panels/LeftIconBar'
import { LeftPanel } from './components/panels/LeftPanel'
import { RightPanel } from './components/panels/RightPanel'
import { YearBoard } from './components/board/YearBoard'
import './App.css'

export default function App() {
  const activeBoardId = useBoardStore(s => s.activeBoardId)
  const createBoard = useBoardStore(s => s.createBoard)
  const closeAllPanels = useBoardStore(s => s.closeAllPanels)
  const selection = useBoardStore(s => s.selection)
  const setSelection = useBoardStore(s => s.setSelection)
  const undo = useBoardStore(s => s.undo)
  const redo = useBoardStore(s => s.redo)
  const deleteOverlay = useBoardStore(s => s.deleteOverlay)

  const hydrated = useBoardStore(s => s._hydrated)

  useEffect(() => {
    if (hydrated && !activeBoardId) {
      createBoard(new Date().getFullYear())
    }
  }, [hydrated, activeBoardId, createBoard])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = e.target
      const typing =
        tag instanceof HTMLInputElement
        || tag instanceof HTMLTextAreaElement
        || (tag instanceof HTMLElement && tag.isContentEditable)

      if (e.key === 'Escape') {
        if (typing) return
        if (selection) {
          setSelection(null)
        } else {
          closeAllPanels()
        }
        return
      }

      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'z') {
        if (typing) return
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
        return
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (typing) return
        if (selection?.type === 'overlay') {
          e.preventDefault()
          deleteOverlay(selection.overlayId)
          setSelection(null)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selection, setSelection, closeAllPanels, undo, redo, deleteOverlay])

  return (
    <div className="app-layout">
      <TopToolbar />
      <LeftIconBar />
      <LeftPanel />
      <div className="app-board-area">
        <YearBoard />
      </div>
      <RightPanel />
    </div>
  )
}
