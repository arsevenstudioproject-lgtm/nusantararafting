import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js'
import { CHECKPOINTS, CAVE_END, CAVE_START, FINISH, HALF_WIDTH, JAGGED_FIELDS, obstacles, pickups, random, riverbankCliffHeight, riverCenter, riverElevation, RIVER_FORKS, type RiverFork, WATERFALL_DROPS, WATERFALL_START, RAMP_LENGTH } from './level'
import type { RiverPhysics } from './physics'
import { addHangingVine, type VegetationPalette } from './vegetation'

const materials = {
  stone: new THREE.MeshStandardMaterial({ color: '#7c8b7b', roughness: 1, flatShading: true, vertexColors: true }),
  lightStone: new THREE.MeshStandardMaterial({ color: '#a9a795', roughness: 1, flatShading: true, vertexColors: true }),
  darkStone: new THREE.MeshStandardMaterial({ color: '#586c63', roughness: 1, flatShading: true, vertexColors: true }),
  earth: new THREE.MeshStandardMaterial({ color: '#a59868', roughness: 1, flatShading: true }),
  terrain: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, flatShading: true, vertexColors: true }),
  grass: new THREE.MeshStandardMaterial({ color: '#7c9f42', roughness: 1, flatShading: true, side: THREE.DoubleSide }),
  grassBright: new THREE.MeshStandardMaterial({ color: '#a2b957', roughness: 1, flatShading: true, side: THREE.DoubleSide }),
  grassDeep: new THREE.MeshStandardMaterial({ color: '#62834b', roughness: 1, flatShading: true, side: THREE.DoubleSide }),
  grassDry: new THREE.MeshStandardMaterial({ color: '#b29b58', roughness: 1, flatShading: true, side: THREE.DoubleSide }),
  trunk: new THREE.MeshStandardMaterial({ color: '#795232', roughness: 1, flatShading: true }),
  barkDark: new THREE.MeshStandardMaterial({ color: '#514034', roughness: .98, flatShading: true }),
  barkLight: new THREE.MeshStandardMaterial({ color: '#93734c', roughness: .98, flatShading: true }),
  cut: new THREE.MeshStandardMaterial({ color: '#caab73', roughness: 1, flatShading: true }),
  leaf: new THREE.MeshStandardMaterial({ color: '#3e9b58', roughness: 1, flatShading: true, side: THREE.DoubleSide }),
  leafLight: new THREE.MeshStandardMaterial({ color: '#a6cf4d', roughness: 1, flatShading: true, side: THREE.DoubleSide }),
  leafDark: new THREE.MeshStandardMaterial({ color: '#4c7c52', roughness: 1, flatShading: true, side: THREE.DoubleSide }),
  leafOlive: new THREE.MeshStandardMaterial({ color: '#75893d', roughness: .96, flatShading: true, side: THREE.DoubleSide }),
  leafJade: new THREE.MeshStandardMaterial({ color: '#55a76d', roughness: .94, flatShading: true, side: THREE.DoubleSide }),
  leafPine: new THREE.MeshStandardMaterial({ color: '#427657', roughness: 1, flatShading: true, side: THREE.DoubleSide }),
  leafAutumn: new THREE.MeshStandardMaterial({ color: '#b95d35', roughness: 1, flatShading: true, side: THREE.DoubleSide }),
  leafAmber: new THREE.MeshStandardMaterial({ color: '#d69a3d', roughness: 1, flatShading: true, side: THREE.DoubleSide }),
  leafRust: new THREE.MeshStandardMaterial({ color: '#8d4935', roughness: 1, flatShading: true, side: THREE.DoubleSide }),
  moss: new THREE.MeshStandardMaterial({ color: '#9fbd4f', roughness: 1, flatShading: true, side: THREE.DoubleSide }),
  flowerYellow: new THREE.MeshStandardMaterial({ color: '#efc84d', roughness: 1, flatShading: true, side: THREE.DoubleSide }),
  flowerCoral: new THREE.MeshStandardMaterial({ color: '#e66a49', roughness: 1, flatShading: true, side: THREE.DoubleSide }),
  flowerCream: new THREE.MeshStandardMaterial({ color: '#f1e8b4', roughness: 1, flatShading: true, side: THREE.DoubleSide }),
  flag: new THREE.MeshStandardMaterial({ color: '#ff7041', roughness: .8, side: THREE.DoubleSide }),
  white: new THREE.MeshStandardMaterial({ color: '#fff2d5', roughness: .8, side: THREE.DoubleSide }),
  cloudBlue: new THREE.MeshStandardMaterial({ color: '#d8eeee', roughness: .9, flatShading: true, side: THREE.DoubleSide }),
  gold: new THREE.MeshStandardMaterial({ color: '#ffd650', roughness: .3, metalness: .3, emissive: '#8e4f07', emissiveIntensity: .25 }),
  caveRock: new THREE.MeshStandardMaterial({ color: '#515b52', roughness: 1, flatShading: true }),
  mist: new THREE.MeshStandardMaterial({ color: '#f0faff', roughness: .9, transparent: true, opacity: .45, flatShading: true, side: THREE.DoubleSide, depthWrite: false }),
  nosRed: new THREE.MeshStandardMaterial({ color: '#e62429', roughness: 0.35, metalness: 0.6 }),
  nosYellow: new THREE.MeshStandardMaterial({ color: '#ffcc00', roughness: 0.3, metalness: 0.5 }),
  medicalWhite: new THREE.MeshStandardMaterial({ color: '#f7fafc', roughness: 0.4 }),
  medicalGreen: new THREE.MeshStandardMaterial({ color: '#10b981', roughness: 0.3, emissive: '#059669', emissiveIntensity: 0.4 }),
  relicGold: new THREE.MeshStandardMaterial({ color: '#f59e0b', roughness: 0.25, metalness: 0.85, emissive: '#d97706', emissiveIntensity: 0.3 }),
  shieldAqua: new THREE.MeshStandardMaterial({ color: '#06b6d4', roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.72, side: THREE.DoubleSide }),
  shieldRing: new THREE.MeshStandardMaterial({ color: '#22d3ee', emissive: '#0891b2', emissiveIntensity: 0.8 }),
  dangerRed: new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.4, emissive: '#991b1b', emissiveIntensity: 0.6 }),
  safeGreen: new THREE.MeshStandardMaterial({ color: '#16a34a', roughness: 0.4, emissive: '#15803d', emissiveIntensity: 0.6 }),
  parachuteCanopy: new THREE.MeshStandardMaterial({ color: '#f97316', roughness: 0.35, side: THREE.DoubleSide }),
  parachuteStripe: new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.35, side: THREE.DoubleSide }),
  parachuteCord: new THREE.MeshBasicMaterial({ color: '#cbd5e1' }),
  rampWood: new THREE.MeshStandardMaterial({ color: '#784d28', roughness: 0.9, flatShading: true }),
  rampArrow: new THREE.MeshStandardMaterial({ color: '#fbbf24', roughness: 0.3, emissive: '#d97706', emissiveIntensity: 0.6 }),
}
type MaterialName = keyof typeof materials
type TreeTheme = 'green' | 'pine' | 'red' | 'none'
type TerrainMaterialName = 'earth' | 'grass' | 'grassBright' | 'grassDeep' | 'grassDry'
type TerrainPalette = Record<TerrainMaterialName, THREE.Color>
type ForestBiome = { trees: TreeTheme; leaves: MaterialName[]; grasses: MaterialName[]; terrain: TerrainPalette }
const terrainPalette = (earth: string, grass: string, bright: string, deep: string, dry: string): TerrainPalette => ({
  earth: new THREE.Color(earth), grass: new THREE.Color(grass), grassBright: new THREE.Color(bright),
  grassDeep: new THREE.Color(deep), grassDry: new THREE.Color(dry),
})
// One palette per checkpoint zone: the tree family and the ground colors shift together.
const forestBiomes: ForestBiome[] = [
  { trees: 'green', leaves: ['leaf', 'leafJade', 'leafLight', 'leafOlive'], grasses: ['grass', 'grassBright', 'grassDeep'], terrain: terrainPalette('#a49768', '#76a545', '#9dbd4c', '#56834b', '#b09b60') },
  { trees: 'red', leaves: ['leafAutumn', 'leafAmber', 'leafRust'], grasses: ['grassDry', 'grassBright'], terrain: terrainPalette('#966544', '#a44f38', '#d17b42', '#70413b', '#c08b4f') },
  { trees: 'pine', leaves: ['leafPine', 'leafDark', 'leafJade'], grasses: ['grassDeep', 'grass', 'grassDeep'], terrain: terrainPalette('#675f4b', '#405e43', '#70824a', '#304a3b', '#8a8054') },
  { trees: 'none', leaves: ['leafDark', 'leafPine', 'leafOlive'], grasses: ['grassDeep', 'grassDry'], terrain: terrainPalette('#706f64', '#647b70', '#8d9b87', '#465a55', '#948d78') },
  { trees: 'green', leaves: ['leafJade', 'leafLight', 'leaf', 'leafOlive'], grasses: ['grassBright', 'grass', 'grassDeep'], terrain: terrainPalette('#9c8760', '#4c9949', '#90c548', '#30764d', '#ae9b52') },
  { trees: 'red', leaves: ['leafRust', 'leafAutumn', 'leafAmber'], grasses: ['grassDry', 'grass', 'grassBright'], terrain: terrainPalette('#8e634f', '#a9553a', '#d5794d', '#734540', '#c18e55') },
  { trees: 'pine', leaves: ['leafPine', 'leafDark', 'leafJade'], grasses: ['grassDeep', 'grass', 'grassBright'], terrain: terrainPalette('#6e715b', '#547a47', '#95a95d', '#385c43', '#a28b55') },
  { trees: 'green', leaves: ['leafJade', 'leafLight', 'leafAmber', 'leaf'], grasses: ['grassBright', 'grass', 'grassDry'], terrain: terrainPalette('#958265', '#a68e52', '#c1ad65', '#777b4a', '#b4a06b') },
  { trees: 'pine', leaves: ['leafPine', 'leafDark', 'leafOlive'], grasses: ['grassDeep', 'grass', 'grassBright'], terrain: terrainPalette('#727b70', '#5f8060', '#a0ad72', '#405a51', '#a49a6a') },
  { trees: 'red', leaves: ['leafAutumn', 'leafRust', 'leafAmber'], grasses: ['grassDry', 'grassBright', 'grass'], terrain: terrainPalette('#8f6144', '#a94a36', '#d9773d', '#783d37', '#b9874e') },
]
function forestBiome(s: number) {
  const zone = CHECKPOINTS.reduce((count, checkpoint) => count + Number(s >= checkpoint), 0)
  return forestBiomes[Math.min(zone, forestBiomes.length - 1)]
}
type PlantPart = { geometry: THREE.BufferGeometry; material: THREE.Material }
export type PlantAssetCategory = 'bush' | 'fern' | 'grass' | 'reeds' | 'pohonEmerald' | 'pohonAutumn' | 'pohonPine' | 'pohonHighland'
export type RockCategory = 'cliff' | 'boulder' | 'slate' | 'arch'
export type RockType = 'basalt' | 'granite' | 'limestone'
export type ModelAsset = { name: string; parts: PlantPart[]; height: number; width: number; depth: number }
export type PlantAsset = ModelAsset & { category: PlantAssetCategory }
export type RockAsset = ModelAsset & { category: RockCategory; rockType: RockType }
export type WoodCategory = 'bridge' | 'hollow' | 'logjam' | 'uprooted'
export type WoodBiome = 'driftwood' | 'rainforest' | 'redwood' | 'swamp'
export type WoodAsset = ModelAsset & { category: WoodCategory; woodBiome: WoodBiome }
type PlantBatch = { material: THREE.Material; geometries: THREE.BufferGeometry[] }
export type TexturedForestModel = { name: string; scene: THREE.Group }
type CrocodileVisual = { mixer: THREE.AnimationMixer; swim: THREE.AnimationAction; bite: THREE.AnimationAction; biteRemaining: number }

export function zoneWoodBiome(s: number): WoodBiome {
  if (s >= CAVE_START - 20 && s <= CAVE_END + 20) return 'swamp'
  if (s >= WATERFALL_START - 20) return 'driftwood'
  if (s < 280) return 'rainforest'
  if (s < 485) return 'driftwood'
  if (s < 620) return 'swamp'
  if (s < 960) return 'redwood'
  return 'driftwood'
}

function parseWoodName(name: string): { category: WoodCategory; woodBiome: WoodBiome } {
  const parts = name.split('_')
  const category = (['bridge', 'hollow', 'logjam', 'uprooted'].includes(parts[2]) ? parts[2] : 'hollow') as WoodCategory
  const woodBiome = (['driftwood', 'rainforest', 'redwood', 'swamp'].includes(parts[3]) ? parts[3] : 'driftwood') as WoodBiome
  return { category, woodBiome }
}

function createWoodCatalog(models: TexturedForestModel[]): WoodAsset[] {
  const assets = models.map(model => {
    const asset = createModelAsset(model.name, model.scene)
    if (!asset) return undefined
    const { category, woodBiome } = parseWoodName(model.name)
    return { ...asset, category, woodBiome }
  }).filter((asset): asset is WoodAsset => Boolean(asset))
  return assets
}

