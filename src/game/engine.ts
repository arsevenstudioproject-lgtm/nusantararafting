import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { RiverPhysics } from './physics'
import { RiverWater } from './water'
import { SplashPool } from './particles'
import { Environment } from './environment'
import { WildlifeManager } from './wildlife'
import { HeadControl, InputController } from './controls'
import { RiverAudio } from './audio'
import type { MultiplayerManager } from './multiplayer'
import { applyRaftSkins, createRaft } from './raft'
import { calculateScore, CAVE_END, CAVE_START, CHECKPOINTS, getSplinePoint, getSplineTangent, plungeFoamIntensity, raftElevation, riverCenter, riverElevation, sectionAt, sections, WATERFALL_DROPS } from './level'
import type { GameState, Settings, TrackingState } from './types'

export const RUMPUT_MODEL_FILES = [
  'vegetasi_bush_emerald_349317',
  'vegetasi_bush_emerald_463360',
  'vegetasi_bush_emerald_765145',
  'vegetasi_bush_emerald_783196',
  'vegetasi_bush_moss_783196',
  'vegetasi_fern_deep_765145',
  'vegetasi_fern_emerald_550533',
  'vegetasi_fern_emerald_77889',
  'vegetasi_fern_emerald_971550',
  'vegetasi_fern_moss_765145',
  'vegetasi_fern_savanna_765145',
  'vegetasi_grass_emerald_192967',
  'vegetasi_grass_emerald_369993',
  'vegetasi_grass_emerald_904524',
  'vegetasi_grass_moss_158537',
  'vegetasi_grass_moss_192967',
  'vegetasi_grass_moss_438195',
  'vegetasi_grass_moss_50291',
  'vegetasi_grass_moss_574786',
  'vegetasi_grass_moss_699355',
  'vegetasi_reeds_emerald_369993',
  'vegetasi_reeds_emerald_381977',
  'vegetasi_reeds_emerald_56379',
  'vegetasi_reeds_moss_465293',
  'vegetasi_reeds_moss_56379',
]
export const BATU_MODEL_FILES = [
  'batu_arch_basalt_488080', 'batu_arch_basalt_913635', 'batu_arch_basalt_951903',
  'batu_arch_granite_229941', 'batu_arch_granite_375007', 'batu_arch_granite_454781',
  'batu_arch_granite_547808', 'batu_arch_granite_644925', 'batu_arch_limestone_446781',
  'batu_arch_limestone_736046', 'batu_arch_limestone_890546',
  'batu_boulder_basalt_197025', 'batu_boulder_basalt_304978', 'batu_boulder_basalt_348018',
  'batu_boulder_basalt_356661', 'batu_boulder_basalt_512627', 'batu_boulder_basalt_572917',
  'batu_boulder_basalt_636659', 'batu_boulder_basalt_706298',
  'batu_boulder_granite_387246', 'batu_boulder_granite_517008', 'batu_boulder_granite_539355',
  'batu_boulder_granite_54321', 'batu_boulder_granite_558237', 'batu_boulder_granite_599201',
  'batu_boulder_granite_608984', 'batu_boulder_granite_679874', 'batu_boulder_granite_788174',
  'batu_boulder_granite_888934', 'batu_boulder_granite_932070',
  'batu_boulder_limestone_158919', 'batu_boulder_limestone_275488', 'batu_boulder_limestone_503136',
  'batu_boulder_limestone_517008', 'batu_boulder_limestone_563327', 'batu_boulder_limestone_607947',
  'batu_boulder_limestone_715913', 'batu_boulder_limestone_729140', 'batu_boulder_limestone_796342',
  'batu_boulder_limestone_946184', 'batu_boulder_limestone_957117',
  'batu_cliff_basalt_342159', 'batu_cliff_basalt_427370', 'batu_cliff_basalt_644925',
  'batu_cliff_basalt_810939', 'batu_cliff_basalt_925465', 'batu_cliff_granite_54321',
  'batu_cliff_granite_696281', 'batu_cliff_limestone_105106', 'batu_cliff_limestone_68729',
  'batu_cliff_limestone_696281', 'batu_cliff_limestone_753790', 'batu_cliff_limestone_810939',
  'batu_cliff_limestone_97001',
  'batu_slate_basalt_488080', 'batu_slate_basalt_589834', 'batu_slate_basalt_631277',
  'batu_slate_basalt_636409', 'batu_slate_basalt_637348', 'batu_slate_basalt_856698',
  'batu_slate_basalt_858247', 'batu_slate_basalt_944322', 'batu_slate_basalt_999960',
  'batu_slate_granite_287930', 'batu_slate_granite_466995', 'batu_slate_granite_670844',
  'batu_slate_granite_856698', 'batu_slate_limestone_169443', 'batu_slate_limestone_1997',
  'batu_slate_limestone_287930', 'batu_slate_limestone_631277', 'batu_slate_limestone_702781',
]
export const POHON_MODEL_FILES = [
  'pohon_oak_autumn_137458',
  'pohon_oak_autumn_247027',
  'pohon_oak_autumn_303245',
  'pohon_oak_autumn_330459',
  'pohon_oak_autumn_532992',
  'pohon_oak_emerald_137458',
  'pohon_oak_emerald_459146',
  'pohon_oak_emerald_640927',
  'pohon_oak_emerald_988459',
  'pohon_oak_highland_54233',
  'pohon_oak_highland_721577',
  'pohon_oak_highland_83284',
  'pohon_oak_highland_83526',
  'pohon_oak_highland_988459',
  'pohon_pine_autumn_221015',
  'pohon_pine_autumn_361931',
  'pohon_pine_autumn_396140',
  'pohon_pine_autumn_428889',
  'pohon_pine_autumn_532992',
  'pohon_pine_emerald_12345',
  'pohon_pine_emerald_221015',
  'pohon_pine_highland_221015',
  'pohon_river_autumn_150059',
  'pohon_river_autumn_308781',
  'pohon_river_autumn_545009',
  'pohon_river_emerald_262660',
  'pohon_river_emerald_532259',
  'pohon_river_emerald_545009',
  'pohon_river_highland_187913',
  'pohon_river_highland_265013',
  'pohon_river_highland_538581',
  'pohon_river_highland_663816',
  'pohon_river_highland_721577',
]
export const KAYU_MODEL_FILES = [
  'pohon_tumbang_bridge_driftwood_282345',
  'pohon_tumbang_bridge_driftwood_512130',
  'pohon_tumbang_bridge_rainforest_175786',
  'pohon_tumbang_bridge_rainforest_512130',
  'pohon_tumbang_bridge_redwood_270330',
  'pohon_tumbang_bridge_redwood_352685',
  'pohon_tumbang_bridge_swamp_140296',
  'pohon_tumbang_bridge_swamp_270330',
  'pohon_tumbang_hollow_driftwood_1800',
  'pohon_tumbang_hollow_driftwood_295403',
  'pohon_tumbang_hollow_rainforest_218483',
  'pohon_tumbang_hollow_rainforest_773529',
  'pohon_tumbang_hollow_redwood_1800',
  'pohon_tumbang_hollow_redwood_718390',
  'pohon_tumbang_hollow_swamp_18292',
  'pohon_tumbang_hollow_swamp_521570',
  'pohon_tumbang_logjam_driftwood_3219',
  'pohon_tumbang_logjam_driftwood_615355',
  'pohon_tumbang_logjam_rainforest_3219',
  'pohon_tumbang_logjam_rainforest_677395',
  'pohon_tumbang_logjam_redwood_436538',
  'pohon_tumbang_logjam_redwood_875793',
  'pohon_tumbang_logjam_swamp_373817',
  'pohon_tumbang_logjam_swamp_436538',
  'pohon_tumbang_uprooted_rainforest_24742',
  'pohon_tumbang_uprooted_rainforest_355817',
  'pohon_tumbang_uprooted_rainforest_488829',
  'pohon_tumbang_uprooted_rainforest_658577',
  'pohon_tumbang_uprooted_redwood_488829',
  'pohon_tumbang_uprooted_redwood_767059',
  'pohon_tumbang_uprooted_redwood_813949',
  'pohon_tumbang_uprooted_redwood_876259',
]
type TexturedForestModel = { name: string; scene: THREE.Group }

