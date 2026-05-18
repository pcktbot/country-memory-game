# City Guessing Game Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two new city-guessing game modes (World Cities, US Cities) to the existing Vue 3 app, powered by a Mapbox GL JS globe map with daily-seeded rounds, exponential-decay scoring, and a 3D cylinder reveal animation.

**Architecture:** A self-contained `CityGame.vue` component holds all game state and UI; a `useMapboxCity` composable encapsulates the Mapbox instance, layer management, and reveal animations. Pure logic (scoring, seeding, data) lives in separate TypeScript modules tested with Vitest. App.vue is extended with a discriminated union game-mode type to conditionally render `CityGame` vs `MapGame`.

**Tech Stack:** Vue 3, Vite, Bun, Mapbox GL JS, Vitest

**Working directory:** `/Users/davidmiller/Documents/playgrounds/country-memory-game` (branch: `city-guessing-game`)

---

## File Map

| File | Status | Responsibility |
|---|---|---|
| `client/cityScoring.ts` | Create | Haversine distance, exponential decay score formula |
| `client/citySeeding.ts` | Create | Mulberry32 PRNG, daily city selection (1 easy, 2 moderate, 1 hard) |
| `client/cities.ts` | Create | World and US city datasets with lat/lng/difficulty |
| `client/useMapboxCity.ts` | Create | Mapbox map init, layer management, reveal animation composable |
| `client/CityGame.vue` | Create | Game state, round flow UI, ties composable to game logic |
| `client/App.vue` | Modify | Add discriminated union mode type, add two city modes, render CityGame |
| `client/styles.css` | Modify | Add CityGame-specific CSS classes |
| `vite.config.ts` | Modify | Add Vitest `test` block |
| `package.json` | Modify | Add `mapbox-gl`, `vitest` |
| `public/us-states.geojson` | Create | Simplified US state boundary polygons for reveal highlight |
| `.env` (not committed) | Create | `VITE_MAPBOX_TOKEN=<your token>` |
| `.env.example` | Create | Document required env var |
| `tests/cityScoring.test.ts` | Create | Haversine + scoring unit tests |
| `tests/citySeeding.test.ts` | Create | Daily seed determinism + composition tests |

---

