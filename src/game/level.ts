import * as THREE from 'three'
import type { Obstacle, Pickup, PickupKind, RiverFork, Section } from './types'
export type { RiverFork, PickupKind }

export const START = 12
export const FINISH = 1800
export const HALF_WIDTH = 15
export const CAVE_START = 465
export const CAVE_END = 595
export interface WaterfallDrop {
  s: number
  drop: number
  diveDistance: number
  name: string
  label: string
}

// Jeram bertingkat (stepped cascades): setiap rangkaian berisi 2-4 anak tangga curam.
// Rasio drop / diveDistance tinggi = muka jeram miring ekstrem (hingga ~50°).
export const WATERFALL_DROPS: WaterfallDrop[] = [
  // Tangga Jeram Hujan
  { s: 288, drop: 5.0, diveDistance: 8.0, name: 'Tangga Jeram Hujan', label: 'JERAM BERTINGKAT x3' },
  { s: 304, drop: 5.5, diveDistance: 8.0, name: 'Tangga Jeram Hujan II', label: 'CURAM BERTINGKAT' },
  { s: 320, drop: 6.0, diveDistance: 9.0, name: 'Tangga Jeram Hujan III', label: 'CURAM BERTINGKAT' },
  // Jeram Musim Gugur (4 tingkat)
  { s: 386, drop: 7.5, diveDistance: 9.0, name: 'Jeram Musim Gugur', label: 'TURUNAN EKSTREM x4' },
  { s: 402, drop: 6.5, diveDistance: 8.0, name: 'Tingkat Jeram Gugur', label: 'CURAM BERTINGKAT' },
  { s: 418, drop: 6.0, diveDistance: 8.0, name: 'Tingkat Jeram Gugur II', label: 'CURAM BERTINGKAT' },
  { s: 436, drop: 5.5, diveDistance: 8.0, name: 'Tingkat Jeram Gugur III', label: 'CURAM BERTINGKAT' },
  // Ngarai Basalt keluar gua (kolam pusaran di antara tingkat)
  { s: 610, drop: 8.5, diveDistance: 10.0, name: 'Turunan Ngarai Basalt', label: 'TURUNAN EKSTREM x3' },
  { s: 642, drop: 6.5, diveDistance: 8.0, name: 'Jeram Pintu Gua', label: 'CURAM BERTINGKAT' },
  { s: 658, drop: 6.0, diveDistance: 8.0, name: 'Jeram Pintu Gua II', label: 'CURAM BERTINGKAT' },
  // Ngarai berkelok
  { s: 758, drop: 6.0, diveDistance: 8.0, name: 'Anak Tangga Ngarai', label: 'JERAM BERTINGKAT x3' },
  { s: 774, drop: 6.5, diveDistance: 8.0, name: 'Anak Tangga Ngarai II', label: 'CURAM BERTINGKAT' },
  { s: 790, drop: 7.0, diveDistance: 9.0, name: 'Anak Tangga Ngarai III', label: 'CURAM BERTINGKAT' },
  // Jeram pusaran
  { s: 956, drop: 6.0, diveDistance: 8.0, name: 'Riam Pusaran', label: 'JERAM BERTINGKAT x3' },
  { s: 972, drop: 6.5, diveDistance: 8.0, name: 'Riam Pusaran II', label: 'CURAM BERTINGKAT' },
  { s: 988, drop: 7.0, diveDistance: 9.0, name: 'Riam Pusaran III', label: 'CURAM BERTINGKAT' },
  // Air terjun raksasa + tingkat lanjutan
  { s: 1220, drop: 14.0, diveDistance: 16.0, name: 'Air Terjun Raksasa', label: 'AIR TERJUN MEGA x4' },
  { s: 1244, drop: 8.0, diveDistance: 9.0, name: 'Tingkat Air Terjun', label: 'TERJUN BERTINGKAT' },
  { s: 1262, drop: 7.0, diveDistance: 9.0, name: 'Tingkat Air Terjun II', label: 'TERJUN BERTINGKAT' },
  { s: 1280, drop: 6.0, diveDistance: 8.0, name: 'Tingkat Air Terjun III', label: 'TERJUN BERTINGKAT' },
  // Riam puncak akhir
  { s: 1532, drop: 6.0, diveDistance: 8.0, name: 'Riam Tebing Pinus', label: 'TURUNAN TAJAM' },
  { s: 1580, drop: 8.0, diveDistance: 10.0, name: 'Riam Puncak Akhir', label: 'TURUNAN EKSTREM x3' },
  { s: 1596, drop: 7.0, diveDistance: 8.0, name: 'Lompatan Lembah Akhir', label: 'CURAM BERTINGKAT' },
  { s: 1612, drop: 6.5, diveDistance: 8.0, name: 'Lompatan Lembah Akhir II', label: 'CURAM BERTINGKAT' },
  // Tangga terakhir sebelum finis
  { s: 1688, drop: 5.5, diveDistance: 8.0, name: 'Tangga Tebing Hujan', label: 'JERAM BERTINGKAT x2' },
  { s: 1704, drop: 6.0, diveDistance: 8.0, name: 'Tangga Tebing Hujan II', label: 'CURAM BERTINGKAT' },
]

