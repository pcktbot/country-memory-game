<template>
  <div class="splash">
    <h1 class="splash-title">Map Games</h1>
    <div class="splash-grid">
      <button class="splash-card" aria-label="Play Countries game" @click="router.push('/countries')">🌍 Countries</button>
      <button class="splash-card" aria-label="Play US States game" @click="router.push('/us')">🗺️ US States</button>
      <button class="splash-card" aria-label="Play India and China game" @click="router.push('/asia')">🌏 India & China</button>
      <button class="splash-card" aria-label="Play City Game" @click="router.push('/city')">📍 City Game</button>
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
  background: #0f0f1a;
}

.splash-title {
  font-size: 2rem;
  font-weight: 700;
  color: #ffffff;
  margin: 0;
  letter-spacing: 0.02em;
}

.splash-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  width: 100%;
  max-width: 480px;
}

.splash-card {
  min-height: 96px;
  font-size: 1.1rem;
  font-weight: 600;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.15);
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
  padding: 1rem;
  line-height: 1.4;
}

.splash-card:hover {
  background: rgba(255, 255, 255, 0.15);
}

.splash-card:active {
  transform: scale(0.97);
}

.splash-card:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.6);
  outline-offset: 3px;
}

@media (max-width: 360px) {
  .splash-grid {
    grid-template-columns: 1fr;
  }
}
</style>
