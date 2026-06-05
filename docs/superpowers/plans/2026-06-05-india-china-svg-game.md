# India & China SVG Game + Navigation Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add India (states) and China (provinces) as click-to-find SVG games alongside a new splash-page home screen that routes to all games.

**Architecture:** A one-time Node/Bun script generates `india.svg` + `china.svg` + matching TypeScript data files from Natural Earth GeoJSON. The existing `MapGame.vue` is reused unchanged. Navigation is split: `/` becomes a splash page; Countries, US States, and the new India+China game each get their own route and thin wrapper component.

**Tech Stack:** Vue 3, Vue Router 5 (hash mode), d3-geo (build-time script only), Bun, TypeScript

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Create | `scripts/generate-maps.ts` | Fetches Natural Earth GeoJSON, generates SVGs + TS data files |
| Create | `public/india.svg` | Generated — Indian states as `<path id="name">` elements |
| Create | `public/china.svg` | Generated — Chinese provinces as `<path id="name">` elements |
| Create | `client/indiaStates.ts` | Generated — `{ id, name }` array matching india.svg path IDs |
| Create | `client/chinaProvinces.ts` | Generated — `{ id, name }` array matching china.svg path IDs |
| Create | `client/SplashPage.vue` | Home screen — four large game cards |
| Create | `client/CountriesGame.vue` | Thin wrapper: MapGame + countries data + world.svg |
| Create | `client/UsGame.vue` | Thin wrapper: MapGame + states data + us.svg |
| Create | `client/AsiaGame.vue` | India/China toggle + MapGame |
| Modify | `client/router.ts` | Add new routes, change `/` to SplashPage |

`App.vue` is left in place but removed from the router (becomes dead code, safe to delete later).

---

### Task 1: Install d3-geo and write the map generation script

**Files:**
- Create: `scripts/generate-maps.ts`

- [ ] **Step 1: Install d3-geo as a dev dependency**

```bash
bun add -d d3-geo @types/d3-geo @types/geojson
```

Expected: packages added to `devDependencies` in `package.json`.

- [ ] **Step 2: Create `scripts/generate-maps.ts`**

```typescript
import { geoMercator, geoPath } from 'd3-geo'
import { writeFileSync } from 'node:fs'

const GEO_URL =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson'

async function main() {
  console.log('Fetching Natural Earth admin-1 GeoJSON (~7 MB, one moment)…')
  const res = await fetch(GEO_URL)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const full = await res.json() as { features: any[] }

  build(full.features, 'IND', 'public/india.svg',  'client/indiaStates.ts',   'indiaStates',   800, 900)
  build(full.features, 'CHN', 'public/china.svg',  'client/chinaProvinces.ts', 'chinaProvinces', 1000, 800)
}

function build(
  allFeatures: any[],
  countryCode: string,
  svgOut: string,
  tsOut: string,
  exportName: string,
  W: number,
  H: number
) {
  const features = allFeatures.filter(f => f.properties?.adm0_a3 === countryCode)
  if (features.length === 0) throw new Error(`No features found for ${countryCode}`)

  const fc = { type: 'FeatureCollection' as const, features }
  const proj = geoMercator().fitExtent([[10, 10], [W - 10, H - 10]], fc)
  const pathGen = geoPath(proj)

  const pathTags = features.map(f => {
    const name = ((f.properties?.name ?? f.properties?.name_en ?? '') as string).trim()
    const d = pathGen(f) ?? ''
    return `  <path id="${escXml(name)}" d="${d}" />`
  }).join('\n')

  writeFileSync(svgOut,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">\n${pathTags}\n</svg>\n`
  )

  const names = features
    .map(f => ((f.properties?.name ?? f.properties?.name_en ?? '') as string).trim())
    .filter(Boolean)
    .sort()

  const ts =
    `export const ${exportName} = [\n` +
    names.map(n => `  { id: ${JSON.stringify(n)}, name: ${JSON.stringify(n)} }`).join(',\n') +
    '\n]\n'
  writeFileSync(tsOut, ts)

  console.log(`✓  ${svgOut} (${features.length} regions)  →  ${tsOut}`)
}

function escXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

main().catch(err => { console.error(err); process.exit(1) })
```

- [ ] **Step 3: Commit the script and dependency changes**

```bash
git add scripts/generate-maps.ts package.json bun.lock
git commit -m "feat: add map generation script and d3-geo dependency"
```

---

### Task 2: Run the script — generate SVGs and data files

**Files:**
- Create: `public/india.svg`, `public/china.svg`
- Create: `client/indiaStates.ts`, `client/chinaProvinces.ts`

- [ ] **Step 1: Run the generation script**

```bash
bun scripts/generate-maps.ts
```

Expected output:
```
Fetching Natural Earth admin-1 GeoJSON (~7 MB, one moment)…
✓  public/india.svg (36 regions)  →  client/indiaStates.ts
✓  public/china.svg (33 regions)  →  client/chinaProvinces.ts
```

Region counts may vary slightly (Natural Earth versioning). If either count is 0, the `adm0_a3` filter failed — open a feature in the GeoJSON and check which property holds the country code, then update the script.

- [ ] **Step 2: Verify the generated SVGs have named paths**

```bash
grep -c '<path id=' public/india.svg
grep -c '<path id=' public/china.svg
```

Expected: non-zero number matching the counts above.

```bash
head -5 public/india.svg
```

Expected: lines like `<path id="Andhra Pradesh" d="M..."/>`.

- [ ] **Step 3: Verify the generated TypeScript files**

```bash
head -10 client/indiaStates.ts
head -10 client/chinaProvinces.ts
```

Expected: arrays of `{ id: "...", name: "..." }` where IDs match the path IDs in the SVGs.

- [ ] **Step 4: Commit the generated files**

```bash
git add public/india.svg public/china.svg client/indiaStates.ts client/chinaProvinces.ts
git commit -m "feat: add generated India and China SVG maps and region data"
```

---

### Task 3: Create SplashPage.vue

**Files:**
- Create: `client/SplashPage.vue`

- [ ] **Step 1: Create `client/SplashPage.vue`**

```vue
<template>
  <div class="splash">
    <h1 class="splash-title">Map Games</h1>
    <div class="splash-grid">
      <button class="splash-card" @click="router.push('/countries')">🌍 Countries</button>
      <button class="splash-card" @click="router.push('/us')">🗺️ US States</button>
      <button class="splash-card" @click="router.push('/asia')">🌏 India & China</button>
      <button class="splash-card" @click="router.push('/city')">📍 City Game</button>
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

