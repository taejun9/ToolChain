<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { Copy, Download } from '@lucide/vue'
import { useI18n } from '../i18n'
import type { Port, Values } from '../core/tool'
import { download } from '../utils'
const props = defineProps<{ values: Values; ports: Port[] }>()
const { t, describeError } = useI18n()
const urls = ref<Record<string, string>>({})
const status = ref('')
const error = ref('')
const isBlob = (value: unknown) => value instanceof Blob
function clear() {
  for (const url of Object.values(urls.value)) URL.revokeObjectURL(url)
}
watch(
  () => props.values,
  (values) => {
    clear()
    status.value = ''
    error.value = ''
    urls.value = Object.fromEntries(
      props.ports.flatMap((port) => {
        const value = values[port.id]
        return port.type === 'image' && value instanceof Blob
          ? [[port.id, URL.createObjectURL(value)]]
          : []
      }),
    )
  },
  { immediate: true },
)
onBeforeUnmount(clear)
const text = (value: unknown) =>
  typeof value === 'string' ? value : JSON.stringify(value, null, 2)
async function copy(value: unknown) {
  try {
    await navigator.clipboard.writeText(text(value))
    status.value = 'copied'
    error.value = ''
  } catch {
    error.value = 'processing'
    status.value = ''
  }
}
function save(value: unknown, port: Port) {
  if (value instanceof Blob) {
    download(
      value,
      value instanceof File
        ? value.name
        : 'result.' + (value.type.split('/')[1] || 'bin'),
    )
  } else {
    const extension = port.type === 'text' ? 'txt' : 'json'
    download(
      new Blob([text(value)], {
        type: extension === 'json' ? 'application/json' : 'text/plain',
      }),
      'result.' + extension,
    )
  }
}
</script>
<template>
  <section class="results">
    <h2>{{ t('output') }}</h2>
    <article
      v-for="port in ports.filter((port) => Object.hasOwn(values, port.id))"
      :key="port.id"
      class="result"
    >
      <span class="eyebrow">{{ port.type }}</span>
      <img v-if="urls[port.id]" :src="urls[port.id]" :alt="t('output')" />
      <p v-else-if="isBlob(values[port.id])">
        {{ (values[port.id] as File).name || t('file') }} ·
        {{ (values[port.id] as Blob).size }} {{ t('bytes') }}
      </p>
      <pre v-else>{{ text(values[port.id]).slice(0, 12000) }}</pre>
      <div class="actions">
        <button
          v-if="!isBlob(values[port.id])"
          type="button"
          @click="copy(values[port.id])"
        >
          <Copy :size="15" aria-hidden="true" />{{ t('copy') }}
        </button>
        <button type="button" @click="save(values[port.id], port)">
          <Download :size="15" aria-hidden="true" />{{ t('download') }}
        </button>
      </div>
    </article>
    <p v-if="status" role="status">{{ t(status) }}</p>
    <p v-if="error" role="alert">{{ describeError(error) }}</p>
  </section>
</template>
