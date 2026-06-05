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
