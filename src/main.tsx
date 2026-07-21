import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { DriveSyncProvider } from './sync/DriveSyncProvider'
import './theme/global.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DriveSyncProvider>
      <App />
    </DriveSyncProvider>
  </StrictMode>,
)