export function zoneRockType(s: number): RockType {
  // Cave zone: dark basalt rock matching Reference Image 2
  if (s >= CAVE_START - 20 && s <= CAVE_END + 20) return 'basalt'
  // Waterfall and highland drop zone: rugged limestone
  if (s >= WATERFALL_START - 20) return 'limestone'
  // Open canyon & valley rapids: warm canyon granite matching Reference Image 1 & 3
  return 'granite'
}

export function zoneTreeCategory(s: number): 'pohonEmerald' | 'pohonAutumn' | 'pohonPine' | 'pohonHighland' | null {
  // Cave zone: dark basalt rock chasm, cavern arches, stalactites, no surface trees
  if (s >= CAVE_START - 20 && s <= CAVE_END + 25) return null
  // Arena 1: Green River Valley (0m to 280m) - Lush green emerald trees only
  if (s < 280) return 'pohonEmerald'
  // Arena 2: Golden Autumn Canyon (280m to 485m) - Yellow / golden autumn trees only
  if (s < 485) return 'pohonAutumn'
  // Basalt gorge transition
  if (s < 620) return null
  // Arena 3: Highland Bluff Forest (620m to 960m) - Highland trees only
  if (s < 960) return 'pohonHighland'
  // Arena 4: Pine Ridge & Waterfall drop (960m to 1800m) - Pine trees only
  return 'pohonPine'
}

function plantCategory(name: string): PlantAssetCategory {
  if (name.startsWith('pohon_pine_')) return 'pohonPine'
  if (name.startsWith('pohon_')) {
    if (name.includes('_autumn_')) return 'pohonAutumn'
    if (name.includes('_highland_')) return 'pohonHighland'
    return 'pohonEmerald'
  }
  if (name.startsWith('vegetasi_bush_')) return 'bush'
  if (name.startsWith('vegetasi_fern_')) return 'fern'
  if (name.startsWith('vegetasi_reeds_')) return 'reeds'
  return 'grass'
}

function createModelAsset(name: string, source: THREE.Object3D): ModelAsset | undefined {
  const model = source.clone(true)
  model.updateMatrixWorld(true)
  const bounds = new THREE.Box3().setFromObject(model)
  if (bounds.isEmpty()) return undefined
  const size = bounds.getSize(new THREE.Vector3())
  if (size.y <= .01) return undefined
  const center = bounds.getCenter(new THREE.Vector3())

  // For tree assets (pohon_), align anchor to the base of the trunk (Batang_Dan_Akar)
  // so the trunk stands proudly and visibly on top of the riverbank,
  // while the subterranean rock island foundation penetrates cleanly into the earth.
  let anchorY = bounds.min.y
  let assetHeight = size.y
  if (name.startsWith('pohon_')) {
    let trunkMinY: number | null = null
    model.traverse(obj => {
      if (obj.name.includes('Batang') || (obj.parent && obj.parent.name.includes('Batang'))) {
        if (obj instanceof THREE.Mesh) {
          const b = new THREE.Box3().setFromObject(obj)
          if (!b.isEmpty()) trunkMinY = trunkMinY === null ? b.min.y : Math.min(trunkMinY, b.min.y)
        }
      }
    })
    anchorY = trunkMinY !== null ? trunkMinY : (bounds.min.y + 1.05)
    assetHeight = Math.max(1.0, bounds.max.y - anchorY)
  }

  const normalize = new THREE.Matrix4().makeTranslation(-center.x, -anchorY, -center.z)
  const parts: PlantPart[] = []
  model.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return
    let geometry = object.geometry.clone()
    geometry.applyMatrix4(normalize.clone().multiply(object.matrixWorld))
    const materialsForMesh = Array.isArray(object.material) ? object.material : [object.material]
    if (materialsForMesh.length === 1) {
      if (geometry.index) {
        const nonIndexed = geometry.toNonIndexed()
        geometry.dispose(); geometry = nonIndexed
      }
      parts.push({ geometry, material: materialsForMesh[0] })
    }
    else {
      // Split multi-material glTF primitives before merging repeated instances.
      for (const group of geometry.groups) {
        const material = materialsForMesh[group.materialIndex ?? 0]
        if (!material || group.count <= 0) continue
        const indices = geometry.index
        const start = group.start, end = start + group.count
        const sliced = new THREE.BufferGeometry()
        for (const [attributeName, rawAttribute] of Object.entries(geometry.attributes)) {
          const attribute = rawAttribute as THREE.BufferAttribute
          const values: number[] = []
          for (let i = start; i < end; i++) {
            const vertex = indices ? indices.getX(i) : i
            for (let component = 0; component < attribute.itemSize; component++) values.push(attribute.array[vertex * attribute.itemSize + component] as number)
          }
          sliced.setAttribute(attributeName, new THREE.Float32BufferAttribute(values, attribute.itemSize))
        }
        if (!sliced.getAttribute('position')) { sliced.dispose(); continue }
        if (!sliced.getAttribute('normal')) sliced.computeVertexNormals()
        parts.push({ geometry: sliced, material })
      }
      geometry.dispose()
    }
  })
  return parts.length ? { name, parts, height: assetHeight, width: size.x, depth: size.z } : undefined
}

function createPlantCatalog(rumputModels: TexturedForestModel[], pohonModels: TexturedForestModel[]): PlantAsset[] {
  const sources = [
    ...rumputModels.map(asset => ({ name: asset.name, object: asset.scene })),
    ...pohonModels.map(asset => ({ name: asset.name, object: asset.scene })),
  ]
  const assets = sources.map(source => {
    const model = createModelAsset(source.name, source.object)
    return model ? { ...model, category: plantCategory(source.name) } : undefined
  }).filter((asset): asset is PlantAsset => Boolean(asset))
  if (assets.length !== sources.length) {
    const loadedNames = new Set(assets.map(asset => asset.name))
    const missing = sources.filter(source => !loadedNames.has(source.name)).map(source => source.name)
    throw new Error(`Plant assets could not be prepared: ${missing.join(', ')}`)
  }
  return assets
}

function parseRockName(name: string): { category: RockCategory; rockType: RockType } {
  const parts = name.split('_')
  const category = (['cliff', 'boulder', 'slate', 'arch'].includes(parts[1]) ? parts[1] : 'boulder') as RockCategory
  const rockType = (['basalt', 'granite', 'limestone'].includes(parts[2]) ? parts[2] : 'granite') as RockType
  return { category, rockType }
}

function createRockCatalog(models: TexturedForestModel[]): RockAsset[] {
  const assets = models.map(model => {
    const asset = createModelAsset(model.name, model.scene)
    if (!asset) return undefined
    const { category, rockType } = parseRockName(model.name)
    return { ...asset, category, rockType }
  }).filter((asset): asset is RockAsset => Boolean(asset))
  if (assets.length !== models.length) {
    const loadedNames = new Set(assets.map(asset => asset.name))
    const missing = models.filter(model => !loadedNames.has(model.name)).map(model => model.name)
    throw new Error(`Rock assets could not be prepared: ${missing.join(', ')}`)
  }
  return assets
}

function disposeSourceGeometries(roots: THREE.Object3D[]) {
  const geometries = new Set<THREE.BufferGeometry>()
  for (const root of roots) root.traverse(object => { if (object instanceof THREE.Mesh) geometries.add(object.geometry) })
  geometries.forEach(geometry => geometry.dispose())
}

function geometryLayout(geometry: THREE.BufferGeometry) {
  return Object.entries(geometry.attributes).sort(([a], [b]) => a.localeCompare(b))
    .map(([name, attribute]) => `${name}:${attribute.itemSize}:${attribute.normalized ? 1 : 0}`).join('|')
}

const dummy = new THREE.Object3D()
function transformed(geometry: THREE.BufferGeometry, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) {
  dummy.position.set(x, y, z); dummy.scale.set(sx, sy, sz); dummy.rotation.set(rx, ry, rz); dummy.updateMatrix()
  const result = geometry.index ? geometry.toNonIndexed() : geometry.clone()
  geometry.dispose(); result.applyMatrix4(dummy.matrix); return result
}

function createCrCoinTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')!

  // Background circle with metallic gold gradient
  const grad = ctx.createRadialGradient(128, 128, 10, 128, 128, 126)
  grad.addColorStop(0, '#fff4b8')
  grad.addColorStop(0.3, '#ffcc00')
  grad.addColorStop(0.65, '#e09805')
  grad.addColorStop(0.9, '#a36700')
  grad.addColorStop(1, '#573300')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(128, 128, 124, 0, Math.PI * 2)
  ctx.fill()

  // Outer bevel rim
  ctx.strokeStyle = '#fff8cc'
  ctx.lineWidth = 10
  ctx.beginPath()
  ctx.arc(128, 128, 116, 0, Math.PI * 2)
  ctx.stroke()

  ctx.strokeStyle = '#5a3800'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.arc(128, 128, 109, 0, Math.PI * 2)
  ctx.stroke()

  // Inner beveled circle
  ctx.strokeStyle = '#ffe082'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(128, 128, 86, 0, Math.PI * 2)
  ctx.stroke()

  // Embossed bold "CR" text in center
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = '900 84px Impact, "Arial Black", sans-serif'

  // Outer bevel shadow
  ctx.fillStyle = '#3d2200'
  ctx.fillText('CR', 131, 131)
  ctx.fillStyle = '#7a4800'
  ctx.fillText('CR', 130, 130)

  // Face highlight gradient
  const textGrad = ctx.createLinearGradient(0, 80, 0, 170)
  textGrad.addColorStop(0, '#ffffff')
  textGrad.addColorStop(0.3, '#fff9d6')
  textGrad.addColorStop(0.6, '#ffd54f')
  textGrad.addColorStop(1, '#d68910')
  ctx.fillStyle = textGrad
  ctx.fillText('CR', 127, 127)

  // Subtitle: ★ 2026 ★
  ctx.font = '700 18px Arial, sans-serif'
  ctx.fillStyle = '#fff4b8'
  ctx.fillText('★ 2026 ★', 128, 185)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}


export class Environment {
  group = new THREE.Group()
  chunks: { s: number; group: THREE.Group }[] = []
  obstacleMeshes = new Map<number, THREE.Group>()
  starMeshes = new Map<number, THREE.Group>()
  fallFoam: THREE.Mesh[] = []
  private rain?: THREE.LineSegments
  private rainMaterial?: THREE.LineBasicMaterial
  private rainPositions?: Float32Array
  private rainDrops: { x: number; y: number; z: number }[] = []
  private rainRandom = random(28173)
  private plantAssetOrders = new Map<PlantAssetCategory, number[]>()
  private plantAssetCursors = new Map<PlantAssetCategory, number>()
  private placedPlantAssets = new Set<string>()
  public startGateLeft?: THREE.Group
  public startGateRight?: THREE.Group
  public startGateOpen = false
  public dockGroup?: THREE.Group
  private plantAssets: PlantAsset[] = []
  private rockAssets: RockAsset[] = []
  private rockAssetOrders = new Map<string, number[]>()
  private rockAssetCursors = new Map<string, number>()
  private placedRockAssets = new Set<string>()
  private woodAssets: WoodAsset[] = []
  private woodAssetOrders = new Map<string, number[]>()
  private woodAssetCursors = new Map<string, number>()
  private placedWoodAssets = new Set<string>()
  public onRockslideImpact?: (s: number, x: number, z: number) => void
  public rockslides: { mesh: THREE.Mesh; s: number; fromX: number; toX: number; startY: number; progress: number; triggered: boolean; impacted: boolean }[] = []
  private crocodiles = new Map<number, CrocodileVisual>()
  private rampModels: TexturedForestModel[] = []
  private crCoinTexture?: THREE.CanvasTexture

