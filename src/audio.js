export class StadiumAudio {
  constructor() {
    this.ctx = null
    this.master = null
    this.sfxGain = null
    this.musicGain = null
    this.crowdGain = null
    this.noiseSource = null
    this.musicTimer = null
    this.musicStep = 0
    this.volumes = { volume: 0.7, music: 0.25, crowd: true }
    this.started = false
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {})
      return
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return
    try {
      this.ctx = new AudioCtx()
      this.master = this.ctx.createGain()
      this.master.gain.value = 0.75
      this.master.connect(this.ctx.destination)

      this.sfxGain = this.ctx.createGain()
      this.sfxGain.gain.value = this.volumes.volume
      this.sfxGain.connect(this.master)

      this.musicGain = this.ctx.createGain()
      this.musicGain.gain.value = this.volumes.music * 0.22
      this.musicGain.connect(this.master)

      this.crowdGain = this.ctx.createGain()
      this.crowdGain.gain.value = 0
      this.crowdGain.connect(this.master)
      this.buildCrowd()
      this.started = true
      this.startMusic()
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {})
    } catch {
      this.ctx = null
    }
  }

  setVolumes({ volume, music, crowd }) {
    this.volumes = {
      volume: Number.isFinite(volume) ? volume : this.volumes.volume,
      music: Number.isFinite(music) ? music : this.volumes.music,
      crowd: typeof crowd === 'boolean' ? crowd : this.volumes.crowd
    }
    if (!this.ctx) return
    const now = this.ctx.currentTime
    this.sfxGain.gain.setTargetAtTime(this.volumes.volume, now, 0.05)
    this.musicGain.gain.setTargetAtTime(this.volumes.music * 0.22, now, 0.1)
    if (!this.volumes.crowd) this.crowdGain.gain.setTargetAtTime(0, now, 0.1)
  }

  buildCrowd() {
    const seconds = 2
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * seconds, this.ctx.sampleRate)
    const data = buffer.getChannelData(0)
    let last = 0
    for (let i = 0; i < data.length; i += 1) {
      const white = Math.random() * 2 - 1
      last = (last + 0.025 * white) / 1.025
      data[i] = last * 4.5
    }
    const source = this.ctx.createBufferSource()
    source.buffer = buffer
    source.loop = true
    const filter = this.ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 460
    filter.Q.value = 0.55
    const mod = this.ctx.createGain()
    mod.gain.value = 0.55
    const lfo = this.ctx.createOscillator()
    const lfoGain = this.ctx.createGain()
    lfo.frequency.value = 0.17
    lfoGain.gain.value = 0.16
    lfo.connect(lfoGain)
    lfoGain.connect(mod.gain)
    source.connect(filter)
    filter.connect(mod)
    mod.connect(this.crowdGain)
    source.start()
    lfo.start()
    this.noiseSource = source
  }

  setCrowd(active, intensity = 0.5) {
    if (!this.ctx || !this.crowdGain) return
    const target = active && this.volumes.crowd ? 0.06 + intensity * 0.055 : 0
    this.crowdGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.35)
  }

  startMusic() {
    if (!this.ctx || this.musicTimer) return
    const notes = [196, 246.94, 293.66, 369.99, 293.66, 246.94, 220, 261.63]
    this.musicTimer = setInterval(() => {
      if (!this.ctx || this.ctx.state !== 'running' || this.volumes.music <= 0.001) return
      const note = notes[this.musicStep % notes.length]
      this.musicStep += 1
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      const filter = this.ctx.createBiquadFilter()
      osc.type = this.musicStep % 8 === 0 ? 'triangle' : 'sine'
      osc.frequency.value = note / (this.musicStep % 16 < 8 ? 1 : 2)
      filter.type = 'lowpass'
      filter.frequency.value = 900
      gain.gain.setValueAtTime(0.0001, this.ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.09, this.ctx.currentTime + 0.08)
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 1.9)
      osc.connect(filter)
      filter.connect(gain)
      gain.connect(this.musicGain)
      osc.start()
      osc.stop(this.ctx.currentTime + 2)
    }, 920)
  }

  tone(freq, duration, type = 'sine', gain = 0.15, slide = 0, delay = 0) {
    if (!this.ctx || this.volumes.volume <= 0) return
    const start = this.ctx.currentTime + delay
    const osc = this.ctx.createOscillator()
    const env = this.ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, start)
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), start + duration)
    env.gain.setValueAtTime(0.0001, start)
    env.gain.exponentialRampToValueAtTime(gain, start + 0.015)
    env.gain.exponentialRampToValueAtTime(0.0001, start + duration)
    osc.connect(env)
    env.connect(this.sfxGain)
    osc.start(start)
    osc.stop(start + duration + 0.05)
  }

  noise(duration = 0.12, gain = 0.15, frequency = 900) {
    if (!this.ctx || this.volumes.volume <= 0) return
    const start = this.ctx.currentTime
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * duration, this.ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1
    const source = this.ctx.createBufferSource()
    source.buffer = buffer
    const filter = this.ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = frequency
    const env = this.ctx.createGain()
    env.gain.setValueAtTime(gain, start)
    env.gain.exponentialRampToValueAtTime(0.0001, start + duration)
    source.connect(filter)
    filter.connect(env)
    env.connect(this.sfxGain)
    source.start(start)
  }

  ui() {
    this.tone(520, 0.06, 'sine', 0.06, 140)
  }

  select() {
    this.tone(660, 0.08, 'triangle', 0.07, 220)
  }

  kick(power = 1) {
    this.tone(105, 0.1, 'sine', 0.18 * power, -40)
    this.noise(0.08, 0.12 * power, 560)
  }

  pass() {
    this.tone(180, 0.06, 'sine', 0.1, -30)
    this.noise(0.045, 0.06, 700)
  }

  tackle() {
    this.noise(0.16, 0.18, 380)
    this.tone(85, 0.12, 'square', 0.07, -30)
  }

  save() {
    this.noise(0.15, 0.13, 940)
    this.tone(240, 0.12, 'triangle', 0.1, 60)
  }

  whistle(long = false) {
    this.tone(2100, long ? 0.5 : 0.2, 'sine', 0.1, 100)
    this.tone(2550, long ? 0.45 : 0.17, 'sine', 0.07, 50, 0.02)
    if (long) this.tone(2100, 0.35, 'sine', 0.08, 80, 0.55)
  }

  goal() {
    this.tone(523.25, 0.4, 'triangle', 0.18, 0)
    this.tone(659.25, 0.4, 'triangle', 0.16, 0, 0.1)
    this.tone(783.99, 0.6, 'triangle', 0.17, 0, 0.2)
    this.tone(1046.5, 0.8, 'sine', 0.14, 0, 0.32)
    this.noise(0.6, 0.12, 1200)
    if (this.crowdGain && this.volumes.crowd) {
      this.crowdGain.gain.cancelScheduledValues(this.ctx.currentTime)
      this.crowdGain.gain.setValueAtTime(0.26, this.ctx.currentTime)
      this.crowdGain.gain.setTargetAtTime(0.08, this.ctx.currentTime + 1.0, 1.2)
    }
  }

  post() {
    this.tone(880, 0.2, 'triangle', 0.18, -300)
    this.noise(0.08, 0.16, 2300)
  }

  horn() {
    this.tone(196, 0.45, 'sawtooth', 0.07, 0)
    this.tone(293.66, 0.45, 'sawtooth', 0.05, 0, 0.04)
  }

  fullTime() {
    this.whistle(true)
    this.horn()
  }

  dispose() {
    if (this.musicTimer) clearInterval(this.musicTimer)
    this.musicTimer = null
    this.noiseSource?.stop()
    this.ctx?.close().catch(() => {})
    this.ctx = null
  }
}
