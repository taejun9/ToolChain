<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from '../i18n'
import { errorCode } from '../core/workflow'
import { db } from '../storage/db'
import { registry } from '../tools/registry'
import { openShared } from './sharing'

const route = useRoute()
const router = useRouter()
const { t, describeError } = useI18n()
const busy = ref(false)
const error = ref('')
const shared = computed(() => {
  try {
    return { workflow: openShared(route.hash) }
  } catch (cause) {
    return { error: errorCode(cause) }
  }
})
async function duplicate() {
  const workflow = shared.value.workflow
  if (!workflow || busy.value) return
  busy.value = true
  try {
    await db.workflows.add(workflow)
    await router.push({ path: '/editor', query: { id: workflow.id } })
  } catch {
    error.value = 'storage'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <section class="container section">
    <RouterLink class="back" to="/templates">← {{ t('templates') }}</RouterLink>
    <h1>{{ t('shared-template') }}</h1>
    <p v-if="shared.error" class="error" role="alert">
      {{ describeError(shared.error) }}
    </p>
    <div v-else-if="shared.workflow" class="panel stack">
      <h2>{{ shared.workflow.name }}</h2>
      <p v-if="shared.workflow.description">
        {{ shared.workflow.description }}
      </p>
      <ol class="template-steps">
        <li v-for="node in shared.workflow.nodes" :key="node.id">
          {{ t(registry.get(node.toolId).name) }}
        </li>
      </ol>
      <p>{{ t('share-review') }}</p>
      <div class="actions">
        <RouterLink
          class="button primary"
          :to="{ path: '/editor', hash: route.hash }"
          >{{ t('open') }}</RouterLink
        >
        <button type="button" :disabled="busy" @click="duplicate">
          {{ t('clone') }}
        </button>
      </div>
      <p v-if="error" class="error" role="alert">{{ describeError(error) }}</p>
    </div>
  </section>
</template>