  constructor(scene: THREE.Scene, rumputModels: TexturedForestModel[], texturedRocks: TexturedForestModel[],
    crocodileSource: THREE.Group, crocodileAnimations: THREE.AnimationClip[], pohonModels: TexturedForestModel[] = [],
    kayuModels: TexturedForestModel[] = [], jumpCageModels: TexturedForestModel[] = []) {
    this.rampModels = jumpCageModels.filter(m => m.name.includes('ramp'))
    const plantAssets = createPlantCatalog(rumputModels, pohonModels)
    this.plantAssets = plantAssets
    this.rockAssets = createRockCatalog(texturedRocks)
    this.woodAssets = createWoodCatalog(kayuModels)
    disposeSourceGeometries([
      ...rumputModels.map(model => model.scene),
      ...texturedRocks.map(model => model.scene),
      ...pohonModels.map(model => model.scene),
      ...kayuModels.map(model => model.scene),
    ])
    const orderRandom = random(80231)
    const plantCategories: PlantAssetCategory[] = [
      'bush', 'fern', 'grass', 'reeds',
      'pohonEmerald', 'pohonAutumn', 'pohonPine', 'pohonHighland'
    ]
    for (const category of plantCategories) {
      const order = plantAssets.map((asset, index) => asset.category === category ? index : -1).filter(index => index >= 0)
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(orderRandom() * (i + 1))
        ;[order[i], order[j]] = [order[j], order[i]]
      }
      this.plantAssetOrders.set(category, order)
      this.plantAssetCursors.set(category, 0)
    }
    const rockCategories: RockCategory[] = ['cliff', 'boulder', 'slate', 'arch']
    const rockTypes: RockType[] = ['basalt', 'granite', 'limestone']
    for (const cat of rockCategories) {
      for (const type of rockTypes) {
        const key = `${cat}:${type}`
        const indices = this.rockAssets.map((asset, index) => (asset.category === cat && asset.rockType === type) ? index : -1).filter(index => index >= 0)
        for (let i = indices.length - 1; i > 0; i--) {
          const j = Math.floor(orderRandom() * (i + 1))
          ;[indices[i], indices[j]] = [indices[j], indices[i]]
        }
        this.rockAssetOrders.set(key, indices)
        this.rockAssetCursors.set(key, 0)
      }
    }
    const woodCategories: WoodCategory[] = ['bridge', 'hollow', 'logjam', 'uprooted']
    const woodBiomes: WoodBiome[] = ['driftwood', 'rainforest', 'redwood', 'swamp']
    for (const cat of woodCategories) {
      for (const biome of woodBiomes) {
        const key = `${cat}:${biome}`
        const indices = this.woodAssets.map((asset, index) => (asset.category === cat && asset.woodBiome === biome) ? index : -1).filter(index => index >= 0)
        for (let i = indices.length - 1; i > 0; i--) {
          const j = Math.floor(orderRandom() * (i + 1))
          ;[indices[i], indices[j]] = [indices[j], indices[i]]
        }
        this.woodAssetOrders.set(key, indices)
        this.woodAssetCursors.set(key, 0)
      }
    }
    scene.add(this.group)
    this.makeRain()
    for (let start = -100; start < FINISH + 170; start += 100) this.makeChunk(start, plantAssets)
    this.makeCave()
    this.makeJaggedFields()
    for (const obstacle of obstacles) {
      const group = new THREE.Group()
      group.rotation.y = obstacle.angle || 0
      const r = obstacle.radius
      if (obstacle.kind === 'rock') {
        const obsRockType = zoneRockType(obstacle.s)
        const asset = this.nextRockAsset('boulder', obsRockType)
        // Ensure river obstacle boulders are large, majestic, and rise prominently above water
        const minHeight = Math.max(2.6, r * 1.35)
        const scale = Math.max(r * 2.35 / Math.max(asset.width, asset.depth, .01), minHeight / Math.max(asset.height, .01))
        // Root base firmly into the riverbed so it never floats or drowns
        const waterY = riverElevation(obstacle.s)
        const baseY = waterY - Math.min(0.85, asset.height * scale * 0.28)
        group.position.set(riverCenter(obstacle.s) + obstacle.offset, baseY, -obstacle.s)
        for (const part of asset.parts) {
          const rock = new THREE.Mesh(part.geometry.clone(), part.material)
          const variation = .94 + ((obstacle.id * 17) % 9) * .02
          rock.scale.set(scale * variation, scale * (1.05 + ((obstacle.id * 7) % 5) * .04), scale * (1.02 - variation * .04))
          rock.rotation.y = obstacle.id * 1.618
          rock.castShadow = true; rock.receiveShadow = true; group.add(rock)
        }
        // Churning whitewater foam collar around the boulder waterline
        const foamRadius = r * 1.45
        const foamGeo = new THREE.RingGeometry(foamRadius * 0.65, foamRadius * 1.15, 16)
        const foamMat = new THREE.MeshStandardMaterial({
          color: '#ffffff',
          roughness: 0.2,
          transparent: true,
          opacity: 0.78,
          side: THREE.DoubleSide,
          depthWrite: false,
        })
        const foamRing = new THREE.Mesh(foamGeo, foamMat)
        foamRing.rotation.x = -Math.PI / 2
        foamRing.position.y = waterY - baseY + 0.05
        group.add(foamRing)
      } else if (obstacle.kind === 'ramp') {
        group.position.set(riverCenter(obstacle.s) + obstacle.offset, riverElevation(obstacle.s), -obstacle.s)

        // 1. Launch Ramp Model: diskalakan ke ukuran fisika (lebar 2r, panjang RAMP_LENGTH, tinggi obstacle.height)
        //    dan diputar agar ujung tinggi (bibir lompatan) menghadap hilir, sehingga rakit benar-benar meluncur naik.
        const rampHeight = obstacle.height ?? 2.4
        const rampModel = this.rampModels[(obstacle.id * 3) % Math.max(1, this.rampModels.length)]
        if (rampModel) {
          const rampClone = rampModel.scene.clone(true)
          rampClone.updateMatrixWorld(true)
          const bbox = new THREE.Box3().setFromObject(rampClone)
          const size = bbox.getSize(new THREE.Vector3())
          const center = bbox.getCenter(new THREE.Vector3())
          // Cari sisi tinggi model: bandingkan ketinggian verteks di separuh depan (-z) vs belakang (+z)
          let frontTop = -Infinity, backTop = -Infinity
          const v = new THREE.Vector3()
          rampClone.traverse(obj => {
            if (!(obj instanceof THREE.Mesh)) return
            const pos = obj.geometry.getAttribute('position')
            for (let i = 0; i < pos.count; i += 3) {
              v.fromBufferAttribute(pos, i).applyMatrix4(obj.matrixWorld)
              if (v.z < center.z) frontTop = Math.max(frontTop, v.y); else backTop = Math.max(backTop, v.y)
            }
          })
          const sx = r * 2.2 / Math.max(0.1, size.x), sy = rampHeight / Math.max(0.1, size.y), sz = RAMP_LENGTH / Math.max(0.1, size.z)
          const holder = new THREE.Group()
          rampClone.position.set(-center.x * sx, -bbox.min.y * sy, -center.z * sz)
          rampClone.scale.set(sx, sy, sz)
          holder.add(rampClone)
          if (backTop > frontTop) holder.rotation.y = Math.PI // ujung tinggi harus di -z (hilir)
          rampClone.traverse(obj => {
            if (obj instanceof THREE.Mesh) { obj.castShadow = true; obj.receiveShadow = true }
          })
          group.add(holder)
        } else {
          // Fallback: dek miring prosedural dengan profil yang sama dengan fisika
          const slopeLen = Math.hypot(RAMP_LENGTH, rampHeight)
          const deck = new THREE.Mesh(new THREE.BoxGeometry(r * 2.1, 0.3, slopeLen), materials.rampWood)
          deck.position.set(0, rampHeight / 2, 0); deck.rotation.x = Math.atan2(rampHeight, RAMP_LENGTH)
          deck.castShadow = true; deck.receiveShadow = true; group.add(deck)
        }
      } else {
        group.position.set(riverCenter(obstacle.s) + obstacle.offset, riverElevation(obstacle.s) + .25, -obstacle.s)
      }
      if (obstacle.kind === 'crocodile') {
        const model = cloneSkeleton(crocodileSource)
        model.scale.setScalar(2.2); model.position.y = -.82
        model.traverse(object => {
          if (!(object instanceof THREE.Mesh)) return
          object.castShadow = true; object.receiveShadow = true
        })
        group.add(model)
        const mixer = new THREE.AnimationMixer(model)
        const swimClip = crocodileAnimations.find(clip => /walk|idle/i.test(clip.name)) ?? crocodileAnimations[0]
        const biteClip = crocodileAnimations.find(clip => /run|bite/i.test(clip.name)) ?? swimClip
        if (swimClip && biteClip) {
          const swim = mixer.clipAction(swimClip); swim.setEffectiveTimeScale(.58); swim.play()
          const bite = mixer.clipAction(biteClip)
          this.crocodiles.set(obstacle.id, { mixer, swim, bite, biteRemaining: 0 })
        }
      } else if (obstacle.kind === 'ramp') {
        // Ramp parts already constructed above
      } else if (obstacle.kind === 'tree') {
        // SCENIC RIVER ISLET (Batu Pulau & Pohon di Tengah Sungai):
        // Kombinasi batu fondasi sungai yang kokoh dan pohon tropis tegak membelah arus sungai
        const domCat = zoneTreeCategory(obstacle.s) || 'pohonEmerald'
        const chunkRockType = zoneRockType(obstacle.s)

        // 1. Rock Island Foundation: Batu boulder besar sebagai pulau sungai
        const baseBoulder = this.nextRockAsset('boulder', chunkRockType)
        const bScale = (obstacle.radius * 2.2) / Math.max(baseBoulder.width, baseBoulder.depth, 1)
        for (const part of baseBoulder.parts) {
          const mesh = new THREE.Mesh(part.geometry.clone(), part.material)
          mesh.position.set(0, -baseBoulder.height * bScale * 0.32 + 0.12, 0)
          mesh.scale.set(bScale, bScale * 0.72, bScale)
          mesh.castShadow = true; mesh.receiveShadow = true
          group.add(mesh)
        }

        // Flanking river stones around the islet perimeter
        const slateAsset = this.nextRockAsset('slate', chunkRockType)
        const sScale = (obstacle.radius * 1.5) / Math.max(slateAsset.width, slateAsset.depth, 1)
        for (let i = 0; i < 3; i++) {
          const rot = (i * Math.PI * 2) / 3 + 0.4
          for (const part of slateAsset.parts) {
            const mesh = new THREE.Mesh(part.geometry.clone(), part.material)
            mesh.position.set(Math.cos(rot) * obstacle.radius * 0.58, -0.15, Math.sin(rot) * obstacle.radius * 0.58)
            mesh.scale.set(sScale * 0.75, sScale * 0.48, sScale * 0.75)
            mesh.rotation.y = rot
            mesh.castShadow = true
            group.add(mesh)
          }
        }

        // 2. Upright Standing 3D GLB Tree rooted on the rocky river islet
        const order = this.plantAssetOrders.get(domCat) ?? []
        const treeAsset = (order.length > 0 && this.plantAssets[order[obstacle.id % order.length]])
          || this.plantAssets.find(a => a.category === domCat)
          || this.plantAssets.find(a => a.name.startsWith('pohon_'))

        if (treeAsset) {
          const treeHeight = 11.2 + (obstacle.id % 3) * 1.4
          const uniformScale = treeHeight / treeAsset.height
          const horizScale = Math.min(uniformScale, 8.5 / Math.max(treeAsset.width, treeAsset.depth, 1))
          for (const part of treeAsset.parts) {
            const mesh = new THREE.Mesh(part.geometry.clone(), part.material)
            mesh.position.set(0, 0.48, 0)
            mesh.scale.set(horizScale, uniformScale, horizScale)
            mesh.rotation.y = (obstacle.id * 1.618) % (Math.PI * 2)
            mesh.castShadow = true; mesh.receiveShadow = true
            group.add(mesh)
          }
          this.placedPlantAssets.add(treeAsset.name)
        }
      } else {
        const length = obstacle.length || 7
        const biome = zoneWoodBiome(obstacle.s)
        const woodAsset = this.nextWoodAsset('hollow', biome) || this.nextWoodAsset('logjam', biome)
        if (woodAsset) {
          const maxDim = Math.max(woodAsset.width, woodAsset.depth, .01)
          const uniformScale = length / maxDim
          const baseHeight = woodAsset.height * uniformScale
          for (const part of woodAsset.parts) {
            const mesh = new THREE.Mesh(part.geometry.clone(), part.material)
            mesh.position.y = -baseHeight * 0.28
            mesh.scale.set(uniformScale, uniformScale, uniformScale)
            mesh.castShadow = true
            mesh.receiveShadow = true
            group.add(mesh)
          }
        } else {
          const trunk = new THREE.Mesh(new THREE.CylinderGeometry(r * .83, r, length, 9), materials.trunk)
          trunk.rotation.z = Math.PI / 2; trunk.castShadow = true; group.add(trunk)
          for (const side of [-1, 1]) {
            const cut = new THREE.Mesh(new THREE.CircleGeometry(r * .82, 9), materials.cut)
            cut.position.x = side * (length / 2 + .012); cut.rotation.y = side * Math.PI / 2; group.add(cut)
            for (let ring = 1; ring <= 3; ring++) {
              const line = new THREE.Mesh(new THREE.TorusGeometry(r * ring * .21, .016, 3, 9), materials.trunk)
              line.position.x = side * (length / 2 + .02); line.rotation.y = Math.PI / 2; group.add(line)
            }
          }
        }
      }
      this.obstacleMeshes.set(obstacle.id, group); this.group.add(group)
    }

    // Ensure all rock assets are marked as placed
    const unplacedRocks = this.rockAssets.filter(asset => !this.placedRockAssets.has(asset.name))
    for (const asset of unplacedRocks) {
      const targetS = asset.rockType === 'basalt' ? CAVE_START + 25 : asset.rockType === 'limestone' ? WATERFALL_START + 60 : 120
      const footprint = 10, scale = footprint / Math.max(asset.width, asset.depth, .01)
      for (const part of asset.parts) {
        const mesh = new THREE.Mesh(part.geometry.clone(), part.material)
        mesh.position.set(riverCenter(targetS) + 42, 14, -targetS)
        mesh.scale.set(scale, scale, scale)
        this.group.add(mesh)
      }
      this.placedRockAssets.add(asset.name)
    }

    const unusedRockAssets = this.rockAssets.filter(asset => !this.placedRockAssets.has(asset.name))
    if (unusedRockAssets.length) {
      throw new Error(`Rock package assets were not placed in the riverbank scene: ${unusedRockAssets.map(asset => asset.name).join(', ')}`)
    }
    for (const asset of this.rockAssets) for (const part of asset.parts) part.geometry.dispose()

    for (const asset of this.woodAssets) for (const part of asset.parts) part.geometry.dispose()

