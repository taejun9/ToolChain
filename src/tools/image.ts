import { ToolError } from '../core/errors.ts'

export async function verifyImage(file: Blob) {
  const bytes = new Uint8Array(await file.slice(0, 32).arrayBuffer())
  const ascii = (from: number, to: number) =>
    String.fromCharCode(...bytes.slice(from, to))
  const valid = {
    'image/png': bytes[0] === 137 && ascii(1, 8) === 'PNG\r\n\x1a\n',
    'image/jpeg': bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255,
    'image/gif': ['GIF87a', 'GIF89a'].includes(ascii(0, 6)),
    'image/webp': ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP',
    'image/bmp': ascii(0, 2) === 'BM',
    'image/avif': ascii(4, 8) === 'ftyp' && /avif|avis/.test(ascii(8, 32)),
  }
  if (!valid[file.type as keyof typeof valid])
    throw new ToolError('invalid-image')
}

export async function transformImage(
  file: Blob,
  config: { width?: number; format?: string; quality?: number },
) {
  await verifyImage(file)
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new ToolError('invalid-image')
  }
  try {
    const width = config.width ?? bitmap.width
    const height = Math.max(
      1,
      Math.round((bitmap.height * width) / bitmap.width),
    )
    if (width * height > 24_000_000 || width > 16384 || height > 16384)
      throw new ToolError('too-large')
    const canvas = new OffscreenCanvas(width, height)
    const context = canvas.getContext('2d')
    if (!context) throw new ToolError('image-unsupported')
    const type =
      config.format ??
      (['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
        ? file.type
        : 'image/png')
    if (type === 'image/jpeg') {
      context.fillStyle = '#fff'
      context.fillRect(0, 0, width, height)
    }
    context.drawImage(bitmap, 0, 0, width, height)
    const quality = config.quality ?? 0.85
    let blob = await canvas.convertToBlob({ type, quality })
    if (type === 'image/webp' && blob.type !== type) {
      const { default: encode } = await import('@jsquash/webp/encode.js')
      const encoded = await encode(context.getImageData(0, 0, width, height), {
        quality: quality * 100,
      })
      blob = new Blob([encoded], { type })
    }
    if (blob.type !== type) throw new ToolError('image-unsupported')
    const name = (file instanceof File ? file.name : 'image').replace(
      /\.[^.]+$/,
      '',
    )
    return new File([blob], name + '.' + type.split('/')[1], { type })
  } finally {
    bitmap.close()
  }
}
