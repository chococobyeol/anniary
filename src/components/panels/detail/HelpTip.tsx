import { useState, useRef, useLayoutEffect, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { IconInfo } from '../../icons/Icons'

const M = 8
const GAP = 6

function clampTooltipPosition(
  anchor: DOMRectReadOnly,
  tip: DOMRectReadOnly
): { top: number; left: number } {
  const vw = window.innerWidth
  const vh = window.innerHeight

  let left = anchor.left + anchor.width / 2 - tip.width / 2
  if (tip.width + 2 * M <= vw) {
    left = Math.max(M, Math.min(left, vw - tip.width - M))
  } else {
    left = M
  }

  let top = anchor.bottom + GAP
  if (top + tip.height > vh - M) {
    top = anchor.top - tip.height - GAP
  }
  if (top + tip.height > vh - M) {
    top = vh - tip.height - M
  }
  top = Math.max(M, top)

  return { top, left }
}

export function HelpTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const anchorRef = useRef<HTMLButtonElement>(null)
  const tipRef = useRef<HTMLSpanElement>(null)

  const close = useCallback(() => {
    setOpen(false)
    setPos(null)
  }, [])

  const reposition = useCallback(() => {
    const btn = anchorRef.current
    const tip = tipRef.current
    if (!btn || !tip) return
    setPos(clampTooltipPosition(btn.getBoundingClientRect(), tip.getBoundingClientRect()))
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    reposition()
  }, [open, text, reposition])

  useEffect(() => {
    if (!open) return
    reposition()
    const onMove = () => reposition()
    window.addEventListener('scroll', onMove, true)
    window.addEventListener('resize', onMove)
    return () => {
      window.removeEventListener('scroll', onMove, true)
      window.removeEventListener('resize', onMove)
    }
  }, [open, reposition])

  return (
    <span className="detail-help-tip-wrap">
      <button
        ref={anchorRef}
        type="button"
        className="detail-help-tip"
        aria-label={text}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={close}
        onFocus={() => setOpen(true)}
        onBlur={close}
      >
        <IconInfo size={14} />
      </button>
      {open &&
        createPortal(
          <span
            ref={tipRef}
            className="detail-help-tooltip--portal"
            style={
              pos
                ? { top: pos.top, left: pos.left }
                : { top: 0, left: 0, visibility: 'hidden' as const }
            }
            aria-hidden
          >
            {text}
          </span>,
          document.body
        )}
    </span>
  )
}
