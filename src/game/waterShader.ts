import * as THREE from 'three'
import { whirlpools } from './level'

// Adapted under MIT from https://github.com/boona13/threejs-grass-water-shaders
export const WATER_RIPPLE_CAPACITY = 32
export const WATER_FOAM_CAPACITY = 48

export function createWaterNoiseLut(resolution = 256) {
  const randomValues = new Float32Array(resolution * resolution)
  let seed = 1337
  for (let i = 0; i < randomValues.length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    randomValues[i] = (seed & 0xffff) / 0xffff
  }
  const smooth = new Float32Array(randomValues.length)
  for (let y = 0; y < resolution; y++) for (let x = 0; x < resolution; x++) {
    smooth[y * resolution + x] = sampleNoiseField(randomValues, resolution, x + .5, y + .5)
  }
  const data = new Uint8Array(resolution * resolution * 4)
  for (let y = 0; y < resolution; y++) for (let x = 0; x < resolution; x++) {
    const right = (x + 1) % resolution, left = (x - 1 + resolution) % resolution
    const up = (y + 1) % resolution, down = (y - 1 + resolution) % resolution
    const index = (y * resolution + x) * 4
    data[index] = Math.round(clamp01(smooth[y * resolution + x]) * 255)
    data[index + 1] = Math.round(clamp01((smooth[y * resolution + right] - smooth[y * resolution + left]) * (-1 / 3) + .5) * 255)
    data[index + 2] = Math.round(clamp01((smooth[up * resolution + x] - smooth[down * resolution + x]) * (-1 / 3) + .5) * 255)
    data[index + 3] = 255
  }
  const texture = new THREE.DataTexture(data, resolution, resolution, THREE.RGBAFormat, THREE.UnsignedByteType)
  texture.name = 'River water noise derivatives'
  texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.RepeatWrapping
  texture.magFilter = THREE.LinearFilter; texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.generateMipmaps = true; texture.needsUpdate = true
  return texture
}

function sampleNoiseField(field: Float32Array, size: number, x: number, y: number) {
  const ix = Math.floor(x), iy = Math.floor(y), dx = x - ix, dy = y - iy
  let value = 0
  for (let ky = -1; ky <= 2; ky++) {
    const sy = (iy + ky + size) % size, wy = bsplineWeight(dy - ky)
    for (let kx = -1; kx <= 2; kx++) {
      const sx = (ix + kx + size) % size
      value += field[sy * size + sx] * bsplineWeight(dx - kx) * wy
    }
  }
  return value
}

function bsplineWeight(value: number) {
  const t = Math.abs(value)
  if (t < 1) return (3 * t * t * t - 6 * t * t + 4) / 6
  if (t < 2) { const v = 2 - t; return v * v * v / 6 }
  return 0
}

function clamp01(value: number) { return Math.max(0, Math.min(1, value)) }

