# City Game Routing & Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge World Cities and US Cities into one combined game, move it to a dedicated `/#/city` route that survives page refresh, and persist the daily game in sessionStorage so it can be resumed and cannot be replayed.

**Architecture:** Add vue-router (hash mode) with two routes: `/` → existing map game shell, `/city` → CityGame. A thin `RouterShell.vue` serves as the app root with `<RouterView />`. CityGame drops its `scope` prop — boundary type is now derived per-city from `city.stateName`. Session state is managed by a new `cityGameStorage.ts` module (load/save daily game to sessionStorage). Completed daily games show a "Come back tomorrow!" message instead of Play Again; the Random Round button always remains.

**Tech Stack:** Vue 3, vue-router 4, Vite, Bun, Mapbox GL JS, Vitest, jsdom (test environment for storage tests)

**Working directory:** `/Users/davidmiller/Documents/playgrounds/country-memory-game` (branch: `city-guessing-game`)

---

## File Map

| File | Status | Change |
|---|---|---|
| `client/RouterShell.vue` | Create | Thin root component containing only `<RouterView />` |
| `client/router.ts` | Create | vue-router hash-mode config: `/` → App.vue, `/city` → CityGame.vue |
| `client/app.ts` | Modify | Mount RouterShell with router instead of bare App |
| `client/App.vue` | Modify | Remove city modes; add "City Game" nav button via `useRouter` |
| `client/useMapboxCity.ts` | Modify | Drop `scope` param from `revealRound`; derive from `city.stateName` |
| `client/cityGameStorage.ts` | Create | `loadDailyGame` / `saveDailyGame` with sessionStorage, keyed by date |
| `client/CityGame.vue` | Modify | Combined pool, no scope prop, vue-router nav, sessionStorage restore/save, "Come back tomorrow" |
| `client/styles.css` | Modify | Add `.city-nav`, `.city-back-btn`, `.city-tomorrow` |
| `tests/cityGameStorage.test.ts` | Create | Unit tests for storage module (jsdom environment) |

---

## Task 1: Routing Infrastructure

**Files:**
- Create: `client/RouterShell.vue`
- Create: `client/router.ts`
- Modify: `client/app.ts`

- [ ] **Step 1: Install vue-router**

```bash
bun add vue-router
```

Expected: `vue-router` appears in `package.json` dependencies.

- [ ] **Step 2: Create RouterShell.vue**

Create `client/RouterShell.vue`:

```vue
<template>
  <RouterView />
</template>
```

- [ ] **Step 3: Create router.ts**

Create `client/router.ts`:

```ts
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import CityGame from './CityGame.vue'

export const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', component: App },
    { path: '/city', component: CityGame }
  ]
})
```

- [ ] **Step 4: Update app.ts**

Replace `client/app.ts` entirely:

```ts
import { createApp } from 'vue'
import RouterShell from './RouterShell.vue'
import { router } from './router'
import './styles.css'
import 'mapbox-gl/dist/mapbox-gl.css'

createApp(RouterShell).use(router).mount('#app')
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
bun x tsc --noEmit
```

Expected: Only the 3 pre-existing errors (Vue type shims, Bun `import.meta.dir`). No new errors.

- [ ] **Step 6: Commit**

```bash
git add client/RouterShell.vue client/router.ts client/app.ts bun.lock
git commit -m "feat: add vue-router with hash-mode routing"
```

---

## Task 2: App.vue — Remove City Modes, Add City Game Navigation

**Files:**
- Modify: `client/App.vue`

- [ ] **Step 1: Replace App.vue**

Replace `client/App.vue` entirely:

```vue
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
bun x tsc --noEmit
```

Expected: Only pre-existing errors.

- [ ] **Step 3: Run tests**

```bash
bun run test
```

Expected: All 14 tests pass.

- [ ] **Step 4: Commit**

```bash
git add client/App.vue
git commit -m "feat: remove city modes from map shell, add City Game nav button"
```