function shareForestMaterials(models: TexturedForestModel[]) {
  const sharedTextures = new Map<string, THREE.Texture>()
  const sharedMaterials = new Map<string, THREE.Material>()
  for (const { scene } of models) scene.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    const resolved = materials.map(material => {
      const textureKeys: string[] = []
      for (const [field, value] of Object.entries(material)) {
        if (!(value instanceof THREE.Texture)) continue
        const image = value.image as { currentSrc?: string; src?: string; width?: number; height?: number } | undefined
        const source = image?.currentSrc || image?.src || value.name || value.uuid
        const key = [source, value.colorSpace, value.mapping, value.channel, value.wrapS, value.wrapT,
          value.offset.x, value.offset.y, value.repeat.x, value.repeat.y, value.center.x, value.center.y,
          value.rotation, value.flipY, value.anisotropy].join('|')
        textureKeys.push(`${field}:${key}`)
        const existing = sharedTextures.get(key)
        if (existing) {
          ;(material as unknown as Record<string, unknown>)[field] = existing
          value.dispose()
        } else sharedTextures.set(key, value)
      }
      const standard = material as THREE.MeshStandardMaterial
      if (material.transparent && /leaves|grass|flowers|bush/i.test(material.name)) {
        // The pack's foliage uses blended alpha cards. Cutout rendering keeps
        // their painted edges crisp and lets each chunk batch the same texture.
        material.transparent = false
        material.alphaTest = .32
        material.depthWrite = true
        material.needsUpdate = true
      }
      const key = [material.type, material.name, standard.color?.getHexString(), standard.emissive?.getHexString(),
        standard.roughness, standard.metalness, material.transparent, material.opacity, material.alphaTest,
        material.side, material.depthWrite, ...textureKeys.sort()].join('|')
      const existing = sharedMaterials.get(key)
      if (existing) { material.dispose(); return existing }
      sharedMaterials.set(key, material)
      return material
    })
    object.material = Array.isArray(object.material) ? resolved : resolved[0]
  })
}

async function loadRumputModels(): Promise<TexturedForestModel[]> {
  const loader = new GLTFLoader()
  const models = new Array<TexturedForestModel>(RUMPUT_MODEL_FILES.length)
  let next = 0
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (next < RUMPUT_MODEL_FILES.length) {
      const index = next++
      const name = RUMPUT_MODEL_FILES[index]
      const gltf = await loader.loadAsync(`${import.meta.env.BASE_URL}models/rumput/${name}.glb`)
      models[index] = { name, scene: gltf.scene }
    }
  }))
  shareForestMaterials(models)
  return models
}

async function loadBatuModels(): Promise<TexturedForestModel[]> {
  const loader = new GLTFLoader()
  const models = new Array<TexturedForestModel>(BATU_MODEL_FILES.length)
  let next = 0
  await Promise.all(Array.from({ length: 8 }, async () => {
    while (next < BATU_MODEL_FILES.length) {
      const index = next++
      const name = BATU_MODEL_FILES[index]
      const gltf = await loader.loadAsync(`${import.meta.env.BASE_URL}models/batu/${name}.glb`)
      models[index] = { name, scene: gltf.scene }
    }
  }))
  shareForestMaterials(models)
  return models
}

async function loadPohonModels(): Promise<TexturedForestModel[]> {
  const loader = new GLTFLoader()
  const models = new Array<TexturedForestModel>(POHON_MODEL_FILES.length)
  let next = 0
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (next < POHON_MODEL_FILES.length) {
      const index = next++
      const name = POHON_MODEL_FILES[index]
      const gltf = await loader.loadAsync(`${import.meta.env.BASE_URL}models/pohon/${name}.glb`)
      models[index] = { name, scene: gltf.scene }
    }
  }))
  shareForestMaterials(models)
  return models
}

async function loadKayuModels(): Promise<TexturedForestModel[]> {
  const loader = new GLTFLoader()
  const models = new Array<TexturedForestModel>(KAYU_MODEL_FILES.length)
  let next = 0
  await Promise.all(Array.from({ length: 8 }, async () => {
    while (next < KAYU_MODEL_FILES.length) {
      const index = next++
      const name = KAYU_MODEL_FILES[index]
      const gltf = await loader.loadAsync(`${import.meta.env.BASE_URL}models/kayu/${name}.glb`)
      models[index] = { name, scene: gltf.scene }
    }
  }))
  shareForestMaterials(models)
  return models
}

export const JUMPCAGE_MODEL_FILES = [
  'riverrush_short_ramp_kinect_414754',
  'riverrush_long_ramp_kinect_414754',
  'riverrush_short_ramp_cedar_414754',
  'riverrush_long_ramp_cedar_414754',
  'riverrush_short_ramp_mossy_414754',
  'riverrush_long_ramp_mossy_414754',
  'riverrush_short_ramp_shrine_414754',
  'riverrush_long_ramp_shrine_414754',
  'riverrush_torii_gate_kinect_2010360',
]

async function loadJumpCageModels(): Promise<TexturedForestModel[]> {
  const loader = new GLTFLoader()
  const models = new Array<TexturedForestModel>(JUMPCAGE_MODEL_FILES.length)
  let next = 0
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (next < JUMPCAGE_MODEL_FILES.length) {
      const index = next++
      const name = JUMPCAGE_MODEL_FILES[index]
      try {
        const gltf = await loader.loadAsync(`${import.meta.env.BASE_URL}models/jumpcage/${name}.glb`)
        models[index] = { name, scene: gltf.scene }
      } catch (err) {
        console.warn(`Could not load jumpcage model: ${name}`, err)
      }
    }
  }))
  const valid = models.filter((m): m is TexturedForestModel => Boolean(m))
  shareForestMaterials(valid)
  return valid
}

