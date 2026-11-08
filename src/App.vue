<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import {
  ArrowLeft, ArrowRight, ArrowUpRight, Camera, Check, ChevronRight,
  Flag, Focus, Gauge, Heart, HelpCircle, Keyboard, Leaf,
  LockKeyhole, Maximize, Minimize, Mountain, Palette, Pause, Play, RotateCcw,
  Settings2, ShieldCheck, Sparkles, Star, Timer, Trophy, Volume2, VolumeX,
  Waves, X, Zap,
} from 'lucide-vue-next'
import { RiverEngine } from './game/engine'
import { FINISH, medalFor, sections } from './game/level'
import { readProgress, readSettings, save } from './game/storage'
import { PADDLE_SKINS, type PaddleSkinDef, RAFT_SKINS, type RaftSkinDef } from './game/raft'
import type { GameState, TrackingState } from './game/types'

const canvas = ref<HTMLCanvasElement>()
const lensCanvas = ref<HTMLCanvasElement>()
const panelElement = ref<HTMLElement>()
const cameraPreview = ref<HTMLElement>()
const panel = ref<'levels' | 'settings' | 'help' | 'garage' | null>(null)
const garageTab = ref<'raft' | 'paddle'>('raft')
const selectedGameType = ref<'expedition' | 'endless'>('expedition')
const fullscreen = ref(false)


const state = reactive<GameState>({
  mode: 'menu',
  gameType: 'expedition',
  ready: false,
  error: '',
  time: 0,
  distance: 12,
  speed: 0,
  health: 100,
  stamina: 100,
  boosting: false,
  braking: false,
  nosCharges: 1,
  nosActive: false,
  parachuteCharges: 1,
  parachuteActive: false,
  parachuteTimeLeft: 0,
  coins: 0,
  hasShield: false,
  magnetActive: false,
  magnetTimeLeft: 0,
  feverActive: false,
  feverTimeLeft: 0,
  stuntText: '',
  stars: 0,
  score: 0,
  checkpoint: 0,
  section: 0,
  hits: 0,
  combo: 0,
  nearMissCount: 0,
  isAirborne: false,
  toast: '',
  toastType: 'info',
  onDock: true,
  dockCountdown: 5,
  isMultiplayer: false,
  opponentName: '',
  opponentDistance: 0,
  opponentScore: 0,
  opponentHealth: 100,
})

const tracking = reactive<TrackingState>({
  status: 'off',
  message: 'Kamera tidak aktif',
  yaw: 0,
  pitch: 0,
  steering: 0,
  calibration: 0,
  nodAction: 'none',
})

const settings = reactive(readSettings())
const progress = reactive(readProgress())
let engine: RiverEngine | undefined
let previousFocus: HTMLElement | null = null
let previousVolume = .55

const hasCamera = computed(() => ['tracking', 'lost', 'calibrating'].includes(tracking.status))
const isResult = computed(() => state.mode === 'won' || state.mode === 'lost')
const isOverlay = computed(() => !!panel.value || state.mode === 'paused' || isResult.value)
const percent = computed(() => Math.max(0, Math.min(100, (state.distance - 12) / (FINISH - 12) * 100)))
const medal = computed(() => state.mode === 'won' ? medalFor(state.stars, state.health) : 0)
const section = computed(() => sections[Math.min(state.section, sections.length - 1)] || sections[0])
const time = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`
// Minimap removed for clean HUD

const levels = [
  { title: 'Sungai Hijau', terrain: 'Hutan tropis', desc: 'Awal dari cerita besarmu.', image: 'sungai', level: '01', icon: Leaf },
  { title: 'Lembah Batu', terrain: 'Ngarai berbatu', desc: 'Di balik tebing yang menjulang.', image: 'batu', level: '02', icon: Mountain },
  { title: 'Air Terjun', terrain: 'Kabut & ketinggian', desc: 'Keberanian bertemu keindahan.', image: 'terjun', level: '03', icon: Waves },
  { title: 'Arus Liar', terrain: 'Jeram ekstrem', desc: 'Untuk jiwa yang tak kenal diam.', image: 'arus', level: '04', icon: Gauge },
]

function launchRaft() {
  engine?.launchRaft()
}

async function start(type = selectedGameType.value) {
  selectedGameType.value = type
  panel.value = null
  await engine?.start(type)
}

function showPanel(value: typeof panel.value) {
  if (state.mode === 'playing') engine?.pause()
  panel.value = value
}

function closePanel() { panel.value = null }
function menu() { panel.value = null; engine?.menu() }

function toggleSound() {
  if (settings.volume > 0) {
    previousVolume = settings.volume
    settings.volume = 0
  } else {
    settings.volume = previousVolume || .55
  }
}

async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen()
    else await document.documentElement.requestFullscreen()
  } catch {
    engine?.toast('Layar penuh tidak tersedia di browser ini.')
  }
}

function fullscreenChange() { fullscreen.value = !!document.fullscreenElement }
function reload() { window.location.reload() }

async function enableCamera() {
  if (!engine) return
  settings.control = 'head'
  await engine.head.enable()
}

function setTouch(event: PointerEvent, value: number) {
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  if (engine) engine.input.touch = value
}
function releaseTouch() { if (engine) engine.input.touch = 0 }
function setTouchBoost(val: boolean) { if (engine) engine.input.touchBoost = val }
function setTouchBrake(val: boolean) { if (engine) engine.input.touchBrake = val }
function triggerNos() {
  if (engine) {
    engine.input.touchNos = true
    setTimeout(() => { if (engine) engine.input.touchNos = false }, 120)
  }
}
function triggerParachute() {
  if (engine && (state.parachuteCharges > 0 || state.parachuteActive)) {
    engine.input.touchParachute = true
    setTimeout(() => { if (engine) engine.input.touchParachute = false }, 140)
  }
}

interface ScreenDroplet {
  x: number
  y: number
  radius: number
  alpha: number
  vy: number
  life: number
  maxLife: number
}
const screenDroplets: ScreenDroplet[] = []
let dropletRaf = 0
let lastDropletTime = performance.now()

function addScreenDroplets(count: number, intensity = 1.0) {
  if (!lensCanvas.value) return
  const w = lensCanvas.value.width, h = lensCanvas.value.height
  for (let i = 0; i < count; i++) {
    screenDroplets.push({
      x: Math.random() * w,
      y: Math.random() * h * 0.88,
      radius: (5 + Math.random() * 15) * Math.min(1.8, intensity),
      alpha: (0.6 + Math.random() * 0.38) * Math.min(1.0, intensity),
      vy: 18 + Math.random() * 55,
      life: 0,
      maxLife: 1.8 + Math.random() * 1.6,
    })
  }
}

function updateDroplets() {
  const now = performance.now()
  const dt = Math.min(0.1, (now - lastDropletTime) / 1000)
  lastDropletTime = now

  if (lensCanvas.value) {
    const cvs = lensCanvas.value
    if (cvs.width !== window.innerWidth || cvs.height !== window.innerHeight) {
      cvs.width = window.innerWidth
      cvs.height = window.innerHeight
    }
    const ctx = cvs.getContext('2d')
    if (ctx) {
      ctx.clearRect(0, 0, cvs.width, cvs.height)
      for (let i = screenDroplets.length - 1; i >= 0; i--) {
        const d = screenDroplets[i]
        d.life += dt
        if (d.life >= d.maxLife) {
          screenDroplets.splice(i, 1)
          continue
        }
        d.y += d.vy * dt
        const progress = d.life / d.maxLife
        const fade = progress < 0.15 ? progress / 0.15 : Math.pow(1 - (progress - 0.15) / 0.85, 1.5)
        const currentAlpha = d.alpha * fade

        // Draw refractive glassy droplet
        ctx.save()
        ctx.beginPath()
        ctx.arc(d.x, d.y, d.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(220, 245, 255, ${currentAlpha * 0.22})`
        ctx.fill()
        ctx.lineWidth = 1.2
        ctx.strokeStyle = `rgba(18, 55, 75, ${currentAlpha * 0.35})`
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(d.x, d.y, d.radius * 0.82, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(255, 255, 255, ${currentAlpha * 0.55})`
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(d.x - d.radius * 0.32, d.y - d.radius * 0.32, d.radius * 0.32, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${currentAlpha * 0.88})`
        ctx.fill()
        ctx.restore()
      }
    }
  }
  dropletRaf = requestAnimationFrame(updateDroplets)
}

