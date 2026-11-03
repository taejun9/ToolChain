<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from '../i18n'
import { clearData, type Preferences } from '../storage/db'
import { useSettings, defaults } from '../storage/settings'
const { t, describeError } = useI18n()
const settings = useSettings()
const usage = ref<number>()
const error = ref('')
const status = ref('')
const busy = ref(false)
async function estimate() {
  try {
    usage.value = (await navigator.storage?.estimate())?.usage
  } catch {
    usage.value = undefined
  }
}
onMounted(estimate)
async function update(changes: Partial<Preferences>) {
  try {
    error.value = ''
    await settings.update(changes)
  } catch {
    error.value = 'storage'
  }
}
async function reset() {
  if (busy.value || !window.confirm(t('confirmReset'))) return
  busy.value = true
  status.value = ''
  error.value = ''
  try {
    await clearData()
    settings.$patch(defaults())
    status.value = 'cleared'
    await estimate()
  } catch {
    error.value = 'storage'
  } finally {
    busy.value = false
  }
}
</script>
<template>
  <section class="container section">
    <h1>{{ t('settings') }}</h1>
    <fieldset class="panel stack" :disabled="busy">
      <legend>{{ t('settings') }}</legend>
      <label
        ><span>{{ t('language') }}</span
        ><select
          :value="settings.language"
          @change="
            update({
              language: ($event.target as HTMLSelectElement)
                .value as Preferences['language'],
            })
          "
        >
          <option value="en" lang="en">English</option>
          <option value="ko" lang="ko">한국어</option>
        </select></label
      >
      <label
        ><span>{{ t('theme') }}</span
        ><select
          :value="settings.theme"
          @change="
            update({
              theme: ($event.target as HTMLSelectElement)
                .value as Preferences['theme'],
            })
          "
        >
          <option
            v-for="theme in ['system', 'light', 'dark']"
            :key="theme"
            :value="theme"
          >
            {{ t(theme) }}
          </option>
        </select></label
      >
      <p>
        {{ t('storage') }} ·
        {{
          usage === undefined
            ? t('unavailable')
            : usage.toLocaleString() + ' ' + t('bytes')
        }}
      </p>
      <button type="button" @click="reset">{{ t('reset') }}</button>
      <p v-if="status" role="status">{{ t(status) }}</p>
      <p v-if="error" class="error" role="alert">{{ describeError(error) }}</p>
    </fieldset>
  </section>
</template>
