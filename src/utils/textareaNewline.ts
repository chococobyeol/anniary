/** Controlled textarea: 커서 위치에 \\n 삽입 후 포커스·선택 유지 */
export function insertNewlineAtCursor(
  el: HTMLTextAreaElement | null,
  setValue: (updater: (prev: string) => string) => void
): void {
  if (!el) return
  const start = el.selectionStart
  const end = el.selectionEnd
  setValue(prev => prev.slice(0, start) + '\n' + prev.slice(end))
  const pos = start + 1
  requestAnimationFrame(() => {
    el.focus()
    el.setSelectionRange(pos, pos)
  })
}
