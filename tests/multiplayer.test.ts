import { describe, expect, it } from 'vitest'
import { MultiplayerManager } from '../src/game/multiplayer'
import { RiverPhysics } from '../src/game/physics'

describe('Multiplayer System', () => {
  it('generates valid 4-digit numeric room codes', async () => {
    const mp = new MultiplayerManager()
    const code = await mp.createRoom()
    expect(code).toMatch(/^\d{4}$/)
    expect(code.length).toBe(4)
    expect(Number(code)).toBeGreaterThanOrEqual(1000)
    expect(Number(code)).toBeLessThanOrEqual(9999)
    mp.leaveRoom()
  })

  it('rejects invalid room codes', async () => {
    const mp = new MultiplayerManager()
    await expect(mp.joinRoom('abc')).rejects.toThrow('Kode harus 4 digit angka')
    await expect(mp.joinRoom('12345')).rejects.toThrow('Kode harus 4 digit angka')
    mp.leaveRoom()
  })

  it('handles raft-to-raft collision physics properly', async () => {
    const phys = new RiverPhysics()
    await phys.init()

    const initialSpin = phys.spinImpulse

    // Simulate opponent raft bumping from the right (nx = -1)
    phys.applyOpponentBump(-1, 0)

    expect(phys.lateralVelocity).toBeLessThan(0)
    expect(phys.spinImpulse).not.toBe(initialSpin)
    phys.dispose()
  })
})
