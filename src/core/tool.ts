import { z } from 'zod'
import { ToolError } from './errors.ts'
export { ToolError } from './errors.ts'

export const json = z.json()
export const types = [
  'text',
  'json',
  'csv',
  'binary',
  'image',
  'pdf',
  'file',
  'file-list',
] as const
export type DataType = (typeof types)[number]
export type Port = { id: string; type: DataType; optional?: boolean }
export type Values = Record<string, unknown>
export type Context = { signal: AbortSignal }
export type Field = {
  id: string
  kind: 'text' | 'number' | 'select' | 'boolean'
  options?: string[]
  step?: number
}

export interface Tool {
  id: string
  version: string
  name: string
  description: string
  category: string
  inputs: Port[]
  outputs: Port[]
  fields: Field[]
  defaults: Values
  configSchema: z.ZodType<Values>
  errors: string[]
  execute(context: Context, inputs: Values, config: unknown): Promise<Values>
}

export function defineTool<C extends Values>(
  definition: Omit<
    Tool,
    | 'version'
    | 'name'
    | 'description'
    | 'category'
    | 'configSchema'
    | 'execute'
    | 'errors'
  > & {
    configSchema: z.ZodType<C>
    errors?: string[]
    execute(
      context: Context,
      inputs: Values,
      config: C,
    ): Values | Promise<Values>
  },
): Tool {
  return {
    ...definition,
    version: '1.0.0',
    name: 'tool.' + definition.id,
    description: 'desc.' + definition.id,
    category: definition.id.split('.')[0],
    errors: [
      'invalid-config',
      'invalid-input',
      'invalid-output',
      'processing',
      'too-large',
      ...(definition.errors ?? []),
    ],
    async execute(context, inputs, config) {
      const parsed = definition.configSchema.safeParse(config)
      if (!parsed.success) throw new ToolError('invalid-config')
      return definition.execute(context, inputs, parsed.data)
    },
  }
}

export function compatible(source: DataType, target: DataType) {
  return (
    source === target ||
    (target === 'file' && ['image', 'pdf', 'binary'].includes(source))
  )
}

function matches(value: unknown, type: DataType): boolean {
  switch (type) {
    case 'text':
      return typeof value === 'string'
    case 'json':
      return json.safeParse(value).success
    case 'csv':
      return (
        Array.isArray(value) &&
        value.every(
          (row) =>
            Array.isArray(row) && row.every((cell) => typeof cell === 'string'),
        )
      )
    case 'file-list':
      return (
        Array.isArray(value) &&
        value.length > 0 &&
        value.every((file) => file instanceof Blob)
      )
    case 'image':
      return (
        value instanceof Blob &&
        /^image\/(png|jpeg|webp|gif|bmp|avif)$/.test(value.type)
      )
    case 'pdf':
      return value instanceof Blob && value.type === 'application/pdf'
    default:
      return value instanceof Blob
  }
}

function validatePorts(ports: Port[], values: Values, code: string) {
  for (const port of ports) {
    const value = Object.hasOwn(values, port.id) ? values[port.id] : undefined
    if (value === undefined && port.optional) continue
    if (!matches(value, port.type)) throw new ToolError(code)
    if (
      (value instanceof Blob && value.size > 40 * 1024 * 1024) ||
      (port.type === 'file-list' &&
        ((value as Blob[]).length > 100 ||
          (value as Blob[]).reduce((sum, file) => sum + file.size, 0) >
            40 * 1024 * 1024)) ||
      (typeof value === 'string' && value.length > 5_000_000)
    )
      throw new ToolError('too-large')
  }
}

export class Registry {
  private readonly tools = new Map<string, Tool>()
  register(tool: Tool) {
    if (this.tools.has(tool.id)) throw new ToolError('duplicate-tool')
    this.tools.set(tool.id, tool)
  }
  get(id: string, version?: string) {
    const tool = this.tools.get(id)
    if (!tool) throw new ToolError('unknown-tool')
    if (version !== undefined && tool.version !== version)
      throw new ToolError('unsupported-version')
    return tool
  }
  list(category?: string) {
    return [...this.tools.values()].filter(
      (tool) => !category || tool.category === category,
    )
  }
  search(query: string, translate: (key: string) => string, category?: string) {
    const needle = query.trim().toLowerCase()
    return this.list(category).filter((tool) =>
      [tool.id, translate(tool.name), translate(tool.description)].some(
        (value) => value.toLowerCase().includes(needle),
      ),
    )
  }
  async run(
    id: string,
    inputs: Values,
    config: unknown,
    signal = new AbortController().signal,
    version?: string,
  ) {
    const tool = this.get(id, version)
    signal.throwIfAborted()
    validatePorts(tool.inputs, inputs, 'invalid-input')
    const outputs = await tool.execute({ signal }, inputs, config)
    signal.throwIfAborted()
    validatePorts(tool.outputs, outputs, 'invalid-output')
    return outputs
  }
}
