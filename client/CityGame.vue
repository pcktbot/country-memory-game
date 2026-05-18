<template>
  <div class="city-map-container" ref="mapContainer" />

  <div v-if="mapReady" class="city-panel">
    <div class="city-nav">
      <button class="city-back-btn" @click="router.push('/')">← Back</button>
    </div>

    <!-- Guessing phase -->
    <template v-if="phase === 'guessing'">
      <div class="city-prompt">
        <span class="city-name">{{ currentCity.name }}</span>
        <span :class="['difficulty-badge', currentCity.difficulty]">
          {{ currentCity.difficulty }}
        </span>
      </div>
      <div class="city-hint">Click the map to place your guess, then confirm.</div>
      <div class="city-actions">
        <button
          class="button"
          style="width: 100%; padding: 0.7em;"
          :disabled="!guessLngLat"
          @click="confirmGuess"
        >
          {{ guessLngLat ? 'Confirm Guess' : 'Place a pin first' }}
        </button>
      </div>
    </template>

    <!-- Reveal phase -->
    <template v-else-if="phase === 'revealing'">
      <div class="city-prompt">
        <span class="city-name">{{ currentCity.name }}</span>
        <span class="city-round-score" style="font-size:1.1em;">
          +{{ lastRoundScore }} pts
        </span>
      </div>
      <div class="city-hint">
        {{ lastDistanceKm !== null ? `${Math.round(lastDistanceKm).toLocaleString()} km away` : '' }}
      </div>
      <div class="city-actions">
        <button class="button" style="width: 100%; padding: 0.7em;" @click="advance">
          {{ roundIndex < cities.length - 1 ? 'Next City →' : 'See Results' }}
        </button>
      </div>
    </template>

    <!-- Complete -->
    <template v-else-if="phase === 'complete'">
      <div class="city-complete">
        <h2>Round Complete!</h2>
        <p>Final score: {{ totalScore }} / 1000</p>
        <div class="city-complete-buttons">
          <template v-if="isRandom">
            <button class="button" style="padding: 0.6em 1.5em;" @click="restart(false)">
              Play Daily
            </button>
            <button class="button" style="padding: 0.6em 1.5em;" @click="restart(true)">
              Play Again
            </button>
          </template>
          <template v-else>
            <span class="city-tomorrow">Come back tomorrow!</span>
            <button class="button" style="padding: 0.6em 1.5em;" @click="restart(true)">
              Random Round
            </button>
          </template>
        </div>
      </div>
    </template>

    <!-- Round score cells (shown in all phases) -->
    <div class="city-rounds">
      <div
        v-for="(city, i) in cities"
        :key="city.id"
        :class="['city-round-cell', { active: i === roundIndex && phase !== 'complete' }]"
      >
        <template v-if="rounds[i] !== undefined">
          <div class="city-round-score">{{ rounds[i] }}</div>
          <div class="city-round-total">/ {{ maxPts(city.difficulty) }}</div>
        </template>
        <template v-else>
          <span :class="['difficulty-badge', city.difficulty]" style="font-size:0.65em;">
            {{ city.difficulty[0].toUpperCase() }}
          </span>
        </template>
      </div>
    </div>

    <div v-if="phase === 'complete'" class="city-total-row">
      <span>Total</span>
      <span>{{ totalScore }} / 1000</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useMapboxCity } from './useMapboxCity'
import { selectDailyCities, selectRandomCities } from './citySeeding'
import { haversineKm, calculateScore } from './cityScoring'
import { worldCities, usCities } from './cities'
import type { City } from './cities'
import type { Difficulty } from './cityScoring'
import { loadDailyGame, saveDailyGame, type GamePhase } from './cityGameStorage'

const router = useRouter()
const route = useRoute()

const token = import.meta.env.VITE_MAPBOX_TOKEN as string
const base = import.meta.env.BASE_URL

const mapContainer = ref<HTMLElement | null>(null)
const { mapReady, init, onMapClick, setGuessPin, revealRound, setDistanceLabelText, resetForNextRound, destroy } =
  useMapboxCity(mapContainer, token, base)

const pool: City[] = [...worldCities, ...usCities]

const cities = ref<City[]>([])
const roundIndex = ref(0)
const guessLngLat = ref<[number, number] | null>(null)
const phase = ref<GamePhase>('guessing')
const rounds = ref<number[]>([])
const lastRoundScore = ref(0)
const lastDistanceKm = ref<number | null>(null)
const isRandom = ref(false)

const currentCity = computed(() => cities.value[roundIndex.value])
const totalScore = computed(() => rounds.value.reduce((a, b) => a + b, 0))

const MAX_PTS: Record<Difficulty, number> = { easy: 150, moderate: 250, hard: 350 }
function maxPts(d: Difficulty) { return MAX_PTS[d] }

function saveState() {
  if (isRandom.value) return
  const today = new Date().toISOString().slice(0, 10)
  saveDailyGame({
    date: today,
    cityIds: cities.value.map(c => c.id),
    rounds: rounds.value,
    roundIndex: roundIndex.value,
    phase: phase.value
  })
}

function startFresh(random: boolean) {
  const today = new Date().toISOString().slice(0, 10)
  isRandom.value = random
  cities.value = random ? selectRandomCities(pool) : selectDailyCities(pool, today)
  roundIndex.value = 0
  guessLngLat.value = null
  phase.value = 'guessing'
  rounds.value = []
  lastRoundScore.value = 0
  lastDistanceKm.value = null
  saveState()
}

async function confirmGuess() {
  if (phase.value !== 'guessing') return
  if (!guessLngLat.value || !currentCity.value) return
  phase.value = 'revealing'

  const city = currentCity.value
  const guess = guessLngLat.value
  const distKm = haversineKm(guess[1], guess[0], city.lat, city.lng)
  const score = calculateScore(city.difficulty, distKm)

  lastDistanceKm.value = distKm
  lastRoundScore.value = score
  rounds.value = [...rounds.value, score]

  await revealRound(city, guess)
  setDistanceLabelText(`${Math.round(distKm).toLocaleString()} km`)
}

function advance() {
  if (roundIndex.value < cities.value.length - 1) {
    roundIndex.value++
    guessLngLat.value = null
    phase.value = 'guessing'
    resetForNextRound()
  } else {
    phase.value = 'complete'
    resetForNextRound()
  }
  saveState()
}

function restart(random: boolean) {
  router.replace({ path: '/city', query: random ? { random: '1' } : {} })
  startFresh(random)
}

onMounted(() => {
  const today = new Date().toISOString().slice(0, 10)
  const randomParam = route.query.random === '1'

  if (!randomParam) {
    const saved = loadDailyGame(today)
    if (saved) {
      const restored = saved.cityIds
        .map(id => pool.find(c => c.id === id))
        .filter((c): c is City => c !== undefined)
      if (restored.length === saved.cityIds.length) {
        isRandom.value = false
        cities.value = restored
        rounds.value = saved.rounds
        roundIndex.value = saved.roundIndex
        phase.value = saved.phase === 'revealing' ? 'guessing' : saved.phase
        lastRoundScore.value = saved.rounds[saved.roundIndex - 1] ?? 0
      } else {
        startFresh(false)
      }
    } else {
      startFresh(false)
    }
  } else {
    startFresh(true)
  }

  init()
  onMapClick(lngLat => {
    if (phase.value !== 'guessing') return
    guessLngLat.value = lngLat
    setGuessPin(lngLat)
  })
})

onUnmounted(() => destroy())
</script>
