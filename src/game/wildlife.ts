import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { FINISH, HALF_WIDTH, START, riverbankCliffHeight, riverCenter, riverElevation, riverTangent } from './level'
import type { SplashPool } from './particles'

export type DeerAntler = 'royal' | 'palmate' | 'spike' | 'doe'
export type DeerAnim = 'walk' | 'graze' | 'run'

export type FishSpecies = 'koi' | 'trout' | 'mahseer'
export type FishAnim = 'swim' | 'jump' | 'dart'

interface WildlifeTemplate {
  scene: THREE.Group
  clip: THREE.AnimationClip
}

export function wildlifeGroundHeight(s: number, side: number, distance: number): number {
  return riverbankCliffHeight(s, side, distance)
}

interface DeerInstance {
  s: number
  group: THREE.Group
  mixer: THREE.AnimationMixer
  action: THREE.AnimationAction
  baseScale: number
  baseY: number
  behavior: DeerAnim
}

interface SwimmingFish {
  s: number
  lateral: number
  depth: number
  speed: number
  group: THREE.Group
  mixer: THREE.AnimationMixer
  action: THREE.AnimationAction
  phase: number
  isDarting: boolean
  dartTimer: number
}

interface JumpingFish {
  s: number
  lateral: number
  group: THREE.Group
  mixer: THREE.AnimationMixer
  action: THREE.AnimationAction
  jumpInterval: number
  jumpDuration: number
  jumpPhase: number
  jumpHeight: number
  jumpHeading: number
  wasJumping: boolean
  scale: number
}

// Exact file mapping for all 15 models in public/models/ikan/
const WILDLIFE_FILES: Record<string, string> = {
  // Deer antler & anim variations:
  'deer_royal_walk': 'deer_royal_walk_12345.glb',
  'deer_royal_graze': 'deer_royal_graze_12345.glb',
  'deer_royal_run': 'deer_royal_run_12345.glb',
  'deer_palmate_walk': 'deer_palmate_walk_12345.glb',
  'deer_palmate_run': 'deer_palmate_run_1367.glb',
  'deer_spike_walk': 'deer_spike_walk_12345.glb',
  'deer_spike_graze': 'deer_spike_graze_1367.glb',
  'deer_doe_walk': 'deer_doe_walk_12345.glb',
  'deer_doe_graze': 'deer_doe_graze_12345.glb',
  'deer_doe_run': 'deer_doe_run_12345.glb',
  // Fish species & anim variations:
  'fish_koi_swim': 'fish_koi_swim_12345.glb',
  'fish_koi_jump': 'fish_koi_jump_12345.glb',
  'fish_koi_dart': 'fish_koi_dart_12345.glb',
  'fish_trout_swim': 'fish_trout_swim_1367.glb',
  'fish_mahseer_jump': 'fish_mahseer_jump_1367.glb',
}

export class WildlifeManager {
  private templates = new Map<string, WildlifeTemplate>()
  private deer: DeerInstance[] = []
  private swimmingFish: SwimmingFish[] = []
  private jumpingFish: JumpingFish[] = []
  readonly group = new THREE.Group()

  constructor(private scene: THREE.Scene) {
    this.group.name = 'WildlifeGroup'
    this.scene.add(this.group)
  }

  async init(): Promise<void> {
    const loader = new GLTFLoader()
    const entries = Object.entries(WILDLIFE_FILES)

    await Promise.all(
      entries.map(async ([key, fileName]) => {
        try {
          const gltf = await loader.loadAsync(`${import.meta.env.BASE_URL}models/ikan/${fileName}`)
          const clip = gltf.animations[0]
          if (clip) {
            this.templates.set(key, { scene: gltf.scene, clip })
          }
        } catch (err) {
          console.warn(`Could not load wildlife model: ${fileName}`, err)
        }
      })
    )

    this.spawnDeerHerdCourse()
    this.spawnFishSchools()
    this.spawnJumpingFishSpots()
  }

  private getDeerTemplate(antler: DeerAntler, anim: DeerAnim): WildlifeTemplate | undefined {
    let key = `deer_${antler}_${anim}`
    if (!this.templates.has(key)) {
      // Fallback for missing combos
      if (antler === 'palmate' && anim === 'graze') key = 'deer_palmate_walk'
      else if (antler === 'spike' && anim === 'run') key = 'deer_spike_walk'
      else key = `deer_${antler}_walk`
    }
    return this.templates.get(key) || this.templates.get('deer_royal_walk')
  }

