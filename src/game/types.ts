export type Mode = 'menu' | 'playing' | 'paused' | 'won' | 'lost'
export type Control = 'keyboard' | 'head'
export type GameType = 'expedition' | 'endless'

export interface Settings {
  volume: number
  sensitivity: number
  quality: 'high' | 'medium'
  control: Control
  raftSkin: string
  paddleSkin: string
}

export interface Progress {
  bestScore: number
  bestTime: number
  medal: number
  completions: number
  totalStars: number
  unlockedRaftSkins: string[]
  unlockedPaddleSkins: string[]
  endlessBestDistance: number
  endlessBestScore: number
}

export interface GameState {
  mode: Mode
  gameType: GameType
  ready: boolean
  error: string
  time: number
  distance: number
  speed: number
  health: number
  stamina: number
  boosting: boolean
  braking: boolean
  nosCharges: number
  nosActive: boolean
  nosTimeLeft: number
  parachuteCharges: number
  parachuteActive: boolean
  parachuteTimeLeft: number
  coins: number
  hasShield: boolean
  magnetActive: boolean
  magnetTimeLeft: number
  feverActive: boolean
  feverTimeLeft: number
  stars: number
  score: number
  checkpoint: number
  section: number
  hits: number
  combo: number
  nearMissCount: number
  isAirborne: boolean
  toast: string
  toastType: 'info' | 'hit' | 'star'
  onDock: boolean
  dockCountdown: number
  isMultiplayer: boolean
  opponentName: string
  opponentDistance: number
  opponentScore: number
  opponentHealth: number
}

export interface Obstacle {
  id: number
  kind: 'rock' | 'log' | 'tree' | 'crocodile' | 'ramp'
  s: number
  offset: number
  radius: number
  length?: number
  angle?: number
  height?: number
}

export type PickupKind = 'star' | 'nos' | 'repair' | 'coin' | 'shield' | 'parachute' | 'magnet'

export interface Pickup {
  id: number
  s: number
  offset: number
  kind: PickupKind
  height?: number
}

export interface RiverFork {
  id: number
  startS: number
  decisionS: number
  chasmS: number
  endS: number
  safeSide: -1 | 1
  name: string
  label: string
}

export interface Section {
  name: string
  label: string
  start: number
  end: number
  hint: string
  speed: number
  current: number
  rapids: number
  rain?: number
}

export interface TrackingState {
  status: 'off' | 'loading' | 'calibrating' | 'tracking' | 'lost' | 'error'
  message: string
  yaw: number
  pitch: number
  steering: number
  calibration: number
  nodAction: 'none' | 'boost' | 'brake'
}
