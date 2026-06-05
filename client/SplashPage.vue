<template>
  <div class="splash">
    <h1 class="splash-title">Map Games</h1>
    <div class="splash-grid">
      <button class="splash-card" aria-label="Play Countries game" @click="router.push('/countries')">Countries</button>
      <button class="splash-card" aria-label="Play US States game" @click="router.push('/us')">US States</button>
      <button class="splash-card" aria-label="Play India and China game" @click="router.push('/asia')">India & China</button>
      <button class="splash-card" aria-label="Play City Game" @click="router.push('/city')">City Game</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
const router = useRouter()
</script>

<style scoped>
.splash {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 2rem;
  gap: 2rem;
  background: var(--white);
}

.splash-title {
  font-size: 2rem;
  font-weight: 700;
  color: var(--black);
  margin: 0;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.splash-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5px;
  width: 100%;
  max-width: 480px;
  border: 0.5px solid var(--black);
}

.splash-card {
  min-height: 96px;
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  background: var(--black);
  color: var(--white);
  border: none;
  cursor: pointer;
  transition: opacity 0.15s;
  padding: 1rem;
  font-family: inherit;
}

.splash-card:hover {
  opacity: 0.8;
}

.splash-card:active {
  opacity: 0.6;
}

.splash-card:focus-visible {
  outline: 2px solid var(--black);
  outline-offset: 3px;
}

@media (max-width: 360px) {
  .splash-grid {
    grid-template-columns: 1fr;
  }
}
</style>
