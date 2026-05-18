export type GamePhase = 'guessing' | 'revealing' | 'complete'

export interface SavedGame {
  date: string
  cityIds: string[]
  rounds: number[]
  roundIndex: number
  phase: GamePhase
}

const KEY = 'city-game-daily'

export function loadDailyGame(today: string): SavedGame | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const saved = JSON.parse(raw) as SavedGame
    return saved.date === today ? saved : null
  } catch {
    return null
  }
}

export function saveDailyGame(state: SavedGame): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(state))
  } catch {}
}
