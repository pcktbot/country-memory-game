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
