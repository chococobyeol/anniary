import DOMPurify from 'dompurify'
import { marked } from 'marked'

marked.use({ gfm: true, breaks: true })

/** DOMPurify로 정제한 마크다운 HTML (`dangerouslySetInnerHTML` 용) */
export function markdownToHtml(md: string): string {
  const raw = marked(md, { async: false }) as string
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
