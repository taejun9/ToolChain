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
  return { order, incoming }
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
  'idle' | 'queued' | 'running' | 'success' | 'error' | 'cancelled'
export type Log = {
  nodeId: string
  status: Status
  ms?: number
  error?: string
  inputs?: string[]
  outputs?: string[]
  bytes?: number
}

export function sizeOf(value: unknown) {
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
  const { order, incoming } = plan(workflow, registry)
  const results = new Map<string, Values>()
  const blocked = new Set<string>()
  let retained = 0
  for (const node of order) report({ nodeId: node.id, status: 'queued' })
  for (const node of order) {
    const edges = incoming.get(node.id)!
    if (
      signal.aborted ||
      edges.some((edge) => blocked.has(edge.sourceNodeId))
    ) {
      blocked.add(node.id)
      report({
        nodeId: node.id,
        status: 'cancelled',
        error: signal.aborted ? undefined : 'upstream',
      })
      continue
    }
    const tool = registry.get(node.toolId, node.toolVersion)
    const start = performance.now()
    const inputs = { ...runtime[node.id] }
    for (const edge of edges)
      inputs[edge.targetPortId] = results.get(edge.sourceNodeId)?.[
        edge.sourcePortId
      ]
    const metadata = {
      inputs: tool.inputs.map((port) => port.type),
      outputs: tool.outputs.map((port) => port.type),
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
      blocked.add(node.id)
      report({
        nodeId: node.id,
        status: signal.aborted ? 'cancelled' : 'error',
        ms: performance.now() - start,
        error: signal.aborted ? undefined : errorCode(error),
        ...metadata,
      })
    }
  }
  return results
}
