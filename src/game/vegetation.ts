import * as THREE from 'three'

export type VegetationMaterial =
  | 'trunk' | 'barkDark' | 'barkLight'
  | 'leaf' | 'leafLight' | 'leafDark' | 'leafOlive' | 'leafJade' | 'leafPine' | 'leafAutumn' | 'leafAmber' | 'leafRust'
  | 'grass' | 'grassBright' | 'grassDeep' | 'grassDry'
  | 'moss' | 'flowerYellow' | 'flowerCoral' | 'flowerCream'
export type VegetationSink = (material: VegetationMaterial, geometry: THREE.BufferGeometry) => void
export type VegetationPalette = { leaves: readonly string[]; grasses: readonly string[] }

type GrassVariant = { blades: number; height: number; spread: number; width: number; shape: number; lean: number; flowers: number; form: string }
type PlantVariant = { form: string; leaves: number; height: number; length: number; width: number; shape: number; accent: VegetationMaterial | null }
type BushVariant = { form: string; lobes: number; width: number; height: number; depth: number; branches: number; shape: number }
export type TreeVariant = { form: string; branches: number; clusters: number; spread: number; width: number; canopyHeight: number; asymmetry: number; droop: number; roots: boolean; vines: number }

export const GRASS_VARIANTS: readonly GrassVariant[] = [
  { form: 'carpet', blades: 11, height: .48, spread: .82, width: .36, shape: 1, lean: .08, flowers: 0 },
  { form: 'fine-tuft', blades: 7, height: .92, spread: .48, width: .24, shape: 0, lean: .2, flowers: 0 },
  { form: 'broad-blade', blades: 6, height: .72, spread: .7, width: .44, shape: 1, lean: .12, flowers: 0 },
  { form: 'curved', blades: 8, height: .84, spread: .7, width: .34, shape: 3, lean: .5, flowers: 0 },
  { form: 'wetland-reed', blades: 5, height: 1.58, spread: .5, width: .22, shape: 0, lean: .32, flowers: 0 },
  { form: 'lime-tip', blades: 8, height: .68, spread: .75, width: .34, shape: 4, lean: .1, flowers: 0 },
  { form: 'shade-grass', blades: 10, height: .56, spread: .86, width: .3, shape: 2, lean: .04, flowers: 0 },
  { form: 'sunburst', blades: 9, height: .76, spread: .68, width: .38, shape: 4, lean: .24, flowers: 0 },
  { form: 'flowering', blades: 8, height: .62, spread: .74, width: .34, shape: 1, lean: .1, flowers: 2 },
  { form: 'exposed-soil', blades: 4, height: .42, spread: .48, width: .28, shape: 2, lean: .06, flowers: 0 },
  { form: 'jungle-edge', blades: 14, height: .92, spread: 1.02, width: .38, shape: 1, lean: .17, flowers: 1 },
  { form: 'river-lean', blades: 9, height: .76, spread: .78, width: .3, shape: 3, lean: .62, flowers: 0 },
  { form: 'mixed-height', blades: 12, height: .8, spread: .86, width: .34, shape: 0, lean: .16, flowers: 0 },
  { form: 'spreading', blades: 10, height: .52, spread: 1.08, width: .4, shape: 5, lean: .25, flowers: 1 },
  { form: 'rock-crevice', blades: 6, height: .58, spread: .42, width: .3, shape: 4, lean: .38, flowers: 1 },
]

