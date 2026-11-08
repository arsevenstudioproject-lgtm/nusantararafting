import * as THREE from 'three'

export interface RaftSkinDef {
  id: string
  name: string
  price: number
  tubeColor: string
  floorColor: string
  tag: string
}

export interface PaddleSkinDef {
  id: string
  name: string
  price: number
  bladeColor: string
  shaftColor: string
  tag: string
}

export const RAFT_SKINS: RaftSkinDef[] = [
  { id: 'yellow', name: 'Klasik Ekspedisi', price: 0, tubeColor: '#ffc52d', floorColor: '#eaa51b', tag: 'Bawaan' },
  { id: 'orange', name: 'Jeram Jingga', price: 15, tubeColor: '#ff6b35', floorColor: '#d94814', tag: 'Populer' },
  { id: 'red', name: 'Bara Vulkanik', price: 30, tubeColor: '#e63946', floorColor: '#b01a27', tag: 'Tangguh' },
  { id: 'teal', name: 'Sungai Zamrud', price: 45, tubeColor: '#17c3b2', floorColor: '#0e8579', tag: 'Segar' },
  { id: 'black', name: 'Obsidian Malam', price: 60, tubeColor: '#283038', floorColor: '#181d22', tag: 'Siluman' },
  { id: 'gold', name: 'Emas Nusantara', price: 80, tubeColor: '#ffd700', floorColor: '#cba000', tag: 'Legenda' },
]

export const PADDLE_SKINS: PaddleSkinDef[] = [
  { id: 'wood', name: 'Kayu Tradisional', price: 0, bladeColor: '#ff592d', shaftColor: '#f9ecd0', tag: 'Bawaan' },
  { id: 'carbon', name: 'Karbon Fiber', price: 25, bladeColor: '#24272c', shaftColor: '#5a626a', tag: 'Sport' },
  { id: 'bamboo', name: 'Bambu Hutan', price: 40, bladeColor: '#b7a963', shaftColor: '#e2dbb2', tag: 'Alami' },
]

export function applyRaftSkins(raft: THREE.Object3D, raftSkinId = 'yellow', paddleSkinId = 'wood') {
  const raftSkin = RAFT_SKINS.find(s => s.id === raftSkinId) ?? RAFT_SKINS[0]
  const paddleSkin = PADDLE_SKINS.find(s => s.id === paddleSkinId) ?? PADDLE_SKINS[0]

  raft.traverse(object => {
    if (!(object instanceof THREE.Mesh) || !(object.material instanceof THREE.MeshStandardMaterial)) return
    const name = object.name

    if (name === 'RaftTube' || name === 'RaftBench' || (object.parent === raft && object.geometry instanceof THREE.TorusGeometry && object.geometry.parameters.radius > 1.5)) {
      object.material = object.material.clone()
      object.material.color.set(raftSkin.tubeColor)
      if (raftSkin.id === 'gold') {
        object.material.metalness = .65
        object.material.roughness = .22
      } else {
        object.material.metalness = .05
        object.material.roughness = .48
      }
    } else if (name === 'RaftFloor' || (object.parent === raft && object.geometry instanceof THREE.BoxGeometry && object.position.y < .1)) {
      object.material = object.material.clone()
      object.material.color.set(raftSkin.floorColor)
    } else if (name === 'PaddleBlade') {
      object.material = object.material.clone()
      object.material.color.set(paddleSkin.bladeColor)
      if (paddleSkin.id === 'carbon') {
        object.material.metalness = .45
        object.material.roughness = .3
      }
    } else if (name === 'PaddleShaft') {
      object.material = object.material.clone()
      object.material.color.set(paddleSkin.shaftColor)
    }
  })
}

