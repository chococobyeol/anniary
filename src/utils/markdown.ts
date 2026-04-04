import DOMPurify from 'dompurify'
import { marked } from 'marked'

marked.use({ gfm: true, breaks: true })

/**
 * GFM은 `\n\n` 이상 연속 줄바꿈을 문단 하나로만 취급해 빈 줄이 사라짐.
 * 3개 이상 연속 `\n`마다 `<br>`를 끼워 미리보기·렌더에서 세로 공간이 맞게 보이게 함.
 */
function expandExtraBlankLines(md: string): string {
  const norm = md.replace(/\r\n/g, '\n')
  return norm.replace(/\n{3,}/g, m => '\n\n' + '<br>\n'.repeat(m.length - 2) + '\n')
}

/** DOMPurify로 정제한 마크다운 HTML (`dangerouslySetInnerHTML` 용) */
export function markdownToHtml(md: string): string {
  const raw = marked(expandExtraBlankLines(md), { async: false }) as string
  return DOMPurify.sanitize(raw)
}

/** 보드 SVG 등 — 블록 구조를 반영한 평문(줄바꿈 유지) */
export function markdownToPlainText(md: string): string {
  if (!md.trim()) return ''
  const html = markdownToHtml(md)
  const el = document.createElement('div')
  el.innerHTML = html
  return (el.innerText ?? '').replace(/\r\n/g, '\n').trimEnd()
}