export const TROPICAL_PLANT_VARIANTS: readonly PlantVariant[] = [
  { form: 'fan', leaves: 9, height: 1.9, length: 2.25, width: 1.08, shape: 1, accent: null },
  { form: 'banana', leaves: 8, height: 2.35, length: 2.65, width: 1.72, shape: 1, accent: null },
  { form: 'fern', leaves: 6, height: 1.55, length: 2.05, width: .48, shape: 3, accent: null },
  { form: 'arrow', leaves: 8, height: 1.45, length: 1.95, width: .92, shape: 4, accent: null },
  { form: 'palmlet', leaves: 9, height: 2.55, length: 2.55, width: .48, shape: 0, accent: null },
  { form: 'droop', leaves: 8, height: 1.75, length: 2.15, width: 1.02, shape: 5, accent: null },
  { form: 'rosette', leaves: 12, height: 1.25, length: 1.55, width: .62, shape: 2, accent: null },
  { form: 'reed', leaves: 6, height: 2.65, length: 2.15, width: .22, shape: 0, accent: null },
  { form: 'wetland-fan', leaves: 9, height: 2.05, length: 2.3, width: .64, shape: 3, accent: null },
  { form: 'golden-bird', leaves: 7, height: 1.9, length: 1.95, width: 1, shape: 1, accent: 'flowerYellow' },
  { form: 'scarlet-accent', leaves: 8, height: 1.55, length: 1.62, width: .86, shape: 4, accent: 'leafAutumn' },
  { form: 'creeping-moss', leaves: 12, height: .75, length: 1.05, width: .42, shape: 5, accent: 'moss' },
  { form: 'narrow-clump', leaves: 11, height: 2.05, length: 2.05, width: .3, shape: 0, accent: null },
  { form: 'layered-fan', leaves: 12, height: 2.2, length: 2.05, width: 1.08, shape: 1, accent: null },
  { form: 'curled-fern', leaves: 7, height: 1.7, length: 2.12, width: .42, shape: 3, accent: null },
  { form: 'paddle-leaf', leaves: 7, height: 2.1, length: 2.5, width: 1.82, shape: 1, accent: null },
  { form: 'spiky-jade', leaves: 12, height: 1.4, length: 1.8, width: .36, shape: 2, accent: null },
  { form: 'flowering-reed', leaves: 7, height: 2.15, length: 1.9, width: .22, shape: 0, accent: 'flowerCoral' },
  { form: 'bent-leaf', leaves: 9, height: 1.8, length: 2.25, width: .92, shape: 3, accent: null },
  { form: 'orange-bromeliad', leaves: 10, height: 1.3, length: 1.65, width: .7, shape: 4, accent: 'leafAmber' },
]

export const BUSH_VARIANTS: readonly BushVariant[] = [
  { form: 'low-spread', lobes: 8, width: 1.9, height: .85, depth: 1.45, branches: 2, shape: 1 },
  { form: 'round-irregular', lobes: 7, width: 1.25, height: 1.2, depth: 1.2, branches: 1, shape: 0 },
  { form: 'upright', lobes: 8, width: 1, height: 1.8, depth: 1, branches: 3, shape: 2 },
  { form: 'layered', lobes: 10, width: 1.5, height: 1.35, depth: 1.4, branches: 2, shape: 1 },
  { form: 'open-branch', lobes: 5, width: 1.8, height: 1.25, depth: 1.2, branches: 5, shape: 3 },
  { form: 'spiky', lobes: 6, width: 1.15, height: 1.5, depth: 1.15, branches: 1, shape: 4 },
  { form: 'creeping', lobes: 12, width: 2.3, height: .62, depth: 1.8, branches: 1, shape: 5 },
  { form: 'tall-cluster', lobes: 9, width: 1.2, height: 1.75, depth: 1.25, branches: 4, shape: 2 },
  { form: 'flowering', lobes: 7, width: 1.55, height: 1.1, depth: 1.25, branches: 2, shape: 1 },
  { form: 'wind-shaped', lobes: 9, width: 2, height: .92, depth: 1.35, branches: 3, shape: 3 },
  { form: 'stone-cover', lobes: 13, width: 1.9, height: .78, depth: 1.6, branches: 1, shape: 5 },
  { form: 'dense-jade', lobes: 15, width: 1.45, height: 1.45, depth: 1.4, branches: 3, shape: 0 },
]

export const TREE_VARIANTS: readonly TreeVariant[] = [
  { form: 'broad-round', branches: 10, clusters: 39, spread: 1.05, width: 1.05, canopyHeight: .82, asymmetry: .08, droop: .04, roots: false, vines: 0 },
  { form: 'irregular-spread', branches: 11, clusters: 43, spread: 1.2, width: 1.2, canopyHeight: .78, asymmetry: .34, droop: .06, roots: false, vines: 0 },
  { form: 'umbrella', branches: 11, clusters: 43, spread: 1.42, width: 1.22, canopyHeight: .5, asymmetry: .12, droop: .12, roots: false, vines: 0 },
  { form: 'weeping-vine', branches: 9, clusters: 37, spread: 1.16, width: 1.1, canopyHeight: .88, asymmetry: .14, droop: .62, roots: false, vines: 3 },
  { form: 'narrow-column', branches: 8, clusters: 31, spread: .78, width: .78, canopyHeight: 1.18, asymmetry: .04, droop: 0, roots: false, vines: 0 },
  { form: 'open-branch', branches: 12, clusters: 29, spread: 1.24, width: 1.08, canopyHeight: .82, asymmetry: .18, droop: .04, roots: false, vines: 0 },
  { form: 'dense-jungle', branches: 12, clusters: 53, spread: 1.22, width: 1.2, canopyHeight: .9, asymmetry: .1, droop: .08, roots: false, vines: 1 },
  { form: 'layered-crown', branches: 11, clusters: 47, spread: 1.14, width: 1.1, canopyHeight: .94, asymmetry: .06, droop: .1, roots: false, vines: 0 },
  { form: 'wind-bent', branches: 10, clusters: 38, spread: 1.18, width: 1.13, canopyHeight: .75, asymmetry: .72, droop: .03, roots: false, vines: 0 },
  { form: 'buttress-landmark', branches: 13, clusters: 52, spread: 1.28, width: 1.34, canopyHeight: .98, asymmetry: .12, droop: .1, roots: true, vines: 1 },
  { form: 'tropical-palm', branches: 0, clusters: 0, spread: 1.4, width: 1, canopyHeight: 1, asymmetry: 0, droop: .3, roots: true, vines: 0 },
  { form: 'river-pine', branches: 7, clusters: 4, spread: .86, width: .9, canopyHeight: 1.3, asymmetry: .03, droop: 0, roots: false, vines: 0 },
]
const TREE_WEIGHTS = [1, 1, 1, .82, .55, .86, 1.35, 1.15, .9, .7, .72, .12]