  private addDeer(
    s: number,
    side: number,
    dist: number,
    antler: DeerAntler,
    anim: DeerAnim,
    rotY: number,
    scaleMult = 1.0,
  ) {
    const tmpl = this.getDeerTemplate(antler, anim)
    if (!tmpl) return

    const instance = tmpl.scene.clone(true)
    const baseScale = (antler === 'royal' ? 1.08 : antler === 'palmate' ? 1.04 : antler === 'spike' ? 0.94 : 0.92) * scaleMult
    instance.scale.setScalar(baseScale)

    instance.traverse(obj => {
      if (obj instanceof THREE.Mesh) {
        obj.castShadow = true
        obj.receiveShadow = true
      }
    })

    const x = riverCenter(s) + side * dist
    const groundY = wildlifeGroundHeight(s, side, dist)
    const z = -s

    instance.position.set(x, groundY, z)
    instance.rotation.y = rotY

    const mixer = new THREE.AnimationMixer(instance)
    const action = mixer.clipAction(tmpl.clip)
    action.time = Math.random() * (action.getClip().duration || 1)
    action.timeScale = anim === 'run' ? 1.15 : anim === 'graze' ? 0.85 : 0.95
    action.play()

    this.group.add(instance)
    this.deer.push({
      s,
      group: instance,
      mixer,
      action,
      baseScale,
      baseY: groundY,
      behavior: anim,
    })
  }

