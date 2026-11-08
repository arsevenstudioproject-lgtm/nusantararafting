import { describe, expect, it } from 'vitest'
import { steeringFromTilt } from '../src/game/controls'
import { calculateScore, medalFor } from '../src/game/level'

describe('head control calibration', () => {
  it('holds neutral inside the dead zone, including a calibrated offset', () => {
    expect(steeringFromTilt(.03, 0, 1)).toBe(0)
    expect(steeringFromTilt(.26, .23, 1)).toBe(0)
  })
  it('maps symmetric turns, respects sensitivity, and clamps strong input', () => {
    expect(steeringFromTilt(.1, 0, 1)).toBeCloseTo(-steeringFromTilt(-.1, 0, 1))
    expect(steeringFromTilt(.1, 0, 2)).toBeCloseTo(2 * steeringFromTilt(.1, 0, 1))
    expect(steeringFromTilt(2, 0, 2)).toBe(1)
    expect(steeringFromTilt(-2, 0, 2)).toBe(-1)
  })
})

describe('mission rewards', () => {
  it('rewards surviving and finishing quickly without granting a finish bonus on failure', () => {
    expect(calculateScore(10, 0, 90, false)).toBe(1200)
    expect(calculateScore(10, 80, 90, true)).toBe(5500)
    expect(medalFor(13, 100)).toBe(1); expect(medalFor(14, 60)).toBe(2)
    expect(medalFor(23, 45)).toBe(3); expect(medalFor(23, 44)).toBe(2)
  })
})
