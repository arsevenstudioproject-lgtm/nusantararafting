import * as THREE from 'three'

/** Fixed-size GPU buffer and reusable particle slots. No per-frame particle allocation. */
export class SplashPool {
  readonly capacity = 6000
  positions = new Float32Array(this.capacity * 3)
  velocities = new Float32Array(this.capacity * 3)
  colors = new Float32Array(this.capacity * 3)
  ages = new Float32Array(this.capacity)
  lifetimes = new Float32Array(this.capacity)
  sizes = new Float32Array(this.capacity)
  alpha = new Float32Array(this.capacity)
  isLeaf = new Float32Array(this.capacity)
  cursor = 0
  points: THREE.Points
  geometry: THREE.BufferGeometry
  emission = 0
  totalEmitted = 0
  private leafTimer = 0

  constructor(scene: THREE.Scene) {
    this.geometry = new THREE.BufferGeometry()
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage))
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1).setUsage(THREE.DynamicDrawUsage))
    this.geometry.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage))
    this.geometry.setAttribute('aColor', new THREE.BufferAttribute(this.colors, 3).setUsage(THREE.DynamicDrawUsage))
    this.geometry.setAttribute('aIsLeaf', new THREE.BufferAttribute(this.isLeaf, 1).setUsage(THREE.DynamicDrawUsage))

    const material = new THREE.ShaderMaterial({
      vertexShader: `
        attribute float aSize; attribute float aAlpha; attribute vec3 aColor; attribute float aIsLeaf;
        varying float vAlpha; varying vec3 vColor; varying float vIsLeaf;
        void main(){
          vAlpha = aAlpha; vColor = aColor; vIsLeaf = aIsLeaf;
          vec4 mv = modelViewMatrix * vec4(position, 1.);
          gl_PointSize = clamp(aSize * 560. / max(1., -mv.z), 0., 72.);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        varying float vAlpha; varying vec3 vColor; varying float vIsLeaf;
        void main(){
          vec2 coord = gl_PointCoord - vec2(0.5);
          float d = length(coord) * 2.0;
          if (d > 1.0 || vAlpha < 0.01) discard;
          if (vIsLeaf > 0.5) {
            gl_FragColor = vec4(vColor, vAlpha * (1.0 - smoothstep(0.65, 1.0, d)));
          } else {
            // Sparkling translucent water droplet with specular sun glint
            float core = 1.0 - smoothstep(0.2, 0.95, d);
            float glint = smoothstep(0.32, 0.04, length(coord - vec2(-0.16, -0.16)));
            vec3 col = mix(vColor, vec3(1.0, 1.0, 1.0), glint * 0.88);
            float a = vAlpha * (core * 0.82 + glint * 0.45);
            gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
          }
        }`,
      transparent: true, depthWrite: false,
    })
    this.points = new THREE.Points(this.geometry, material); this.points.frustumCulled = false; scene.add(this.points)
  }

  emit(x: number, y: number, z: number, amount: number, power: number, side = 0, vx = 0, vz = 0, sizeScale = 1) {
    for (let n = 0; n < amount; n++) {
      const i = this.cursor++ % this.capacity, p = i * 3
      this.positions[p] = x + (Math.random() - .5) * 1.2
      this.positions[p + 1] = y + Math.random() * .35
      this.positions[p + 2] = z + (Math.random() - .5) * 1.8
      this.velocities[p] = side * (1.2 + Math.random() * power) + (Math.random() - .5) * power + vx * .15
      this.velocities[p + 1] = 1.2 + Math.random() * power * 1.15
      this.velocities[p + 2] = (Math.random() - .5) * power + vz * .22
      this.colors[p] = .92; this.colors[p + 1] = .98; this.colors[p + 2] = 1.0
      this.ages[i] = 0; this.lifetimes[i] = .45 + Math.random() * .75
      this.sizes[i] = (.14 + Math.random() * .28) * sizeScale; this.alpha[i] = .95; this.isLeaf[i] = 0; this.totalEmitted++
    }
  }

  emitSplashdown(x: number, y: number, z: number, power = 5.2) {
    // 1. Towering vertical geyser eruption plume (shoots 6m - 14m into the air!)
    for (let i = 0; i < 95; i++) {
      const idx = this.cursor++ % this.capacity, p = idx * 3
      const rad = Math.random() * 1.5
      const ang = Math.random() * Math.PI * 2
      this.positions[p] = x + Math.cos(ang) * rad
      this.positions[p + 1] = y + 0.1 + Math.random() * 0.4
      this.positions[p + 2] = z + Math.sin(ang) * rad
      this.velocities[p] = Math.cos(ang) * (0.8 + Math.random() * 2.8)
      this.velocities[p + 1] = 7.0 + Math.random() * (power * 2.2)
      this.velocities[p + 2] = Math.sin(ang) * (0.8 + Math.random() * 2.8)
      this.colors[p] = 0.94; this.colors[p + 1] = 0.98; this.colors[p + 2] = 1.0
      this.ages[idx] = 0; this.lifetimes[idx] = 0.85 + Math.random() * 0.95
      this.sizes[idx] = 0.38 + Math.random() * 0.45; this.alpha[idx] = 0.96; this.isLeaf[idx] = 0; this.totalEmitted++
    }

    // 2. High-speed 360-degree crown spray radiating outwards
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 24) {
      for (let s = 0; s < 5; s++) {
        const idx = this.cursor++ % this.capacity, p = idx * 3
        const spd = 4.8 + Math.random() * (power * 1.6)
        const jitterA = a + (Math.random() - 0.5) * 0.18
        const cosA = Math.cos(jitterA), sinA = Math.sin(jitterA)
        this.positions[p] = x + cosA * (1.6 + Math.random() * 0.7)
        this.positions[p + 1] = y + 0.15 + Math.random() * 0.35
        this.positions[p + 2] = z + sinA * (1.6 + Math.random() * 0.7)
        this.velocities[p] = cosA * spd
        this.velocities[p + 1] = 2.8 + Math.random() * (power * 1.3)
        this.velocities[p + 2] = sinA * spd
        this.colors[p] = 0.92; this.colors[p + 1] = 0.98; this.colors[p + 2] = 1.0
        this.ages[idx] = 0; this.lifetimes[idx] = 0.65 + Math.random() * 0.85
        this.sizes[idx] = 0.3 + Math.random() * 0.4; this.alpha[idx] = 0.94; this.isLeaf[idx] = 0; this.totalEmitted++
      }
    }

    // 3. Wide foaming water blanket and fine mist droplets
    for (let i = 0; i < 130; i++) {
      const idx = this.cursor++ % this.capacity, p = idx * 3
      const rad = 1.0 + Math.random() * 3.8
      const ang = Math.random() * Math.PI * 2
      this.positions[p] = x + Math.cos(ang) * rad
      this.positions[p + 1] = y + 0.2 + Math.random() * 0.5
      this.positions[p + 2] = z + Math.sin(ang) * rad
      this.velocities[p] = Math.cos(ang) * (2.2 + Math.random() * 4.2)
      this.velocities[p + 1] = 1.8 + Math.random() * 4.5
      this.velocities[p + 2] = Math.sin(ang) * (2.2 + Math.random() * 4.2)
      this.colors[p] = 0.96; this.colors[p + 1] = 0.99; this.colors[p + 2] = 1.0
      this.ages[idx] = 0; this.lifetimes[idx] = 0.9 + Math.random() * 1.2
      this.sizes[idx] = 0.16 + Math.random() * 0.28; this.alpha[idx] = 0.88; this.isLeaf[idx] = 0; this.totalEmitted++
    }
  }

  emitPaddleSplash(x: number, y: number, z: number, side: number, power = 3.6, vx = 0, vz = 0) {
    for (let i = 0; i < 55; i++) {
      const idx = this.cursor++ % this.capacity, p = idx * 3
      const spreadX = side * (1.8 + Math.random() * power * 1.8)
      const spreadY = 1.5 + Math.random() * power * 1.5
      const spreadZ = (Math.random() - 0.5) * 2.4 + vz * 0.2
      this.positions[p] = x + (Math.random() - 0.5) * 0.7
      this.positions[p + 1] = y + Math.random() * 0.25
      this.positions[p + 2] = z + (Math.random() - 0.5) * 0.9
      this.velocities[p] = spreadX + vx * 0.15
      this.velocities[p + 1] = spreadY
      this.velocities[p + 2] = spreadZ
      this.colors[p] = 0.92; this.colors[p + 1] = 0.98; this.colors[p + 2] = 1.0
      this.ages[idx] = 0; this.lifetimes[idx] = 0.45 + Math.random() * 0.6
      this.sizes[idx] = 0.25 + Math.random() * 0.32; this.alpha[idx] = 0.94; this.isLeaf[idx] = 0; this.totalEmitted++
    }
  }

  emitBowSpray(x: number, y: number, z: number, vx: number, vz: number, speed: number, dt: number) {
    // Both left and right bows throw white foaming sheets when speeding through water
    const intensity = Math.min(1.0, Math.max(0, (speed - 10) / 36))
    if (intensity <= 0) return
    const count = Math.max(1, Math.floor(dt * (24 + intensity * 75)))
    for (const side of [-1, 1]) {
      for (let i = 0; i < count; i++) {
        const idx = this.cursor++ % this.capacity, p = idx * 3
        const bowX = x + side * 1.45 + (Math.random() - 0.5) * 0.4
        const bowZ = z - 1.1 + (Math.random() - 0.5) * 0.6
        this.positions[p] = bowX
        this.positions[p + 1] = y + 0.1 + Math.random() * 0.25
        this.positions[p + 2] = bowZ
        this.velocities[p] = side * (2.4 + Math.random() * 3.8 * intensity) + vx * 0.2
        this.velocities[p + 1] = 1.4 + Math.random() * 3.2 * intensity
        this.velocities[p + 2] = 1.6 + Math.random() * 2.8 + vz * 0.12
        this.colors[p] = 0.94; this.colors[p + 1] = 0.99; this.colors[p + 2] = 1.0
        this.ages[idx] = 0; this.lifetimes[idx] = 0.38 + Math.random() * 0.48
        this.sizes[idx] = 0.22 + Math.random() * 0.32 * intensity; this.alpha[idx] = 0.9; this.isLeaf[idx] = 0; this.totalEmitted++
      }
    }
  }

  emitWindLeaf(x: number, y: number, z: number) {
    const i = this.cursor++ % this.capacity, p = i * 3
    this.positions[p] = x; this.positions[p + 1] = y; this.positions[p + 2] = z
    this.velocities[p] = (Math.random() - .5) * 1.8 + .6 // gentle drift
    this.velocities[p + 1] = -0.7 - Math.random() * 0.9 // gentle downward fall
    this.velocities[p + 2] = -0.8 - Math.random() * 1.4 // downstream breeze
    const palette = Math.random()
    if (palette < 0.45) { // Warm gold
      this.colors[p] = 0.96; this.colors[p + 1] = 0.72; this.colors[p + 2] = 0.15
    } else if (palette < 0.8) { // Orange amber
      this.colors[p] = 0.90; this.colors[p + 1] = 0.48; this.colors[p + 2] = 0.12
    } else { // Lime green
      this.colors[p] = 0.62; this.colors[p + 1] = 0.82; this.colors[p + 2] = 0.22
    }
    this.ages[i] = 0; this.lifetimes[i] = 3.5 + Math.random() * 4.2
    this.sizes[i] = .22 + Math.random() * .18; this.alpha[i] = .88; this.isLeaf[i] = 1; this.totalEmitted++
  }

  update(dt: number, x: number, z: number, vx: number, vz: number, rapid: number, running: boolean, waterY = 0) {
    if (running) {
      const turn = Math.abs(vx)
      const speed = Math.hypot(vx, vz) * 3.6
      this.emission += dt * (32 + turn * 35 + rapid * 85)
      const count = Math.floor(this.emission); this.emission -= count
      const side = Math.sign(vx)
      this.emit(x + side * 1.9, waterY + .2, z + .2, count, 1.4 + turn * .45 + rapid * 1.8, side, vx, vz, 1.2 + rapid * .5)
      if (Math.random() < dt * 35) this.emit(x + (Math.random() - .5) * 3.2, waterY + .12, z + 2.2, 5, 1.4, 0, vx, 0)

      // Continuous Bow Spray at speed
      this.emitBowSpray(x, waterY, z, vx, vz, speed, dt)

      // Rapid foam geysers bursting around the raft
      if (rapid > 0.15) {
        const rapidCount = Math.floor(dt * rapid * 65)
        for (let r = 0; r < rapidCount; r++) {
          const idx = this.cursor++ % this.capacity, p = idx * 3
          const rx = x + (Math.random() - 0.5) * 8.5
          const rz = z + (Math.random() - 0.5) * 9.5
          this.positions[p] = rx
          this.positions[p + 1] = waterY + 0.08
          this.positions[p + 2] = rz
          this.velocities[p] = (Math.random() - 0.5) * 3.2
          this.velocities[p + 1] = 1.8 + Math.random() * 4.5 * rapid
          this.velocities[p + 2] = (Math.random() - 0.5) * 3.5
          this.colors[p] = 0.95; this.colors[p + 1] = 0.99; this.colors[p + 2] = 1.0
          this.ages[idx] = 0; this.lifetimes[idx] = 0.4 + Math.random() * 0.6
          this.sizes[idx] = 0.24 + Math.random() * 0.35; this.alpha[idx] = 0.92; this.isLeaf[idx] = 0; this.totalEmitted++
        }
      }

      // Ambient wind-blown leaves drifting in the canyon breeze
      this.leafTimer += dt
      if (this.leafTimer > 0.08) {
        this.leafTimer = 0
        const lx = x + (Math.random() - .5) * 44
        const ly = waterY + 4 + Math.random() * 12
        const lz = z - 28 + Math.random() * 45
        this.emitWindLeaf(lx, ly, lz)
      }
    }
    for (let i = 0; i < this.capacity; i++) {
      if (this.alpha[i] <= 0) continue
      this.ages[i] += dt
      const p = i * 3, life = this.ages[i] / this.lifetimes[i]
      if (life >= 1) { this.alpha[i] = 0; continue }
      if (this.isLeaf[i] > 0.5) {
        // Leaves flutter gently side-to-side in the breeze
        this.positions[p] += (this.velocities[p] + Math.sin(this.ages[i] * 3.5 + i) * 1.2) * dt
        this.positions[p + 1] += this.velocities[p + 1] * dt
        this.positions[p + 2] += this.velocities[p + 2] * dt
        if (this.positions[p + 1] < waterY + .04) { this.alpha[i] = 0; continue }
        this.alpha[i] = Math.sin(life * Math.PI) * .92
      } else {
        this.velocities[p + 1] -= 8.2 * dt
        this.positions[p] += this.velocities[p] * dt
        this.positions[p + 1] += this.velocities[p + 1] * dt
        this.positions[p + 2] += this.velocities[p + 2] * dt
        if (this.positions[p + 1] < waterY + .02) { this.positions[p + 1] = waterY + .02; this.velocities[p + 1] = 0; this.velocities[p + 2] -= dt * 3 }
        this.alpha[i] = Math.pow(1 - life, 1.4) * .95
      }
    }
    for (const attribute of ['position', 'aSize', 'aAlpha', 'aColor', 'aIsLeaf']) this.geometry.getAttribute(attribute).needsUpdate = true
  }
  clear() { this.alpha.fill(0); this.emission = 0 }
  get active() { let count = 0; for (const a of this.alpha) if (a > 0) count++; return count }
}
