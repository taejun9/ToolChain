import { z } from 'zod'
import { errorCode } from './errors'
export { errorCode } from './errors'
import { compatible, json, ToolError, type Registry, type Values } from './tool'

const id = z.string().min(1).max(100)
const nodeSchema = z.strictObject({
  id,
  toolId: id,
  toolVersion: id,
  position: z.strictObject({ x: z.number(), y: z.number() }),
  config: z.record(z.string(), json),
})
const edgeSchema = z.strictObject({
  id,
  sourceNodeId: id,
  sourcePortId: id,
  targetNodeId: id,
  targetPortId: id,
})
export const workflowSchema = z.strictObject({
  id,
  name: z.string().trim().min(1).max(120),
  description: z.string().max(1000).optional(),
  schemaVersion: z.literal(1),
  parallelism: z.number().int().min(1).max(4).optional(),
  nodes: z.array(nodeSchema).max(100),
  edges: z.array(edgeSchema).max(400),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})
export type Workflow = z.infer<typeof workflowSchema>
export type WorkflowNode = z.infer<typeof nodeSchema>
export type WorkflowEdge = z.infer<typeof edgeSchema>
export const uid = () => crypto.randomUUID()

export function newWorkflow(name: string): Workflow {
  const now = new Date().toISOString()
  return {
    id: uid(),
    name,
    schemaVersion: 1,
    nodes: [],
    edges: [],
    createdAt: now,
    updatedAt: now,
  }
}

export function plan(workflow: Workflow, registry: Registry, complete = true) {
  const parallelism = workflow.parallelism ?? 1
  if (!Number.isInteger(parallelism) || parallelism < 1 || parallelism > 4)
    throw new ToolError('invalid-config')
  const nodes = new Map(workflow.nodes.map((node) => [node.id, node]))
  if (
    nodes.size !== workflow.nodes.length ||
    new Set(workflow.edges.map((edge) => edge.id)).size !==
      workflow.edges.length
  ) {
    throw new ToolError('duplicate-id')
  }
  const incoming = new Map(
    workflow.nodes.map((node) => [node.id, [] as WorkflowEdge[]]),
  )
  const outgoing = new Map(
    workflow.nodes.map((node) => [node.id, [] as WorkflowEdge[]]),
  )
  const definitions = new Map(
    workflow.nodes.map((node) => {
      const tool = registry.get(node.toolId, node.toolVersion)
      if (complete && !tool.configSchema.safeParse(node.config).success)
        throw new NodeError('invalid-config', node.id)
      return [node.id, tool]
    }),
  )
  for (const edge of workflow.edges) {
    const source = definitions
      .get(edge.sourceNodeId)
      ?.outputs.find((port) => port.id === edge.sourcePortId)
    const target = definitions
      .get(edge.targetNodeId)
      ?.inputs.find((port) => port.id === edge.targetPortId)
    if (!source || !target)
      throw new NodeError('missing-port', edge.targetNodeId)
    if (!compatible(source.type, target.type))
      throw new NodeError('incompatible-port', edge.targetNodeId)
    const edges = incoming.get(edge.targetNodeId)!
    if (edges.some((existing) => existing.targetPortId === edge.targetPortId))
      throw new NodeError('occupied-port', edge.targetNodeId)
    edges.push(edge)
    outgoing.get(edge.sourceNodeId)!.push(edge)
  }
  const degree = new Map([...incoming].map(([id, edges]) => [id, edges.length]))
  const order = workflow.nodes.filter((node) => degree.get(node.id) === 0)
  for (const node of order) {
    for (const edge of outgoing.get(node.id)!) {
      const count = degree.get(edge.targetNodeId)! - 1
      degree.set(edge.targetNodeId, count)
      if (count === 0) order.push(nodes.get(edge.targetNodeId)!)
    }
  }
  if (order.length !== nodes.size) throw new ToolError('cycle')
  if (complete)
    for (const node of order) {
      const edges = incoming.get(node.id)!
      for (const port of definitions.get(node.id)!.inputs) {
        if (
          !port.optional &&
          !edges.some((edge) => edge.targetPortId === port.id)
        )
          throw new NodeError('missing-input', node.id)
      }
    }
  return { order, incoming, parallelism }
}

export class NodeError extends ToolError {
  constructor(
    code: string,
    readonly nodeId: string,
  ) {
    super(code)
  }
}

