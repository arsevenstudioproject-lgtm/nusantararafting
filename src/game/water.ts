import * as THREE from 'three'
import { HALF_WIDTH, WATERFALL_DROP, WATERFALL_START, plungeFoamIntensity, rapidIntensity, riverCenter, riverSpline, whirlpools } from './level'
import { createWaterNoiseLut, RIVER_WATER_FRAGMENT, WATER_FOAM_CAPACITY, WATER_RIPPLE_CAPACITY } from './waterShader'

export class RiverWater {
  mesh: THREE.Mesh
  material: THREE.ShaderMaterial
  private noiseLut: THREE.DataTexture
  private rippleData = new Float32Array(WATER_RIPPLE_CAPACITY * 4)
  private rippleCount = 0
  private rippleCursor = 0
  private lastWakeRipple = -Infinity
  constructor(scene: THREE.Scene) {
    // CARA 1: Custom BufferGeometry dengan Frenet Frames (DIREKOMENDASIKAN):
    // 1. Ambil titik-titik dari kurva CatmullRomCurve3:
    const segments = 2200 // ~1m per baris agar muka jeram curam tetap tajam
    const points = riverSpline.getSpacedPoints(segments)
    // 2. Hitung Frenet Frames sepanjang kurva 3D:
    const frames = riverSpline.computeFrenetFrames(segments, false)

    // 3. Buat posisi vertex kiri dan kanan sungai dengan melakukan iterasi pada titik tersebut,
    // lalu gunakan lateral vector (perpendicular to tangent and surface normal) dikalikan lebar sungai
    const riverWidth = HALF_WIDTH + 1.2
    const columns = 16
    const vertices: number[] = []
    const uvs: number[] = []
    const rapids: number[] = []
    const indices: number[] = []

    for (let i = 0; i <= segments; i++) {
      const pt = points[i]
      const T = frames.tangents[i]
      // Vektor samping horizontal murni: permukaan air selalu rata dari tepi ke tepi
      // (frame Frenet bisa terpuntir di turunan curam dan membuat satu sisi air terangkat menutupi rakit)
      const side = new THREE.Vector3(-T.z, 0, T.x).normalize()

      // UV mapping: u across river width (0 to 1), v flowing down the track length
      const v = (i / segments) * 65.0
      const rowS = -pt.z
      const rowRapid = rapidIntensity(rowS)
      // Kemiringan baris: semakin curam, semakin putih & bergolak
      const steep = Math.min(1, Math.max(0, -T.y) * 1.6)
      const rowPlunge = plungeFoamIntensity(rowS)

      for (let c = 0; c <= columns; c++) {
        const u = c / columns
        const lat = (u * 2 - 1) * riverWidth

        vertices.push(
          pt.x + side.x * lat,
          pt.y + side.y * lat,
          pt.z + side.z * lat,
        )
        uvs.push(u, v)
        rapids.push(Math.max(rowRapid, steep), rowPlunge, steep)

        if (i < segments && c < columns) {
          const a = i * (columns + 1) + c
          const b = a + columns + 1
          indices.push(a, a + 1, b, b, a + 1, b + 1)
        }
      }
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    geometry.setAttribute('aRapid', new THREE.Float32BufferAttribute(rapids, 3))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()
    this.noiseLut = createWaterNoiseLut()
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }, uRaft: { value: new THREE.Vector2() }, uMotion: { value: new THREE.Vector2() },
        uNoiseLUT: { value: this.noiseLut },
        uRipples: { value: this.rippleData }, uRippleCount: { value: 0 },
        uFoamSources: { value: new Float32Array(WATER_FOAM_CAPACITY * 3) }, uFoamCount: { value: 0 },
        uWhirls: { value: whirlpools.map(whirl => new THREE.Vector4(riverCenter(whirl.s) + whirl.offset, -whirl.s, whirl.radius, whirl.direction)) },
        uFog: { value: new THREE.Color('#9bdcf6') },
        uDeepColor: { value: new THREE.Color('#064875') }, uShallowColor: { value: new THREE.Color('#18bed8') },
        uSkyLowColor: { value: new THREE.Color('#38aed4') }, uSkyHighColor: { value: new THREE.Color('#d6f5ff') },
        uSunDirection: { value: new THREE.Vector3(-.45, .82, -.35).normalize() },
        uFlowSpeed: { value: 1.55 }, uRippleBoost: { value: 1.2 }, uReflectionStrength: { value: .82 },
        uShoreGlow: { value: .22 }, uSpecularPower: { value: 76 }, uSpecularIntensity: { value: 1.0 }, uWaterOpacity: { value: 1 },
        uDropStart: { value: WATERFALL_START }, uDropDepth: { value: WATERFALL_DROP }, uRain: { value: 0 },
      },
      vertexShader: `
        uniform float uTime;
        uniform vec2 uRaft;
        uniform float uDropStart;
        uniform float uDropDepth;
        uniform float uRain;
        uniform vec4 uWhirls[${whirlpools.length}];
        attribute vec3 aRapid;
        varying vec3 vWorld;
        varying vec2 vUv;
        varying float vWave;
        varying vec3 vRapid;
        void main() {
          vUv = uv;
          vRapid = aRapid;
          vec3 p = position;
          float s=-p.z;
          float rapidUp = smoothstep(595.,620.,s) * (1.-smoothstep(710.,735.,s));
          float rapidMiddle = smoothstep(970.,995.,s) * (1.-smoothstep(1080.,1110.,s));
          float rapidLate = smoothstep(1410.,1440.,s) * (1.-smoothstep(1525.,1550.,s));
          float rapidDown = smoothstep(uDropStart+2.,uDropStart+14.,s) * (1.-smoothstep(uDropStart+72.,uDropStart+100.,s));
          float rapid = max(max(max(rapidUp,rapidMiddle),max(rapidLate,rapidDown)), aRapid.x * 1.15);
          float caveFlow = smoothstep(470.,485.,-p.z) * (1.-smoothstep(575.,590.,-p.z));
          float wave = sin(p.z*.95 + uTime*4.8 + sin(p.x*.4))* .10;
          wave += sin(p.x*1.3 + p.z*.46 + uTime*3.)*.07;
          wave += rapid * (sin(p.z*.78 + uTime*7.5 + sin(p.x*.45)*.8)*.48
            + abs(sin(p.z*1.05 + uTime*5.2 + p.x*.35))*.34
            + sin(p.x*1.2 + p.z*.52 + uTime*4.)*.22);
          wave += caveFlow * sin(p.z*1.5 + uTime*11.) * .16;
          // Gelombang berdiri (standing wave) & hidrolik di kaki jeram
          wave += aRapid.y * (abs(sin(p.x*.9 + uTime*9.)) * .22 + sin(p.z*2.1 - uTime*12.) * .12);
          // Riak bergerigi di muka jeram yang curam
          wave += aRapid.z * sin(p.z*3.2 + uTime*14. + p.x*.6) * .08;
          wave += uRain * (sin(p.z*.77+uTime*4.3+sin(p.x*.3))*.025 + abs(sin(p.x*1.1+p.z*.48+uTime*3.1))*.018);
          for(int i=0;i<${whirlpools.length};i++) {
            vec2 delta=vec2(p.x-uWhirls[i].x,p.z-uWhirls[i].y);
            float core=exp(-dot(delta,delta)/(uWhirls[i].z*uWhirls[i].z*.32));
            p.y-=core*.26;
          }
          // Redam ombak tepat di bawah rakit agar rakit tidak tampak tenggelam di busa jeram
          vec2 toRaft = p.xz - uRaft;
          float raftCalm = smoothstep(2.2, 6.5, length(toRaft * vec2(1., .8)));
          wave = mix(min(wave, .05), wave, raftCalm);
          p.y += wave;
          vWave = wave;
          vWorld = (modelMatrix * vec4(p,1.)).xyz;
          gl_Position = projectionMatrix * viewMatrix * vec4(vWorld,1.);
        }
      `,
      fragmentShader: RIVER_WATER_FRAGMENT,
      side: THREE.DoubleSide,
    })
    this.mesh = new THREE.Mesh(geometry, this.material); this.mesh.name = 'Flowing turquoise river'; scene.add(this.mesh)

  }
  update(time: number, x: number, z: number, vx: number, vz: number, rocks: { x: number; z: number; radius: number }[], rain = 0) {
    this.material.uniforms.uTime.value = time
    this.material.uniforms.uRaft.value.set(x, z); this.material.uniforms.uMotion.value.set(vx, vz)
    this.material.uniforms.uRain.value = rain
    const foamSources = this.material.uniforms.uFoamSources.value as Float32Array
    const foamCount = Math.min(rocks.length, WATER_FOAM_CAPACITY)
    for (let i = 0; i < foamCount; i++) {
      const rock = rocks[i], offset = i * 3
      foamSources[offset] = rock.x; foamSources[offset + 1] = rock.z; foamSources[offset + 2] = rock.radius
    }
    this.material.uniforms.uFoamCount.value = foamCount
    if (Math.hypot(vx, vz) > 2.4 && time - this.lastWakeRipple > .42) {
      this.spawnRipple(x + (Math.random() - .5) * .65, z + .8, time, Math.min(1.25, .55 + Math.hypot(vx, vz) * .035))
      this.lastWakeRipple = time
    }
  }
  private spawnRipple(x: number, z: number, time: number, strength: number) {
    const offset = this.rippleCursor * 4
    this.rippleData[offset] = x; this.rippleData[offset + 1] = time
    this.rippleData[offset + 2] = z; this.rippleData[offset + 3] = strength
    this.rippleCursor = (this.rippleCursor + 1) % WATER_RIPPLE_CAPACITY
    this.rippleCount = Math.min(this.rippleCount + 1, WATER_RIPPLE_CAPACITY)
    this.material.uniforms.uRippleCount.value = this.rippleCount
  }
  dispose() {
    this.noiseLut.dispose()
    this.mesh.geometry.dispose()
    this.material.dispose()
  }
}
