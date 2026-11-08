import { afterEach, describe, expect, it } from 'vitest'
import { RiverPhysics } from '../src/game/physics'
import { RAMP_LENGTH, RIVER_FORKS, obstacles, pickups, riverCenter, rapidIntensity, riverTangent, sectionAt, sections, whirlpools } from '../src/game/level'

const worlds: RiverPhysics[] = []
async function create() { const physics = new RiverPhysics(); await physics.init(); worlds.push(physics); return physics }
afterEach(() => { worlds.splice(0).forEach(world => world.dispose()) })

function routeOffset(s: number) {
  const next = pickups.findIndex(p => p.s >= s)
  if (next < 0) return 0
  const a = pickups[Math.max(0, next - 1)], b = pickups[next]
  const t = a.s === b.s ? 1 : Math.max(0, Math.min(1, (s - a.s) / (b.s - a.s)))
  return a.offset + (b.offset - a.offset) * t
}

function steer(physics: RiverPhysics) {
  const p = physics.raft.translation(), s = -p.z, section = sections[sectionAt(s)]
  let offset = routeOffset(s + 6)
  // Hindari buaya di depan: geser jalur menjauh ke arah tengah sungai
  for (const o of obstacles) {
    if (o.kind !== 'crocodile' || o.s < s - 4 || o.s > s + 26) continue
    if (Math.abs(offset - o.offset) < 10) offset = o.offset + (o.offset > 0 ? -11 : 11)
  }
  // Collider batu kini sebesar modelnya: hindari batu/pulau di depan
  for (const o of obstacles) {
    if ((o.kind !== 'rock' && o.kind !== 'tree') || o.s < s - 3 || o.s > s + 30) continue
    const clear = o.radius + 4
    if (Math.abs(offset - o.offset) < clear) offset = o.offset + (offset >= o.offset ? 1 : -1) * clear
  }
  for (const w of whirlpools) {
    if (w.s < s - 6 || w.s > s + 26) continue
    if (Math.abs(offset - w.offset) < w.radius + 7) offset = w.offset + (w.offset > 0 ? -1 : 1) * (w.radius + 8)
  }
  const target = riverCenter(s + 6) + offset
  const rapid = rapidIntensity(s)
  const turbulence = rapid * (Math.sin(physics.time * 2.3 + s * .21) * 4.2 + Math.sin(physics.time * 5.7 + s * .09) * 2.4)
  const drift = riverTangent(s) * physics.forwardSpeed + section.current * (1 + rapid * .9) * Math.sin(s * .037 + physics.time * .55) + turbulence
  return Math.max(-1, Math.min(1, ((target - p.x) * 2.2 - drift) / 8.5))
}

