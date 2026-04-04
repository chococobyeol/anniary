/** 백로그 일정 → 보드 오버레이 드래그앤드롭 시 `dataTransfer` 타입 */
export const ANNIARY_BACKLOG_ITEM_MIME = 'application/x-anniary-item-id'

/** dragover / dragenter 에서 커스텀 타입 인식(브라우저마다 대소문자 차이 있음) */
export function dataTransferHasBacklogItem(dt: DataTransfer): boolean {
  const types = Array.from(dt.types).map(t => t.toLowerCase())
  return types.includes(ANNIARY_BACKLOG_ITEM_MIME.toLowerCase()) || types.includes('text/plain')
}