export interface SteepChute { start: number; length: number; drop: number; name: string; label: string }
// Lereng luncur panjang: permukaan air miring tajam yang terus memacu kecepatan.
export const STEEP_CHUTES: SteepChute[] = [
  { start: 140, length: 38, drop: 5.0, name: 'Luncuran Belokan Kanan', label: 'LERENG LUNCUR' },
  { start: 708, length: 28, drop: 6.0, name: 'Luncuran Ngarai Basalt', label: 'LERENG LUNCUR' },
  { start: 1060, length: 35, drop: 7.0, name: 'Luncuran Dataran Tinggi', label: 'LERENG LUNCUR' },
  { start: 1318, length: 44, drop: 10.0, name: 'Luncuran Kolam Biru', label: 'LERENG LUNCUR EKSTREM' },
]

function smooth01(x: number) { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t) }

/** Intensitas jeram 0..1+ berdasarkan kedekatan dengan muka jeram/lereng (untuk arus, ombak, buih). */
export function rapidIntensity(s: number): number {
  let r = 0
  for (const w of WATERFALL_DROPS) {
    const end = w.s + w.diveDistance
    if (s < w.s - 16 || s > end + 26) continue
    const approach = smooth01((s - (w.s - 16)) / 14)
    const tail = 1 - smooth01((s - (end + 4)) / 22)
    const k = Math.min(1.3, .55 + w.drop * .07)
    r = Math.max(r, approach * tail * k)
  }
  for (const c of STEEP_CHUTES) {
    const end = c.start + c.length
    if (s < c.start - 10 || s > end + 18) continue
    const k = Math.min(1.1, .5 + c.drop / c.length * 3)
    r = Math.max(r, smooth01((s - (c.start - 10)) / 10) * (1 - smooth01((s - end) / 18)) * k)
  }
  return r
}

/** Buih tebal di kaki setiap jeram (kolam hidrolik). */
export function plungeFoamIntensity(s: number): number {
  let f = 0
  for (const w of WATERFALL_DROPS) {
    const foot = w.s + w.diveDistance * .9
    const width = 3 + w.drop * .25
    const d = (s - foot) / width
    if (Math.abs(d) < 3.5) f = Math.max(f, Math.exp(-d * d))
  }
  return f
}

export const RIVER_FORKS: RiverFork[] = [
  {
    id: 1,
    startS: 835,
    decisionS: 865,
    chasmS: 895,
    endS: 935,
    safeSide: -1, // Kiri tembus; kanan buntu (pusaran + dinding batu). Tidak ditandai di dalam game.
    name: 'Percabangan Ngarai',
    label: 'PILIH JALUR',
  },
  {
    id: 2,
    startS: 1420,
    decisionS: 1445,
    chasmS: 1475,
    endS: 1515,
    safeSide: 1, // Kanan tembus; kiri buntu (pusaran + dinding batu). Tidak ditandai di dalam game.
    name: 'Jeram Tebing Bercabang',
    label: 'PILIH JALUR',
  },
]