export class RiverEngine {
  readonly physics = new RiverPhysics()
  readonly input = new InputController()
  readonly audio = new RiverAudio()
  readonly head: HeadControl
  readonly scene = new THREE.Scene()
  readonly camera = new THREE.PerspectiveCamera(54, 1, .2, 250)
  readonly renderer: THREE.WebGLRenderer
  private hemisphere = new THREE.HemisphereLight('#d8f2ff', '#6b8b4c', 1.95)
  private dayBackground = new THREE.Color('#65b9e5')
  private caveBackground = new THREE.Color('#14282c')
  private dayFog = new THREE.Color('#b9e2ec')
  private caveFog = new THREE.Color('#1a3435')
  private rainBackground = new THREE.Color('#52616a')
  private rainFog = new THREE.Color('#5e737a')
  water?: RiverWater
  particles?: SplashPool
  environment?: Environment
  wildlife?: WildlifeManager
  raft = new THREE.Group()
  private paddle?: THREE.Object3D
  private paddler?: THREE.Object3D
  private companion?: THREE.Object3D
  private paddlerHomePosition = new THREE.Vector3(-0.45, .62, .18)
  private paddlerHomeRotation = new THREE.Euler()
  private companionHomePosition = new THREE.Vector3(0.45, .62, .18)
  private companionHomeRotation = new THREE.Euler()
  private paddlerMaterials: THREE.Material[] = []
  private paddlerMaterialDefaults = new Map<THREE.Material, { transparent: boolean; opacity: number; depthWrite: boolean }>()
  private arms = new Map<number, THREE.Object3D>()
  private companionArms = new Map<number, THREE.Object3D>()
  private paddlePhase = 0
  private currentSteering = 0
  private parachuteModel?: THREE.Group
  public multiplayer: MultiplayerManager | null = null
  public opponentRaft: THREE.Group | null = null
  public opponentNametag: THREE.Sprite | null = null
  private sun = new THREE.DirectionalLight('#fff0d0', 3.25)
  private frame = 0
  private lastTime = 0
  private visualTime = 0
  private accumulator = 0
  private impactShake = 0
  private dockTimer = 0
  private rumbleSplashAt = 0
  private cascadeCam = 0 // 0 = kamera normal, 1 = kamera atas penuh di turunan ekstrem
  private toastUntil = 0
  private lastSection = 0
  private lastHud = 0
  private disposed = false
  private resizeObserver: ResizeObserver
  private target = new THREE.Vector3()
  private look = new THREE.Vector3()
  private lookTarget = new THREE.Vector3()
  onComplete?: (won: boolean) => void
  onPause?: () => void
  onScreenSplash?: (intensity: number) => void
  private visibility = () => { if (document.hidden) { this.pause(); this.head.stop() } }
  private blur = () => { if (this.state.mode === 'playing') this.pause() }
  private contextLost = (event: Event) => {
    event.preventDefault(); this.pause(); this.head.stop()
    this.state.error = 'Grafis 3D terputus. Muat ulang halaman untuk kembali bermain.'
  }
  constructor(private canvas: HTMLCanvasElement, public state: GameState, public settings: Settings, tracking: TrackingState) {
    this.head = new HeadControl(tracking)
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', alpha: false })
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.08
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.scene.background = this.dayBackground.clone(); this.scene.fog = new THREE.Fog(this.dayFog, 88, 252)
    this.scene.add(this.hemisphere)
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(2048, 2048)
    Object.assign(this.sun.shadow.camera, { left: -46, right: 46, top: 48, bottom: -48, near: 1, far: 125 })
    this.sun.shadow.bias = -.0004; this.sun.shadow.normalBias = .06
    this.scene.add(this.sun, this.sun.target)
    this.resizeObserver = new ResizeObserver(() => this.resize()); this.resizeObserver.observe(canvas)
    document.addEventListener('visibilitychange', this.visibility); window.addEventListener('blur', this.blur)
    canvas.addEventListener('webglcontextlost', this.contextLost)
    this.input.onPause = () => { if (this.state.mode === 'playing') this.pause(); else if (this.state.mode === 'paused') this.resume() }
    this.resize()
  }
  async init() {
    const [, raft, crocodile, rumputModels, batuModels, pohonModels, kayuModels, jumpCageModels] = await Promise.all([
      this.physics.init(),
      Promise.resolve(createRaft()),
      new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}models/crocodile-base.glb`),
      loadRumputModels(),
      loadBatuModels(),
      loadPohonModels(),
      loadKayuModels(),
      loadJumpCageModels(),
    ])
    if (this.disposed) {
      this.physics.dispose(); this.disposeObjects(raft); this.disposeObjects(crocodile.scene); return
    }
    this.raft = raft
    this.raft.traverse(object => {
      if (object instanceof THREE.Mesh) { object.castShadow = true; object.receiveShadow = true }
      if (object.name === 'Paddle') this.paddle = object
      if (object.name === 'Paddler') this.paddler = object
      if (object.name === 'Companion') this.companion = object
      if (object.name === 'RightArm') this.arms.set(1, object)
      if (object.name === 'LeftArm') this.arms.set(-1, object)
      if (object.name === 'CompanionRightArm') this.companionArms.set(1, object)
      if (object.name === 'CompanionLeftArm') this.companionArms.set(-1, object)
    })
    if (this.paddler) {
      this.paddlerHomePosition.copy(this.paddler.position)
      this.paddlerHomeRotation.copy(this.paddler.rotation)
    }
    if (this.companion) {
      this.companionHomePosition.copy(this.companion.position)
      this.companionHomeRotation.copy(this.companion.rotation)
    }
    if (this.paddler) {
      const clones = new Map<THREE.Material, THREE.Material>()
      this.paddler.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return
        const copyMaterial = (material: THREE.Material) => {
          let copy = clones.get(material)
          if (!copy) {
            copy = material.clone(); clones.set(material, copy); this.paddlerMaterials.push(copy)
            this.paddlerMaterialDefaults.set(copy, { transparent: copy.transparent, opacity: copy.opacity, depthWrite: copy.depthWrite })
          }
          return copy
        }
        object.material = Array.isArray(object.material) ? object.material.map(copyMaterial) : copyMaterial(object.material)
      })
    }
    this.scene.add(this.raft)
    applyRaftSkins(this.raft, this.settings.raftSkin, this.settings.paddleSkin)

    // Opponent 3D Raft for Multiplayer Races
    this.opponentRaft = createRaft()
    this.opponentRaft.name = 'OpponentRaft'
    applyRaftSkins(this.opponentRaft, 'red', 'carbon')
    this.opponentNametag = this.createOpponentNametag('Player 2')
    this.opponentRaft.add(this.opponentNametag)
    this.opponentRaft.visible = false
    this.scene.add(this.opponentRaft)

    // Rigged 3D Parachute Model (mounted above the raft)
    const parachuteGroup = new THREE.Group()
    parachuteGroup.name = 'ParachuteGlider'
    const canopyGeo = new THREE.SphereGeometry(2.7, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.45)
    const canopyMat = new THREE.MeshStandardMaterial({ color: '#f97316', roughness: 0.38, side: THREE.DoubleSide })
    const canopyMesh = new THREE.Mesh(canopyGeo, canopyMat)
    canopyMesh.castShadow = true
    parachuteGroup.add(canopyMesh)

    const stripeGeo = new THREE.RingGeometry(2.35, 2.7, 20)
    const stripeMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.35, side: THREE.DoubleSide })
    const stripeMesh = new THREE.Mesh(stripeGeo, stripeMat)
    stripeMesh.rotation.x = Math.PI / 2
    stripeMesh.position.y = 0.05
    parachuteGroup.add(stripeMesh)

    const cordMat = new THREE.LineBasicMaterial({ color: '#cbd5e1', transparent: true, opacity: 0.85 })
    const cordPoints: number[] = []
    const rimRadius = 2.65
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2
      const cx = Math.cos(angle) * rimRadius
      const cz = Math.sin(angle) * rimRadius
      cordPoints.push(cx, 0, cz, cx * 0.22, -2.7, cz * 0.22)
    }
    const cordGeo = new THREE.BufferGeometry()
    cordGeo.setAttribute('position', new THREE.Float32BufferAttribute(cordPoints, 3))
    const cords = new THREE.LineSegments(cordGeo, cordMat)
    parachuteGroup.add(cords)

    parachuteGroup.position.set(0, 3.8, 0)
    parachuteGroup.visible = false
    this.raft.add(parachuteGroup)
    this.parachuteModel = parachuteGroup

    this.water = new RiverWater(this.scene)
    this.environment = new Environment(this.scene, rumputModels, batuModels, crocodile.scene, crocodile.animations, pohonModels, kayuModels, jumpCageModels)
    this.wildlife = new WildlifeManager(this.scene)
    await this.wildlife.init()
    this.particles = new SplashPool(this.scene)
    this.physics.onJumpLaunch = () => {
      this.audio.jumpLaunch()
      this.impactShake = 0.75
      const p = this.physics.raft.translation()
      this.particles?.emitSplashdown(p.x, riverElevation(-p.z) + .2, p.z, 3.8)
      this.onScreenSplash?.(0.7)
      this.toast('🚀 RAMP JUMP! MELUNCUR KE UDARA!', 'star', 2.2)
    }
    this.physics.onSplashdown = strength => {
      this.audio.splashdown(strength)
      this.impactShake = Math.min(1.8, 0.6 + strength * 0.12)
      const p = this.physics.raft.translation()
      this.particles?.emitSplashdown(p.x, riverElevation(-p.z) + .15, p.z, strength)
      this.onScreenSplash?.(Math.min(1.5, 0.6 + strength * 0.1))
      this.toast('🌊 SPLASHDOWN! PENDARATAN AIR BESAR!', 'info', 2.0)
    }
    this.physics.onCascadeLip = (drop, firstOfSeries) => {
      this.impactShake = Math.max(this.impactShake, 0.55 + drop.drop * 0.05)
      if (firstOfSeries) this.toast(`⚠️ ${drop.label}! ${drop.name.toUpperCase()}`, 'hit', 2.4)
    }
    this.physics.onCascadeSplash = (_drop, strength) => {
      this.audio.splashdown(strength)
      this.impactShake = Math.min(2.0, Math.max(this.impactShake, 0.7 + strength * 0.12))
      const p = this.physics.raft.translation()
      this.particles?.emitSplashdown(p.x, riverElevation(-p.z) + .2, p.z, strength)
      this.onScreenSplash?.(Math.min(1.4, 0.5 + strength * 0.09))
    }
    this.physics.onForkTrap = () => {
      this.impactShake = Math.max(this.impactShake, 1.0)
      this.toast('JALUR BUNTU! Pusaran menyeret rakit ke dinding batu...', 'hit', 2.6)
    }
    this.physics.onCollectParachute = () => {
      this.audio.collectParachute()
      this.toast('🪂 PARASUT DIAMBIL! TEKAN [F / P] UNTUK TERBANG!', 'star', 3.0)
    }
    this.physics.onActivateParachute = () => {
      this.audio.activateParachute()
      this.impactShake = 0.5
      this.toast('🪂 PARASUT TERBUKA! GLIDING DI ATAS SUNGAI!', 'star', 2.6)
    }
    this.physics.onNearMiss = combo => {
      this.audio.nearMiss(combo)
      const p = this.physics.raft.translation()
      this.particles?.emit(p.x, riverElevation(-p.z) + .2, p.z, 50, 3.5, 0, 0, 0, 2.0)
      this.onScreenSplash?.(0.4)
      this.toast(combo > 1 ? `⚡ NEAR MISS x${combo}! +${combo * 15} POIN!` : '⚡ CLOSE CALL! +15 POIN!', 'star', 1.5)
    }
    this.physics.onCrocodileLunge = (id, pos) => {
      this.environment?.biteCrocodile(id)
      this.particles?.emit(pos.x, riverElevation(-pos.z) + .3, pos.z, 90, 4.8, 0, 0, 0, 2.4)
      this.onScreenSplash?.(0.9)
      this.audio.crocodileSnap()
      this.impactShake = Math.max(this.impactShake, .6)
      this.toast('BUAYA MENYERGAP! HINDARI SERANGANNYA!', 'hit', 2.2)
    }
    this.physics.onOpponentBump = (nx, nz, strength) => {
      this.impactShake = Math.min(2.0, 0.8 + strength * 0.1)
      const p = this.physics.raft.translation()
      this.particles?.emitSplashdown(p.x, riverElevation(-p.z) + 0.2, p.z, 3.8)
      this.onScreenSplash?.(0.8)
      this.audio.impact(strength)
      this.toast('💥 BUMP! TABRAKAN DENGAN LAWAN!', 'hit', 1.8)
      this.multiplayer?.sendCollision(-nx, -nz)
    }
    this.physics.onCrocodileRam = (id, pos, dir) => {
      this.environment?.biteCrocodile(id)
      const y = riverElevation(-pos.z)
      this.particles?.emitSplashdown(pos.x, y + .2, pos.z, 7)
      this.particles?.emit(pos.x, y + .6, pos.z, 160, 8, dir * 5, 0, -3, 4)
      this.onScreenSplash?.(1.4)
      this.impactShake = 2.0
    }
    this.physics.onRumble = () => {
      this.audio.impact(2.2)
      this.toast('⚠️ BATU BERGERIGI! RAKIT BERGETAR!', 'hit', 1.4)
    }
    this.physics.onImpact = impact => {
      this.impactShake = Math.min(1.8, .55 + impact.strength * .12)
      const waterY = riverElevation(-impact.z)
      // Heavy water splash explosion on rock collision:
      this.particles?.emitSplashdown(impact.x, waterY + 0.15, impact.z, 4.8 + impact.strength * 0.25)
      this.particles?.emit(impact.x, waterY + .35, impact.z - .5, Math.round(90 + impact.strength * 10), 4.5 + impact.strength * .35, 0, 0, 0, 2.6)
      this.onScreenSplash?.(Math.min(1.5, 0.85 + impact.strength * 0.15))
      this.audio.impact(impact.strength)
      this.audio.splashdown(impact.strength)
      this.audio.voiceOof()
      if (impact.obstacleKind === 'crocodile') {
        this.environment?.biteCrocodile(impact.obstacleId)
        this.audio.crocodileSnap()
        this.audio.impact(8)
        this.toast(impact.damage > 0 ? `🐊 BUAYA MENYERUDUK! −${Math.round(impact.damage)} kondisi` : '🐊 Serudukan buaya tertahan!', 'hit', 2.4)
      } else if (impact.scoreDeduction) {
        this.toast(`💥 TABRAK BATU! −${impact.scoreDeduction} POIN! −${Math.round(impact.damage)}% RAKIT`, 'hit', 1.8)
      } else {
        this.toast(`Benturan! −${Math.round(impact.damage)} kondisi`, 'hit', 1.6)
      }
    }
    this.physics.onCollect = () => { this.audio.collectCoin() }
    this.physics.onCollectNos = () => {
      this.audio.collectNos()
      this.toast('JERIGEN NITRO DIDAPATKAN! [N] / [SHIFT] UNTUK NOS!', 'star', 2.8)
    }
    this.physics.onCollectRepair = () => {
      this.audio.collectRepair()
      this.toast('KOTAK P3K! Kondisi Rakit +30%', 'star', 2.2)
    }
    this.physics.onCollectCoin = () => {
      this.audio.collectCoin()
    }
    this.physics.onCollectShield = () => {
      this.audio.collectShield()
      this.toast('PERISAI AIR AKTIF! Tahan 1 Benturan Bebatuan!', 'star', 2.8)
    }
    this.physics.onActivateNos = () => {
      this.audio.activateNos()
      this.impactShake = 0.85
      this.toast('TURBO NITRO DIAKTIFKAN! KECEPATAN EKSTREM!', 'star', 2.5)
    }
    this.physics.onShieldHit = () => {
      this.audio.collectShield()
      this.impactShake = 0.6
      this.toast('PERISAI PECAH! Benturan tertahan sempurna!', 'info', 2.2)
    }
    this.physics.onWaterfallPlunge = () => {
      this.audio.waterfallPlunge()
      this.impactShake = 2.0
      this.toast('AWAS! TERJUN KE JURANG AIR TERJUN MAUT! (Salah Memilih Jalur)', 'hit', 4.0)
    }
    this.physics.onCheckpoint = checkpoint => { this.audio.checkpoint(); this.toast(`Checkpoint ${checkpoint}/${CHECKPOINTS.length} · Kondisi +8`, 'info', 2.8) }
    this.physics.onWhirlpool = caught => this.toast(
      caught ? 'PUSARAN MENGUNCI RAKIT! JAUHI INTINYA!' : 'Kamu berhasil keluar dari pusaran.',
      caught ? 'hit' : 'info', caught ? 3.2 : 2,
    )
    this.physics.onCapsize = () => {
      const p = this.physics.raft.translation(), s = -p.z
      if (this.paddler?.parent === this.raft) this.scene.attach(this.paddler)
      if (this.paddler) {
        this.paddler.position.set(p.x, riverElevation(s) + 2.2, p.z)
        this.paddler.rotation.set(0, 0, 0)
      }
      for (const material of this.paddlerMaterials) {
        material.transparent = true; material.depthWrite = false; material.needsUpdate = true
      }
      this.particles?.emit(p.x, riverElevation(s) + .18, p.z, 190, 6.8, 0, 0, -4.5, 4)
      this.impactShake = 1.4; this.audio.impact(6)
      this.toast(this.physics.isCrocodileLaunch ? '🐊 DISERUDUK BUAYA! RAKIT TERLEMPAR — KEMBALI KE CHECKPOINT!' : 'PUSARAN MENELAN RAKIT! KAMU TERJATUH!', 'hit', 2.6)
    }
    this.physics.onRespawn = distance => {
      this.raft.rotation.set(0, 0, 0)
      this.restorePaddler()
      this.particles?.emit(riverCenter(distance), riverElevation(distance) + .2, -distance, 75, 4.8, 0, 0, -4.5, 2.8)
      this.impactShake = .62
      this.toast(`Kembali ke checkpoint ${this.physics.checkpoint}/${CHECKPOINTS.length}. Lanjutkan arung jeram!`, 'info', 3)
    }

    this.physics.onSinkingStart = () => {
      this.impactShake = 2.0
      this.audio.impact(10)
      this.toast('🚨 RAKIT TENGGELAM! KONDISI RUSAK PARAH', 'hit', 2.5)
      const p = this.physics.raft.translation()
      this.particles?.emitSplashdown(p.x, riverElevation(-p.z) + 0.2, p.z, 4.0)
    }

    this.physics.onRaftSunk = () => {
      this.complete(false)
    }

    this.physics.onCollectRepair = () => {
      this.audio.collectRepair()
      this.toast('+35% KESEHATAN RAKIT DIPULIHKAN! 🩺', 'star', 2.0)
      const p = this.physics.raft.translation()
      this.particles?.emitSplashdown(p.x, riverElevation(-p.z) + 0.2, p.z, 2.2)
    }
    this.state.ready = true; this.state.error = ''; this.resetCamera(true); this.lastTime = performance.now()
    this.frame = requestAnimationFrame(this.loop)
    if (import.meta.env.DEV) Object.defineProperty(window, '__riverRush', { value: this, configurable: true })
  }
  private resize() {
    const width = this.canvas.clientWidth, height = this.canvas.clientHeight
    if (!width || !height) return
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.settings.quality === 'high' ? 1.65 : 1))
    this.renderer.setSize(width, height, false); this.camera.aspect = width / height; this.camera.updateProjectionMatrix()
  }
  applySettings() {
    this.audio.setVolume(this.settings.volume); this.resize()
    this.renderer.shadowMap.enabled = this.settings.quality === 'high'
    applyRaftSkins(this.raft, this.settings.raftSkin, this.settings.paddleSkin)
  }
  async start(gameType: 'expedition' | 'endless' = this.state.gameType || 'expedition') {
    if (!this.state.ready) return
    this.state.gameType = gameType
    this.physics.isEndless = gameType === 'endless'
    this.restorePaddler()
    this.physics.reset(); this.particles?.clear(); this.input.clear()
    this.physics.initDockStart()
    this.environment?.resetStartPortal()
    if (this.environment?.dockGroup) this.environment.dockGroup.visible = true
    Object.assign(this.state, {
      mode: 'playing', gameType, time: 0, distance: 4, speed: 0,
      health: 100, stamina: 100, boosting: false, braking: false,
      stars: 0, score: 0, checkpoint: 0, section: 0, hits: 0, combo: 0,
      onDock: true,
      dockCountdown: 5,
      nosCharges: 1, nosActive: false, nosTimeLeft: 0,
    })
    this.accumulator = 0; this.lastSection = 0; this.impactShake = 0; this.dockTimer = 0; this.input.enabled = true
    this.resetCamera(false)
    this.toast(gameType === 'endless' ? 'Ekspedisi Tanpa Batas! Tembus jeram sejauh mungkin!' : 'Ikuti arus. Petualanganmu dimulai!', 'info', 3.5)
    this.audio.setVolume(this.settings.volume)
    try { await this.audio.start() } catch { /* Audio failure never prevents play. */ }
  }
  launchRaft() {
    if (this.physics.onDock) {
      this.environment?.openStartPortal()
      this.physics.launchFromDock()
      this.state.onDock = false
      this.audio.boost()
      // boost played
      const p = this.physics.raft.translation()
      this.particles?.emitSplashdown(p.x, riverElevation(12), -12, 3.2)
      this.toast('🚀 GERBANG TERBUKA! LUNCURKAN RAKIT KE SUNGAI!', 'star', 2.0)
      this.multiplayer?.sendLaunch()
    }
  }

  pause() {
    if (this.state.mode !== 'playing') return
    this.state.mode = 'paused'; this.input.enabled = false; this.input.clear(); this.accumulator = 0; this.audio.suspend(); this.onPause?.()
  }
  resume() {
    if (this.state.mode !== 'paused' || this.state.error) return
    this.state.mode = 'playing'; this.input.enabled = true; this.input.clear(); this.lastTime = performance.now()
    void this.audio.start().catch(() => {})
  }
  menu() {
    this.state.mode = 'menu'; this.input.enabled = false; this.input.clear(); this.head.stop(); this.audio.suspend()
    this.restorePaddler()
    this.physics.reset(); this.particles?.clear(); this.state.toast = ''; this.accumulator = 0
    if (this.environment?.dockGroup) this.environment.dockGroup.visible = false
    this.resetCamera(true)
  }
  toast(message: string, type: GameState['toastType'] = 'info', duration = 2) { this.state.toast = message; this.state.toastType = type; this.toastUntil = this.visualTime + duration }
  private resetCamera(menu: boolean) {
    if (menu) {
      const menuS = 22
      const pX = riverCenter(menuS)
      const pY = riverElevation(menuS) + 0.35
      const pZ = -menuS
      this.raft.position.set(pX, pY, pZ)
      this.raft.rotation.set(0, 0, 0)
      this.camera.position.set(pX - 0.75, pY + 1.85, pZ + 5.6)
      this.look.set(riverCenter(menuS + 38) + 1.8, riverElevation(menuS + 38) + 2.3, -(menuS + 38))
      if (this.environment?.dockGroup) this.environment.dockGroup.visible = false
    } else {
      const p = this.physics.raft.translation()
      this.camera.position.set(p.x, 9.6, p.z + 16)
      this.look.set(p.x, 1.1, p.z - 18)
      if (this.environment?.dockGroup) this.environment.dockGroup.visible = this.physics.onDock || this.state.distance < 20
    }
    this.camera.lookAt(this.look)
  }
  private restorePaddler() {
    this.raft.rotation.set(0, 0, 0)
    if (this.paddler) {
      if (this.paddler.parent !== this.raft) this.raft.attach(this.paddler)
      this.paddler.position.copy(this.paddlerHomePosition)
      this.paddler.rotation.copy(this.paddlerHomeRotation)
    }
    if (this.companion) {
      if (this.companion.parent !== this.raft) this.raft.attach(this.companion)
      this.companion.position.copy(this.companionHomePosition)
      this.companion.rotation.copy(this.companionHomeRotation)
    }
    for (const material of this.paddlerMaterials) {
      const defaults = this.paddlerMaterialDefaults.get(material)
      if (!defaults) continue
      material.transparent = defaults.transparent; material.opacity = defaults.opacity; material.depthWrite = defaults.depthWrite
      material.needsUpdate = true
    }
  }
  private loop = (now: number) => {
    if (this.disposed) return
    this.frame = requestAnimationFrame(this.loop)
    const dt = Math.min(.08, Math.max(0, (now - this.lastTime) / 1000)); this.lastTime = now
    const playing = this.state.mode === 'playing'
    const frozen = this.state.mode === 'paused'
    this.currentSteering = 0
    if (!frozen) this.visualTime += dt
    const headInput = this.head.update(now, dt, this.settings.sensitivity)
    if (playing && this.physics.onDock) {
      // Gerbang start terbuka otomatis setelah 5 detik
      this.dockTimer += dt
      this.state.dockCountdown = Math.max(0, Math.ceil(5 - this.dockTimer))
      if (this.dockTimer >= 5) this.launchRaft()
    }
    if (playing) {
      this.accumulator += dt
      const steering = this.physics.capsized ? 0 : this.input.steering || (this.settings.control === 'head' ? headInput : 0)
      this.currentSteering = steering
      const wantsBoost = this.input.boost || (this.settings.control === 'head' && this.head.state.nodAction === 'boost')
      const wantsBrake = this.input.brake || (this.settings.control === 'head' && this.head.state.nodAction === 'brake')
      const wantsNos = this.input.nos
      const wantsParachute = this.input.parachute

      while (this.accumulator >= 1 / 60 && !this.physics.finished && (!this.physics.isSinking || this.physics.sinkingTimer < 1.8)) {
        this.physics.step(steering, 1 / 60, wantsBoost, wantsBrake, wantsNos, wantsParachute)
        this.accumulator -= 1 / 60
      }
      if (this.physics.finished && !this.physics.isSinking) this.complete(this.physics.health > 0)
    }
    const p = this.physics.raft.translation(), v = this.physics.raft.linvel(), s = -p.z
    const sectionIndex = sectionAt(s), section = sections[sectionIndex]
    const rainAmount = section.rain ?? 0
    const caveAmount = THREE.MathUtils.smoothstep(s, CAVE_START, CAVE_START + 18)
      * (1 - THREE.MathUtils.smoothstep(s, CAVE_END - 18, CAVE_END))
    this.sun.intensity = THREE.MathUtils.lerp(THREE.MathUtils.lerp(3, .28, caveAmount), 1.15, rainAmount)
    this.hemisphere.intensity = THREE.MathUtils.lerp(THREE.MathUtils.lerp(2.4, .48, caveAmount), 1.4, rainAmount)
    ;(this.scene.background as THREE.Color).lerpColors(this.dayBackground, this.caveBackground, caveAmount).lerp(this.rainBackground, rainAmount * .42)
    const fog = this.scene.fog as THREE.Fog
    fog.color.lerpColors(this.dayFog, this.caveFog, caveAmount).lerp(this.rainFog, rainAmount * .55)
    fog.far = THREE.MathUtils.lerp(THREE.MathUtils.lerp(252, 92, caveAmount), 135, rainAmount)
    if (playing && sectionIndex !== this.lastSection) { this.lastSection = sectionIndex; this.toast(`${section.name} · ${section.hint}`, 'info', 4) }
    if (now - this.lastHud > 80) {
      this.lastHud = now
      const isEndless = this.state.gameType === 'endless'
      Object.assign(this.state, {
        time: this.physics.time, distance: s, speed: Math.hypot(v.x, v.z) * 3.6,
        health: this.physics.health, stamina: this.physics.stamina,
        boosting: this.physics.boosting, braking: this.physics.braking,
        nosCharges: this.physics.nosCharges, nosActive: this.physics.isNosActive,
        nosTimeLeft: this.physics.nosTimeLeft,
        parachuteCharges: this.physics.parachuteCharges,
        parachuteActive: this.physics.isParachuteActive,
        parachuteTimeLeft: this.physics.parachuteTimeLeft,
        nearMissCount: this.physics.nearMissCount,
        combo: this.physics.combo,
        isAirborne: this.physics.isAirborne,
        coins: this.physics.coins, hasShield: this.physics.hasShield,
        magnetActive: this.physics.magnetTimeLeft > 0,
        magnetTimeLeft: this.physics.magnetTimeLeft,
        feverActive: this.physics.feverTimeLeft > 0,
        feverTimeLeft: this.physics.feverTimeLeft,
        stars: this.physics.stars,
        score: Math.max(0, (isEndless
          ? Math.round(s * 2.5 + this.physics.stars * 120 + this.physics.coins * 50 + this.physics.time * 6 + this.physics.nearMissCount * 25)
          : calculateScore(this.physics.stars, this.physics.health, this.physics.time, this.physics.finished) + this.physics.coins * 50 + this.physics.nearMissCount * 25) - this.physics.scorePenalty),
        checkpoint: this.physics.checkpoint, section: sectionIndex, hits: this.physics.hits,
        onDock: this.physics.onDock,
        isMultiplayer: Boolean(this.multiplayer && (this.multiplayer.status === 'in_game' || this.multiplayer.status === 'connected')),
        opponentName: this.multiplayer?.opponentName || 'Lawan',
        opponentDistance: this.multiplayer?.opponentState?.s || 0,
        opponentScore: this.multiplayer?.opponentState?.score || 0,
        opponentHealth: this.multiplayer?.opponentState?.health || 100,
      })
    }
    if (this.visualTime > this.toastUntil && this.state.toast) this.state.toast = ''
    if (!frozen) {
      const t = this.visualTime, bob = Math.sin(t * 3.5 + s * .7) * (.07 + section.rapids * .10)
      if (this.physics.capsized && !playing) this.physics.whirlpoolSpin *= Math.exp(-dt * 1.5)
      let waterfallPitch = 0
      for (const w of WATERFALL_DROPS) {
        const dive = THREE.MathUtils.smoothstep(s, w.s - 8, w.s + 1)
          * (1 - THREE.MathUtils.smoothstep(s, w.s + 5, w.s + 16))
        if (dive > 0) waterfallPitch += -0.48 * dive
      }

      if (this.physics.isWaterfallPlunge) {
        // FATAL WATERFALL ABYSS PLUNGE: Raft shoots over the precipice, plummeting down into the camera!
        const plungeT = Math.min(1.0, this.physics.plungeElapsed / 2.2)
        const plungeY = raftElevation(this.physics.plungeS) - plungeT * 28.0
        this.raft.position.set(p.x, plungeY, p.z - plungeT * 9.0)
        this.raft.rotation.x = -Math.PI * 0.42 - Math.sin(plungeT * Math.PI) * 0.25
        this.raft.rotation.z = Math.sin(this.physics.plungeElapsed * 7) * 0.4
        this.raft.rotation.y += dt * 3.8
        this.particles?.emit(p.x, plungeY + 0.4, p.z, 28, 5.5, 0, 0, -4, 2.8)
      } else if (this.physics.capsized) {
        if (this.physics.isCrocodileLaunch) {
          // CROCODILE TAIL WHIP: Launch 4.6m into the air & tumble flip upside down!
          const tLaunch = Math.min(1.0, this.physics.capsizeElapsed / 0.95)
          const airborneArc = Math.sin(tLaunch * Math.PI) * 4.6
          this.raft.position.set(p.x + this.physics.crocLaunchDir * tLaunch * 5.5, raftElevation(s) + 0.15 + airborneArc, p.z + tLaunch * 2.5)
          const launchRoll = this.physics.crocLaunchDir * tLaunch * Math.PI * 2.2
          const launchPitch = Math.sin(tLaunch * Math.PI) * 1.6
          this.raft.rotation.z = THREE.MathUtils.damp(this.raft.rotation.z, launchRoll, 14, dt)
          this.raft.rotation.x = THREE.MathUtils.damp(this.raft.rotation.x, launchPitch, 14, dt)
          this.raft.rotation.y += this.physics.crocLaunchDir * dt * 12.0
          if (this.physics.capsizeElapsed < 0.22) {
            this.particles?.emit(p.x, riverElevation(s) + 0.8, p.z, 90, 8.5, this.physics.crocLaunchDir * 4.5, 0, -5, 4.5)
          }
        } else {
          this.raft.position.set(p.x, raftElevation(s) + .05 + bob, p.z)
          const capsizeRoll = Math.PI * THREE.MathUtils.smoothstep(this.physics.capsizeElapsed, 0, .42) + Math.sin(t * 18) * .075
          this.raft.rotation.z = THREE.MathUtils.damp(this.raft.rotation.z, capsizeRoll, 11, dt)
          this.raft.rotation.x = Math.sin(t * 15) * .11
          this.raft.rotation.y += this.physics.whirlpoolSpin * dt
        }
      } else {
        const jumpY = this.physics.jumpAltitude
        const foamLift = plungeFoamIntensity(s) * .35 + this.physics.rapid * .15
        // Rakit yang menukik tajam / berada di lengkung kaki jeram diangkat agar hidung & buritan tidak menembus air
        let slopeLift = 0
        for (const d of [-2.5, 0, 2.5]) slopeLift = Math.max(slopeLift, Math.abs(getSplineTangent(s + d).y))
        this.raft.position.set(p.x, raftElevation(s) + .05 + bob + jumpY + foamLift + slopeLift * 1.5 + this.physics.rampLift, p.z)
        const rumble = this.physics.rumble
        if (rumble > 0) {
          // Getaran kiri-kanan saat melindas batu bergerigi
          this.raft.position.x += Math.sin(t * 47) * .16 * rumble
          this.raft.position.y += Math.abs(Math.sin(t * 31)) * .09 * rumble
          this.impactShake = Math.max(this.impactShake, .38 * rumble)
          if (playing && t > this.rumbleSplashAt) {
            this.rumbleSplashAt = t + .12
            this.particles?.emit(p.x + (Math.random() - .5) * 2.4, raftElevation(s) + .2, p.z + 1, 18, 2.6, 0, 0, 0, 1.2)
          }
        }

        // 1 & 2. PITCHING & BANKING (CatmullRomCurve3):
        // Pitching: rakit menukik ke bawah saat menuruni air terjun / curam
        const tangent = getSplineTangent(s)
        const splinePitch = Math.asin(Math.max(-0.95, Math.min(0.95, tangent.y))) * 1.15
        let airPitch = 0
        if (this.physics.isParachuteActive) airPitch = -0.12
        else if (jumpY > 0.05) airPitch = Math.max(-0.4, Math.min(0.35, -this.physics.jumpVy * 0.025))
        this.raft.rotation.x = splinePitch + airPitch + this.physics.rampPitch + Math.sin(t * 3.2 + s) * (.018 + section.rapids * .055)

        // Banking: rakit miring (roll) saat berbelok dan saat meluncur drift ke samping
        const bankRoll = -this.physics.lateralVelocity * 0.038 - this.currentSteering * 0.12
        const normalRoll = Math.sin(t * 4) * section.rapids * .045 + Math.sin(t * 32) * this.impactShake * .1
        this.raft.rotation.z = THREE.MathUtils.damp(this.raft.rotation.z, bankRoll + normalRoll, 7, dt) + Math.sin(t * 39) * .11 * this.physics.rumble

        // Yaw: menghadap ke arah kurva sungai
        const tangentYaw = Math.atan2(tangent.x, -tangent.z)
        this.raft.rotation.y = THREE.MathUtils.damp(this.raft.rotation.y, tangentYaw, 6, dt)
        this.raft.rotation.y += (this.physics.whirlpoolSpin + this.physics.spinImpulse) * dt

        if (this.state.mode === 'menu') {
          // Raft in menu: resting elegantly at lower-center-left, angled toward downstream-right (Images)
          const menuBob = Math.sin(t * 2.2) * 0.038
          this.raft.position.set(riverCenter(s) - 0.45, raftElevation(s) + 0.05 + menuBob, -s)
          this.raft.rotation.set(
            Math.sin(t * 1.8) * 0.02,
            0.26 + Math.sin(t * 0.8) * 0.012,
            Math.sin(t * 2.1) * 0.025
          )
          if (this.paddle) {
            this.paddle.position.set(-0.15, 0.96, -0.22)
            this.paddle.rotation.set(0.08, 0.35, -0.05)
          }
        }

        // MULTIPLAYER OPPONENT RAFT SYNC & RENDERING
        if (this.multiplayer && (this.multiplayer.status === 'in_game' || this.multiplayer.status === 'connected') && this.multiplayer.opponentState) {
          const opp = this.multiplayer.opponentState
          if (this.opponentRaft) {
            this.opponentRaft.visible = true
            this.opponentRaft.position.x = THREE.MathUtils.lerp(this.opponentRaft.position.x, opp.x, 0.45)
            this.opponentRaft.position.y = THREE.MathUtils.lerp(this.opponentRaft.position.y, opp.y, 0.45)
            this.opponentRaft.position.z = THREE.MathUtils.lerp(this.opponentRaft.position.z, opp.z, 0.45)
            this.opponentRaft.rotation.y = THREE.MathUtils.lerp(this.opponentRaft.rotation.y, opp.rotY, 0.45)
            this.opponentRaft.rotation.x = THREE.MathUtils.lerp(this.opponentRaft.rotation.x, opp.pitch, 0.45)
            this.opponentRaft.rotation.z = THREE.MathUtils.lerp(this.opponentRaft.rotation.z, opp.roll, 0.45)

            // Pass opponent coordinates to physics for raft-to-raft collision
            this.physics.setOpponentState({
              x: this.opponentRaft.position.x,
              z: this.opponentRaft.position.z,
              s: opp.s,
              vx: opp.vx,
              vz: opp.vz,
            })
          }
        } else {
          if (this.opponentRaft) this.opponentRaft.visible = false
          this.physics.setOpponentState(null)
        }

        // Broadcast local raft state to multiplayer peer
        if (this.multiplayer && (this.multiplayer.status === 'in_game' || this.multiplayer.status === 'connected')) {
          const raftLinvel = this.physics.raft.linvel()
          this.multiplayer.sendState({
            s,
            lateral: this.physics.lateralOffset,
            x: p.x,
            y: this.raft.position.y,
            z: p.z,
            rotY: this.raft.rotation.y,
            pitch: this.raft.rotation.x,
            roll: this.raft.rotation.z,
            speed: this.physics.forwardSpeed,
            vx: raftLinvel.x,
            vz: raftLinvel.z,
            health: this.physics.health,
            score: this.state.score,
            isAirborne: this.physics.isAirborne,
          })
        }
      }

      if (this.parachuteModel) {
        this.parachuteModel.visible = this.physics.isParachuteActive
        if (this.physics.isParachuteActive) {
          this.parachuteModel.position.y = 3.8 + Math.sin(t * 14) * 0.08
          this.parachuteModel.rotation.z = Math.sin(t * 8) * 0.06
        }
      }
      const strokePower = THREE.MathUtils.smoothstep(Math.abs(this.currentSteering), .08, .65)
      const previousStroke = Math.sin(this.paddlePhase)
      const paddleRate = this.physics.boosting ? 2.2 : (this.physics.braking ? .55 : 1)
      this.paddlePhase += dt * (5 + strokePower * 3) * paddleRate
      const strokeCycle = Math.sin(this.paddlePhase)
      const strokeAngle = this.currentSteering * strokePower * (.5 + strokeCycle * .18)
      if (this.paddle) this.paddle.rotation.z = THREE.MathUtils.damp(this.paddle.rotation.z, strokeAngle, 11, dt)
      const activeSide = -Math.sign(this.currentSteering)
      if (this.paddler && !this.physics.capsized) this.paddler.rotation.y = THREE.MathUtils.damp(this.paddler.rotation.y, this.currentSteering * strokePower * .12, 7, dt)

      // Dynamic Character Jump Motion (Kinect Adventures River Rush - Images 4 & 5)
      const isAirborne = this.physics.isAirborne || this.physics.jumpAltitude > 0.1
      const jumpProgress = Math.sin(Math.min(1.0, this.physics.jumpAltitude / 5.5) * Math.PI)
      const charJumpLift = isAirborne ? jumpProgress * 0.95 : 0

      if (this.paddler && !this.physics.capsized) {
        this.paddler.position.y = this.paddlerHomePosition.y + charJumpLift
        if (isAirborne) {
          this.paddler.rotation.x = -0.22
          for (const [side, arm] of this.arms) {
            arm.rotation.x = THREE.MathUtils.damp(arm.rotation.x, -Math.PI * 0.72, 12, dt)
            arm.rotation.z = THREE.MathUtils.damp(arm.rotation.z, side * 0.45, 12, dt)
          }
        } else {
          this.paddler.rotation.x = THREE.MathUtils.damp(this.paddler.rotation.x, 0, 8, dt)
          for (const [side, arm] of this.arms) {
            const active = side === activeSide && strokePower > 0
            const armStroke = strokeCycle * strokePower
            arm.rotation.x = THREE.MathUtils.damp(arm.rotation.x, armStroke * (active ? .48 : -.2), 10, dt)
            arm.rotation.y = THREE.MathUtils.damp(arm.rotation.y, active ? -this.currentSteering * .12 : this.currentSteering * .05, 10, dt)
            arm.rotation.z = THREE.MathUtils.damp(arm.rotation.z, side * armStroke * (active ? .38 : .14), 10, dt)
          }
        }
      }

      if (this.companion && !this.physics.capsized) {
        this.companion.position.y = this.companionHomePosition.y + charJumpLift
        if (isAirborne) {
          this.companion.rotation.x = -0.25
          for (const [side, arm] of this.companionArms) {
            arm.rotation.x = THREE.MathUtils.damp(arm.rotation.x, -Math.PI * 0.78, 12, dt)
            arm.rotation.z = THREE.MathUtils.damp(arm.rotation.z, side * 0.52, 12, dt)
          }
        } else {
          this.companion.rotation.x = THREE.MathUtils.damp(this.companion.rotation.x, 0, 8, dt)
          this.companion.rotation.y = THREE.MathUtils.damp(this.companion.rotation.y, this.currentSteering * 0.15, 6, dt)
          for (const [side, arm] of this.companionArms) {
            arm.rotation.x = THREE.MathUtils.damp(arm.rotation.x, Math.sin(t * 3.5 + side) * 0.12, 8, dt)
            arm.rotation.z = THREE.MathUtils.damp(arm.rotation.z, side * 0.22, 8, dt)
          }
        }
      }
      if (activeSide && strokePower > .3) {
        const yaw = this.raft.rotation.y
        const paddleX = p.x + activeSide * 2.8 * Math.cos(yaw) - .25 * Math.sin(yaw)
        const paddleZ = p.z - activeSide * 2.8 * Math.sin(yaw) - .25 * Math.cos(yaw)
        if (playing && previousStroke <= .58 && strokeCycle > .58) {
          this.particles?.emitPaddleSplash(paddleX, riverElevation(s) + .05, paddleZ, activeSide, 3.8, v.x, v.z)
          if (this.physics.boosting) {
            this.onScreenSplash?.(0.35)
          }
        }
      }
      if (this.physics.isNosActive && playing) {
        const yaw = this.raft.rotation.y
        const cosY = Math.cos(yaw), sinY = Math.sin(yaw)
        for (const side of [-1, 1]) {
          const jetX = p.x + side * 1.15 * cosY + 1.65 * sinY
          const jetZ = p.z - side * 1.15 * sinY + 1.65 * cosY
          this.particles?.emit(jetX, raftElevation(s) + 0.35, jetZ, 14, 6.5, side * 0.35, v.x * 0.25, v.z * 1.4, 2.0)
        }
      } else if (this.physics.boosting) {
        this.audio.boost()
        if (playing && Math.random() < .4) {
          this.particles?.emit(p.x, riverElevation(s) + .15, p.z + 1.8, 12, 2, 0, v.x * .4, v.z * .7)
        }
      } else if (this.physics.braking) {
        this.audio.brake()
        if (playing && Math.random() < .35) {
          this.particles?.emit(p.x, riverElevation(s) + .15, p.z - 1.8, 8, 1.3, 0, 0, 0)
        }
      }
      if (this.physics.capsized && this.paddler?.parent === this.scene) {
        const waterY = riverElevation(s)
        if (this.physics.isCrocodileLaunch && this.physics.capsizeElapsed < 0.95) {
          const padT = this.physics.capsizeElapsed / 0.95
          const padArc = Math.sin(padT * Math.PI) * 3.8
          this.paddler.position.y = waterY + 0.4 + padArc
          this.paddler.position.x += this.physics.crocLaunchDir * dt * 5.2
          this.paddler.rotation.x += dt * 10.5
          this.paddler.rotation.z += this.physics.crocLaunchDir * dt * 14.0
        } else {
          this.paddler.position.y = Math.max(waterY + .16, this.paddler.position.y - dt * 4.1)
          this.paddler.position.x += Math.sin(t * 13) * dt * .2
          this.paddler.rotation.x += dt * 4.2
          this.paddler.rotation.z += dt * 5.4
        }
        const opacity = Math.sin(t * 27) > 0 ? .82 : .14
        for (const material of this.paddlerMaterials) material.opacity = opacity
      }
      this.water?.update(t, p.x, p.z, playing ? v.x : 0, playing ? v.z : -3,
        this.environment!.nearbyFoam(s, this.physics), rainAmount)
      this.environment?.update(t, s, this.physics, p.x, rainAmount, dt)
      this.wildlife?.update(t, s, p.x, Math.hypot(v.x, v.z) * 3.6, dt, this.particles)
      this.particles?.update(dt, p.x, p.z, v.x, v.z, section.rapids, playing, raftElevation(s))
      this.impactShake *= Math.exp(-dt * 5)
      // Getaran terus-menerus saat menukik di muka jeram / lereng curam
      if (playing && this.physics.jumpAltitude < 0.2) {
        this.impactShake = Math.max(this.impactShake, Math.max(0, this.physics.currentSlopeY) * 1.3 + this.physics.rapid * 0.22)
      }
      if (playing) this.audio.update(-v.z, v.x, Math.max(section.rapids, this.physics.rapid), this.physics.boosting, this.physics.braking)
    }

    if (this.physics.isWaterfallPlunge) {
      // Cinematic Front-Facing Fall Camera:
      // Camera is positioned downstream in front of the waterfall, looking UP and back at the falling raft!
      const camX = this.physics.plungeX
      const camY = raftElevation(this.physics.plungeS) - 15.0
      const camZ = -this.physics.plungeS - 14.5
      this.camera.position.lerp(new THREE.Vector3(camX, camY, camZ), 1 - Math.exp(-dt * 6.5))
      this.look.lerp(new THREE.Vector3(p.x, this.raft.position.y + 1.2, p.z), 1 - Math.exp(-dt * 8.5))
    } else {
      const menu = this.state.mode === 'menu'

      // 3. KAMERA DINAMIS: Dynamic Speed Pull-Back & FOV Zoom Out saat menukik / berkecepatan tinggi
      const speed = this.physics.forwardSpeed
      const speedRatio = Math.max(0, (speed - 11.5) / 16.0)
      const dynamicPullBack = speedRatio * 3.8
      const dynamicLift = speedRatio * 1.2

      const isJumping = this.physics.jumpAltitude > 0.2
      const jumpCamLift = isJumping ? this.physics.jumpAltitude * 0.85 + 2.0 : 0
      const jumpCamPullBack = isJumping ? 3.4 : 0

      // KAMERA JERAM: deteksi turunan curam/busa di sekitar & di depan rakit, lalu naikkan kamera
      // ke posisi atas (top-down) agar rakit tetap terlihat dan tidak tertutup bibir jeram di belakangnya.
      let steepAhead = 0
      for (const d of [-10, -5, 0, 5, 10, 16, 22]) steepAhead = Math.max(steepAhead, Math.max(0, -getSplineTangent(s + d).y))
      const cascadeTarget = menu ? 0 : Math.min(1, steepAhead * 1.7 + plungeFoamIntensity(s) * .5)
      this.cascadeCam = THREE.MathUtils.damp(this.cascadeCam, cascadeTarget, cascadeTarget > this.cascadeCam ? 5 : 1.6, dt)
      const cc = this.cascadeCam

      const camYOffset = (this.physics.isParachuteActive ? 9.6 : (5.2 + dynamicLift + jumpCamLift)) + cc * 9.5
      const camZOffset = Math.max(4.5, (this.physics.isParachuteActive ? 15.0 : 11.4) + dynamicPullBack + jumpCamPullBack - cc * 3)
      // Dasar ketinggian = permukaan air tertinggi antara rakit dan posisi kamera (bibir jeram di hulu)
      const raftY = raftElevation(s)
      const upstreamY = Math.max(riverElevation(s - camZOffset), riverElevation(s - camZOffset * .5))
      const baseY = menu ? raftY : Math.min(raftY + 14, Math.max(raftY, upstreamY - cc * 3))

      if (menu) {
        const menuS = 22
        const pX = riverCenter(menuS)
        const pY = riverElevation(menuS) + 0.35
        const pZ = -menuS
        this.raft.position.set(pX, pY + Math.sin(this.visualTime * 2.0) * 0.04, pZ)
        this.raft.rotation.set(
          Math.sin(this.visualTime * 1.5) * 0.03,
          0,
          Math.cos(this.visualTime * 1.8) * 0.04
        )
        if (this.environment?.dockGroup) this.environment.dockGroup.visible = false

        // Precise camera placement matching user's menu reference image:
        this.target.set(
          pX - 0.75 + Math.sin(this.visualTime * 0.4) * 0.12,
          pY + 1.85 + Math.sin(this.visualTime * 0.6) * 0.06,
          pZ + 5.6 + Math.cos(this.visualTime * 0.4) * 0.1,
        )
        this.camera.position.lerp(this.target, 1 - Math.exp(-dt * 4.5))

        // Looking downstream towards the stone arch bridge and waterfall on the right
        this.lookTarget.set(
          riverCenter(menuS + 38) + 1.8,
          riverElevation(menuS + 38) + 2.3,
          -(menuS + 38),
        )
        this.look.lerp(this.lookTarget, 1 - Math.exp(-dt * 4.5))
      } else {
        this.target.set(
          p.x * .65 + riverCenter(s) * .35,
          baseY + camYOffset,
          p.z + camZOffset,
        )
        this.camera.position.lerp(this.target, 1 - Math.exp(-dt * (isJumping ? 6.5 : 4.2 + cc * 4.5)))

        // Look-Ahead: Kamera melihat ke depan lintasan (s + 22m), slightly tilting down during jump to showcase canyon abyss (Images 4 & 5)
        const lookPt = getSplinePoint(s + 22)
        const lookDown = isJumping ? -1.8 : 0
        this.lookTarget.set(
          lookPt.x * 0.45 + p.x * 0.55,
          lookPt.y + 1.3 + (this.physics.jumpAltitude * 0.25) + lookDown,
          lookPt.z,
        )
        // Di turunan ekstrem, pandangan diarahkan ke rakit (bukan jauh ke depan) agar rakit selalu di tengah layar
        if (cc > 0.01) {
          const raftLook = new THREE.Vector3(p.x, this.raft.position.y + .4, p.z - 3)
          this.lookTarget.lerp(raftLook, cc * .9)
        }
        this.look.lerp(this.lookTarget, 1 - Math.exp(-dt * (isJumping ? 6.0 : 4.0 + cc * 4)))
      }
    }

    // 4. SCREEN SHAKE: Getaran kamera berfrekuensi tinggi saat benturan atau jeram ekstrem
    this.camera.position.x += Math.sin(this.visualTime * 56) * this.impactShake * 0.08
    this.camera.position.y += Math.cos(this.visualTime * 48) * this.impactShake * 0.06
    this.camera.position.x += Math.sin(this.visualTime * 24) * Math.abs(this.physics.whirlpoolSpin) * .012
    this.camera.position.y += Math.cos(this.visualTime * 19) * Math.abs(this.physics.whirlpoolSpin) * .006
    // Kamera tidak boleh tenggelam di bawah permukaan air (di posisinya sendiri maupun di atas rakit)
    if (!this.physics.isWaterfallPlunge) {
      const minCamY = Math.max(riverElevation(-this.camera.position.z) + 2.8, this.raft.position.y + 2.4 + this.cascadeCam * 4)
      if (this.camera.position.y < minCamY) this.camera.position.y = minCamY
    }

    // Dynamic FOV: Zoom out saat kecepatan bertambah karena air terjun / NOS
    const baseFov = this.physics.isNosActive ? 75 : (this.physics.isParachuteActive ? 64 : (this.physics.boosting ? 60 : (this.physics.braking ? 50 : 54)))
    const speedRatio = Math.max(0, (this.physics.forwardSpeed - 11.5) / 16.0)
    const targetFov = baseFov + speedRatio * 14.0
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 4.0, dt)
    this.camera.updateProjectionMatrix()
    this.camera.lookAt(this.look)
    this.sun.position.set(p.x - 35, 58 + riverElevation(s), p.z - 25); this.sun.target.position.set(p.x, riverElevation(s), p.z - 30)
    this.renderer.render(this.scene, this.camera)
  }
  private createOpponentNametag(name: string): THREE.Sprite {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 64
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)'
    ctx.beginPath()
    ctx.roundRect(6, 6, 244, 52, 14)
    ctx.fill()
    ctx.strokeStyle = '#f43f5e'
    ctx.lineWidth = 4
    ctx.stroke()
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 24px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('🔴 ' + name, 128, 32)
    const texture = new THREE.CanvasTexture(canvas)
    const mat = new THREE.SpriteMaterial({ map: texture, depthTest: false })
    const sprite = new THREE.Sprite(mat)
    sprite.scale.set(3.6, 0.9, 1)
    sprite.position.set(0, 2.6, 0)
    return sprite
  }

  updateOpponentNametag(name: string) {
    if (!this.opponentNametag) return
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 64
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)'
    ctx.beginPath()
    ctx.roundRect(6, 6, 244, 52, 14)
    ctx.fill()
    ctx.strokeStyle = '#f43f5e'
    ctx.lineWidth = 4
    ctx.stroke()
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 24px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('🔴 ' + name, 128, 32)
    const texture = new THREE.CanvasTexture(canvas)
    this.opponentNametag.material.map?.dispose()
    this.opponentNametag.material.map = texture
    this.opponentNametag.material.needsUpdate = true
  }

  setMultiplayer(mp: MultiplayerManager | null) {
    this.multiplayer = mp
    if (!mp) {
      if (this.opponentRaft) this.opponentRaft.visible = false
      this.physics.setOpponentState(null)
      return
    }
    this.updateOpponentNametag(mp.opponentName || 'Lawan')
    if (this.opponentRaft) {
      applyRaftSkins(this.opponentRaft, mp.opponentSkin || 'red', 'carbon')
    }
    mp.callbacks.onLaunch = () => {
      this.launchRaft()
    }
    mp.callbacks.onOpponentCollision = (nx, nz) => {
      this.physics.applyOpponentBump(nx, nz)
      this.audio.impact(8)
      this.impactShake = 1.3
      const p = this.physics.raft.translation()
      this.particles?.emitSplashdown(p.x, riverElevation(-p.z) + 0.2, p.z, 3.5)
      this.onScreenSplash?.(0.7)
      this.toast('💥 TERBENTUR OLEH LAWAN!', 'hit', 1.6)
    }
  }

  private complete(won: boolean) {
    const isEndless = this.state.gameType === 'endless'
    const p = this.physics.raft.translation(), s = -p.z
    this.state.mode = isEndless ? (this.physics.health <= 0 ? 'lost' : 'won') : (won ? 'won' : 'lost')
    this.input.enabled = false; this.input.clear(); this.head.stop()
    this.state.score = Math.max(0, (isEndless
      ? Math.round(s * 2.5 + this.physics.stars * 120 + this.physics.time * 6 + this.physics.coins * 50 + this.physics.nearMissCount * 25)
      : calculateScore(this.physics.stars, this.physics.health, this.physics.time, won) + this.physics.coins * 50 + this.physics.nearMissCount * 25) - this.physics.scorePenalty)
    this.state.time = this.physics.time
    this.state.health = this.physics.health
    this.state.stars = this.physics.stars
    this.state.distance = s
    this.audio.finish(won || (isEndless && s > 400))
    this.onComplete?.(won || (isEndless && s > 400))
  }
  debug() {
    return { mode: this.state.mode, position: this.physics.raft.translation(), velocity: this.physics.raft.linvel(),
      health: this.physics.health, stars: this.physics.stars, time: this.physics.time,
      particles: this.particles?.active, particleCapacity: this.particles?.capacity, totalEmitted: this.particles?.totalEmitted,
      drawCalls: this.renderer.info.render.calls, triangles: this.renderer.info.render.triangles,
      geometries: this.renderer.info.memory.geometries, cameraActive: this.head.active }
  }
  private disposeObjects(root: THREE.Object3D) {
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>()
    root.traverse(object => { if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.Line) {
      geometries.add(object.geometry); (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => materials.add(material))
    } })
    geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose())
  }
  dispose() {
    this.disposed = true; cancelAnimationFrame(this.frame); this.resizeObserver.disconnect()
    document.removeEventListener('visibilitychange', this.visibility); window.removeEventListener('blur', this.blur); this.canvas.removeEventListener('webglcontextlost', this.contextLost)
    this.input.dispose(); this.head.stop(); void this.audio.dispose(); if (this.state.ready) this.physics.dispose()
    this.wildlife?.dispose(); this.environment?.dispose(); this.water?.dispose(); this.disposeObjects(this.scene); this.sun.shadow.map?.dispose(); this.renderer.dispose(); this.renderer.forceContextLoss()
    if (import.meta.env.DEV) Reflect.deleteProperty(window, '__riverRush')
  }
}
