import type { FaceLandmarker } from '@mediapipe/tasks-vision'
import type { TrackingState } from './types'

export function steeringFromTilt(tilt: number, neutral: number, sensitivity: number): number {
  const delta = tilt - neutral, deadZone = .04
  if (Math.abs(delta) <= deadZone) return 0
  // Rentang sudut kemiringan kepala yang lebih nyaman & tidak melelahkan leher (~16 derajat ke arah penuh)
  return Math.max(-1, Math.min(1, Math.sign(delta) * ((Math.abs(delta) - deadZone) / .28) * sensitivity))
}

// Head roll from the outer eye corners, positive when the right ear drops toward the right shoulder.
function tiltFromLandmarks(points: { x: number, y: number }[], aspect: number): number | undefined {
  const right = points[33], left = points[263]
  if (!right || !left) return undefined
  return -Math.atan2(left.y - right.y, (left.x - right.x) * aspect)
}

function pitchFromLandmarks(points: { x: number, y: number }[]): number | undefined {
  const right = points[33], left = points[263], nose = points[1] ?? points[4]
  if (!right || !left || !nose) return undefined
  return nose.y - (right.y + left.y) * .5
}

export class HeadControl {
  state: TrackingState
  video = document.createElement('video')
  private landmarker?: FaceLandmarker
  private stream?: MediaStream
  private session = 0
  private lastFrame = -1
  private lastDetect = 0
  private lastFace = 0
  private neutral = 0
  private neutralPitch = 0
  private samples: number[] = []
  private pitchSamples: number[] = []
  private calibrating = false

  constructor(state: TrackingState) {
    this.state = state
    this.video.muted = true
    this.video.playsInline = true
    this.video.setAttribute('aria-label', 'Pratinjau kamera lokal')
  }

  async enable() {
    this.stop()
    const session = ++this.session
    this.state.status = 'loading'
    this.state.message = 'Menyiapkan kamera dan pelacakan…'
    let stream: MediaStream | undefined
    let landmarker: FaceLandmarker | undefined
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Kamera memerlukan HTTPS atau localhost.')
      stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' }, audio: false })
      if (session !== this.session) { stream.getTracks().forEach(track => track.stop()); return }
      this.stream = stream
      this.video.srcObject = stream
      await this.video.play()
      const { FilesetResolver, FaceLandmarker: Landmarker } = await import('@mediapipe/tasks-vision')
      const files = await FilesetResolver.forVisionTasks(`${import.meta.env.BASE_URL}vision`)
      if (session !== this.session) return
      const options = {
        baseOptions: { modelAssetPath: `${import.meta.env.BASE_URL}vision/face_landmarker.task`, delegate: 'GPU' as const },
        runningMode: 'VIDEO' as const, numFaces: 1, outputFacialTransformationMatrixes: false,
        minFaceDetectionConfidence: .6, minTrackingConfidence: .6,
      }
      try { landmarker = await Landmarker.createFromOptions(files, options) }
      catch { landmarker = await Landmarker.createFromOptions(files, { ...options, baseOptions: { ...options.baseOptions, delegate: 'CPU' } }) }
      if (session !== this.session) { landmarker.close(); return }
      this.landmarker = landmarker
      this.calibrate()
      stream.getVideoTracks()[0]?.addEventListener('ended', () => {
        if (session === this.session) {
          this.stop()
          this.state.status = 'error'
          this.state.message = 'Kamera terputus. Keyboard tetap dapat digunakan.'
        }
      }, { once: true })
    } catch (error) {
      stream?.getTracks().forEach(track => track.stop()); landmarker?.close()
      if (session !== this.session) return
      this.stop(); this.state.status = 'error'
      const name = error instanceof Error ? error.name : ''
      this.state.message = name === 'NotAllowedError' ? 'Izin kamera ditolak. Gunakan keyboard atau izinkan kamera di browser.'
        : name === 'NotFoundError' ? 'Kamera tidak ditemukan. Keyboard siap digunakan.'
        : `Kamera belum tersedia. ${error instanceof Error ? error.message : 'Coba kembali.'}`
    }
  }

  calibrate() {
    if (!this.landmarker) return
    this.samples = []
    this.pitchSamples = []
    this.calibrating = true
    this.state.calibration = 0
    this.state.status = 'calibrating'
    this.state.message = 'Tatap lurus ke layar selama 2 detik.'
  }

  update(now: number, dt: number, sensitivity: number): number {
    if (!this.landmarker) return 0
    let target = this.state.steering
    if (this.video.paused && this.stream) void this.video.play().catch(() => {})
    if (now - this.lastDetect >= 33 && this.video.readyState >= 2 && this.video.currentTime !== this.lastFrame) {
      this.lastDetect = now; this.lastFrame = this.video.currentTime
      try {
        const result = this.landmarker.detectForVideo(this.video, now)
        const aspect = (this.video.videoWidth || 4) / (this.video.videoHeight || 3)
        const landmarks = result.faceLandmarks[0]
        const yaw = landmarks && tiltFromLandmarks(landmarks, aspect)
        const pitch = landmarks && pitchFromLandmarks(landmarks)
        if (yaw !== undefined && pitch !== undefined) {
          this.lastFace = now
          this.state.yaw = this.calibrating ? 0 : yaw - this.neutral
          this.state.pitch = this.calibrating ? 0 : pitch - this.neutralPitch
          if (this.calibrating) {
            this.samples.push(yaw)
            this.pitchSamples.push(pitch)
            this.state.calibration = this.samples.length / 32
            this.state.status = 'calibrating'; target = 0
            if (this.samples.length >= 32) {
              this.neutral = this.samples.reduce((sum, n) => sum + n, 0) / this.samples.length
              this.neutralPitch = this.pitchSamples.reduce((sum, n) => sum + n, 0) / this.pitchSamples.length
              this.calibrating = false
              this.state.status = 'tracking'
              this.state.message = 'Kepala terdeteksi. Siap mengarungi sungai.'
            }
          } else {
            this.state.status = 'tracking'
            this.state.message = 'Pelacakan aktif • miringkan kepala untuk kemudi, anggukkan untuk dayung cepat'
            target = steeringFromTilt(yaw, this.neutral, sensitivity)
            const pitchThreshold = .045 / Math.max(.7, sensitivity)
            if (this.state.pitch > pitchThreshold) {
              this.state.nodAction = 'boost'
            } else if (this.state.pitch < -pitchThreshold * 1.2) {
              this.state.nodAction = 'brake'
            } else {
              this.state.nodAction = 'none'
            }
          }
        } else {
          this.state.status = 'lost'
          this.state.message = 'Wajah tidak terlihat. Arahkan wajah ke kamera.'
          this.state.nodAction = 'none'
          if (this.calibrating) {
            this.samples = []
            this.pitchSamples = []
            this.state.calibration = 0
          }
        }
      } catch {
        this.stop()
        this.state.status = 'error'
        this.state.message = 'Pelacakan berhenti. Gunakan keyboard, lalu coba aktifkan kamera kembali.'
        return 0
      }
    }
    if (now - this.lastFace > 250) {
      target = 0
      this.state.nodAction = 'none'
    }
    // Penghalusan kemudi kepala yang lembut dan responsif tanpa sentakan tiba-tiba
    this.state.steering += (target - this.state.steering) * (1 - Math.exp(-dt * 8.5))
    return this.state.steering
  }

  stop() {
    this.session++
    this.stream?.getTracks().forEach(track => track.stop())
    this.stream = undefined
    this.video.pause()
    this.video.srcObject = null
    this.landmarker?.close()
    this.landmarker = undefined
    this.lastFrame = -1
    this.lastFace = 0
    this.calibrating = false
    this.state.status = 'off'
    this.state.message = 'Kamera tidak aktif'
    this.state.steering = 0
    this.state.pitch = 0
    this.state.calibration = 0
    this.state.nodAction = 'none'
  }

  get active() { return !!this.stream }
  get currentStream() { return this.stream }
  get videoElement() { return this.video }
}

