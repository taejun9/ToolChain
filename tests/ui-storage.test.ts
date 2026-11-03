import 'fake-indexeddb/auto'
import { afterEach, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { clearData, db } from '../src/storage/db'
import { useSettings } from '../src/storage/settings'
import { makeTemplate } from '../src/features/templates'
import ConfigFields from '../src/components/ConfigFields.vue'

afterEach(async () => {
  await clearData()
})
it('persists settings, favorites, recent history and workflow definitions', async () => {
  const settings = useSettings(createPinia())
  await settings.update({ theme: 'dark', language: 'ko' })
  await settings.favorite('json.parse')
  await settings.visited('json.parse')
  await settings.visited('json.parse')
  const workflow = makeTemplate('formatter', 'Local JSON')!
  await db.workflows.add(workflow)
  const reloaded = useSettings(createPinia())
  await reloaded.load()
  expect(reloaded.$state).toMatchObject({
    schemaVersion: 1,
    theme: 'dark',
    language: 'ko',
    favorites: ['json.parse'],
    recent: ['json.parse'],
  })
  expect(await db.workflows.get(workflow.id)).toEqual(workflow)
  await clearData()
  expect(await db.workflows.count()).toBe(0)
  expect(await db.preferences.count()).toBe(0)
})
it('configuration labels are associated with inputs and emit typed values', async () => {
  const pinia = createPinia()
  setActivePinia(pinia)
  const wrapper = mount(ConfigFields, {
    global: { plugins: [pinia] },
    props: {
      fields: [{ id: 'width', kind: 'number' }],
      config: { width: 1200 },
    },
  })
  expect(wrapper.get('label').text()).toContain('Width (px)')
  await wrapper.get('input').setValue('800')
  expect(wrapper.emitted('change')).toEqual([['width', 800]])
  wrapper.unmount()
})
