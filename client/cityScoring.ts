export type Difficulty = 'easy' | 'moderate' | 'hard'

const MAX_POINTS: Record<Difficulty, number> = {
  easy: 150,
  moderate: 250,
  hard: 350
}

// Distance at which score reaches 0
const MAX_DISTANCE_KM: Record<Difficulty, number> = {
  easy: 1500,
  moderate: 750,
  hard: 400
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function calculateScore(difficulty: Difficulty, distanceKm: number): number {
  const maxPts = MAX_POINTS[difficulty]
  const maxDist = MAX_DISTANCE_KM[difficulty]
  return Math.max(0, Math.round(maxPts * (1 - distanceKm / maxDist)))
}
