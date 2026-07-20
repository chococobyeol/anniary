export function proportionalResizeDelta(
  originalWidth: number,
  originalHeight: number,
  deltaWidth: number,
  deltaHeight: number,
  minWidth: number,
  minHeight: number,
): { dw: number; dh: number } {
  const scaleX = (originalWidth + deltaWidth) / originalWidth
  const scaleY = (originalHeight + deltaHeight) / originalHeight
  const scale = Math.max(
    minWidth / originalWidth,
    minHeight / originalHeight,
    Math.abs(scaleX - 1) >= Math.abs(scaleY - 1) ? scaleX : scaleY,
  )
  return {
    dw: originalWidth * scale - originalWidth,
    dh: originalHeight * scale - originalHeight,
  }
}