  private spawnDeerHerdCourse() {
    // Strategic placement of lively deer herds, grazing does, and running stags across the river course:
    const deerSpawns: Array<{
      s: number
      side: number
      dist: number
      antler: DeerAntler
      anim: DeerAnim
      rot: number
      scale?: number
    }> = [
      // Section 1: Pemanasan (Warmup Valley) - peaceful riverbank deer herds
      { s: 35, side: 1, dist: 16.2, antler: 'royal', anim: 'graze', rot: -Math.PI * 0.45 },
      { s: 38, side: 1, dist: 18.0, antler: 'doe', anim: 'graze', rot: -Math.PI * 0.4, scale: 0.92 },
      { s: 42, side: 1, dist: 15.5, antler: 'spike', anim: 'walk', rot: -Math.PI * 0.5, scale: 0.95 },
      { s: 68, side: -1, dist: 16.5, antler: 'palmate', anim: 'graze', rot: Math.PI * 0.45 },
      { s: 72, side: -1, dist: 18.5, antler: 'doe', anim: 'walk', rot: Math.PI * 0.4 },
      { s: 95, side: 1, dist: 16.0, antler: 'royal', anim: 'walk', rot: -Math.PI * 0.35 },
      { s: 100, side: 1, dist: 18.2, antler: 'doe', anim: 'graze', rot: -Math.PI * 0.4 },
      { s: 125, side: -1, dist: 15.8, antler: 'spike', anim: 'walk', rot: Math.PI * 0.4 },
      { s: 130, side: -1, dist: 18.0, antler: 'doe', anim: 'graze', rot: Math.PI * 0.45 },

      // Section 2: Belokan Kanan & Lush Canyon Meadows
      { s: 155, side: 1, dist: 15.8, antler: 'doe', anim: 'graze', rot: -Math.PI * 0.5 },
      { s: 160, side: 1, dist: 18.0, antler: 'palmate', anim: 'walk', rot: -Math.PI * 0.4 },
      { s: 185, side: -1, dist: 16.5, antler: 'royal', anim: 'run', rot: Math.PI * 0.1 },
      { s: 195, side: -1, dist: 18.5, antler: 'palmate', anim: 'run', rot: Math.PI * 0.12 },
      { s: 205, side: -1, dist: 16.0, antler: 'doe', anim: 'run', rot: Math.PI * 0.15 },
      { s: 225, side: 1, dist: 16.0, antler: 'spike', anim: 'graze', rot: -Math.PI * 0.45 },
      { s: 232, side: 1, dist: 18.2, antler: 'doe', anim: 'walk', rot: -Math.PI * 0.4 },
      { s: 255, side: -1, dist: 16.2, antler: 'royal', anim: 'graze', rot: Math.PI * 0.4 },
      { s: 260, side: -1, dist: 18.5, antler: 'doe', anim: 'graze', rot: Math.PI * 0.45 },

      // Section 3 & 4: Jeram Musim Gugur - Golden Foliage & Woodland Grazing
      { s: 285, side: -1, dist: 16.0, antler: 'royal', anim: 'graze', rot: Math.PI * 0.5 },
      { s: 290, side: -1, dist: 18.2, antler: 'doe', anim: 'graze', rot: Math.PI * 0.4 },
      { s: 315, side: 1, dist: 16.5, antler: 'palmate', anim: 'walk', rot: -Math.PI * 0.3 },
      { s: 322, side: 1, dist: 18.8, antler: 'doe', anim: 'graze', rot: -Math.PI * 0.35 },
      { s: 345, side: -1, dist: 16.0, antler: 'doe', anim: 'run', rot: Math.PI * 0.2 },
      { s: 355, side: -1, dist: 18.0, antler: 'spike', anim: 'run', rot: Math.PI * 0.22 },
      { s: 380, side: 1, dist: 16.0, antler: 'royal', anim: 'graze', rot: -Math.PI * 0.6, scale: 1.15 },
      { s: 386, side: 1, dist: 18.5, antler: 'doe', anim: 'walk', rot: -Math.PI * 0.5 },
      { s: 392, side: 1, dist: 16.5, antler: 'spike', anim: 'graze', rot: -Math.PI * 0.55 },
      { s: 420, side: -1, dist: 16.2, antler: 'palmate', anim: 'run', rot: Math.PI * 0.25 },
      { s: 428, side: -1, dist: 18.5, antler: 'doe', anim: 'run', rot: Math.PI * 0.28 },
      { s: 450, side: 1, dist: 16.5, antler: 'royal', anim: 'walk', rot: -Math.PI * 0.4 },
      { s: 458, side: 1, dist: 18.8, antler: 'doe', anim: 'graze', rot: -Math.PI * 0.45 },
      { s: 472, side: -1, dist: 16.0, antler: 'spike', anim: 'graze', rot: Math.PI * 0.4 },

      // Section 6: Turunan Ngarai Basalt (Cave Exit & Waterfall Approach)
      { s: 635, side: 1, dist: 16.2, antler: 'royal', anim: 'walk', rot: -Math.PI * 0.4 },
      { s: 642, side: 1, dist: 18.5, antler: 'doe', anim: 'graze', rot: -Math.PI * 0.45 },
      { s: 648, side: 1, dist: 16.0, antler: 'spike', anim: 'walk', rot: -Math.PI * 0.5 },
      { s: 675, side: -1, dist: 16.5, antler: 'palmate', anim: 'walk', rot: Math.PI * 0.35 },
      { s: 682, side: -1, dist: 18.8, antler: 'doe', anim: 'graze', rot: Math.PI * 0.4 },
      { s: 710, side: 1, dist: 16.0, antler: 'doe', anim: 'run', rot: -Math.PI * 0.1 },
      { s: 718, side: 1, dist: 18.2, antler: 'royal', anim: 'run', rot: -Math.PI * 0.12 },
      { s: 740, side: -1, dist: 16.2, antler: 'spike', anim: 'graze', rot: Math.PI * 0.45 },

      // Section 7 & 8: Ngarai Berkelok & Percabangan Maut
      { s: 765, side: -1, dist: 16.0, antler: 'royal', anim: 'graze', rot: Math.PI * 0.5 },
      { s: 772, side: -1, dist: 18.5, antler: 'spike', anim: 'walk', rot: Math.PI * 0.4 },
      { s: 778, side: -1, dist: 16.5, antler: 'doe', anim: 'graze', rot: Math.PI * 0.45 },
      { s: 805, side: 1, dist: 16.2, antler: 'palmate', anim: 'walk', rot: -Math.PI * 0.35 },
      { s: 812, side: 1, dist: 18.5, antler: 'doe', anim: 'graze', rot: -Math.PI * 0.4 },
      { s: 835, side: -1, dist: 16.0, antler: 'palmate', anim: 'run', rot: Math.PI * 0.15 },
      { s: 842, side: -1, dist: 18.2, antler: 'doe', anim: 'run', rot: Math.PI * 0.18 },
      { s: 865, side: 1, dist: 16.0, antler: 'doe', anim: 'graze', rot: -Math.PI * 0.45 }, // safe side marker!
      { s: 872, side: 1, dist: 18.5, antler: 'royal', anim: 'walk', rot: -Math.PI * 0.4 },
      { s: 895, side: -1, dist: 16.2, antler: 'spike', anim: 'walk', rot: Math.PI * 0.35 },
      { s: 925, side: 1, dist: 16.5, antler: 'royal', anim: 'graze', rot: -Math.PI * 0.4 },
      { s: 932, side: 1, dist: 18.8, antler: 'doe', anim: 'graze', rot: -Math.PI * 0.45 },
      { s: 955, side: -1, dist: 16.0, antler: 'palmate', anim: 'walk', rot: Math.PI * 0.4 },

      // Section 9 & 10: Jeram Pusaran & Teluk Tenang
      { s: 985, side: 1, dist: 16.0, antler: 'palmate', anim: 'walk', rot: -Math.PI * 0.4 },
      { s: 992, side: 1, dist: 18.2, antler: 'doe', anim: 'graze', rot: -Math.PI * 0.45 },
      { s: 1015, side: -1, dist: 16.5, antler: 'royal', anim: 'graze', rot: Math.PI * 0.45 },
      { s: 1022, side: -1, dist: 18.8, antler: 'spike', anim: 'walk', rot: Math.PI * 0.4 },
      { s: 1050, side: -1, dist: 16.0, antler: 'royal', anim: 'run', rot: Math.PI * 0.2 },
      { s: 1058, side: -1, dist: 18.5, antler: 'doe', anim: 'run', rot: Math.PI * 0.2 },
      { s: 1085, side: 1, dist: 16.2, antler: 'palmate', anim: 'graze', rot: -Math.PI * 0.35 },
      { s: 1092, side: 1, dist: 18.5, antler: 'doe', anim: 'walk', rot: -Math.PI * 0.4 },
      { s: 1120, side: 1, dist: 16.0, antler: 'doe', anim: 'graze', rot: -Math.PI * 0.5 },
      { s: 1128, side: 1, dist: 18.5, antler: 'royal', anim: 'graze', rot: -Math.PI * 0.45, scale: 1.12 },
      { s: 1135, side: 1, dist: 16.5, antler: 'spike', anim: 'walk', rot: -Math.PI * 0.4 },
      { s: 1165, side: -1, dist: 16.2, antler: 'spike', anim: 'walk', rot: Math.PI * 0.4 },
      { s: 1172, side: -1, dist: 18.5, antler: 'doe', anim: 'graze', rot: Math.PI * 0.45 },
      { s: 1205, side: 1, dist: 16.5, antler: 'royal', anim: 'walk', rot: -Math.PI * 0.35 },
      { s: 1212, side: 1, dist: 18.8, antler: 'doe', anim: 'graze', rot: -Math.PI * 0.4 },
      { s: 1238, side: -1, dist: 16.0, antler: 'palmate', anim: 'graze', rot: Math.PI * 0.4 },

      // Section 11 & 12: Air Terjun Raksasa & Hujan Kolam Biru
      { s: 1265, side: 1, dist: 16.5, antler: 'royal', anim: 'walk', rot: -Math.PI * 0.35, scale: 1.18 },
      { s: 1272, side: 1, dist: 18.8, antler: 'doe', anim: 'graze', rot: -Math.PI * 0.4 },
      { s: 1278, side: 1, dist: 16.0, antler: 'spike', anim: 'graze', rot: -Math.PI * 0.45 },
      { s: 1315, side: -1, dist: 16.2, antler: 'palmate', anim: 'graze', rot: Math.PI * 0.5 },
      { s: 1322, side: -1, dist: 18.5, antler: 'doe', anim: 'walk', rot: Math.PI * 0.45 },
      { s: 1350, side: 1, dist: 16.0, antler: 'royal', anim: 'run', rot: -Math.PI * 0.1 },
      { s: 1358, side: 1, dist: 18.2, antler: 'doe', anim: 'run', rot: -Math.PI * 0.12 },
      { s: 1385, side: -1, dist: 16.5, antler: 'spike', anim: 'walk', rot: Math.PI * 0.35 },
      { s: 1392, side: -1, dist: 18.8, antler: 'doe', anim: 'graze', rot: Math.PI * 0.4 },
      { s: 1420, side: 1, dist: 16.0, antler: 'palmate', anim: 'graze', rot: -Math.PI * 0.45 },
      { s: 1428, side: 1, dist: 18.5, antler: 'royal', anim: 'walk', rot: -Math.PI * 0.4 },
      { s: 1450, side: 1, dist: 16.0, antler: 'doe', anim: 'graze', rot: -Math.PI * 0.45 },
      { s: 1458, side: 1, dist: 18.5, antler: 'royal', anim: 'graze', rot: -Math.PI * 0.4 },
      { s: 1485, side: -1, dist: 16.2, antler: 'palmate', anim: 'walk', rot: Math.PI * 0.4 },

      // Section 13 & 14: Jeram Tebing & Riam Puncak
      { s: 1515, side: 1, dist: 16.2, antler: 'spike', anim: 'graze', rot: -Math.PI * 0.4 },
      { s: 1522, side: 1, dist: 18.5, antler: 'doe', anim: 'graze', rot: -Math.PI * 0.45 },
      { s: 1545, side: -1, dist: 16.0, antler: 'palmate', anim: 'walk', rot: Math.PI * 0.35 },
      { s: 1552, side: -1, dist: 18.2, antler: 'doe', anim: 'walk', rot: Math.PI * 0.4 },
      { s: 1580, side: 1, dist: 16.0, antler: 'spike', anim: 'walk', rot: -Math.PI * 0.45 },
      { s: 1588, side: 1, dist: 18.5, antler: 'royal', anim: 'graze', rot: -Math.PI * 0.4 },
      { s: 1615, side: -1, dist: 16.5, antler: 'palmate', anim: 'run', rot: Math.PI * 0.15 },
      { s: 1622, side: -1, dist: 18.8, antler: 'doe', anim: 'run', rot: Math.PI * 0.18 },
      { s: 1650, side: -1, dist: 16.0, antler: 'royal', anim: 'run', rot: Math.PI * 0.2 },
      { s: 1658, side: -1, dist: 18.5, antler: 'doe', anim: 'run', rot: Math.PI * 0.22 },
      { s: 1685, side: 1, dist: 16.2, antler: 'palmate', anim: 'walk', rot: -Math.PI * 0.4 },
      { s: 1692, side: 1, dist: 18.5, antler: 'doe', anim: 'graze', rot: -Math.PI * 0.45 },

      // Section 15 & 16: Hujan Tebing, Tikungan Akhir & Garis Finis
      { s: 1715, side: -1, dist: 16.0, antler: 'doe', anim: 'graze', rot: Math.PI * 0.45 },
      { s: 1722, side: -1, dist: 18.2, antler: 'spike', anim: 'walk', rot: Math.PI * 0.4 },
      { s: 1745, side: 1, dist: 16.0, antler: 'royal', anim: 'graze', rot: -Math.PI * 0.5, scale: 1.15 },
      { s: 1752, side: 1, dist: 18.5, antler: 'doe', anim: 'walk', rot: -Math.PI * 0.4 },
      { s: 1758, side: 1, dist: 16.5, antler: 'spike', anim: 'graze', rot: -Math.PI * 0.45 },
      { s: 1785, side: -1, dist: 16.2, antler: 'royal', anim: 'walk', rot: Math.PI * 0.3 },
      { s: 1792, side: -1, dist: 18.5, antler: 'doe', anim: 'walk', rot: Math.PI * 0.35 },
    ]

    for (const d of deerSpawns) {
      this.addDeer(d.s, d.side, d.dist, d.antler, d.anim, d.rot, d.scale)
    }

    // Endless mode support: place herds periodically up to 6000m
    for (let s = FINISH + 50; s < 6000; s += 48) {
      const side = (s % 96 === 0) ? -1 : 1
      const antler1: DeerAntler = (s % 4 === 0) ? 'royal' : (s % 4 === 1) ? 'palmate' : (s % 4 === 2) ? 'spike' : 'doe'
      const antler2: DeerAntler = 'doe'
      const anim1: DeerAnim = (s % 3 === 0) ? 'graze' : (s % 3 === 1) ? 'walk' : 'run'
      const anim2: DeerAnim = (s % 2 === 0) ? 'graze' : 'walk'
      const rot = side > 0 ? -Math.PI * 0.4 : Math.PI * 0.4
      this.addDeer(s, side, 16.5, antler1, anim1, rot)
      this.addDeer(s + 6, side, 18.2, antler2, anim2, rot)
    }
  }

