<script setup lang="ts">
import { computed, ref } from 'vue'
import { ArrowRight, Search, ShieldCheck, Zap, Layers } from '@lucide/vue'
import ToolCard from '../components/ToolCard.vue'
import { registry } from '../tools/registry'
import { useI18n } from '../i18n'
import { useSettings } from '../storage/settings'
import { templates } from './templates'
const props = defineProps<{ home?: boolean }>()
const { t } = useI18n()
const settings = useSettings()
const query = ref('')
const category = ref('')
const categories = [...new Set(registry.list().map((tool) => tool.category))]
const popular = [
  'image.resize',
  'json.format',
  'csv.to-json',
  'text.replace',
  'image.convert',
  'json.extract',
]
const results = computed(() =>
  props.home && !query.value.trim() && !category.value
    ? popular.map((id) => registry.get(id))
    : registry.search(query.value, t, category.value),
)
const favorites = computed(() =>
  registry.list().filter((tool) => settings.favorites.includes(tool.id)),
)
const recent = computed(() =>
  settings.recent.flatMap((id) =>
    registry.list().filter((tool) => tool.id === id),
  ),
)
const benefits = [
  { key: 'private', icon: ShieldCheck },
  { key: 'free', icon: Zap },
  { key: 'reusable', icon: Layers },
]
</script>
<template>
  <section v-if="home" class="hero">
    <div class="container hero-inner">
      <span class="eyebrow"
        ><ShieldCheck :size="16" aria-hidden="true" /> {{ t('private') }}</span
      >
      <h1>{{ t('hero') }}</h1>
      <p>{{ t('tagline') }}</p>
      <label class="search hero-search"
        ><Search :size="20" aria-hidden="true" /><input
          v-model="query"
          :aria-label="t('search')"
          :placeholder="t('search')"
          type="search"
      /></label>
      <RouterLink class="button primary" to="/editor"
        >{{ t('editor') }} <ArrowRight :size="16" aria-hidden="true"
      /></RouterLink>
    </div>
  </section>
  <section class="container section">
    <h1 v-if="!home">{{ t('tools') }}</h1>
    <h2 v-else>{{ t(query || category ? 'tools' : 'popular') }}</h2>
    <label v-if="!home" class="search"
      ><Search :size="20" aria-hidden="true" /><input
        v-model="query"
        :aria-label="t('search')"
        :placeholder="t('search')"
        type="search"
    /></label>
    <div class="pills" :aria-label="t('categories')">
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
    <div v-if="results.length" class="tiles">
      <ToolCard v-for="tool in results" :key="tool.id" :tool="tool" />
    </div>
    <p v-else role="status">{{ t('none') }}</p>
    <template v-if="!home && !query && !category">
      <section
        v-for="group in [
          { key: 'favorites', list: favorites },
          { key: 'recent', list: recent },
        ]"
        :key="group.key"
        class="section"
      >
        <template v-if="group.list.length">
          <h2>{{ t(group.key) }}</h2>
          <div class="tiles">
            <ToolCard v-for="tool in group.list" :key="tool.id" :tool="tool" />
          </div>
        </template>
      </section>
    </template>
  </section>
  <section v-if="home" class="container section">
    <h2>{{ t('templates') }}</h2>
    <div class="tiles">
      <RouterLink
        v-for="template in templates.slice(0, 3)"
        :key="template.id"
        class="tile"
        :to="'/templates/' + template.id"
      >
        <span class="eyebrow">{{ t('cat.' + template.category) }}</span
        ><strong>{{ t(template.name) }}</strong
        ><span class="muted">{{ t(template.description) }}</span>
      </RouterLink>
    </div>
    <div class="tiles section">
      <article v-for="item in benefits" :key="item.key" class="benefit">
        <component :is="item.icon" :size="22" aria-hidden="true" />
        <h3>{{ t(item.key) }}</h3>
        <p>{{ t(item.key + 'Desc') }}</p>
      </article>
    </div>
  </section>
</template>
