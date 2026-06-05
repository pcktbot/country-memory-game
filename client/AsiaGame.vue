<template>
  <div class="asia-shell">
    <div class="mode-switcher">
      <span class="mode-label">Region</span>
      <button
        class="mode-button"
        :class="{ active: mode === 'india' }"
        @click="mode = 'india'"
      >India</button>
      <button
        class="mode-button"
        :class="{ active: mode === 'china' }"
        @click="mode = 'china'"
      >China</button>
    </div>
    <MapGame
      :key="mode"
      :items="mode === 'india' ? indiaStates : chinaProvinces"
      :map-url="mode === 'india' ? 'india.svg' : 'china.svg'"
      :completed-label="mode === 'india' ? 'All Indian states found!' : 'All Chinese provinces found!'"
      :show-flag="false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import MapGame from './MapGame.vue'
import { indiaStates } from './indiaStates'
import { chinaProvinces } from './chinaProvinces'

const mode = ref<'india' | 'china'>('india')
</script>

<style scoped>
.asia-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}
</style>
