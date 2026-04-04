import { useMemo } from 'react'
import { markdownToHtml } from '../../utils/markdown'
import './markdown-view.css'

type Props = {
  source: string
  className?: string
}

export function MarkdownView({ source, className }: Props) {
  const html = useMemo(() => {
    if (source === '') return ''
    return markdownToHtml(source)
  }, [source])
  if (!html) return null
  return (
    <div
      className={className ? `markdown-view ${className}` : 'markdown-view'}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
