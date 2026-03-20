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

  useEffect(() => {
    if (!activeBoardId) {
      createBoard(new Date().getFullYear())
    }
  }, [activeBoardId, createBoard])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (selection) {
        setSelection(null)
      } else {
        closeAllPanels()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selection, setSelection, closeAllPanels])

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
