import { useDriveSync } from '../../sync/driveSyncContext'

function formatSyncTime(value: string | null): string {
  if (!value) return 'Not synced yet'
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function statusLabel(phase: ReturnType<typeof useDriveSync>['phase']): string {
  switch (phase) {
    case 'checking': return 'Checking…'
    case 'syncing': return 'Syncing…'
    case 'synced': return 'Synced'
    case 'changes': return 'Changes not synced'
    case 'conflict': return 'Needs your choice'
    case 'error': return 'Sync unavailable'
    default: return 'Not connected'
  }
}

export function GoogleDriveSyncSettings() {
  const sync = useDriveSync()

  return (
    <div className="settings-section settings-sync-section">
      <div className="settings-section-title">Google Drive</div>
      {!sync.connected ? (
        <>
          <p className="settings-hint-block">
            Optional. Keep using Anniary locally, or connect Drive to sync a visible JSON backup.
          </p>
          {sync.message && <p className="settings-sync-message settings-sync-message--error">{sync.message}</p>}
          <div className="settings-row">
            <div className="settings-label-col">
              <span className="settings-label">Cloud backup</span>
              <span className="settings-hint-sub">No sign-in required to use the app</span>
            </div>
            <div className="settings-control">
              <button
                type="button"
                className="settings-btn"
                disabled={sync.phase === 'checking'}
                onClick={sync.connect}
              >
                {sync.phase === 'checking' ? 'Checking…' : 'Connect Drive'}
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="settings-row">
            <div className="settings-label-col">
              <span className="settings-label">{statusLabel(sync.phase)}</span>
              <span className="settings-hint-sub">
                {sync.accountEmail} · {formatSyncTime(sync.lastSyncedAt)}
              </span>
            </div>
            <div className="settings-control">
              <button
                type="button"
                className="settings-btn"
                disabled={sync.phase === 'checking' || sync.phase === 'syncing' || sync.phase === 'conflict'}
                onClick={() => void sync.syncNow()}
              >
                Sync now
              </button>
            </div>
          </div>

          <div className="settings-row">
            <div className="settings-label-col">
              <span className="settings-label">Auto sync</span>
              <span className="settings-hint-sub">After local changes</span>
            </div>
            <div className="settings-control settings-control--toggle">
              <span className="settings-hint-inline">{sync.autoSync ? 'On' : 'Off'}</span>
              <button
                type="button"
                className={`settings-toggle ${sync.autoSync ? 'active' : ''}`}
                onClick={() => sync.setAutoSync(!sync.autoSync)}
                role="switch"
                aria-checked={sync.autoSync}
              >
                <span className="settings-toggle-thumb" />
              </button>
            </div>
          </div>

          {sync.message && (
            <p className={`settings-sync-message ${sync.phase === 'error' ? 'settings-sync-message--error' : ''}`}>
              {sync.message}
            </p>
          )}

          {sync.conflict && (
            <div className="settings-sync-conflict" role="alert">
              <p>Download a copy first if you are unsure. Choosing a version replaces the other one.</p>
              <div className="settings-sync-conflict-actions">
                <button type="button" className="settings-btn" onClick={() => void sync.downloadDriveCopy()}>
                  Download Drive copy
                </button>
                <button type="button" className="settings-btn" onClick={() => void sync.useDriveCopy()}>
                  Use Drive
                </button>
                <button type="button" className="settings-btn" onClick={() => void sync.useThisDevice()}>
                  Use this device
                </button>
              </div>
            </div>
          )}

          <div className="settings-sync-links">
            {sync.remoteFileLink && (
              <a href={sync.remoteFileLink} target="_blank" rel="noreferrer">Open backup in Drive</a>
            )}
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Disconnect Google Drive on all devices? Your local data and Drive backup will remain.')) {
                  void sync.disconnect()
                }
              }}
            >
              Disconnect
            </button>
          </div>
        </>
      )}
    </div>
  )
}
