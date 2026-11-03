import { ToolError } from '../core/errors.ts'
import type { Values } from '../core/tool.ts'

export async function dataOperation(
  id: string,
  inputs: Values,
  config: Values,
): Promise<Values> {
  switch (id) {
    case 'text.replace': {
      const text = inputs.text as string
      const find = config.find as string
      const replacement = config.replacement as string
      const parts = config.all ? text.split(find) : null
      if (
        parts &&
        text.length + (parts.length - 1) * (replacement.length - find.length) >
          5_000_000
      )
        throw new ToolError('too-large')
      return {
        text: parts
          ? parts.join(replacement)
          : text.replace(find, () => replacement),
      }
    }
    case 'text.split':
      return { json: (inputs.text as string).split(config.separator as string) }
    case 'json.parse':
      try {
        return { json: JSON.parse(inputs.text as string) }
      } catch {
        throw new ToolError('invalid-json')
      }
    case 'json.format':
      return {
        text: JSON.stringify(inputs.json, null, config.indent as number),
      }
    case 'json.extract': {
      let value = inputs.json
      const path = config.path as string
      if (path)
        for (const segment of path.split('.')) {
          if (
            typeof value !== 'object' ||
            value === null ||
            !Object.hasOwn(value, segment)
          )
            throw new ToolError('missing-field')
          value = (value as Values)[segment]
        }
      return {
        json: value,
        text: typeof value === 'string' ? value : JSON.stringify(value),
      }
    }
    case 'csv.parse': {
      const { default: Papa } = await import('papaparse')
      const parsed = Papa.parse<string[]>(inputs.text as string, {
        delimiter: config.delimiter as string,
        skipEmptyLines: 'greedy',
      })
      if (parsed.errors.some((error) => error.code !== 'UndetectableDelimiter'))
        throw new ToolError('invalid-csv')
      return { csv: parsed.data }
    }
    case 'csv.to-json': {
      const rows = inputs.csv as string[][]
      const [headers = [], ...data] = rows
      if (
        config.headers &&
        (headers.some((header) => !header.trim()) ||
          new Set(headers).size !== headers.length ||
          data.some((row) => row.length !== headers.length))
      )
        throw new ToolError('invalid-csv')
      const json = config.headers
        ? data.map((row) =>
            Object.fromEntries(
              headers.map((header, index) => [header, row[index]]),
            ),
          )
        : rows
      return { json, text: JSON.stringify(json, null, 2) }
    }
    default:
      throw new ToolError('unknown-tool')
  }
}
