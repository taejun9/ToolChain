// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { compatible, Registry, defineTool } from '../src/core/tool'
import { registry } from '../src/tools/registry'
import { z } from 'zod'

const run = (
  id: string,
  inputs: Record<string, unknown>,
  config = registry.get(id).defaults,
) => registry.run(id, inputs, config)
const png = new File(
  [
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jCZwAAAAASUVORK5CYII=',
      'base64',
    ),
  ],
  'dot.png',
  { type: 'image/png' },
)
afterEach(() => vi.unstubAllGlobals())

describe('registry', () => {
  it('registers 14 unique versioned tools and searches localized terms', () => {
    expect(registry.list()).toHaveLength(14)
    expect(registry.list('image')).toHaveLength(2)
    expect(
      registry
        .search('테스트', (key) => (key === 'tool.json.parse' ? '테스트' : key))
        .map((tool) => tool.id),
    ).toEqual(['json.parse'])
    expect(() => registry.get('x')).toThrow('unknown-tool')
    expect(() => registry.get('json.parse', '2')).toThrow('unsupported-version')
    const local = new Registry()
    const tool = defineTool({
      id: 'test.invalid',
      inputs: [],
      outputs: [{ id: 'text', type: 'text' }],
      fields: [],
      defaults: {},
      configSchema: z.strictObject({}),
      execute: () => ({ text: 7 }),
    })
    local.register(tool)
    expect(() => local.register(tool)).toThrow('duplicate-tool')
    return expect(local.run(tool.id, {}, {})).rejects.toThrow('invalid-output')
  })
  it('checks compatible types, settings, sizes, and pre-aborted requests', async () => {
    expect(compatible('image', 'file')).toBe(true)
    expect(compatible('json', 'text')).toBe(false)
    await expect(run('text.replace', { text: 1 })).rejects.toThrow(
      'invalid-input',
    )
    await expect(
      run('text.replace', { text: '' }, { find: '' }),
    ).rejects.toThrow('invalid-config')
    await expect(
      run('input.text', { text: 'x'.repeat(5_000_001) }),
    ).rejects.toThrow('too-large')
    await expect(
      registry.run('input.text', { text: 'x' }, {}, AbortSignal.abort()),
    ).rejects.toHaveProperty('name', 'AbortError')
  })
})

it('Text Input forwards text including the empty string', async () => {
  await expect(run('input.text', { text: '' })).resolves.toEqual({ text: '' })
  await expect(run('input.text', {})).rejects.toThrow('missing-input')
})
it('File Input preserves bytes and metadata', async () => {
  const file = new File(['raw'], 'a.txt', { type: 'text/plain' })
  expect((await run('input.file', { file })).file).toBe(file)
})
it('Image Input verifies raster signatures', async () => {
  expect((await run('input.image', { image: png })).image).toBe(png)
  await expect(
    run('input.image', { image: new Blob(['fake'], { type: 'image/png' }) }),
  ).rejects.toThrow('invalid-image')
})
it('Text Replace treats replacement tokens literally', async () => {
  await expect(
    run(
      'text.replace',
      { text: 'old old' },
      { find: 'old', replacement: '$&', all: true },
    ),
  ).resolves.toEqual({ text: '$& $&' })
  await expect(
    run(
      'text.replace',
      { text: 'old old' },
      { find: 'old', replacement: 'new', all: false },
    ),
  ).resolves.toEqual({ text: 'new old' })
})
it('Text Split preserves empty segments', async () => {
  await expect(run('text.split', { text: 'a,,b,' })).resolves.toEqual({
    json: ['a', '', 'b', ''],
  })
})
it('JSON Parse handles null and malformed JSON', async () => {
  await expect(run('json.parse', { text: 'null' })).resolves.toEqual({
    json: null,
  })
  await expect(run('json.parse', { text: '{' })).rejects.toThrow('invalid-json')
})
it('JSON Format indents an object', async () => {
  await expect(
    run('json.format', { json: { a: 1 } }, { indent: 4 }),
  ).resolves.toEqual({ text: '{\n    "a": 1\n}' })
})
it('JSON Extract walks arrays and does not access inherited keys', async () => {
  await expect(
    run('json.extract', { json: { a: [null, 7] } }, { path: 'a.1' }),
  ).resolves.toEqual({ json: 7, text: '7' })
  await expect(
    run('json.extract', { json: {} }, { path: 'constructor' }),
  ).rejects.toThrow('missing-field')
})
it('CSV Parse supports quoted delimiters, newlines, and invalid quoting', async () => {
  await expect(
    run('csv.parse', { text: 'a;b\r\n"x;y";"m\nn"' }, { delimiter: ';' }),
  ).resolves.toEqual({
    csv: [
      ['a', 'b'],
      ['x;y', 'm\nn'],
    ],
  })
  await expect(run('csv.parse', { text: '"unclosed' })).rejects.toThrow(
    'invalid-csv',
  )
})
it('CSV to JSON supports headers and rejects inconsistent rows', async () => {
  const result = await run('csv.to-json', { csv: [['name'], ['Ada']] })
  expect(result.json).toEqual([{ name: 'Ada' }])
  await expect(
    run('csv.to-json', {
      csv: [
        ['a', 'a'],
        ['1', '2'],
      ],
    }),
  ).rejects.toThrow('invalid-csv')
  await expect(
    run('csv.to-json', { csv: [['a'], ['1', '2']] }),
  ).rejects.toThrow('invalid-csv')
  expect(
    (await run('csv.to-json', { csv: [['a'], ['1']] }, { headers: false }))
      .json,
  ).toEqual([['a'], ['1']])
})
function mockCanvas() {
  const close = vi.fn()
  const drawImage = vi.fn()
  const fillRect = vi.fn()
  const canvas = vi.fn(function (this: Record<string, unknown>) {
    this.getContext = () => ({ drawImage, fillRect })
    this.convertToBlob = ({ type }: { type: string }) =>
      Promise.resolve(new Blob(['encoded'], { type }))
  })
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn(async () => ({ width: 4, height: 2, close })),
  )
  vi.stubGlobal('OffscreenCanvas', canvas)
  return { close, drawImage, canvas, fillRect }
}
it('Image Resize maintains ratio and closes decoded resources', async () => {
  const { close, canvas } = mockCanvas()
  const result = await run('image.resize', { image: png }, { width: 12 })
  expect(canvas).toHaveBeenCalledWith(12, 6)
  expect(result.image).toBeInstanceOf(File)
  expect(close).toHaveBeenCalledOnce()
})
it('Image Convert requests JPEG, composites transparency, and assigns extension', async () => {
  const { fillRect } = mockCanvas()
  const result = await run(
    'image.convert',
    { image: png },
    { format: 'image/jpeg', quality: 0.75 },
  )
  expect(fillRect).toHaveBeenCalledWith(0, 0, 4, 2)
  expect(result.image).toMatchObject({ name: 'dot.jpeg', type: 'image/jpeg' })
})
it('Text Output forwards text and File Download preserves content when renamed', async () => {
  await expect(run('output.text', { text: 'value' })).resolves.toEqual({
    text: 'value',
  })
  const file = (
    await run(
      'file.download',
      { file: new Blob(['abc'], { type: 'text/plain' }) },
      { filename: 'out.txt' },
    )
  ).file as File
  expect(file.name).toBe('out.txt')
  expect(file.type).toBe('text/plain')
  expect(await file.text()).toBe('abc')
  await expect(
    run('file.download', { file }, { filename: '../evil' }),
  ).rejects.toThrow('invalid-config')
})
