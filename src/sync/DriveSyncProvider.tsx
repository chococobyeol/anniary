import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useBoardStore } from '../store/board-store'
import {
  createSyncPayload,
  hashSyncPayload,
  normalizeImportedSettings,
  stableStringify,
  type SyncPayload,
} from '../utils/backup'
import { validateBackupPayload } from '../utils/backupValidation'
import {
  disconnectDrive,
  DriveApiError,
  getDriveSession,
  getDriveStatus,
  pullDriveBackup,
  pushDriveBackup,
  type DriveRemoteFile,
  type DriveUser,
} from './driveApi'
import { DriveSyncContext, type DriveSyncContextValue, type DriveSyncPhase } from './driveSyncContext'

const CONNECTED_HINT_KEY = 'anniary-drive-connected'
const SYNC_META_KEY = 'anniary-drive-sync-v1'
const AUTO_SYNC_KEY = 'anniary-drive-auto-sync'
const MAX_SYNC_BYTES = 4_800_000

type ConflictKind = 'remote-found' | 'both-changed'

type LocalSyncMeta = {
  userId: string
  fileId: string
  remoteVersion: string
  lastSyncedHash: string
  lastSyncedAt: string
}

function readMeta(): LocalSyncMeta | null {
  try {
    const raw = localStorage.getItem(SYNC_META_KEY)
    if (!raw) return null
    const value = JSON.parse(raw) as Partial<LocalSyncMeta>
    if (
      typeof value.userId !== 'string'
      || typeof value.fileId !== 'string'
      || typeof value.remoteVersion !== 'string'
      || typeof value.lastSyncedHash !== 'string'
      || typeof value.lastSyncedAt !== 'string'
    ) return null
    return value as LocalSyncMeta
  } catch {
    return null
  }
}

function writeMeta(meta: LocalSyncMeta): void {
  localStorage.setItem(SYNC_META_KEY, JSON.stringify(meta))
}

function clearConnectionStorage(): void {
  localStorage.removeItem(CONNECTED_HINT_KEY)
  localStorage.removeItem(SYNC_META_KEY)
}

function readAutoSync(): boolean {
  return localStorage.getItem(AUTO_SYNC_KEY) !== 'false'
}

function errorMessage(error: unknown): string {
  if (error instanceof DriveApiError && error.code === 'reconnect_required') {
    return 'Google Drive permission expired. Connect again to resume syncing.'
  }
  if (error instanceof Error) return error.message
  return String(error)
}

function downloadJson(payload: unknown, name: string): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const anchor = document.createElement('a')
  anchor.href = URL.createObjectURL(blob)
  anchor.download = name
  anchor.click()
  URL.revokeObjectURL(anchor.href)
}

