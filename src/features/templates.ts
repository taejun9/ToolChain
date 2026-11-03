import { newWorkflow, uid, workflowSchema } from '../core/workflow'
import { registry } from '../tools/registry'
import templates from './templates.json'

export { templates }
export function makeTemplate(id: string, name: string, description?: string) {
  const template = templates.find((item) => item.id === id)
  if (!template) return undefined
  const workflow = { ...newWorkflow(name), description }
  workflow.nodes = template.nodes.map((node, index) => {
    const tool = registry.get(node.tool)
    return {
      id: uid(),
      toolId: tool.id,
      toolVersion: tool.version,
      position: {
        x: (index % 3) * 210 + 24,
        y: Math.floor(index / 3) * 125 + 45,
      },
      config: { ...tool.defaults, ...node.config },
    }
  }) as typeof workflow.nodes
  workflow.edges = template.edges.map(
    ([sourcePortId, targetPortId], index) => ({
      id: uid(),
      sourceNodeId: workflow.nodes[index].id,
      sourcePortId,
      targetNodeId: workflow.nodes[index + 1].id,
      targetPortId,
    }),
  )
  return workflowSchema.parse(workflow)
}
