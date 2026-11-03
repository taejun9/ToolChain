<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  toRaw,
} from 'vue'
import {
  Handle,
  Position,
  VueFlow,
  type VueFlowStore,
  type Connection,
  type NodeMouseEvent,
} from '@vue-flow/core'
import { Play, Plus, Save, Sparkles, Trash2 } from '@lucide/vue'
import { useRoute, useRouter } from 'vue-router'
import { ToolError, type Values } from '../core/tool'
import {
  errorCode,
  newWorkflow,
  NodeError,
  parseWorkflow,
  plan,
  runWorkflow,
  uid,
  workflowSchema,
  workflowJsonLimit,
  type Log,
  type Workflow,
  type WorkflowEdge,
} from '../core/workflow'
import { useI18n } from '../i18n'
import { db } from '../storage/db'
import { registry } from '../tools/registry'
import ConfigFields from '../components/ConfigFields.vue'
import ValueInput from '../components/ValueInput.vue'
import Results from '../components/Results.vue'
import { makeTemplate } from './templates'
import { rulesParser } from './generator'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'

const { t, describeError } = useI18n()
const route = useRoute()
const router = useRouter()
const workflow = ref<Workflow>(newWorkflow(t('untitled')))
const selected = ref('')
const source = ref('')
const target = ref('')
const prompt = ref('')
const error = ref('')
const notice = ref('')
const status = ref('')
const busy = ref(false)
const controller = shallowRef<AbortController>()
const runtime = shallowRef<Record<string, Values>>(Object.create(null))
const logs = ref<Record<string, Log>>(Object.create(null))
const results = shallowRef(new Map<string, Values>())
const tools = registry.list()
const canvas = ref<HTMLElement>()
const flow = shallowRef<VueFlowStore>()
const selectedNode = computed(() =>
  workflow.value.nodes.find((node) => node.id === selected.value),
)
const selectedTool = computed(
  () => selectedNode.value && registry.get(selectedNode.value.toolId),
)
const selectedResult = computed(() => results.value.get(selected.value))
const flowNodes = computed(() =>
  workflow.value.nodes.map((node) => ({
    id: node.id,
    type: 'tool',
    position: { ...node.position },
    label: nodeLabel(node.id),
  })),
)
const flowEdges = computed(() =>
  workflow.value.edges.map((edge) => ({
    id: edge.id,
    source: edge.sourceNodeId,
    target: edge.targetNodeId,
    sourceHandle: edge.sourcePortId,
    targetHandle: edge.targetPortId,
  })),
)
const nodeOrder = computed(() => {
  try {
    return plan(workflow.value, registry, false).order
  } catch {
    return workflow.value.nodes
  }
})
const progress = computed(
  () =>
    Object.values(logs.value).filter((log) =>
      ['success', 'error', 'cancelled'].includes(log.status),
    ).length,
)
const portOptions = (direction: 'inputs' | 'outputs') =>
  computed(() =>
    workflow.value.nodes.flatMap((node) =>
      registry
        .get(node.toolId)
        [direction].filter(
          () => direction === 'outputs' || !node.toolId.startsWith('input.'),
        )
        .map((port) => ({
          value: JSON.stringify([node.id, port.id]),
          label: nodeLabel(node.id) + ' · ' + port.id + ' (' + port.type + ')',
        })),
    ),
  )
const sources = portOptions('outputs')
const targets = portOptions('inputs')
function nodeLabel(id: string) {
  const index = workflow.value.nodes.findIndex((node) => node.id === id)
  const node = workflow.value.nodes[index]
  return node ? index + 1 + '. ' + t(registry.get(node.toolId).name) : ''
}
function resetRun() {
  logs.value = Object.create(null)
  results.value = new Map()
  status.value = ''
  notice.value = ''
  error.value = ''
}
function resetDraft(draft: Workflow) {
  workflow.value = draft
  selected.value = draft.nodes[0]?.id ?? ''
  runtime.value = Object.create(null)
  source.value = ''
  target.value = ''
  resetRun()
}
onMounted(async () => {
  const id = typeof route.query.id === 'string' ? route.query.id : ''
  const template =
    typeof route.query.template === 'string' ? route.query.template : ''
  if (id) {
    busy.value = true
    try {
      const saved = await db.workflows.get(id)
      if (!saved) throw new ToolError('invalid-workflow')
      resetDraft(parseWorkflow(JSON.stringify(saved), registry))
    } catch (cause) {
      error.value = cause instanceof ToolError ? cause.code : 'storage'
    } finally {
      busy.value = false
    }
  } else if (template) {
    const draft = makeTemplate(
      template,
      t('template.' + template),
      t('templateDesc.' + template),
    )
    if (draft) resetDraft(draft)
    else error.value = 'invalid-workflow'
  }
})
onBeforeUnmount(() => controller.value?.abort())

