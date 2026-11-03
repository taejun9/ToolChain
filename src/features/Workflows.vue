<script setup lang="ts">
import { onMounted, ref, shallowRef } from 'vue'
import { useI18n } from '../i18n'
import { db } from '../storage/db'
import { ToolError } from '../core/tool'
import {
  parseWorkflow,
  uid,
  workflowJsonLimit,
  type Workflow,
} from '../core/workflow'
import { registry } from '../tools/registry'
import { download } from '../utils'
const { t, describeError } = useI18n()
const items = shallowRef<Workflow[]>([])
const busy = ref(false)
const error = ref('')
const editing = ref('')
const name = ref('')
async function refresh() {
  items.value = await db.workflows.orderBy('updatedAt').reverse().toArray()
}
async function action(operation: () => Promise<unknown>) {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    await operation()
    await refresh()
  } catch (cause) {
    error.value = cause instanceof ToolError ? cause.code : 'storage'
  } finally {
    busy.value = false
  }
}
onMounted(() => action(async () => {}))
function copy(item: Workflow, name = item.name) {
  const now = new Date().toISOString()
  return db.workflows.add({
    ...item,
    name,
    id: uid(),
    createdAt: now,
    updatedAt: now,
  })
}
function editName(item: Workflow) {
  editing.value = item.id
  name.value = item.name
}
function rename(item: Workflow) {
  return action(async () => {
    if (!name.value.trim()) throw new ToolError('invalid-workflow')
    await db.workflows.update(item.id, {
      name: name.value.trim(),
      updatedAt: new Date().toISOString(),
    })
    editing.value = ''
  })
}
function remove(item: Workflow) {
  if (window.confirm(t('confirmDelete')))
    return action(() => db.workflows.delete(item.id))
}
function importFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (file)
    return action(async () => {
      if (file.size > workflowJsonLimit) throw new ToolError('too-large')
      const parsed = parseWorkflow(await file.text(), registry)
      await copy(parsed)
    })
}
function exportFile(item: Workflow) {
  download(
    new Blob([JSON.stringify(item)], { type: 'application/json' }),
    'workflow-' + item.id + '.json',
  )
}
</script>
<template>
  <section class="container section">
    <div class="page-title">
      <h1>{{ t('workflows') }}</h1>
      <RouterLink class="button primary" to="/editor">{{
        t('new')
      }}</RouterLink>
    </div>
    <div class="panel">
      <label
        ><span>{{ t('import') }}</span
        ><input
          :disabled="busy"
          type="file"
          accept=".json,application/json"
          @change="importFile"
      /></label>
    </div>
    <p v-if="error" class="error" role="alert">{{ describeError(error) }}</p>
    <p v-if="!items.length && !busy" role="status">{{ t('empty') }}</p>
    <article
      v-for="item in items"
      :key="item.id"
      class="panel stack saved-workflow"
    >
      <form
        v-if="editing === item.id"
        class="stack"
        @submit.prevent="rename(item)"
      >
        <label
          ><span>{{ t('name') }}</span
          ><input v-model="name" maxlength="120" required
        /></label>
        <div class="actions">
          <button :disabled="busy" type="submit">{{ t('save') }}</button
          ><button type="button" @click="editing = ''">
            {{ t('cancel') }}
          </button>
        </div>
      </form>
      <h2 v-else>{{ item.name }}</h2>
      <p class="muted">
        {{ item.nodes.length }} {{ t('nodes') }} ·
        {{ new Date(item.updatedAt).toLocaleString() }}
      </p>
      <div class="actions">
        <RouterLink
          class="button primary"
          :to="{ path: '/editor', query: { id: item.id } }"
          >{{ t('open') }}</RouterLink
        >
        <button type="button" :disabled="busy" @click="editName(item)">
          {{ t('rename') }}
        </button>
        <button
          type="button"
          :disabled="busy"
          @click="action(() => copy(item))"
        >
          {{ t('clone') }}
        </button>
        <button type="button" @click="exportFile(item)">
          {{ t('export') }}
        </button>
        <button type="button" :disabled="busy" @click="remove(item)">
          {{ t('delete') }}
        </button>
      </div>
    </article>
  </section>
</template>