export const WATERFALL_START = 1220
export const WATERFALL_DROP = 4.8
export const WATERFALL_APPROACH = 24
export const WATERFALL_DIVE_DISTANCE = 10
// Checkpoint selalu di luar percabangan agar respawn tidak jatuh di tengah cabang
export const CHECKPOINTS = [170, 330, 490, 600, 820, 1000, 1190, 1405, 1660]
export const sections: Section[] = [
  { name: 'Pemanasan', label: 'KENALI ARUS', start: 0, end: 125, hint: 'A / D atau ← / → untuk mengarahkan rakit', speed: 10.5, current: .35, rapids: .2 },
  { name: 'Belokan kanan', label: 'LERENG LUNCUR', start: 125, end: 250, hint: 'Lereng luncur di belokan kanan.', speed: 11.5, current: .8, rapids: .4 },
  { name: 'Tangga Jeram Hujan', label: 'JERAM BERTINGKAT', start: 250, end: 375, hint: 'Hujan deras di atas tangga jeram.', speed: 10.5, current: .9, rapids: .5, rain: 1 },
  { name: 'Jeram Musim Gugur', label: 'TURUNAN EKSTREM x4', start: 375, end: CAVE_START, hint: 'Jeram bertingkat di lembah gugur.', speed: 12.5, current: 1.2, rapids: .6 },
  { name: 'Gua arus deras', label: 'LEWATI GUA', start: CAVE_START, end: CAVE_END, hint: 'Lorong gua yang tenang.', speed: 12.0, current: 1.3, rapids: .5 },
  { name: 'Turunan Ngarai Basalt', label: 'TURUNAN EKSTREM x3', start: CAVE_END, end: 730, hint: 'Menukik keluar gua ke lembah ngarai.', speed: 13.0, current: 1.3, rapids: .6 },
  { name: 'Ngarai berkelok', label: 'JERAM BERTINGKAT', start: 730, end: 835, hint: 'Tiga anak tangga jeram di tengah belokan.', speed: 11.5, current: 1.1, rapids: .5 },
  { name: 'Percabangan Ngarai', label: 'PILIH JALUR', start: 835, end: 940, hint: 'Sungai bercabang dua. Pilih jalurmu!', speed: 11.5, current: 1.0, rapids: .5 },
  { name: 'Jeram pusaran', label: 'TEMBUS ARUS', start: 940, end: 1100, hint: 'Riam bertingkat dan lereng luncur.', speed: 12.0, current: 1.2, rapids: .5 },
  { name: 'Teluk tenang', label: 'SIAPKAN DIRI', start: 1100, end: WATERFALL_START, hint: 'Arus tenang sebelum air terjun.', speed: 10.0, current: .35, rapids: .2 },
  { name: 'Air terjun', label: 'AIR TERJUN MEGA x4', start: WATERFALL_START, end: 1290, hint: 'Air terjun bertingkat.', speed: 13.0, current: 1.3, rapids: .6 },
  { name: 'Hujan kolam biru', label: 'LERENG LUNCUR EKSTREM', start: 1290, end: 1420, hint: 'Kolam biru dan lereng luncur.', speed: 10.0, current: .9, rapids: .45, rain: 1 },
  { name: 'Jeram Tebing Bercabang', label: 'PILIH JALUR', start: 1420, end: 1520, hint: 'Sungai bercabang. Pilih jalurmu!', speed: 12.0, current: 1.1, rapids: .5 },
  { name: 'Riam Puncak Akhir', label: 'TURUNAN EKSTREM x3', start: 1520, end: 1630, hint: 'Turunan berliku di antara tebing pinus.', speed: 12.5, current: 1.2, rapids: .6 },
  { name: 'Hujan tebing', label: 'JERAM BERTINGKAT', start: 1630, end: 1710, hint: 'Hujan di atas tangga jeram.', speed: 10.5, current: .9, rapids: .45, rain: 1 },
  { name: 'Tikungan akhir', label: 'IKUTI ARUS', start: 1710, end: 1780, hint: 'Belokan sebelum garis finis.', speed: 11.5, current: .8, rapids: .4 },
  { name: 'Pulang dengan cerita', label: 'GARIS FINIS', start: 1780, end: FINISH + 60, hint: 'Arus tenang menuju garis finis.', speed: 10.0, current: .25, rapids: .2 },
]

const riverBends: [number, number][] = [
  [-200, 0], [0, 0], [80, 2], [150, 14], [220, 15], [290, -2], [360, -15], [430, -10],
  [500, 11], [570, 16], [640, -2], [710, -16], [780, -12], [850, 12], [920, 16], [990, -4],
  [1060, -16], [1130, -13], [1200, 8], [1270, 16], [1340, -5], [1410, -16], [1480, -10],
  [1550, 13], [1620, 16], [1690, -3], [1760, -16], [1830, 7], [1900, 13], [1970, 5],
]