const dummy = new THREE.Object3D()
const clusterTemplates = [
  new THREE.IcosahedronGeometry(1, 0),
  new THREE.DodecahedronGeometry(1, 0),
  new THREE.OctahedronGeometry(1, 0),
  new THREE.TetrahedronGeometry(1, 0),
].map(toNonIndexed)
const branchTemplate = toNonIndexed(new THREE.CylinderGeometry(.24, 1, 1, 5, 1))
const trunkTemplate = toNonIndexed(new THREE.CylinderGeometry(.72, 1, 1, 7, 1))
const pineTemplate = toNonIndexed(new THREE.ConeGeometry(1, 1, 7, 1))
const leafTemplates = new Map<number, THREE.BufferGeometry>()

function toNonIndexed(geometry: THREE.BufferGeometry) {
  if (!geometry.index) return geometry
  const result = geometry.toNonIndexed()
  geometry.dispose()
  return result
}

function unitLeaf(shape: number) {
  const key = shape % 6
  let geometry = leafTemplates.get(key)
  if (geometry) return geometry
  const positions: number[] = [], uvs: number[] = []
  const segments = 7
  const profile = (t: number) => {
    const sine = Math.max(0, Math.sin(Math.PI * t))
    if (key === 1) return Math.pow(sine, .48)
    if (key === 2) return Math.pow(sine, 1.35)
    if (key === 3) return Math.pow(sine, .72) * (.72 + .28 * Math.sin(t * Math.PI * 2))
    if (key === 4) return Math.pow(sine, .58) * (.82 + .18 * Math.sin(t * Math.PI * 3))
    if (key === 5) return Math.pow(sine, .62) * (1 - .28 * t)
    return Math.pow(sine, .82)
  }
  const push = (x: number, y: number, z: number, u: number, v: number) => { positions.push(x, y, z); uvs.push(u, v) }
  for (let i = 0; i < segments; i++) {
    const a = i / segments, b = (i + 1) / segments
    const wa = profile(a) * .48, wb = profile(b) * .48
    const ca = key === 3 ? Math.sin(a * Math.PI) * .1 : 0
    const cb = key === 3 ? Math.sin(b * Math.PI) * .1 : 0
    const ya = Math.sin(a * Math.PI) * .08 - a * a * .055
    const yb = Math.sin(b * Math.PI) * .08 - b * b * .055
    const ra: [number, number, number] = [ca, ya + wa * .16, a]
    const la: [number, number, number] = [ca - wa, ya - wa * .08, a]
    const rb: [number, number, number] = [cb, yb + wb * .16, b]
    const lb: [number, number, number] = [cb - wb, yb - wb * .08, b]
    const rightA: [number, number, number] = [ca + wa, ya - wa * .08, a]
    const rightB: [number, number, number] = [cb + wb, yb - wb * .08, b]
    for (const p of [ra, la, lb, ra, lb, rb, ra, rb, rightB, ra, rightB, rightA]) push(p[0], p[1], p[2], p[0] + .5, p[2])
  }
  geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.computeVertexNormals()
  leafTemplates.set(key, geometry)
  return geometry
}

function transformed(template: THREE.BufferGeometry, x: number, y: number, z: number, sx: number, sy: number, sz: number, rx = 0, ry = 0, rz = 0) {
  const geometry = template.clone()
  dummy.position.set(x, y, z); dummy.scale.set(sx, sy, sz); dummy.rotation.set(rx, ry, rz); dummy.updateMatrix()
  geometry.applyMatrix4(dummy.matrix)
  return geometry
}

