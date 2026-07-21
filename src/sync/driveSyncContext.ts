import { createContext, useContext } from 'react'

export type DriveSyncPhase =
  | 'disconnected'
  | 'checking'
  | 'synced'
  | 'changes'
  | 'syncing'
  | 'conflict'
  | 'error'

export type DriveSyncContextValue = {
  connected: boolean
  accountEmail: string | null
  phase: DriveSyncPhase
  message: string | null
  conflict: 'remote-found' | 'both-changed' | null
  lastSyncedAt: string | null
  remoteFileLink: string | null
  autoSync: boolean
  connect: () => void
  disconnect: () => Promise<void>
  syncNow: () => Promise<void>
  useDriveCopy: () => Promise<void>
  useThisDevice: () => Promise<void>
  downloadDriveCopy: () => Promise<void>
  setAutoSync: (enabled: boolean) => void
}

export const DriveSyncContext = createContext<DriveSyncContextValue | null>(null)

export function useDriveSync(): DriveSyncContextValue {
  const value = useContext(DriveSyncContext)
  if (!value) throw new Error('useDriveSync must be used inside DriveSyncProvider')
  return value
}