## Task 1: Install Dependencies & Test Infrastructure

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts`
- Create: `.env.example`
- Create: `tests/` directory

- [ ] **Step 1: Add mapbox-gl and vitest**

```bash
bun add mapbox-gl
bun add -d vitest @types/mapbox-gl
```

- [ ] **Step 2: Add test script to package.json**

Open `package.json` and add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

Final `scripts` block:
```json
"scripts": {
  "dev": "bun x vite",
  "build": "bun x vite build",
  "preview": "bun x vite preview",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 3: Add vitest config to vite.config.ts**

Replace `vite.config.ts` entirely:
```ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  publicDir: 'public',
  base: '/country-memory-game/',
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts']
  }
});
```

- [ ] **Step 4: Create .env.example**

```
VITE_MAPBOX_TOKEN=your_mapbox_public_token_here
```

- [ ] **Step 5: Create your local .env (not committed)**

```bash
echo "VITE_MAPBOX_TOKEN=<paste your token here>" > .env
```

Verify `.gitignore` already excludes `.env` (it should for a Vite project — if not, add `.env` to `.gitignore`).

- [ ] **Step 6: Verify vitest runs (empty suite passes)**

```bash
mkdir -p tests
bun run test
```

Expected: `No test files found` or zero failures.

- [ ] **Step 7: Commit**

```bash
git add package.json vite.config.ts .env.example bun.lock
git commit -m "feat: add mapbox-gl and vitest dependencies"
```

---

## Task 2: Scoring Logic

**Files:**
- Create: `client/cityScoring.ts`
- Create: `tests/cityScoring.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/cityScoring.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { haversineKm, calculateScore, type Difficulty } from '../client/cityScoring'

describe('haversineKm', () => {
  it('returns 0 for the same point', () => {
    expect(haversineKm(0, 0, 0, 0)).toBe(0)
  })

  it('calculates NYC to London within 50km of 5570km', () => {
    const d = haversineKm(40.7128, -74.006, 51.5074, -0.1278)
    expect(d).toBeGreaterThan(5520)
    expect(d).toBeLessThan(5620)
  })

  it('calculates Sydney to London within 50km of 16993km', () => {
    const d = haversineKm(-33.8688, 151.2093, 51.5074, -0.1278)
    expect(d).toBeGreaterThan(16940)
    expect(d).toBeLessThan(17040)
  })
})

describe('calculateScore', () => {
  it('returns max points at 0 distance', () => {
    expect(calculateScore('easy', 0)).toBe(150)
    expect(calculateScore('moderate', 0)).toBe(250)
    expect(calculateScore('hard', 0)).toBe(350)
  })

  it('returns roughly half max at half-score distance', () => {
    // at halfScoreKm, score = maxPts * e^(-1) ≈ maxPts * 0.368
    // "half score" in our formula means score = maxPts * 0.5, which is at distance = halfScoreKm * ln(2)
    // so at halfScoreKm distance, we expect about 63% of max, not exactly 50%
    // The naming is "half-life" style — test the actual math
    expect(calculateScore('easy', 300)).toBeCloseTo(150 * Math.exp(-1), 0)
    expect(calculateScore('moderate', 150)).toBeCloseTo(250 * Math.exp(-1), 0)
    expect(calculateScore('hard', 75)).toBeCloseTo(350 * Math.exp(-1), 0)
  })

  it('returns 0 for very large distance', () => {
    expect(calculateScore('easy', 50000)).toBe(0)
  })

  it('never returns negative', () => {
    expect(calculateScore('hard', 999999)).toBeGreaterThanOrEqual(0)
  })

  it('max scores sum to 1000', () => {
    // 1 easy + 2 moderate + 1 hard
    expect(calculateScore('easy', 0) + calculateScore('moderate', 0) * 2 + calculateScore('hard', 0)).toBe(1000)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
bun run test
```

Expected: FAIL — `Cannot find module '../client/cityScoring'`

- [ ] **Step 3: Implement cityScoring.ts**

Create `client/cityScoring.ts`:
```ts
export type Difficulty = 'easy' | 'moderate' | 'hard'

const MAX_POINTS: Record<Difficulty, number> = {
  easy: 150,
  moderate: 250,
  hard: 350
}

const DECAY_KM: Record<Difficulty, number> = {
  easy: 300,
  moderate: 150,
  hard: 75
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function calculateScore(difficulty: Difficulty, distanceKm: number): number {
  const maxPts = MAX_POINTS[difficulty]
  const decay = DECAY_KM[difficulty]
  return Math.max(0, Math.round(maxPts * Math.exp(-distanceKm / decay)))
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
bun run test
```

Expected: All 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add client/cityScoring.ts tests/cityScoring.test.ts
git commit -m "feat: add city scoring with haversine distance and exponential decay"
```

---

## Task 3: Daily Seeding

**Files:**
- Create: `client/citySeeding.ts`
- Create: `tests/citySeeding.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/citySeeding.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { selectDailyCities, selectRandomCities } from '../client/citySeeding'
import type { City } from '../client/cities'

const mockCities: City[] = [
  { id: 'e1', name: 'Easy 1', lat: 0, lng: 0, difficulty: 'easy', countryCode: 'USA' },
  { id: 'e2', name: 'Easy 2', lat: 1, lng: 1, difficulty: 'easy', countryCode: 'USA' },
  { id: 'e3', name: 'Easy 3', lat: 2, lng: 2, difficulty: 'easy', countryCode: 'USA' },
  { id: 'm1', name: 'Mod 1', lat: 3, lng: 3, difficulty: 'moderate', countryCode: 'USA' },
  { id: 'm2', name: 'Mod 2', lat: 4, lng: 4, difficulty: 'moderate', countryCode: 'USA' },
  { id: 'm3', name: 'Mod 3', lat: 5, lng: 5, difficulty: 'moderate', countryCode: 'USA' },
  { id: 'h1', name: 'Hard 1', lat: 6, lng: 6, difficulty: 'hard', countryCode: 'USA' },
  { id: 'h2', name: 'Hard 2', lat: 7, lng: 7, difficulty: 'hard', countryCode: 'USA' },
  { id: 'h3', name: 'Hard 3', lat: 8, lng: 8, difficulty: 'hard', countryCode: 'USA' },
]

describe('selectDailyCities', () => {
  it('returns exactly 4 cities', () => {
    const result = selectDailyCities(mockCities, '2026-05-18')
    expect(result).toHaveLength(4)
  })

  it('returns 1 easy, 2 moderate, 1 hard', () => {
    const result = selectDailyCities(mockCities, '2026-05-18')
    expect(result.filter(c => c.difficulty === 'easy')).toHaveLength(1)
    expect(result.filter(c => c.difficulty === 'moderate')).toHaveLength(2)
    expect(result.filter(c => c.difficulty === 'hard')).toHaveLength(1)
  })

  it('is deterministic for the same date', () => {
    const a = selectDailyCities(mockCities, '2026-05-18')
    const b = selectDailyCities(mockCities, '2026-05-18')
    expect(a.map(c => c.id)).toEqual(b.map(c => c.id))
  })

  it('produces different results for different dates', () => {
    const a = selectDailyCities(mockCities, '2026-05-18')
    const b = selectDailyCities(mockCities, '2026-05-19')
    expect(a.map(c => c.id)).not.toEqual(b.map(c => c.id))
  })

  it('returns no duplicate cities', () => {
    const result = selectDailyCities(mockCities, '2026-05-18')
    const ids = result.map(c => c.id)
    expect(new Set(ids).size).toBe(4)
  })
})

describe('selectRandomCities', () => {
  it('returns 1 easy, 2 moderate, 1 hard', () => {
    const result = selectRandomCities(mockCities)
    expect(result.filter(c => c.difficulty === 'easy')).toHaveLength(1)
    expect(result.filter(c => c.difficulty === 'moderate')).toHaveLength(2)
    expect(result.filter(c => c.difficulty === 'hard')).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
bun run test
```

Expected: FAIL — `Cannot find module '../client/citySeeding'`

- [ ] **Step 3: Implement citySeeding.ts**

Create `client/citySeeding.ts`:
```ts
import type { City } from './cities'

function mulberry32(seed: number): () => number {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function dateToSeed(dateStr: string): number {
  return dateStr.split('').reduce((acc, ch) => (Math.imul(acc, 31) + ch.charCodeAt(0)) | 0, 0)
}

function shuffleSample<T>(arr: T[], n: number, rng: () => number): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy.slice(0, n)
}

export function selectDailyCities(cities: City[], dateStr: string): City[] {
  const rng = mulberry32(dateToSeed(dateStr))
  const easy = shuffleSample(cities.filter(c => c.difficulty === 'easy'), 1, rng)
  const moderate = shuffleSample(cities.filter(c => c.difficulty === 'moderate'), 2, rng)
  const hard = shuffleSample(cities.filter(c => c.difficulty === 'hard'), 1, rng)
  return [...easy, ...moderate, ...hard]
}

export function selectRandomCities(cities: City[]): City[] {
  const rng = Math.random
  const easy = shuffleSample(cities.filter(c => c.difficulty === 'easy'), 1, rng)
  const moderate = shuffleSample(cities.filter(c => c.difficulty === 'moderate'), 2, rng)
  const hard = shuffleSample(cities.filter(c => c.difficulty === 'hard'), 1, rng)
  return [...easy, ...moderate, ...hard]
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
bun run test
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add client/citySeeding.ts tests/citySeeding.test.ts
git commit -m "feat: add deterministic daily city seeding with mulberry32 PRNG"
```

---

## Task 4: City Dataset

**Files:**
- Create: `client/cities.ts`

- [ ] **Step 1: Create cities.ts with City type and full datasets**

Create `client/cities.ts`:
```ts
import type { Difficulty } from './cityScoring'

export interface City {
  id: string
  name: string
  lat: number
  lng: number
  difficulty: Difficulty
  countryCode: string      // ISO 3166-1 alpha-3 (world mode boundary filter)
  stateName?: string       // Full US state name (US mode boundary filter)
}

export const worldCities: City[] = [
  // Easy — major world capitals and metros
  { id: 'london',       name: 'London',        lat: 51.5074,  lng: -0.1278,   difficulty: 'easy',     countryCode: 'GBR' },
  { id: 'paris',        name: 'Paris',         lat: 48.8566,  lng: 2.3522,    difficulty: 'easy',     countryCode: 'FRA' },
  { id: 'tokyo',        name: 'Tokyo',         lat: 35.6762,  lng: 139.6503,  difficulty: 'easy',     countryCode: 'JPN' },
  { id: 'new-york',     name: 'New York',      lat: 40.7128,  lng: -74.006,   difficulty: 'easy',     countryCode: 'USA' },
  { id: 'sydney',       name: 'Sydney',        lat: -33.8688, lng: 151.2093,  difficulty: 'easy',     countryCode: 'AUS' },
  { id: 'moscow',       name: 'Moscow',        lat: 55.7558,  lng: 37.6173,   difficulty: 'easy',     countryCode: 'RUS' },
  { id: 'beijing',      name: 'Beijing',       lat: 39.9042,  lng: 116.4074,  difficulty: 'easy',     countryCode: 'CHN' },
  { id: 'cairo',        name: 'Cairo',         lat: 30.0444,  lng: 31.2357,   difficulty: 'easy',     countryCode: 'EGY' },
  { id: 'rio',          name: 'Rio de Janeiro',lat: -22.9068, lng: -43.1729,  difficulty: 'easy',     countryCode: 'BRA' },
  { id: 'toronto',      name: 'Toronto',       lat: 43.6532,  lng: -79.3832,  difficulty: 'easy',     countryCode: 'CAN' },
  { id: 'cape-town',    name: 'Cape Town',     lat: -33.9249, lng: 18.4241,   difficulty: 'easy',     countryCode: 'ZAF' },
  { id: 'mexico-city',  name: 'Mexico City',   lat: 19.4326,  lng: -99.1332,  difficulty: 'easy',     countryCode: 'MEX' },
  { id: 'mumbai',       name: 'Mumbai',        lat: 19.0760,  lng: 72.8777,   difficulty: 'easy',     countryCode: 'IND' },
  { id: 'berlin',       name: 'Berlin',        lat: 52.5200,  lng: 13.4050,   difficulty: 'easy',     countryCode: 'DEU' },
  { id: 'rome',         name: 'Rome',          lat: 41.9028,  lng: 12.4964,   difficulty: 'easy',     countryCode: 'ITA' },
  { id: 'madrid',       name: 'Madrid',        lat: 40.4168,  lng: -3.7038,   difficulty: 'easy',     countryCode: 'ESP' },
  { id: 'dubai',        name: 'Dubai',         lat: 25.2048,  lng: 55.2708,   difficulty: 'easy',     countryCode: 'ARE' },

  // Moderate — secondary capitals and regional cities
  { id: 'warsaw',       name: 'Warsaw',        lat: 52.2297,  lng: 21.0122,   difficulty: 'moderate', countryCode: 'POL' },
  { id: 'bangkok',      name: 'Bangkok',       lat: 13.7563,  lng: 100.5018,  difficulty: 'moderate', countryCode: 'THA' },
  { id: 'nairobi',      name: 'Nairobi',       lat: -1.2921,  lng: 36.8219,   difficulty: 'moderate', countryCode: 'KEN' },
  { id: 'buenos-aires', name: 'Buenos Aires',  lat: -34.6037, lng: -58.3816,  difficulty: 'moderate', countryCode: 'ARG' },
  { id: 'seoul',        name: 'Seoul',         lat: 37.5665,  lng: 126.9780,  difficulty: 'moderate', countryCode: 'KOR' },
  { id: 'lagos',        name: 'Lagos',         lat: 6.5244,   lng: 3.3792,    difficulty: 'moderate', countryCode: 'NGA' },
  { id: 'istanbul',     name: 'Istanbul',      lat: 41.0082,  lng: 28.9784,   difficulty: 'moderate', countryCode: 'TUR' },
  { id: 'jakarta',      name: 'Jakarta',       lat: -6.2088,  lng: 106.8456,  difficulty: 'moderate', countryCode: 'IDN' },
  { id: 'lima',         name: 'Lima',          lat: -12.0464, lng: -77.0428,  difficulty: 'moderate', countryCode: 'PER' },
  { id: 'casablanca',   name: 'Casablanca',    lat: 33.5731,  lng: -7.5898,   difficulty: 'moderate', countryCode: 'MAR' },
  { id: 'tehran',       name: 'Tehran',        lat: 35.6892,  lng: 51.3890,   difficulty: 'moderate', countryCode: 'IRN' },
  { id: 'bogota',       name: 'Bogotá',        lat: 4.7110,   lng: -74.0721,  difficulty: 'moderate', countryCode: 'COL' },
  { id: 'dhaka',        name: 'Dhaka',         lat: 23.8103,  lng: 90.4125,   difficulty: 'moderate', countryCode: 'BGD' },
  { id: 'kinshasa',     name: 'Kinshasa',      lat: -4.4419,  lng: 15.2663,   difficulty: 'moderate', countryCode: 'COD' },
  { id: 'santiago',     name: 'Santiago',      lat: -33.4489, lng: -70.6693,  difficulty: 'moderate', countryCode: 'CHL' },
  { id: 'stockholm',    name: 'Stockholm',     lat: 59.3293,  lng: 18.0686,   difficulty: 'moderate', countryCode: 'SWE' },

  // Hard — obscure capitals and small-nation cities
  { id: 'ulaanbaatar',  name: 'Ulaanbaatar',   lat: 47.8864,  lng: 106.9057,  difficulty: 'hard',     countryCode: 'MNG' },
  { id: 'reykjavik',    name: 'Reykjavik',     lat: 64.1265,  lng: -21.8174,  difficulty: 'hard',     countryCode: 'ISL' },
  { id: 'ashgabat',     name: 'Ashgabat',      lat: 37.9601,  lng: 58.3261,   difficulty: 'hard',     countryCode: 'TKM' },
  { id: 'bishkek',      name: 'Bishkek',       lat: 42.8746,  lng: 74.5698,   difficulty: 'hard',     countryCode: 'KGZ' },
  { id: 'vientiane',    name: 'Vientiane',     lat: 17.9757,  lng: 102.6331,  difficulty: 'hard',     countryCode: 'LAO' },
  { id: 'paramaribo',   name: 'Paramaribo',    lat: 5.8520,   lng: -55.2038,  difficulty: 'hard',     countryCode: 'SUR' },
  { id: 'nouakchott',   name: 'Nouakchott',    lat: 18.0735,  lng: -15.9582,  difficulty: 'hard',     countryCode: 'MRT' },
  { id: 'dili',         name: 'Dili',          lat: -8.5569,  lng: 125.5789,  difficulty: 'hard',     countryCode: 'TLS' },
  { id: 'niamey',       name: 'Niamey',        lat: 13.5137,  lng: 2.1098,    difficulty: 'hard',     countryCode: 'NER' },
  { id: 'maseru',       name: 'Maseru',        lat: -29.3167, lng: 27.4833,   difficulty: 'hard',     countryCode: 'LSO' },
  { id: 'yamoussoukro', name: 'Yamoussoukro',  lat: 6.8276,   lng: -5.2893,   difficulty: 'hard',     countryCode: 'CIV' },
  { id: 'malabo',       name: 'Malabo',        lat: 3.7500,   lng: 8.7833,    difficulty: 'hard',     countryCode: 'GNQ' },
]

export const usCities: City[] = [
  // Easy — major metros
  { id: 'us-new-york',    name: 'New York',      lat: 40.7128,  lng: -74.006,   difficulty: 'easy',     countryCode: 'USA', stateName: 'New York' },
  { id: 'us-los-angeles', name: 'Los Angeles',   lat: 34.0522,  lng: -118.2437, difficulty: 'easy',     countryCode: 'USA', stateName: 'California' },
  { id: 'us-chicago',     name: 'Chicago',       lat: 41.8781,  lng: -87.6298,  difficulty: 'easy',     countryCode: 'USA', stateName: 'Illinois' },
  { id: 'us-houston',     name: 'Houston',       lat: 29.7604,  lng: -95.3698,  difficulty: 'easy',     countryCode: 'USA', stateName: 'Texas' },
  { id: 'us-miami',       name: 'Miami',         lat: 25.7617,  lng: -80.1918,  difficulty: 'easy',     countryCode: 'USA', stateName: 'Florida' },
  { id: 'us-seattle',     name: 'Seattle',       lat: 47.6062,  lng: -122.3321, difficulty: 'easy',     countryCode: 'USA', stateName: 'Washington' },
  { id: 'us-denver',      name: 'Denver',        lat: 39.7392,  lng: -104.9903, difficulty: 'easy',     countryCode: 'USA', stateName: 'Colorado' },
  { id: 'us-boston',      name: 'Boston',        lat: 42.3601,  lng: -71.0589,  difficulty: 'easy',     countryCode: 'USA', stateName: 'Massachusetts' },
  { id: 'us-atlanta',     name: 'Atlanta',       lat: 33.7490,  lng: -84.3880,  difficulty: 'easy',     countryCode: 'USA', stateName: 'Georgia' },
  { id: 'us-phoenix',     name: 'Phoenix',       lat: 33.4484,  lng: -112.0740, difficulty: 'easy',     countryCode: 'USA', stateName: 'Arizona' },

  // Moderate — state capitals of mid-sized states
  { id: 'us-nashville',   name: 'Nashville',     lat: 36.1627,  lng: -86.7816,  difficulty: 'moderate', countryCode: 'USA', stateName: 'Tennessee' },
  { id: 'us-columbus',    name: 'Columbus',      lat: 39.9612,  lng: -82.9988,  difficulty: 'moderate', countryCode: 'USA', stateName: 'Ohio' },
  { id: 'us-austin',      name: 'Austin',        lat: 30.2672,  lng: -97.7431,  difficulty: 'moderate', countryCode: 'USA', stateName: 'Texas' },
  { id: 'us-sacramento',  name: 'Sacramento',    lat: 38.5816,  lng: -121.4944, difficulty: 'moderate', countryCode: 'USA', stateName: 'California' },
  { id: 'us-raleigh',     name: 'Raleigh',       lat: 35.7796,  lng: -78.6382,  difficulty: 'moderate', countryCode: 'USA', stateName: 'North Carolina' },
  { id: 'us-richmond',    name: 'Richmond',      lat: 37.5407,  lng: -77.4360,  difficulty: 'moderate', countryCode: 'USA', stateName: 'Virginia' },
  { id: 'us-indianapolis',name: 'Indianapolis',  lat: 39.7684,  lng: -86.1581,  difficulty: 'moderate', countryCode: 'USA', stateName: 'Indiana' },
  { id: 'us-portland',    name: 'Portland',      lat: 45.5051,  lng: -122.6750, difficulty: 'moderate', countryCode: 'USA', stateName: 'Oregon' },
  { id: 'us-minneapolis', name: 'Minneapolis',   lat: 44.9778,  lng: -93.2650,  difficulty: 'moderate', countryCode: 'USA', stateName: 'Minnesota' },
  { id: 'us-salt-lake',   name: 'Salt Lake City',lat: 40.7608,  lng: -111.8910, difficulty: 'moderate', countryCode: 'USA', stateName: 'Utah' },
  { id: 'us-little-rock', name: 'Little Rock',   lat: 34.7465,  lng: -92.2896,  difficulty: 'moderate', countryCode: 'USA', stateName: 'Arkansas' },
  { id: 'us-baton-rouge', name: 'Baton Rouge',   lat: 30.4515,  lng: -91.1871,  difficulty: 'moderate', countryCode: 'USA', stateName: 'Louisiana' },

  // Hard — obscure state capitals
  { id: 'us-pierre',      name: 'Pierre',        lat: 44.3683,  lng: -100.3510, difficulty: 'hard',     countryCode: 'USA', stateName: 'South Dakota' },
  { id: 'us-bismarck',    name: 'Bismarck',      lat: 46.8083,  lng: -100.7837, difficulty: 'hard',     countryCode: 'USA', stateName: 'North Dakota' },
  { id: 'us-cheyenne',    name: 'Cheyenne',      lat: 41.1400,  lng: -104.8202, difficulty: 'hard',     countryCode: 'USA', stateName: 'Wyoming' },
  { id: 'us-helena',      name: 'Helena',        lat: 46.5958,  lng: -112.0270, difficulty: 'hard',     countryCode: 'USA', stateName: 'Montana' },
  { id: 'us-juneau',      name: 'Juneau',        lat: 58.3005,  lng: -134.4197, difficulty: 'hard',     countryCode: 'USA', stateName: 'Alaska' },
  { id: 'us-dover',       name: 'Dover',         lat: 39.1582,  lng: -75.5244,  difficulty: 'hard',     countryCode: 'USA', stateName: 'Delaware' },
  { id: 'us-montpelier',  name: 'Montpelier',    lat: 44.2601,  lng: -72.5754,  difficulty: 'hard',     countryCode: 'USA', stateName: 'Vermont' },
  { id: 'us-augusta',     name: 'Augusta',       lat: 44.3107,  lng: -69.7795,  difficulty: 'hard',     countryCode: 'USA', stateName: 'Maine' },
  { id: 'us-concord',     name: 'Concord',       lat: 43.2081,  lng: -71.5376,  difficulty: 'hard',     countryCode: 'USA', stateName: 'New Hampshire' },
  { id: 'us-annapolis',   name: 'Annapolis',     lat: 38.9784,  lng: -76.4922,  difficulty: 'hard',     countryCode: 'USA', stateName: 'Maryland' },
]
```

- [ ] **Step 2: Verify existing tests still pass**

```bash
bun run test
```

Expected: All tests pass (citySeeding tests use mock data, not the real dataset).

- [ ] **Step 3: Commit**

```bash
git add client/cities.ts
git commit -m "feat: add world and US city datasets with difficulty ratings"
```

---

## Task 5: US States GeoJSON Asset

**Files:**
- Create: `public/us-states.geojson`

- [ ] **Step 1: Download simplified US states GeoJSON**

```bash
curl -L -o public/us-states.geojson \
  "https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json"
```

- [ ] **Step 2: Verify the file has the expected structure**

```bash
head -c 500 public/us-states.geojson
```

Expected output: JSON starting with `{"type":"FeatureCollection",...` and features with `"properties":{"name":"Alabama",...}`. The `name` property is what we filter by — confirm it's a full state name string.

- [ ] **Step 3: Commit**

```bash
git add public/us-states.geojson
git commit -m "feat: add simplified US states GeoJSON for boundary reveal"
```

---

## Task 6: Mapbox Composable — Map Init & Layers

**Files:**
- Create: `client/useMapboxCity.ts`

This task sets up the map and registers all layers in their initial (hidden/empty) state. The reveal logic comes in Task 7.

- [ ] **Step 1: Create useMapboxCity.ts with map initialization**

Create `client/useMapboxCity.ts`:
```ts
import mapboxgl from 'mapbox-gl'
import { ref, type Ref } from 'vue'
import type { City } from './cities'

const GUESS_COLOR = '#F19A3E'
const ACTUAL_COLOR = '#85CB33'
const HIGHLIGHT_COLOR = '#3b82f6'
const CYLINDER_RADIUS_KM = 25

function circlePolygon(
  lngLat: [number, number],
  radiusKm: number,
  points = 32
): GeoJSON.Feature<GeoJSON.Polygon> {
  const [lng, lat] = lngLat
  const latDeg = radiusKm / 111.32
  const lngDeg = radiusKm / (111.32 * Math.cos(lat * Math.PI / 180))
  const coords: [number, number][] = []
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI
    coords.push([lng + lngDeg * Math.cos(angle), lat + latDeg * Math.sin(angle)])
  }
  return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [coords] }, properties: {} }
}

function animateHeight(
  map: mapboxgl.Map,
  layerId: string,
  targetHeight: number,
  duration = 900
): void {
  const start = performance.now()
  const frame = (now: number) => {
    const t = Math.min((now - start) / duration, 1)
    const eased = 1 - Math.pow(1 - t, 3)
    map.setPaintProperty(layerId, 'fill-extrusion-height', targetHeight * eased)
    if (t < 1) requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
}

function animateFillOpacity(
  map: mapboxgl.Map,
  layerId: string,
  target: number,
  duration = 500
): void {
  const start = performance.now()
  const frame = (now: number) => {
    const t = Math.min((now - start) / duration, 1)
    map.setPaintProperty(layerId, 'fill-opacity', target * t)
    if (t < 1) requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
}

let statesGeoJson: GeoJSON.FeatureCollection | null = null

async function loadStatesGeoJson(base: string): Promise<GeoJSON.FeatureCollection> {
  if (statesGeoJson) return statesGeoJson
  const res = await fetch(`${base}us-states.geojson`)
  statesGeoJson = await res.json()
  return statesGeoJson!
}

export function useMapboxCity(container: Ref<HTMLElement | null>, token: string, base: string) {
  const mapReady = ref(false)
  let map: mapboxgl.Map | null = null
  let guessMarker: mapboxgl.Marker | null = null
  let distanceMarker: mapboxgl.Marker | null = null
  let distanceLabelEl: HTMLElement | null = null

  function init() {
    if (!container.value) return
    mapboxgl.accessToken = token
    map = new mapboxgl.Map({
      container: container.value,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      projection: { name: 'globe' },
      zoom: 1.5,
      center: [0, 20],
      maxZoom: 12
    })

    map.on('load', async () => {
      suppressSymbolLayers(map!)
      await addStaticLayers(map!, base)
      mapReady.value = true
    })
  }

  function suppressSymbolLayers(m: mapboxgl.Map) {
    m.getStyle().layers.forEach(layer => {
      if (layer.type === 'symbol') {
        m.setLayoutProperty(layer.id, 'visibility', 'none')
      }
    })
  }

  async function addStaticLayers(m: mapboxgl.Map, base: string) {
    // Country boundary highlight (world mode)
    m.addSource('country-highlight', {
      type: 'vector',
      url: 'mapbox://mapbox.country-boundaries-v1'
    })
    m.addLayer({
      id: 'country-highlight-fill',
      type: 'fill',
      source: 'country-highlight',
      'source-layer': 'country_boundaries',
      filter: ['==', ['get', 'iso_3166_1_alpha_3'], ''],
      paint: { 'fill-color': HIGHLIGHT_COLOR, 'fill-opacity': 0 }
    })

    // State boundary highlight (US mode) — loaded from bundled GeoJSON
    const states = await loadStatesGeoJson(base)
    m.addSource('state-highlight', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] }
    })
    m.addLayer({
      id: 'state-highlight-fill',
      type: 'fill',
      source: 'state-highlight',
      paint: { 'fill-color': HIGHLIGHT_COLOR, 'fill-opacity': 0 }
    })
    // Store for use in reveal
    ;(m as any)._statesData = states

    // Guess cylinder
    m.addSource('guess-cylinder', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] }
    })
    m.addLayer({
      id: 'guess-cylinder-layer',
      type: 'fill-extrusion',
      source: 'guess-cylinder',
      paint: {
        'fill-extrusion-color': GUESS_COLOR,
        'fill-extrusion-height': 0,
        'fill-extrusion-base': 0,
        'fill-extrusion-opacity': 0.9
      }
    })

    // Actual city cylinder
    m.addSource('actual-cylinder', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] }
    })
    m.addLayer({
      id: 'actual-cylinder-layer',
      type: 'fill-extrusion',
      source: 'actual-cylinder',
      paint: {
        'fill-extrusion-color': ACTUAL_COLOR,
        'fill-extrusion-height': 0,
        'fill-extrusion-base': 0,
        'fill-extrusion-opacity': 0.9
      }
    })

    // Distance line
    m.addSource('distance-line', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] }
    })
    m.addLayer({
      id: 'distance-line-layer',
      type: 'line',
      source: 'distance-line',
      paint: {
        'line-color': '#ffffff',
        'line-width': 2,
        'line-dasharray': [4, 3]
      }
    })
  }

  function onMapClick(handler: (lngLat: [number, number]) => void) {
    if (!map) return
    map.on('click', e => handler([e.lngLat.lng, e.lngLat.lat]))
  }

  function setGuessPin(lngLat: [number, number] | null) {
    if (!map) return
    if (!lngLat) {
      guessMarker?.remove()
      guessMarker = null
      return
    }
    if (guessMarker) {
      guessMarker.setLngLat(lngLat)
    } else {
      guessMarker = new mapboxgl.Marker({ color: GUESS_COLOR })
        .setLngLat(lngLat)
        .addTo(map)
    }
  }

  function destroy() {
    guessMarker?.remove()
    distanceMarker?.remove()
    map?.remove()
    map = null
    mapReady.value = false
  }

  return { mapReady, map: () => map, init, onMapClick, setGuessPin, destroy }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
