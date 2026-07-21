import type { SyncPayload } from '../utils/backup'

export type DriveUser = {
  id: string
  email: string
}

export type DriveRemoteFile = {
  exists: boolean
  id?: string
  name?: string
  version?: string
  modifiedTime?: string
  webViewLink?: string
}

export class DriveApiError extends Error {
  status: number
  code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'DriveApiError'
    this.status = status
    this.code = code
  }
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: 'same-origin',
    cache: 'no-store',
    ...init,
    headers: {
      Accept: 'application/json',
      ...init?.headers,
    },
  })
  const body = await response.json().catch(() => null) as {
    error?: string
    code?: string
  } | null
  if (!response.ok) {
    throw new DriveApiError(
      body?.error || `Google Drive request failed (${response.status})`,
      response.status,
      body?.code,
    )
  }
  return body as T
}

export function getDriveSession(): Promise<{
  connected: boolean
  user?: DriveUser
}> {
  return apiRequest('/api/auth/session')
}

export function getDriveStatus(): Promise<{
  user: DriveUser
  remote: DriveRemoteFile
}> {
  return apiRequest('/api/sync/status')
}

export function pullDriveBackup(): Promise<{
  payload: SyncPayload
  remote: DriveRemoteFile
}> {
  return apiRequest('/api/sync/pull')
}

export function pushDriveBackup(
  payload: SyncPayload,
  expectedVersion: string | null,
): Promise<{ remote: DriveRemoteFile }> {
  return apiRequest('/api/sync/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload, expectedVersion }),
  })
}

export function disconnectDrive(): Promise<{ disconnected: true }> {
  return apiRequest('/api/auth/disconnect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  })
}
