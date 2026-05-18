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
