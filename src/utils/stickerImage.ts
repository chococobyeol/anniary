const ALLOWED_STICKER_IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
])

const MAX_SOURCE_BYTES = 8 * 1024 * 1024
const MAX_STORED_SOURCE_BYTES = 450 * 1024
const MAX_DIMENSION = 640

export type PreparedStickerImage = {
  dataUrl: string
  mimeType: string
  width: number
  height: number
  name: string
}

function readFileAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read the image file.'))
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.readAsDataURL(file)
  })
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('The selected file is not a readable image.'))
    }
    image.src = url
  })
}

export async function prepareStickerImage(file: File): Promise<PreparedStickerImage> {
  if (!ALLOWED_STICKER_IMAGE_TYPES.has(file.type)) {
    throw new Error('Use a PNG, JPEG, or WebP image.')
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error('Image files must be 8 MB or smaller.')
  }

  const image = await loadImage(file)
  const naturalWidth = image.naturalWidth
  const naturalHeight = image.naturalHeight
  if (!naturalWidth || !naturalHeight) throw new Error('The image has no usable dimensions.')

  if (
    file.size <= MAX_STORED_SOURCE_BYTES
    && naturalWidth <= MAX_DIMENSION
    && naturalHeight <= MAX_DIMENSION
  ) {
    return {
      dataUrl: await readFileAsDataUrl(file),
      mimeType: file.type,
      width: naturalWidth,
      height: naturalHeight,
      name: file.name,
    }
  }

  const ratio = Math.min(1, MAX_DIMENSION / Math.max(naturalWidth, naturalHeight))
  const width = Math.max(1, Math.round(naturalWidth * ratio))
  const height = Math.max(1, Math.round(naturalHeight * ratio))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('This browser cannot prepare the sticker image.')
  context.drawImage(image, 0, 0, width, height)
  const dataUrl = canvas.toDataURL('image/webp', 0.9)
  const mimeType = dataUrl.startsWith('data:image/webp') ? 'image/webp' : 'image/png'
  return { dataUrl, mimeType, width, height, name: file.name }
}