export const RIVER_WATER_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform vec2 uRaft;
  uniform vec2 uMotion;
  uniform vec4 uWhirls[${whirlpools.length}];
  uniform vec3 uFog;
  uniform vec3 uDeepColor;
  uniform vec3 uShallowColor;
  uniform vec3 uSkyLowColor;
  uniform vec3 uSkyHighColor;
  uniform vec3 uSunDirection;
  uniform sampler2D uNoiseLUT;
  uniform float uRipples[${WATER_RIPPLE_CAPACITY * 4}];
  uniform int uRippleCount;
  uniform float uFoamSources[${WATER_FOAM_CAPACITY * 3}];
  uniform int uFoamCount;
  uniform float uDropStart;
  uniform float uRain;
  uniform float uFlowSpeed;
  uniform float uRippleBoost;
  uniform float uReflectionStrength;
  uniform float uShoreGlow;
  uniform float uSpecularPower;
  uniform float uSpecularIntensity;
  uniform float uWaterOpacity;
  varying vec3 vWorld;
  varying vec2 vUv;
  varying float vWave;
  varying vec3 vRapid;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p); f *= f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  vec2 octaveFlowDir(int octave) {
    float seed = float(octave) * 5.17 + 17.0;
    float angle = fract(sin(seed * 127.1 + 311.7) * 43758.5453) * 6.283185;
    return vec2(cos(angle), sin(angle));
  }
  vec3 waterNormal(vec2 worldXZ) {
    float scales[4]; scales[0] = 2.0; scales[1] = 4.0; scales[2] = 8.0; scales[3] = 12.0;
    float amps[4]; amps[0] = 2.0; amps[1] = 2.0; amps[2] = 0.5; amps[3] = 0.2;
    vec2 gradient = vec2(0.0);
    for (int i = 0; i < 4; i++) {
      float angle = float(i) * 10.1664 + 7.0;
      float c = cos(angle), s = sin(angle);
      mat2 rotation = mat2(c, s, -s, c);
      vec2 flow = octaveFlowDir(i) * uTime * uFlowSpeed;
      vec2 uv = rotation * ((worldXZ * scales[i]) + flow) * 0.012;
      vec3 sampleValue = texture2D(uNoiseLUT, uv).xyz * vec3(1.0, 2.0, 2.0) - vec3(0.5, 1.0, 1.0);
      vec2 octaveGradient = rotation * (sampleValue.yz * (amps[i] * scales[i] * 0.012));
      gradient += octaveGradient;
    }
    return normalize(vec3(gradient.x * uRippleBoost, 1.0, gradient.y * uRippleBoost));
  }
  vec3 addRipples(vec3 normal, vec2 worldXZ) {
    vec2 gradient = vec2(0.0);
    for (int i = 0; i < ${WATER_RIPPLE_CAPACITY}; i++) {
      if (i >= uRippleCount) break;
      int base = i * 4;
      vec2 source = vec2(uRipples[base], uRipples[base + 2]);
      float age = uTime - uRipples[base + 1];
      float strength = uRipples[base + 3];
      if (age < 0.0 || age > 2.1 || strength < 0.001) continue;
      vec2 delta = worldXZ - source;
      float front = length(delta) - age * 2.7;
      float envelope = exp(-abs(front) * 5.5) * exp(-age * 1.2) * strength;
      gradient += normalize(delta + vec2(0.001)) * sin(front * 13.0 - age * 10.0) * envelope * 0.48;
    }
    return normalize(normal + vec3(gradient.x, 0.0, gradient.y));
  }
  float fresnelSchlick(float ndotv) {
    float f = 1.0 - ndotv;
    return 0.04 + 0.96 * f * f * f * f * f;
  }
  vec3 skyReflection(vec3 direction) {
    float y = clamp(abs(direction.y) + 0.12, 0.0, 1.0);
    float blend = pow(clamp(1.0 - pow(1.0 - y, 12.0), 0.0, 1.0), 0.68);
    return mix(uSkyLowColor, uSkyHighColor, blend);
  }
  float intersectionFoam(vec2 worldXZ, float fineNoise) {
    float foam = 0.0;
    for (int i = 0; i < ${WATER_FOAM_CAPACITY}; i++) {
      if (i >= uFoamCount) break;
      int base = i * 3;
      vec2 delta = worldXZ - vec2(uFoamSources[base], uFoamSources[base + 1]);
      float radius = uFoamSources[base + 2];
      float distanceToRock = length(delta / vec2(1.0, 1.25));
      float ring = (1.0 - smoothstep(0.18, 1.45, abs(distanceToRock - radius))) * smoothstep(0.28, 0.63, fineNoise);
      float wake = step(delta.y, 0.0) * step(-3.8, delta.y) * exp(delta.y * 0.45)
        * (1.0 - smoothstep(radius * 0.6, radius + 1.2, abs(delta.x + sin(delta.y * 0.6 + uTime * 2.5) * 0.35)));
      foam = max(foam, max(ring, wake * 0.72));
    }
    return foam;
  }
  void main() {
    vec2 p = vWorld.xz;
    float s = -p.y;
    float caveArea = smoothstep(470.0, 485.0, s) * (1.0 - smoothstep(575.0, 590.0, s));
    float rapidUp = smoothstep(595.0, 620.0, s) * (1.0 - smoothstep(710.0, 735.0, s));
    float rapidMiddle = smoothstep(970.0, 995.0, s) * (1.0 - smoothstep(1080.0, 1110.0, s));
    float rapidLate = smoothstep(1410.0, 1440.0, s) * (1.0 - smoothstep(1525.0, 1550.0, s));
    float rapidDown = smoothstep(uDropStart + 2.0, uDropStart + 14.0, s) * (1.0 - smoothstep(uDropStart + 72.0, uDropStart + 100.0, s));
    float rapid = max(max(max(rapidUp, rapidMiddle), max(rapidLate, rapidDown)), vRapid.x);

    vec2 flow = vec2(p.x * 0.55, p.y * 0.38 + uTime * 1.5);
    float vortexFoam = 0.0, vortexCore = 0.0;
    for (int i = 0; i < ${whirlpools.length}; i++) {
      vec4 whirl = uWhirls[i];
      vec2 delta = p - whirl.xy;
      float radius = length(delta);
      float influence = 1.0 - smoothstep(whirl.z * 0.78, whirl.z * 1.72, radius);
      float angle = atan(delta.y, delta.x);
      float spin = angle + uTime * whirl.w * 2.3 * influence;
      vec2 rotated = whirl.xy + vec2(cos(spin), sin(spin)) * radius;
      flow = mix(flow, vec2(rotated.x * 0.55, rotated.y * 0.38 + uTime * 1.5), influence * 0.92);
      float spiral = pow(max(0.0, cos(angle * 2.6 + radius * 1.05 - uTime * whirl.w * 2.6)), 14.0);
      vortexFoam = max(vortexFoam, spiral * influence);
      vortexCore = max(vortexCore, exp(-radius * radius / (whirl.z * whirl.z * 0.085)));
    }
    float broad = noise(flow * 0.53 + noise(flow * 0.2));
    float fine = noise(flow * 3.8 + vec2(sin(flow.y), sin(flow.x)) * 0.55);
    float streak = sin(p.x * 3.4 + sin(p.y * 0.8 + uTime * 3.0) * 1.3 + noise(flow) * 3.0);

    vec3 normal = addRipples(waterNormal(p), p);
    vec3 viewDir = normalize(cameraPosition - vWorld);
    vec3 lightDir = normalize(uSunDirection);
    float ndotv = max(dot(normal, viewDir), 0.0);
    float ndotl = max(dot(normal, lightDir), 0.0);
    vec3 reflected = skyReflection(reflect(-viewDir, normal));
    float fresnel = max(fresnelSchlick(ndotv), 0.06 + uReflectionStrength * 0.35 * (1.0 - ndotv));

    // Vibrant stylized toon water palette
    float shore = smoothstep(0.24, 0.49, abs(vUv.x - 0.5));
    float depth = clamp(0.12 + (1.0 - shore) * 0.82 + broad * 0.15, 0.0, 1.0);
    vec3 shallowTurquoise = vec3(0.08, 0.76, 0.86);
    vec3 deepNavy = vec3(0.024, 0.28, 0.48);
    vec3 body = mix(shallowTurquoise, deepNavy, depth);
    float blueMottle = noise(vec2(flow.x * 0.74 + uTime * 0.025, flow.y * 0.42 - uTime * 0.18));
    float blueStreak = smoothstep(0.42, 0.86, blueMottle * 0.7 + fine * 0.3);
    vec3 vividCyan = mix(vec3(0.04, 0.45, 0.76), vec3(0.12, 0.84, 0.94), blueStreak);
    body = mix(body, vividCyan, 0.35 + rapid * 0.15);
    vec3 color = mix(body, reflected, clamp(fresnel * 0.30, 0.0, 0.42));
    float lowerPool = smoothstep(uDropStart + 1.0, uDropStart + 7.0, s);
    color = mix(color, vec3(0.02, 0.22, 0.44), lowerPool * 0.70);
    color = mix(color, vec3(0.02, 0.11, 0.16), caveArea * 0.58);
    color *= 0.88 + 0.12 * ndotl;

    // Stylized toon shoreline foam
    float edgeDist = abs(vUv.x - 0.5);
    float shoreFoam = smoothstep(0.44, 0.495, edgeDist) * smoothstep(0.28, 0.68, fine) * 1.15;
    shoreFoam += smoothstep(0.478, 0.498, edgeDist) * 0.85;
    float foam = shoreFoam;
    foam += intersectionFoam(p, fine) * 1.4;
    foam += vortexFoam * 0.85;

    // Dual wake foam trails and concentric circular ripples behind raft (matching references)
    vec2 wake = p - uRaft;
    float raftDist = length(wake);
    // Concentric circular ripples around the raft
    float raftRing = (1.0 - smoothstep(0.06, 0.38, abs(raftDist - 2.5))) * 0.85;
    raftRing += (1.0 - smoothstep(0.08, 0.42, abs(raftDist - 3.8))) * 0.5;
    foam += raftRing * (1.0 - smoothstep(4.5, 6.0, raftDist));

    // Parallel dual wake trails trailing behind the raft
    float wakeDistY = wake.y;
    float wakeSpan = smoothstep(0.5, 2.2, wakeDistY) * (1.0 - smoothstep(18.0, 26.0, wakeDistY));
    float trailOffset = 1.38 + wakeDistY * 0.082;
    float leftTrack = 1.0 - smoothstep(0.08, 0.42, abs(wake.x + trailOffset));
    float rightTrack = 1.0 - smoothstep(0.08, 0.42, abs(wake.x - trailOffset));
    float wakeTracks = max(leftTrack, rightTrack);
    // Angled chevron ripples between the two wake lines
    float chevron = sin(wakeDistY * 3.4 - abs(wake.x) * 2.6 - uTime * 6.5);
    float chevronFoam = step(abs(wake.x), trailOffset) * smoothstep(0.48, 0.92, chevron) * 0.65;
    foam += wakeSpan * (wakeTracks * 1.15 + chevronFoam) * smoothstep(0.25, 0.65, fine + 0.2);

    // Whitewater rapids foam surge (Image 3) — dibersihkan tepat di muka & kaki jeram agar pandangan jelas
    float dropMask = 1.0 - clamp(vRapid.z * 1.8 + vRapid.y * 1.2, 0.0, 1.0);
    foam += rapid * dropMask * smoothstep(0.55, 0.92, fine) * smoothstep(0.12, 0.45, vWave) * 1.25;
    foam += rapid * dropMask * smoothstep(0.85, 0.99, streak) * 0.4;
    foam += caveArea * smoothstep(0.52, 0.82, fine) * smoothstep(0.02, 0.18, vWave) * 0.48;
    foam += uRain * smoothstep(0.72, 0.92, fine) * 0.15;

    vec3 halfDir = normalize(viewDir + lightDir);
    float specular = pow(max(dot(normal, halfDir), 0.0), uSpecularPower) * ndotl;
    color += vec3(1.0, 0.98, 0.92) * specular * (uSpecularIntensity * 0.85);
    color += shallowTurquoise * (1.0 - depth) * (uShoreGlow * 0.35);
    color = mix(color, vec3(0.96, 1.0, 1.0), clamp(foam, 0.0, 0.98));
    color = mix(color, vec3(0.005, 0.065, 0.11), vortexCore * 0.85);

    float cameraDistance = length(cameraPosition - vWorld);
    color = mix(color, uFog, smoothstep(85.0, 240.0, cameraDistance));

    gl_FragColor = vec4(color, uWaterOpacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`
