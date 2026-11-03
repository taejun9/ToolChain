import { defineStore } from 'pinia'
import { db, type Preferences } from './db'

export function defaults(): Preferences {
  return {
    id: 'settings',
    schemaVersion: 1,
    language: navigator.language.toLowerCase().startsWith('ko') ? 'ko' : 'en',
    theme: 'system',
    favorites: [],
    recent: [],
  }
}
export const useSettings = defineStore('settings', {
  state: defaults,
  actions: {
    async load() {
      const data = await db.preferences.get('settings')
      if (data) this.$patch(data)
    },
    async update(changes: Partial<Preferences>) {
      this.$patch(changes)
      await db.preferences.put({
        ...this.$state,
        favorites: [...this.favorites],
        recent: [...this.recent],
      })
    },
    async favorite(id: string) {
      await this.update({
        favorites: this.favorites.includes(id)
          ? this.favorites.filter((item) => item !== id)
          : [...this.favorites, id],
      })
    },
    async visited(id: string) {
      await this.update({
        recent: [id, ...this.recent.filter((item) => item !== id)].slice(0, 8),
      })
    },
  },
})
