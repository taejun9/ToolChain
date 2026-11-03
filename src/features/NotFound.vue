<script setup lang="ts">
import { useI18n } from '../i18n'
const { t } = useI18n()
</script>
<template>
  <section class="container">
    <h1>{{ t('notFound') }}</h1>
    <RouterLink to="/tools">{{ t('browse') }}</RouterLink>
  </section>
</template>