function addLeaf(add: VegetationSink, material: VegetationMaterial, x: number, y: number, z: number, length: number, width: number, shape: number, rx: number, ry: number, rz: number) {
  add(material, transformed(unitLeaf(shape), x, y, z, width, width, length, rx, ry, rz))
}

function addCluster(add: VegetationSink, material: VegetationMaterial, x: number, y: number, z: number, sx: number, sy: number, sz: number, shape = 0, rx = 0, ry = 0, rz = 0) {
  add(material, transformed(clusterTemplates[shape % clusterTemplates.length], x, y, z, sx, sy, sz, rx, ry, rz))
}

function addBranch(add: VegetationSink, material: VegetationMaterial, start: THREE.Vector3, end: THREE.Vector3, radius: number) {
  const direction = end.clone().sub(start)
  if (direction.lengthSq() < .0001) return
  dummy.position.copy(start).add(end).multiplyScalar(.5)
  dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize())
  dummy.scale.set(radius, direction.length(), radius); dummy.updateMatrix()
  const geometry = branchTemplate.clone(); geometry.applyMatrix4(dummy.matrix); add(material, geometry)
}

function addTrunk(add: VegetationSink, material: VegetationMaterial, x: number, y: number, z: number, height: number, radius: number, lean = 0) {
  add(material, transformed(trunkTemplate, x, y + height / 2, z, radius, height, radius, 0, 0, lean))
}

function leafColor(palette: VegetationPalette, rng: () => number, accent: VegetationMaterial | null = null): VegetationMaterial {
  if (accent && rng() < .52) return accent
  const values = palette.leaves
  return (values.length ? values[Math.floor(rng() * values.length)] : 'leaf') as VegetationMaterial
}

function grassColor(palette: VegetationPalette, rng: () => number, highlight = false): VegetationMaterial {
  if (highlight && rng() < .45) return 'grassBright'
  const values = palette.grasses
  return (values.length ? values[Math.floor(rng() * values.length)] : 'grass') as VegetationMaterial
}

export function chooseGrassVariant(rng: () => number, distanceFromWater: number) {
  const weights = GRASS_VARIANTS.map(() => 1)
  if (distanceFromWater < 23) {
    weights[4] = 3.2
    weights[11] = 1.7
    weights[0] = 1.35
    weights[10] = 1.3
    weights[13] = 1.35
  } else {
    weights[4] = .12
    weights[1] = .35
    weights[0] = 1.8
    weights[2] = 1.65
    weights[6] = 1.6
    weights[9] = 1.25
    weights[13] = 1.7
  }
  const total = weights.reduce((sum, weight) => sum + weight, 0)
  let choice = rng() * total
  for (let i = 0; i < weights.length; i++) {
    choice -= weights[i]
    if (choice <= 0) return i
  }
  return weights.length - 1
}

export function choosePlantVariant(rng: () => number, distanceFromWater: number) {
  const weights = TROPICAL_PLANT_VARIANTS.map(() => 1)
  if (distanceFromWater < 23) {
    weights[7] = 2.2
    weights[8] = 2.4
    weights[17] = 1.8
    weights[0] = 1.45
    weights[1] = 1.55
    weights[13] = 1.4
    weights[15] = 1.3
  } else {
    weights[7] = .16
    weights[8] = .4
    weights[12] = .28
    weights[17] = .14
    for (const index of [0, 1, 3, 5, 6, 9, 10, 13, 14, 15, 18, 19]) weights[index] = 1.5
  }
  const total = weights.reduce((sum, weight) => sum + weight, 0)
  let choice = rng() * total
  for (let i = 0; i < weights.length; i++) {
    choice -= weights[i]
    if (choice <= 0) return i
  }
  return weights.length - 1
}

function addFlower(add: VegetationSink, x: number, y: number, z: number, size: number, material: VegetationMaterial, rng: () => number) {
  addBranch(add, 'leafDark', new THREE.Vector3(x, y - size * 1.3, z), new THREE.Vector3(x, y, z), .018 * size)
  for (let petal = 0; petal < 5; petal++) {
    const angle = petal * Math.PI * 2 / 5
    addLeaf(add, material, x + Math.cos(angle) * size * .2, y, z + Math.sin(angle) * size * .2,
      size * .68, size * .33, 1, .08, angle, rng() * .2)
  }
  addCluster(add, 'flowerCream', x, y + size * .04, z, size * .15, size * .15, size * .15, 2)
}

