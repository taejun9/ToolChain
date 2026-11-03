import { z } from 'zod'
import {
  defineTool,
  Registry,
  ToolError,
  type Context,
  type DataType,
  type Field,
  type Values,
} from '../core/tool.ts'

export const registry = new Registry()
const port = (id: string, type: DataType, optional = false) => ({
  id,
  type,
  optional,
})
const text = port('text', 'text')
const json = port('json', 'json')
const csv = port('csv', 'csv')
const image = port('image', 'image')
const file = port('file', 'file')
const empty = z.strictObject({})
const field = (
  id: string,
  kind: Field['kind'],
  options?: string[],
  step?: number,
): Field => ({ id, kind, options, step })

async function process(
  id: string,
  { signal }: Context,
  inputs: Values,
  config: Values,
): Promise<Values> {
  if (typeof Worker === 'undefined') {
    if (id.startsWith('image.')) {
      const { transformImage } = await import('./image.ts')
      return { image: await transformImage(inputs.image as Blob, config) }
    }
    const { dataOperation } = await import('./operations.ts')
    return dataOperation(id, inputs, config)
  }
  return new Promise((resolve, reject) => {
    signal.throwIfAborted()
    const worker = new Worker(
      new URL('../workers/process.worker.ts', import.meta.url),
      { type: 'module' },
    )
    const cleanup = () => {
      worker.terminate()
      signal.removeEventListener('abort', abort)
    }
    const abort = () => {
      cleanup()
      reject(signal.reason)
    }
    const fail = () => {
      cleanup()
      reject(new ToolError('processing'))
    }
    worker.onmessage = ({ data }) => {
      cleanup()
      if (data.error) reject(new ToolError(data.error))
      else resolve(data.values)
    }
    worker.onerror = (event) => {
      event.preventDefault()
      fail()
    }
    worker.onmessageerror = fail
    signal.addEventListener('abort', abort, { once: true })
    try {
      worker.postMessage({ id, inputs, config })
    } catch {
      fail()
    }
  })
}

function operation<C extends Values>(
  id: string,
  inputs: ReturnType<typeof port>[],
  outputs: ReturnType<typeof port>[],
  configSchema: z.ZodType<C>,
  defaults: C,
  fields: Field[],
  errors: string[] = [],
) {
  registry.register(
    defineTool({
      id,
      inputs,
      outputs,
      configSchema,
      defaults,
      fields,
      errors,
      execute: (context, values, config) =>
        process(id, context, values, config),
    }),
  )
}

registry.register(
  defineTool({
    id: 'input.text',
    inputs: [port('text', 'text', true)],
    outputs: [text],
    configSchema: empty,
    defaults: {},
    fields: [],
    errors: ['missing-input'],
    execute: (_, values) => {
      if (typeof values.text !== 'string') throw new ToolError('missing-input')
      return { text: values.text }
    },
  }),
)
registry.register(
  defineTool({
    id: 'input.file',
    inputs: [port('file', 'file', true)],
    outputs: [file],
    configSchema: empty,
    defaults: {},
    fields: [],
    errors: ['missing-input'],
    execute: (_, values) => {
      if (!(values.file instanceof Blob)) throw new ToolError('missing-input')
      return { file: values.file }
    },
  }),
)
registry.register(
  defineTool({
    id: 'input.image',
    inputs: [port('image', 'image', true)],
    outputs: [image],
    configSchema: empty,
    defaults: {},
    fields: [],
    errors: ['missing-input', 'invalid-image'],
    async execute(_, values) {
      if (!(values.image instanceof Blob)) throw new ToolError('missing-input')
      const { verifyImage } = await import('./image.ts')
      await verifyImage(values.image)
      return { image: values.image }
    },
  }),
)

operation(
  'text.replace',
  [text],
  [text],
  z.strictObject({
    find: z.string().min(1).max(10000),
    replacement: z.string().max(10000),
    all: z.boolean(),
  }),
  { find: 'old', replacement: 'new', all: true },
  [
    field('find', 'text'),
    field('replacement', 'text'),
    field('all', 'boolean'),
  ],
)
operation(
  'text.split',
  [text],
  [json],
  z.strictObject({ separator: z.string().min(1).max(1000) }),
  { separator: ',' },
  [field('separator', 'text')],
)
operation('json.parse', [text], [json], empty, {}, [], ['invalid-json'])
operation(
  'json.format',
  [json],
  [text],
  z.strictObject({ indent: z.number().int().min(0).max(8) }),
  { indent: 2 },
  [field('indent', 'number')],
)
operation(
  'json.extract',
  [json],
  [json, text],
  z.strictObject({ path: z.string().max(1000) }),
  { path: 'name' },
  [field('path', 'text')],
  ['missing-field'],
)
const delimiters = ['', ',', ';', '\t', '|'] as const
operation(
  'csv.parse',
  [text],
  [csv],
  z.strictObject({ delimiter: z.enum(delimiters) }),
  { delimiter: '' },
  [field('delimiter', 'select', [...delimiters])],
  ['invalid-csv'],
)
operation(
  'csv.to-json',
  [csv],
  [json, text],
  z.strictObject({ headers: z.boolean() }),
  { headers: true },
  [field('headers', 'boolean')],
  ['invalid-csv'],
)
operation(
  'image.resize',
  [image],
  [image],
  z.strictObject({ width: z.number().int().min(1).max(8192) }),
  { width: 1200 },
  [field('width', 'number')],
  ['invalid-image', 'image-unsupported'],
)
const formats = ['image/webp', 'image/png', 'image/jpeg'] as const
operation(
  'image.convert',
  [image],
  [image],
  z.strictObject({
    format: z.enum(formats),
    quality: z.number().min(0).max(1),
  }),
  { format: 'image/webp', quality: 0.85 },
  [
    field('format', 'select', [...formats]),
    field('quality', 'number', undefined, 0.05),
  ],
  ['invalid-image', 'image-unsupported'],
)
registry.register(
  defineTool({
    id: 'output.text',
    inputs: [text],
    outputs: [text],
    configSchema: empty,
    defaults: {},
    fields: [],
    execute: (_, inputs) => ({ text: inputs.text }),
  }),
)
registry.register(
  defineTool({
    id: 'file.download',
    inputs: [file],
    outputs: [file],
    configSchema: z.strictObject({
      filename: z
        .string()
        .max(120)
        .refine(
          (name) =>
            !name.includes('/') &&
            !name.includes('\\') &&
            [...name].every((char) => char.charCodeAt(0) >= 32),
        ),
    }),
    defaults: { filename: '' },
    fields: [field('filename', 'text')],
    execute: (_, inputs, config) => {
      const blob = inputs.file as Blob
      return {
        file: config.filename
          ? new File([blob], config.filename, { type: blob.type })
          : blob,
      }
    },
  }),
)
