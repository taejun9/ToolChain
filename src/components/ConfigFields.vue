<script setup lang="ts">
import { useId } from 'vue'
import { Label } from 'reka-ui'
import { useI18n } from '../i18n'
import type { Field, Values } from '../core/tool'
defineProps<{ fields: Field[]; config: Values }>()
const emit = defineEmits<{
  change: [id: string, value: string | boolean | number]
}>()
const { t } = useI18n()
const prefix = useId()
function update(field: Field, event: Event) {
  const input = event.target as HTMLInputElement
  emit(
    'change',
    field.id,
    field.kind === 'boolean'
      ? input.checked
      : field.kind === 'number' && input.value !== ''
        ? input.valueAsNumber
        : input.value,
  )
}
</script>
<template>
  <div
    v-for="field in fields"
    :key="field.id"
    class="config-field"
    :class="{ check: field.kind === 'boolean' }"
  >
    <Label :for="prefix + field.id"
      ><span>{{ t('field.' + field.id) }}</span></Label
    >
    <select
      v-if="field.kind === 'select'"
      :id="prefix + field.id"
      :value="config[field.id]"
      @change="update(field, $event)"
    >
      <option v-for="option in field.options" :key="option" :value="option">
        {{ option === '' ? t('auto') : option === '\t' ? t('tab') : option }}
      </option>
    </select>
    <input
      v-else-if="field.kind === 'boolean'"
      :id="prefix + field.id"
      type="checkbox"
      :checked="Boolean(config[field.id])"
      @change="update(field, $event)"
    />
    <input
      v-else
      :id="prefix + field.id"
      :type="field.kind"
      :value="config[field.id]"
      :step="field.step"
      @input="update(field, $event)"
    />
  </div>
</template>