---

## Task 3: Drop Scope Param from revealRound

**Files:**
- Modify: `client/useMapboxCity.ts` (lines 219–242)
- Modify: `client/CityGame.vue` (line 149)

The `revealRound` function currently takes `scope: 'world' | 'us'` as a third parameter and uses it to decide which boundary to show. Since cities now carry `stateName` for US cities and nothing for world cities, scope can be derived from the city itself.

- [ ] **Step 1: Update revealRound signature in useMapboxCity.ts**

Find this block (around line 219):

```ts
  async function revealRound(
    city: City,
    guessLngLat: [number, number],
    scope: 'world' | 'us'
  ): Promise<void> {
    if (!map) return
    const m = map

    // Highlight boundary
    if (scope === 'world') {
```

Replace it with:

```ts
  async function revealRound(
    city: City,
    guessLngLat: [number, number]
  ): Promise<void> {
    if (!map) return
    const m = map
    const scope = city.stateName ? 'us' : 'world'

    // Highlight boundary
    if (scope === 'world') {
```

Everything else in the function body stays identical.

- [ ] **Step 2: Update the call in CityGame.vue**

Find this line in `client/CityGame.vue` (around line 149):

```ts
  await revealRound(city, guess, props.scope)
```

Replace it with:

```ts
  await revealRound(city, guess)
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
bun x tsc --noEmit
```

Expected: Only pre-existing errors.

- [ ] **Step 4: Commit**

```bash
git add client/useMapboxCity.ts client/CityGame.vue
git commit -m "refactor: derive boundary scope from city.stateName instead of passing scope param"
```

---

## Task 4: cityGameStorage Module with Tests

**Files:**
- Create: `client/cityGameStorage.ts`
- Create: `tests/cityGameStorage.test.ts`

- [ ] **Step 1: Install jsdom for test environment**

```bash
bun add -d jsdom
```

Expected: `jsdom` appears in `devDependencies`.

- [ ] **Step 2: Write failing tests**

Create `tests/cityGameStorage.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { loadDailyGame, saveDailyGame } from '../client/cityGameStorage'

beforeEach(() => {
  sessionStorage.clear()
})

describe('loadDailyGame', () => {
  it('returns null when nothing is saved', () => {
    expect(loadDailyGame('2026-05-18')).toBeNull()
  })

  it('returns saved state for the matching date', () => {
    const state = {
      date: '2026-05-18',
      cityIds: ['london', 'paris'],
      rounds: [120],
      roundIndex: 1,
      phase: 'guessing' as const
    }
    saveDailyGame(state)
    expect(loadDailyGame('2026-05-18')).toEqual(state)
  })

  it('returns null when saved date does not match today', () => {
    saveDailyGame({
      date: '2026-05-17',
      cityIds: ['london'],
      rounds: [],
      roundIndex: 0,
      phase: 'guessing'
    })
    expect(loadDailyGame('2026-05-18')).toBeNull()
  })

  it('returns null when sessionStorage contains invalid JSON', () => {
    sessionStorage.setItem('city-game-daily', 'not-json{{')
    expect(loadDailyGame('2026-05-18')).toBeNull()
  })
})

describe('saveDailyGame', () => {
  it('overwrites a previous save for the same date', () => {
    saveDailyGame({ date: '2026-05-18', cityIds: ['a'], rounds: [], roundIndex: 0, phase: 'guessing' })
    saveDailyGame({ date: '2026-05-18', cityIds: ['b', 'c'], rounds: [200], roundIndex: 1, phase: 'revealing' })
    const loaded = loadDailyGame('2026-05-18')
    expect(loaded?.cityIds).toEqual(['b', 'c'])
    expect(loaded?.phase).toBe('revealing')
  })
})
```

- [ ] **Step 3: Run tests to confirm they fail**

```bash
bun run test
```

Expected: FAIL — `Cannot find module '../client/cityGameStorage'`