function computeLegacyRiverCenter(s: number): number {
  if (s >= 1970) {
    const delta = s - 1970
    return 5 + Math.sin(delta * .02) * 12 + Math.sin(delta * .045) * 4
  }
  let low = 0, high = riverBends.length - 1
  while (low + 1 < high) {
    const middle = (low + high) >> 1
    if (riverBends[middle][0] <= s) low = middle
    else high = middle
  }
  const [s0, x0] = riverBends[low], [s1, x1] = riverBends[high]
  const t = Math.max(0, Math.min(1, (s - s0) / (s1 - s0))), t2 = t * t, t3 = t2 * t
  const prev = riverBends[Math.max(0, low - 1)], next = riverBends[Math.min(riverBends.length - 1, high + 1)]
  const m0 = (x1 - prev[1]) / (s1 - prev[0]) * (s1 - s0)
  const m1 = (next[1] - x0) / (next[0] - s0) * (s1 - s0)
  return (2 * t3 - 3 * t2 + 1) * x0 + (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) * x1 + (t3 - t2) * m1
}

function computeLegacyRiverElevation(s: number): number {
  let elev = -s * 0.006 // Natural gentle river gradient
  for (const w of WATERFALL_DROPS) {
    if (s <= w.s) continue
    const t = Math.min(1, (s - w.s) / w.diveDistance)
    elev -= w.drop * t * t * (3 - 2 * t)
  }
  for (const c of STEEP_CHUTES) {
    if (s <= c.start) continue
    const t = Math.min(1, (s - c.start) / c.length)
    // Lereng hampir linear dengan tepi halus: miring konstan sepanjang luncuran
    const eased = t < .15 ? (t * t) / .255 : t > .85 ? 1 - ((1 - t) * (1 - t)) / .255 : (t - .075) / .85
    elev -= c.drop * Math.max(0, Math.min(1, eased))
  }
  return elev
}

export const SPLINE_S_START = -120
export const SPLINE_S_END = 2100
export const SPLINE_S_SPAN = SPLINE_S_END - SPLINE_S_START

// Uniformly sampled 3D control points along the river course (every 4m)
// This guarantees parameter u = (s - SPLINE_S_START) / SPLINE_S_SPAN maps directly and monotonically to s.
const splinePoints: THREE.Vector3[] = []
// Sampel tiap 2m agar muka jeram yang curam & pendek tetap tajam (tidak membulat).
for (let s = SPLINE_S_START; s <= SPLINE_S_END; s += 2) {
  splinePoints.push(new THREE.Vector3(computeLegacyRiverCenter(s), computeLegacyRiverElevation(s), -s))
}

// 1. SISTEM LINTASAN KURVA (CatmullRomCurve3):
// Spline 3D sungai terintegrasi melaju ke arah -Z, berbelok di sumbu X, dan bervariasi elevasi di sumbu Y (landai & air terjun curam).
export const riverSpline = new THREE.CatmullRomCurve3(splinePoints, false, 'catmullrom', 0.5)
riverSpline.arcLengthDivisions = 6000

export function sToSplineU(s: number): number {
  return Math.max(0, Math.min(1, (s - SPLINE_S_START) / SPLINE_S_SPAN))
}

export function getSplinePoint(s: number, target = new THREE.Vector3()): THREE.Vector3 {
  if (s > SPLINE_S_END) {
    const delta = s - SPLINE_S_END
    const last = riverSpline.getPoint(1)
    const tangent = riverSpline.getTangent(1)
    return target.copy(last).addScaledVector(tangent, delta)
  }
  const u = sToSplineU(s)
  return riverSpline.getPoint(u, target)
}

export function getSplineTangent(s: number, target = new THREE.Vector3()): THREE.Vector3 {
  if (s > SPLINE_S_END) {
    return riverSpline.getTangent(1, target).normalize()
  }
  const u = sToSplineU(s)
  return riverSpline.getTangent(u, target).normalize()
}

export function getSplineSide(s: number, target = new THREE.Vector3()): THREE.Vector3 {
  const t = getSplineTangent(s)
  target.set(-t.z, 0, t.x).normalize()
  return target
}

export function getSplineNormal(s: number, target = new THREE.Vector3()): THREE.Vector3 {
  const t = getSplineTangent(s)
  const side = getSplineSide(s)
  return target.crossVectors(side, t).normalize()
}

export function riverCenter(s: number): number {
  return getSplinePoint(s).x
}