@media (max-width: 360px) {
  .splash-grid {
    grid-template-columns: 1fr;
  }
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add client/SplashPage.vue
git commit -m "feat: add SplashPage with four game navigation cards"
```

---

### Task 4: Create CountriesGame.vue and UsGame.vue

**Files:**
- Create: `client/CountriesGame.vue`
- Create: `client/UsGame.vue`

These are thin wrappers that pass the right props to the existing `MapGame.vue`. The existing `App.vue` currently does this job for both modes in a combined component — these components each handle one mode and live on their own route.

- [ ] **Step 1: Create `client/CountriesGame.vue`**

```vue
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
```

- [ ] **Step 2: Create `client/UsGame.vue`**

```vue
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
```

- [ ] **Step 3: Commit**

```bash
git add client/CountriesGame.vue client/UsGame.vue
git commit -m "feat: extract CountriesGame and UsGame as standalone route components"
```

---

### Task 5: Create AsiaGame.vue

**Files:**
- Create: `client/AsiaGame.vue`

- [ ] **Step 1: Create `client/AsiaGame.vue`**

The `:key="mode"` on `<MapGame>` forces a full remount when the user switches between India and China, resetting game state cleanly.

The toggle uses the `.mode-button` and `.mode-switcher` classes already defined in `client/styles.css` by the existing `App.vue`.

```vue
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
```

- [ ] **Step 2: Commit**

```bash
git add client/AsiaGame.vue
git commit -m "feat: add AsiaGame with India/China toggle"
```

---

### Task 6: Update router.ts and smoke test

**Files:**
- Modify: `client/router.ts`

- [ ] **Step 1: Replace `client/router.ts`**

```typescript
import { createRouter, createWebHashHistory } from 'vue-router'
import SplashPage from './SplashPage.vue'
import CountriesGame from './CountriesGame.vue'
import UsGame from './UsGame.vue'
import AsiaGame from './AsiaGame.vue'
import CityGame from './CityGame.vue'

export const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/',          component: SplashPage },
    { path: '/countries', component: CountriesGame },
    { path: '/us',        component: UsGame },
    { path: '/asia',      component: AsiaGame },
    { path: '/city',      component: CityGame }
  ]
})
```

- [ ] **Step 2: Start the dev server**

```bash
bun dev
```

Expected: server starts at `http://localhost:5173` (or similar), no TypeScript errors in the console.

- [ ] **Step 3: Smoke test — splash page**

Open `http://localhost:5173` (add `#/` if needed for hash routing). Verify:
- Four large cards appear on the dark background
- Cards are tappable and navigate to the correct routes
- On a narrow viewport (≤ 480px), cards remain readable (2×2 grid intact)
- On very narrow (≤ 360px), cards stack to a single column

- [ ] **Step 4: Smoke test — Countries game**

Navigate to `#/countries`. Verify:
- World SVG loads and countries are clickable
- Correct/incorrect feedback works
- Visually identical to the previous `/` experience

- [ ] **Step 5: Smoke test — US States game**

Navigate to `#/us`. Verify:
- US SVG loads and states are clickable
- No flags shown (showFlag = false)

- [ ] **Step 6: Smoke test — Asia game**

Navigate to `#/asia`. Verify:
- India mode loads by default — `india.svg` renders with state outlines
- Clicking a state gives correct/incorrect feedback
- Switching to China loads `china.svg` with province outlines and resets the score
- Both maps are pannable and zoomable (Panzoom works)

- [ ] **Step 7: Smoke test — City game**

Navigate to `#/city`. Verify:
- Map loads, guessing flow works
- Back button on CityGame still works (it routes to `/`, which is now SplashPage — correct behavior)

- [ ] **Step 8: Commit**

```bash
git add client/router.ts
git commit -m "feat: wire up splash page and new game routes"
```

---

## Self-Review Checklist

**Spec coverage:**
- ✓ Navigation rework — SplashPage.vue, new routes (Task 3, 6)
- ✓ SVG generation from GeoJSON — generate-maps.ts (Task 1, 2)
- ✓ indiaStates.ts + chinaProvinces.ts generated with matching IDs (Task 2)
- ✓ AsiaGame.vue with India/China toggle (Task 5)
- ✓ CountriesGame.vue + UsGame.vue as standalone components (Task 4)
- ✓ MapGame.vue untouched
- ✓ CityGame.vue untouched
- ✓ Mobile: splash 2×2 grid → 1-col at 360px, splash-card min-height 96px (Task 3)

**Placeholder scan:** No TBDs, TODOs, or "similar to above" references found.

**Type consistency:**
- `indiaStates` / `chinaProvinces` used consistently across Task 2 (generated file) and Task 5 (import)
- `MapGame` props (`items`, `map-url`, `completed-label`, `show-flag`) match existing component interface
- `mode` typed as `'india' | 'china'` in AsiaGame
