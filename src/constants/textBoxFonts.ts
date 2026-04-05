import type { TextBoxFontKey } from '../types/entities'

export const TEXTBOX_FONT_OPTIONS: { key: TextBoxFontKey; label: string }[] = [
  { key: 'sans', label: 'Sans' },
  { key: 'serif', label: 'Serif' },
  { key: 'mono', label: 'Mono' },
  { key: 'rounded', label: 'Rounded' },
]

export function textBoxFontStack(key: TextBoxFontKey | undefined): string {
  switch (key) {
    case 'serif':
      return 'Georgia, "Times New Roman", Times, serif'
    case 'mono':
      return 'ui-monospace, "Cascadia Code", Menlo, Consolas, monospace'
    case 'rounded':
      return 'system-ui, "Segoe UI", "SF Pro Rounded", sans-serif'
    default:
      return 'var(--font-family, system-ui, -apple-system, sans-serif)'
  }
}
