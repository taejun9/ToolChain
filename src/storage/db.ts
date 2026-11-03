import Dexie, { type EntityTable } from 'dexie'
import type { Workflow } from '../core/workflow'

export interface Preferences {
  id: 'settings'
  schemaVersion: 1
  language: 'ko' | 'en'
  theme: 'system' | 'light' | 'dark'
  favorites: string[]
  recent: string[]
}
export const db = new Dexie('toolchain') as Dexie & {
  workflows: EntityTable<Workflow, 'id'>
  preferences: EntityTable<Preferences, 'id'>
}
db.version(1).stores({ workflows: 'id, updatedAt', preferences: 'id' })

export async function clearData() {
  await db.transaction('rw', db.workflows, db.preferences, async () => {
    await db.workflows.clear()
    await db.preferences.clear()
  })
}
