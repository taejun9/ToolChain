<script setup lang="ts">
import type { Port } from '../core/tool'
const props = defineProps<{ port: Port; label: string; value?: unknown }>()
const fileName = (value: unknown): string =>
  Array.isArray(value)
    ? value.map(fileName).join(', ')
    : value instanceof File
      ? value.name
      : ''
const emit = defineEmits<{ change: [value: unknown] }>()
function file(event: Event) {
  const files = (event.target as HTMLInputElement).files
  emit(
    'change',
    props.port.type === 'file-list' ? Array.from(files ?? []) : files?.[0],
  )
}
</script>
<template>
  <label>
    <span>{{ label }}</span>
    <textarea
      v-if="['text', 'json', 'csv'].includes(port.type)"
      :value="typeof props.value === 'string' ? props.value : ''"
      rows="5"
      @input="emit('change', ($event.target as HTMLTextAreaElement).value)"
    />
    <input
      v-else
      type="file"
      :multiple="port.type === 'file-list'"
      :accept="
        port.type === 'image'
          ? 'image/png,image/jpeg,image/webp,image/gif,image/bmp,image/avif'
          : port.type === 'pdf'
            ? 'application/pdf,.pdf'
            : undefined
      "
      @change="file"
    />
    <small v-if="fileName(value)" class="muted">{{ fileName(value) }}</small>
  </label>
</template>
