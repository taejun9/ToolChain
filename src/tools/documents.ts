import { ToolError } from '../core/errors.ts'
import type { Values } from '../core/tool.ts'

const fileLimit = 40 * 1024 * 1024
const entryLimit = 100

export async function verifyPdf(file: Blob) {
  const header = new TextDecoder().decode(await file.slice(0, 8).arrayBuffer())
  if (!header.startsWith('%PDF-')) throw new ToolError('invalid-pdf')
}

async function pdfOperation(id: string, inputs: Values, config: Values) {
  const { PDFDocument } = await import('pdf-lib')
  const files =
    id === 'pdf.merge' ? (inputs.files as Blob[]) : [inputs.pdf as Blob]
  const output = await PDFDocument.create()
  try {
    for (const file of files) {
      await verifyPdf(file)
      const bytes = await file.arrayBuffer()
      const source = await PDFDocument.load(bytes, {
        throwOnInvalidObject: true,
      })
      const count = source.getPageCount()
      const start = id === 'pdf.merge' ? 1 : (config.first as number)
      const end = id === 'pdf.merge' ? count : (config.last as number)
      if (start > end || end > count) throw new ToolError('page-range')
      if (output.getPageCount() + end - start + 1 > 500)
        throw new ToolError('too-large')
      const pages = await output.copyPages(
        source,
        Array.from({ length: end - start + 1 }, (_, i) => start + i - 1),
      )
      for (const page of pages) output.addPage(page)
    }
    return {
      pdf: new File(
        [new Uint8Array(await output.save())],
        id === 'pdf.merge' ? 'merged.pdf' : 'pages.pdf',
        { type: 'application/pdf' },
      ),
    }
  } catch (error) {
    if (error instanceof ToolError || error instanceof RangeError) throw error
    throw new ToolError('invalid-pdf')
  }
}

function safeName(name: string) {
  return (
    name !== '' &&
    name !== '.' &&
    name !== '..' &&
    !['__proto__', 'constructor', 'prototype'].includes(name) &&
    name.length <= 255 &&
    !name.includes('/') &&
    !name.includes('\\') &&
    !name.includes(':') &&
    [...name].every((char) => char.charCodeAt(0) >= 32)
  )
}

async function zipOperation(id: string, inputs: Values) {
  const { zipSync, unzipSync } = await import('fflate')
  if (id === 'zip.pack') {
    const entries: Record<string, Uint8Array> = Object.create(null)
    for (const [index, blob] of (inputs.files as Blob[]).entries()) {
      const name = blob instanceof File ? blob.name : 'file-' + (index + 1)
      if (!safeName(name) || Object.hasOwn(entries, name))
        throw new ToolError('archive-name')
      entries[name] = new Uint8Array(await blob.arrayBuffer())
    }
    return {
      file: new File([new Uint8Array(zipSync(entries))], 'archive.zip', {
        type: 'application/zip',
      }),
    }
  }
  try {
    let total = 0
    const names = new Map<string, string>()
    const seen = new Set<string>()
    const entries = unzipSync(
      new Uint8Array(await (inputs.file as Blob).arrayBuffer()),
      {
        filter: ({ name, originalSize }) => {
          const directory = name.endsWith('/') && originalSize === 0
          const parts = (directory ? name.slice(0, -1) : name).split('/')
          if (!parts.every(safeName)) throw new ToolError('archive-name')
          if (directory) return false
          const flatName = parts.join('__')
          if (!safeName(flatName) || seen.has(flatName))
            throw new ToolError('archive-name')
          seen.add(flatName)
          names.set(name, flatName)
          total += originalSize
          if (seen.size > entryLimit || total > fileLimit)
            throw new ToolError('too-large')
          return true
        },
      },
    )
    if (!seen.size) throw new ToolError('invalid-zip')
    return {
      files: Object.entries(entries).map(
        ([name, bytes]) => new File([new Uint8Array(bytes)], names.get(name)!),
      ),
    }
  } catch (error) {
    if (error instanceof ToolError || error instanceof RangeError) throw error
    throw new ToolError('invalid-zip')
  }
}

export function documentOperation(
  id: string,
  inputs: Values,
  config: Values,
): Promise<Values> {
  return id.startsWith('pdf.')
    ? pdfOperation(id, inputs, config)
    : zipOperation(id, inputs)
}
