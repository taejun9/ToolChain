<script setup lang="ts">
import type { Port } from '../core/tool'
const props = defineProps<{ port: Port; label: string; value?: unknown }>()
const fileName = (value: unknown) => (value instanceof File ? value.name : '')
const emit = defineEmits<{ change: [value: unknown] }>()
function file(event: Event) {
  emit('change', (event.target as HTMLInputElement).files?.[0])
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
      :accept="
        port.type === 'image'
          ? 'image/png,image/jpeg,image/webp,image/gif,image/bmp,image/avif'
          : undefined
      "
      @change="file"
    />
    <small v-if="fileName(value)" class="muted">{{ fileName(value) }}</small>
  </label>
</template>
