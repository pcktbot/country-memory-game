<template>
  <MapGame
    :items="states"
    map-url="us.svg"
    completed-label="All states completed!"
    :show-flag="false"
  />
</template>

<script setup lang="ts">
import MapGame from './MapGame.vue'
import { states } from './states'
</script>
