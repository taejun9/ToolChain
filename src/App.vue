<script setup lang="ts">
import { computed, inject, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import { Workflow } from '@lucide/vue'
import { useSettings } from './storage/settings'
import { adPlacements } from './appPlacements'
import { useI18n } from './i18n'
const { t, locale } = useI18n()
const settings = useSettings()
const route = useRoute()
const placements = inject(adPlacements, {})
const advertisement = computed(() => {
  if (route.path === '/') return placements.home
  if (route.path.startsWith('/tools/')) return placements.toolDetail
  if (route.path === '/templates') return placements.templateCatalog
  return undefined
})
const navigation = ['tools', 'editor', 'templates', 'workflows', 'settings']
watchEffect(() => {
  document.documentElement.lang = locale.value
  document.documentElement.dataset.theme = settings.theme
  const section = route.path.split('/')[1]
  const id = route.params.id
  const title =
    section === 'tools' && typeof id === 'string'
      ? t('tool.' + id)
      : t(section || 'hero')
  document.title = title + ' | ToolChain'
  const description =
    section === 'tools' && typeof id === 'string'
      ? t('desc.' + id)
      : t('tagline')
  document
    .querySelector('meta[name="description"]')
    ?.setAttribute('content', description)
})
</script>

<template>
  <a class="skip" href="#content">{{ t('skip') }}</a>
  <header class="site-header">
    <div class="header-inner">
      <RouterLink class="brand" to="/"
        ><Workflow :size="22" aria-hidden="true" /> ToolChain</RouterLink
      >
      <nav :aria-label="t('home')">
        <RouterLink
          v-for="section in navigation"
          :key="section"
          :to="'/' + section"
          >{{ t(section) }}</RouterLink
        >
      </nav>
    </div>
  </header>
  <main id="content" tabindex="-1">
    <RouterView :key="route.path" />
    <component :is="advertisement" v-if="advertisement" />
  </main>
  <footer class="site-footer">
    <span class="brand">ToolChain</span><span>{{ t('private') }}</span>
  </footer>
</template>