bun x tsc --noEmit
```

Expected: No errors. (If mapbox-gl types are missing, run `bun add -d @types/mapbox-gl`.)

- [ ] **Step 3: Commit**

```bash
git add client/useMapboxCity.ts
git commit -m "feat: add mapbox composable with map init and static layer setup"
```

---

## Task 7: Mapbox Composable — Reveal & Reset

**Files:**
- Modify: `client/useMapboxCity.ts` (add `revealRound` and `resetForNextRound` to the returned object)

- [ ] **Step 1: Add revealRound and resetForNextRound to useMapboxCity.ts**

Inside `useMapboxCity`, after the `setGuessPin` function and before the `destroy` function, add:

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
      m.setFilter('country-highlight-fill', ['==', ['get', 'iso_3166_1_alpha_3'], city.countryCode])
      animateFillOpacity(m, 'country-highlight-fill', 0.35, 600)
    } else {
      const states: GeoJSON.FeatureCollection = (m as any)._statesData
      const stateFeature = states.features.find(
        (f: any) => f.properties?.name === city.stateName
      )
      ;(m.getSource('state-highlight') as mapboxgl.GeoJSONSource).setData(
        stateFeature
          ? { type: 'FeatureCollection', features: [stateFeature] }
          : { type: 'FeatureCollection', features: [] }
      )
      animateFillOpacity(m, 'state-highlight-fill', 0.35, 600)
    }

    // Fly to the city region
    await new Promise<void>(resolve => {
      m.flyTo({ center: [city.lng, city.lat], zoom: 4.5, duration: 1800 })
      m.once('moveend', () => resolve())
    })

    // Remove guess pin marker (replaced by cylinder)
    guessMarker?.remove()
    guessMarker = null

    // Place guess cylinder
    ;(m.getSource('guess-cylinder') as mapboxgl.GeoJSONSource).setData(
      circlePolygon(guessLngLat, CYLINDER_RADIUS_KM)
    )
    animateHeight(m, 'guess-cylinder-layer', 180000)

    // Place actual city cylinder (slight delay so they appear sequentially)
    await new Promise(r => setTimeout(r, 300))
    ;(m.getSource('actual-cylinder') as mapboxgl.GeoJSONSource).setData(
      circlePolygon([city.lng, city.lat], CYLINDER_RADIUS_KM)
    )
    animateHeight(m, 'actual-cylinder-layer', 300000)

    // Draw distance line
    ;(m.getSource('distance-line') as mapboxgl.GeoJSONSource).setData({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [guessLngLat, [city.lng, city.lat]]
      },
      properties: {}
    })

    // Distance label at midpoint
    const midLng = (guessLngLat[0] + city.lng) / 2
    const midLat = (guessLngLat[1] + city.lat) / 2
    distanceLabelEl = document.createElement('div')
    distanceLabelEl.className = 'distance-label'
    distanceMarker?.remove()
    distanceMarker = new mapboxgl.Marker({ element: distanceLabelEl, anchor: 'bottom' })
      .setLngLat([midLng, midLat])
      .addTo(m)
  }

  function setDistanceLabelText(text: string) {
    if (distanceLabelEl) distanceLabelEl.textContent = text
  }

  function resetForNextRound() {
    if (!map) return
    const m = map

    // Hide boundary highlights
    m.setPaintProperty('country-highlight-fill', 'fill-opacity', 0)
    m.setPaintProperty('state-highlight-fill', 'fill-opacity', 0)

    // Clear cylinders
    const empty: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }
    ;(m.getSource('guess-cylinder') as mapboxgl.GeoJSONSource).setData(empty)
    ;(m.getSource('actual-cylinder') as mapboxgl.GeoJSONSource).setData(empty)
    ;(m.getSource('distance-line') as mapboxgl.GeoJSONSource).setData(empty)
    m.setPaintProperty('guess-cylinder-layer', 'fill-extrusion-height', 0)
    m.setPaintProperty('actual-cylinder-layer', 'fill-extrusion-height', 0)

    // Remove markers
    guessMarker?.remove()
    guessMarker = null
    distanceMarker?.remove()
    distanceMarker = null
    distanceLabelEl = null

    // Fly back to globe view
    m.flyTo({ zoom: 1.5, center: [0, 20], duration: 1200 })
  }
```