export function addGrassClump(index: number, x: number, y: number, z: number, side: number, scale: number,
  rng: () => number, palette: VegetationPalette, add: VegetationSink) {
  const variant = GRASS_VARIANTS[index % GRASS_VARIANTS.length]
  for (let core = 0; core < 2; core++) {
    const angle = rng() * Math.PI * 2, radius = rng() * variant.spread * scale * .3
    addCluster(add, grassColor(palette, rng, true), x + Math.cos(angle) * radius, y + .1 * scale,
      z + Math.sin(angle) * radius, variant.spread * scale * (.22 + rng() * .1),
      variant.height * scale * .12, variant.spread * scale * (.18 + rng() * .12), core)
  }
  for (let blade = 0; blade < variant.blades; blade++) {
    const angle = blade / variant.blades * Math.PI * 2 + rng() * .48
    const radius = Math.sqrt(rng()) * variant.spread * scale
    const length = variant.height * scale * (.68 + rng() * .68)
    const width = variant.width * scale * (.72 + rng() * .62)
    const px = x + Math.cos(angle) * radius, pz = z + Math.sin(angle) * radius
    const material = grassColor(palette, rng, blade % 3 === 0)
    const lean = variant.lean * (.65 + rng() * .7)
    addLeaf(add, material, px, y + .01, pz, length, width, variant.shape + (blade % 4 === 0 ? 1 : 0),
      -Math.PI / 2 + (rng() - .5) * .38, angle, side * lean + (rng() - .5) * .22)
  }
  if (variant.form === 'fern' || variant.form === 'spreading') {
    for (let leaflet = 0; leaflet < 4; leaflet++) {
      const angle = rng() * Math.PI * 2, radius = variant.spread * scale * (.45 + rng() * .5)
      addLeaf(add, grassColor(palette, rng, true), x + Math.cos(angle) * radius, y + .03,
        z + Math.sin(angle) * radius, variant.height * scale * .45, variant.width * scale * .7, 3,
        -Math.PI / 2 + (rng() - .5) * .4, angle, side * .2)
    }
  }
  for (let flower = 0; flower < variant.flowers; flower++) {
    const angle = rng() * Math.PI * 2, radius = rng() * variant.spread * scale
    const flowerMaterial: VegetationMaterial = rng() < .62 ? 'flowerYellow' : 'flowerCoral'
    addFlower(add, x + Math.cos(angle) * radius, y + variant.height * scale * (.65 + rng() * .55),
      z + Math.sin(angle) * radius, .12 + rng() * .09, flowerMaterial, rng)
  }
}

export function addTropicalPlant(index: number, x: number, y: number, z: number, scale: number, side: number,
  rng: () => number, palette: VegetationPalette, add: VegetationSink) {
  const variant = TROPICAL_PLANT_VARIANTS[index % TROPICAL_PLANT_VARIANTS.length]
  const leaves = variant.leaves
  if (variant.form === 'reed' || variant.form === 'flowering-reed') {
    const stems = Math.max(3, Math.floor(leaves * .62))
    for (let stem = 0; stem < stems; stem++) {
      const angle = stem / stems * Math.PI * 2 + rng() * .3
      const baseX = x + Math.cos(angle) * scale * .4, baseZ = z + Math.sin(angle) * scale * .4
      const height = variant.height * scale * (.72 + rng() * .5)
      addBranch(add, 'leafDark', new THREE.Vector3(baseX, y, baseZ),
        new THREE.Vector3(baseX + Math.cos(angle) * .18 * scale, y + height, baseZ + Math.sin(angle) * .18 * scale), .045 * scale)
      for (let tier = 1; tier <= 3; tier++) {
        const direction = angle + (tier % 2 ? 1 : -1) * (.72 + rng() * .45)
        addLeaf(add, leafColor(palette, rng, variant.accent), baseX, y + height * tier / 4,
          baseZ, variant.length * scale * (.3 + rng() * .12), variant.width * scale * .62, variant.shape,
          -Math.PI / 2 + .42, direction, side * .1)
      }
      if (variant.form === 'flowering-reed' && rng() < .48) addFlower(add, baseX, y + height, baseZ,
        .15 * scale, variant.accent ?? 'flowerCoral', rng)
    }
    return
  }

  const fern = variant.form === 'fern' || variant.form === 'curled-fern'
  addCluster(add, leafColor(palette, rng, variant.accent), x, y + .16 * scale, z,
    .34 * scale, .18 * scale, .34 * scale, 0)
  for (let leaf = 0; leaf < leaves; leaf++) {
    const angle = leaf / leaves * Math.PI * 2 + rng() * .38
    const radius = scale * (variant.form === 'creeping-moss' ? .72 : .18 + rng() * .28)
    const baseX = x + Math.cos(angle) * radius, baseZ = z + Math.sin(angle) * radius
    const length = variant.length * scale * (.78 + rng() * .48)
    const width = variant.width * scale * (.72 + rng() * .58)
    let rx = -1.08 + rng() * .5
    if (variant.form === 'droop') rx = .2 + rng() * .55
    if (variant.form === 'banana' || variant.form === 'paddle-leaf') rx = -.72 + rng() * .42
    if (fern) rx = -.84 + rng() * .5
    if (variant.form === 'rosette' || variant.form === 'spiky-jade') rx = -1.32 + rng() * .22
    const material = leafColor(palette, rng, variant.accent)
    addLeaf(add, material, baseX, y + (variant.form === 'creeping-moss' ? .12 : .18 * scale), baseZ,
      length, width, variant.shape + (leaf % 3 === 0 ? 1 : 0), rx, angle, side * (.04 + rng() * .18))
    if (fern && leaf % 2 === 0) {
      for (let pair = 1; pair < 6; pair++) for (const sign of [-1, 1]) {
        const along = pair / 7, reach = length * along * .58
        const px = baseX + Math.cos(angle) * reach, pz = baseZ + Math.sin(angle) * reach
        addLeaf(add, leafColor(palette, rng, variant.accent), px, y + .18 * scale + along * length * .3,
          pz, length * .25, width * .72, 2,
          -.28 + (rng() - .5) * .36, angle + sign * (.72 + rng() * .4), side * .08)
      }
    }
  }
  if (variant.accent === 'flowerYellow' || variant.accent === 'flowerCoral') {
    for (let flower = 0; flower < 2 + Math.floor(rng() * 3); flower++) {
      const angle = rng() * Math.PI * 2, radius = scale * (.2 + rng() * .45)
      addFlower(add, x + Math.cos(angle) * radius, y + variant.height * scale * (.65 + rng() * .24),
        z + Math.sin(angle) * radius, .2 * scale, variant.accent, rng)
    }
  }
}