export function DriveSyncProvider({ children }: { children: ReactNode }) {
  const hydrated = useBoardStore(state => state._hydrated)
  const activeBoardId = useBoardStore(state => state.activeBoardId)
  const [connected, setConnected] = useState(false)
  const [user, setUser] = useState<DriveUser | null>(null)
  const [phase, setPhase] = useState<DriveSyncPhase>('disconnected')
  const [message, setMessage] = useState<string | null>(null)
  const [conflict, setConflict] = useState<ConflictKind | null>(null)
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() => readMeta()?.lastSyncedAt ?? null)
  const [remoteFileLink, setRemoteFileLink] = useState<string | null>(null)
  const [autoSync, setAutoSyncState] = useState(readAutoSync)
  const busyRef = useRef(false)
  const initializedUserRef = useRef<string | null>(null)
  const userRef = useRef<DriveUser | null>(null)
  const remoteRef = useRef<DriveRemoteFile | null>(null)
  const phaseRef = useRef<DriveSyncPhase>('disconnected')

  useEffect(() => {
    userRef.current = user
  }, [user])

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  const saveSuccessfulSync = useCallback(async (
    syncUser: DriveUser,
    remote: DriveRemoteFile,
    payload?: SyncPayload,
  ) => {
    if (!remote.id || !remote.version) throw new Error('Google Drive did not return file metadata.')
    const finalPayload = payload ?? createSyncPayload(useBoardStore.getState())
    const hash = await hashSyncPayload(finalPayload)
    const syncedAt = new Date().toISOString()
    writeMeta({
      userId: syncUser.id,
      fileId: remote.id,
      remoteVersion: remote.version,
      lastSyncedHash: hash,
      lastSyncedAt: syncedAt,
    })
    remoteRef.current = remote
    setRemoteFileLink(remote.webViewLink ?? null)
    setLastSyncedAt(syncedAt)
    setConflict(null)
    setMessage(null)
    setPhase('synced')
  }, [])

  const pushLocal = useCallback(async (expectedVersion: string | null) => {
    const syncUser = userRef.current
    if (!syncUser) return
    const payload = createSyncPayload(useBoardStore.getState())
    const byteLength = new TextEncoder().encode(stableStringify(payload)).byteLength
    if (byteLength > MAX_SYNC_BYTES) {
      throw new Error('This backup is too large for cloud sync. Export JSON to keep a local copy.')
    }
    setPhase('syncing')
    setMessage('Uploading changes…')
    const result = await pushDriveBackup(payload, expectedVersion)
    await saveSuccessfulSync(syncUser, result.remote, payload)
  }, [saveSuccessfulSync])

  const pullRemote = useCallback(async () => {
    const syncUser = userRef.current
    if (!syncUser) return
    setPhase('syncing')
    setMessage('Restoring from Google Drive…')
    const result = await pullDriveBackup()
    const data = validateBackupPayload(result.payload)
    const current = useBoardStore.getState()
    const selectedBoard = data.activeBoardId ? data.boards[data.activeBoardId] : undefined
    const settings = normalizeImportedSettings(
      data.settings,
      current.settings,
      assetId => Boolean(selectedBoard?.assets[assetId]),
    )
    current.importBoardsAndSettings(data.boards, data.activeBoardId, settings)
    await saveSuccessfulSync(syncUser, result.remote)
  }, [saveSuccessfulSync])

  const reconcile = useCallback(async (manual: boolean) => {
    if (busyRef.current || !userRef.current || !useBoardStore.getState()._hydrated) return
    busyRef.current = true
    setMessage(null)
    if (phaseRef.current !== 'conflict') setPhase('checking')
    try {
      const status = await getDriveStatus()
      setUser(status.user)
      userRef.current = status.user
      remoteRef.current = status.remote
      setRemoteFileLink(status.remote.webViewLink ?? null)

      const payload = createSyncPayload(useBoardStore.getState())
      const localHash = await hashSyncPayload(payload)
      const meta = readMeta()

      if (!status.remote.exists || !status.remote.id || !status.remote.version) {
        await pushLocal(null)
        return
      }

      if (!meta || meta.userId !== status.user.id || meta.fileId !== status.remote.id) {
        setConflict('remote-found')
        setPhase('conflict')
        setMessage('A backup already exists in Google Drive. Choose which copy to keep.')
        return
      }

      const localChanged = localHash !== meta.lastSyncedHash
      const remoteChanged = status.remote.version !== meta.remoteVersion

      if (localChanged && remoteChanged) {
        setConflict('both-changed')
        setPhase('conflict')
        setMessage('This device and Google Drive both changed since the last sync.')
        return
      }
      if (remoteChanged) {
        await pullRemote()
        return
      }
      if (localChanged) {
        if (manual || readAutoSync()) {
          await pushLocal(status.remote.version)
        } else {
          setPhase('changes')
          setMessage('Changes are saved on this device but not yet in Google Drive.')
        }
        return
      }

      remoteRef.current = status.remote
      setLastSyncedAt(meta.lastSyncedAt)
      setConflict(null)
      setPhase('synced')
    } catch (error) {
      if (error instanceof DriveApiError && error.status === 409) {
        setConflict('both-changed')
        setPhase('conflict')
        setMessage('Google Drive changed while syncing. Choose which copy to keep.')
      } else {
        if (error instanceof DriveApiError && error.code === 'reconnect_required') {
          clearConnectionStorage()
          setConnected(false)
          setUser(null)
          userRef.current = null
        }
        setPhase('error')
        setMessage(errorMessage(error))
      }
    } finally {
      busyRef.current = false
    }
  }, [pullRemote, pushLocal])

  useEffect(() => {
    const url = new URL(window.location.href)
    const driveResult = url.searchParams.get('drive')
    if (driveResult === 'connected') {
      localStorage.setItem(CONNECTED_HINT_KEY, 'true')
    } else if (driveResult === 'denied') {
      setPhase('error')
      setMessage('Google Drive connection was cancelled.')
    } else if (driveResult === 'error') {
      setPhase('error')
      setMessage('Google Drive could not be connected. Please try again.')
    }
    if (driveResult) {
      url.searchParams.delete('drive')
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
    }

    const shouldCheck = driveResult === 'connected' || localStorage.getItem(CONNECTED_HINT_KEY) === 'true'
    if (!shouldCheck) return
    setPhase('checking')
    void getDriveSession()
      .then(session => {
        if (!session.connected || !session.user) {
          clearConnectionStorage()
          setConnected(false)
          setUser(null)
          setPhase('disconnected')
          return
        }
        setConnected(true)
        setUser(session.user)
        userRef.current = session.user
      })
      .catch(error => {
        setPhase('error')
        setMessage(errorMessage(error))
      })
  }, [])

  useEffect(() => {
    if (!connected || !user || !hydrated || !activeBoardId) return
    if (initializedUserRef.current === user.id) return
    initializedUserRef.current = user.id
    void reconcile(false)
  }, [activeBoardId, connected, hydrated, reconcile, user])

  useEffect(() => {
    if (!connected || !autoSync) return
    let timer: number | null = null
    const unsubscribe = useBoardStore.subscribe((state, previous) => {
      if (
        state.boards === previous.boards
        && state.activeBoardId === previous.activeBoardId
        && state.settings === previous.settings
      ) return
      if (phaseRef.current === 'conflict' || phaseRef.current === 'syncing') return
      setPhase('changes')
      setMessage('Waiting to sync changes…')
      if (timer !== null) window.clearTimeout(timer)
      timer = window.setTimeout(() => void reconcile(false), 3000)
    })
    return () => {
      unsubscribe()
      if (timer !== null) window.clearTimeout(timer)
    }
  }, [autoSync, connected, reconcile])

  useEffect(() => {
    if (!connected) return
    const resume = () => {
      if (document.visibilityState === 'visible' && phaseRef.current !== 'conflict') {
        void reconcile(false)
      }
    }
    window.addEventListener('online', resume)
    document.addEventListener('visibilitychange', resume)
    return () => {
      window.removeEventListener('online', resume)
      document.removeEventListener('visibilitychange', resume)
    }
  }, [connected, reconcile])

  const connect = useCallback(() => {
    window.location.assign('/api/auth/google')
  }, [])

  const disconnect = useCallback(async () => {
    setPhase('checking')
    try {
      await disconnectDrive()
    } catch (error) {
      setPhase('error')
      setMessage(errorMessage(error))
      return
    }
    clearConnectionStorage()
    initializedUserRef.current = null
    userRef.current = null
    remoteRef.current = null
    setConnected(false)
    setUser(null)
    setConflict(null)
    setLastSyncedAt(null)
    setRemoteFileLink(null)
    setMessage(null)
    setPhase('disconnected')
  }, [])

  const syncNow = useCallback(async () => {
    await reconcile(true)
  }, [reconcile])

  const useDriveCopy = useCallback(async () => {
    if (busyRef.current) return
    busyRef.current = true
    try {
      await pullRemote()
    } catch (error) {
      setPhase('error')
      setMessage(errorMessage(error))
    } finally {
      busyRef.current = false
    }
  }, [pullRemote])

  const useThisDevice = useCallback(async () => {
    if (busyRef.current) return
    busyRef.current = true
    try {
      await pushLocal(remoteRef.current?.version ?? null)
    } catch (error) {
      setPhase(error instanceof DriveApiError && error.status === 409 ? 'conflict' : 'error')
      setMessage(errorMessage(error))
    } finally {
      busyRef.current = false
    }
  }, [pushLocal])

  const downloadDriveCopy = useCallback(async () => {
    try {
      const result = await pullDriveBackup()
      const stamp = new Date().toISOString().replaceAll(':', '-').replace(/\.\d{3}Z$/, 'Z')
      downloadJson(result.payload, `anniary-drive-backup-${stamp}.json`)
    } catch (error) {
      setPhase('error')
      setMessage(errorMessage(error))
    }
  }, [])

  const setAutoSync = useCallback((enabled: boolean) => {
    localStorage.setItem(AUTO_SYNC_KEY, String(enabled))
    setAutoSyncState(enabled)
    if (enabled && connected && phaseRef.current === 'changes') void reconcile(false)
  }, [connected, reconcile])

  const value = useMemo<DriveSyncContextValue>(() => ({
    connected,
    accountEmail: user?.email ?? null,
    phase,
    message,
    conflict,
    lastSyncedAt,
    remoteFileLink,
    autoSync,
    connect,
    disconnect,
    syncNow,
    useDriveCopy,
    useThisDevice,
    downloadDriveCopy,
    setAutoSync,
  }), [
    user, autoSync, conflict, connect, connected, disconnect,
    downloadDriveCopy, lastSyncedAt, message, phase, remoteFileLink, setAutoSync,
    syncNow, useDriveCopy, useThisDevice,
  ])

  return <DriveSyncContext.Provider value={value}>{children}</DriveSyncContext.Provider>
}
