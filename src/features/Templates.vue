<script setup lang="ts">
import { computed, ref } from 'vue'
import { Copy, Play } from '@lucide/vue'
import { useI18n } from '../i18n'
import { makeTemplate, templates } from './templates'
import { registry } from '../tools/registry'
import { db } from '../storage/db'
import { useRouter } from 'vue-router'
const props = defineProps<{ id?: string }>()
const { t, describeError } = useI18n()
const router = useRouter()
const active = computed(() => templates.find((item) => item.id === props.id))
const category = ref('')
const error = ref('')
const busy = ref(false)
const categories = [...new Set(templates.map((item) => item.category))]
async function duplicate() {
  if (!active.value || busy.value) return
  busy.value = true
  error.value = ''
  try {
    const draft = makeTemplate(
      active.value.id,
      t(active.value.name),
      t(active.value.description),
    )!
    await db.workflows.add(draft)
    await router.push({ path: '/editor', query: { id: draft.id } })
  } catch {
    error.value = 'storage'
  } finally {
    busy.value = false
  }
}
</script>
<template>
  <section class="container section">
    <template v-if="active">
      <RouterLink class="back" to="/templates"
        >← {{ t('templates') }}</RouterLink
      >
      <h1>{{ t(active.name) }}</h1>
      <p>{{ t(active.description) }}</p>
      <div class="panel stack">
        <span class="eyebrow"
          >{{ t('cat.' + active.category) }} · {{ active.version }}</span
        >
        <ol class="template-steps">
          <li v-for="(node, index) in active.nodes" :key="index">
            {{ t(registry.get(node.tool).name) }}
          </li>
        </ol>
        <div class="actions">
          <RouterLink
            class="button primary"
            :to="{ path: '/editor', query: { template: active.id } }"
            ><Play :size="16" aria-hidden="true" />{{
              t('execute')
            }}</RouterLink
          >
          <button type="button" :disabled="busy" @click="duplicate">
            <Copy :size="16" aria-hidden="true" />{{ t('clone') }}
          </button>
        </div>
        <p v-if="error" role="alert">{{ describeError(error) }}</p>
      </div>
    </template>
    <h1 v-else-if="id">{{ t('notFound') }}</h1>
    <template v-else>
      <h1>{{ t('templates') }}</h1>
      <div class="pills">
        <button
          type="button"
          :aria-pressed="category === ''"
          @click="category = ''"
        >
          {{ t('all') }}
        </button>
        <button
          v-for="item in categories"
          :key="item"
          type="button"
          :aria-pressed="category === item"
          @click="category = item"
        >
          {{ t('cat.' + item) }}
        </button>
      </div>
      <div class="tiles">
        <RouterLink
          v-for="item in templates.filter(
            (template) => !category || template.category === category,
          )"
          :key="item.id"
          class="tile"
          :to="'/templates/' + item.id"
        >
          <span class="eyebrow">{{ t('cat.' + item.category) }}</span
          ><strong>{{ t(item.name) }}</strong
          ><span class="muted">{{ t(item.description) }}</span>
        </RouterLink>
      </div>
    </template>
  </section>
</template>
