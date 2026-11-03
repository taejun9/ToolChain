<script setup lang="ts">
import {
  ArrowUpRight,
  Braces,
  File,
  Image,
  Type,
  Table,
  ArrowDownToLine,
  ArrowUpFromLine,
} from '@lucide/vue'
import type { Tool } from '../core/tool'
import { useI18n } from '../i18n'
defineProps<{ tool: Tool }>()
const { t } = useI18n()
const icons = {
  json: Braces,
  file: File,
  image: Image,
  text: Type,
  csv: Table,
  output: ArrowDownToLine,
  input: ArrowUpFromLine,
}
</script>
<template>
  <RouterLink :to="'/tools/' + tool.id" class="tile">
    <span class="tile-top"
      ><span class="icon-box"
        ><component
          :is="icons[tool.category as keyof typeof icons]"
          :size="21"
          aria-hidden="true" /></span
      ><ArrowUpRight :size="16" aria-hidden="true"
    /></span>
    <strong>{{ t(tool.name) }}</strong>
    <span class="muted">{{ t(tool.description) }}</span>
  </RouterLink>
</template>