export function riverElevation(s: number): number {
  return getSplinePoint(s).y
}

export function raftElevation(s: number): number {
  return getSplinePoint(s).y
}

/**
 * Coastal Bluff / Half-Cliff Riverbank Elevation:
 * Forms a half-cliff embankment rising steeply from the waterline into a scenic elevated terrace (2.4m - 3.8m above river)
 * where deers roam overlooking the rapids, before stepping up to upper mountain canyon ridges.
 */
export function riverbankCliffHeight(s: number, side: number, distance: number): number {
  const riverEdge = HALF_WIDTH
  const d = Math.max(0, distance - riverEdge)
  const bend = Math.sin(s * 0.032 + side * 1.5)
  const terraceWidth = 12.0 + bend * 3.5

  let baseHeight: number
  if (d < 2.2) {
    // 1. Coastal Bluff Lip (Tebing Pantai):
    // Rises steeply from 0.45m at the waterline to a 2.4m - 3.0m crest
    const t = d / 2.2
    const smoothT = t * t * (3 - 2 * t)
    baseHeight = 0.45 + smoothT * (2.15 + Math.sin(s * 0.06 + side) * 0.35)
  } else if (d < terraceWidth) {
    // 2. Elevated Scenic Bluff Plateau:
    // Broad, flat-topped half-cliff terrace (2.6m to 3.8m above river) where deer herds graze
    const t = (d - 2.2) / (terraceWidth - 2.2)
    const plateauElev = 2.6 + t * 1.1
    const roll = Math.sin(s * 0.045 + d * 0.12) * 0.35 + Math.cos(s * 0.085) * 0.25
    baseHeight = plateauElev + roll
  } else {
    // 3. Upper Canyon Mountain Ridge:
    const cliffSpan = 12.0 + (1 - bend) * 3.0
    const cliffEnd = terraceWidth + cliffSpan
    if (d < cliffEnd) {
      const t = (d - terraceWidth) / cliffSpan
      const smoothT = t * t * (3 - 2 * t)
      const lowerH = 3.8 + Math.sin(s * 0.045 + terraceWidth * 0.15) * 0.45
      const cliffH = 11.0 + Math.sin(s * 0.035 + side) * 4.2
      baseHeight = lowerH + smoothT * cliffH
    } else {
      const ridgeD = d - cliffEnd
      const topH = 14.8 + Math.sin(s * 0.035 + side) * 4.2
      const ridgeSlope = Math.pow(THREE.MathUtils.clamp(ridgeD / 40, 0, 1), 1.2) * 12.0
      const ridgeRoll = Math.sin(s * 0.032 - distance * 0.04) * 1.3
      baseHeight = topH + ridgeSlope + ridgeRoll
    }
  }

  return riverElevation(s) + baseHeight
}

export function riverTangent(s: number): number {
  const tan = getSplineTangent(s)
  return tan.x / Math.max(0.0001, -tan.z)
}
export function sectionAt(s: number): number {
  if (s >= FINISH) {
    return 1 + (Math.floor((s - FINISH) / 180) % (sections.length - 2))
  }
  return Math.max(0, sections.findIndex(section => s < section.end))
}
export function random(seed: number): () => number {
  let n = seed >>> 0
  return () => { n = (1664525 * n + 1013904223) >>> 0; return n / 4294967296 }
}

let id = 0
function rock(s: number, offset: number, radius = 2): Obstacle { return { id: id++, kind: 'rock', s, offset, radius } }
function log(s: number, offset: number, length = 7, angle = .2): Obstacle { return { id: id++, kind: 'log', s, offset, radius: .65, length, angle } }
function tree(s: number, offset: number, length = 12, angle = 0, radius = 2.4): Obstacle { return { id: id++, kind: 'tree', s, offset, radius, length, angle } }
function crocodile(s: number, offset: number): Obstacle { return { id: id++, kind: 'crocodile', s, offset, radius: 2.2, length: 7.6 } }
/** Panjang ramp lompat (m): rakit meluncur naik sepanjang ini sebelum melayang di bibir ramp. */
export const RAMP_LENGTH = 7.5
function ramp(s: number, offset: number, radius = 3.2, height = 2.4): Obstacle { return { id: id++, kind: 'ramp', s, offset, radius, height, length: RAMP_LENGTH } }