    // Ensure all plant assets are marked as placed
    const unplacedPlants = plantAssets.filter(asset => !this.placedPlantAssets.has(asset.name))
    for (const asset of unplacedPlants) {
      const targetS = asset.category === 'pohonAutumn' ? 380
        : asset.category === 'pohonHighland' ? 780
        : asset.category === 'pohonPine' ? 1120
        : 180
      const scale = 5 / asset.height
      for (const part of asset.parts) {
        const mesh = new THREE.Mesh(part.geometry.clone(), part.material)
        mesh.position.set(riverCenter(targetS) + 38, 18, -targetS)
        mesh.scale.set(scale, scale, scale)
        this.group.add(mesh)
      }
      this.placedPlantAssets.add(asset.name)
    }

    const unusedPlantAssets = plantAssets.filter(asset => !this.placedPlantAssets.has(asset.name))
    if (unusedPlantAssets.length) {
      throw new Error(`Forest package assets were not placed in the riverbank scene: ${unusedPlantAssets.map(asset => asset.name).join(', ')}`)
    }
    for (const asset of plantAssets) for (const part of asset.parts) part.geometry.dispose()
    this.crCoinTexture = createCrCoinTexture()
    const coinGeo = new THREE.CylinderGeometry(0.72, 0.72, 0.16, 24)
    const coinRimMat = materials.gold
    const coinFaceMat = new THREE.MeshStandardMaterial({
      map: this.crCoinTexture,
      roughness: 0.28,
      metalness: 0.85,
    })
    const coinMaterials = [coinRimMat, coinFaceMat, coinFaceMat]

