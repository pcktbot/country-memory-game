# India & China SVG Game + Navigation Rework

**Date:** 2026-06-05  
**Status:** Approved

---

## Overview

Two parallel tracks:

1. **Navigation rework** — replace the current combined App.vue home+game with a splash page that routes to each game independently.
2. **India & China game** — click-to-find game for Indian states and Chinese provinces, using the existing `MapGame.vue` component with generated SVG maps.

---

## Routing & Navigation

### New route table

| Path | Component | Notes |
|------|-----------|-------|
| `/` | `SplashPage.vue` | New — four large tap-friendly cards |
| `/countries` | `CountriesGame.vue` | Extracted from current `App.vue` |
| `/us` | `UsGame.vue` | Extracted from current `App.vue` |
| `/asia` | `AsiaGame.vue` | New — India + China toggled |
| `/city` | `CityGame.vue` | Unchanged |

### SplashPage.vue

- Four large cards: **Countries**, **US States**, **India & China**, **City Game**
- No description text — title only (optionally a small emoji)
- Layout: 2×2 grid on wide screens, single column on narrow (≤ 480px)
- Cards are full-width tap targets (min-height 48px), consistent with mobile-first design

### Existing App.vue

`App.vue` currently serves as both home screen and game shell. It is refactored:
- The Countries/US States mode switcher + `MapGame` shell is split into `CountriesGame.vue` and `UsGame.vue` (each a thin wrapper passing the right items + SVG URL to `MapGame`)
- `App.vue` becomes the Vue Router shell (already partially done via `RouterShell.vue`)

---

## SVG Generation

### Script: `scripts/generate-maps.ts`

Run once with `bun scripts/generate-maps.ts`. Committed script, committed output.

**Inputs:** GeoJSON from Natural Earth admin-1 subdivisions, filtered to:
- `ADM0_A3 === 'IND'` → Indian states & union territories
- `ADM0_A3 === 'CHN'` → Chinese provinces, municipalities, autonomous regions

**Process:**
1. Load GeoJSON
2. Project with `d3-geo` (equirectangular, fitted to a fixed viewBox e.g. `0 0 1000 1000`)
3. For each feature, emit a `<path>` with `id` set to the English name from GeoJSON properties (`NAME_EN` or `name`)
4. Wrap in `<svg>` with `viewBox`, no hardcoded width/height (MapGame scales it)

**Outputs:**
- `public/india.svg`
- `public/china.svg`

Both files are committed to the repo so no runtime generation is needed.

---

## Data Files

### `client/indiaStates.ts`

```ts
export const indiaStates = [
  { id: 'Andhra Pradesh', name: 'Andhra Pradesh' },
  { id: 'Arunachal Pradesh', name: 'Arunachal Pradesh' },
  // ... all 28 states + 8 union territories
]
```

### `client/chinaProvinces.ts`

```ts
export const chinaProvinces = [
  { id: 'Anhui', name: 'Anhui' },
  { id: 'Beijing', name: 'Beijing' },
  // ... all 23 provinces + 4 municipalities + 5 autonomous regions
]
```

IDs must match exactly the `id` attribute values on the generated SVG paths.

---

## AsiaGame.vue

Thin wrapper component at `/asia`:

- Two toggle buttons at the top: **India** | **China** (same visual pattern as the current Countries/US States switcher in `App.vue`)
- Renders `<MapGame>` with the active mode's `items` and `mapUrl`
- Default mode: India
- No shared state between India and China modes — switching resets the game (via `:key`)

```
AsiaGame
  ├── [India] [China]  ← toggle buttons
  └── <MapGame :items="activeItems" :mapUrl="activeMapUrl" ... />
```

---

## Mobile Considerations

- Splash cards: `min-height: 48px`, full-width on narrow screens, 2×2 grid above 480px
- `MapGame.vue` scoreboard already renders adequately on mobile — verify after implementation
- No changes to `CityGame.vue` mobile layout
- Touch drag vs click distinction in `MapGame.vue` already handles mobile correctly

---

## What Is Not Changing

- `MapGame.vue` — zero changes; it already supports arbitrary SVG + item arrays
- `CityGame.vue` and `useMapboxCity.ts` — zero changes (bug fix already applied separately)
- `cityScoring.ts`, `citySeeding.ts`, `cityGameStorage.ts` — untouched
- Existing SVG files (`world.svg`, `us.svg`) — untouched

---

## Out of Scope (This Spec)

- Indian and Chinese city Mapbox game (separate spec)
- Scoring persistence / daily mode for Asia game
- Flags for Indian states or Chinese provinces
