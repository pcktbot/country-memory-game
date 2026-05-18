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
      <button class="mode-button" @click="router.push('/city')">City Game</button>
    </div>

    <MapGame
      :key="activeMode.id"
      :items="activeMode.items"
      :map-url="activeMode.mapUrl"
      :completed-label="activeMode.completedLabel"
      :show-flag="activeMode.showFlag"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import MapGame from './MapGame.vue'
import { countries } from './countries'
import { states } from './states'

const router = useRouter()

interface SvgMode {
  id: string
  label: string
  mapUrl: string
  completedLabel: string
  showFlag: boolean
  items: { id: string; name: string; flag?: string | null }[]
}

const modes: SvgMode[] = [
  {
    id: 'countries',
    label: 'Countries',
    mapUrl: 'world.svg',
    completedLabel: 'All countries completed!',
    showFlag: true,
    items: countries
  },
  {
    id: 'states',
    label: 'US States',
    mapUrl: 'us.svg',
    completedLabel: 'All states completed!',
    showFlag: false,
    items: states
  }
]

const activeMode = ref<SvgMode>(modes[0])

function setMode(mode: SvgMode) {
  activeMode.value = mode
}
</script>