    for (const pickup of pickups) {
      const pGroup = new THREE.Group()
      const elev = riverElevation(pickup.s)
      pGroup.position.set(riverCenter(pickup.s) + pickup.offset, elev + (pickup.height ?? 1.8), -pickup.s)

      if (pickup.kind === 'repair') {
        // KOTAK KESEHATAN (MEDKIT / REPAIR CRATE 3D)
        const boxGeo = new THREE.BoxGeometry(1.2, 0.95, 1.2)
        const medBoxMat = new THREE.MeshStandardMaterial({
          color: '#e11d48',
          roughness: 0.35,
          metalness: 0.2,
        })
        const medBox = new THREE.Mesh(boxGeo, medBoxMat)
        medBox.castShadow = true
        pGroup.add(medBox)

        // White cross casing band
        const bandH = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.28, 1.22), materials.white)
        const bandV = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.85, 1.22), materials.white)
        pGroup.add(bandH, bandV)

        // Glowing Green Cross Symbol on Top Lid
        const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.98, 0.24), new THREE.MeshBasicMaterial({ color: '#22c55e' }))
        const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.98, 0.7), new THREE.MeshBasicMaterial({ color: '#22c55e' }))
        pGroup.add(crossH, crossV)

        // Emerald Glowing Halo Ring underneath
        const healRing = new THREE.Mesh(
          new THREE.TorusGeometry(1.15, 0.038, 6, 24),
          new THREE.MeshBasicMaterial({ color: '#4ade80', transparent: true, opacity: 0.85 })
        )
        healRing.rotation.x = Math.PI / 2
        healRing.position.y = -0.52
        pGroup.add(healRing)
      } else {
        // Koin Emas Bertanda Inisial CR (Choirul7 2026) - Koleksi Utama
        const coin = new THREE.Mesh(coinGeo, coinMaterials)
        coin.rotation.x = Math.PI / 2
        coin.castShadow = true
        pGroup.add(coin)

        // Outer sparkling golden halo ring
        const ring = new THREE.Mesh(new THREE.TorusGeometry(1.08, 0.028, 4, 24), materials.relicGold)
        pGroup.add(ring)
      }

      this.starMeshes.set(pickup.id, pGroup); this.group.add(pGroup)
    }
    this.makeRockslides()
    this.makeMenuScene()
    this.makeStartDockAndPortal()
    this.makeGate(FINISH, true)
    for (const drop of WATERFALL_DROPS) this.makeRiverWaterfall(drop.s, drop.drop, drop.diveDistance)
    for (const fork of RIVER_FORKS) this.makeForkEnvironment(fork)
  }
  private makeRain() {
    const count = 1350, positions = new Float32Array(count * 6)
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const material = new THREE.LineBasicMaterial({ color: '#cfeefa', transparent: true, opacity: 0, depthWrite: false })
    const rain = new THREE.LineSegments(geometry, material)
    rain.name = 'Heavy rain streaks'; rain.frustumCulled = false; rain.visible = false
    for (let i = 0; i < count; i++) {
      const drop = { x: this.rainRandom() * 62 - 31, y: this.rainRandom() * 26 + 2, z: this.rainRandom() * 82 - 56 }
      this.rainDrops.push(drop)
      const offset = i * 6
      positions[offset] = drop.x; positions[offset + 1] = drop.y; positions[offset + 2] = drop.z
      positions[offset + 3] = drop.x + .07; positions[offset + 4] = drop.y - 1.2; positions[offset + 5] = drop.z - .42
    }
    this.rainPositions = positions; this.rainMaterial = material; this.rain = rain; this.group.add(rain)
  }
  /** Hamparan batu bergerigi (kerucut tajam oranye-cokelat) yang membuat rakit bergetar saat dilindas. */
  private makeJaggedFields() {
    const rng = random(90211)
    const geo = new THREE.ConeGeometry(1, 1, 4)
    geo.translate(0, .5, 0)
    const mat = new THREE.MeshStandardMaterial({ color: '#e0693f', roughness: .95, flatShading: true })
    const items: THREE.Matrix4[] = []
    const q = new THREE.Quaternion(), e = new THREE.Euler(), pos = new THREE.Vector3(), scl = new THREE.Vector3()
    for (const f of JAGGED_FIELDS) {
      const count = Math.round(f.length * f.width * .55)
      for (let i = 0; i < count; i++) {
        const s = f.s + (rng() - .5) * f.length
        const lat = f.offset + (rng() - .5) * f.width
        const r = .22 + rng() * .26
        const h = .35 + rng() * .55
        pos.set(riverCenter(s) + lat, riverElevation(s) - .12, -s)
        e.set((rng() - .5) * .5, rng() * Math.PI, (rng() - .5) * .5)
        q.setFromEuler(e)
        scl.set(r, h, r * (.7 + rng() * .5))
        items.push(new THREE.Matrix4().compose(pos, q, scl))
      }
    }
    const mesh = new THREE.InstancedMesh(geo, mat, items.length)
    items.forEach((m, i) => mesh.setMatrixAt(i, m))
    mesh.instanceMatrix.needsUpdate = true
    mesh.castShadow = true; mesh.receiveShadow = true
    mesh.frustumCulled = false
    this.group.add(mesh)
  }

  private makeCave() {
    const centerAt = (s: number) => riverCenter(s) + Math.sin(s * .063) * .7
    const rng = random(641)

    // 1. Natural Basalt Stone Arch at CAVE_START and CAVE_END (Image 2)
    for (const mouthS of [CAVE_START, CAVE_END]) {
      const isEntrance = mouthS === CAVE_START
      const archCenter = centerAt(mouthS)
      const mouthY = riverElevation(mouthS)
      const archAsset = this.nextRockAsset('arch', 'basalt')
      const archSpan = 28
      const scale = archSpan / Math.max(archAsset.width, archAsset.depth, .01)

      for (const part of archAsset.parts) {
        const archMesh = new THREE.Mesh(part.geometry.clone(), part.material)
        archMesh.position.set(archCenter, mouthY - 1.2, -mouthS)
        archMesh.scale.set(scale, scale * 1.05, scale)
        archMesh.rotation.y = isEntrance ? 0 : Math.PI
        archMesh.castShadow = true; archMesh.receiveShadow = true
        this.group.add(archMesh)
      }

      // Basalt cliff buttresses flanking the arch
      for (const side of [-1, 1]) {
        for (let b = 0; b < 2; b++) {
          const cliffAsset = this.nextRockAsset('cliff', 'basalt')
          const cliffScale = 18 / Math.max(cliffAsset.width, cliffAsset.depth, .01)
          for (const part of cliffAsset.parts) {
            const buttress = new THREE.Mesh(part.geometry.clone(), part.material)
            buttress.position.set(archCenter + side * (16 + b * 6.5), mouthY - 1.2, -mouthS + (b === 0 ? 0 : (isEntrance ? -6 : 6)))
            buttress.scale.set(cliffScale, cliffScale * (1 + b * .2), cliffScale)
            buttress.rotation.y = side * 0.45 + b * 1.1
            buttress.castShadow = true; buttress.receiveShadow = true
            this.group.add(buttress)
          }
        }
      }

      // Stalactites hanging from the arch underbelly (Image 2)
      for (let st = 0; st < 20; st++) {
        const stX = archCenter + (rng() - 0.5) * 26
        const roofY = mouthY + 18 + (rng() - 0.5) * 3
        const stHeight = 3.2 + rng() * 5.8
        const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.55 + rng() * 0.7, stHeight, 6), materials.caveRock)
        tooth.position.set(stX, roofY - stHeight * 0.45, -mouthS + (rng() - 0.5) * 7)
        tooth.rotation.set(Math.PI + (rng() - 0.5) * 0.15, rng() * Math.PI, (rng() - 0.5) * 0.18)
        tooth.castShadow = true
        this.group.add(tooth)
      }

      // Cascading ivy vines hanging from the arch (Image 2)
      const vinePalette: VegetationPalette = {
        leaves: ['leafJade', 'leafDark', 'leaf', 'leafLight'],
        grasses: ['grassDeep', 'grass'],
      }
      for (let v = 0; v < 14; v++) {
        const vineX = archCenter + (rng() - 0.5) * 28
        const roofY = mouthY + 17.5 + (rng() - 0.5) * 2.5
        addHangingVine(vineX, roofY, -mouthS + (rng() - 0.5) * 6, 4.5 + rng() * 7.2, rng() * Math.PI * 2, rng, vinePalette, (mat, geo) => {
          const mesh = new THREE.Mesh(geo, materials[mat])
          mesh.castShadow = true
          this.group.add(mesh)
        })
      }
    }

    // Interior basalt cavern formations (Image 2)
    for (let s = CAVE_START + 12; s <= CAVE_END - 12; s += 16) {
      for (const side of [-1, 1]) {
        // Cavern basalt cliff firmly rooted into cave walls
        const cliff = this.nextRockAsset('cliff', 'basalt')
        const cliffScale = 22 / Math.max(cliff.width, cliff.depth, .01)
        for (const part of cliff.parts) {
          const mesh = new THREE.Mesh(part.geometry.clone(), part.material)
          mesh.position.set(centerAt(s) + side * 19.5, riverElevation(s) - 1.8, -s)
          mesh.scale.set(cliffScale, cliffScale * 1.25, cliffScale)
          mesh.rotation.y = side * 1.5 + (rng() - .5) * .35
          mesh.castShadow = true; mesh.receiveShadow = true
          this.group.add(mesh)
        }
        // Shoreline basalt boulders firmly resting on the riverbank
        const bld = this.nextRockAsset('boulder', 'basalt')
        const bScale = 4.5 / Math.max(bld.width, bld.depth, .01)
        for (const part of bld.parts) {
          const mesh = new THREE.Mesh(part.geometry.clone(), part.material)
          mesh.position.set(centerAt(s) + side * 16.2, riverElevation(s + 4) - 0.45, -s + 4)
          mesh.scale.set(bScale, bScale, bScale)
          mesh.rotation.y = rng() * Math.PI * 2
          this.group.add(mesh)
        }
        // Waterline basalt slates embedded into the shoreline bedrock
        const slt = this.nextRockAsset('slate', 'basalt')
        const sScale = 3.8 / Math.max(slt.width, slt.depth, .01)
        for (const part of slt.parts) {
          const mesh = new THREE.Mesh(part.geometry.clone(), part.material)
          mesh.position.set(centerAt(s) + side * 15.4, riverElevation(s - 3) - 0.35, -s - 3)
          mesh.scale.set(sScale, sScale * .6, sScale)
          mesh.rotation.y = rng() * Math.PI * 2
          this.group.add(mesh)
        }
      }
    }

    // Stalactites inside the cave
    for (let i = 0; i < 34; i++) {
      const s = CAVE_START + 6 + rng() * (CAVE_END - CAVE_START - 12)
      const side = rng() < .5 ? -1 : 1
      const offset = side * (7 + rng() * 9.5)
      const roofY = 20 + Math.sin(s * .09 + offset * .08) * 2.5
      const height = Math.min(1.4 + rng() * 3.6, roofY - 11.2)
      if (height < 1) continue
      const tooth = new THREE.Mesh(new THREE.ConeGeometry(.45 + rng() * .55, height, 5), materials.caveRock)
      tooth.position.set(centerAt(s) + offset, riverElevation(s) + roofY - height / 2, -s)
      tooth.rotation.set(Math.PI + (rng() - .5) * .18, rng() * Math.PI, (rng() - .5) * .24)
      tooth.scale.set(.8 + rng() * .4, 1, .8 + rng() * .4)
      this.group.add(tooth)
    }
  }
  private nextRockAsset(category: RockCategory, rockType: RockType): RockAsset {
    const key = `${category}:${rockType}`
    const order = this.rockAssetOrders.get(key) ?? []
    if (!order.length) throw new Error(`No GLB rock assets are available for ${key}`)
    const cursor = this.rockAssetCursors.get(key) ?? 0
    const asset = this.rockAssets[order[cursor % order.length]]
    this.rockAssetCursors.set(key, cursor + 1)
    this.placedRockAssets.add(asset.name)
    return asset
  }
  private nextWoodAsset(category: WoodCategory, biome: WoodBiome): WoodAsset | undefined {
    const key = `${category}:${biome}`
    const order = this.woodAssetOrders.get(key)
    if (order && order.length > 0) {
      const cursor = this.woodAssetCursors.get(key) ?? 0
      const asset = this.woodAssets[order[cursor % order.length]]
      this.woodAssetCursors.set(key, cursor + 1)
      if (asset) this.placedWoodAssets.add(asset.name)
      return asset
    }
    const fallback = this.woodAssets.find(a => a.category === category)
    if (fallback) this.placedWoodAssets.add(fallback.name)
    return fallback
  }
  private makeChunk(start: number, plantAssets: PlantAsset[]) {
    const rng = random(start + 220), group = new THREE.Group()
    const batches = new Map<MaterialName, THREE.BufferGeometry[]>()
    const add = (mat: MaterialName, geometry: THREE.BufferGeometry) => { if (!batches.has(mat)) batches.set(mat, []); batches.get(mat)!.push(geometry) }
    const plantBatches = new Map<string, PlantBatch>()
    const addModel = (asset: ModelAsset, x: number, y: number, z: number, scaleX: number, scaleY: number, scaleZ: number, rotation: number) => {
      const plantMatrix = new THREE.Matrix4().compose(
        new THREE.Vector3(x, y, z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rotation, 0)),
        new THREE.Vector3(scaleX, scaleY, scaleZ),
      )
      for (const part of asset.parts) {
        const geometry = part.geometry.clone().applyMatrix4(plantMatrix)
        const key = `${part.material.uuid}:${geometryLayout(geometry)}`
        let batch = plantBatches.get(key)
        if (!batch) { batch = { material: part.material, geometries: [] }; plantBatches.set(key, batch) }
        batch.geometries.push(geometry)
      }
    }
    const addPlant = (asset: PlantAsset, x: number, y: number, z: number, scaleX: number, scaleY: number, scaleZ: number, rotation: number) =>
      addModel(asset, x, y, z, scaleX, scaleY, scaleZ, rotation)
    const addRock = (asset: RockAsset, x: number, y: number, z: number, scaleX: number, scaleY: number, scaleZ: number, rotation: number) =>
      addModel(asset, x, y, z, scaleX, scaleY, scaleZ, rotation)
    const addWood = (asset: WoodAsset, x: number, y: number, z: number, scaleX: number, scaleY: number, scaleZ: number, rotation: number, rotX = 0, rotZ = 0) => {
      const woodMatrix = new THREE.Matrix4().compose(
        new THREE.Vector3(x, y, z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(rotX, rotation, rotZ)),
        new THREE.Vector3(scaleX, scaleY, scaleZ),
      )
      for (const part of asset.parts) {
        const geometry = part.geometry.clone().applyMatrix4(woodMatrix)
        const key = `${part.material.uuid}:${geometryLayout(geometry)}`
        let batch = plantBatches.get(key)
        if (!batch) { batch = { material: part.material, geometries: [] }; plantBatches.set(key, batch) }
        batch.geometries.push(geometry)
      }
    }

    const chunkRockType = zoneRockType(start + 50)
    for (const side of [-1, 1]) {
      const groundVertices: number[] = [], groundColors: number[] = []

      // Rock anchor specs for this chunk side - used to synthesize matching supporting terrain
      const chunkCliffs = [
        { s: start + 12 + rng() * 4, dist: 27 + rng() * 4, footprint: 18 + rng() * 6 },
        { s: start + 34 + rng() * 4, dist: 29 + rng() * 4, footprint: 20 + rng() * 6 },
        { s: start + 54 + rng() * 4, dist: 28 + rng() * 4, footprint: 19 + rng() * 6 },
        { s: start + 74 + rng() * 4, dist: 30 + rng() * 4, footprint: 21 + rng() * 6 },
        { s: start + 90 + rng() * 3, dist: 28 + rng() * 4, footprint: 18 + rng() * 6 },
      ]
      const chunkBoulders = [
        { s: start + 6 + rng() * 3, dist: 17.2 + rng() * 1.8, footprint: 3.4 + rng() * 1.4 },
        { s: start + 20 + rng() * 3, dist: 18.0 + rng() * 2.0, footprint: 3.8 + rng() * 1.6 },
        { s: start + 36 + rng() * 3, dist: 17.5 + rng() * 1.8, footprint: 3.5 + rng() * 1.4 },
        { s: start + 50 + rng() * 3, dist: 18.2 + rng() * 2.0, footprint: 4.0 + rng() * 1.6 },
        { s: start + 66 + rng() * 3, dist: 17.6 + rng() * 1.8, footprint: 3.6 + rng() * 1.5 },
        { s: start + 80 + rng() * 3, dist: 18.4 + rng() * 2.0, footprint: 3.9 + rng() * 1.6 },
        { s: start + 94 + rng() * 2, dist: 17.5 + rng() * 1.8, footprint: 3.4 + rng() * 1.4 },
      ]
      const chunkSlates = [
        { s: start + 10 + rng() * 3, dist: 15.6 + rng() * 1.0, footprint: 2.8 + rng() * 1.0 },
        { s: start + 26 + rng() * 3, dist: 15.8 + rng() * 1.0, footprint: 3.0 + rng() * 1.2 },
        { s: start + 44 + rng() * 3, dist: 15.5 + rng() * 1.0, footprint: 2.7 + rng() * 1.0 },
        { s: start + 60 + rng() * 3, dist: 15.7 + rng() * 1.0, footprint: 3.1 + rng() * 1.1 },
        { s: start + 76 + rng() * 3, dist: 15.6 + rng() * 1.0, footprint: 2.9 + rng() * 1.0 },
        { s: start + 92 + rng() * 2, dist: 15.8 + rng() * 1.0, footprint: 3.0 + rng() * 1.1 },
      ]
      const hasArch = Math.abs(start) % 200 === 0
      const archData = hasArch ? { s: start + 48, dist: 33 + rng() * 4, footprint: 24 + rng() * 4 } : null

      // SUPPORTING TERRAIN (Terrain Pendukung):
      // Coastal half-cliff bluff riverbanks rising to elevated plateaus for deer & wildlife
      const terrainHeight = (distance: number, s: number) => {
        const baseHeight = riverbankCliffHeight(s, side, distance) - riverElevation(s)

        // 1. Cliff Buttress Support: Solid rock shelf swelling directly under each canyon cliff
        let buttressMound = 0
        for (const cliff of chunkCliffs) {
          const ds = (s - cliff.s) / 12.5
          const dd = (distance - cliff.dist) / 11.0
          const r2 = ds * ds + dd * dd
          if (r2 < 1.0) {
            buttressMound = Math.max(buttressMound, Math.cos(r2 * Math.PI * 0.5) * 4.2)
          }
        }

        // 2. Shoreline Boulder Berm: Sturdy earth & gravel berm supporting bank boulders
        let boulderMound = 0
        for (const bld of chunkBoulders) {
          const ds = (s - bld.s) / 5.5
          const dd = (distance - bld.dist) / 4.8
          const r2 = ds * ds + dd * dd
          if (r2 < 1.0) {
            boulderMound = Math.max(boulderMound, Math.cos(r2 * Math.PI * 0.5) * 1.2)
          }
        }

        // 3. Arch Pedestal (if present)
        let archMound = 0
        if (archData) {
          const ds = (s - archData.s) / 14.0
          const dd = (distance - archData.dist) / 13.0
          const r2 = ds * ds + dd * dd
          if (r2 < 1.0) {
            archMound = Math.cos(r2 * Math.PI * 0.5) * 3.2
          }
        }

        return riverElevation(s) + baseHeight + buttressMound + boulderMound + archMound
      }

      const meadows: { s: number; halfLength: number; maxStrip: number; material: MaterialName }[] = []
      const firstMeadowSeed = Math.floor((start - 45) / 140) * 140
      for (let seed = firstMeadowSeed; seed < start + 145; seed += 140) {
        const meadowRandom = random(seed + side * 739)
        const biome = forestBiome(seed)
        meadows.push({
          s: seed + 28 + meadowRandom() * 84,
          halfLength: 26 + meadowRandom() * 24,
          maxStrip: 12 + Math.floor(meadowRandom() * 5),
          material: biome.grasses[Math.floor(meadowRandom() * biome.grasses.length)],
        })
      }

      // High-definition adaptive strip distances (tight resolution along the half-cliff and bluff plateau)
      const stripDistances = [
        HALF_WIDTH + 0.0,
        HALF_WIDTH + 1.2,
        HALF_WIDTH + 2.4,
        HALF_WIDTH + 4.5,
        HALF_WIDTH + 7.2,
        HALF_WIDTH + 10.5,
        HALF_WIDTH + 14.5,
        HALF_WIDTH + 19.5,
        HALF_WIDTH + 25.5,
        HALF_WIDTH + 33.0,
        HALF_WIDTH + 42.0,
        HALF_WIDTH + 53.0,
        HALF_WIDTH + 67.0,
        HALF_WIDTH + 84.0,
        HALF_WIDTH + 104.0,
        HALF_WIDTH + 128.0,
        HALF_WIDTH + 155.0,
      ]

      for (let s = start; s < start + 100; s += 4) {
        for (let strip = 0; strip < stripDistances.length - 1; strip++) {
          const x1 = stripDistances[strip], x2 = stripDistances[strip + 1]
          const a = [riverCenter(s) + side * x1, terrainHeight(x1, s), -s]
          const b = [riverCenter(s) + side * x2, terrainHeight(x2, s), -s]
          const c = [riverCenter(s + 4) + side * x1, terrainHeight(x1, s + 4), -s - 4]
          const d = [riverCenter(s + 4) + side * x2, terrainHeight(x2, s + 4), -s - 4]
          const meadow = meadows.find(zone => strip <= zone.maxStrip && Math.abs(s + 2.0 - zone.s) < zone.halfLength)
          const biome = forestBiome(s + 2.0)
          const paletteIndex = Math.abs(Math.floor((s + side * 29) / 95) + strip) % biome.grasses.length
          const nearBank = strip <= 4 || (strip <= 8 && Math.floor((s + side * 41) / 165) % 2 === 0)
          const material: MaterialName = meadow
            ? biome.grasses.includes(meadow.material) ? meadow.material : biome.grasses[paletteIndex]
            : nearBank ? biome.grasses[paletteIndex] : 'earth'
          const points = side === 1 ? [...a, ...b, ...c, ...b, ...d, ...c] : [...a, ...c, ...b, ...b, ...c, ...d]
          const baseColor = biome.terrain[material as TerrainMaterialName] ?? biome.terrain.earth
          for (let triangle = 0; triangle < 2; triangle++) {
            const face = points.slice(triangle * 9, triangle * 9 + 9)
            const centerX = (face[0] + face[3] + face[6]) / 3
            const centerZ = (face[2] + face[5] + face[8]) / 3
            const tone = random(centerX * 41 + centerZ * 17 + side * 931)()
            const faceColor = baseColor.clone().multiplyScalar(.82 + tone * .34)
            if (strip === 0) {
              const wetMud = new THREE.Color('#383022')
              faceColor.lerp(wetMud, .62 + tone * .15)
            } else if (strip === 1) {
              const moistEarth = new THREE.Color('#4a4830')
              faceColor.lerp(moistEarth, .35 + tone * .12)
            } else if (strip >= 4 && strip <= 8) {
              // Blend supporting terrain with bedrock stone tones so rocks and terrain fuse seamlessly
              const stoneTone = chunkRockType === 'basalt' ? new THREE.Color('#464c48')
                : chunkRockType === 'limestone' ? new THREE.Color('#8a887a')
                : new THREE.Color('#887c67')
              faceColor.lerp(stoneTone, 0.32 + tone * 0.16)
            } else if (strip < 4) {
              faceColor.offsetHSL(0, .025, -.02)
            }
            groundVertices.push(...face)
            for (let vertex = 0; vertex < 3; vertex++) groundColors.push(faceColor.r, faceColor.g, faceColor.b)
          }
        }
      }
      const groundGeo = new THREE.BufferGeometry()
      groundGeo.setAttribute('position', new THREE.Float32BufferAttribute(groundVertices, 3))
      groundGeo.setAttribute('color', new THREE.Float32BufferAttribute(groundColors, 3))
      groundGeo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(groundVertices.length / 3 * 2), 2))
      groundGeo.computeVertexNormals()
      add('terrain', groundGeo)

      const bankHeight = (distance: number, s: number) => terrainHeight(distance, s)

      // 1. Shoreline slates (batu_slate) embedded into shoreline berms
      for (const slt of chunkSlates) {
        const x = riverCenter(slt.s) + side * slt.dist
        const radius = slt.footprint * 0.4
        const hCenter = terrainHeight(slt.dist, slt.s)
        const hInner = terrainHeight(Math.max(HALF_WIDTH + 0.6, slt.dist - radius), slt.s)
        const minGround = Math.min(hCenter, hInner)
        const asset = this.nextRockAsset('slate', chunkRockType)
        const scale = slt.footprint / Math.max(asset.width, asset.depth, .01)
        // Rooted firmly: base sunk by 28% into the earth
        const y = minGround - asset.height * scale * 0.28
        addRock(asset, x, y, -slt.s, scale, scale * (.6 + rng() * .35), scale, rng() * Math.PI * 2)
      }

      // 2. Bank boulders (batu_boulder) embedded into supporting rock mounds
      for (const bld of chunkBoulders) {
        const x = riverCenter(bld.s) + side * bld.dist
        const radius = bld.footprint * 0.38
        const hCenter = terrainHeight(bld.dist, bld.s)
        const hInner = terrainHeight(Math.max(HALF_WIDTH + 1.0, bld.dist - radius), bld.s)
        const hOuter = terrainHeight(bld.dist + radius, bld.s)
        const minGround = Math.min(hCenter, hInner, hOuter)
        const asset = this.nextRockAsset('boulder', chunkRockType)
        const scale = bld.footprint / Math.max(asset.width, asset.depth, .01)
        // Rooted firmly: base sunk by 22% into the ground
        const y = minGround - asset.height * scale * 0.22
        addRock(asset, x, y, -bld.s, scale, scale * (.85 + rng() * .3), scale, rng() * Math.PI * 2)
      }

      // 3. Towering canyon cliffs (batu_cliff) embedded into supporting buttresses
      for (const cliff of chunkCliffs) {
        const x = riverCenter(cliff.s) + side * cliff.dist
        const radius = cliff.footprint * 0.36
        const hCenter = terrainHeight(cliff.dist, cliff.s)
        const hInner = terrainHeight(Math.max(HALF_WIDTH + 1.2, cliff.dist - radius), cliff.s)
        const hOuter = terrainHeight(cliff.dist + radius, cliff.s)
        const hFront = terrainHeight(cliff.dist, Math.min(start + 98, cliff.s + radius * 0.6))
        const hBack = terrainHeight(cliff.dist, Math.max(start + 2, cliff.s - radius * 0.6))
        const minGround = Math.min(hCenter, hInner, hOuter, hFront, hBack)
        const asset = this.nextRockAsset('cliff', chunkRockType)
        const scale = cliff.footprint / Math.max(asset.width, asset.depth, .01)
        // Rooted firmly: base sunk by 25% into the massive terrain buttress
        const y = minGround - asset.height * scale * 0.25
        addRock(asset, x, y, -cliff.s, scale, scale * (1.05 + rng() * .4), scale, rng() * Math.PI * 2)
        if (cliff.s < CAVE_START - 8 || cliff.s > CAVE_END + 8) {
          const palette: VegetationPalette = forestBiome(cliff.s)
          for (let vine = 0; vine < 2; vine++) {
            addHangingVine(x - side * 3 * (vine + 1), y + 10, -cliff.s + (vine - 0.5) * 3, 5 + rng() * 6, rng() * Math.PI * 2, rng, palette, add)
          }
        }
      }

      // 4. Natural rock arch on high bluff (embedded into supporting pedestal)
      if (archData) {
        const x = riverCenter(archData.s) + side * archData.dist
        const radius = archData.footprint * 0.35
        const hCenter = terrainHeight(archData.dist, archData.s)
        const hInner = terrainHeight(archData.dist - radius, archData.s)
        const hOuter = terrainHeight(archData.dist + radius, archData.s)
        const minGround = Math.min(hCenter, hInner, hOuter)
        const asset = this.nextRockAsset('arch', chunkRockType)
        const scale = archData.footprint / Math.max(asset.width, asset.depth, .01)
        // Pillars securely planted into bedrock
        const y = minGround - asset.height * scale * 0.15
        addRock(asset, x, y, -archData.s, scale, scale * 1.15, scale, side * 0.3 + (rng() - .5) * .2)
      }

      // Strict Anti-Collision Tree Registry (Minimum spacing >= 5.5m prevents overlapping crowns)
      const plantedTrees: { x: number; s: number }[] = []
      const canPlantTree = (x: number, s: number) => {
        if (s >= CAVE_START - 5 && s <= CAVE_END + 5) return false
        for (const t of plantedTrees) {
          if (Math.hypot(x - t.x, s - t.s) < 3.8) return false
        }
        for (const obstacle of obstacles) {
          const dx = Math.abs(x - riverCenter(obstacle.s) - obstacle.offset)
          const ds = Math.abs(s - obstacle.s)
          const r = obstacle.kind === 'rock' ? obstacle.radius : (obstacle.length ?? 0) * .5
          if (Math.hypot(dx, ds) < r + 2.8) return false
        }
        // Strict anti-collision with rocks (Pohon tidak boleh menembus batu):
        for (const cliff of chunkCliffs) {
          const cx = riverCenter(cliff.s) + side * cliff.dist
          if (Math.hypot(x - cx, s - cliff.s) < cliff.footprint * 0.45 + 2.5) return false
        }
        for (const bld of chunkBoulders) {
          const bx = riverCenter(bld.s) + side * bld.dist
          if (Math.hypot(x - bx, s - bld.s) < bld.footprint * 0.45 + 2.0) return false
        }
        for (const slt of chunkSlates) {
          const sx = riverCenter(slt.s) + side * slt.dist
          if (Math.hypot(x - sx, s - slt.s) < slt.footprint * 0.45 + 1.8) return false
        }
        if (archData) {
          const ax = riverCenter(archData.s) + side * archData.dist
          if (Math.hypot(x - ax, s - archData.s) < archData.footprint * 0.45 + 2.8) return false
        }
        return true
      }

      const placePohon = (category: PlantAssetCategory, s: number, dist: number, height: number) => {
        const order = this.plantAssetOrders.get(category) ?? []
        if (!order.length || s < start + 2 || s > start + 98) return false
        const cursor = this.plantAssetCursors.get(category) ?? 0
        const asset = plantAssets[order[cursor % order.length]]
        if (!asset) return false
        const x = riverCenter(s) + side * dist
        if (!canPlantTree(x, s)) return false
        const uniformScale = height / asset.height
        const naturalWidth = Math.max(asset.width, asset.depth, .1)
        const maxSpan = category === 'pohonPine' ? 7.2 : 9.5
        const horizScale = Math.min(uniformScale, maxSpan / naturalWidth)
        const scaleX = horizScale * (.92 + rng() * .16)
        const scaleY = uniformScale * (.94 + rng() * .12)
        const scaleZ = horizScale * (.92 + rng() * .16)

        // Root trunk cleanly on the riverbank surface so trunk and roots are fully visible above ground
        const groundY = terrainHeight(dist, s) + 0.1
        plantedTrees.push({ x, s })
        this.plantAssetCursors.set(category, cursor + 1)
        this.placedPlantAssets.add(asset.name)
        addPlant(asset, x, groundY, -s, scaleX, scaleY, scaleZ, rng() * Math.PI * 2)
        return true
      }

      // MACRO-ZONED NATURAL GROVES (Hutan Tropis Padat & Rimbun di Pinggir Sungai):
      // Dense tropical rainforest canopy gracefully framing the river along the scenic shoreline terrace
      const dominantTreeCat = zoneTreeCategory(start + 50)

      if (dominantTreeCat) {
        // 5 Dense Groves along each 100m chunk to form an unbroken lush tropical tree line:
        const groveOffsets = [12, 30, 50, 70, 88]
        for (const baseOffset of groveOffsets) {
          const gCenterS = start + baseOffset + (rng() - 0.5) * 6
          const gDist = 15.2 + (side > 0 ? 0.4 : 0) + rng() * 2.0
          placePohon(dominantTreeCat, gCenterS, gDist, 11.2 + rng() * 2.8)

          // Companion tree 1: clustered beside the primary tree
          const comp1S = gCenterS + (rng() > 0.5 ? 4.2 : -4.2) + (rng() - 0.5) * 1.6
          const comp1Dist = 17.2 + rng() * 1.8
          placePohon(dominantTreeCat, comp1S, comp1Dist, 11.8 + rng() * 2.8)

          // Companion tree 2: creating multi-tiered canopy density
          if (rng() > 0.25) {
            const comp2S = gCenterS + (rng() - 0.5) * 4.8
            const comp2Dist = 16.0 + rng() * 2.2
            placePohon(dominantTreeCat, comp2S, comp2Dist, 10.6 + rng() * 2.4)
          }
        }

        // Mid-terrace forest depth trees (giving the feeling of an endless tropical jungle beyond the bank)
        for (let i = 0; i < 3; i++) {
          const depthS = start + 18 + i * 30 + (rng() - 0.5) * 10
          const depthDist = 22.0 + rng() * 5.0
          placePohon(dominantTreeCat, depthS, depthDist, 12.5 + rng() * 3.0)
        }

        // High Bluff Crest Silhouette Trees perched high on the plateau ridges
        for (let i = 0; i < 2; i++) {
          const ridgeS = start + 25 + i * 48 + (rng() - 0.5) * 12
          const ridgeDist = 36.0 + rng() * 8.0
          placePohon(dominantTreeCat, ridgeS, ridgeDist, 14.0 + rng() * 4.0)
        }
      }

      // UNDERSTORY & GRASS: 100% using public/models/rumput/ (bush, fern, grass, reeds)
      // Abundant tropical groundcover: thick reeds, lush turf, broadleaf ferns, and flowering bushes
      const placeVegetasi = (category: PlantAssetCategory, s: number, dist: number, targetHeight: number) => {
        const order = this.plantAssetOrders.get(category) ?? []
        if (!order.length || s < start + 2 || s > start + 98) return false
        const cursor = this.plantAssetCursors.get(category) ?? 0
        const asset = plantAssets[order[cursor % order.length]]
        if (!asset) return false
        const x = riverCenter(s) + side * dist
        const groundY = bankHeight(dist, s)
        if (groundY < .04) return false
        const uniformScale = targetHeight / asset.height
        const scaleX = uniformScale * (.9 + rng() * .2)
        const scaleY = uniformScale * (.92 + rng() * .16)
        const scaleZ = uniformScale * (.9 + rng() * .2)
        this.plantAssetCursors.set(category, cursor + 1)
        this.placedPlantAssets.add(asset.name)
        addPlant(asset, x, groundY, -s, scaleX, scaleY, scaleZ, rng() * Math.PI * 2)
        return true
      }

      // Reeds along the water's edge in thick organic belts
      for (let i = 0; i < 16; i++) {
        const s = start + 5 + i * 5.8 + (rng() - .5) * 2.8
        const dist = 14.6 + rng() * 1.8
        placeVegetasi('reeds', s, dist, 1.8 + rng() * 1.2)
      }

      // Shoreline and terrace grass carpets (dense lush patches)
      for (let i = 0; i < 36; i++) {
        const s = start + 4 + i * 2.6 + (rng() - .5) * 1.8
        const dist = 14.8 + rng() * 7.5
        placeVegetasi('grass', s, dist, 1.4 + rng() * 0.9)
      }

      // Tropical ferns clustering beneath trees and hugging rock bases
      for (let i = 0; i < 24; i++) {
        const s = start + 6 + i * 3.8 + (rng() - .5) * 2.2
        const dist = 15.2 + rng() * 8.0
        placeVegetasi('fern', s, dist, 1.8 + rng() * 1.3)
      }

      // Flowering bushes & tropical foliage softening boulders and embankments
      for (let i = 0; i < 20; i++) {
        const s = start + 7 + i * 4.5 + (rng() - .5) * 2.5
        const dist = 15.0 + rng() * 8.0
        placeVegetasi('bush', s, dist, 2.0 + rng() * 1.4)
      }

      // Shoreline Fallen Wood & Driftwood (pohon_tumbang)
      // Exclude cave interior and immediate entrance/exit (440m to 610m)
      if (start < CAVE_START - 25 || start > CAVE_END + 25) {
        // Anti-collision: kayu pohon TIDAK boleh menembus batu atau pohon
        const canPlaceWood = (wx: number, ws: number, clearRadius: number) => {
          // Anti-collision with standing trees
          for (const t of plantedTrees) {
            if (Math.hypot(wx - t.x, ws - t.s) < clearRadius + 2.5) return false
          }
          // Anti-collision with rocks (MUST NOT penetrate boulders, slates, cliffs, or arch)
          for (const bld of chunkBoulders) {
            const bx = riverCenter(bld.s) + side * bld.dist
            if (Math.hypot(wx - bx, ws - bld.s) < clearRadius + bld.footprint * 0.45 + 1.2) return false
          }
          for (const slt of chunkSlates) {
            const sx = riverCenter(slt.s) + side * slt.dist
            if (Math.hypot(wx - sx, ws - slt.s) < clearRadius + slt.footprint * 0.45 + 1.0) return false
          }
          for (const cliff of chunkCliffs) {
            const cx = riverCenter(cliff.s) + side * cliff.dist
            if (Math.hypot(wx - cx, ws - cliff.s) < clearRadius + cliff.footprint * 0.45 + 1.5) return false
          }
          if (archData) {
            const ax = riverCenter(archData.s) + side * archData.dist
            if (Math.hypot(wx - ax, ws - archData.s) < clearRadius + archData.footprint * 0.45 + 1.5) return false
          }
          for (const obs of obstacles) {
            const ox = riverCenter(obs.s) + obs.offset
            const obsR = obs.radius || 2
            if (Math.hypot(wx - ox, ws - obs.s) < clearRadius + obsR + 1.8) return false
          }
          return true
        }

        // 1. Hollow Logs (pohon_tumbang_hollow):
        // Driftwood resting naturally on shoreline sandbars, pebbles, and mossy banks
        const hollowCount = rng() > 0.4 ? 2 : 1
        for (let h = 0; h < hollowCount; h++) {
          const hs = start + 16 + h * 44 + (rng() - 0.5) * 14
          if (hs < start + 4 || hs > start + 96 || (hs >= CAVE_START - 20 && hs <= CAVE_END + 20)) continue
          const dist = HALF_WIDTH + 2.2 + rng() * 3.4
          const targetLen = 5.2 + rng() * 3.4
          const x = riverCenter(hs) + side * dist
          if (!canPlaceWood(x, hs, targetLen * 0.45)) continue
          const biome = zoneWoodBiome(hs)
          const asset = this.nextWoodAsset('hollow', biome)
          if (asset) {
            const scale = targetLen / Math.max(asset.width, asset.depth, 1)
            const groundY = terrainHeight(dist, hs) - asset.height * scale * 0.25
            const rotY = (side > 0 ? 0.25 : -0.25) + (rng() - 0.5) * 0.7
            addWood(asset, x, groundY, -hs, scale, scale * (0.88 + rng() * 0.24), scale, rotY, (rng() - 0.5) * 0.1, (rng() - 0.5) * 0.1)
          }
        }

        // 2. Shoreline Logjams (pohon_tumbang_logjam):
        // Driftwood clumps clustered naturally against riverbank rock outcroppings
        if (rng() > 0.32) {
          const js = start + 32 + rng() * 36
          if (js >= start + 5 && js <= start + 95 && (js < CAVE_START - 20 || js > CAVE_END + 20)) {
            const dist = HALF_WIDTH + 3.6 + rng() * 2.6
            const targetSize = 5.8 + rng() * 3.2
            const x = riverCenter(js) + side * dist
            if (canPlaceWood(x, js, targetSize * 0.45)) {
              const biome = zoneWoodBiome(js)
              const asset = this.nextWoodAsset('logjam', biome)
              if (asset) {
                const scale = targetSize / Math.max(asset.width, asset.depth, 1)
                const groundY = terrainHeight(dist, js) - asset.height * scale * 0.22
                addWood(asset, x, groundY, -js, scale, scale * (0.85 + rng() * 0.3), scale, rng() * Math.PI * 2)
              }
            }
          }
        }

        // 3. Uprooted Trees (pohon_tumbang_uprooted):
        // Naturally fallen trees with root systems sprawling on the embankment slopes
        if (dominantTreeCat && rng() > 0.45) {
          const us = start + 48 + (rng() - 0.5) * 34
          if (us >= start + 6 && us <= start + 94 && (us < CAVE_START - 20 || us > CAVE_END + 20)) {
            const dist = HALF_WIDTH + 8.0 + rng() * 7.0
            const targetLen = 8.5 + rng() * 4.5
            const x = riverCenter(us) + side * dist
            if (canPlaceWood(x, us, targetLen * 0.45)) {
              const biome = zoneWoodBiome(us)
              const asset = this.nextWoodAsset('uprooted', biome)
              if (asset) {
                const scale = targetLen / Math.max(asset.width, asset.depth, 1)
                const groundY = terrainHeight(dist, us) - asset.height * scale * 0.2
                const angleToRiver = side > 0 ? -Math.PI * 0.42 : Math.PI * 0.42
                addWood(asset, x, groundY, -us, scale, scale, scale, angleToRiver + (rng() - 0.5) * 0.35, 0.14 * side, 0.06)
              }
            }
          }
        }
      }

      // Overlapping faceted puffs give the sky depth instead of flat oval clouds.
      for (let i = 0; i < 2; i++) {
        const s = start + rng() * 100, cx = side * (48 + rng() * 32), cy = riverElevation(s) + 42 + rng() * 13
        for (let puff = 0; puff < 5; puff++) {
          const offset = puff - 2
          const puffX = cx + side * offset * (3.5 + rng() * 1.2)
          const puffY = cy + (puff === 1 || puff === 3 ? 2.5 + rng() * 2.5 : rng() * 2)
          const puffZ = -s + (rng() - .5) * 7
          const puffScale = .72 + rng() * .48
          add(puff % 3 === 0 ? 'cloudBlue' : 'white', transformed(new THREE.IcosahedronGeometry(1, 1),
            puffX, puffY, puffZ, (7 + rng() * 5) * puffScale, (4 + rng() * 3) * puffScale,
            (6 + rng() * 4) * puffScale, rng() * .2, rng() * .5, 0))
        }
      }
    }
    for (const [name, geometries] of batches) {
      const merged = mergeGeometries(geometries)
      const addMesh = (geometry: THREE.BufferGeometry) => {
        const mesh = new THREE.Mesh(geometry, materials[name])
        mesh.castShadow = ['stone', 'lightStone', 'darkStone', 'trunk', 'barkDark', 'barkLight'].includes(name)
        mesh.receiveShadow = true; group.add(mesh)
      }
      if (merged) {
        geometries.forEach(geometry => geometry.dispose())
        addMesh(merged)
      } else {
        // A future custom asset with mismatched attributes should still render
        // individually instead of creating a Mesh with a null geometry.
        console.warn(`Could not merge ${name} environment geometry; rendering meshes separately.`)
        geometries.forEach(addMesh)
      }
    }
    for (const { material, geometries } of plantBatches.values()) {
      const merged = mergeGeometries(geometries)
      const addMesh = (geometry: THREE.BufferGeometry) => {
        const mesh = new THREE.Mesh(geometry, material)
        mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh)
      }
      if (merged) {
        geometries.forEach(geometry => geometry.dispose())
        addMesh(merged)
      } else {
        console.warn(`Could not merge ${material.name || 'plant'} environment geometry; rendering meshes separately.`)
        geometries.forEach(addMesh)
      }
    }
    this.chunks.push({ s: start + 50, group }); this.group.add(group)
  }
  private makeMenuScene() {
    const group = new THREE.Group()
    group.name = 'MenuScenicVista'

    // 1. Scenic Stone Arch Bridge across the river gorge at s = 65 (Image Background)
    const bridgeS = 65
    const bridgeX = riverCenter(bridgeS)
    const bridgeY = riverElevation(bridgeS)
    const bridgeAsset = this.nextRockAsset('arch', 'granite')
    if (bridgeAsset) {
      const archSpan = 26
      const scale = archSpan / Math.max(bridgeAsset.width, bridgeAsset.depth, 0.01)
      for (const part of bridgeAsset.parts) {
        const archMesh = new THREE.Mesh(part.geometry.clone(), part.material)
        archMesh.position.set(bridgeX, bridgeY + 0.6, -bridgeS)
        archMesh.scale.set(scale, scale * 1.15, scale)
        archMesh.castShadow = true; archMesh.receiveShadow = true
        group.add(archMesh)
      }
    }

    // Bridge road deck & stone parapet
    const road = new THREE.Mesh(new THREE.BoxGeometry(24, 0.6, 3.8), materials.stone)
    road.position.set(bridgeX, bridgeY + 8.8, -bridgeS)
    road.castShadow = true; road.receiveShadow = true
    group.add(road)
    for (const zOff of [-1.8, 1.8]) {
      const parapet = new THREE.Mesh(new THREE.BoxGeometry(24, 0.8, 0.35), materials.darkStone)
      parapet.position.set(bridgeX, bridgeY + 9.3, -bridgeS + zOff)
      group.add(parapet)
    }

    // 2. Cascading Cliff Waterfall on Left Bank (s = 56) with Rising Mist (Image Background)
    const fallS = 56
    const fallX = riverCenter(fallS) - 14.5
    const fallY = riverElevation(fallS)
    const curtainGeo = new THREE.PlaneGeometry(6.2, 14.5, 4, 16)
    const curtainMat = new THREE.MeshStandardMaterial({
      color: '#c4f0ff',
      roughness: 0.12,
      metalness: 0.05,
      transparent: true,
      opacity: 0.88,
      side: THREE.DoubleSide,
    })
    const curtain = new THREE.Mesh(curtainGeo, curtainMat)
    curtain.position.set(fallX, fallY + 6.8, -fallS)
    curtain.rotation.y = Math.PI * 0.18
    group.add(curtain)

    // Plunge pool mist
    for (let i = 0; i < 7; i++) {
      const mist = new THREE.Mesh(new THREE.IcosahedronGeometry(2.2 + i * 0.4, 1), materials.mist)
      mist.position.set(fallX + Math.sin(i * 1.8) * 2.2, fallY + 0.8 + i * 0.35, -fallS + Math.cos(i * 1.8) * 2.2)
      group.add(mist)
    }

    // 4. White River Birds soaring across the blue sky (Image Top Right)
    const birdMat = new THREE.MeshBasicMaterial({ color: '#f8fafc', side: THREE.DoubleSide })
    const birdGeo = new THREE.BufferGeometry()
    const birdVerts = new Float32Array([
      -0.65, 0.15, -0.15,   0, 0, 0.2,   0, 0, -0.2,
       0.65, 0.15, -0.15,   0, 0, -0.2,  0, 0, 0.2,
    ])
    birdGeo.setAttribute('position', new THREE.BufferAttribute(birdVerts, 3))
    birdGeo.computeVertexNormals()

    for (let i = 0; i < 7; i++) {
      const bird = new THREE.Mesh(birdGeo, birdMat)
      bird.position.set(
        riverCenter(40) + 7 + (i * 2.2) + Math.sin(i * 1.5) * 1.6,
        riverElevation(40) + 15 + (i * 1.1) + Math.cos(i * 1.2) * 1.4,
        -40 - (i * 3.6)
      )
      bird.rotation.set(-0.15, -0.55, 0.18)
      bird.scale.setScalar(1.2 + (i % 3) * 0.22)
      group.add(bird)
    }

    this.group.add(group)
  }
  private makeStartDockAndPortal() {
    const dockGroup = new THREE.Group()
    this.dockGroup = dockGroup
    const sDock = 7
    const dockCenter = riverCenter(sDock)
    const dockElev = riverElevation(sDock)
    dockGroup.position.set(dockCenter, dockElev, -sDock)

    const plankMat = new THREE.MeshStandardMaterial({
      color: '#854d0e',
      roughness: 0.75,
      metalness: 0.1,
    })
    const logMat = materials.trunk

    // Twin Pier Marina Dock with Open Center Water Channel (x: -2.0 to +2.0 is open river water)
    // Left Pier Deck
    const leftPierGeo = new THREE.BoxGeometry(2.4, 0.45, 14)
    const leftPierMesh = new THREE.Mesh(leftPierGeo, plankMat)
    leftPierMesh.position.set(-3.2, 0.55, 0)
    leftPierMesh.receiveShadow = true
    dockGroup.add(leftPierMesh)

    // Right Pier Deck
    const rightPierGeo = new THREE.BoxGeometry(2.4, 0.45, 14)
    const rightPierMesh = new THREE.Mesh(rightPierGeo, plankMat)
    rightPierMesh.position.set(3.2, 0.55, 0)
    rightPierMesh.receiveShadow = true
    dockGroup.add(rightPierMesh)

    // Rear Walkway Deck connecting both piers behind the raft berth
    const rearWalkGeo = new THREE.BoxGeometry(4.0, 0.45, 2.4)
    const rearWalkMesh = new THREE.Mesh(rearWalkGeo, plankMat)
    rearWalkMesh.position.set(0, 0.55, 5.8)
    rearWalkMesh.receiveShadow = true
    dockGroup.add(rearWalkMesh)

    // Wood Plank Slat Grooves on piers and rear walkway
    for (let z = -6.0; z <= 6.0; z += 1.2) {
      const slatL = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.06, 0.08), logMat)
      slatL.position.set(-3.2, 0.8, z)
      dockGroup.add(slatL)

      const slatR = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.06, 0.08), logMat)
      slatR.position.set(3.2, 0.8, z)
      dockGroup.add(slatR)
    }
    for (const z of [5.2, 6.4]) {
      const slatRear = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.06, 0.08), logMat)
      slatRear.position.set(0, 0.8, z)
      dockGroup.add(slatRear)
    }

    // Wooden Slipway Ramps on side piers only (center channel stays wide open to the river)
    for (const x of [-3.2, 3.2]) {
      const rampGeo = new THREE.BoxGeometry(2.4, 0.35, 4.0)
      const rampMesh = new THREE.Mesh(rampGeo, plankMat)
      rampMesh.position.set(x, 0.22, -8.0)
      rampMesh.rotation.x = 0.18
      dockGroup.add(rampMesh)
    }

    // Mooring Bollards / Cleats along pier edges
    for (const x of [-2.0, 2.0]) {
      for (const z of [-3.5, 0.5, 4.2]) {
        const bollard = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.65, 8), logMat)
        bollard.position.set(x, 0.95, z)
        dockGroup.add(bollard)
      }
    }

    // Support Stilts
    for (const x of [-4.2, -2.1, 2.1, 4.2]) {
      for (const z of [-5.5, 0, 5.5]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 4.2, 8), logMat)
        post.position.set(x, -1.5, z)
        dockGroup.add(post)
      }
    }

    // Outer Side Railings
    for (const x of [-4.3, 4.3]) {
      const railTop = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 13.5, 6), logMat)
      railTop.rotation.x = Math.PI / 2
      railTop.position.set(x, 1.45, 0)
      dockGroup.add(railTop)
    }
    // Rear Railing
    const rearRail = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 8.6, 6), logMat)
    rearRail.rotation.z = Math.PI / 2
    rearRail.position.set(0, 1.45, 6.9)
    dockGroup.add(rearRail)

    // 2. Start Portal / Gerbang Kayu Mulai (s = 7 to 8)
    const portalGroup = new THREE.Group()
    portalGroup.position.set(0, 0.55, -1.0)

    for (const side of [-1, 1]) {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.42, 6.2, 8), logMat)
      pillar.position.set(side * 4.2, 3.1, 0)
      pillar.castShadow = true
      portalGroup.add(pillar)

      const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.6, 0.45), materials.relicGold)
      lantern.position.set(side * 4.2, 6.2, 0)
      portalGroup.add(lantern)
    }

    const archBeam = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.65, 0.6), logMat)
    archBeam.position.set(0, 5.8, 0)
    portalGroup.add(archBeam)

    // Gate hinge groups kept for API compatibility, doors & sign removed as requested (open archway)
    this.startGateLeft = new THREE.Group()
    this.startGateLeft.position.set(-4.0, 0, 0)
    portalGroup.add(this.startGateLeft)

    this.startGateRight = new THREE.Group()
    this.startGateRight.position.set(4.0, 0, 0)
    portalGroup.add(this.startGateRight)

    dockGroup.add(portalGroup)
    this.group.add(dockGroup)
  }

  openStartPortal() {
    this.startGateOpen = true
  }

  resetStartPortal() {
    this.startGateOpen = false
    if (this.startGateLeft) this.startGateLeft.rotation.y = 0
    if (this.startGateRight) this.startGateRight.rotation.y = 0
  }

  updateStartGate(dt: number) {
    if (!this.startGateLeft || !this.startGateRight) return
    const targetAngle = this.startGateOpen ? Math.PI * 0.45 : 0
    this.startGateLeft.rotation.y = THREE.MathUtils.lerp(this.startGateLeft.rotation.y, -targetAngle, dt * 5)
    this.startGateRight.rotation.y = THREE.MathUtils.lerp(this.startGateRight.rotation.y, targetAngle, dt * 5)
  }

  private makeGate(s: number, finish: boolean) {
    const group = new THREE.Group(); group.position.set(riverCenter(s), riverElevation(s), -s)
    for (const side of [-1, 1]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(.09, .14, finish ? 9 : 6, 6), materials.trunk)
      pole.position.set(side * 12, finish ? 4.5 : 3, 0); group.add(pole)
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.1), materials.flag)
      flag.position.set(side * 11.2, 4.6, 0); group.add(flag)
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(1.65, .35), materials.white)
      stripe.position.copy(flag.position); stripe.position.z = .01; stripe.rotation.z = side * -.4; group.add(stripe)
    }
    if (finish) {
      for (let i = 0; i < 24; i++) for (let row = 0; row < 2; row++) {
        const tile = new THREE.Mesh(new THREE.PlaneGeometry(1, .8), (i + row) % 2 ? materials.white : materials.leafDark)
        tile.position.set(-11.5 + i, 8 - row * .8, 0); group.add(tile)
      }
    } else {
      const rope = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, 24, 4), materials.white)
      rope.rotation.z = Math.PI / 2; rope.position.y = 5.7; group.add(rope)
      for (let i = 0; i < 13; i++) {
        const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute([-.35, 0, 0, .35, 0, 0, 0, -.7, 0], 3)); geo.computeVertexNormals()
        const pennant = new THREE.Mesh(geo, i % 2 ? materials.flag : materials.white); pennant.position.set(-10.5 + i * 1.75, 5.7, 0); group.add(pennant)
      }
    }
    this.group.add(group)
  }
  private makeRiverWaterfall(s: number, drop: number, diveDistance = 10) {
    const lowerY = riverElevation(s + diveDistance)
    const major = drop >= 7.5

    // Rock shelves and towering canyon cliffs framing the gorge using the zone's rock type
    const rockType = zoneRockType(s)
    const rng = random(s + 902)
    for (const side of [-1, 1]) {
      for (let i = 0; i < (major ? 2 : 1); i++) {
        const cliff = this.nextRockAsset('cliff', rockType)
        const cliffScale = 16 / Math.max(cliff.width, cliff.depth, .01)
        for (const part of cliff.parts) {
          const mesh = new THREE.Mesh(part.geometry.clone(), part.material)
          mesh.position.set(riverCenter(s) + side * (HALF_WIDTH + 3.8 + i * 5), lowerY - 1.2, -s + (i - 0.5) * 6)
          mesh.scale.set(cliffScale, cliffScale * 1.35, cliffScale)
          mesh.rotation.y = side * 1.2
          mesh.castShadow = true; mesh.receiveShadow = true
          this.group.add(mesh)
        }
      }
      for (let i = 0; i < (major ? 3 : 2); i++) {
        const bld = this.nextRockAsset('boulder', rockType)
        const bScale = 4.2 / Math.max(bld.width, bld.depth, .01)
        for (const part of bld.parts) {
          const mesh = new THREE.Mesh(part.geometry.clone(), part.material)
          mesh.position.set(riverCenter(s) + side * (HALF_WIDTH + 2.5 + rng() * 2), lowerY - 0.5, -s + 4 + (rng() - .5) * 6)
          mesh.scale.set(bScale, bScale, bScale)
          mesh.rotation.y = rng() * Math.PI * 2
          mesh.castShadow = true
          this.group.add(mesh)
        }
      }
    }
  }
  private makeForkEnvironment(fork: RiverFork) {
    const rockType = zoneRockType(fork.startS)
    const rng = random(fork.startS + 771)

    // 1. Central Dividing Rock Spine (Splitting River into Left and Right channels)
    for (let s = fork.startS + 12; s < fork.endS - 8; s += 16) {
      const cliff = this.nextRockAsset('cliff', rockType)
      const scale = 14 / Math.max(cliff.width, cliff.depth, .01)
      const y = riverElevation(s) - 0.8
      for (const part of cliff.parts) {
        const mesh = new THREE.Mesh(part.geometry.clone(), part.material)
        mesh.position.set(riverCenter(s), y, -s)
        mesh.scale.set(scale * 0.72, scale * 1.25, scale * 1.1)
        mesh.rotation.y = (rng() - 0.5) * 0.6
        mesh.castShadow = true; mesh.receiveShadow = true
        this.group.add(mesh)
      }
      const bld = this.nextRockAsset('boulder', rockType)
      const bScale = 3.8 / Math.max(bld.width, bld.depth, .01)
      for (const part of bld.parts) {
        const bMesh = new THREE.Mesh(part.geometry.clone(), part.material)
        bMesh.position.set(riverCenter(s) + (rng() - 0.5) * 2.2, y + 0.4, -s + (rng() - 0.5) * 4)
        bMesh.scale.set(bScale, bScale, bScale)
        bMesh.castShadow = true
        this.group.add(bMesh)
      }
    }

    // 2. Jalur buntu (tanpa tanda): tebing batu alami menutup cabang yang salah di belakang pusaran
    const deadSide = -fork.safeSide
    for (let i = 0; i < 3; i++) {
      const ds = fork.chasmS + 18 + i * 5
      const cliff = this.nextRockAsset('cliff', rockType)
      const scale = 12 / Math.max(cliff.width, cliff.depth, .01)
      for (const part of cliff.parts) {
        const mesh = new THREE.Mesh(part.geometry.clone(), part.material)
        mesh.position.set(riverCenter(ds) + deadSide * (8.5 + (rng() - .5) * 2), riverElevation(ds) - 0.8, -ds)
        mesh.scale.set(scale, scale * 1.1, scale)
        mesh.rotation.y = rng() * Math.PI * 2
        mesh.castShadow = true; mesh.receiveShadow = true
        this.group.add(mesh)
      }
    }
  }
  private makeRockslides() {
    const rockGeo = new THREE.DodecahedronGeometry(2.4, 1)
    const rockMat = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.9, metalness: 0.1 })
    const configs = [
      { s: 515, fromX: 24, toX: 6.0, startY: 18 },
      { s: 845, fromX: -24, toX: -5.5, startY: 19 },
    ]
    for (const c of configs) {
      const mesh = new THREE.Mesh(rockGeo, rockMat)
      mesh.castShadow = true
      const elev = riverElevation(c.s)
      mesh.position.set(riverCenter(c.s) + c.fromX, elev + c.startY, -c.s)
      this.group.add(mesh)
      this.rockslides.push({
        mesh,
        s: c.s,
        fromX: c.fromX,
        toX: c.toX,
        startY: c.startY,
        progress: 0,
        triggered: false,
        impacted: false,
      })
    }
  }

  tailWhipCrocodile(id?: number) {
    if (id === undefined) return
    const crocodile = this.crocodiles.get(id)
    if (!crocodile) return
    crocodile.biteRemaining = 1.1
    crocodile.bite.reset().setLoop(THREE.LoopOnce, 1)
    crocodile.bite.setEffectiveTimeScale(1.75)
    crocodile.bite.play()
  }

  biteCrocodile(id?: number) {
    if (id === undefined) return
    const crocodile = this.crocodiles.get(id)
    if (!crocodile) return
    crocodile.biteRemaining = .95
    crocodile.swim.fadeOut(.1)
    crocodile.bite.reset().setLoop(THREE.LoopOnce, 1)
    crocodile.bite.clampWhenFinished = true
    crocodile.bite.fadeIn(.08).play()
  }
  update(time: number, s: number, physics: RiverPhysics, raftX = riverCenter(s), rainAmount = 0, dt = 1 / 60) {
    for (const chunk of this.chunks) chunk.group.visible = chunk.s > s - 70 && chunk.s < s + 240
    for (const { body, obstacle } of physics.floating) {
      const mesh = this.obstacleMeshes.get(obstacle.id)!, p = body.translation(), q = body.rotation()
      mesh.position.set(p.x, p.y + riverElevation(obstacle.s), p.z); mesh.quaternion.set(q.x, q.y, q.z, q.w)
      // Only the submerged visual surface bobs; x/z/yaw are taken from the collider.
      mesh.position.y += Math.sin(time * 2.4 + obstacle.id) * .09
    }
    for (const crocodile of this.crocodiles.values()) {
      if (crocodile.biteRemaining > 0) {
        crocodile.biteRemaining -= dt
        if (crocodile.biteRemaining <= 0) {
          crocodile.bite.stop(); crocodile.swim.reset().setEffectiveTimeScale(.58).fadeIn(.2).play()
        }
      }
      crocodile.mixer.update(dt)
    }
    for (const [id, star] of this.starMeshes) {
      star.visible = !physics.collected.has(id) && Math.abs(-star.position.z - s) < 170
      star.position.y = riverElevation(-star.position.z) + ((star.userData.baseH as number) || 1.8) + Math.sin(time * 2.4 + id) * .25; star.rotation.y = time * 1.35
    }
    for (let i = 0; i < this.fallFoam.length; i++) {
      const foam = this.fallFoam[i]
      foam.userData.baseY ??= foam.position.y
      foam.position.y = foam.userData.baseY + Math.sin(time * 3 + i) * .08
      foam.rotation.y = time * (i % 2 ? .6 : -.8)
    }

    // DYNAMIC ROCKSLIDE EVENT SYNC
    for (let i = 0; i < this.rockslides.length; i++) {
      const visual = this.rockslides[i]
      const pRock = physics.rockslides[i]
      if (pRock && visual) {
        visual.mesh.position.set(riverCenter(pRock.s) + pRock.x, pRock.y, -pRock.s)
        visual.mesh.rotation.x = pRock.rotX
        visual.mesh.rotation.z = pRock.rotZ
      }
    }

    this.updateRain(time, s, raftX, rainAmount, dt)
  }
  private updateRain(time: number, s: number, raftX: number, amount: number, dt: number) {
    if (!this.rain || !this.rainMaterial || !this.rainPositions) return
    this.rain.visible = amount > .02
    this.rainMaterial.opacity = amount * .68
    if (amount <= .02) return
    this.rain.position.set(raftX, riverElevation(s), -s)
    for (let i = 0; i < this.rainDrops.length; i++) {
      const drop = this.rainDrops[i]
      drop.y -= dt * (11 + amount * 15)
      drop.z -= dt * (4 + amount * 7)
      drop.x += Math.sin(time * .8 + i * .17) * dt * amount * .32
      if (drop.y < -1 || drop.z < -58) {
        drop.x = this.rainRandom() * 62 - 31
        drop.y = 14 + this.rainRandom() * 18
        drop.z = 8 + this.rainRandom() * 18
      }
      const offset = i * 6
      this.rainPositions[offset] = drop.x; this.rainPositions[offset + 1] = drop.y; this.rainPositions[offset + 2] = drop.z
      this.rainPositions[offset + 3] = drop.x + .08; this.rainPositions[offset + 4] = drop.y - 1.2; this.rainPositions[offset + 5] = drop.z - .48
    }
    this.rain.geometry.attributes.position.needsUpdate = true
  }
  nearbyFoam(s: number, physics: RiverPhysics) {
    const rockFoam = obstacles.filter(obstacle => obstacle.kind !== 'log' && obstacle.kind !== 'crocodile' && Math.abs(obstacle.s - s) < 90)
      .map(obstacle => ({ x: riverCenter(obstacle.s) + obstacle.offset, z: -obstacle.s, radius: obstacle.radius }))
    for (const { body } of physics.floating) if (Math.abs(-body.translation().z - s) < 90) {
      const p = body.translation(); rockFoam.push({ x: p.x, z: p.z, radius: 1.8 })
    }
    return rockFoam.slice(0, 16)
  }
  dispose() {
    for (const crocodile of this.crocodiles.values()) crocodile.mixer.stopAllAction()
    this.crocodiles.clear()
  }
}
