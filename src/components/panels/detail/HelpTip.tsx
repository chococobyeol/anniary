import { useState } from 'react'
import { IconInfo } from '../../icons/Icons'

export function HelpTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  return (
    <span className="detail-help-tip-wrap">
      <button
        type="button"
        className="detail-help-tip"
        aria-label={text}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        <IconInfo size={14} />
      </button>
      {open ? (
        <span className="detail-help-tooltip" aria-hidden>
          {text}
        </span>
      ) : null}
    </span>
  )
}