export const workflowJsonLimit = 1_000_000

export function parseWorkflow(text: string, registry: Registry): Workflow {
  if (new Blob([text]).size > workflowJsonLimit)
    throw new ToolError('too-large')
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    throw new ToolError('invalid-workflow')
  }
  const parsed = workflowSchema.safeParse(value)
  if (!parsed.success) throw new ToolError('invalid-workflow')
  plan(parsed.data, registry, false)
  return parsed.data
}

export type Status =
  'idle' | 'queued' | 'running' | 'success' | 'error' | 'cancelled' | 'skipped'
export type Log = {
  nodeId: string
  status: Status
  ms?: number
  startedAt?: number
  error?: string
  inputs?: string[]
  outputs?: string[]
  bytes?: number
}

export function sizeOf(value: unknown) {
  if (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => item instanceof Blob)
  )
    return value.reduce((bytes, file) => bytes + file.size, 0)
  return value instanceof Blob
    ? value.size
    : new Blob([typeof value === 'string' ? value : JSON.stringify(value)]).size
}

export async function runWorkflow(
  workflow: Workflow,
  registry: Registry,
  runtime: Record<string, Values>,
  signal: AbortSignal,
  report: (log: Log) => void,
) {
  const { order, incoming, parallelism } = plan(workflow, registry)
  const results = new Map<string, Values>()
  const failures = new Set<string>()
  const settled = new Set<string>()
  const pending = new Set(order)
  const active = new Set<Promise<void>>()
  const runStart = performance.now()
  let retained = 0
  for (const node of order) report({ nodeId: node.id, status: 'queued' })

  async function execute(node: WorkflowNode) {
    const edges = incoming.get(node.id)!
    if (
      signal.aborted ||
      edges.some((edge) => failures.has(edge.sourceNodeId))
    ) {
      failures.add(node.id)
      report({
        nodeId: node.id,
        status: 'cancelled',
        error: signal.aborted ? undefined : 'upstream',
      })
      return
    }
    const tool = registry.get(node.toolId, node.toolVersion)
    const inputs: Values = { ...runtime[node.id] }
    const inactive = edges.filter((edge) => {
      const output = results.get(edge.sourceNodeId)
      return (
        !output ||
        !Object.hasOwn(output, edge.sourcePortId) ||
        output[edge.sourcePortId] === undefined
      )
    })
    if (
      (edges.length > 0 && inactive.length === edges.length) ||
      inactive.some(
        (edge) =>
          !tool.inputs.find((port) => port.id === edge.targetPortId)?.optional,
      )
    ) {
      report({ nodeId: node.id, status: 'skipped', error: 'branch-skipped' })
      return
    }
    for (const edge of edges) {
      const output = results.get(edge.sourceNodeId)
      if (output && Object.hasOwn(output, edge.sourcePortId))
        inputs[edge.targetPortId] = output[edge.sourcePortId]
    }
    const start = performance.now()
    const metadata = {
      inputs: tool.inputs.map((port) => port.type),
      outputs: tool.outputs.map((port) => port.type),
      startedAt: start - runStart,
    }
    report({ nodeId: node.id, status: 'running', ...metadata })
    try {
      const result = await registry.run(
        node.toolId,
        inputs,
        node.config,
        signal,
        node.toolVersion,
      )
      const bytes = Object.values(result).reduce<number>(
        (total, value) => total + sizeOf(value),
        0,
      )
      if (retained + bytes > 128 * 1024 * 1024) throw new ToolError('too-large')
      retained += bytes
      results.set(node.id, result)
      report({
        nodeId: node.id,
        status: 'success',
        ms: performance.now() - start,
        bytes,
        ...metadata,
      })
    } catch (error) {
      failures.add(node.id)
      report({
        nodeId: node.id,
        status: signal.aborted ? 'cancelled' : 'error',
        ms: performance.now() - start,
        error: signal.aborted ? undefined : errorCode(error),
        ...metadata,
      })
    }
  }

  while (pending.size || active.size) {
    for (const node of pending) {
      if (active.size >= parallelism) break
      if (
        !incoming.get(node.id)!.every((edge) => settled.has(edge.sourceNodeId))
      )
        continue
      pending.delete(node)
      const execution = execute(node).finally(() => {
        settled.add(node.id)
        active.delete(execution)
      })
      active.add(execution)
    }
    if (active.size) await Promise.race(active)
  }
  return results
}
