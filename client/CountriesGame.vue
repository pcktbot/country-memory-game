<template>
  <MapGame
    :items="countries"
    map-url="world.svg"
    completed-label="All countries completed!"
    :show-flag="true"
  />
</template>

<script setup lang="ts">
import MapGame from './MapGame.vue'
import { countries } from './countries'
</script>