  private spawnFishSchools() {
    // 3D Swimming Fish Schools under the clear water surface - balanced, non-spammy
    const swimTypes: Array<{ key: string; species: FishSpecies }> = [
      { key: 'fish_koi_swim', species: 'koi' },
      { key: 'fish_trout_swim', species: 'trout' },
      { key: 'fish_koi_dart', species: 'koi' },
    ]

    const schoolCount = 14
    for (let sc = 0; sc < schoolCount; sc++) {
      const baseS = START + 35 + sc * 125 + (Math.sin(sc * 7.3) * 18)
      const baseLateral = (Math.sin(sc * 13.9) * 0.55) * (HALF_WIDTH - 4.0)
      const fishCount = 1 + (sc % 2)
      const typeDef = swimTypes[sc % swimTypes.length]
      const tmpl = this.templates.get(typeDef.key) || this.templates.get('fish_koi_swim')
      if (!tmpl) continue

      for (let i = 0; i < fishCount; i++) {
        const instance = tmpl.scene.clone(true)
        const scale = 0.95 + (i * 0.12)
        instance.scale.setScalar(scale)

        instance.traverse(obj => {
          if (obj instanceof THREE.Mesh) {
            obj.castShadow = true
            obj.receiveShadow = true
          }
        })

        const s = baseS + i * 2.8 + (Math.sin(i * 3) * 0.6)
        const lateral = baseLateral + (i - fishCount / 2) * 1.6
        const depth = 0.35 + (i * 0.15)
        const speed = 1.0 + Math.random() * 0.8

        const mixer = new THREE.AnimationMixer(instance)
        const action = mixer.clipAction(tmpl.clip)
        action.time = Math.random() * (action.getClip().duration || 1)
        action.timeScale = 0.9 + Math.random() * 0.3
        action.play()

        this.group.add(instance)
        this.swimmingFish.push({
          s,
          lateral,
          depth,
          speed,
          group: instance,
          mixer,
          action,
          phase: sc * 2.1 + i * 1.5,
          isDarting: false,
          dartTimer: 0,
        })
      }
    }
  }

