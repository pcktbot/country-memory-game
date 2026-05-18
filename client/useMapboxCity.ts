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
  activeRafs: Set<number>,
  duration = 900
): void {
  const start = performance.now()
  let rafId: number
  const frame = (now: number) => {
    const t = Math.min((now - start) / duration, 1)
    const eased = 1 - Math.pow(1 - t, 3)
    map.setPaintProperty(layerId, 'fill-extrusion-height', targetHeight * eased)
    if (t < 1) {
      rafId = requestAnimationFrame(frame)
      activeRafs.add(rafId)
    } else {
      activeRafs.delete(rafId)
    }
  }
  rafId = requestAnimationFrame(frame)
  activeRafs.add(rafId)
}

function animateFillOpacity(
  map: mapboxgl.Map,
  layerId: string,
  target: number,
  activeRafs: Set<number>,
  duration = 500
): void {
  const start = performance.now()
  let rafId: number
  const frame = (now: number) => {
    const t = Math.min((now - start) / duration, 1)
    map.setPaintProperty(layerId, 'fill-opacity', target * t)
    if (t < 1) {
      rafId = requestAnimationFrame(frame)
      activeRafs.add(rafId)
    } else {
      activeRafs.delete(rafId)
    }
  }
  rafId = requestAnimationFrame(frame)
  activeRafs.add(rafId)
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
  const activeRafs = new Set<number>()

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
      animateFillOpacity(m, 'country-highlight-fill', 0.35, activeRafs, 600)
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
      animateFillOpacity(m, 'state-highlight-fill', 0.35, activeRafs, 600)
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
    animateHeight(m, 'guess-cylinder-layer', 180000, activeRafs)

    // Place actual city cylinder (slight delay so they appear sequentially)
    await new Promise(r => setTimeout(r, 300))
    ;(m.getSource('actual-cylinder') as mapboxgl.GeoJSONSource).setData(
      circlePolygon([city.lng, city.lat], CYLINDER_RADIUS_KM)
    )
    animateHeight(m, 'actual-cylinder-layer', 300000, activeRafs)

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

    // Cancel any in-flight animations
    activeRafs.forEach(id => cancelAnimationFrame(id))
    activeRafs.clear()

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

  function destroy() {
    activeRafs.forEach(id => cancelAnimationFrame(id))
    activeRafs.clear()
    guessMarker?.remove()
    distanceMarker?.remove()
    map?.remove()
    map = null
    mapReady.value = false
  }

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
}
