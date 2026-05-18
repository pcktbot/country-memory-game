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