  private spawnJumpingFishSpots() {
    // 3D Leaping Fish at scenic highlights (waterfalls & key bends) - organic, non-spammy
    const jumpSpots: Array<{ s: number; lateral: number; type: 'koi' | 'mahseer'; interval: number; height: number }> = [
      { s: 135, lateral: 4.2, type: 'mahseer', interval: 8.5, height: 1.7 },
      { s: 382, lateral: -1.5, type: 'koi', interval: 7.2, height: 1.75 }, // right before Autumn Cascade
      { s: 615, lateral: -3.0, type: 'koi', interval: 8.0, height: 1.6 },
      { s: 875, lateral: -2.5, type: 'koi', interval: 7.5, height: 1.65 }, // Left Safe Channel
      { s: 1160, lateral: 2.5, type: 'mahseer', interval: 8.2, height: 1.8 }, // Before giant waterfall!
      { s: 1255, lateral: 0.0, type: 'koi', interval: 6.8, height: 2.1 }, // Waterfall plunge pool splash!
      { s: 1450, lateral: 3.8, type: 'koi', interval: 8.0, height: 1.7 }, // Right Safe Channel
      { s: 1715, lateral: -3.0, type: 'mahseer', interval: 8.5, height: 1.65 },
    ]

    for (let i = 0; i < jumpSpots.length; i++) {
      const spot = jumpSpots[i]
      const key = spot.type === 'mahseer' ? 'fish_mahseer_jump' : 'fish_koi_jump'
      const tmpl = this.templates.get(key) || this.templates.get('fish_koi_jump')
      if (!tmpl) continue

      const instance = tmpl.scene.clone(true)
      const scale = spot.type === 'mahseer' ? 1.25 : 1.05
      instance.scale.setScalar(scale)
      instance.visible = false

      instance.traverse(obj => {
        if (obj instanceof THREE.Mesh) {
          obj.castShadow = true
          obj.receiveShadow = true
        }
      })

      const mixer = new THREE.AnimationMixer(instance)
      const action = mixer.clipAction(tmpl.clip)
      action.play()

      this.group.add(instance)
      this.jumpingFish.push({
        s: spot.s,
        lateral: spot.lateral,
        group: instance,
        mixer,
        action,
        jumpInterval: spot.interval,
        jumpDuration: 0.95,
        jumpPhase: i * 2.7,
        jumpHeight: spot.height,
        jumpHeading: (i % 2 === 0 ? 0.35 : -0.35),
        wasJumping: false,
        scale,
      })
    }
  }