describe('Sungai Hijau / Rapier integration', () => {
  it('completes the navigable route and checkpoints', async () => {
    const p = await create(), visited = new Set<number>()
    let frames = 0
    while (!p.finished && p.health > 0 && frames++ < 60 * 100) {
      visited.add(sectionAt(-p.raft.translation().z))
      p.step(steer(p))
    }
    const result = { finished: p.finished, time: p.time, health: p.health, stars: p.stars, hits: p.hits, distance: -p.raft.translation().z }
    console.log('Physical route segment:', JSON.stringify(result))
    expect(visited.size).toBeGreaterThanOrEqual(6)
    expect(p.checkpoint).toBeGreaterThanOrEqual(4)
    expect(p.stars).toBeGreaterThanOrEqual(18); expect(p.health).toBeGreaterThan(45)
    expect(-p.raft.translation().z).toBeGreaterThan(700)
  }, 20000)

  it('supports boost and brake paddling mechanics', async () => {
    const p = await create()
    p.step(0, 1, true, false)
    expect(p.boosting).toBe(true)
    expect(p.stamina).toBeLessThan(100)

    p.stamina = 100
    p.step(0, 1, false, true)
    expect(p.braking).toBe(true)
    expect(p.stamina).toBeLessThan(100)
  })

  it('supports endless mode beyond finish line without terminating', async () => {
    const p = await create()
    p.isEndless = true
    p.raft.setTranslation({ x: riverCenter(1850), y: .4, z: -1850 }, true)
    p.raft.setLinvel({ x: 0, y: 0, z: -12 }, true)
    for (let i = 0; i < 60; i++) p.step(0)
    expect(p.finished).toBe(false)
    expect(-p.raft.translation().z).toBeGreaterThan(1850)
  })

  it.each(['rock', 'log', 'tree'] as const)('%s colliders change momentum and damage the raft', async kind => {
    const p = await create(), obstacle = obstacles.find(o => o.kind === kind)!
    const x = riverCenter(obstacle.s) + obstacle.offset
    p.raft.setTranslation({ x, y: .4, z: -obstacle.s + 9 }, true)
    p.raft.setLinvel({ x: 0, y: 0, z: -12 }, true)
    let impacts = 0, strength = 0
    p.onImpact = impact => { impacts++; strength = Math.max(strength, impact.strength) }
    let minimumForwardSpeed = 100
    for (let i = 0; i < 100; i++) {
      const pos = p.raft.translation(); p.step(Math.max(-1, Math.min(1, (x - pos.x) * .3)))
      minimumForwardSpeed = Math.min(minimumForwardSpeed, -p.raft.linvel().z)
    }
    expect(impacts).toBeGreaterThan(0); expect(impacts).toBeLessThan(4)
    expect(strength).toBeGreaterThan(1.4); expect(p.health).toBeLessThan(100)
    expect(minimumForwardSpeed).toBeLessThan(8)
  })

  it('moves downstream with no input and responds physically to both steering directions', async () => {
    const p = await create(), start = p.raft.translation()
    for (let i = 0; i < 45; i++) p.step(0)
    expect(p.raft.translation().z).toBeLessThan(start.z - 5)
    for (let i = 0; i < 40; i++) p.step(-1)
    expect(p.raft.linvel().x).toBeLessThan(-3)
    for (let i = 0; i < 70; i++) p.step(1)
    expect(p.raft.linvel().x).toBeGreaterThan(3)
  })

  it('moves and rotates floating logs, then resets every mission state', async () => {
    const p = await create(), body = p.floating[0].body, before = body.translation()
    for (let i = 0; i < 60; i++) p.step(0)
    expect(body.translation()).not.toEqual(before); expect(Math.abs(body.rotation().y)).toBeGreaterThan(.01)
    p.reset()
    expect(p.time).toBe(0); expect(p.health).toBe(100); expect(p.collected.size).toBe(0)
    expect(p.checkpoint).toBe(0); expect(p.stars).toBe(0); expect(p.finished).toBe(false)
    expect(p.world.bodies.len()).toBeGreaterThan(100)
  })

  it('ends the simulation on raft failure and does not advance afterward', async () => {
    const p = await create()
    p.canSink = true
    const obstacle = obstacles[0], x = riverCenter(obstacle.s) + obstacle.offset
    for (let hit = 0; hit < 15 && p.health > 0; hit++) {
      p.raft.setTranslation({ x, y: .4, z: -obstacle.s + 9 }, true)
      p.raft.setLinvel({ x: 0, y: 0, z: -14 }, true)
      for (let i = 0; i < 100; i++) p.step(Math.max(-1, Math.min(1, (x - p.raft.translation().x) * .3)))
    }
    expect(p.health).toBe(0)
    const time = p.time, position = p.raft.translation()
    p.step(1); expect(p.time).toBe(time); expect(p.raft.translation()).toEqual(position)
  })

  it('wrong fork channel traps the raft in a whirlpool and respawns at a checkpoint (no chasm fall)', async () => {
    const p = await create(), fork = RIVER_FORKS[0]
    let capsized = 0, respawnS = -1
    p.onCapsize = () => capsized++
    p.onRespawn = s => { respawnS = s }
    p.checkpoint = 5 // checkpoint 820 sudah dilewati
    const wrongX = (s: number) => riverCenter(s) - fork.safeSide * 9
    p.raft.setTranslation({ x: wrongX(fork.chasmS - 6), y: .4, z: -(fork.chasmS - 6) }, true)
    for (let i = 0; i < 60 * 5 && respawnS < 0; i++) {
      const pos = p.raft.translation()
      p.step(Math.max(-1, Math.min(1, (wrongX(-pos.z) - pos.x) * .5)))
    }
    expect(p.isWaterfallPlunge).toBe(false)
    expect(capsized).toBeGreaterThan(0)
    expect(respawnS).toBeLessThan(fork.startS)
    expect(p.health).toBeGreaterThan(0)
  })

  it('has no crocodiles inside fork sections', () => {
    for (const fork of RIVER_FORKS) {
      expect(obstacles.some(o => o.kind === 'crocodile' && o.s > fork.startS - 15 && o.s < fork.endS + 15)).toBe(false)
    }
  })

  it('raft rides up the whole ramp and only launches at the lip', async () => {
    const p = await create(), ramp = obstacles.find(o => o.kind === 'ramp')!
    const x = riverCenter(ramp.s) + ramp.offset
    let launchS = -1, maxLift = 0
    p.onJumpLaunch = () => { launchS = -p.raft.translation().z }
    p.raft.setTranslation({ x, y: .4, z: -(ramp.s - 12) }, true)
    for (let i = 0; i < 120 && launchS < 0; i++) {
      p.step(Math.max(-1, Math.min(1, (riverCenter(-p.raft.translation().z) + ramp.offset - p.raft.translation().x) * .6)))
      maxLift = Math.max(maxLift, p.rampLift)
    }
    expect(launchS).toBeGreaterThan(ramp.s + RAMP_LENGTH / 2 - 1)
    expect(maxLift).toBeGreaterThan((ramp.height ?? 2.4) * .8)
    expect(p.isAirborne).toBe(true)
  })
})