Update the return statement to include the new functions:
```ts
  return {
    mapReady,
    map: () => map,
    init,
    onMapClick,
    setGuessPin,
    revealRound,
    setDistanceLabelText,
    resetForNextRound,
    destroy
  }
```

- [ ] **Step 2: Add distance-label CSS to styles.css**

Add at the end of `client/styles.css`:
```css
.distance-label {
  background-color: var(--black);
  color: var(--white);
  font-weight: bold;
  font-size: 0.75em;
  padding: 0.3em 0.6em;
  white-space: nowrap;
  pointer-events: none;
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
bun x tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add client/useMapboxCity.ts client/styles.css
git commit -m "feat: add reveal animation and round reset to mapbox composable"
```

---

## Task 8: CityGame Component

**Files:**
- Create: `client/CityGame.vue`
- Modify: `client/styles.css` (add city game panel styles)

- [ ] **Step 1: Add city game panel CSS to styles.css**

Add at the end of `client/styles.css`:
```css
.city-map-container {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
}

.city-panel {
  z-index: 999;
  background-color: var(--white);
  position: fixed;
  top: 1.5em;
  left: 1.5em;
  border: 0.5px solid var(--black);
  width: 45em;
  max-width: calc(100vw - 3em);
}

.city-prompt {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 0.5px solid var(--black);
  padding: 0.6em 0.75em;
  gap: 0.5em;
}

.city-name {
  font-size: 1.3em;
  font-weight: bold;
}

.difficulty-badge {
  font-size: 0.7em;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 0.25em 0.6em;
  border: 0.5px solid currentColor;
}
.difficulty-badge.easy     { color: var(--green); }
.difficulty-badge.moderate { color: var(--highlight); }
.difficulty-badge.hard     { color: var(--red); }

.city-actions {
  display: flex;
  align-items: stretch;
}

.city-rounds {
  display: flex;
  border-top: 0.5px solid var(--black);
}

.city-round-cell {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0.4em 0.5em;
  border-right: 0.5px solid var(--black);
  min-height: 3em;
  font-size: 0.85em;
}
.city-round-cell:last-child {
  border-right: none;
}
.city-round-cell.active {
  background-color: #f5f5f5;
}
.city-round-score {
  font-size: 1.4em;
  font-weight: bold;
  line-height: 1;
}
.city-round-total {
  font-size: 0.7em;
  color: #888;
  margin-top: 0.2em;
}
.city-total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5em 0.75em;
  border-top: 0.5px solid var(--black);
  font-weight: bold;
}

.city-complete {
  padding: 1.5em 0.75em;
  text-align: center;
}
.city-complete h2 {
  font-size: 1.4em;
  margin-bottom: 0.3em;
}
.city-complete p {
  font-size: 0.9em;
  color: #555;
  margin-bottom: 1em;
}
.city-complete-buttons {
  display: flex;
  gap: 0.5em;
  justify-content: center;
}

.city-hint {
  font-size: 0.8em;
  color: #888;
  padding: 0.4em 0.75em;
  border-top: 0.5px solid var(--black);
}

@media (max-width: 720px) {
  .city-panel {
    top: 0;
    left: 0;
    right: 0;
    width: 100%;
    max-width: 100%;
    border-left: none;
    border-right: none;
    border-top: none;
  }
}
```

