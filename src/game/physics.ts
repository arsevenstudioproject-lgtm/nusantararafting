import RAPIER from '@dimforge/rapier3d-compat'
import { CAVE_END, CAVE_START, CHECKPOINTS, FINISH, HALF_WIDTH, RAMP_LENGTH, RIVER_FORKS, START, WATERFALL_DROPS, getSplineTangent, jaggedFieldAt, obstacles, pickups, rapidIntensity, riverCenter, riverTangent, sectionAt, sections, whirlpools, type WaterfallDrop } from './level'
import type { Obstacle } from './types'

let initialization: Promise<void> | undefined
export interface Impact { x: number; z: number; strength: number; damage: number; obstacleId?: number; obstacleKind?: Obstacle['kind']; scoreDeduction?: number }

interface CrocodileAI {
  state: 'patrol' | 'lunge' | 'cooldown'
  hasHit: boolean
  lungeTimer: number
  cooldownTimer: number
  targetX: number
  targetZ: number
}

export class RiverPhysics {
  world!: RAPIER.World
  raft!: RAPIER.RigidBody
  raftCollider!: RAPIER.Collider
  events!: RAPIER.EventQueue
  floating: { body: RAPIER.RigidBody; obstacle: Obstacle }[] = []
  health = 100
  onDock = false
  isSinking = false
  sinkingTimer = 0
  sinkDepth = 0
  sinkRoll = 0
  sinkPitch = 0
  onSinkingStart?: () => void
  onRaftSunk?: () => void
  stamina = 100
  time = 0
  stars = 0
  hits = 0
  scorePenalty = 0
  spinImpulse = 0
  checkpoint = 0
  finished = false
  isEndless = false
  boosting = false
  braking = false
  nosCharges = 1
  isNosActive = false
  nosElapsed = 0
  hasShield = false
  parachuteCharges = 1
  isParachuteActive = false
  parachuteTimeLeft = 0
  isAirborne = false
  jumpAltitude = 0
  jumpVy = 0
  nearMissCount = 0
  combo = 0
  private lastNearMissTime = -10
  private nearMissedObstacles = new Set<number>()
  coins = 0

  // Stunt & Powerup Systems
  stuntRoll = 0
  stuntPitch = 0
  stuntsCompleted = 0
  currentStuntName = ''
  magnetTimeLeft = 0
  feverTimeLeft = 0

  onStuntComplete?: (stuntName: string, count: number) => void
  onStuntLand?: (stuntName: string, count: number, perfect: boolean) => void
  onCollectMagnet?: () => void
  onCrocodileTailWhip?: (id: number, pos: { x: number; z: number }, dir: number) => void
  onFeverStart?: () => void
  onFeverEnd?: () => void
  isWaterfallPlunge = false
  plungeElapsed = 0
  plungeS = 0
  plungeX = 0

  // 2. FISIKA RAKIT (DRIFTING & AUTO-FORWARD):
  lateralOffset = 0      // Local lateral position relative to river spline center (-HALF_WIDTH to +HALF_WIDTH)
  lateralVelocity = 0    // Lateral drift velocity (m/s)
  forwardSpeed = 10      // Current forward speed along curve (m/s)
  currentSlopeY = 0      // Vertical slope angle of the river tangent (for pitch & speed boost)
  dropMomentum = 0       // Kecepatan sisa dari turunan curam yang terbawa ke kolam berikutnya
  rapid = 0              // Intensitas jeram di posisi rakit saat ini (0..1.3)
  private nextDrop = 0
  private trapHold = 0
  rampLift = 0           // Ketinggian rakit di atas permukaan ramp saat meluncur naik
  rampPitch = 0
  private rampEndS = 0

  collected = new Set<number>()
  contacts = new Map<number, number>()
  private obstacleByCollider = new Map<number, Obstacle>()
  private crocStates = new Map<number, CrocodileAI>()
  lastImpact = -10
  whirlpoolSpin = 0
  inWhirlpool = false
  capsized = false
  isCrocodileLaunch = false
  crocLaunchDir = 1
  capsizeElapsed = 0
  private vortexHold = 0
  /** Sisa waktu pantulan setelah tabrakan: kemudi & arus dilemahkan agar pantulan terasa. */
  knockback = 0
  /** Intensitas getaran saat melintas batu bergerigi (0..1). */
  rumble = 0
  private rumbleFieldId = -1
  private lastWallHit = -10
  onRumble?: (entered: boolean) => void
  onCrocodileRam?: (id: number, pos: { x: number; z: number }, dir: number) => void
  private endlessPickupStep = 0

  onImpact?: (impact: Impact) => void
  onCollect?: (id: number) => void
  onCollectNos?: () => void
  onCollectRepair?: () => void
  onCollectCoin?: () => void
  onCollectShield?: () => void
  onCollectParachute?: () => void
  onActivateNos?: () => void
  onActivateParachute?: () => void
  onJumpLaunch?: () => void
  opponentState: { x: number; z: number; s: number; vx: number; vz: number } | null = null

  setOpponentState(state: { x: number; z: number; s: number; vx: number; vz: number } | null) {
    this.opponentState = state;
  }

  applyOpponentBump(nx: number, nz: number) {
    this.lateralVelocity = nx * 14.0;
    this.forwardSpeed = Math.max(5, this.forwardSpeed * 0.75);
    this.spinImpulse += (nx > 0 ? 1 : -1) * 8.0;
    this.raft.applyImpulse({ x: nx * 30.0, y: 0, z: nz * 15.0 }, true);
  }
  onOpponentBump?: (nx: number, nz: number, strength: number) => void
  private lastOpponentBumpTime = -10
  onSplashdown?: (strength: number) => void
  onNearMiss?: (combo: number) => void
  onWaterfallPlunge?: () => void
  onForkTrap?: () => void
  onCascadeLip?: (drop: WaterfallDrop, firstOfSeries: boolean) => void
  onCascadeSplash?: (drop: WaterfallDrop, strength: number) => void
  onShieldHit?: () => void
  onCheckpoint?: (checkpoint: number) => void
  onWhirlpool?: (caught: boolean) => void
  onCapsize?: () => void
  onRespawn?: (distance: number) => void
  onCrocodileLunge?: (id: number, pos: { x: number; y: number; z: number }) => void

  constructor() {}