export function addBush(index: number, x: number, y: number, z: number, scale: number, rng: () => number,
  palette: VegetationPalette, add: VegetationSink) {
  const variant = BUSH_VARIANTS[index % BUSH_VARIANTS.length]
  const core: VegetationMaterial = palette.leaves.includes('leafAutumn') ? 'leafRust' : 'leafDark'
  const width = variant.width * scale, height = variant.height * scale, depth = variant.depth * scale
  addCluster(add, core, x, y + height * .48, z, width * .48, height * .5, depth * .48, variant.shape)
  for (let branch = 0; branch < variant.branches; branch++) {
    const angle = branch / Math.max(1, variant.branches) * Math.PI * 2 + rng() * .6
    const end = new THREE.Vector3(x + Math.cos(angle) * width * .72, y + height * (.68 + rng() * .3), z + Math.sin(angle) * depth * .72)
    addBranch(add, 'barkDark', new THREE.Vector3(x, y + height * .08, z), end, .055 * scale)
  }
  for (let lobe = 0; lobe < variant.lobes; lobe++) {
    const angle = lobe * 2.399 + rng() * .7, ring = Math.sqrt((lobe + 1) / variant.lobes)
    const px = x + Math.cos(angle) * width * .44 * ring
    const pz = z + Math.sin(angle) * depth * .44 * ring
    const py = y + height * (.32 + rng() * .56)
    const sx = width * (.2 + rng() * .13), sy = height * (.2 + rng() * .22), sz = depth * (.2 + rng() * .13)
    const material = leafColor(palette, rng)
    addCluster(add, material, px, py, pz, sx, sy, sz, (variant.shape + lobe) % 4, rng() * .3, rng() * Math.PI, rng() * .3)
    if ((variant.form === 'spiky' || variant.form === 'open-branch') && lobe % 2 === 0) {
      addLeaf(add, leafColor(palette, rng), px, py, pz, height * .58, width * .09, 2,
        -Math.PI / 2 + .12, angle, rng() * .25)
    }
  }
  if (variant.form === 'flowering' || index === 8) {
    for (let flower = 0; flower < 3; flower++) {
      const angle = rng() * Math.PI * 2
      addFlower(add, x + Math.cos(angle) * width * .3, y + height * (.7 + rng() * .35),
        z + Math.sin(angle) * depth * .3, .17 * scale, rng() < .72 ? 'flowerYellow' : 'flowerCoral', rng)
    }
  }
}

export function chooseTreeVariant(rng: () => number) {
  const total = TREE_WEIGHTS.reduce((sum, weight) => sum + weight, 0)
  let choice = rng() * total
  for (let i = 0; i < TREE_WEIGHTS.length; i++) {
    choice -= TREE_WEIGHTS[i]
    if (choice <= 0) return i
  }
  return TREE_WEIGHTS.length - 1
}