- [ ] **Step 2: Create CityGame.vue**

Create `client/CityGame.vue`:
```vue
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
  pickCities()   // reads ?random=1 from URL on first load
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

- [ ] **Step 3: Import mapbox-gl CSS in app.ts**

Open `client/app.ts` and add the import:
```ts
import { createApp } from 'vue';
import App from './App.vue';
import './styles.css';
import 'mapbox-gl/dist/mapbox-gl.css';

createApp(App).mount('#app');
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
bun x tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add client/CityGame.vue client/styles.css client/app.ts
git commit -m "feat: add CityGame component with guessing and reveal phases"
```

---

## Task 9: App.vue Integration

**Files:**
- Modify: `client/App.vue`

- [ ] **Step 1: Update App.vue**

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
import type { Difficulty } from './cityScoring';

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
```

- [ ] **Step 2: Verify full TypeScript compile**

```bash
bun x tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Run all tests**

```bash
bun run test
```

Expected: All tests pass.

- [ ] **Step 4: Start the dev server and verify manually**

```bash
bun run dev
```

Open the browser. Check:
- All 4 mode buttons appear in the top-right switcher
- Countries and US States modes still work as before
- Clicking "World Cities" loads a Mapbox globe with no labels
- Clicking the map places an orange pin; pin moves on subsequent clicks
- "Confirm Guess" is disabled until a pin is placed
- After confirming: map flies to the city, boundary highlights, cylinders animate up, distance line appears
- "Next City →" resets and advances; after round 4, summary screen shows
- "Play Again" reuses today's same 4 cities; "Random Round" picks new ones
- US Cities mode works the same with state boundary highlights

- [ ] **Step 5: Commit**

```bash
git add client/App.vue
git commit -m "feat: integrate CityGame into app with World Cities and US Cities modes"
```

---

## Notes for Future Iterations

- City datasets are starter sets; add more entries to `client/cities.ts` to improve variety
- Cylinder height values (180000 / 300000 meters) are tuned for zoom level 4–5; adjust if reveal zoom is changed
- The `?random=1` flag persists in the URL until cleared — intentional for testing sessions
- Mapbox token must be a public (pk.*) token, not a secret token
