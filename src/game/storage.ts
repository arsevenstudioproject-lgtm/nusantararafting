import type { Progress, Settings } from './types'

const defaults: Settings = {
  volume: .55,
  sensitivity: 1,
  quality: 'high',
  control: 'keyboard',
  raftSkin: 'yellow',
  paddleSkin: 'wood',
}

const initial: Progress = {
  bestScore: 0,
  bestTime: 0,
  medal: 0,
  completions: 0,
  totalStars: 0,
  unlockedRaftSkins: ['yellow'],
  unlockedPaddleSkins: ['wood'],
  endlessBestDistance: 0,
  endlessBestScore: 0,
}

export function readSettings(): Settings {
  try {
    const data = JSON.parse(localStorage.getItem('river-rush.settings') || '{}')
    return {
      volume: typeof data.volume === 'number' ? Math.max(0, Math.min(1, data.volume)) : defaults.volume,
      sensitivity: typeof data.sensitivity === 'number' ? Math.max(.5, Math.min(2, data.sensitivity)) : 1,
      quality: data.quality === 'medium' ? 'medium' : 'high',
      control: data.control === 'head' ? 'head' : 'keyboard',
      raftSkin: typeof data.raftSkin === 'string' ? data.raftSkin : defaults.raftSkin,
      paddleSkin: typeof data.paddleSkin === 'string' ? data.paddleSkin : defaults.paddleSkin,
    }
  } catch {
    return { ...defaults }
  }
}

export function readProgress(): Progress {
  try {
    const data = JSON.parse(localStorage.getItem('river-rush.progress') || '{}')
    return {
      bestScore: Number.isFinite(data.bestScore) ? Math.max(0, data.bestScore) : initial.bestScore,
      bestTime: Number.isFinite(data.bestTime) ? Math.max(0, data.bestTime) : initial.bestTime,
      medal: Number.isFinite(data.medal) ? Math.max(0, data.medal) : initial.medal,
      completions: Number.isFinite(data.completions) ? Math.max(0, data.completions) : initial.completions,
      totalStars: Number.isFinite(data.totalStars) ? Math.max(0, data.totalStars) : initial.totalStars,
      unlockedRaftSkins: Array.isArray(data.unlockedRaftSkins) && data.unlockedRaftSkins.length ? data.unlockedRaftSkins : initial.unlockedRaftSkins,
      unlockedPaddleSkins: Array.isArray(data.unlockedPaddleSkins) && data.unlockedPaddleSkins.length ? data.unlockedPaddleSkins : initial.unlockedPaddleSkins,
      endlessBestDistance: Number.isFinite(data.endlessBestDistance) ? Math.max(0, data.endlessBestDistance) : initial.endlessBestDistance,
      endlessBestScore: Number.isFinite(data.endlessBestScore) ? Math.max(0, data.endlessBestScore) : initial.endlessBestScore,
    }
  } catch {
    return { ...initial }
  }
}

export function save(key: 'settings' | 'progress', value: Settings | Progress) {
  try {
    localStorage.setItem(`river-rush.${key}`, JSON.stringify(value))
  } catch {
    /* Private mode still supports play. */
  }
}
