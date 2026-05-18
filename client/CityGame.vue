<template>
  <div class="city-map-container" ref="mapContainer" />

  <div v-if="mapReady" class="city-panel">
    <!-- Active round: guessing phase -->
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
          <button class="button" style="padding: 0.6em 1.5em;" @click="restart(false)">
            Play Again
          </button>
          <button class="button" style="padding: 0.6em 1.5em;" @click="restart(true)">
            Random Round
          </button>
        </div>
      </div>
    </template>

    <!-- Round score cells -->
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
import { useMapboxCity } from './useMapboxCity'
import { selectDailyCities, selectRandomCities } from './citySeeding'
import { haversineKm, calculateScore } from './cityScoring'
import { worldCities, usCities } from './cities'
import type { City } from './cities'
import type { Difficulty } from './cityScoring'

const props = defineProps<{ scope: 'world' | 'us' }>()

const token = import.meta.env.VITE_MAPBOX_TOKEN as string
const base = import.meta.env.BASE_URL

const mapContainer = ref<HTMLElement | null>(null)
const { mapReady, init, onMapClick, setGuessPin, revealRound, setDistanceLabelText, resetForNextRound, destroy } =
  useMapboxCity(mapContainer, token, base)

type Phase = 'guessing' | 'revealing' | 'complete'

const pool = props.scope === 'world' ? worldCities : usCities

const cities = ref<City[]>([])
const roundIndex = ref(0)
const guessLngLat = ref<[number, number] | null>(null)
const phase = ref<Phase>('guessing')
const rounds = ref<number[]>([])
const lastRoundScore = ref(0)
const lastDistanceKm = ref<number | null>(null)

const currentCity = computed(() => cities.value[roundIndex.value])

const totalScore = computed(() => rounds.value.reduce((a, b) => a + b, 0))

const MAX_PTS: Record<Difficulty, number> = { easy: 150, moderate: 250, hard: 350 }
function maxPts(d: Difficulty) { return MAX_PTS[d] }

function pickCities(forceRandom?: boolean) {
  const today = new Date().toISOString().slice(0, 10)
  const random = forceRandom ?? new URLSearchParams(window.location.search).get('random') === '1'
  cities.value = random ? selectRandomCities(pool) : selectDailyCities(pool, today)
  roundIndex.value = 0
  guessLngLat.value = null
  phase.value = 'guessing'
  rounds.value = []
  lastRoundScore.value = 0
  lastDistanceKm.value = null
}

async function confirmGuess() {
  if (!guessLngLat.value || !currentCity.value) return
  phase.value = 'revealing'

  const city = currentCity.value
  const guess = guessLngLat.value
  const distKm = haversineKm(guess[1], guess[0], city.lat, city.lng)
  const score = calculateScore(city.difficulty, distKm)

  lastDistanceKm.value = distKm
  lastRoundScore.value = score
  rounds.value = [...rounds.value, score]

  await revealRound(city, guess, props.scope)
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
}

function restart(random: boolean) {
  const url = new URL(window.location.href)
  if (random) {
    url.searchParams.set('random', '1')
  } else {
    url.searchParams.delete('random')
  }
  window.history.replaceState({}, '', url)
  pickCities(random)
}

onMounted(() => {
  pickCities()
  init()
  onMapClick(lngLat => {
    if (phase.value !== 'guessing') return
    guessLngLat.value = lngLat
    setGuessPin(lngLat)
  })
})

onUnmounted(() => destroy())
</script>