function add(id: string, position?: { x: number; y: number }) {
  if (controller.value || busy.value) return
  if (workflow.value.nodes.length >= 100) {
    error.value = 'too-large'
    return
  }
  const tool = registry.get(id)
  const index = workflow.value.nodes.length
  const node = {
    id: uid(),
    toolId: id,
    toolVersion: tool.version,
    position: position ?? {
      x: (index % 3) * 210 + 24,
      y: Math.floor(index / 3) * 120 + 40,
    },
    config: { ...tool.defaults },
  } as Workflow['nodes'][number]
  workflow.value.nodes.push(node)
  selected.value = node.id
  resetRun()
}
function startDrag(event: DragEvent, id: string) {
  event.dataTransfer?.setData('application/x-toolchain-node', id)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copy'
}
function drop(event: DragEvent) {
  const id = event.dataTransfer?.getData('application/x-toolchain-node')
  const box = canvas.value?.getBoundingClientRect()
  if (!box || !id || !tools.some((tool) => tool.id === id)) return
  add(
    id,
    flow.value?.project({
      x: event.clientX - box.left,
      y: event.clientY - box.top,
    }),
  )
}
function move(event: NodeMouseEvent) {
  const node = workflow.value.nodes.find((item) => item.id === event.node.id)
  if (node) node.position = { ...event.node.position }
}
function remove() {
  const id = selected.value
  workflow.value.nodes = workflow.value.nodes.filter((node) => node.id !== id)
  workflow.value.edges = workflow.value.edges.filter(
    (edge) => edge.targetNodeId !== id && edge.sourceNodeId !== id,
  )
  delete runtime.value[id]
  selected.value = workflow.value.nodes[0]?.id ?? ''
  source.value = ''
  target.value = ''
  resetRun()
}
function connect(edge: Omit<WorkflowEdge, 'id'>) {
  if (controller.value || busy.value) return
  if (workflow.value.edges.length >= 400) {
    error.value = 'too-large'
    return
  }
  try {
    const edges = [...workflow.value.edges, { ...edge, id: uid() }]
    plan({ ...workflow.value, edges }, registry, false)
    workflow.value.edges = edges
    resetRun()
    source.value = ''
    target.value = ''
  } catch (cause) {
    error.value = errorCode(cause)
  }
}
function connectFlow(connection: Connection) {
  if (!connection.sourceHandle || !connection.targetHandle) return
  connect({
    sourceNodeId: connection.source,
    targetNodeId: connection.target,
    sourcePortId: connection.sourceHandle,
    targetPortId: connection.targetHandle,
  })
}
function connectSelect() {
  if (!source.value || !target.value) return
  const [sourceNodeId, sourcePortId] = JSON.parse(source.value) as [
    string,
    string,
  ]
  const [targetNodeId, targetPortId] = JSON.parse(target.value) as [
    string,
    string,
  ]
  connect({ sourceNodeId, sourcePortId, targetNodeId, targetPortId })
}
function unlink(id: string) {
  workflow.value.edges = workflow.value.edges.filter((edge) => edge.id !== id)
  resetRun()
}
function setInput(id: string, port: string, value: unknown) {
  ;(runtime.value[id] ??= {})[port] = value
  resetRun()
}
function setConfig(id: string, value: string | boolean | number) {
  if (selectedNode.value) selectedNode.value.config[id] = value
  resetRun()
}
function generate() {
  try {
    const draft = rulesParser.parse(prompt.value, t)
    if (
      draft &&
      (!workflow.value.nodes.length || window.confirm(t('replaceDraft')))
    )
      resetDraft(draft)
  } catch (cause) {
    error.value = errorCode(cause)
  }
}
async function save() {
  if (busy.value || controller.value) return
  error.value = ''
  notice.value = ''
  const parsed = workflowSchema.safeParse({
    ...toRaw(workflow.value),
    updatedAt: new Date().toISOString(),
  })
  if (!parsed.success) {
    error.value = 'invalid-workflow'
    return
  }
  if (new Blob([JSON.stringify(parsed.data)]).size > workflowJsonLimit) {
    error.value = 'too-large'
    return
  }
  busy.value = true
  try {
    await db.workflows.put(parsed.data)
    workflow.value.updatedAt = parsed.data.updatedAt
    notice.value = 'saved'
    await router.replace({ query: { id: parsed.data.id } })
  } catch {
    error.value = 'storage'
  } finally {
    busy.value = false
  }
}
async function execute() {
  if (busy.value || controller.value) return
  resetRun()
  if (!workflow.value.nodes.length) {
    error.value = 'empty-workflow'
    return
  }
  const abort = new AbortController()
  controller.value = abort
  try {
    const data = { ...runtime.value }
    for (const node of workflow.value.nodes.filter(
      (node) => node.toolId === 'input.text',
    )) {
      data[node.id] = { text: '', ...data[node.id] }
    }
    results.value = await runWorkflow(
      workflow.value,
      registry,
      data,
      abort.signal,
      (log) => {
        logs.value[log.nodeId] = log
      },
    )
    const final = [...workflow.value.nodes]
      .reverse()
      .find(
        (node) =>
          results.value.has(node.id) &&
          !workflow.value.edges.some((edge) => edge.sourceNodeId === node.id),
      )
    if (final) selected.value = final.id
    status.value = abort.signal.aborted
      ? 'stopped'
      : Object.values(logs.value).some((log) => log.status === 'error')
        ? 'failed'
        : 'complete'
  } catch (cause) {
    error.value = errorCode(cause)
    if (cause instanceof NodeError) {
      selected.value = cause.nodeId
      logs.value[cause.nodeId] = {
        nodeId: cause.nodeId,
        status: 'error',
        error: cause.code,
      }
    }
  } finally {
    controller.value = undefined
  }
}
</script>
<template>
  <section class="container editor-page section">
    <h1>{{ t('editor') }}</h1>
    <div class="editor-toolbar panel">
      <label
        ><span>{{ t('name') }}</span
        ><input
          v-model="workflow.name"
          :disabled="busy || !!controller"
          maxlength="120"
      /></label>
      <div class="actions">
        <button
          class="primary"
          type="button"
          :disabled="busy || !!controller"
          @click="execute"
        >
          <Play :size="16" aria-hidden="true" />{{ t('execute') }}
        </button>
        <button v-if="controller" type="button" @click="controller.abort()">
          {{ t('cancel') }}
        </button>
        <button type="button" :disabled="busy || !!controller" @click="save">
          <Save :size="16" aria-hidden="true" />{{ t('save') }}
        </button>
      </div>
    </div>
    <p v-if="notice" role="status">{{ t(notice) }}</p>
    <p v-if="error" class="error" role="alert">{{ describeError(error) }}</p>
    <details class="panel">
      <summary>
        <Sparkles :size="17" aria-hidden="true" />{{ t('generate') }}
      </summary>
      <form class="stack" @submit.prevent="generate">
        <label
          ><span>{{ t('prompt') }}</span
          ><input v-model="prompt" maxlength="240" required
        /></label>
        <p class="muted">{{ t('promptHint') }}</p>
        <button type="submit" :disabled="busy || !!controller">
          {{ t('generate') }}
        </button>
      </form>
    </details>
    <div class="editor-grid">
      <details class="panel library" open>
        <summary>{{ t('add') }}</summary>
        <div class="stack">
          <button
            v-for="tool in tools"
            :key="tool.id"
            type="button"
            :disabled="busy || !!controller"
            draggable="true"
            @dragstart="startDrag($event, tool.id)"
            @click="add(tool.id)"
          >
            <Plus :size="15" aria-hidden="true" />{{ t(tool.name) }}
          </button>
        </div>
      </details>
      <div class="canvas-wrap panel">
        <div
          ref="canvas"
          class="canvas"
          role="group"
          :aria-label="t('graph')"
          @dragover.prevent
          @drop.prevent="drop"
        >
          <VueFlow
            :nodes="flowNodes"
            :edges="flowEdges"
            :nodes-draggable="!controller && !busy"
            :nodes-connectable="!controller && !busy"
            :delete-key-code="null"
            @init="flow = $event"
            @node-click="selected = $event.node.id"
            @node-drag-stop="move"
            @connect="connectFlow"
          >
            <template #node-tool="node">
              <div class="flow-node" :class="{ active: selected === node.id }">
                <Handle
                  v-for="(port, index) in registry
                    .get(
                      workflow.nodes.find((item) => item.id === node.id)!
                        .toolId,
                    )
                    .inputs.filter((port) => !port.optional)"
                  :id="port.id"
                  :key="port.id"
                  type="target"
                  :position="Position.Left"
                  :style="{ top: 16 + index * 16 + 'px' }"
                  :title="port.id"
                />
                <strong>{{ node.label }}</strong>
                <span>{{ t(logs[node.id]?.status ?? 'idle') }}</span>
                <Handle
                  v-for="(port, index) in registry.get(
                    workflow.nodes.find((item) => item.id === node.id)!.toolId,
                  ).outputs"
                  :id="port.id"
                  :key="port.id"
                  type="source"
                  :position="Position.Right"
                  :style="{ top: 16 + index * 16 + 'px' }"
                  :title="port.id"
                />
              </div>
            </template>
          </VueFlow>
        </div>
        <div class="stack">
          <h2>{{ t('nodes') }}</h2>
          <ol class="node-list">
            <li v-for="node in nodeOrder" :key="node.id">
              <button
                type="button"
                :aria-pressed="selected === node.id"
                @click="selected = node.id"
              >
                {{ nodeLabel(node.id) }}
              </button>
            </li>
          </ol>
          <form
            v-if="targets.length && sources.length"
            class="connection-form"
            @submit.prevent="connectSelect"
          >
            <label
              ><span>{{ t('source') }}</span
              ><select v-model="source">
                <option value="">{{ t('choose') }}</option>
                <option
                  v-for="port in sources"
                  :key="port.value"
                  :value="port.value"
                >
                  {{ port.label }}
                </option>
              </select></label
            >
            <label
              ><span>{{ t('target') }}</span
              ><select v-model="target">
                <option value="">{{ t('choose') }}</option>
                <option
                  v-for="port in targets"
                  :key="port.value"
                  :value="port.value"
                >
                  {{ port.label }}
                </option>
              </select></label
            >
            <button
              type="submit"
              :disabled="busy || !!controller || !source || !target"
            >
              {{ t('connect') }}
            </button>
          </form>
          <details v-if="workflow.edges.length" open>
            <summary>{{ t('links') }}</summary>
            <ul class="stack">
              <li
                v-for="edge in workflow.edges"
                :key="edge.id"
                class="edge-item"
              >
                <span
                  >{{ nodeLabel(edge.sourceNodeId) }} ({{ edge.sourcePortId }})
                  → {{ nodeLabel(edge.targetNodeId) }} ({{
                    edge.targetPortId
                  }})</span
                >
                <button
                  type="button"
                  :disabled="!!controller"
                  :aria-label="t('unlink')"
                  @click="unlink(edge.id)"
                >
                  <Trash2 :size="15" aria-hidden="true" />
                </button>
              </li>
            </ul>
          </details>
        </div>
      </div>
      <details class="panel inspector" open>
        <summary>{{ t('config') }}</summary>
        <p v-if="!selectedNode">{{ t('selectNode') }}</p>
        <fieldset
          v-else-if="selectedTool"
          :key="selected"
          :disabled="busy || !!controller"
          class="stack"
        >
          <legend>{{ nodeLabel(selected) }}</legend>
          <p class="muted">{{ t(selectedTool.description) }}</p>
          <template v-if="selectedTool.id.startsWith('input.')">
            <ValueInput
              v-for="port in selectedTool.inputs"
              :key="port.id"
              :port="port"
              :label="t('runtime') + ' · ' + port.type"
              :value="runtime[selected]?.[port.id]"
              @change="setInput(selected, port.id, $event)"
            />
            <small class="muted">{{ t('limits') }}</small>
          </template>
          <ConfigFields
            :fields="selectedTool.fields"
            :config="selectedNode.config"
            @change="setConfig"
          />
          <button type="button" @click="remove">
            <Trash2 :size="15" aria-hidden="true" />{{ t('remove') }}
          </button>
        </fieldset>
      </details>
    </div>
    <section class="panel run-panel">
      <h2>{{ t('logs') }}</h2>
      <label v-if="controller || status"
        >{{ t('progress') }} {{ progress }}/{{ workflow.nodes.length
        }}<progress :value="progress" :max="workflow.nodes.length"
      /></label>
      <p v-if="status" role="status">{{ t(status) }}</p>
      <ul class="stack">
        <li
          v-for="log in Object.values(logs)"
          :key="log.nodeId"
          class="log-item"
        >
          <button
            type="button"
            :aria-pressed="selected === log.nodeId"
            @click="selected = log.nodeId"
          >
            {{ nodeLabel(log.nodeId) }}
          </button>
          <span>{{ t(log.status) }}</span>
          <span v-if="log.ms !== undefined">{{ log.ms.toFixed(1) }} ms</span>
          <span v-if="log.inputs || log.outputs"
            >{{ log.inputs?.join(', ') || '∅' }} →
            {{ log.outputs?.join(', ') || '∅' }}</span
          >
          <span v-if="log.bytes !== undefined"
            >{{ log.bytes }} {{ t('bytes') }}</span
          >
          <span v-if="log.error" class="error">{{
            describeError(log.error)
          }}</span>
        </li>
      </ul>
      <Results
        v-if="selectedResult && selectedTool"
        :key="selected"
        :values="selectedResult"
        :ports="selectedTool.outputs"
      />
    </section>
  </section>
</template>