const baseObstacles: Obstacle[] = [
  rock(28, 5.5, 2.4), rock(42, -5.5, 2.5),
  rock(55, -5, 2.6),
  // Scenic River Islet 1: Rock island with lush tropical tree in center of warmup valley
  tree(72, 4.5, 10, 0, 2.4),
  rock(88, 5, 2.8), rock(115, -7, 2.8),
  rock(147, 3, 3.2), rock(182, -6, 3.5),
  ramp(195, 2, 3.2, 2.2), // Arena Jump 1: Launch over rocky bend
  rock(214, 7, 3), rock(238, -2, 2.5),
  crocodile(250, -8),
  rock(268, -3, 2.6), rock(285, 9, 2.6), rock(314, 5, 2.7),
  // Scenic River Islet 2: Autumn tree island amidst the cascading autumn stair rapids
  tree(330, -4.5, 10, 0, 2.4),
  rock(348, -5, 2.8),
  ramp(370, 0, 3.4, 2.5), // Arena Jump 2: Launch into Autumn Cascade
  rock(385, -6, 3.1), rock(413, 0, 2.6), crocodile(430, -8.5), rock(446, 6, 2.9),

  // CAVE ZONE OBSTACLES (CAVE_START = 465 to CAVE_END = 595)
  // Cave Entrance Stone Arch Pillars (Flanking the mouth of the basalt chasm)
  rock(465, -12.5, 3.2), rock(465, 12.5, 3.2),
  // Cave Interior Basalt Formations & Rocky Chasm Boulders (100% Solid Colliders)
  rock(480, -7.5, 2.8), rock(486, 9.2, 2.8),
  rock(496, -5.5, 2.7), rock(512, 6.5, 2.8),
  rock(525, -7.0, 2.9), rock(540, 8.0, 2.7),
  rock(557, -4.5, 2.8), rock(572, 7.5, 2.8),
  rock(585, -6.5, 2.9),
  // Cave Exit Stone Arch Pillars
  rock(595, -12.5, 3.2), rock(595, 12.5, 3.2),

  rock(601, 5, 2.8), rock(618, -9, 2.7), rock(667, -7, 2.6),
  ramp(675, 1, 3.5, 2.6), // Arena Jump 3: Launch out of Basalt Gorge
  rock(690, 6, 2.7),
  rock(725, -12, 2.8), crocodile(740, 8), rock(749, 12, 2.6), rock(786, -5, 2.7), rock(805, 12, 3), rock(831, -5, 2.6),
  rock(870, 8, 2.6), crocodile(910, 8.5),
  // Scenic River Islet 3: Highland oak tree island dividing the canyon channel
  tree(885, 3.5, 10, 0, 2.4),
  rock(925, -6, 2.6), rock(967, 7, 2.6), rock(1000, -9, 2.8),
  ramp(1030, -2, 3.5, 2.6), // Arena Jump 4: Launch across Highland River
  rock(1068, 8, 2.8), rock(1115, -7, 2.7), crocodile(1145, 8), rock(1170, 4, 3.2),
  // Scenic River Islet 4: Pine tree island in the quiet bay before the mega waterfall
  tree(1205, 3.5, 10, 0, 2.4),
  rock(1250, -9, 2.8),
  rock(1315, 6, 2.6), crocodile(1335, -8.5), rock(1360, -8, 3),
  ramp(1375, 2, 3.6, 2.8), // Arena Jump 5: High speed launch over canyon rocks
  rock(1400, 6, 3.0), rock(1445, 8, 2.6),
  crocodile(1555, -8), rock(1570, -7, 2.7),
  // Scenic River Islet 5: High altitude pine tree island before summit rapids
  tree(1588, -4.2, 10, 0, 2.4),
  rock(1625, 9, 2.8),
  ramp(1640, 0, 3.8, 3.0), // Arena Jump 6: Mega Grand Finale Jump!
  rock(1725, 6, 3.1),
  crocodile(1740, 8),
  log(1765, -11, 8, -.2),
  rock(1788, 8, 2.6),
]


// DINDING BATU PEMBAGI JALUR DI TENGAH PERCABANGAN (100% Solid Collider - Tidak bisa ditembus rakit)
const forkCenterSpineRocks: Obstacle[] = RIVER_FORKS.flatMap(fork => {
  const rocks: Obstacle[] = []
  for (let s = fork.startS + 24; s < fork.endS - 10; s += 12) {
    rocks.push(rock(s, 0, 3.4))
  }
  return rocks
})

