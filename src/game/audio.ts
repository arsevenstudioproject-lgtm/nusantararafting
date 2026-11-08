/** Original synthesized audio. No recordings, downloads, or autoplay. */
export class RiverAudio {
  context?: AudioContext
  private master?: GainNode
  private river?: GainNode
  private filter?: BiquadFilterNode
  private noise?: AudioBuffer
  private source?: AudioBufferSourceNode
  private volume = .55
  private lastBoostSound = 0
  private lastBrakeSound = 0

  async start() {
    if (!this.context) {
      const ctx = this.context = new AudioContext()
      this.master = ctx.createGain(); this.master.gain.value = this.volume * .45; this.master.connect(ctx.destination)
      const noise = this.noise = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate)
      const channel = noise.getChannelData(0)
      let previous = 0
      for (let i = 0; i < channel.length; i++) { previous = (previous + (Math.random() * 2 - 1) * .08) / 1.025; channel[i] = previous * 4 }
      const source = this.source = ctx.createBufferSource(); source.buffer = noise; source.loop = true
      const filter = this.filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 1600
      const river = this.river = ctx.createGain(); river.gain.value = .4
      source.connect(filter); filter.connect(river); river.connect(this.master); source.start()
    }
    if (this.context.state === 'suspended') await this.context.resume()
  }

  setVolume(volume: number) {
    this.volume = volume
    if (this.master && this.context) this.master.gain.setTargetAtTime(volume * .45, this.context.currentTime, .15)
  }

  update(speed: number, lateral: number, rapid: number, boosting = false, braking = false) {
    if (!this.context || !this.river || !this.filter) return
    const boostBoost = boosting ? .22 : 0
    const brakeDamp = braking ? -.08 : 0
    this.river.gain.setTargetAtTime(Math.max(.1, .2 + speed * .018 + Math.abs(lateral) * .018 + rapid * .12 + boostBoost + brakeDamp), this.context.currentTime, .2)
    this.filter.frequency.setTargetAtTime(900 + Math.abs(lateral) * 170 + rapid * 1500 + (boosting ? 1200 : 0), this.context.currentTime, .2)
  }

  private tone(frequency: number, delay: number, duration: number, volume = .22, type: OscillatorType = 'sine') {
    if (!this.context || !this.master) return
    const ctx = this.context, oscillator = ctx.createOscillator(), gain = ctx.createGain(), t = ctx.currentTime + delay
    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, t)
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(volume, t + .018)
    gain.gain.exponentialRampToValueAtTime(.001, t + duration)
    oscillator.connect(gain); gain.connect(this.master); oscillator.start(t); oscillator.stop(t + duration + .02)
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect() }
  }

  collect() {
    this.tone(783.99, 0, .16)
    this.tone(1174.66, .09, .26)
  }

  collectNos() {
    // Futuristic turbo synth rev
    this.tone(220, 0, .12, .3, 'sawtooth')
    this.tone(440, .08, .15, .32, 'sawtooth')
    this.tone(880, .16, .24, .35, 'triangle')
  }

  collectRepair() {
    // Harmonic soothing chime
    this.tone(523.25, 0, .22, .26)
    this.tone(659.25, .08, .22, .26)
    this.tone(1046.5, .16, .35, .28)
  }

  collectCoin() {
    // High metallic glint clink
    this.tone(987.77, 0, .12, .35, 'triangle')
    this.tone(1318.51, .06, .22, .38, 'sine')
  }

  collectShield() {
    // Resonant bubble force field hum
    this.tone(330, 0, .18, .3, 'sine')
    this.tone(495, .09, .22, .32, 'triangle')
    this.tone(660, .18, .38, .35, 'sine')
  }

  collectParachute() {
    // Airy uplifting glissando
    this.tone(440, 0, .14, .3, 'sine')
    this.tone(659.25, .07, .18, .32, 'triangle')
    this.tone(880, .14, .25, .35, 'sine')
    this.tone(1318.5, .21, .35, .35, 'triangle')
  }

  activateParachute() {
    if (!this.context || !this.master || !this.noise) return
    const ctx = this.context, source = ctx.createBufferSource(), gain = ctx.createGain(), filter = ctx.createBiquadFilter()
    source.buffer = this.noise; filter.type = 'bandpass'; filter.frequency.setValueAtTime(600, ctx.currentTime)
    filter.frequency.exponentialRampToValueAtTime(2400, ctx.currentTime + .45)
    gain.gain.setValueAtTime(.8, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .75)
    source.connect(filter); filter.connect(gain); gain.connect(this.master)
    source.start(); source.stop(ctx.currentTime + .76)
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect() }

    // Canopy deployment pop & soaring chords
    this.tone(260, 0, .15, .5, 'triangle')
    this.tone(520, .08, .35, .45, 'sine')
    this.tone(780, .16, .5, .4, 'sine')
  }

  jumpLaunch() {
    if (!this.context || !this.master || !this.noise) return
    const ctx = this.context, source = ctx.createBufferSource(), gain = ctx.createGain(), filter = ctx.createBiquadFilter()
    source.buffer = this.noise; filter.type = 'highpass'; filter.frequency.setValueAtTime(400, ctx.currentTime)
    filter.frequency.exponentialRampToValueAtTime(3200, ctx.currentTime + .3)
    gain.gain.setValueAtTime(.75, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .45)
    source.connect(filter); filter.connect(gain); gain.connect(this.master)
    source.start(); source.stop(ctx.currentTime + .46)
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect() }

    this.tone(180, 0, .18, .55, 'sawtooth')
    this.tone(420, .05, .28, .5, 'triangle')
  }

  splashdown(strength: number) {
    if (!this.context || !this.master || !this.noise) return
    const ctx = this.context, source = ctx.createBufferSource(), gain = ctx.createGain(), filter = ctx.createBiquadFilter()
    source.buffer = this.noise; filter.type = 'lowpass'; filter.frequency.setValueAtTime(900, ctx.currentTime)
    filter.frequency.exponentialRampToValueAtTime(250, ctx.currentTime + .75)
    const vol = Math.min(1.0, 0.4 + strength * 0.08)
    gain.gain.setValueAtTime(vol, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .85)
    source.connect(filter); filter.connect(gain); gain.connect(this.master)
    source.start(); source.stop(ctx.currentTime + .86)
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect() }

    // Heavy water boom thump
    this.tone(90, 0, .3, .65, 'sine')
    this.tone(60, .05, .4, .6, 'sine')
  }

  nearMiss(combo: number) {
    const baseFreq = 650 + Math.min(6, combo) * 75
    this.tone(baseFreq, 0, .12, .3, 'triangle')
    this.tone(baseFreq * 1.33, .06, .2, .35, 'sine')
  }

  activateNos() {
    if (!this.context || !this.master || !this.noise) return
    const ctx = this.context, source = ctx.createBufferSource(), gain = ctx.createGain(), filter = ctx.createBiquadFilter()
    source.buffer = this.noise; filter.type = 'highpass'; filter.frequency.setValueAtTime(350, ctx.currentTime)
    filter.frequency.exponentialRampToValueAtTime(3200, ctx.currentTime + .6)
    gain.gain.setValueAtTime(.85, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .95)
    source.connect(filter); filter.connect(gain); gain.connect(this.master)
    source.start(); source.stop(ctx.currentTime + .96)
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect() }

    this.tone(180, 0, .45, .45, 'sawtooth')
    this.tone(540, .12, .6, .4, 'triangle')
  }

  waterfallPlunge() {
    if (!this.context || !this.master || !this.noise) return
    const ctx = this.context, source = ctx.createBufferSource(), gain = ctx.createGain(), filter = ctx.createBiquadFilter()
    source.buffer = this.noise; filter.type = 'lowpass'; filter.frequency.setValueAtTime(1200, ctx.currentTime)
    filter.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 1.8)
    gain.gain.setValueAtTime(.95, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + 2.2)
    source.connect(filter); filter.connect(gain); gain.connect(this.master)
    source.start(); source.stop(ctx.currentTime + 2.21)
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect() }

    // Dreadful descending bass drone
    this.tone(140, 0, .8, .6, 'sawtooth')
    this.tone(70, .3, 1.4, .7, 'triangle')
    this.tone(45, .7, 1.8, .8, 'sine')
  }

  checkpoint() {
    [523.25, 659.25, 783.99].forEach((frequency, i) => this.tone(frequency, i * .1, .3))
  }

  finish(won: boolean) {
    (won ? [523.25, 659.25, 783.99, 1046.5] : [293.66, 246.94, 196]).forEach((frequency, i) => this.tone(frequency, i * .16, .5, .3))
  }

  boost() {
    if (!this.context || !this.master || !this.noise) return
    const now = performance.now()
    if (now - this.lastBoostSound < 350) return
    this.lastBoostSound = now

    const ctx = this.context, source = ctx.createBufferSource(), gain = ctx.createGain(), filter = ctx.createBiquadFilter()
    source.buffer = this.noise; filter.type = 'bandpass'; filter.frequency.setValueAtTime(450, ctx.currentTime)
    filter.frequency.exponentialRampToValueAtTime(1800, ctx.currentTime + .32)
    gain.gain.setValueAtTime(.42, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .38)
    source.connect(filter); filter.connect(gain); gain.connect(this.master)
    source.start(); source.stop(ctx.currentTime + .39)
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect() }

    this.tone(320, 0, .28, .18)
    this.tone(480, .06, .24, .15)
  }

  brake() {
    if (!this.context || !this.master || !this.noise) return
    const now = performance.now()
    if (now - this.lastBrakeSound < 450) return
    this.lastBrakeSound = now

    const ctx = this.context, source = ctx.createBufferSource(), gain = ctx.createGain(), filter = ctx.createBiquadFilter()
    source.buffer = this.noise; filter.type = 'lowpass'; filter.frequency.setValueAtTime(600, ctx.currentTime)
    filter.frequency.linearRampToValueAtTime(250, ctx.currentTime + .35)
    gain.gain.setValueAtTime(.35, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .42)
    source.connect(filter); filter.connect(gain); gain.connect(this.master)
    source.start(); source.stop(ctx.currentTime + .43)
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect() }
  }

  crocodileSnap() {
    if (!this.context || !this.master || !this.noise) return
    const ctx = this.context, source = ctx.createBufferSource(), gain = ctx.createGain(), filter = ctx.createBiquadFilter()
    source.buffer = this.noise; filter.type = 'highpass'; filter.frequency.value = 1200
    gain.gain.setValueAtTime(.75, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .18)
    source.connect(filter); filter.connect(gain); gain.connect(this.master)
    source.start(); source.stop(ctx.currentTime + .19)
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect() }

    // Hard snapping click + sub-thump
    this.tone(190, 0, .08, .55, 'triangle')
    this.tone(95, .02, .16, .6)
  }

  impact(strength: number) {
    if (!this.context || !this.master || !this.noise) return
    const ctx = this.context, source = ctx.createBufferSource(), gain = ctx.createGain(), filter = ctx.createBiquadFilter()
    source.buffer = this.noise; filter.type = 'bandpass'; filter.frequency.value = 500 + strength * 80
    gain.gain.setValueAtTime(Math.min(1.2, strength * .12), ctx.currentTime); gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .45)
    source.connect(filter); filter.connect(gain); gain.connect(this.master); source.start(); source.stop(ctx.currentTime + .46)
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect() }
    this.tone(80, 0, .19, .45)
  }


  collectMagnet() {
    this.tone(440, 0, .14, .35, 'sawtooth')
    this.tone(660, .08, .18, .38, 'triangle')
    this.tone(880, .16, .26, .4, 'sine')
  }

  shieldShatter() {
    if (!this.context || !this.master || !this.noise) return
    const ctx = this.context, source = ctx.createBufferSource(), gain = ctx.createGain(), filter = ctx.createBiquadFilter()
    source.buffer = this.noise; filter.type = 'highpass'; filter.frequency.setValueAtTime(1500, ctx.currentTime)
    filter.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + .5)
    gain.gain.setValueAtTime(.85, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .55)
    source.connect(filter); filter.connect(gain); gain.connect(this.master)
    source.start(); source.stop(ctx.currentTime + .56)
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect() }

    this.tone(1200, 0, .15, .5, 'sine')
    this.tone(800, .05, .25, .45, 'triangle')
    this.tone(350, .12, .4, .4, 'sawtooth')
  }

  stuntFanfare() {
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      this.tone(freq, i * 0.08, 0.35, 0.42, 'triangle')
      this.tone(freq * 1.5, i * 0.08 + 0.02, 0.25, 0.25, 'sine')
    })
  }

  voiceWoohoo() {
    if (!this.context || !this.master) return
    const ctx = this.context, osc = ctx.createOscillator(), gain = ctx.createGain(), t = ctx.currentTime
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(380, t)
    osc.frequency.exponentialRampToValueAtTime(740, t + 0.22)
    osc.frequency.exponentialRampToValueAtTime(560, t + 0.45)
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(0.48, t + 0.04)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45)
    osc.connect(gain); gain.connect(this.master); osc.start(t); osc.stop(t + 0.46)
    osc.onended = () => { osc.disconnect(); gain.disconnect() }
  }

  voiceWhoa() {
    if (!this.context || !this.master) return
    const ctx = this.context, osc = ctx.createOscillator(), gain = ctx.createGain(), t = ctx.currentTime
    osc.type = 'sine'
    osc.frequency.setValueAtTime(520, t)
    osc.frequency.linearRampToValueAtTime(340, t + 0.28)
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(0.38, t + 0.03)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28)
    osc.connect(gain); gain.connect(this.master); osc.start(t); osc.stop(t + 0.29)
    osc.onended = () => { osc.disconnect(); gain.disconnect() }
  }

  voiceOof() {
    if (!this.context || !this.master) return
    const ctx = this.context, osc = ctx.createOscillator(), gain = ctx.createGain(), t = ctx.currentTime
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(190, t)
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.22)
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(0.55, t + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25)
    osc.connect(gain); gain.connect(this.master); osc.start(t); osc.stop(t + 0.26)
    osc.onended = () => { osc.disconnect(); gain.disconnect() }
  }

  crocodileRoar() {
    if (!this.context || !this.master || !this.noise) return
    const ctx = this.context, source = ctx.createBufferSource(), gain = ctx.createGain(), filter = ctx.createBiquadFilter()
    source.buffer = this.noise; filter.type = 'lowpass'; filter.frequency.setValueAtTime(450, ctx.currentTime)
    filter.frequency.linearRampToValueAtTime(180, ctx.currentTime + .6)
    gain.gain.setValueAtTime(.85, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .65)
    source.connect(filter); filter.connect(gain); gain.connect(this.master)
    source.start(); source.stop(ctx.currentTime + .66)
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect() }

    this.tone(85, 0, .45, .7, 'sawtooth')
    this.tone(55, .15, .5, .75, 'sawtooth')
  }

  suspend() { if (this.context?.state === 'running') void this.context.suspend() }
  async dispose() { this.source?.stop(); this.source?.disconnect(); if (this.context && this.context.state !== 'closed') await this.context.close() }
}
