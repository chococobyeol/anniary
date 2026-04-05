/** 프레임 면적 변화에 맞춰 글자 크기를 √비율로 스케일 */
export function textBoxAreaScale(ow: number, oh: number, rw: number, rh: number): number {
  const a0 = Math.max(ow * oh, 1e-6)
  const a1 = Math.max(rw * rh, 1e-6)
  return Math.sqrt(a1 / a0)
}

export function scaledTextBoxFontPx(
  fontPx: number,
  ow: number,
  oh: number,
  rw: number,
  rh: number
): number {
  return Math.max(6, Math.round(fontPx * textBoxAreaScale(ow, oh, rw, rh) * 100) / 100)
}
