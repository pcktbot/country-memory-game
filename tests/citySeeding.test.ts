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
