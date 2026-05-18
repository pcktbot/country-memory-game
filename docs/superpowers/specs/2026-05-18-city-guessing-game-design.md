# City Guessing Game — Design Spec
_Date: 2026-05-18_

## Overview

A new game mode added to the existing country/state memory game app. Players are shown a city name and must click its location on a Mapbox GL JS globe map. After each guess, the actual city location and the player's guess are revealed with animated 3D cylinders. A daily seed ensures everyone plays the same 4 cities each day; a random mode is available for testing.

---

## Architecture

### New files
| File | Purpose |
|---|---|
| `client/CityGame.vue` | Self-contained city game component with Mapbox GL JS instance |
| `client/cities.ts` | City dataset — world and US exports |
| `client/cityScoring.ts` | Exponential decay scoring formula and round calculations |

### Modified files
| File | Change |
|---|---|
| `client/App.vue` | Two new mode entries: `"World Cities"` and `"US Cities"` |
| `package.json` | Add `mapbox-gl` dependency |
| `.env` | Add `VITE_MAPBOX_TOKEN` (not committed) |

### Pattern
`CityGame.vue` is self-contained and lives alongside `MapGame.vue` — no shared base component. The existing mode-switcher in `App.vue` already handles swapping components; adding two entries requires no structural changes.

---

## Data Model

```ts
interface City {
  id: string
  name: string
  lat: number
  lng: number
  difficulty: 'easy' | 'moderate' | 'hard'
  countryCode: string   // ISO 3166-1 alpha-3 for boundary highlight
  stateCode?: string    // US FIPS code (US cities only)
}
```

### City dataset
- **World cities:** ~200 cities covering capitals and major metros across all continents, tagged easy/moderate/hard
- **US cities:** 50 state capitals + ~50 major metros, tagged easy/moderate/hard
- Stored as typed arrays in `client/cities.ts`, split into `worldCities` and `usCities` exports

---

## Daily Seeding

- Seed source: `YYYY-MM-DD` date string hashed via **mulberry32** (simple, deterministic, no dependency)
- Each mode draws independently from its pool: **1 easy, 2 moderate, 1 hard**
- The 4 selected cities are fixed for all players for that calendar day
- **Random mode:** `?random=1` query param bypasses the date seed and picks fresh random cities each load — intended for testing only
- Seed is computed client-side; no server changes required

---

## Round Flow

### Guessing phase
1. Map renders in **globe projection** at zoom ~1.5 (full Earth visible)
2. City labels, road layers, and POI layers are suppressed at map load via `removeLayer` on matching layer IDs
3. Prompt panel displays: **city name** + **difficulty badge**
4. Player clicks the map to place a repositionable guess pin — clicking again moves it, eliminating accidental-click issues
5. **"Confirm Guess"** button locks in the selection; no submission occurs without explicit confirmation
6. Confirm is disabled until a pin has been placed

### Reveal phase (after confirm)
1. `map.flyTo()` animates to the city region at zoom ~4–5
2. Country or state boundary **pulses in** as a filled highlight layer (opacity animates 0 → 0.4 → 0.2)
3. Two **extruded cylinders** animate up from the map surface:
   - **Orange cylinder** = player's guess location
   - **Green cylinder** = actual city location
4. A **line layer** connects the two cylinders; distance label shown in km
5. **Round score** animates in with the multiplier breakdown
6. **"Next City →"** button advances to the next round (or to final summary on round 4)

### End of game
- Summary screen shows all 4 rounds with individual scores and total
- Option to **Play Again** (re-seeds from today's date — same cities) or **Random Round** (random mode)

---

## Map Configuration

### Style
`mapbox://styles/mapbox/outdoors-v12` — terrain shading, elevation contours, rivers, natural landforms. Road, POI, and place-name layers suppressed at runtime.

### Projection
`globe` — set via `map.setProjection('globe')` on init. Automatically transitions to Mercator on zoom-in.

### Zoom
| Phase | Zoom level |
|---|---|
| Guessing (initial) | ~1.5 (full globe) |
| Reveal fly-to | ~4–5 (country/continent scale) |
| Player zoom cap | 12 (city detail, not street level) |

Players can zoom freely during the guessing phase (scroll/pinch). Programmatic `flyTo` calls use fixed target zoom levels (1.5 for reset, 4–5 for reveal) with GL JS animated transitions.

---

## Layers

### Boundary highlight
- **World mode:** Filter Mapbox built-in `country-boundaries` tileset by `iso_3166_1_alpha_3` matching `city.countryCode` — no extra data download
- **US mode:** Small bundled GeoJSON of state outlines (~50kb), filtered by `stateCode`
- Layer type: `fill` with animated `fill-opacity` via `setPaintProperty`

### Cylinders (fill-extrusion)
- Each cylinder is a GeoJSON Polygon approximated as a **32-point circle** at the target coordinate
- Radius: ~20km at world scale (scales with zoom)
- Height animates from 0 → target via `requestAnimationFrame` on `fill-extrusion-height` paint property
- Guess cylinder: orange (`#F19A3E`)
- Actual city cylinder: green (`#85CB33`)

### Distance line
- GeoJSON `LineString` between guess and actual coordinates
- `line` layer type, dashed white stroke
- Distance label rendered as a Mapbox `Marker` (HTML overlay) at the midpoint

---

## Scoring

### Points per round
| Difficulty | Max points | Multiplier |
|---|---|---|
| Easy | 150 | 1× |
| Moderate | 250 | ~1.67× |
| Hard | 350 | ~2.33× |
| **Total** | **1000** | |

### Formula
```ts
score = Math.round(maxPts * Math.exp(-distanceKm / halfScoreKm))
```

### Half-score distances (distance at which you earn 50% of max)
| Difficulty | halfScoreKm |
|---|---|
| Easy | 300 km |
| Moderate | 150 km |
| Hard | 75 km |

Score floors at 0. Distance calculated via **Haversine formula** in `cityScoring.ts`.

---

## Component Lifecycle

- Mapbox map instance created in `onMounted`, destroyed in `onUnmounted`
- Layers and sources added after `map.on('load', ...)` fires
- Guess pin, boundary highlight, and cylinders are added/removed per round (sources updated via `setData`, not re-added)
- Token read from `import.meta.env.VITE_MAPBOX_TOKEN`

---

## Out of Scope

- Persistent score history / leaderboard
- User accounts or sharing results
- Server-side daily seed validation
- Mobile-specific touch controls beyond what Mapbox GL JS provides natively
