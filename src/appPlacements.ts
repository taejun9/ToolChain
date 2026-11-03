import type { Component, InjectionKey } from 'vue'

export type Placement = 'home' | 'toolDetail' | 'templateCatalog'
export const adPlacements: InjectionKey<Partial<Record<Placement, Component>>> =
  Symbol('adPlacements')