export function addTree(index: number, x: number, y: number, z: number, height: number, crown: number, side: number,
  rng: () => number, palette: VegetationPalette, add: VegetationSink) {
  const variant = TREE_VARIANTS[index % TREE_VARIANTS.length]
  const topX = x - side * height * (.018 + rng() * .035)
  const bark: VegetationMaterial = variant.form === 'narrow-column' ? 'barkLight' : variant.form === 'buttress-landmark' ? 'barkDark' : 'trunk'
  const trunkRadius = (.3 + height * .014) * (variant.form === 'buttress-landmark' ? 1.35 : 1)
  addTrunk(add, bark, x, y, z, height, trunkRadius, side * (.025 + rng() * .08))

  if (variant.roots) {
    const roots = variant.form === 'tropical-palm' ? 5 : 7
    for (let root = 0; root < roots; root++) {
      const angle = root / roots * Math.PI * 2 + rng() * .3
      const reach = trunkRadius * (2.5 + rng() * 2.4)
      addBranch(add, bark, new THREE.Vector3(x, y + height * .12, z),
        new THREE.Vector3(x + Math.cos(angle) * reach, y + .04, z + Math.sin(angle) * reach), trunkRadius * .45)
    }
  }

  if (variant.form === 'tropical-palm') {
    const fronds = 10 + Math.floor(rng() * 5)
    const crownY = y + height
    for (let frond = 0; frond < fronds; frond++) {
      const angle = frond / fronds * Math.PI * 2 + rng() * .22
      const length = crown * (1.2 + rng() * .36)
      addLeaf(add, leafColor(palette, rng), topX, crownY, z, length, crown * (.28 + rng() * .08), 1,
        -.24 + rng() * .24, angle, -.16 - rng() * .16)
      for (let leaflet = 1; leaflet <= 9; leaflet++) {
        const t = leaflet / 10, reach = length * t * .68
        const px = topX + Math.cos(angle) * reach, pz = z + Math.sin(angle) * reach
        for (const sideOfFrond of [-1, 1]) addLeaf(add, leafColor(palette, rng), px,
          crownY - length * t * .08, pz, length * (.22 + rng() * .06), crown * (.13 + rng() * .045),
          1, -.12 + rng() * .24, angle + sideOfFrond * (.82 + rng() * .2), sideOfFrond * .08)
      }
    }
    return
  }

  if (variant.form === 'river-pine') {
    const tiers = 4 + Math.floor(rng() * 2)
    for (let tier = 0; tier < tiers; tier++) {
      const t = tier / tiers, radius = crown * (.82 - t * .55)
      add('leafPine', transformed(pineTemplate, x, y + height * (.42 + t * .48), z,
        radius, crown * (.62 - t * .24), radius, 0, rng() * .3, 0))
      const branches = 5 + (tier % 3)
      for (let branch = 0; branch < branches; branch++) {
        const angle = branch / branches * Math.PI * 2 + tier * .47
        const start = new THREE.Vector3(x, y + height * (.38 + t * .48), z)
        const end = new THREE.Vector3(x + Math.cos(angle) * radius * .8, start.y + .18, z + Math.sin(angle) * radius * .8)
        addBranch(add, 'barkDark', start, end, .07 * (1 - t * .4))
      }
    }
    return
  }

  const canopyY = y + height - crown * .06
  const tips: THREE.Vector3[] = []
  const branchCount = variant.branches + Math.floor(rng() * 3)
  for (let branch = 0; branch < branchCount; branch++) {
    const angle = branch / branchCount * Math.PI * 2 + rng() * .34
    const start = new THREE.Vector3(x, y + height * (.38 + rng() * .22), z)
    const reach = crown * variant.spread * (.48 + rng() * .3)
    const end = new THREE.Vector3(
      topX + Math.cos(angle) * reach + variant.asymmetry * crown * .32,
      canopyY - crown * (.04 + rng() * .1),
      z + Math.sin(angle) * reach + variant.asymmetry * crown * .2,
    )
    addBranch(add, bark, start, end, trunkRadius * (.56 + rng() * .2))
    tips.push(end)
    const forkStart = start.clone().lerp(end, .56)
    const forks = variant.form === 'open-branch' ? 1 : 2
    for (let fork = 0; fork < forks; fork++) {
      const forkAngle = angle + (fork % 2 ? 1 : -1) * (.42 + rng() * .6)
      const forkEnd = end.clone().add(new THREE.Vector3(
        Math.cos(forkAngle) * crown * (.1 + rng() * .1),
        crown * (.06 + rng() * .1),
        Math.sin(forkAngle) * crown * (.1 + rng() * .1),
      ))
      addBranch(add, bark, forkStart, forkEnd, trunkRadius * .26)
      tips.push(forkEnd)
    }
  }

  const core: VegetationMaterial = palette.leaves.includes('leafAutumn') ? 'leafRust' : 'leafDark'
  if (variant.form !== 'open-branch') addCluster(add, core, topX, canopyY, z,
    crown * variant.width * .7, crown * variant.canopyHeight * .55, crown * variant.width * .7, index % 4, 0, rng() * Math.PI, 0)
  const clusterCount = variant.clusters + Math.floor(rng() * 5)
  for (let cluster = 0; cluster < clusterCount; cluster++) {
    const angle = cluster * 2.399 + rng() * .38
    const ring = .16 + Math.sqrt((cluster + 1) / clusterCount) * .48 * variant.spread
    const tip = cluster < tips.length ? tips[cluster] : undefined
    const centerX = tip ? topX * .2 + tip.x * .8 : topX + Math.cos(angle) * crown * ring + variant.asymmetry * crown * .4
    const centerZ = tip ? z * .2 + tip.z * .8 : z + Math.sin(angle) * crown * ring
    const foliageY = canopyY + (rng() - .5) * crown * variant.canopyHeight * .74
    const centerY = Math.min(tip?.y ?? foliageY, y + height - crown * .2)
      - variant.droop * crown * ring * .28
    const size = crown * (.3 + rng() * .14) * (variant.form === 'buttress-landmark' ? 1.18 : 1)
    const scaleY = size * variant.canopyHeight * (.7 + rng() * .55)
    const material = leafColor(palette, rng)
    addCluster(add, material, centerX, centerY, centerZ,
      size * variant.width * (.88 + rng() * .26), scaleY, size * variant.width * (.88 + rng() * .26),
      (cluster + index) % 4, rng() * .22, rng() * Math.PI, rng() * .22)
  }
  const leafLayers = variant.form === 'layered-crown' ? 2 : 1
  const leafCount = variant.form === 'open-branch' ? 8 : variant.form === 'dense-jungle' ? 18 : 14
  for (let layer = 0; layer < leafLayers; layer++) {
    const ringCount = leafCount + layer * 6
    for (let leaf = 0; leaf < ringCount; leaf++) {
      const angle = leaf / ringCount * Math.PI * 2 + layer * .32 + rng() * .18
      const radius = crown * variant.spread * (.35 + layer * .14)
      const length = crown * (.42 - layer * .05)
      addLeaf(add, leafColor(palette, rng), topX + Math.cos(angle) * radius,
        canopyY - crown * (.3 + layer * .15), z + Math.sin(angle) * radius,
        length, crown * (.23 - layer * .025), (leaf + layer) % 4 === 0 ? 4 : 1,
        -.58 + (rng() - .5) * .2, angle, variant.droop * .15)
    }
  }
  for (let vine = 0; vine < variant.vines; vine++) {
    const angle = rng() * Math.PI * 2
    addHangingVine(topX + Math.cos(angle) * crown * .55, canopyY - crown * .12, z + Math.sin(angle) * crown * .55,
      crown * (.48 + rng() * .35), rng() * Math.PI * 2, rng, palette, add)
  }
}

export function addHangingVine(x: number, y: number, z: number, length: number, phase: number, rng: () => number,
  palette: VegetationPalette, add: VegetationSink) {
  const sections = Math.max(4, Math.ceil(length / 1.1))
  const points: THREE.Vector3[] = []
  for (let i = 0; i <= sections; i++) {
    const t = i / sections
    points.push(new THREE.Vector3(
      x + Math.sin(t * Math.PI * 1.4 + phase) * (.22 + t * .42),
      y - length * t,
      z + Math.cos(t * Math.PI * 1.1 + phase) * (.16 + t * .3),
    ))
  }
  for (let i = 0; i < sections; i++) addBranch(add, 'leafDark', points[i], points[i + 1], .065 * (1 - i / sections * .38))
  for (let i = 1; i < sections; i++) {
    if (i % 2 === 0 || rng() < .55) {
      const side = rng() < .5 ? -1 : 1
      addLeaf(add, leafColor(palette, rng), points[i].x + side * .12, points[i].y, points[i].z,
        .82 + rng() * .5, .3 + rng() * .14, 1, Math.PI / 2 + (rng() - .5) * .35,
        phase + side * .65, 0)
    }
  }
}
