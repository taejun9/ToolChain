// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { makeTemplate, templates } from '../src/features/templates'
import { rulesParser } from '../src/features/generator'
import { registry } from '../src/tools/registry'
import {
  parseWorkflow,
  plan,
  runWorkflow,
  type Log,
} from '../src/core/workflow'

const draft = (id: string) => makeTemplate(id, id)!
const run = async (id: string, text: string) => {
  const workflow = draft(id)
  const logs: Log[] = []
  const results = await runWorkflow(
    workflow,
    registry,
    { [workflow.nodes[0].id]: { text } },
    new AbortController().signal,
    (log) => logs.push(log),
  )
  return {
    workflow,
    logs,
    results,
    final: results.get(workflow.nodes.at(-1)!.id),
  }
}
describe('DAG validation', () => {
  it('sorts reversed nodes and round trips every template', () => {
    for (const { id } of templates) {
      const workflow = draft(id)
      const order = workflow.nodes.map((node) => node.id)
      workflow.nodes.reverse()
      const restored = parseWorkflow(JSON.stringify(workflow), registry)
      expect(restored).toEqual(workflow)
      expect(plan(restored, registry).order.map((node) => node.id)).toEqual(
        order,
      )
    }
  })
  it('rejects cycles, duplicate IDs, missing ports and bad types', () => {
    const workflow = draft('cleaner')
    const [, middle, last] = workflow.nodes
    const edge = {
      id: 'edge',
      sourceNodeId: last.id,
      sourcePortId: 'text',
      targetNodeId: middle.id,
      targetPortId: 'text',
    }
    expect(() =>
      plan({ ...workflow, edges: [workflow.edges[1], edge] }, registry, false),
    ).toThrow('cycle')
    expect(() =>
      plan({ ...workflow, edges: [...workflow.edges, edge] }, registry),
    ).toThrow('occupied-port')
    expect(() =>
      plan({ ...workflow, nodes: [...workflow.nodes, middle] }, registry),
    ).toThrow('duplicate-id')
    expect(() =>
      plan(
        { ...workflow, edges: [{ ...edge, sourcePortId: 'wrong' }] },
        registry,
      ),
    ).toThrow('missing-port')
    expect(() =>
      plan(
        {
          ...draft('formatter'),
          edges: [{ ...draft('formatter').edges[0], sourceNodeId: 'missing' }],
        },
        registry,
      ),
    ).toThrow('missing-port')
    const json = draft('formatter')
    json.edges[1].sourceNodeId = json.nodes[0].id
    json.edges[1].sourcePortId = 'text'
    expect(() => plan(json, registry)).toThrow('incompatible-port')
  })
  it('rejects bad schema, config, missing required inputs and unsupported version', () => {
    const workflow = draft('optimizer')
    expect(() => parseWorkflow('{', registry)).toThrow('invalid-workflow')
    expect(() =>
      parseWorkflow(
        JSON.stringify({ ...workflow, schemaVersion: 2 }),
        registry,
      ),
    ).toThrow('invalid-workflow')
    expect(() => plan({ ...workflow, edges: [] }, registry)).toThrow(
      'missing-input',
    )
    workflow.nodes[1].config.width = 0
    expect(() => plan(workflow, registry)).toThrow('invalid-config')
    workflow.nodes[0].toolVersion = '9'
    expect(() => plan(workflow, registry)).toThrow('unsupported-version')
  })
})
it('runs Text Input → Text Replace → Text Output with typed logs', async () => {
  const { final, logs } = await run('cleaner', 'one  two')
  expect(final).toEqual({ text: 'one two' })
  expect(logs.map((log) => log.status)).toEqual([
    'queued',
    'queued',
    'queued',
    'running',
    'success',
    'running',
    'success',
    'running',
    'success',
  ])
  expect(logs.at(-1)).toMatchObject({
    bytes: 7,
    inputs: ['text'],
    outputs: ['text'],
  })
})
it('runs JSON Parse → JSON Extract → Text Output', async () => {
  expect((await run('extractor', '{"name":"Ada"}')).final).toEqual({
    text: 'Ada',
  })
})
it('runs CSV Parse → CSV to JSON → Text Output', async () => {
  const { final } = await run('csv', 'name,city\nAda,Seoul')
  expect(JSON.parse(final!.text as string)).toEqual([
    { name: 'Ada', city: 'Seoul' },
  ])
})
it('reports a failed node, skips dependents and runs independent nodes', async () => {
  const workflow = draft('formatter')
  const independent = draft('cleaner').nodes[0]
  workflow.nodes.push(independent)
  const logs: Log[] = []
  const values = await runWorkflow(
    workflow,
    registry,
    { [workflow.nodes[0].id]: { text: '{' }, [independent.id]: { text: 'ok' } },
    new AbortController().signal,
    (log) => logs.push(log),
  )
  expect(values.get(independent.id)).toEqual({ text: 'ok' })
  expect(logs).toContainEqual(
    expect.objectContaining({
      nodeId: workflow.nodes[1].id,
      status: 'error',
      error: 'invalid-json',
    }),
  )
  expect(logs).toContainEqual(
    expect.objectContaining({
      nodeId: workflow.nodes[2].id,
      status: 'cancelled',
      error: 'upstream',
    }),
  )
})
it('cancels the active and pending nodes', async () => {
  const workflow = draft('cleaner')
  const abort = new AbortController()
  const logs: Log[] = []
  const values = await runWorkflow(
    workflow,
    registry,
    {},
    abort.signal,
    (log) => {
      logs.push(log)
      if (log.status === 'running') abort.abort()
    },
  )
  expect(values.size).toBe(0)
  expect(logs.filter((log) => log.status === 'cancelled')).toHaveLength(3)
})
it('parses supported English and Korean commands with exact intent', () => {
  const en = rulesParser.parse(
    'Resize an image to 800px and convert it to PNG.',
    (key) => key,
  )!
  expect(en.nodes[1].config.width).toBe(800)
  expect(en.nodes[2].config.format).toBe('image/png')
  const ko = rulesParser.parse(
    '이미지를 1200px로 줄이고 WebP로 변환해줘.',
    (key) => key,
  )!
  expect(ko.nodes[1].config.width).toBe(1200)
  expect(ko.nodes[2].config.format).toBe('image/webp')
  expect(() =>
    rulesParser.parse('Format JSON and upload to a server', (key) => key),
  ).toThrow('unsupported-prompt')
})