function buyOrEquipRaftSkin(skin: RaftSkinDef) {
  if (!progress.unlockedRaftSkins.includes(skin.id)) {
    if (progress.totalStars < skin.price) {
      engine?.toast(`Bintang belum cukup! Butuh ${skin.price} bintang.`, 'hit', 2)
      return
    }
    progress.totalStars -= skin.price
    progress.unlockedRaftSkins.push(skin.id)
    save('progress', progress)
    engine?.toast(`Warna rakit ${skin.name} berhasil dibuka!`, 'star', 2.5)
  }
  settings.raftSkin = skin.id
  save('settings', settings)
  engine?.applySettings()
}

function buyOrEquipPaddleSkin(skin: PaddleSkinDef) {
  if (!progress.unlockedPaddleSkins.includes(skin.id)) {
    if (progress.totalStars < skin.price) {
      engine?.toast(`Bintang belum cukup! Butuh ${skin.price} bintang.`, 'hit', 2)
      return
    }
    progress.totalStars -= skin.price
    progress.unlockedPaddleSkins.push(skin.id)
    save('progress', progress)
    engine?.toast(`Dayung ${skin.name} berhasil dibuka!`, 'star', 2.5)
  }
  settings.paddleSkin = skin.id
  save('settings', settings)
  engine?.applySettings()
}

function overlayKeyboard(event: KeyboardEvent) {
  if (!isOverlay.value) return
  if (event.code === 'Escape' && panel.value) {
    event.preventDefault()
    event.stopImmediatePropagation()
    closePanel()
    return
  }
  if (event.key === 'Tab' && panelElement.value) {
    const focusable = Array.from(panelElement.value.querySelectorAll<HTMLElement>('button:not(:disabled), input, select, [tabindex="0"]'))
    const first = focusable[0], last = focusable.at(-1)
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
  }
}

watch(settings, () => {
  save('settings', settings)
  engine?.applySettings()
  if (settings.control === 'keyboard') engine?.head.stop()
}, { deep: true })

watch(isOverlay, async open => {
  if (open) {
    previousFocus = document.activeElement as HTMLElement
    await nextTick()
    panelElement.value?.querySelector<HTMLElement>('button:not(:disabled)')?.focus()
  } else {
    previousFocus?.focus()
  }
})

onMounted(async () => {
  document.addEventListener('fullscreenchange', fullscreenChange)
  window.addEventListener('keydown', overlayKeyboard, true)
  window.addEventListener('keydown', (e) => {
    if (state.mode === 'playing' && state.onDock && (e.code === 'Space' || e.code === 'Enter')) {
      e.preventDefault()
      launchRaft()
    }
  })
  try {
    engine = new RiverEngine(canvas.value!, state, settings, tracking)
    cameraPreview.value!.appendChild(engine.head.video)
    engine.onComplete = won => {
      progress.totalStars += state.stars
      if (state.gameType === 'endless') {
        progress.endlessBestDistance = Math.max(progress.endlessBestDistance, Math.round(state.distance))
        progress.endlessBestScore = Math.max(progress.endlessBestScore, state.score)
      } else if (won) {
        progress.bestScore = Math.max(progress.bestScore, state.score)
        progress.bestTime = progress.bestTime ? Math.min(progress.bestTime, state.time) : state.time
        progress.medal = Math.max(progress.medal, medalFor(state.stars, state.health))
        progress.completions++
      }
      save('progress', progress)
    }
    await engine.init()
    engine.applySettings()
    engine.onScreenSplash = (intensity: number) => {
      addScreenDroplets(Math.round(24 * intensity), intensity)
    }
    dropletRaf = requestAnimationFrame(updateDroplets)
  } catch (error) {
    state.error = `Game belum dapat dimuat. ${error instanceof Error ? error.message : 'Coba muat ulang halaman.'}`
  }
})

onBeforeUnmount(() => {
  cancelAnimationFrame(dropletRaf)
  engine?.dispose()
  document.removeEventListener('fullscreenchange', fullscreenChange)
  window.removeEventListener('keydown', overlayKeyboard, true)
})
</script>

