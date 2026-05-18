<template>
  <div class="app-shell">
    <div class="mode-switcher">
      <span class="mode-label">Mode</span>
      <button
        v-for="mode in modes"
        :key="mode.id"
        class="mode-button"
        :class="{ active: mode.id === activeMode.id }"
        @click="setMode(mode)"
      >
        {{ mode.label }}
      </button>
    </div>

    <MapGame
      v-if="activeMode.type === 'svg'"
      :key="activeMode.id"
      :items="activeMode.items"
      :map-url="activeMode.mapUrl"
      :completed-label="activeMode.completedLabel"
      :show-flag="activeMode.showFlag"
    />
    <CityGame
      v-else-if="activeMode.type === 'city'"
      :key="activeMode.id"
      :scope="activeMode.scope"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import MapGame from './MapGame.vue';
import CityGame from './CityGame.vue';
import { countries } from './countries';
import { states } from './states';

interface SvgMode {
  id: string
  type: 'svg'
  label: string
  mapUrl: string
  completedLabel: string
  showFlag: boolean
  items: { id: string; name: string; flag?: string | null }[]
}

interface CityMode {
  id: string
  type: 'city'
  label: string
  scope: 'world' | 'us'
}

type GameMode = SvgMode | CityMode

const modes: GameMode[] = [
  {
    id: 'countries',
    type: 'svg',
    label: 'Countries',
    mapUrl: 'world.svg',
    completedLabel: 'All countries completed!',
    showFlag: true,
    items: countries
  },
  {
    id: 'states',
    type: 'svg',
    label: 'US States',
    mapUrl: 'us.svg',
    completedLabel: 'All states completed!',
    showFlag: false,
    items: states
  },
  {
    id: 'world-cities',
    type: 'city',
    label: 'World Cities',
    scope: 'world'
  },
  {
    id: 'us-cities',
    type: 'city',
    label: 'US Cities',
    scope: 'us'
  }
]

const activeMode = ref<GameMode>(modes[0])

const setMode = (mode: GameMode) => {
  activeMode.value = mode
}
</script>
