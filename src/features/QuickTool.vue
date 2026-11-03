<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowReactive,
  shallowRef,
} from 'vue'
import { Play, Star } from '@lucide/vue'
import ConfigFields from '../components/ConfigFields.vue'
import ValueInput from '../components/ValueInput.vue'
import Results from '../components/Results.vue'
import ToolCard from '../components/ToolCard.vue'
import { ToolError, type Values } from '../core/tool'
import { errorCode } from '../core/workflow'
import { registry } from '../tools/registry'
import { useI18n } from '../i18n'
import { useSettings } from '../storage/settings'
const props = defineProps<{ id: string }>()
const { t, describeError } = useI18n()
const settings = useSettings()
const tool = registry.list().find((item) => item.id === props.id)
const inputs = shallowReactive<Values>(
  Object.fromEntries(
    (tool?.inputs ?? [])
      .filter((port) => port.type === 'text')
      .map((port) => [port.id, '']),
  ),
)
const config = ref({ ...tool?.defaults })
const result = shallowRef<Values>()
const controller = shallowRef<AbortController>()
const error = ref('')
const status = ref('')
const notice = ref('')
const starred = computed(() => settings.favorites.includes(props.id))
const related = tool
  ? registry
      .list()
      .filter((item) => item.category === tool.category && item.id !== tool.id)
  : []
const examples: Record<string, [string, string]> = {
  'input.files': ['one.txt, two.txt', 'one.txt, two.txt'],
  'input.pdf': ['book.pdf', 'book.pdf'],
  'pdf.merge': ['chapter1.pdf, chapter2.pdf', 'merged.pdf'],
  'pdf.extract': ['book.pdf · 1–1', 'pages.pdf'],
  'zip.pack': ['one.txt, two.txt', 'archive.zip'],
  'zip.unpack': ['archive.zip', 'one.txt, two.txt'],
  'flow.condition': ['yes', 'match → yes'],
  'input.text': ['hello', 'hello'],
  'text.replace': ['old idea', 'new idea'],
  'text.split': ['a,b,c', '["a","b","c"]'],
  'json.parse': ['{"name":"Ada"}', '{"name":"Ada"}'],
  'json.format': ['{"name":"Ada"}', '{\n  "name": "Ada"\n}'],
  'json.extract': ['{"name":"Ada"}', 'Ada'],
  'csv.parse': ['name,city\nAda,Seoul', '[["name","city"],["Ada","Seoul"]]'],
  'csv.to-json': ['name,city\nAda,Seoul', '[{"name":"Ada","city":"Seoul"}]'],
  'image.resize': ['2400 × 1600 PNG', '1200 × 800 PNG'],
  'image.convert': ['photo.png', 'photo.webp'],
  'input.image': ['photo.png', 'photo.png'],
  'input.file': ['notes.txt', 'notes.txt'],
  'output.text': ['hello', 'hello'],
  'file.download': ['notes.txt', 'notes.txt'],
}
onMounted(() => {
  if (tool)
    settings.visited(tool.id).catch(() => {
      notice.value = 'storage'
    })
})
onBeforeUnmount(() => controller.value?.abort())
async function favorite() {
  try {
    await settings.favorite(props.id)
    notice.value = ''
  } catch {
    notice.value = 'storage'
  }
}
async function execute() {
  if (!tool || controller.value) return
  const abort = new AbortController()
  controller.value = abort
  error.value = ''
  status.value = ''
  result.value = undefined
  try {
    const values = { ...inputs }
    for (const port of tool.inputs) {
      const value = values[port.id]
      if (typeof value === 'string' && value.length > 5_000_000)
        throw new ToolError('too-large')
      if (port.type === 'json') {
        values[port.id] = (
          await registry.run(
            'json.parse',
            { text: value ?? '' },
            {},
            abort.signal,
          )
        ).json
      }
      if (port.type === 'csv') {
        values[port.id] = (
          await registry.run(
            'csv.parse',
            { text: value ?? '' },
            { delimiter: '' },
            abort.signal,
          )
        ).csv
      }
    }
    result.value = await registry.run(
      tool.id,
      values,
      config.value,
      abort.signal,
    )
    status.value = 'complete'
  } catch (cause) {
    if (abort.signal.aborted) status.value = 'stopped'
    else error.value = errorCode(cause)
  } finally {
    controller.value = undefined
  }
}
</script>
<template>
  <section v-if="tool" class="container section">
    <RouterLink class="back" to="/tools">← {{ t('tools') }}</RouterLink>
    <div class="page-title">
      <div>
        <span class="eyebrow">{{ t('cat.' + tool.category) }}</span>
        <h1>{{ t(tool.name) }}</h1>
        <p>{{ t(tool.description) }}</p>
      </div>
      <button type="button" :aria-pressed="starred" @click="favorite">
        <Star :size="17" aria-hidden="true" />{{
          t(starred ? 'unfavorite' : 'favorite')
        }}
      </button>
    </div>
    <p v-if="notice" role="alert">{{ describeError(notice) }}</p>
    <form class="panel stack" @submit.prevent="execute">
      <fieldset :disabled="!!controller" class="stack">
        <legend>{{ t('input') }}</legend>
        <ValueInput
          v-for="port in tool.inputs"
          :key="port.id"
          :port="port"
          :label="t('input') + ' · ' + port.type"
          :value="inputs[port.id]"
          @change="inputs[port.id] = $event"
        />
        <small class="muted">{{ t('limits') }}</small>
      </fieldset>
      <fieldset
        v-if="tool.fields.length"
        :disabled="!!controller"
        class="stack"
      >
        <legend>{{ t('config') }}</legend>
        <ConfigFields
          :fields="tool.fields"
          :config="config"
          @change="(id, value) => (config[id] = value)"
        />
      </fieldset>
      <div class="actions">
        <button class="primary" type="submit" :disabled="!!controller">
          <Play :size="16" aria-hidden="true" />{{ t('execute') }}
        </button>
        <button v-if="controller" type="button" @click="controller.abort()">
          {{ t('cancel') }}
        </button>
      </div>
      <p v-if="error" class="error" role="alert">{{ describeError(error) }}</p>
      <p v-if="status" role="status">{{ t(status) }}</p>
    </form>
    <Results v-if="result" :values="result" :ports="tool.outputs" />
    <section class="section">
      <h2>{{ t('usage') }}</h2>
      <p>{{ t('usageText') }}</p>
      <h3>{{ t('example') }}</h3>
      <div class="example-grid">
        <div>
          {{ t('input') }}
          <pre>{{ examples[id][0] }}</pre>
        </div>
        <div>
          {{ t('output') }}
          <pre>{{ examples[id][1] }}</pre>
        </div>
      </div>
      <h3>{{ t('faq') }}</h3>
      <details>
        <summary>{{ t('faqQuestion') }}</summary>
        <p>{{ t('privateDesc') }}</p>
      </details>
      <h3>{{ t('related') }}</h3>
      <div class="tiles">
        <ToolCard
          v-for="item in related.length ? related : registry.list().slice(0, 3)"
          :key="item.id"
          :tool="item"
        />
      </div>
    </section>
  </section>
  <section v-else class="container section">
    <h1>{{ t('notFound') }}</h1>
  </section>
</template>