export class InputController {
  keys = new Set<string>()
  touch = 0
  touchBoost = false
  touchBrake = false
  touchNos = false
  touchParachute = false
  enabled = false
  onPause?: () => void

  private keydown = (event: KeyboardEvent) => {
    if ((event.target as HTMLElement)?.matches('input, select, textarea')) return
    if (this.enabled && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD', 'KeyW', 'KeyS', 'Space', 'Escape', 'KeyP', 'KeyF', 'KeyE'].includes(event.code)) {
      event.preventDefault()
    }
    this.keys.add(event.code)
    if (!event.repeat && ['Escape', 'KeyP'].includes(event.code)) this.onPause?.()
  }

  private keyup = (event: KeyboardEvent) => {
    this.keys.delete(event.code)
  }

  private blur = () => this.clear()

  constructor() {
    window.addEventListener('keydown', this.keydown)
    window.addEventListener('keyup', this.keyup)
    window.addEventListener('blur', this.blur)
  }

  get steering(): number {
    const left = this.keys.has('KeyA') || this.keys.has('ArrowLeft')
    const right = this.keys.has('KeyD') || this.keys.has('ArrowRight')
    return Number(right) - Number(left) || this.touch
  }

  get boost(): boolean {
    return this.keys.has('Space') || this.keys.has('KeyW') || this.keys.has('ArrowUp') || this.touchBoost
  }

  get brake(): boolean {
    return this.keys.has('KeyS') || this.keys.has('ArrowDown') || this.touchBrake
  }

  get nos(): boolean {
    return this.keys.has('KeyN') || this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || this.touchNos
  }

  get parachute(): boolean {
    return this.keys.has('KeyF') || this.keys.has('KeyE') || this.touchParachute
  }

  clear() {
    this.keys.clear()
    this.touch = 0
    this.touchBoost = false
    this.touchBrake = false
    this.touchNos = false
    this.touchParachute = false
  }

  dispose() {
    window.removeEventListener('keydown', this.keydown)
    window.removeEventListener('keyup', this.keyup)
    window.removeEventListener('blur', this.blur)
  }
}