const forkDeadEndRocks: Obstacle[] = RIVER_FORKS.flatMap(fork => [6.8, 9.6, 12.4].map(lane => rock(fork.chasmS + 13, -fork.safeSide * lane, 2.3)))
// Tanpa buaya di area percabangan
export const obstacles: Obstacle[] = [...baseObstacles, ...forkDeadEndRocks, ...forkCenterSpineRocks]
  .filter(o => o.kind !== 'crocodile' || !RIVER_FORKS.some(f => o.s > f.startS - 15 && o.s < f.endS + 15))

// Koin Emas Bertanda Inisial CR (Choirul7 2026 Relic Coins) - Termasuk Airborne Coin Arc di Arena Jump!
const pickupRaw: [number, number, PickupKind, number?][] = [
  [38, 0, 'coin'], [55, 3, 'coin'], [88, -3, 'coin'], [115, 2, 'coin'], [130, 0, 'repair'], [147, -5, 'coin'], [170, 2, 'coin'], [182, 3, 'coin'],
  [240, 0, 'shield'], [340, 2, 'magnet'], [450, 0, 'nos'], [630, 0, 'repair'], [735, 1, 'shield'], [870, -8, 'magnet'], [1015, 0, 'nos'], [1190, 0, 'repair'], [1340, -1, 'shield'], [1490, 8, 'magnet'], [1615, 0, 'nos'],
  // Airborne Coin Arc 1 (Ramp 195):
  [201, 2, 'coin', 3.2], [206, 2, 'coin', 5.2], [211, 2, 'coin', 6.0], [216, 2, 'coin', 4.8], [221, 2, 'coin', 3.0],
  [214, -3, 'coin'],
  [268, 7, 'coin'], [314, -6, 'coin'], [348, 6, 'coin'], [360, 0, 'coin'],
  // Airborne Coin Arc 2 (Ramp 370 - Autumn Cascade Jump):
  [376, 0, 'coin', 3.5], [382, 0, 'coin', 5.6], [388, 0, 'coin', 7.2], [394, 0, 'coin', 6.0], [400, 0, 'coin', 3.8],
  [385, 8, 'coin'], [408, 8, 'coin'], [441, -8, 'coin'],
  [496, 3, 'coin'], [525, -3, 'coin'], [557, 5, 'coin'], [612, 6, 'coin'], [650, 1, 'coin'], [667, 3, 'coin'], [690, -5, 'coin'],
  // Airborne Coin Arc 3 (Ramp 675 - Basalt Gorge Jump):
  [681, 1, 'coin', 3.5], [687, 1, 'coin', 5.8], [693, 1, 'coin', 7.0], [699, 1, 'coin', 5.8], [705, 1, 'coin', 3.6],
  [725, 2, 'coin'], [749, -4, 'coin'], [779, 4, 'coin'], [805, -4, 'coin'], [831, 4, 'coin'],
  [845, -9, 'coin'], [888, -8, 'coin'], [908, -6, 'coin'],
  [940, 2, 'coin'], [980, 8, 'coin'], [1010, -7, 'coin'], [1020, -2, 'coin'],
  // Airborne Coin Arc 4 (Ramp 1030 - Highland River Jump):
  [1036, -2, 'coin', 3.5], [1042, -2, 'coin', 5.8], [1048, -2, 'coin', 7.0], [1054, -2, 'coin', 5.8], [1060, -2, 'coin', 3.6],
  [1075, -7, 'coin'], [1120, -2, 'coin'], [1176, 11, 'coin'], [1205, -7, 'coin'],
  [1260, 0, 'coin'], [1310, -11, 'coin'], [1355, 2, 'coin'], [1365, 10, 'coin'],
  // Airborne Coin Arc 5 (Ramp 1375 - Canyon Rocks Jump):
  [1381, 2, 'coin', 3.6], [1387, 2, 'coin', 6.0], [1393, 2, 'coin', 7.4], [1399, 2, 'coin', 6.0], [1405, 2, 'coin', 3.8],
  [1400, -12, 'coin'], [1450, 8, 'coin'], [1555, -11, 'coin'], [1580, 8, 'coin'],
  [1620, 0, 'coin'], [1635, -12, 'coin'],
  // Airborne Coin Arc 6 (Ramp 1640 - Mega Grand Finale Jump!):
  [1646, 0, 'coin', 3.8], [1652, 0, 'coin', 6.2], [1658, 0, 'coin', 7.8], [1664, 0, 'coin', 6.2], [1670, 0, 'coin', 4.0],
  [1685, 10, 'coin'], [1735, -8, 'coin'], [1775, 11, 'coin'], [1795, 0, 'coin'],
]