- [ ] **Step 4: Implement cityGameStorage.ts**

Create `client/cityGameStorage.ts`:

```ts
export type GamePhase = 'guessing' | 'revealing' | 'complete'

export interface SavedGame {
  date: string
  cityIds: string[]
  rounds: number[]
  roundIndex: number
  phase: GamePhase
}

const KEY = 'city-game-daily'

export function loadDailyGame(today: string): SavedGame | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const saved = JSON.parse(raw) as SavedGame
    return saved.date === today ? saved : null
  } catch {
    return null
  }
}

export function saveDailyGame(state: SavedGame): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(state))
  } catch {}
}
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
bun run test
```

Expected: All 19 tests pass (14 existing + 5 new).

- [ ] **Step 6: Commit**

```bash
git add client/cityGameStorage.ts tests/cityGameStorage.test.ts bun.lock
git commit -m "feat: add sessionStorage daily game persistence module"
```

---

## Task 5: CityGame.vue — Combined Pool, Routing, Session Storage

**Files:**
- Modify: `client/CityGame.vue` (full rewrite)
- Modify: `client/styles.css` (append 3 new classes)

This task combines all the remaining changes: dropping the `scope` prop, using a single combined city pool, wiring up vue-router for the ← Back button and URL-based random mode detection, saving/restoring daily game state, and updating the complete phase UI.

**Restoring state:** Only stable phases (`guessing`, `complete`) are saved — not `revealing`. If the browser closes mid-reveal, the user replays that round from the guessing phase. This keeps the restore logic simple and avoids showing a map in a half-animated state on reload.

- [ ] **Step 1: Add CSS to styles.css**

Append to the end of `client/styles.css`:

```css
.city-nav {
  padding: 0.35em 0.75em;
  border-bottom: 0.5px solid var(--black);
  font-size: 0.85em;
}

.city-back-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  font-family: inherit;
  font-size: inherit;
  color: inherit;
  text-decoration: underline;
}

.city-tomorrow {
  font-size: 0.9em;
  color: #555;
  display: flex;
  align-items: center;
  padding: 0.3em 0;
}
```

- [ ] **Step 2: Replace CityGame.vue**

Replace `client/CityGame.vue` entirely:

```vue
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
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
bun x tsc --noEmit
```

Expected: Only pre-existing errors.

- [ ] **Step 4: Run all tests**

```bash
bun run test
```

Expected: All 19 tests pass.

- [ ] **Step 5: Commit**

```bash
git add client/CityGame.vue client/styles.css
git commit -m "feat: combine city pools, add routing and sessionStorage daily persistence"
```

---

## Self-Review

**Spec coverage:**
- ✅ Combined US + world cities: `pool = [...worldCities, ...usCities]` in Task 5
- ✅ US boundary for US cities, country boundary for world cities: `city.stateName ? 'us' : 'world'` in Task 3
- ✅ Separate route survives refresh: vue-router hash mode `/city` in Task 1
- ✅ SessionStorage persistence for daily game: `cityGameStorage.ts` in Task 4, restore logic in Task 5
- ✅ Cannot replay completed daily: "Come back tomorrow!" replaces "Play Again" when `!isRandom` in Task 5
- ✅ ← Back navigation: `router.push('/')` button in Task 5
- ✅ URL-based random mode: uses `route.query.random` (not `window.location.search`) in Task 5

**Placeholder scan:** None found.

**Type consistency:**
- `GamePhase` defined in `cityGameStorage.ts`, imported in `CityGame.vue` — consistent
- `SavedGame.phase` typed as `GamePhase` — consistent with `phase` ref in component
- `revealRound(city, guess)` — 2-arg signature in Task 3, called with 2 args in Task 5 — consistent
- `startFresh(boolean)` defined and called consistently in Task 5 (replaces old `pickCities`)
- `pool` typed as `City[]` — consistent with `selectDailyCities`/`selectRandomCities` parameter types