  async init() {
    initialization ??= RAPIER.init()
    await initialization
    this.createWorld()
  }

  private createWorld() {
    this.world = new RAPIER.World({ x: 0, y: 0, z: 0 })
    this.world.timestep = 1 / 60
    this.events = new RAPIER.EventQueue(true)
    this.raft = this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(riverCenter(START), .4, -START).enabledTranslations(true, false, true)
      .lockRotations().setLinearDamping(.12).setCcdEnabled(true))
    this.raftCollider = this.world.createCollider(RAPIER.ColliderDesc.ball(1.55).setMass(8)
      .setRestitution(.32).setFriction(.12).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS), this.raft)
    this.raft.setLinvel({ x: 0, y: 0, z: -8 }, true)

    this.crocStates.clear()
    for (const obstacle of obstacles) {
      this.addObstacle(obstacle)
      if (obstacle.kind === 'crocodile') {
        this.crocStates.set(obstacle.id, { state: 'patrol', hasHit: false, lungeTimer: 0, cooldownTimer: 0, targetX: 0, targetZ: 0 })
      }
    }

    const wallEnd = this.isEndless ? 6000 : FINISH + 120
    for (let s = -30; s < wallEnd; s += 10) for (const side of [-1, 1]) {
      const angle = -Math.atan(riverTangent(s + 5))
      const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed()
        .setTranslation(riverCenter(s + 5) + side * (HALF_WIDTH + 1), 0, -s - 5)
        .setRotation({ x: 0, y: Math.sin(angle / 2), z: 0, w: Math.cos(angle / 2) }))
      const wallCollider = this.world.createCollider(
        RAPIER.ColliderDesc.cuboid(1.2, 3.5, 5.3)
          .setFriction(.05)
          .setRestitution(.35)
          .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
        body
      )
      this.obstacleByCollider.set(wallCollider.handle, {
        id: -1000 - s * 2 + (side > 0 ? 1 : 0),
        kind: 'rock',
        s: s + 5,
        offset: side * (HALF_WIDTH + 1),
        radius: 2.2,
      })
    }
  }

  private addObstacle(obstacle: Obstacle) {
    const { kind, s, offset, radius, length = 0, angle = 0 } = obstacle
    const moving = kind === 'log' || kind === 'crocodile'
    const desc = moving ? RAPIER.RigidBodyDesc.kinematicPositionBased() : RAPIER.RigidBodyDesc.fixed()
    const body = this.world.createRigidBody(desc.setTranslation(riverCenter(s) + offset, .25, -s)
      .setRotation({ x: 0, y: Math.sin(angle / 2), z: 0, w: Math.cos(angle / 2) }))
    let collider: RAPIER.ColliderDesc
    if (kind === 'rock') collider = RAPIER.ColliderDesc.cylinder(3.5, radius * 1.0)
    else if (kind === 'tree') collider = RAPIER.ColliderDesc.cylinder(3.5, radius * 1.0) // pulau batu + pohon (bulat)
    else if (kind === 'crocodile') collider = RAPIER.ColliderDesc.cuboid(1.25, .3, (length || 7.6) * .43)
    else if (kind === 'ramp') collider = RAPIER.ColliderDesc.cuboid(radius * 0.95, 0.45, (length || 4.2) * 0.5).setSensor(true)
    else collider = RAPIER.ColliderDesc.capsule(length / 2 - radius, radius)
      .setRotation({ x: 0, y: 0, z: Math.SQRT1_2, w: Math.SQRT1_2 })
    const colliderBody = this.world.createCollider(collider.setRestitution(kind === 'crocodile' ? .3 : .55)
      .setFriction(.12).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS), body)
    this.obstacleByCollider.set(colliderBody.handle, obstacle)
    if (moving) this.floating.push({ body, obstacle })
  }

  initDockStart() {
    this.onDock = true
    this.forwardSpeed = 0
    this.lateralOffset = 0
    this.lateralVelocity = 0
    this.isSinking = false
    this.sinkingTimer = 0
    this.sinkDepth = 0
    this.sinkRoll = 0
    this.sinkPitch = 0
    this.health = 100
    this.finished = false
    this.raft.setTranslation({ x: riverCenter(4), y: 0.85, z: -4 }, true)
    this.raft.setLinvel({ x: 0, y: 0, z: 0 }, true)
  }

  launchFromDock() {
    this.onDock = false
    this.forwardSpeed = 9.5
    this.raft.setLinvel({ x: 0, y: -1.2, z: -9.5 }, true)
  }

  reset() {
    this.isSinking = false
    this.sinkingTimer = 0
    this.sinkDepth = 0
    this.sinkRoll = 0
    this.sinkPitch = 0
    this.stuntRoll = 0
    this.stuntPitch = 0
    this.stuntsCompleted = 0
    this.currentStuntName = ''
    this.magnetTimeLeft = 0
    this.feverTimeLeft = 0
    this.events.free()
    this.world.free()
    this.floating = []
    this.obstacleByCollider.clear()
    this.contacts.clear()
    this.collected.clear()
    this.crocStates.clear()
    this.health = 100
    this.stamina = 100
    this.time = 0
    this.stars = 0
    this.hits = 0
    this.scorePenalty = 0
    this.spinImpulse = 0
    this.checkpoint = 0
    this.finished = false
    this.boosting = false
    this.braking = false
    this.lastImpact = -10
    this.whirlpoolSpin = 0
    this.inWhirlpool = false
    this.capsized = false
    this.isCrocodileLaunch = false
    this.capsizeElapsed = 0
    this.vortexHold = 0
    this.endlessPickupStep = 0
    this.nosCharges = 1
    this.isNosActive = false
    this.nosElapsed = 0
    this.hasShield = false
    this.parachuteCharges = 1
    this.isParachuteActive = false
    this.parachuteTimeLeft = 0
    this.isAirborne = false
    this.jumpAltitude = 0
    this.jumpVy = 0
    this.nearMissCount = 0
    this.combo = 0
    this.lastNearMissTime = -10
    this.nearMissedObstacles.clear()
    this.coins = 0
    this.isWaterfallPlunge = false
    this.plungeElapsed = 0
    this.plungeS = 0
    this.plungeX = 0
    this.lateralOffset = 0
    this.lateralVelocity = 0
    this.forwardSpeed = 10
    this.currentSlopeY = 0
    this.dropMomentum = 0
    this.rapid = 0
    this.nextDrop = 0
    this.trapHold = 0
    this.rampLift = 0
    this.rampPitch = 0
    this.knockback = 0
    this.rumble = 0
    this.rumbleFieldId = -1
    this.lastWallHit = -10
    this.createWorld()
  }

  step(steering: number, dt = 1 / 60, boost = false, brake = false, nos = false, parachute = false) {
    if (this.onDock) {
      this.raft.setTranslation({ x: riverCenter(4), y: 0.85, z: -4 }, true)
      this.raft.setLinvel({ x: 0, y: 0, z: 0 }, true)
      return
    }
    if (this.isSinking) {
      this.sinkingTimer += dt
      this.forwardSpeed *= Math.exp(-dt * 3.5)
      this.sinkDepth = Math.min(2.4, this.sinkDepth + dt * 1.5)
      this.sinkRoll += dt * 1.8
      this.sinkPitch += dt * 1.2
      if (this.sinkingTimer >= 1.8) {
        this.finished = true
        this.health = 0
        this.onRaftSunk?.()
      }
      return
    }
    if (this.finished) return
    this.time += dt
    this.knockback = Math.max(0, this.knockback - dt)
    this.spinImpulse *= Math.exp(-dt * 4.5)
    if (Math.abs(this.spinImpulse) < 0.01) this.spinImpulse = 0
    if (this.isWaterfallPlunge) {
      this.plungeElapsed += dt
      this.raft.resetForces(true)
      if (this.plungeElapsed >= 2.4) {
        this.health = 0
        this.finished = true
      }
      return
    }
    if (this.capsized) {
      this.capsizeElapsed += dt
      this.whirlpoolSpin *= Math.exp(-dt * .45)
      const maxCapsize = this.isCrocodileLaunch ? 1.85 : 1.65
      if (this.capsizeElapsed >= maxCapsize) this.respawnAtCheckpoint()
      return
    }

    if (nos && this.nosCharges > 0 && !this.isNosActive) {
      this.nosCharges--
      this.isNosActive = true
      this.nosElapsed = 0
      this.onActivateNos?.()
    }
    if (this.isNosActive) {
      this.nosElapsed += dt
      if (this.nosElapsed >= 3.5) {
        this.isNosActive = false
      }
    }

    if (parachute && this.parachuteCharges > 0 && !this.isParachuteActive) {
      this.parachuteCharges--
      this.isParachuteActive = true
      this.parachuteTimeLeft = 4.8
      this.isAirborne = true
      this.jumpVy = Math.max(this.jumpVy, 5.2)
      this.onActivateParachute?.()
    }
    if (this.isParachuteActive) {
      this.parachuteTimeLeft -= dt
      if (this.parachuteTimeLeft <= 0) {
        this.isParachuteActive = false
        this.parachuteTimeLeft = 0
      }
    }

    // Vertical airborne dynamics (jump ramp arc & parachute gliding)
    if (this.isAirborne || this.jumpAltitude > 0) {
      if (this.isParachuteActive) {
        const targetAlt = 4.6
        this.jumpVy += (targetAlt - this.jumpAltitude) * 5.2 * dt - this.jumpVy * 2.8 * dt
        this.jumpVy = Math.max(-1.8, Math.min(4.5, this.jumpVy))
        this.jumpAltitude += this.jumpVy * dt
        if (this.jumpAltitude < 1.0) this.jumpAltitude = 1.0
      } else {
        const gravity = 26.5
        this.jumpVy -= gravity * dt
        this.jumpAltitude += this.jumpVy * dt
      }

      if (this.jumpAltitude <= 0) {
        this.jumpAltitude = 0
        const landingStrength = Math.min(10, Math.abs(this.jumpVy))
        this.jumpVy = 0
        this.isAirborne = false
        this.isParachuteActive = false
        this.parachuteTimeLeft = 0
        this.onSplashdown?.(landingStrength)
      }
    }

    const wantsBoost = boost && this.stamina > 3
    const wantsBrake = brake && this.stamina > 1
    if (wantsBoost) {
      this.boosting = true
      this.braking = false
      this.stamina = Math.max(0, this.stamina - dt * 26)
    } else if (wantsBrake) {
      this.braking = true
      this.boosting = false
      this.stamina = Math.max(0, this.stamina - dt * 10)
    } else {
      this.boosting = false
      this.braking = false
      this.stamina = Math.min(100, this.stamina + dt * 22)
    }

    const pos = this.raft.translation()
    const velocity = this.raft.linvel()
    const s = -pos.z
    const section = sections[sectionAt(s)]
    const rapid = rapidIntensity(s)
    this.rapid = rapid
    // Arus lateral lebih kuat di jeram: dorongan sinus + hentakan turbulensi acak-semu
    const current = section.current * (1 + rapid * .9) * Math.sin(s * .037 + this.time * .55)
    const turbulence = rapid * (Math.sin(this.time * 2.1 + s * .18) * 2.4 + Math.sin(this.time * 4.5 + s * .08) * 1.4)

    // 1 & 2. TANGENT Y & GRAVITASI CURAM (CatmullRomCurve3):
    const tangent = getSplineTangent(s)
    const slopeY = -tangent.y // Positif saat menukik ke bawah / air terjun
    this.currentSlopeY = slopeY

    // Lonjakan Kecepatan Gravitasi (Speed Boost) saat sungai menukik curam ke bawah:
    const gravitySpeedBoost = Math.max(0, slopeY) * 22.0
    // Momentum turunan: kecepatan dari muka jeram terbawa dan meluruh perlahan di kolam bawah
    this.dropMomentum = Math.max(this.dropMomentum * Math.exp(-dt * .60), gravitySpeedBoost * .60)
    let flowSpeed = section.speed + Math.max(gravitySpeedBoost, this.dropMomentum) + rapid * 1.5

    if (this.isEndless && s > FINISH) {
      const endlessRamp = Math.min(1.4, 1 + (s - FINISH) / 4000)
      flowSpeed *= endlessRamp
    }

    if (this.isNosActive) flowSpeed *= 2.25
    else if (this.isParachuteActive) flowSpeed *= 1.42
    else if (this.boosting) flowSpeed *= 1.48
    else if (this.braking) flowSpeed *= .56

    this.forwardSpeed = flowSpeed

    // 2. FISIKA RAKIT (DRIFTING & INERSIA LICIN):
    // Tombol Kiri/Kanan menambah lateralVelocity secara lokal
    const steerForce = steering * (this.braking ? 34.0 : 26.0)
    this.lateralVelocity += steerForce * dt
    // Efek Drifting/Inersia: Rakit terasa licin, drag lambat saat tombol dilepas
    this.lateralVelocity *= Math.exp(-dt * 2.2)
    // Pengaruh dorongan arus lateral sungai:
    this.lateralVelocity += (current + turbulence) * dt * 2.2
    this.lateralOffset += this.lateralVelocity * dt

    // Batas tepi sungai (Bumper Wall Bounce):
    const isCave = s >= CAVE_START - 5 && s <= CAVE_END + 5
    const maxOffset = isCave ? 11.5 : (HALF_WIDTH - 1.8)
    if (Math.abs(this.lateralOffset) > maxOffset) {
      const wallSide = Math.sign(this.lateralOffset)
      this.lateralOffset = wallSide * maxOffset
      this.lateralVelocity = -wallSide * Math.max(4.2, Math.abs(this.lateralVelocity) * 0.45)
    }

    // RAMP LOMPAT: rakit benar-benar meluncur naik di permukaan ramp (rampLift naik linear dari 0 ke tinggi ramp),
    // lalu baru melayang saat melewati bibir ramp. Keluar dari sisi ramp = jatuh tanpa dorongan.
    if (!this.capsized && !this.isAirborne && this.jumpAltitude < 0.05) {
      let onRamp = false
      for (const obstacle of obstacles) {
        if (obstacle.kind !== 'ramp') continue
        const along = s - (obstacle.s - RAMP_LENGTH / 2)
        const lateral = Math.abs(pos.x - (riverCenter(obstacle.s) + obstacle.offset))
        if (along >= 0 && along <= RAMP_LENGTH && lateral < obstacle.radius + 1.0) {
          const h = obstacle.height ?? 2.4
          onRamp = true
          this.rampLift = h * along / RAMP_LENGTH
          this.rampPitch = Math.atan2(h, RAMP_LENGTH)
          this.rampEndS = obstacle.s + RAMP_LENGTH / 2
          break
        }
      }
      if (!onRamp && this.rampLift > 0) {
        const offLip = s >= this.rampEndS - 0.6
        this.isAirborne = true
        this.jumpAltitude = this.rampLift
        this.jumpVy = offLip ? 9.5 + this.forwardSpeed * .2 + (this.isNosActive ? 4.5 : this.boosting ? 2.5 : 0) : 0
        this.rampLift = 0
        this.rampPitch = 0
        if (offLip) this.onJumpLaunch?.()
      }
    }

    // Percabangan: jalur salah TIDAK jatuh ke jurang. Rakit terseret pusaran di depan dinding batu buntu,
    // terbalik, lalu mengulang dari checkpoint terakhir.
    let trapped = false
    for (const fork of RIVER_FORKS) {
      if (s >= fork.chasmS - 2 && s <= fork.endS) {
        const relX = pos.x - riverCenter(s)
        if (fork.safeSide === -1 ? relX > 5.5 : relX < -5.5) trapped = true
      }
    }
    if (this.isEndless && s > FINISH) {
      const forkInterval = 480
      const forkIndex = Math.floor((s - FINISH) / forkInterval)
      const forkBase = FINISH + forkIndex * forkInterval + 120
      const safeSide = forkIndex % 2 === 0 ? -1 : 1
      if (s >= forkBase + 68 && s <= forkBase + 110) {
        const relX = pos.x - riverCenter(s)
        if (safeSide === -1 ? relX > 5.5 : relX < -5.5) trapped = true
      }
    }
    if (trapped) {
      if (this.trapHold === 0) this.onForkTrap?.()
      this.trapHold += dt
      flowSpeed *= .3 // pusaran menahan rakit
      this.forwardSpeed = flowSpeed
      this.whirlpoolSpin += ((this.lateralOffset >= 0 ? 1 : -1) * 9 - this.whirlpoolSpin) * Math.min(1, dt * 4)
      if (this.trapHold >= .75) {
        this.trapHold = 0
        this.capsized = true; this.capsizeElapsed = 0; this.vortexHold = 0; this.inWhirlpool = false
        this.health = Math.max(1, this.health - 15)
        this.onCapsize?.()
        return
      }
    } else {
      this.trapHold = 0
    }

    // Event jeram bertingkat: bibir (mulai menukik) & kaki (hantaman ke kolam bawah)
    while (this.nextDrop < WATERFALL_DROPS.length * 2) {
      const drop = WATERFALL_DROPS[this.nextDrop >> 1]
      const atFoot = (this.nextDrop & 1) === 1
      const trigger = atFoot ? drop.s + drop.diveDistance * .85 : drop.s - 1
      if (s < trigger) break
      if (s < trigger + 12) {
        if (atFoot) {
          this.onCascadeSplash?.(drop, Math.min(10, 2.5 + drop.drop * .6 + this.forwardSpeed * .12))
        } else {
          const prev = WATERFALL_DROPS[(this.nextDrop >> 1) - 1]
          this.onCascadeLip?.(drop, !prev || drop.s - prev.s > 30)
        }
      }
      this.nextDrop++
    }

    const steerMult = this.braking ? 1.35 : 1
    const targetX = steering * steerMult * 8.5 + riverTangent(s) * flowSpeed + current + turbulence
    // Saat terpental, kemudi & arus dilemahkan agar pantulan benar-benar terlihat
    const control = this.knockback > 0 ? .12 : 1
    let fx = (targetX - velocity.x) * 2.8 * control
    let fz = (-flowSpeed - velocity.z) * 1.35 * control

    // BATU BERGERIGI: rakit bergetar kiri-kanan dan sedikit melambat
    const field = this.jumpAltitude + this.rampLift < .3 ? jaggedFieldAt(s, pos.x - riverCenter(s)) : null
    this.rumble = field ? Math.min(1, this.rumble + dt * 9) : Math.max(0, this.rumble - dt * 4)
    if (field && field.id !== this.rumbleFieldId) this.onRumble?.(true)
    this.rumbleFieldId = field ? field.id : -1
    if (this.rumble > 0) {
      fx += Math.sin(this.time * 41) * 30 * this.rumble
      fz += (1 - .78) * flowSpeed * this.rumble * 1.35
      this.spinImpulse += Math.sin(this.time * 33) * 1.6 * this.rumble * dt * 60 * .1
    }

    let spinTarget = 0
    let capturedByWhirlpool = false
    let deepInWhirlpool = false
    for (const whirlpool of whirlpools) {
      const dx = riverCenter(whirlpool.s) + whirlpool.offset - pos.x
      const dz = -whirlpool.s - pos.z
      const distance = Math.hypot(dx, dz)
      const influenceRadius = whirlpool.radius + 9
      if (distance < influenceRadius && distance > .1) {
        const nx = dx / distance, nz = dz / distance
        const pull = 1 - distance / influenceRadius
        const radialForce = 2 + pull * 10
        const swirlForce = pull * 17
        const direction = whirlpool.direction
        fx += nx * radialForce - nz * swirlForce * direction
        fz += nz * radialForce + nx * swirlForce * direction

        const captureRadius = whirlpool.radius + 1
        if (distance < captureRadius) {
          capturedByWhirlpool = true
          spinTarget = direction * (7 + Math.min(5, (captureRadius - distance) * 1.4))
          deepInWhirlpool = true
        }
      }
    }
    if (capturedByWhirlpool !== this.inWhirlpool) this.onWhirlpool?.(capturedByWhirlpool)
    this.inWhirlpool = capturedByWhirlpool
    this.whirlpoolSpin += (spinTarget - this.whirlpoolSpin) * Math.min(1, dt * 8)
    this.vortexHold = deepInWhirlpool ? this.vortexHold + dt : Math.max(0, this.vortexHold - dt * 1.8)
    if (this.vortexHold >= .3) {
      this.capsized = true; this.capsizeElapsed = 0; this.vortexHold = 0
      this.health = Math.max(1, this.health - 30); this.whirlpoolSpin = spinTarget || 10; this.inWhirlpool = false
      this.onCapsize?.()
      return
    }

    this.raft.resetForces(true)
    this.raft.addForce({ x: fx * this.raft.mass(), y: 0, z: fz * this.raft.mass() }, true)
    // Saat melayang tinggi (lompat/parasut) rakit lewat DI ATAS rintangan: matikan respon kontak
    const flying = this.jumpAltitude + this.rampLift > 1.2
    this.raftCollider.setSolverGroups(flying ? 0x0001_0000 : 0xffff_ffff)

    for (const { body, obstacle } of this.floating) {
      if (obstacle.kind === 'crocodile') {
        let ai = this.crocStates.get(obstacle.id)
        if (!ai) {
          ai = { state: 'patrol', hasHit: false, lungeTimer: 0, cooldownTimer: 0, targetX: 0, targetZ: 0 }
          this.crocStates.set(obstacle.id, ai)
        }

        const phase = this.time * .54 + obstacle.id * 1.27
        const defaultS = obstacle.s + Math.sin(phase * .72) * 3.2
        const defaultLateral = Math.max(-12.5, Math.min(12.5, obstacle.offset + Math.sin(phase) * 4.5))
        const defaultX = riverCenter(defaultS) + defaultLateral
        const defaultZ = -defaultS

        const distToRaft = Math.hypot(pos.x - defaultX, pos.z - defaultZ)
        const inFront = (pos.z - defaultZ) > 0 && (pos.z - defaultZ) < 24

        if (ai.state === 'patrol') {
          // Jangkauan sergap buaya kini jauh lebih agresif: menjangkau rakit di tengah sungai!
          if (inFront && distToRaft < 22 && Math.abs(pos.x - defaultX) < 14) {
            ai.state = 'lunge'
            ai.hasHit = false
            ai.lungeTimer = 0
            // Buaya memotong lintasan rakit ke arah tengah
            ai.targetX = Math.max(-12, Math.min(12, pos.x + (pos.x >= defaultX ? 2.5 : -2.5)))
            ai.targetZ = pos.z - 3
            this.onCrocodileLunge?.(obstacle.id, { x: defaultX, y: .3, z: defaultZ })
          }
        } else if (ai.state === 'lunge') {
          ai.lungeTimer += dt
          // Mengunci rakit dan meluncur cepat
          if (ai.lungeTimer < .65) {
            ai.targetX = Math.max(-12, Math.min(12, pos.x))
            ai.targetZ = pos.z - 1.5
          }
          // Jika rakit lolos dari kepala buaya, buaya melancarkan SABETAN EKOR!
          if (ai.lungeTimer > 0.55 && (pos.z < defaultZ + 3 && pos.z > defaultZ - 6) && !ai.hasHit) {
            const tailDist = Math.hypot(pos.x - defaultX, pos.z - (defaultZ + 2.5))
            if (tailDist < 2.5 && this.jumpAltitude < 1.2) {
              ai.hasHit = true
              const whipDir = pos.x >= defaultX ? 1 : -1
              this.spinImpulse += whipDir * 14.0
              this.lateralVelocity = whipDir * 8.0
              this.onCrocodileTailWhip?.(obstacle.id, { x: defaultX, z: defaultZ }, whipDir)
              if (!this.hasShield && !this.isNosActive && this.feverTimeLeft <= 0) {
                this.health = Math.max(0, this.health - 5)
                this.onImpact?.({ x: pos.x, z: pos.z, strength: 7.5, damage: 12, obstacleId: obstacle.id, obstacleKind: 'crocodile' })
              } else if (this.hasShield) {
                this.hasShield = false
                this.onShieldHit?.()
              }
            }
          }
          if (ai.lungeTimer > 1.6 || (pos.z < defaultZ - 6)) {
            ai.state = 'cooldown'
            ai.cooldownTimer = 3.5
          }
        } else if (ai.state === 'cooldown') {
          ai.cooldownTimer -= dt
          if (ai.cooldownTimer <= 0) ai.state = 'patrol'
        }

        let x = defaultX, z = defaultZ, yaw = 0, y = .25
        if (ai.state === 'lunge') {
          const t = Math.min(1, ai.lungeTimer / .9)
          const surgeFactor = Math.sin(t * Math.PI)
          x = defaultX + (ai.targetX - defaultX) * t * 1.15
          z = defaultZ + (ai.targetZ - defaultZ) * t * .85
          y = .28 + surgeFactor * .18
          yaw = Math.atan2(ai.targetX - defaultX, -(ai.targetZ - defaultZ))
        } else {
          yaw = Math.atan2(4.5 * .54 * Math.cos(phase), -3.2 * .72 * .54 * Math.cos(phase * .72))
          y = .25 + Math.sin(phase * 2) * .07
        }

        body.setNextKinematicTranslation({ x, y, z })
        body.setNextKinematicRotation({ x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) })
        // SERUDUKAN KEPALA: kepala buaya (ujung depan tubuh) mengenai rakit -> rakit terlempar
        if (ai.state === 'lunge' && !ai.hasHit && this.jumpAltitude < 1.2) {
          const half = (obstacle.length || 7.6) * .45
          const headX = x + Math.sin(yaw) * half, headZ = z - Math.cos(yaw) * half
          const hitHead = Math.hypot(pos.x - headX, pos.z - headZ) < 3.2
          const hitBody = Math.hypot(pos.x - x, pos.z - z) < 3.0
          if (hitHead || hitBody) {
            ai.hasHit = true
            if (this.crocodileRam(obstacle, x)) return
          }
        }
        continue
      }

      const angle = (obstacle.angle || 0) + Math.sin(this.time * .46 + obstacle.id) * .38
      body.setNextKinematicTranslation({
        x: riverCenter(obstacle.s) + obstacle.offset + Math.sin(this.time * .65 + obstacle.id) * 1.9,
        y: .25,
        z: -obstacle.s + Math.sin(this.time * .42 + obstacle.id) * 2.5,
      })
      body.setNextKinematicRotation({ x: 0, y: Math.sin(angle / 2), z: 0, w: Math.cos(angle / 2) })
    }

    this.world.step(this.events)
    this.events.drainCollisionEvents((a, b, started) => {
      if (!started || (a !== this.raftCollider.handle && b !== this.raftCollider.handle)) return
      const other = a === this.raftCollider.handle ? b : a
      if (this.time - (this.contacts.get(other) ?? -10) < .7 || this.time - this.lastImpact < .3) return
      let strength = 0
      this.world.contactPair(this.raftCollider, this.world.getCollider(other), manifold => {
        const normal = manifold.normal()
        strength = Math.max(strength, Math.abs(velocity.x * normal.x + velocity.z * normal.z))
      })
      const obstacle = this.obstacleByCollider.get(other)
      if (obstacle?.kind === 'ramp') return
      if (this.jumpAltitude + this.rampLift > 1.2) return

      // Selalu hitung kekuatan tabrakan minimal dari kecepatan rakit saat membentur batu
      if (strength < 0.5) {
        strength = Math.max(2.8, Math.hypot(velocity.x, velocity.z) * 0.45)
      }
      if (obstacle?.kind === 'crocodile') {
        const ai = this.crocStates.get(obstacle.id)
        if (ai) ai.hasHit = true
        this.crocodileRam(obstacle, riverCenter(obstacle.s) + obstacle.offset)
        return
      }
      this.contacts.set(other, this.time)
      const p = this.raft.translation()
      // Normal tabrakan: dari pusat rintangan ke rakit (bidang horizontal)
      let nx = 0, nz = 0
      const body = this.world.getCollider(other)?.parent()
      if (body) {
        const c = body.translation()
        nx = p.x - c.x; nz = p.z - c.z
        // Dinding tepi: dorong ke tengah sungai
        if (obstacle && obstacle.id <= -1000) { nx = (riverCenter(-p.z) - p.x); nz = 0 }
      }
      const len = Math.hypot(nx, nz) || 1
      this.registerHit(obstacle, strength, nx / len, nz / len)
    })

    // BATAS TEPI / DINDING GUA: rakit tidak pernah bisa menembus tebing
    {
      const cur = this.raft.translation()
      const cs = -cur.z
      const isCaveNow = cs >= CAVE_START - 5 && cs <= CAVE_END + 5
      const limit = isCaveNow ? 11.5 : HALF_WIDTH - 1.6
      const rel = cur.x - riverCenter(cs)
      if (Math.abs(rel) > limit) {
        const side = Math.sign(rel)
        const v = this.raft.linvel()
        const flowX = riverTangent(cs) * Math.abs(v.z)
        const outward = (v.x - flowX) * side
        this.raft.setTranslation({ x: riverCenter(cs) + side * limit, y: cur.y, z: cur.z }, true)
        if (outward > 0) this.raft.setLinvel({ x: flowX - side * Math.max(3.5, outward * .6), y: 0, z: v.z }, true)
        if (outward > 2.2 && this.time - this.lastWallHit > .6 && this.jumpAltitude < 1.2) {
          this.lastWallHit = this.time
          this.registerHit({ id: -999, kind: 'rock', s: cs, offset: side * (limit + 2), radius: 2 }, outward, -side, 0, true)
        }
      }
    }

    const next = this.raft.translation()

    // STUNT SYSTEM: Saat melompat di udara, player bisa melakukan trik akrobat
    const isHighAir = this.isAirborne || (this.jumpAltitude + this.rampLift > 0.8)
    if (isHighAir && !this.capsized && !this.isSinking) {
      if (steering < -0.2) this.stuntRoll -= dt * 6.5
      else if (steering > 0.2) this.stuntRoll += dt * 6.5

      if (this.boosting) this.stuntPitch += dt * 5.8
      else if (this.braking) this.stuntPitch -= dt * 5.8

      const totalRot = Math.max(Math.abs(this.stuntRoll), Math.abs(this.stuntPitch))
      const targetThreshold = (this.stuntsCompleted + 1) * Math.PI * 1.85
      if (totalRot >= targetThreshold) {
        this.stuntsCompleted++
        this.currentStuntName = Math.abs(this.stuntRoll) >= Math.abs(this.stuntPitch) ? '360° BARREL ROLL!' : 'SUPER FLIP!'
        this.onStuntComplete?.(this.currentStuntName, this.stuntsCompleted)
      }
    } else {
      if (this.stuntsCompleted > 0) {
        // Landing check: sukses mendarat mulus!
        this.nosCharges = Math.min(3, this.nosCharges + 1)
        this.combo += 2
        this.onStuntLand?.(this.currentStuntName, this.stuntsCompleted, true)
      }
      this.stuntRoll = 0
      this.stuntPitch = 0
      this.stuntsCompleted = 0
      this.currentStuntName = ''
    }

    // MULTIPLAYER RAFT-TO-RAFT COLLISION (BUMPER CAR PHYSICS):
    if (this.opponentState && !this.capsized && !this.isWaterfallPlunge) {
      const dx = next.x - this.opponentState.x
      const dz = next.z - this.opponentState.z
      const dist = Math.hypot(dx, dz)
      const collisionDist = 3.1 // 1.55m + 1.55m raft diameters
      if (dist < collisionDist && dist > 0.001) {
        const nx = dx / dist
        const nz = dz / dist
        const overlap = collisionDist - dist + 0.15

        // Direct Physical Separation: dorong rakit saling menjauh
        this.raft.setTranslation({ x: next.x + nx * overlap * 0.7, y: next.y, z: next.z + nz * overlap * 0.7 }, true)

        if (this.time - this.lastOpponentBumpTime > 0.35) {
          this.lastOpponentBumpTime = this.time
          const relVx = velocity.x - (this.opponentState.vx || 0)
          const bounceStrength = Math.max(9.5, Math.abs(relVx) * 1.5)

          // Lateral Bumper Car Bounce & Momentum Exchange:
          this.lateralVelocity = nx * bounceStrength
          this.spinImpulse += (nx > 0 ? 1 : -1) * (7.0 + Math.random() * 3.0)
          this.raft.applyImpulse({ x: nx * 26.0, y: 0, z: nz * 14.0 }, true)

          this.onOpponentBump?.(nx, nz, bounceStrength)
        }
      }
    }

    // Near-miss proximity detection
    const fwdSpeed = Math.abs(velocity.z)
    if (fwdSpeed > 3.0 && !this.capsized && !this.isWaterfallPlunge) {
      for (const obstacle of obstacles) {
        if (obstacle.kind === 'ramp') continue
        const obsX = riverCenter(obstacle.s) + obstacle.offset
        const obsZ = -obstacle.s
        const dz = obsZ - next.z
        if (dz >= -2.2 && dz <= 2.2 && !this.nearMissedObstacles.has(obstacle.id)) {
          const dist = Math.hypot(next.x - obsX, next.z - obsZ)
          const minSafe = obstacle.radius + 1.55
          const maxNear = minSafe + 1.55
          if (dist >= minSafe && dist <= maxNear) {
            this.nearMissedObstacles.add(obstacle.id)
            this.nearMissCount++
            this.combo = (this.time - this.lastNearMissTime < 4.0) ? this.combo + 1 : 1
            this.lastNearMissTime = this.time
            if (this.combo >= 4 && this.feverTimeLeft <= 0) {
              this.feverTimeLeft = 5.5
              this.onFeverStart?.()
            }
            this.onNearMiss?.(this.combo)
          }
        }
      }
    }

    // Magnet pickup: menarik koin ke arah rakit
    if (this.magnetTimeLeft > 0) {
      this.magnetTimeLeft = Math.max(0, this.magnetTimeLeft - dt)
      for (const p of pickups) {
        if (p.kind === 'coin' && !this.collected.has(p.id)) {
          const coinX = riverCenter(p.s) + p.offset
          const coinZ = -p.s
          const d = Math.hypot(next.x - coinX, next.z - coinZ)
          if (d < 16.0) {
            // Magnet suction: koin otomatis terambil jika dalam 9m
            if (d < 8.5) {
              this.collected.add(p.id)
              this.stars++
              this.coins += 50
              this.onCollect?.(p.id)
              this.onCollectCoin?.()
            }
          }
        }
      }
    }

    // Fever mode duration
    if (this.feverTimeLeft > 0) {
      this.feverTimeLeft = Math.max(0, this.feverTimeLeft - dt)
      if (this.feverTimeLeft <= 0) {
        this.onFeverEnd?.()
      }
    }

    for (const pickup of pickups) {
      if (!this.collected.has(pickup.id) && Math.hypot(next.x - riverCenter(pickup.s) - pickup.offset, next.z + pickup.s) < 3.25) {
        const pickupH = pickup.height ?? 1.8
        const raftAlt = this.jumpAltitude + this.rampLift + 1.2
        if (pickupH > 3.0 && Math.abs(raftAlt - pickupH) > 3.8) {
          continue
        }
        this.collected.add(pickup.id)
        this.stars++
        this.onCollect?.(pickup.id)
        switch (pickup.kind) {
          case 'nos':
            this.nosCharges = Math.min(3, this.nosCharges + 1)
            this.onCollectNos?.()
            break
          case 'repair':
            this.health = Math.min(100, this.health + 30)
            this.onCollectRepair?.()
            break
          case 'coin':
            this.coins += 50
            this.onCollectCoin?.()
            break
          case 'magnet':
            this.magnetTimeLeft = 8.5
            this.onCollectMagnet?.()
            break
          case 'shield':
            this.hasShield = true
            this.onCollectShield?.()
            break
          case 'parachute':
            this.parachuteCharges = Math.min(5, this.parachuteCharges + 1)
            this.onCollectParachute?.()
            break
          case 'star':
          default:
            break
        }
      }
    }

    if (this.isEndless) {
      const endlessS = -next.z
      const stepIndex = Math.floor(endlessS / 45)
      if (stepIndex > this.endlessPickupStep && stepIndex > 5) {
        this.endlessPickupStep = stepIndex
        const pseudoOffset = Math.sin(stepIndex * 1.8) * 8
        if (Math.hypot(next.x - riverCenter(endlessS) - pseudoOffset, 0) < 4.2) {
          this.stars++
          this.onCollect?.(10000 + stepIndex)
        }
      }

      const endlessCheckpointIndex = Math.floor((endlessS - START) / 220)
      if (endlessCheckpointIndex > this.checkpoint) {
        this.checkpoint = endlessCheckpointIndex
        this.health = Math.min(100, this.health + 10)
        this.stamina = Math.min(100, this.stamina + 35)
        this.onCheckpoint?.(this.checkpoint)
      }
    } else {
      if (this.checkpoint < CHECKPOINTS.length && -next.z >= CHECKPOINTS[this.checkpoint]) {
        this.checkpoint++; this.health = Math.min(100, this.health + 8); this.onCheckpoint?.(this.checkpoint)
      }
      if (-next.z >= FINISH && this.health > 0) this.finished = true
    }
  }

  /** Respon tabrakan bumper: pantulan nyata, putaran, kerusakan, dan event efek (cipratan/getar). */
  private registerHit(obstacle: Obstacle | undefined, strength: number, nx: number, nz: number, isWall = false) {
    if (this.capsized || this.isSinking) return
    this.lastImpact = this.time; this.hits++
    const p = this.raft.translation()
    const v = this.raft.linvel()
    let vx = v.x, vz = v.z
    const vn = vx * nx + vz * nz
    if (vn < 0) { vx -= 1.5 * vn * nx; vz -= 1.5 * vn * nz }
    const push = 4 + Math.min(4.5, strength * .3)
    vx += nx * push; vz += nz * push * .6
    vz = Math.min(vz * .55, -1.5) // rakit melambat tapi tetap hanyut ke hilir
    this.raft.setLinvel({ x: vx, y: 0, z: vz }, true)
    this.knockback = isWall ? .3 : .45
    this.lateralVelocity = (Math.abs(nx) > .2 ? Math.sign(nx) : (Math.random() < .5 ? -1 : 1)) * Math.max(6.5, Math.abs(this.lateralVelocity))
    this.spinImpulse += Math.sign(this.lateralVelocity) * (6.5 + Math.random() * 3.5)

    const isRock = !obstacle || obstacle.kind === 'rock'
    const scoreDeduction = isRock ? 50 : 25
    this.scorePenalty += scoreDeduction
    const s = Math.max(2.6, strength)
    if (this.isNosActive || this.feverTimeLeft > 0) {
      this.onImpact?.({ x: p.x, z: p.z, strength: 8, damage: 0, obstacleId: obstacle?.id, obstacleKind: obstacle?.kind })
      return
    }
    if (this.hasShield) {
      this.hasShield = false
      this.onShieldHit?.()
      this.onImpact?.({ x: p.x, z: p.z, strength: 3.5, damage: 0, obstacleId: obstacle?.id, obstacleKind: obstacle?.kind })
      return
    }
    const damage = isWall ? Math.min(5, 2.0 + strength * .25) : Math.min(9, 4.2 + strength * .35)
    this.health = Math.max(0, this.health - damage)
    this.onImpact?.({ x: p.x, z: p.z, strength: s, damage, obstacleId: obstacle?.id, obstacleKind: obstacle?.kind, scoreDeduction })
    if (this.health <= 0 && !this.isSinking) {
      this.isSinking = true; this.sinkingTimer = 0; this.onSinkingStart?.()
    }
  }

  /** Buaya menyeruduk dengan kepalanya: rakit terlempar, terbalik, lalu mengulang dari checkpoint terdekat. */
  private crocodileRam(obstacle: Obstacle, crocX: number): boolean {
    if (this.capsized || this.isSinking || this.time - this.lastImpact < .2) return false
    const p = this.raft.translation()
    const dir = p.x >= crocX ? 1 : -1
    this.lastImpact = this.time; this.hits++
    if (this.isNosActive || this.hasShield) {
      const shield = !this.isNosActive
      if (shield) { this.hasShield = false; this.onShieldHit?.() }
      this.registerHitKnock(dir)
      this.onImpact?.({ x: p.x, z: p.z, strength: 6, damage: 0, obstacleId: obstacle.id, obstacleKind: 'crocodile' })
      return false
    }
    const damage = 15
    this.health = Math.max(0, this.health - damage)
    this.scorePenalty += 50
    this.onImpact?.({ x: p.x, z: p.z, strength: 9, damage, obstacleId: obstacle.id, obstacleKind: 'crocodile', scoreDeduction: 50 })
    this.onCrocodileRam?.(obstacle.id, { x: p.x, z: p.z }, dir)
    if (this.health <= 0) {
      this.isSinking = true; this.sinkingTimer = 0; this.onSinkingStart?.()
      return true
    }
    this.capsized = true
    this.capsizeElapsed = 0
    this.vortexHold = 0
    this.isCrocodileLaunch = true
    this.crocLaunchDir = dir
    this.whirlpoolSpin = dir * 18
    this.raft.setLinvel({ x: 0, y: 0, z: 0 }, true)
    this.onCapsize?.()
    return true
  }

  private registerHitKnock(dir: number) {
    const v = this.raft.linvel()
    this.raft.setLinvel({ x: dir * 9, y: 0, z: Math.min(v.z * .5, -1.5) }, true)
    this.knockback = .45
    this.lateralVelocity = dir * 9
    this.spinImpulse += dir * 9
  }

  private respawnAtCheckpoint() {
    const s = this.isEndless
      ? Math.max(START, this.checkpoint * 220 + START - 20)
      : (this.checkpoint > 0 ? CHECKPOINTS[this.checkpoint - 1] : START)
    const section = sections[sectionAt(s)]
    this.raft.setTranslation({ x: riverCenter(s), y: .4, z: -s }, true)
    this.raft.setLinvel({ x: 0, y: 0, z: -section.speed }, true)
    this.raft.resetForces(true)
    this.dropMomentum = 0
    this.trapHold = 0
    this.rampLift = 0
    this.rampPitch = 0
    this.nextDrop = WATERFALL_DROPS.findIndex(d => d.s - 1 > s) * 2
    if (this.nextDrop < 0) this.nextDrop = WATERFALL_DROPS.length * 2
    this.contacts.clear(); this.lastImpact = this.time; this.whirlpoolSpin = 0; this.inWhirlpool = false
    this.capsized = false; this.isCrocodileLaunch = false; this.capsizeElapsed = 0; this.vortexHold = 0
    this.knockback = 0; this.rumble = 0; this.rumbleFieldId = -1
    this.lateralVelocity = 0; this.spinImpulse = 0
    this.isAirborne = false; this.jumpAltitude = 0; this.jumpVy = 0
    this.raftCollider.setSolverGroups(0xffff_ffff)
    // Buaya kembali berpatroli & tidak langsung menyergap lagi
    for (const ai of this.crocStates.values()) { ai.state = 'cooldown'; ai.cooldownTimer = 2.5; ai.hasHit = false }
    this.onRespawn?.(s)
  }

  dispose() { this.events?.free(); this.world?.free() }
}
