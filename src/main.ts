import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import { useSettings } from './storage/settings'
import './style.css'

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    {
      path: '/',
      component: () => import('./features/Catalog.vue'),
      props: { home: true },
    },
    { path: '/tools', component: () => import('./features/Catalog.vue') },
    {
      path: '/tools/:id',
      component: () => import('./features/QuickTool.vue'),
      props: true,
    },
    { path: '/editor', component: () => import('./features/Editor.vue') },
    {
      path: '/templates/shared',
      component: () => import('./features/SharedTemplate.vue'),
    },
    {
      path: '/templates/:id?',
      component: () => import('./features/Templates.vue'),
      props: true,
    },
    { path: '/workflows', component: () => import('./features/Workflows.vue') },
    { path: '/settings', component: () => import('./features/Settings.vue') },
    {
      path: '/:pathMatch(.*)*',
      component: () => import('./features/NotFound.vue'),
    },
  ],
})
const pinia = createPinia()
const app = createApp(App).use(pinia).use(router)
useSettings(pinia)
  .load()
  .catch(() => {
    /* Settings UI can report subsequent storage failures. */
  })
  .finally(() => app.mount('#app'))
