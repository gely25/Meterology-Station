import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { HistoryPoint } from '@/types/weather'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type TrendIntensity = 'none' | 'slight' | 'moderate' | 'strong'
export type TrendDirection = 'up' | 'down' | 'stable'

export interface TrendInfo {
  direction: TrendDirection
  intensity: TrendIntensity
  magnitude: number
}

export function calcTrend(history: HistoryPoint[], key: keyof HistoryPoint, baseThreshold = 0.5): TrendInfo {
  if (history.length < 3) return { direction: 'stable', intensity: 'none', magnitude: 0 }

  const recent = history.slice(-3).map(h => Number(h[key]))
  const delta = recent[2] - recent[0]
  const magnitude = Math.abs(delta)

  const slightThreshold = baseThreshold
  const moderateThreshold = baseThreshold * 3
  const strongThreshold = baseThreshold * 10

  let intensity: TrendIntensity = 'none'
  if (magnitude >= strongThreshold) {
    intensity = 'strong'
  } else if (magnitude >= moderateThreshold) {
    intensity = 'moderate'
  } else if (magnitude >= slightThreshold) {
    intensity = 'slight'
  }

  let direction: TrendDirection = 'stable'
  if (magnitude >= slightThreshold) {
    direction = delta > 0 ? 'up' : 'down'
  }

  return { direction, intensity, magnitude }
}