/** Original low-poly asset. Shared by the GLB generator and the loading fallback. */
export function createRaft(): THREE.Group {
  const raft = new THREE.Group()
  raft.name = 'River Rush • expedition raft'
  const yellow = new THREE.MeshStandardMaterial({ color: '#ffc52d', roughness: .48, metalness: .05 })
  const darkYellow = new THREE.MeshStandardMaterial({ color: '#eaa51b', roughness: .65 })
  const black = new THREE.MeshStandardMaterial({ color: '#213331', roughness: .85 })
  const orange = new THREE.MeshStandardMaterial({ color: '#ff592d', roughness: .65, flatShading: true })
  const orangeDark = new THREE.MeshStandardMaterial({ color: '#d9441e', roughness: .7, flatShading: true })
  const whiteReflect = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .3, emissive: '#ffffff', emissiveIntensity: .2 })
  const skin = new THREE.MeshStandardMaterial({ color: '#dfa16d', roughness: .85, flatShading: true })
  const hair = new THREE.MeshStandardMaterial({ color: '#2b1d16', roughness: .95, flatShading: true })
  const blue = new THREE.MeshStandardMaterial({ color: '#1e3a5f', roughness: .85, flatShading: true })
  const cream = new THREE.MeshStandardMaterial({ color: '#f9ecd0', roughness: .9 })

  const add = (g: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = raft, name?: string) => {
    const mesh = new THREE.Mesh(g, m); mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true
    if (name) mesh.name = name
    parent.add(mesh); return mesh
  }

  const tube = add(new THREE.TorusGeometry(1.75, .57, 10, 40), yellow, 0, .32, 0, raft, 'RaftTube')
  tube.rotation.x = Math.PI / 2; tube.scale.y = 1.35
  add(new THREE.BoxGeometry(2.6, .22, 3.6), darkYellow, 0, .05, 0, raft, 'RaftFloor')
  for (const z of [-1.1, .9]) {
    const bench = add(new THREE.CylinderGeometry(.34, .34, 3.15, 10), yellow, 0, .32, z, raft, 'RaftBench'); bench.rotation.z = Math.PI / 2
  }
  const rope = add(new THREE.TorusGeometry(2.05, .045, 5, 56), cream, 0, .55, 0, raft, 'RaftRope')
  rope.rotation.x = Math.PI / 2; rope.scale.y = 1.34
  for (const z of [-1.7, 0, 1.7]) for (const side of [-1, 1]) {
    const strap = add(new THREE.TorusGeometry(.575, .065, 5, 10), black, side * (Math.abs(z) > 1 ? 1.35 : 1.75), .32, z)
    strap.rotation.y = Math.PI / 2; strap.rotation.x = side * z * .24
    add(new THREE.BoxGeometry(.3, .09, .45), black, side * 1.82, .84, z * .7)
  }

  // Duo Adventurers (matching Kinect Adventures River Rush - Player & Companion)
  const paddler = new THREE.Group(); paddler.name = 'Paddler'; paddler.position.set(-0.45, .62, .18); raft.add(paddler)
  const companion = new THREE.Group(); companion.name = 'Companion'; companion.position.set(0.45, .62, .18); raft.add(companion)

  const greenVest = new THREE.MeshStandardMaterial({ color: '#22c55e', roughness: .65, flatShading: true })
  const greenDark = new THREE.MeshStandardMaterial({ color: '#15803d', roughness: .7, flatShading: true })

  // 1. LEFT ADVENTURER (Player)
  // Waist & Hips
  add(new THREE.BoxGeometry(.72, .35, .58), blue, 0, .28, -.02, paddler)
  add(new THREE.BoxGeometry(.74, .09, .60), black, 0, .44, -.02, paddler)

  // Legs & Boots extending forward
  for (const side of [-1, 1]) {
    const thigh = add(new THREE.CapsuleGeometry(.16, .52, 4, 8), blue, side * .28, .22, -.36, paddler)
    thigh.rotation.x = Math.PI / 2.3
    const shin = add(new THREE.CapsuleGeometry(.14, .40, 4, 8), skin, side * .28, .02, -.65, paddler)
    shin.rotation.x = Math.PI / 4.5
    const boot = add(new THREE.BoxGeometry(.28, .22, .50), black, side * .29, -.12, -.85, paddler)
    boot.rotation.y = side * -.1
  }

  // Torso & Life Vest
  add(new THREE.BoxGeometry(.76, .88, .54), orange, 0, .88, -.02, paddler)
  add(new THREE.BoxGeometry(.70, .74, .12), orangeDark, 0, .88, .25, paddler)
  add(new THREE.BoxGeometry(.64, .08, .13), whiteReflect, 0, 1.02, .255, paddler)
  add(new THREE.BoxGeometry(.64, .08, .13), whiteReflect, 0, .72, .255, paddler)
  add(new THREE.BoxGeometry(.1, .80, .14), black, -.20, .88, .255, paddler)
  add(new THREE.BoxGeometry(.1, .80, .14), black, .20, .88, .255, paddler)

  // Arms
  for (const side of [-1, 1]) {
    const arm = new THREE.Group(); arm.name = side > 0 ? 'RightArm' : 'LeftArm'
    arm.position.set(side * .45, 1.20, -.05); paddler.add(arm)
    add(new THREE.SphereGeometry(.15, 8, 6), orange, 0, 0, 0, arm)
    const upper = add(new THREE.CapsuleGeometry(.13, .45, 4, 8), skin, side * .10, -.22, -.06, arm)
    upper.rotation.z = side * .55
    upper.rotation.x = -.28
    const forearm = add(new THREE.CapsuleGeometry(.11, .40, 4, 8), skin, side * .30, -.34, -.25, arm)
    forearm.rotation.set(-Math.PI / 2.3, 0, side * .16)
    add(new THREE.SphereGeometry(.13, 8, 6), skin, side * .40, -.25, -.45, arm)
  }

  // Head
  add(new THREE.CylinderGeometry(.13, .16, .22, 8), skin, 0, 1.42, -.02, paddler)
  const head = add(new THREE.IcosahedronGeometry(.33, 2), skin, 0, 1.72, -.03, paddler)
  head.scale.set(.95, 1.08, .96)
  const crown = add(new THREE.IcosahedronGeometry(.35, 1), hair, 0, 1.86, .03, paddler)
  crown.scale.set(1.02, .82, 1.02)
  for (const side of [-1, 1]) add(new THREE.IcosahedronGeometry(.09, 1), skin, side * .32, 1.72, -.03, paddler)
  for (const side of [-1, 1]) add(new THREE.SphereGeometry(.03, 6, 4), black, side * .12, 1.75, -.34, paddler)
  add(new THREE.ConeGeometry(.06, .11, 4), skin, 0, 1.70, -.37, paddler).rotation.x = -Math.PI / 2

  // 2. RIGHT ADVENTURER (Companion in Lime Green Life Vest - Images 3, 4, 5)
  add(new THREE.BoxGeometry(.72, .35, .58), black, 0, .28, -.02, companion)
  add(new THREE.BoxGeometry(.74, .09, .60), black, 0, .44, -.02, companion)

  for (const side of [-1, 1]) {
    const thigh = add(new THREE.CapsuleGeometry(.15, .52, 4, 8), black, side * .28, .22, -.36, companion)
    thigh.rotation.x = Math.PI / 2.3
    const shin = add(new THREE.CapsuleGeometry(.13, .40, 4, 8), skin, side * .28, .02, -.65, companion)
    shin.rotation.x = Math.PI / 4.5
    const boot = add(new THREE.BoxGeometry(.28, .22, .50), black, side * .29, -.12, -.85, companion)
    boot.rotation.y = side * -.1
  }

  // Torso in bright athletic lime green
  add(new THREE.BoxGeometry(.74, .86, .52), greenVest, 0, .88, -.02, companion)
  add(new THREE.BoxGeometry(.68, .72, .12), greenDark, 0, .88, .24, companion)
  add(new THREE.BoxGeometry(.62, .08, .13), whiteReflect, 0, 1.02, .245, companion)
  add(new THREE.BoxGeometry(.62, .08, .13), whiteReflect, 0, .72, .245, companion)
  add(new THREE.BoxGeometry(.09, .78, .14), black, -.18, .88, .245, companion)
  add(new THREE.BoxGeometry(.09, .78, .14), black, .18, .88, .245, companion)

  // Companion Arms
  for (const side of [-1, 1]) {
    const arm = new THREE.Group(); arm.name = side > 0 ? 'CompanionRightArm' : 'CompanionLeftArm'
    arm.position.set(side * .43, 1.20, -.05); companion.add(arm)
    add(new THREE.SphereGeometry(.14, 8, 6), greenVest, 0, 0, 0, arm)
    const upper = add(new THREE.CapsuleGeometry(.12, .44, 4, 8), skin, side * .10, -.22, -.06, arm)
    upper.rotation.z = side * .45
    upper.rotation.x = -.2
    const forearm = add(new THREE.CapsuleGeometry(.11, .38, 4, 8), skin, side * .26, -.32, -.22, arm)
    forearm.rotation.set(-Math.PI / 2.6, 0, side * .14)
    add(new THREE.SphereGeometry(.12, 8, 6), skin, side * .35, -.24, -.40, arm)
  }

  // Head with Ponytail
  add(new THREE.CylinderGeometry(.12, .15, .22, 8), skin, 0, 1.42, -.02, companion)
  const cHead = add(new THREE.IcosahedronGeometry(.32, 2), skin, 0, 1.72, -.03, companion)
  cHead.scale.set(.95, 1.08, .96)
  const cCrown = add(new THREE.IcosahedronGeometry(.34, 1), hair, 0, 1.86, .03, companion)
  cCrown.scale.set(1.02, .82, 1.02)
  // Explorer ponytail
  const ponytail = add(new THREE.CapsuleGeometry(.11, .42, 4, 8), hair, 0, 1.76, .35, companion)
  ponytail.rotation.x = -Math.PI / 3
  for (const side of [-1, 1]) add(new THREE.IcosahedronGeometry(.08, 1), skin, side * .30, 1.72, -.03, companion)
  for (const side of [-1, 1]) add(new THREE.SphereGeometry(.028, 6, 4), black, side * .11, 1.75, -.33, companion)
  add(new THREE.ConeGeometry(.06, .11, 4), skin, 0, 1.70, -.36, companion).rotation.x = -Math.PI / 2

  // Paddle
  const paddle = new THREE.Group(); paddle.name = 'Paddle'; paddle.position.set(-0.45, 1.0, -.42); raft.add(paddle)
  const shaft = add(new THREE.CylinderGeometry(.05, .05, 5.8, 6), cream, 0, 0, 0, paddle, 'PaddleShaft')
  shaft.rotation.z = Math.PI / 2
  for (const side of [-1, 1]) {
    const blade = add(new THREE.BoxGeometry(.95, .09, .5), orange, side * 2.8, 0, 0, paddle, 'PaddleBlade')
    blade.rotation.y = side * .12
  }

  return raft
}
