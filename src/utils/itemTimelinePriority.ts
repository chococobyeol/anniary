import type { ItemEntity, RangeEntity } from '../types/entities'
import type { RangeEditPreview } from '../types/state'

/**
 * Effective timeline priority for an item (from its linked range).
 * Used for gantt track order and day-cell line order.
 */
export function linkedRangeTimelinePriority(
  item: ItemEntity,
  ranges: Record<string, RangeEntity>,
  preview: RangeEditPreview | null
): number {
  const rid = item.rangeId
  if (!rid) return 0
  const r = ranges[rid]
  if (!r) return 0
  if (preview?.rangeId === rid && preview.timelinePriority !== undefined) {
    return preview.timelinePriority
  }
  return r.timelinePriority ?? 0
}