  update(time: number, raftS: number, _raftX: number, _raftSpeed: number, dt: number, splashes?: SplashPool) {
    const minActiveS = raftS - 75
    const maxActiveS = raftS + 230

    // 1. UPDATE DEER
    for (const d of this.deer) {
      const inRange = d.s >= minActiveS && d.s <= maxActiveS
      d.group.visible = inRange
      if (!inRange) continue

      // Animate deer
      d.mixer.update(dt)

      // Slight natural head sway or gentle bobbing for grazers
      if (d.behavior === 'graze') {
        d.group.position.y = d.baseY + Math.sin(time * 1.5 + d.s) * 0.02
      } else if (d.behavior === 'run') {
        // Dynamic gallop foot-planting
        d.group.position.y = d.baseY + Math.abs(Math.sin(time * 6.5 + d.s)) * 0.08
      }
    }

    // 2. UPDATE SWIMMING 3D FISH - Organic, natural wandering along river current
    for (const f of this.swimmingFish) {
      // Loop fish position smoothly downstream with river current
      f.s += f.speed * dt * 2.0
      if (f.s > FINISH + 60) f.s = START + 15

      const inRange = f.s >= minActiveS && f.s <= maxActiveS
      f.group.visible = inRange
      if (!inRange) continue

      f.mixer.update(dt)

      // Natural gentle swimming wag, completely independent of player movement
      const swimS = f.s
      const swimX = riverCenter(swimS) + f.lateral + Math.sin(time * 1.1 + f.phase) * 0.85
      const waterY = riverElevation(swimS)
      const swimY = waterY - f.depth + Math.sin(time * 1.8 + f.phase) * 0.05
      const swimZ = -swimS

      f.group.position.set(swimX, swimY, swimZ)

      // Heading along the river tangent with swimming wag
      const tangent = riverTangent(swimS)
      const heading = Math.atan2(tangent, -1) + Math.sin(time * 2.8 + f.phase) * 0.1
      f.group.rotation.y = heading
      f.group.rotation.z = Math.sin(time * 2.2 + f.phase) * 0.06
    }

    // 3. UPDATE JUMPING 3D FISH
    for (const jf of this.jumpingFish) {
      const inRange = jf.s >= minActiveS && jf.s <= maxActiveS
      if (!inRange) {
        jf.group.visible = false
        jf.wasJumping = false
        continue
      }

      const cycle = (time + jf.jumpPhase) % jf.jumpInterval
      const isJumping = cycle < jf.jumpDuration

      if (isJumping) {
        const progress = cycle / jf.jumpDuration
        const arc = Math.sin(Math.PI * progress)

        jf.group.visible = true
        jf.mixer.update(dt)

        const jX = riverCenter(jf.s) + jf.lateral + (progress - 0.5) * 1.8
        const waterY = riverElevation(jf.s)
        const jY = waterY + arc * jf.jumpHeight
        const jZ = -jf.s - (progress - 0.5) * 2.4

        jf.group.position.set(jX, jY, jZ)

        // Realistic jump rotation: arch up, level out at crest, pitch down on reentry
        const pitch = (0.5 - progress) * 1.6
        jf.group.rotation.set(pitch, jf.jumpHeading, arc * 0.2)

        // Launch splash: trigger on first frame of jump
        if (!jf.wasJumping && splashes) {
          splashes.emit(jX, waterY + 0.1, jZ, 32, 2.6, 0, 0, -2.5, 1.2)
        }

        // Splashdown splash: trigger right as fish re-enters the water
        if (progress > 0.92 && jf.wasJumping && splashes) {
          splashes.emit(jX, waterY + 0.08, jZ, 45, 3.2, 0, 0, -3.2, 1.5)
        }
      } else {
        if (jf.wasJumping && splashes) {
          // Final landing splash
          const waterY = riverElevation(jf.s)
          splashes.emit(riverCenter(jf.s) + jf.lateral, waterY + 0.1, -jf.s, 40, 2.8, 0, 0, -3.0, 1.4)
        }
        jf.group.visible = false
      }

      jf.wasJumping = isJumping
    }
  }

  dispose() {
    for (const d of this.deer) {
      d.mixer.stopAllAction()
    }
    for (const f of this.swimmingFish) {
      f.mixer.stopAllAction()
    }
    for (const jf of this.jumpingFish) {
      jf.mixer.stopAllAction()
    }
    this.deer = []
    this.swimmingFish = []
    this.jumpingFish = []
    this.scene.remove(this.group)
  }
}
