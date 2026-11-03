import { ToolError } from '../core/tool'
import { parseWorkflow, uid, type Workflow } from '../core/workflow'
import { registry } from '../tools/registry'

const prefix = '#w='
const limit = 48_000

export function shareFragment(workflow: Workflow) {
  const fragment = prefix + encodeURIComponent(JSON.stringify(workflow))
  if (fragment.length > limit) throw new ToolError('share-too-large')
  return fragment
}

export function openShared(fragment: string): Workflow {
  if (!fragment.startsWith(prefix) || fragment.length > limit)
    throw new ToolError('invalid-workflow')
  try {
    const workflow = parseWorkflow(
      decodeURIComponent(fragment.slice(prefix.length)),
      registry,
    )
    const now = new Date().toISOString()
    return { ...workflow, id: uid(), createdAt: now, updatedAt: now }
  } catch (error) {
    if (error instanceof ToolError) throw error
    throw new ToolError('invalid-workflow')
  }
}