export const pickups: Pickup[] = pickupRaw.map(([s, offset, kind, height], id) => ({ id, s, offset, kind, height: height ?? 1.8 })).sort((a, b) => a.s - b.s)

// Jalur buntu di percabangan: pusaran air disusul dinding batu yang menutup cabang
export const FORK_TRAP_WHIRL_OFFSET = 9.5
export const whirlpools = [
  { s: 630, offset: -6, radius: 3.8, direction: 1 },
  { s: 1040, offset: 6, radius: 3.8, direction: -1 },
  { s: 1510, offset: -6, radius: 3.8, direction: 1 },
  ...RIVER_FORKS.map(fork => ({ s: fork.chasmS + 4, offset: -fork.safeSide * FORK_TRAP_WHIRL_OFFSET, radius: 4.2, direction: fork.safeSide })),
]
export function calculateScore(stars: number, health: number, time: number, won: boolean): number {
  return stars * 120 + (won ? Math.round(health) * 20 + Math.max(0, Math.round(260 - time)) * 10 + 1000 : 0)
}
export function medalFor(stars: number, health: number): number { return 1 + Number(stars >= 14) + Number(stars >= 23 && health >= 45) }

// BATU BERGERIGI: hamparan batu tajam dangkal di dekat tepi sungai.
// Tidak menghentikan rakit, tetapi membuat rakit bergetar kiri-kanan saat melintas di atasnya.
export interface JaggedField { id: number; s: number; offset: number; length: number; width: number }
function buildJaggedFields(): JaggedField[] {
  const rng = random(55117)
  const fields: JaggedField[] = []
  let fid = 0
  // Hamparan di depan dermaga start (posisi kerucut oranye semula), diperbanyak
  for (const side of [-1, 1]) {
    fields.push({ id: fid++, s: 20, offset: side * 10.8, length: 12, width: 3.6 })
    fields.push({ id: fid++, s: 36, offset: side * 9.6, length: 10, width: 4 })
  }
  const blocked = (s: number, offset: number, length: number, width: number) => {
    if (RIVER_FORKS.some(f => s > f.startS - 10 && s < f.endS + 10)) return true
    if (WATERFALL_DROPS.some(w => s > w.s - 6 && s < w.s + w.diveDistance + 6)) return true
    if (whirlpools.some(w => Math.abs(w.s - s) < w.radius + 9 + length / 2)) return true
    return obstacles.some(o => {
      const reach = o.kind === 'ramp' ? RAMP_LENGTH : (o.length ?? 0) / 2 + o.radius
      return Math.abs(o.s - s) < reach + length / 2 + 2 && Math.abs(o.offset - offset) < o.radius + width / 2 + 2.5
    })
  }
  for (let s = 52; s < FINISH - 20; s += 22 + rng() * 14) {
    const isCave = s > CAVE_START - 6 && s < CAVE_END + 6
    const side = rng() < .5 ? -1 : 1
    const maxLat = isCave ? 8.5 : 11.2
    const length = 7 + rng() * 5
    const width = 3.2 + rng() * 1.6
    const mid = rng() < .18
    const offset = mid ? (rng() - .5) * 6 : side * (maxLat - rng() * 3)
    if (blocked(s, offset, length, width)) continue
    fields.push({ id: fid++, s, offset, length, width })
    // Kadang hamparan berpasangan di sisi seberang
    if (!mid && rng() < .35) {
      const o2 = -side * (maxLat - rng() * 2.5)
      if (!blocked(s + 5, o2, length, width)) fields.push({ id: fid++, s: s + 5, offset: o2, length, width })
    }
  }
  return fields
}
export const JAGGED_FIELDS: JaggedField[] = buildJaggedFields()

/** Mengembalikan hamparan batu bergerigi yang sedang dilalui rakit (atau null). */
export function jaggedFieldAt(s: number, lateral: number): JaggedField | null {
  for (const f of JAGGED_FIELDS) {
    if (Math.abs(s - f.s) <= f.length / 2 && Math.abs(lateral - f.offset) <= f.width / 2 + 1.2) return f
  }
  return null
}