<template>
  <main class="game-shell" :class="{ 'is-playing': state.mode !== 'menu', 'has-overlay': isOverlay }">
    <canvas ref="canvas" class="game-canvas" aria-label="RiverRush, permainan rafting 3D" />
    <canvas ref="lensCanvas" class="lens-droplets-canvas" />
    <div class="scene-vignette" />

    <div v-if="state.mode === 'menu'" class="home-screen rr-menu-root" :inert="isOverlay">
      <!-- TOP BAR -->
      <header class="rr-top-bar">
        <div class="rr-brand-group" aria-hidden="true"></div>

        <div class="rr-top-actions">
          <!-- Star Pill -->
          <button class="rr-stat-pill rr-star-pill" @click="showPanel('garage')" title="Buka Gudang Rakit & Dayung">
            <span class="rr-pill-icon">⭐</span>
            <span class="rr-pill-num">{{ progress.totalStars || 73 }}</span>
          </button>

          <!-- Settings Button -->
          <button class="rr-icon-btn rr-settings-btn" @click="showPanel('settings')" title="Pengaturan">
            <Settings2 :size="22" />
          </button>
        </div>
      </header>

      <!-- LEFT HERO AREA -->
      <section class="rr-hero-area">
        <!-- Official High-Resolution 3D Logo from Assets -->
        <div class="rr-official-logo-box">
          <img
            src="/nusantara_rafting_assets/logo_main.png"
            alt="Nusantara Rafting - Petualangan Sungai Indonesia"
            class="rr-official-logo-img"
          />
        </div>

        <!-- Description Paragraph -->
        <p class="rr-hero-paragraph">
          Jelajahi sungai-sungai terbaik di seluruh Nusantara,<br />
          atasi rintangan seru, kumpulkan bonus,<br />
          dan capai garis finish!
        </p>

        <!-- Action Buttons -->
        <div class="rr-hero-buttons">
          <!-- Button 1: MULAI PETUALANGAN -->
          <button
            class="rr-action-btn rr-btn-adventure"
            :disabled="!state.ready"
            @click="start('expedition')"
          >
            <span class="rr-play-triangle">▶</span>
            <span class="rr-btn-label">
              {{ !state.ready ? 'MENYIAPKAN SUNGAI…' : 'MULAI PETUALANGAN' }}
            </span>
          </button>

          <!-- Button 2: PILIH LEVEL -->
          <button class="rr-action-btn rr-btn-select-level" @click="showPanel('levels')">
            <span class="rr-map-icon">🗺️</span>
            <span class="rr-btn-label">PILIH LEVEL</span>
          </button>
        </div>
      </section>

      <!-- BOTTOM-RIGHT DESTINATION CARD -->
      <aside class="rr-dest-card" @click="showPanel('levels')">
        <div class="rr-dest-card-header">
          <div class="rr-dest-pin-tag">
            <span class="rr-dest-pin-icon">📍</span>
            <span class="rr-dest-pin-text">DESTINASI BERIKUTNYA</span>
          </div>
          <div class="rr-dest-level-badge">01</div>
        </div>
        <div class="rr-dest-image-box">
          <img src="/previews/sungai.jpg" alt="Sungai Hijau" class="rr-dest-img" />
        </div>
        <div class="rr-dest-info">
          <h3 class="rr-dest-name">Sungai Hijau</h3>
          <div class="rr-dest-badges-row">
            <div class="rr-meta-badge difficulty">
              <span class="rr-bars">
                <i class="active"></i>
                <i class="active"></i>
                <i></i>
              </span>
              <span>Mudah</span>
            </div>
            <div class="rr-meta-badge time">
              <span>🕒</span>
              <span>± 3 menit</span>
            </div>
            <div class="rr-meta-badge stars">
              <span>⭐</span>
              <span>0 / 3</span>
            </div>
          </div>
        </div>
        <button class="rr-dest-chevron-btn" aria-label="Mulai Sungai Hijau" @click.stop="start('expedition')">
          <ChevronRight :size="24" />
        </button>
      </aside>

      <!-- Tropical Jungle Corner Framing (Sesuai Referensi) -->
      <div class="rr-corner-decor corner-bl" aria-hidden="true">
        <img src="/nusantara_rafting_assets/decor_corner_left.png" alt="" class="rr-corner-img" />
      </div>
      <div class="rr-corner-decor corner-br" aria-hidden="true">
        <img src="/nusantara_rafting_assets/decor_corner_right.png" alt="" class="rr-corner-img" />
      </div>
    </div>

    <!-- Live Head Tracking Overlay preview -->
    <div v-show="hasCamera" class="head-cam" :class="{ lost: tracking.status === 'lost' }" aria-label="Pratinjau kamera dan arah kemudi">
      <div ref="cameraPreview" class="head-cam-video">
        <span class="face-guide" />
        <div v-if="tracking.status === 'calibrating'" class="calibration-progress"><i :style="{ width: `${tracking.calibration * 100}%` }" /></div>
        <span class="head-cam-status">
          {{ tracking.status === 'calibrating' ? 'KALIBRASI…' : tracking.status === 'lost' ? 'WAJAH HILANG' : `${Math.abs(Math.round(tracking.yaw * 57.3))}° ${tracking.yaw > .01 ? 'KANAN' : tracking.yaw < -.01 ? 'KIRI' : ''}` }}
          <template v-if="tracking.nodAction === 'boost'"> · ⚡ DAYUNG</template>
          <template v-else-if="tracking.nodAction === 'brake'"> · 🛑 REM</template>
        </span>
      </div>
      <div class="head-cam-meter">
        <span :class="{ on: tracking.steering < -.15 }"><ArrowLeft :size="11" />KIRI</span>
        <div><i :style="{ left: `${50 + tracking.steering * 46}%` }" /></div>
        <span :class="{ on: tracking.steering > .15 }">KANAN<ArrowRight :size="11" /></span>
      </div>
    </div>

    <!-- IN-GAME HUD -->
    <div v-if="state.mode !== 'menu'" class="game-hud" :inert="isOverlay">
      <header class="hud-header">
        <div class="hud-left">
          <span class="hud-brand"><Waves :size="24" /></span>
          <div class="hud-timer">
            <Timer :size="17" />
            <span>{{ time(state.time) }}<small>.{{ Math.floor((state.time % 1) * 100).toString().padStart(2, '0') }}</small></span>
          </div>
        </div>

        <div class="route-progress">
          <template v-if="state.gameType === 'endless'">
            <span><b>JARAK:</b> {{ Math.round(state.distance) }} meter</span>
            <div class="endless-progress-glow"><i :style="{ width: '100%' }" /></div>
          </template>
          <template v-else>
            <span>{{ section.name }} <b>{{ state.section + 1 }} / 8</b></span>
            <div><i :style="{ width: `${percent}%` }" /></div>
          </template>
        </div>

        <div class="hud-actions">
          <button class="icon-button" :aria-label="settings.volume ? 'Matikan suara' : 'Aktifkan suara'" @click="toggleSound">
            <Volume2 v-if="settings.volume" :size="19" />
            <VolumeX v-else :size="19" />
          </button>
          <button class="icon-button pause-button" aria-label="Jeda permainan" @click="engine?.pause()">
            <Pause :size="21" fill="currentColor" />
          </button>
        </div>
      </header>

      <!-- Start Dock Launch Banner (ketika rakit di dermaga kayu - Referensi River Rush "JUMP TO START") -->
      <div v-if="state.onDock && state.mode === 'playing'" class="dock-launch-overlay">
        <div class="dock-launch-box">
          <div class="dock-wood-header">
            <span class="dock-rope left"></span>
            <span class="dock-rope right"></span>
          </div>
          <div class="dock-parchment-banner">
            <div class="dock-arrow-icon">⬆️</div>
            <div class="dock-banner-text">
              <span class="dock-banner-main">JUMP TO START</span>
              <span class="dock-banner-sub">DERMAGA AWAL NUSANTARA</span>
            </div>
            <div class="dock-arrow-icon">⬆️</div>
          </div>
          <div class="dock-prompt-hint">Gerbang terbuka otomatis dalam <b>{{ state.dockCountdown }}</b> detik… atau tekan <b>[SPASI]</b> untuk langsung meluncur!</div>
          <button class="button button-primary btn-launch-dock" @click="launchRaft">
            🚀 BUKA PORTAL & MELUNCUR KE SUNGAI!
          </button>
        </div>
      </div>

      <aside class="hud-stats">
        <!-- MISI UTAMA: KOLEKSI KOIN CR -->
        <div class="hud-clean-coin-card">
          <div class="clean-coin-badge">
            <span class="clean-coin-icon">🪙</span>
            <div class="clean-coin-meta">
              <span class="clean-coin-title">KOIN CR</span>
              <strong class="clean-coin-val">{{ state.coins }}</strong>
            </div>
          </div>
        </div>

      </aside>

      <!-- Active Flight and Combo Overlays -->
      <div v-if="state.parachuteActive" class="parachute-flying-banner">
        🪂 MELAYANG DI UDARA: {{ state.parachuteTimeLeft.toFixed(1) }}s
      </div>
      <div v-if="state.combo > 1" class="combo-badge">
        ⚡ COMBO ×{{ state.combo }}!
      </div>

      <button class="tracking-pill" :class="{ 'camera-on': hasCamera }" @click="showPanel('settings')">
        <Camera v-if="settings.control === 'head'" :size="15" />
        <Keyboard v-else :size="15" />
        <span>{{ settings.control === 'head' ? hasCamera ? tracking.status === 'tracking' ? 'Kepala terdeteksi' : 'Mencari wajah…' : 'Aktifkan kamera' : 'Kontrol keyboard' }}</span>
        <span class="tiny-dot" />
      </button>



      <div class="keyboard-legend">
        <kbd>A</kbd><kbd>D</kbd><span>kemudi / akrobat</span>
        <i />
        <kbd>Space</kbd><kbd>W</kbd><span>dayung</span>
        <i />
        <kbd>S</kbd><span>rem</span>
        <i />
        <kbd>N</kbd><kbd>Shift</kbd><span>NOS</span>
        <i />
        <kbd>F</kbd><kbd>E</kbd><span>parasut</span>
        <i />
        <kbd>Esc</kbd><span>jeda</span>
      </div>

      <!-- Mobile Touch Controls -->
      <div class="touch-steering">
        <div class="touch-left-cluster">
          <button aria-label="Kemudi kiri" @pointerdown="setTouch($event, -1)" @pointerup="releaseTouch" @pointercancel="releaseTouch" @lostpointercapture="releaseTouch">
            <ArrowLeft :size="28" />
          </button>
          <button aria-label="Kemudi kanan" @pointerdown="setTouch($event, 1)" @pointerup="releaseTouch" @pointercancel="releaseTouch" @lostpointercapture="releaseTouch">
            <ArrowRight :size="28" />
          </button>
        </div>
        <div class="touch-right-cluster">
          <button class="touch-action-btn parachute" :class="{ firing: state.parachuteActive }" :disabled="state.parachuteCharges <= 0 && !state.parachuteActive" aria-label="Parasut" @click="triggerParachute">
            <span>🪂 {{ state.parachuteCharges > 0 ? `×${state.parachuteCharges}` : '' }}</span>
          </button>
          <button class="touch-action-btn nos" :class="{ firing: state.nosActive }" :disabled="state.nosCharges <= 0" aria-label="NOS Turbo" @click="triggerNos">
            <Zap :size="22" fill="currentColor" /><span>NOS {{ state.nosCharges > 0 ? `×${state.nosCharges}` : '' }}</span>
          </button>
          <button class="touch-action-btn boost" aria-label="Dayung cepat" @pointerdown="setTouchBoost(true)" @pointerup="setTouchBoost(false)" @pointercancel="setTouchBoost(false)">
            <Zap :size="24" /><span>DAYUNG</span>
          </button>
          <button class="touch-action-btn brake" aria-label="Rem" @pointerdown="setTouchBrake(true)" @pointerup="setTouchBrake(false)" @pointercancel="setTouchBrake(false)">
            <span>REM</span>
          </button>
        </div>
      </div>

      <Transition name="toast">
        <div v-if="state.toast" class="game-toast" :class="state.toastType" role="status">
          <Sparkles v-if="state.toastType === 'star'" :size="17" />
          <Waves v-else-if="state.toastType === 'info'" :size="18" />
          <ShieldCheck v-else :size="18" />
          {{ state.toast }}
        </div>
      </Transition>
      <div class="portrait-hint">Putar perangkat untuk pandangan sungai lebih luas.</div>
    </div>

    <!-- OVERLAYS AND PANELS -->
    <Transition name="overlay">
      <div v-if="isOverlay" class="overlay-backdrop" @click.self="panel ? closePanel() : undefined">
        <section
          ref="panelElement"
          class="panel"
          :class="[`panel-${panel || (isResult ? 'result' : 'pause')}`]"
          role="dialog"
          aria-modal="true"
        >
          <!-- Levels Panel -->
          <template v-if="panel === 'levels'">
            <div class="panel-header">
              <div>
                <span class="eyebrow">PILIH ARAH PETUALANGANMU</span>
                <h2>Alam memanggil.</h2>
              </div>
              <button class="close-button" aria-label="Tutup pilihan level" @click="closePanel"><X :size="22" /></button>
            </div>
            <p class="panel-intro">Mulai dari Sungai Hijau atau tantang dirimu dalam Arus Liar Tanpa Akhir.</p>
            <div class="level-grid">
              <button
                v-for="(level, index) in levels"
                :key="level.title"
                class="level-card"
                :class="{ locked: index > 0 }"
                :disabled="index > 0 || !state.ready"
                @click="start('expedition')"
              >
                <div class="level-image" :class="level.image">
                  <span class="level-number">{{ level.level }}</span>
                  <span v-if="index > 0" class="lock-badge"><LockKeyhole :size="18" /></span>
                  <span v-else class="available-badge"><span class="tiny-dot" /> SIAP DIJELAJAHI</span>
                  <component :is="level.icon" class="landscape-icon" :size="55" />
                </div>
                <div class="level-details">
                  <span class="eyebrow">{{ level.terrain }}</span>
                  <h3>{{ level.title }}</h3>
                  <p>{{ level.desc }}</p>
                  <div class="level-bottom">
                    <span v-if="index === 0" class="star-rating">
                      <Star v-for="n in 3" :key="n" :size="19" :class="{ earned: n <= progress.medal }" :fill="n <= progress.medal ? 'currentColor' : 'none'" />
                    </span>
                    <span v-else class="coming-soon">SEGERA HADIR</span>
                    <ArrowUpRight v-if="index === 0" :size="20" />
                    <LockKeyhole v-else :size="15" />
                  </div>
                </div>
              </button>
            </div>
            <div class="panel-note">
              <Trophy :size="16" />
              <span>{{ progress.bestScore ? `Rekor Sungai Hijau: ${progress.bestScore.toLocaleString('id-ID')} poin · ${time(progress.bestTime)}` : 'Petualangan pertama selalu istimewa. Buat rekormu sendiri.' }}</span>
            </div>
          </template>

          <!-- Garage / Customization Panel -->
          <template v-else-if="panel === 'garage'">
            <div class="panel-header">
              <div>
                <span class="eyebrow">GUDANG & KUSTOMISASI</span>
                <h2>Perlengkapan Petualang.</h2>
              </div>
              <button class="close-button" aria-label="Tutup gudang" @click="closePanel"><X :size="22" /></button>
            </div>
            <div class="garage-balance-row">
              <p class="panel-intro">Kumpulkan bintang di sepanjang sungai untuk membuka perlengkapan baru.</p>
              <div class="garage-stars-balance">
                <Star :size="20" fill="#f6cd59" color="#f6cd59" />
                <strong>{{ progress.totalStars }}</strong> <span>Bintang Tersedia</span>
              </div>
            </div>

            <div class="garage-tabs">
              <button :class="{ active: garageTab === 'raft' }" @click="garageTab = 'raft'">
                <Waves :size="16" /> Warna Rakit ({{ RAFT_SKINS.length }})
              </button>
              <button :class="{ active: garageTab === 'paddle' }" @click="garageTab = 'paddle'">
                <Zap :size="16" /> Jenis Dayung ({{ PADDLE_SKINS.length }})
              </button>
            </div>

            <!-- Raft Skins Grid -->
            <div v-if="garageTab === 'raft'" class="garage-grid">
              <div
                v-for="skin in RAFT_SKINS"
                :key="skin.id"
                class="garage-card"
                :class="{ selected: settings.raftSkin === skin.id, unlocked: progress.unlockedRaftSkins.includes(skin.id) }"
              >
                <div class="card-swatch-box" :style="{ backgroundColor: skin.tubeColor }">
                  <div class="swatch-inner" :style="{ backgroundColor: skin.floorColor }" />
                  <span class="skin-tag">{{ skin.tag }}</span>
                </div>
                <div class="card-info">
                  <h4>{{ skin.name }}</h4>
                  <div class="card-actions">
                    <button
                      v-if="settings.raftSkin === skin.id"
                      class="skin-btn active"
                      disabled
                    >
                      <Check :size="14" /> Terpasang
                    </button>
                    <button
                      v-else-if="progress.unlockedRaftSkins.includes(skin.id)"
                      class="skin-btn equip"
                      @click="buyOrEquipRaftSkin(skin)"
                    >
                      Pasang
                    </button>
                    <button
                      v-else
                      class="skin-btn buy"
                      :disabled="progress.totalStars < skin.price"
                      @click="buyOrEquipRaftSkin(skin)"
                    >
                      <Star :size="13" fill="currentColor" /> {{ skin.price }} Bintang
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Paddle Skins Grid -->
            <div v-else class="garage-grid">
              <div
                v-for="skin in PADDLE_SKINS"
                :key="skin.id"
                class="garage-card"
                :class="{ selected: settings.paddleSkin === skin.id, unlocked: progress.unlockedPaddleSkins.includes(skin.id) }"
              >
                <div class="card-swatch-box paddle-swatch" :style="{ backgroundColor: skin.shaftColor }">
                  <div class="swatch-blade" :style="{ backgroundColor: skin.bladeColor }" />
                  <span class="skin-tag">{{ skin.tag }}</span>
                </div>
                <div class="card-info">
                  <h4>{{ skin.name }}</h4>
                  <div class="card-actions">
                    <button
                      v-if="settings.paddleSkin === skin.id"
                      class="skin-btn active"
                      disabled
                    >
                      <Check :size="14" /> Terpasang
                    </button>
                    <button
                      v-else-if="progress.unlockedPaddleSkins.includes(skin.id)"
                      class="skin-btn equip"
                      @click="buyOrEquipPaddleSkin(skin)"
                    >
                      Pasang
                    </button>
                    <button
                      v-else
                      class="skin-btn buy"
                      :disabled="progress.totalStars < skin.price"
                      @click="buyOrEquipPaddleSkin(skin)"
                    >
                      <Star :size="13" fill="currentColor" /> {{ skin.price }} Bintang
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="panel-note">
              <Check :size="15" /> Kustomisasi langsung terlihat pada rakitmu di dalam permainan.
            </div>
          </template>

          <!-- Settings Panel -->
          <template v-else-if="panel === 'settings'">
            <div class="panel-header">
              <div>
                <span class="eyebrow">SESUAIKAN DENGAN GAYAMU</span>
                <h2>Siap berangkat.</h2>
              </div>
              <button class="close-button" aria-label="Tutup pengaturan" @click="closePanel"><X :size="22" /></button>
            </div>
            <div class="settings-content">
              <label class="setting-title">KENDALI RAKIT</label>
              <div class="control-options">
                <button :class="{ selected: settings.control === 'keyboard' }" @click="settings.control = 'keyboard'">
                  <Keyboard :size="23" />
                  <span>
                    <b>Keyboard</b>
                    <small>A / D kemudi · Space / W dayung · S rem</small>
                  </span>
                  <Check v-if="settings.control === 'keyboard'" :size="17" />
                </button>
                <button :class="{ selected: settings.control === 'head' }" @click="settings.control = 'head'">
                  <Camera :size="23" />
                  <span>
                    <b>Gerakan kepala</b>
                    <small>Miringkan kemudi · Angguk dayung cepat</small>
                  </span>
                  <Check v-if="settings.control === 'head'" :size="17" />
                </button>
              </div>

              <div v-if="settings.control === 'head'" class="camera-settings">
                <div class="camera-status">
                  <span class="control-dot" :class="{ active: hasCamera }" />
                  <b>{{ tracking.status === 'tracking' ? 'Kamera aktif' : tracking.status === 'calibrating' ? 'Kalibrasi posisi netral' : tracking.status === 'lost' ? 'Wajah tidak terlihat' : tracking.status === 'loading' ? 'Menyiapkan kamera…' : 'Kontrol kepala' }}</b>
                </div>
                <p role="status">{{ tracking.message }}</p>
                <div v-if="hasCamera" class="steering-meter">
                  <span>KIRI</span>
                  <div><i :style="{ left: `${50 + tracking.steering * 46}%` }" /></div>
                  <span>KANAN</span>
                </div>
                <div class="camera-buttons">
                  <button v-if="!hasCamera" class="button button-dark" :disabled="tracking.status === 'loading'" @click="enableCamera">
                    <Camera :size="16" />{{ tracking.status === 'loading' ? 'MEMUAT…' : 'AKTIFKAN KAMERA' }}
                  </button>
                  <template v-else>
                    <button class="button button-dark" @click="engine?.head.calibrate()">
                      <Focus :size="16" />KALIBRASI ULANG
                    </button>
                    <button class="text-button" @click="engine?.head.stop()">Matikan kamera</button>
                  </template>
                </div>
                <span class="privacy-note"><ShieldCheck :size="14" /> Video diproses di perangkatmu dan tidak diunggah.</span>
              </div>

              <div class="setting-row">
                <label for="sensitivity">Sensitivitas kepala<small>Seberapa jauh rakit berbelok saat kepala dimiringkan.</small></label>
                <span>{{ settings.sensitivity.toFixed(1) }}×</span>
              </div>
              <input id="sensitivity" v-model.number="settings.sensitivity" type="range" min="0.5" max="2" step="0.1" />

              <div class="setting-row">
                <label for="volume">Suara petualangan<small>Arus sungai, percikan, dan benturan jeram.</small></label>
                <span>{{ Math.round(settings.volume * 100) }}%</span>
              </div>
              <input id="volume" v-model.number="settings.volume" type="range" min="0" max="1" step="0.05" />

              <div class="setting-row quality-row">
                <label for="quality">Kualitas grafis<small>Pilih ringan untuk perangkat dengan daya terbatas.</small></label>
                <select id="quality" v-model="settings.quality">
                  <option value="high">Tinggi</option>
                  <option value="medium">Ringan</option>
                </select>
              </div>

              <div class="setting-row">
                <label>Layar Penuh<small>Tampilkan petualangan di seluruh layar.</small></label>
                <button class="button button-dark" @click="toggleFullscreen">
                  <Minimize v-if="fullscreen" :size="16" />
                  <Maximize v-else :size="16" />
                  {{ fullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh' }}
                </button>
              </div>

              <div class="setting-row" style="border-top: 1px solid #dce0ce; padding-top: 16px;">
                <label>Menu Lainnya<small>Buka gudang kustomisasi atau panduan bermain.</small></label>
                <div style="display:flex; gap: 8px;">
                  <button class="button button-dark" @click="showPanel('garage')">
                    <Palette :size="16" /> Gudang
                  </button>
                  <button class="button button-dark" @click="showPanel('help')">
                    <HelpCircle :size="16" /> Cara Main
                  </button>
                </div>
              </div>
            </div>
            <div class="panel-note"><Check :size="15" /> Pengaturan tersimpan otomatis di perangkat ini.</div>
          </template>

          <!-- Help Panel -->
          <template v-else-if="panel === 'help'">
            <div class="panel-header">
              <div>
                <span class="eyebrow">SEDIKIT BEKAL SEBELUM BERANGKAT</span>
                <h2>Ikuti arusmu.</h2>
              </div>
              <button class="close-button" aria-label="Tutup cara bermain" @click="closePanel"><X :size="22" /></button>
            </div>
            <p class="panel-intro">Sungai membawa rakit maju. Kamu yang memegang kemudi dan tenaga dayung.</p>

            <div class="tutorial-controls">
              <div>
                <span class="tutorial-key"><ArrowLeft :size="30" /></span>
                <h3>Ke kiri / kanan</h3>
                <p><kbd>A</kbd> / <kbd>D</kbd> atau <kbd>←</kbd> / <kbd>→</kbd></p>
                <small>Atau miringkan kepala</small>
              </div>
              <div>
                <span class="tutorial-key"><Zap :size="30" /></span>
                <h3>Dayung Kuat</h3>
                <p><kbd>Space</kbd> atau <kbd>W</kbd></p>
                <small>Dorongan kecepatan sesaat</small>
              </div>
              <div>
                <span class="tutorial-key neutral"><Waves :size="32" /></span>
                <h3>Rem / Tahan Arus</h3>
                <p><kbd>S</kbd> atau <kbd>↓</kbd></p>
                <small>Manuver belokan lebih tajam</small>
              </div>
            </div>

            <div class="help-rules">
              <div>
                <Zap :size="22" />
                <span>
                  <b>Manajemen Tenaga Dayung (Stamina).</b>
                  <p>Mendayung kuat (Space/W) meningkatkan laju rakit tetapi menghabiskan tenaga. Tahan kemudi saat arus tenang agar staminamu pulih kembali.</p>
                </span>
              </div>
              <div>
                <ShieldCheck :size="22" />
                <span>
                  <b>Waspadai Buaya Liar & Pusaran Air.</b>
                  <p>Buaya dapat menyergap tiba-tiba jika rakit melintas dekat. Gunakan dayung kuat untuk lolos dari sergapannya dan hindari terhisap inti pusaran air!</p>
                </span>
              </div>
              <div>
                <Star :size="22" />
                <span>
                  <b>Koleksi Bintang & Buka Kustomisasi.</b>
                  <p>Bintang yang dikumpulkan dapat dipakai di Gudang Rakit untuk membuka warna rakit dan model dayung baru.</p>
                </span>
              </div>
              <div>
                <Sparkles :size="22" />
                <span>
                  <b>Jump Ramp & Parasut Glider [F / E].</b>
                  <p>Lewati tanjakan kayu (Jump Ramp) untuk melesat terbang ke udara dan mendarat dengan cipratan air raksasa! Ambil icon parasut untuk terbang melayang beberapa detik di atas rintangan bebatuan.</p>
                </span>
              </div>
            </div>

            <button class="button button-primary help-start" :disabled="!state.ready" @click="state.mode === 'paused' ? (closePanel(), engine?.resume()) : start()">
              <Play :size="17" fill="currentColor" />
              {{ state.mode === 'paused' ? 'LANJUTKAN PETUALANGAN' : 'AKU SIAP, AYO BERANGKAT' }}
              <ArrowRight :size="18" />
            </button>
          </template>

          <!-- Paused Panel -->
          <template v-else-if="state.mode === 'paused'">
            <div class="pause-symbol"><Pause :size="27" fill="currentColor" /></div>
            <span class="eyebrow">TARIK NAPAS SEJENAK</span>
            <h2>Sungai bisa menunggu.</h2>
            <p class="panel-intro">Petualanganmu dijeda. Kembali saat kamu siap.</p>
            <div class="pause-summary">
              <span><Timer :size="17" />{{ time(state.time) }}</span>
              <span><Star :size="17" />{{ state.stars }}</span>
              <span><Heart :size="17" />{{ Math.ceil(state.health) }}%</span>
              <span><Zap :size="17" />{{ Math.ceil(state.stamina) }}%</span>
            </div>
            <button class="button button-primary" @click="engine?.resume()"><Play :size="17" fill="currentColor" />LANJUTKAN<ArrowRight :size="18" /></button>
            <button class="button button-outline" @click="showPanel('settings')"><Settings2 :size="17" />PENGATURAN</button>
            <div class="pause-links">
              <button @click="start(state.gameType)"><RotateCcw :size="15" /> Mulai ulang</button>
              <button @click="menu">Kembali ke menu<ArrowUpRight :size="15" /></button>
            </div>
          </template>

          <!-- Results Panel -->
          <template v-else-if="isResult">
            <div class="result-icon" :class="{ lost: state.mode === 'lost' }">
              <Trophy v-if="state.mode === 'won'" :size="31" />
              <Waves v-else :size="31" />
            </div>

            <span class="eyebrow">
              {{ state.gameType === 'endless'
                ? 'EKSPEDISI TANPA AKHIR BERAKHIR'
                : state.mode === 'won' ? 'EKSPEDISI SUNGAI HIJAU SELESAI' : 'PETUALANGAN BELUM BERAKHIR'
              }}
            </span>

            <h2>
              {{ state.gameType === 'endless'
                ? `Kamu menempuh ${Math.round(state.distance)} meter!`
                : state.mode === 'won' ? 'Kamu menaklukkan arus.' : 'Arus kali ini lebih kuat.'
              }}
            </h2>

            <p class="panel-intro">
              {{ state.gameType === 'endless'
                ? 'Semua koin yang terkumpul telah ditambahkan ke skormu!'
                : state.mode === 'won'
                  ? 'Bawa pulang ceritanya. Kamu berhasil menyelesaikan rute sungai!'
                  : '🚨 RAKIT TENGGELAM! Kondisi rakit hancur karena terlalu sering menabrak batu sungai. Kamu harus mengulang petualangan dari awal dermaga kayu!'
              }}
            </p>

            <div v-if="state.gameType !== 'endless' && state.mode === 'won'" class="result-medals">
              <Star v-for="n in 3" :key="n" :size="44" :class="{ earned: n <= medal }" :fill="n <= medal ? 'currentColor' : 'none'" />
            </div>

            <div class="result-score">
              <span>SKOR EKSPEDISI</span>
              <strong>{{ state.score.toLocaleString('id-ID') }}</strong>
              <small v-if="state.gameType === 'endless' && state.distance >= progress.endlessBestDistance">
                <Trophy :size="12" /> REKOR JARAK TERJAUH!
              </small>
              <small v-else-if="state.mode === 'won' && state.score >= progress.bestScore">
                <Trophy :size="12" /> REKOR SKOR TERBAIKMU
              </small>
            </div>

            <div class="result-stats">
              <div><Timer :size="18" /><b>{{ time(state.time) }}</b><span>Waktu</span></div>
              <div><Star :size="18" /><b>+{{ state.stars }}</b><span>Bintang</span></div>
              <div><Heart :size="18" /><b>{{ Math.ceil(state.health) }}%</b><span>Kondisi</span></div>
              <div><Flag :size="18" /><b>{{ state.checkpoint }}</b><span>Checkpoint</span></div>
            </div>

            <button class="button button-primary" @click="start(state.gameType)">
              <RotateCcw :size="17" />{{ state.mode === 'won' ? 'ARUNGI SEKALI LAGI' : 'COBA LAGI' }}<ArrowRight :size="18" />
            </button>
            <button class="result-home" @click="menu">Kembali ke menu<ArrowUpRight :size="16" /></button>
          </template>
        </section>
      </div>
    </Transition>

    <div v-if="!state.ready && !state.error" class="loading-badge" role="status">
      <span class="loading-spinner" /> Membangun sungai, menyiapkan petualangan…
    </div>
    <div v-if="state.error" class="error-overlay" role="alert">
      <Waves :size="38" />
      <h2>Arus sedang terhenti.</h2>
      <p>{{ state.error }}</p>
      <button class="button button-primary" @click="reload"><RotateCcw :size="18" />MUAT ULANG</button>
    </div>
    <div class="screen-reader-status" aria-live="polite">
      {{ state.mode === 'playing' ? `Bagian ${state.section + 1}: ${section.name}. ${state.checkpoint} checkpoint.` : '' }}
    </div>

    <!-- Persistent Copyright Footer -->
    <footer class="game-footer">
      <span>© choirul7 2026</span>
    </footer>
  </main>
</template>

<style>
/* ========================================================================= */
/* CLEAN MISSION & HEALTH HUD (KOIN & KONDISI RAKIT)                         */
/* ========================================================================= */
.hud-clean-coin-card {
  margin-bottom: 12px;
}
.clean-coin-badge {
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%);
  border: 2px solid #f59e0b;
  border-radius: 14px;
  padding: 8px 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 4px 16px rgba(245, 158, 11, 0.35);
}
.clean-coin-icon {
  font-size: 26px;
  line-height: 1;
  filter: drop-shadow(0 2px 6px rgba(245, 158, 11, 0.6));
}
.clean-coin-meta {
  display: flex;
  flex-direction: column;
}
.clean-coin-title {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.8px;
  color: #fcd34d;
}
.clean-coin-val {
  font-size: 22px;
  font-weight: 900;
  color: #ffffff;
  font-family: monospace;
  letter-spacing: 1px;
}

.hud-clean-health-card {
  background: rgba(15, 23, 42, 0.9);
  backdrop-filter: blur(10px);
  border: 2px solid rgba(56, 189, 248, 0.3);
  border-radius: 14px;
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.45);
  min-width: 220px;
  transition: all 0.3s ease;
}
.hud-clean-health-card.warning {
  border-color: #f59e0b;
  box-shadow: 0 6px 20px rgba(245, 158, 11, 0.3);
}
.hud-clean-health-card.danger {
  border-color: #ef4444;
  box-shadow: 0 0 24px rgba(239, 68, 68, 0.55);
  animation: pulse 1.2s infinite;
}
.clean-health-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.clean-health-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 800;
  color: #cbd5e1;
}
.clean-health-pct {
  font-size: 15px;
  font-weight: 900;
  color: #10b981;
}
.clean-health-pct.text-danger {
  color: #f43f5e;
}
.clean-health-bar-track {
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  overflow: hidden;
}
.clean-health-bar-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.3s ease, background 0.3s ease;
}
.clean-health-bar-fill.ok {
  background: linear-gradient(90deg, #10b981, #34d399);
}
.clean-health-bar-fill.warning {
  background: linear-gradient(90deg, #f59e0b, #fbbf24);
}
.clean-health-bar-fill.danger {
  background: linear-gradient(90deg, #ef4444, #f43f5e);
}
.clean-health-footer {
  font-size: 10.5px;
  line-height: 1.2;
}
.clean-health-hint {
  color: #94a3b8;
}
.clean-health-warn-pulse {
  color: #f43f5e;
  font-weight: 800;
  display: block;
}

/* Dock Launch Banner Overlay (River Rush Jump to Start Style) */
.dock-launch-overlay {
  position: absolute;
  top: 60px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 40;
  pointer-events: auto;
}
.dock-launch-box {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  max-width: 480px;
  animation: floatDock 2.2s ease-in-out infinite alternate;
}
@keyframes floatDock {
  0% { transform: translateY(0); }
  100% { transform: translateY(-6px); }
}
.dock-wood-header {
  position: absolute;
  top: -14px;
  width: 90%;
  display: flex;
  justify-content: space-between;
  pointer-events: none;
}
.dock-rope {
  width: 4px;
  height: 20px;
  background: repeating-linear-gradient(180deg, #78350f, #92400e 3px, #451a03 5px);
  border-radius: 2px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
}
.dock-parchment-banner {
  background: linear-gradient(180deg, #fef9c3 0%, #fef08a 25%, #fde047 80%, #eab308 100%);
  border: 4px solid #78350f;
  border-radius: 12px;
  padding: 12px 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  box-shadow: 0 14px 35px rgba(0, 0, 0, 0.65), inset 0 2px 4px rgba(255, 255, 255, 0.8), inset 0 -3px 6px rgba(180, 83, 9, 0.4);
  position: relative;
}
.dock-arrow-icon {
  font-size: 26px;
  animation: bounceArrow 0.8s ease-in-out infinite alternate;
}
@keyframes bounceArrow {
  0% { transform: translateY(2px); }
  100% { transform: translateY(-4px); }
}
.dock-banner-text {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.dock-banner-main {
  font-family: 'Barlow Condensed', 'Arial Black', sans-serif;
  font-size: 32px;
  font-weight: 900;
  letter-spacing: 2px;
  color: #451a03;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.8), 0 2px 4px rgba(0, 0, 0, 0.2);
  line-height: 1;
}
.dock-banner-sub {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1.5px;
  color: #854d0e;
  margin-top: 3px;
}
.dock-prompt-hint {
  font-size: 12px;
  font-weight: 600;
  color: #ffffff;
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 999px;
  padding: 4px 14px;
  backdrop-filter: blur(8px);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.7);
}
.dock-prompt-hint b {
  color: #fde047;
}
.btn-launch-dock {
  margin-top: 2px;
  padding: 12px 24px !important;
  font-size: 14px !important;
  font-weight: 900 !important;
  border-radius: 12px !important;
  background: linear-gradient(180deg, #f59e0b 0%, #d97706 100%) !important;
  border-color: #fef08a !important;
  box-shadow: 0 6px 18px rgba(245, 158, 11, 0.45) !important;
  cursor: pointer;
}
.btn-launch-dock:hover {
  transform: translateY(-2px) scale(1.03);
  box-shadow: 0 8px 24px rgba(245, 158, 11, 0.6) !important;
}
</style>
