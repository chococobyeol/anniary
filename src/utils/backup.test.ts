import { describe, expect, it } from 'vitest'
import { hashSyncPayload, stableStringify, type SyncPayload } from './backup'

describe('sync backup helpers', () => {
  it('serializes object keys in a stable order and omits undefined values', () => {
    expect(stableStringify({ z: 1, nested: { b: 2, a: 1 }, ignored: undefined }))
      .toBe('{"nested":{"a":1,"b":2},"z":1}')
  })

  it('produces the same hash for equivalent payloads with different key order', async () => {
    const first = {
      anniaryExportVersion: 2,
      boards: {},
      activeBoardId: null,
      settings: { dayLayout: 'linear', zoomInverted: false },
    } as unknown as SyncPayload
    const second = {
      settings: { zoomInverted: false, dayLayout: 'linear' },
      activeBoardId: null,
      boards: {},
      anniaryExportVersion: 2,
    } as unknown as SyncPayload

    await expect(hashSyncPayload(first)).resolves.toBe(await hashSyncPayload(second))
  })
})
