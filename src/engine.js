import * as THREE from 'three'
import {
  BENCH_SIZE,
  DIFFICULTIES,
  FORMATIONS,
  MAX_SUBS,
  MENTALITIES,
  PITCH,
  createRoster,
  getTeam
} from './data.js'
import { createPlayerModel } from './world.js'

const BALL_RADIUS = 0.34
const PLAYER_RADIUS = 0.55
const CONTROL_RADIUS = 1.08
const GRAVITY = 9.81
const ROLE_SPEED = { GK: 5.9, DF: 6.55, MF: 6.8, FW: 7.05 }
const fieldClampX = PITCH.halfWidth + 2.5
const fieldClampZ = PITCH.halfLength + 2.5

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function approach(value, target, amount) {
  if (value < target) return Math.min(value + amount, target)
  return Math.max(value - amount, target)
}

function randomRange(min, max) {
  return min + Math.random() * (max - min)
}

function roleForward(role) {
  if (role === 'FW') return 1
  if (role === 'MF') return 0.55
  if (role === 'DF') return 0.22
  return 0
}

function dampAngle(current, target, speed, dt) {
  const delta = Math.atan2(Math.sin(target - current), Math.cos(target - current))
  return current + delta * (1 - Math.exp(-speed * dt))
}

function teamIndexControlled(engine, player) {
  const team = engine.teams[player.team]
  return Boolean(team && team.controlledId === player.id)
}

export class MatchEngine {
  constructor(world, input, audio, settings, callbacks = {}) {
    this.world = world
    this.scene = world.scene
    this.input = input
    this.audio = audio
    this.settings = settings
    this.callbacks = callbacks
    this.playersGroup = new THREE.Group()
    this.scene.add(this.playersGroup)
    this.players = []
    this.teams = []
    this.active = false
    this.paused = false
    this.phase = 'idle'
    this.phaseTimer = 0
    this.elapsed = 0
    this.totalDuration = 300
    this.halfDuration = 150
    this.half = 1
    this.score = [0, 0]
    this.scorers = []
    this.stats = null
    this.ball = {
      position: new THREE.Vector3(0, BALL_RADIUS, 0),
      prev: new THREE.Vector3(0, BALL_RADIUS, 0),
      velocity: new THREE.Vector3(),
      owner: null,
      lastTouchPlayer: null,
      lastTouchTeam: 0,
      lastPassTeam: null,
      controlCooldown: 0,
      spin: new THREE.Vector3()
    }
    this.config = null
    this.practice = false
    this.practicePoints = 0
    this.practiceGoals = 0
    this.practiceTargets = []
    this.targetHitCooldown = 0
    this.humanStates = [{ charging: false, chargeTime: 0, power: 0 }, { charging: false, chargeTime: 0, power: 0 }]
    this.restartData = null
    this.penaltyKick = null
    this.pressMap = { 0: [], 1: [] }
    this.autoSwitchCooldown = 0
    this.lastOwnerTeam = null
    this.offsideFlags = new Set()
    this.lastShot = null
    this._tmpA = new THREE.Vector3()
    this._tmpB = new THREE.Vector3()
    this._tmpC = new THREE.Vector3()
    this._up = new THREE.Vector3(0, 1, 0)
    this._camForward = new THREE.Vector3()
    this._camRight = new THREE.Vector3()
    this._moveDir = new THREE.Vector3()
    this.hudAccumulator = 0
  }

  emit(type, payload) {
    this.callbacks.onEvent?.(type, payload)
  }

  setSettings(settings) {
    this.settings = settings
  }

  start(config) {
    this.stop()
    this.active = true
    this.paused = false
    this.config = config
    this.practice = config.mode === 'practice'
    this.difficulty = DIFFICULTIES[config.difficulty] || DIFFICULTIES[this.settings.difficulty] || DIFFICULTIES.pro
    this.lengthMinutes = config.lengthMinutes || this.settings.matchLength || 5
    this.totalDuration = this.lengthMinutes * 60
    this.halfDuration = this.totalDuration / 2
    this.elapsed = 0
    this.half = 1
    this.score = [0, 0]
    this.scorers = []
    this.practicePoints = 0
    this.practiceGoals = 0
    this.targetHitCooldown = 0
    this.humans = config.humans || [true, false]
    this.phase = 'kickoff'
    this.phaseTimer = 1.8
    this.restartData = null
    this.penaltyKick = null
    this.lastOwnerTeam = null
    this.offsideFlags.clear()
    this.humanStates = [{ charging: false, chargeTime: 0, power: 0 }, { charging: false, chargeTime: 0, power: 0 }]
    this.stats = {
      possession: [0, 0],
      shots: [0, 0],
      onTarget: [0, 0],
      passes: [0, 0],
      fouls: [0, 0],
      corners: [0, 0],
      saves: [0, 0],
      tackles: [0, 0],
      yellow: [0, 0]
    }

    const home = getTeam(config.homeId)
    const away = getTeam(config.awayId)
    this.teams = [
      this.buildTeam(0, home, config.homeFormation || home.formation),
      this.buildTeam(1, away, config.awayFormation || away.formation)
    ]
    this.teams[0].controlledId = this.teams[0].players.find((p) => !p.isGK)?.id || null
    this.teams[1].controlledId = this.teams[1].players.find((p) => !p.isGK)?.id || null

    if (this.practice) {
      this.setupPractice()
    }

    this.resetPositions()
    this.world.ball.mesh.visible = true
    this.world.ball.mesh.position.set(0, BALL_RADIUS, 0)
    this.ball.position.set(0, BALL_RADIUS, 0)
    this.ball.prev.copy(this.ball.position)
    this.prepareKickoff(0, true)
    this.emit('start', this.getSnapshot())
    this.emit('commentary', `${home.name} and ${away.name} are ready under the lights.`)
  }

  buildTeam(index, team, formationId) {
    const formation = FORMATIONS[formationId] || FORMATIONS[team.formation] || FORMATIONS['4-3-3']
    const roster = createRoster(team, 11 + BENCH_SIZE)
    const players = []
    for (let slotIndex = 0; slotIndex < 11; slotIndex += 1) {
      const slot = formation.slots[slotIndex]
      const profile = roster[slotIndex]
      const isGK = slot.role === 'GK'
      const player = {
        id: `${index}-${slotIndex}`,
        team: index,
        slotIndex,
        profile,
        role: slot.role,
        slot,
        isGK,
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        facing: index === 0 ? 0 : Math.PI,
        stamina: profile.stamina,
        maxSpeed: ROLE_SPEED[slot.role] + (profile.pace - 70) * 0.012,
        active: true,
        tackleCooldown: 0,
        ballCooldown: 0,
        decisionTimer: randomRange(0.35, 0.9),
        tackleTimer: 0,
        diveTimer: 0,
        diveDirection: 0,
        kickTimer: 0,
        kickSide: 1,
        stumbleTimer: 0,
        mesh: null
      }
      player.mesh = createPlayerModel(team, profile, isGK)
      player.position.set(slot.x * 29, 0, (index === 0 ? -1 : 1) * (PITCH.halfLength - slot.depth * 105))
      player.mesh.position.copy(player.position)
      player.mesh.rotation.y = player.facing
      this.playersGroup.add(player.mesh)
      players.push(player)
      this.players.push(player)
    }
    return {
      index,
      team,
      players,
      lineup: players,
      bench: roster.slice(11, 11 + BENCH_SIZE),
      formation: formationId,
      mentality: index === 0 ? 'balanced' : index === 1 ? 'balanced' : 'balanced',
      controlledId: null,
      subsUsed: 0,
      onField: new Set(players.map((p) => p.id))
    }
  }

  setupPractice() {
    for (const player of this.players) {
      if (player.team === 1 && !player.isGK) {
        player.active = false
        player.mesh.visible = false
      }
    }
    this.players = this.players.filter((player) => player.active)
    for (const team of this.teams) {
      team.players = team.players.filter((player) => player.active)
      team.onField = new Set(team.players.map((p) => p.id))
    }
    this.createPracticeTargets()
    this.emit('toast', { title: 'PRACTICE SESSION', detail: 'Hit the glowing targets. Build your finishing.', tone: 'info' })
    this.emit('commentary', 'Free practice: find the target rings and sharpen your shooting.')
  }

  createPracticeTargets() {
    this.clearPracticeTargets()
    const definitions = [
      { x: -2.25, y: 1.78, points: 300, color: '#ffd166', radius: 0.92 },
      { x: 2.25, y: 1.78, points: 300, color: '#ffd166', radius: 0.92 },
      { x: 0, y: 0.82, points: 150, color: '#47f5c6', radius: 0.82 }
    ]
    for (const def of definitions) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(def.radius, 0.055, 8, 40),
        new THREE.MeshBasicMaterial({ color: def.color, transparent: true, opacity: 0.95 })
      )
      ring.position.set(def.x, def.y, PITCH.halfLength + 0.08)
      this.scene.add(ring)
      const glow = new THREE.Mesh(
        new THREE.CircleGeometry(def.radius * 1.15, 32),
        new THREE.MeshBasicMaterial({ color: def.color, transparent: true, opacity: 0.1, depthWrite: false })
      )
      glow.position.set(def.x, def.y, PITCH.halfLength + 0.05)
      this.scene.add(glow)
      this.practiceTargets.push({ ...def, mesh: ring, glow, active: true, timer: 0 })
    }
  }

  clearPracticeTargets() {
    for (const target of this.practiceTargets) {
      this.scene.remove(target.mesh)
      this.scene.remove(target.glow)
      target.mesh.geometry.dispose()
      target.mesh.material.dispose()
      target.glow.geometry.dispose()
      target.glow.material.dispose()
    }
    this.practiceTargets = []
  }

  stop() {
    this.active = false
    this.paused = false
    this.phase = 'idle'
    this.ball.owner = null
    this.clearPracticeTargets()
    for (const child of [...this.playersGroup.children]) {
      this.playersGroup.remove(child)
      child.traverse((node) => {
        if (node.geometry) node.geometry.dispose()
        if (node.material?.userData?.ephemeral) {
          if (node.material.map) node.material.map.dispose()
          node.material.dispose()
        }
      })
    }
    this.players = []
    this.teams = []
    if (this.world.ball) {
      this.world.ball.mesh.visible = false
      this.world.ball.mesh.position.set(0, BALL_RADIUS, 0)
      for (const ghost of this.world.ball.trail) ghost.visible = false
      this.world.ball.shadow.visible = false
    }
  }

  setPaused(paused) {
    if (!this.active) return
    this.paused = paused
    if (paused) {
      for (const state of this.humanStates) {
        state.charging = false
        state.chargeTime = 0
      }
    }
    this.audio.setCrowd(this.active && !paused, paused ? 0.2 : 0.55)
  }

  getTeam(index) {
    return this.teams[index]
  }

  getControlled(teamIndex) {
    const team = this.teams[teamIndex]
    if (!team?.controlledId) return null
    return team.players.find((player) => player.id === team.controlledId && player.active) || null
  }

  setControlled(teamIndex, playerId) {
    const team = this.teams[teamIndex]
    if (!team) return
    const player = team.players.find((p) => p.id === playerId && p.active)
    if (!player) return
    team.controlledId = player.id
  }

  switchControlled(teamIndex) {
    const team = this.teams[teamIndex]
    if (!team) return
    const choices = team.players
      .filter((player) => player.active && !player.isGK)
      .sort((a, b) => a.position.distanceToSquared(this.ball.position) - b.position.distanceToSquared(this.ball.position))
    if (!choices.length) return
    const currentIndex = choices.findIndex((player) => player.id === team.controlledId)
    const next = choices[(currentIndex + 1) % choices.length]
    team.controlledId = next.id
    this.audio.ui()
  }

  autoSelectNearest(teamIndex) {
    const team = this.teams[teamIndex]
    if (!team) return
    const candidates = team.players.filter((player) => player.active && !player.isGK)
    if (!candidates.length) return
    candidates.sort((a, b) => a.position.distanceToSquared(this.ball.position) - b.position.distanceToSquared(this.ball.position))
    team.controlledId = candidates[0].id
  }

  positionBallAtFeet() {
    const owner = this.ball.owner
    if (owner) {
      this.ball.position.set(
        owner.position.x + Math.sin(owner.facing) * 0.65,
        BALL_RADIUS,
        owner.position.z + Math.cos(owner.facing) * 0.65
      )
    } else {
      this.ball.position.set(0, BALL_RADIUS, 0)
    }
    this.ball.prev.copy(this.ball.position)
    this.world.ball.mesh.position.copy(this.ball.position)
  }

  resetPositions() {
    for (const player of this.players) {
      if (!player.active) continue
      const dir = player.team === 0 ? 1 : -1
      const ownGoal = -dir * PITCH.halfLength
      let x = player.slot.x * 29
      let z = ownGoal + dir * player.slot.depth * 105
      if (player.isGK) z = ownGoal + dir * 2.2
      player.position.set(clamp(x, -31, 31), 0, clamp(z, -50, 50))
      player.velocity.set(0, 0, 0)
      player.mesh.position.copy(player.position)
      player.mesh.rotation.y = player.facing
    }
    this.positionBallAtFeet()
  }

  prepareKickoff(kickoffTeam = 0, initial = false) {
    this.phase = 'kickoff'
    this.phaseTimer = initial ? 1.6 : 1.45
    this.restartData = null
    this.penaltyKick = null
    this.resetPositions()
    const team = this.teams[kickoffTeam]
    const taker = team.players
      .filter((player) => !player.isGK && player.active)
      .sort((a, b) => Math.abs(a.position.x) - Math.abs(b.position.x))[0] || team.players[0]
    if (taker) {
      const dir = kickoffTeam === 0 ? 1 : -1
      taker.position.set(0.9, 0, -0.9 * dir)
      taker.mesh.position.copy(taker.position)
      taker.facing = dir > 0 ? 0 : Math.PI
      taker.mesh.rotation.y = taker.facing
      this.ball.position.set(0, BALL_RADIUS, 0)
      this.ball.prev.copy(this.ball.position)
      this.ball.velocity.set(0, 0, 0)
      this.ball.owner = taker
      this.ball.lastTouchPlayer = taker
      this.ball.lastTouchTeam = kickoffTeam
      if (this.humans[kickoffTeam]) this.setControlled(kickoffTeam, taker.id)
    }
    const other = this.teams[1 - kickoffTeam]
    for (const player of other.players) {
      if (!player.active) continue
      const dir = player.team === 0 ? 1 : -1
      if (dir > 0) player.position.z = Math.min(player.position.z, -9.4)
      else player.position.z = Math.max(player.position.z, 9.4)
      player.mesh.position.copy(player.position)
    }
    this.offsideFlags.clear()
    this.ball.lastPassTeam = null
    this.updateBallMesh(0)
    this.emit('kickoff', { team: kickoffTeam })
  }

  startSecondHalf() {
    if (!this.active) return
    this.half = 2
    this.elapsed = this.halfDuration + 0.01
    this.paused = false
    this.prepareKickoff(1)
    this.audio.whistle()
    this.emit('secondHalf', this.getSnapshot())
  }

  getSnapshot() {
    const homeTeam = this.teams[0]?.team || getTeam(this.config?.homeId || 'aurora')
    const awayTeam = this.teams[1]?.team || getTeam(this.config?.awayId || 'comets')
    const totalPossession = this.stats?.possession[0] + this.stats?.possession[1] || 0
    const possession = totalPossession > 0
      ? [Math.round((this.stats.possession[0] / totalPossession) * 100), Math.round((this.stats.possession[1] / totalPossession) * 100)]
      : [50, 50]
    const displaySeconds = this.practice ? this.elapsed : clamp((this.elapsed / this.totalDuration) * 5400, 0, 5400)
    const minutes = Math.floor(displaySeconds / 60)
    const seconds = Math.floor(displaySeconds % 60)
    const controlled = this.getControlledRaw(0)
    const opponentControlled = this.getControlledRaw(1)
    return {
      active: this.active,
      practice: this.practice,
      paused: this.paused,
      phase: this.phase,
      difficulty: this.config?.difficulty || this.settings.difficulty,
      mode: this.config?.mode || 'quick',
      half: this.half,
      score: [...this.score],
      homeTeam,
      awayTeam,
      clock: `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
      minute: minutes,
      possession,
      stats: this.stats,
      scorers: this.scorers,
      controlled: controlled ? { name: controlled.profile.name, number: controlled.profile.number, stamina: controlled.stamina, role: controlled.role } : null,
      opponentControlled: opponentControlled ? { name: opponentControlled.profile.name, number: opponentControlled.profile.number, stamina: opponentControlled.stamina } : null,
      humanTeams: [...this.humans],
      charge: this.humanStates[0].power,
      charging: this.humanStates[0].charging,
      formation: this.teams[0]?.formation,
      mentality: this.teams[0]?.mentality,
      subsLeft: this.teams[0] ? MAX_SUBS - this.teams[0].subsUsed : 0,
      practicePoints: this.practicePoints,
      practiceGoals: this.practiceGoals,
      practiceTargets: this.practiceTargets.map((target) => target.active),
      humanSecond: Boolean(this.humans[1]),
      radar: this.players.filter((player) => player.active).map((player) => ({
        x: player.position.x,
        z: player.position.z,
        team: player.team,
        gk: player.isGK,
        active: teamIndexControlled(this, player)
      })),
      ballRadar: { x: this.ball.position.x, z: this.ball.position.z }
    }
  }

  getControlledRaw(teamIndex) {
    const team = this.teams[teamIndex]
    if (!team?.controlledId) return null
    return team.players.find((player) => player.id === team.controlledId) || null
  }

  update(dt) {
    if (!this.active) return
    if (this.paused) {
      this.animatePlayers(Math.min(dt, 0.04) * 0.35)
      return
    }
    const step = Math.min(dt, 0.034)
    this.autoSwitchCooldown = Math.max(0, this.autoSwitchCooldown - step)
    this.ball.controlCooldown = Math.max(0, this.ball.controlCooldown - step)
    this.updatePracticeTargets(step)

    if (this.phase === 'playing') {
      this.updatePlaying(step)
    } else if (this.phase === 'kickoff') {
      this.phaseTimer -= step
      this.ball.controlCooldown = Math.max(this.ball.controlCooldown, 0.2)
      this.updateBall(step)
      if (this.phaseTimer <= 0) {
        this.phase = 'playing'
        this.audio.whistle()
        this.emit('play', this.getSnapshot())
      }
    } else if (this.phase === 'restart') {
      this.phaseTimer -= step
      this.updateBallMesh(step)
      if (this.phaseTimer <= 0) this.resolveRestart()
    } else if (this.phase === 'goal') {
      this.phaseTimer -= step
      this.updateBall(step)
      if (this.phaseTimer <= 0) {
        if (this.practice) {
          this.preparePracticeReset()
        } else {
          this.prepareKickoff(this.nextKickoffTeam ?? 0)
        }
      }
    } else if (this.phase === 'halftime' || this.phase === 'fulltime') {
      this.animatePlayers(step * 0.2)
    }

    this.world.update(this.elapsed)
    this.cooldowns(step)
    this.animatePlayers(step)
    this.hudAccumulator += step
    if (this.hudAccumulator >= 0.1) {
      this.hudAccumulator = 0
      this.callbacks.onHud?.(this.getSnapshot())
    }
  }

  updatePlaying(dt) {
    this.elapsed += dt
    if (!this.practice) {
      if (this.half === 1 && this.elapsed >= this.halfDuration) {
        this.elapsed = this.halfDuration
        this.phase = 'halftime'
        this.paused = true
        this.ball.owner = null
        this.audio.whistle(true)
        this.emit('halftime', this.getSnapshot())
        return
      }
      if (this.half === 2 && this.elapsed >= this.totalDuration) {
        this.elapsed = this.totalDuration
        this.phase = 'fulltime'
        this.paused = true
        this.ball.owner = null
        this.audio.fullTime()
        this.emit('fulltime', this.getSnapshot())
        return
      }
    }

    this.refreshPressMap()
    this.handleHumanTeam(0, dt)
    if (this.humans[1]) this.handleHumanTeam(1, dt)
    this.updateAI(dt)
    this.simulatePlayers(dt)
    this.resolvePlayerCollisions()
    this.updatePossession(dt)
    this.updateBall(dt)
    this.checkBounds()
    this.updatePossessionStats(dt)
    if (this.penaltyKick) {
      this.penaltyKick.timer -= dt
      if (this.penaltyKick.timer <= 0 && this.ball.owner === this.penaltyKick.taker) {
        this.shootBall(this.penaltyKick.taker, 0.88, true)
        this.penaltyKick = null
      }
    }
  }

  updatePossessionStats(dt) {
    if (this.ball.owner) this.stats.possession[this.ball.owner.team] += dt
  }

  refreshPressMap() {
    for (const index of [0, 1]) {
      const team = this.teams[index]
      if (!team) continue
      this.pressMap[index] = team.players
        .filter((player) => player.active && !player.isGK)
        .sort((a, b) => a.position.distanceToSquared(this.ball.position) - b.position.distanceToSquared(this.ball.position))
        .slice(0, 3)
    }
  }

  cooldowns(dt) {
    for (const player of this.players) {
      player.tackleCooldown = Math.max(0, player.tackleCooldown - dt)
      player.ballCooldown = Math.max(0, player.ballCooldown - dt)
      player.tackleTimer = Math.max(0, player.tackleTimer - dt)
      player.diveTimer = Math.max(0, player.diveTimer - dt * 2.4)
      player.kickTimer = Math.max(0, player.kickTimer - dt)
      player.stumbleTimer = Math.max(0, player.stumbleTimer - dt)
    }
  }

  getMoveDirection(inputX, inputZ, target = this._moveDir) {
    const camera = this.world.camera
    this._camForward.set(0, 0, -1).applyQuaternion(camera.quaternion)
    this._camForward.y = 0
    if (this._camForward.lengthSq() < 0.0001) this._camForward.set(0, 0, 1)
    else this._camForward.normalize()
    this._camRight.crossVectors(this._camForward, this._up).normalize()
    target.set(0, 0, 0)
    target.addScaledVector(this._camRight, inputX)
    target.addScaledVector(this._camForward, inputZ)
    const length = target.length()
    if (length > 1) target.divideScalar(length)
    return target
  }

  handleHumanTeam(teamIndex, dt) {
    if (!this.humans[teamIndex]) return
    const team = this.teams[teamIndex]
    if (!team) return
    let player = this.getControlled(teamIndex)
    if (!player) {
      this.autoSelectNearest(teamIndex)
      player = this.getControlled(teamIndex)
    }
    if (!player) return
    const input = this.input.getState(teamIndex, this.settings.scheme)
    const state = this.humanStates[teamIndex]
    const dir = this.getMoveDirection(input.x, input.z)
    if (dir.lengthSq() > 1) dir.normalize()
    const sprint = input.down.sprint && player.stamina > 2

    if (player.stumbleTimer > 0) {
      state.charging = false
      state.chargeTime = 0
      state.power = 0
      this.applyMovement(player, 0, 0, false, dt)
      return
    }

    if (state.charging) {
      if (this.ball.owner !== player) {
        state.charging = false
        state.chargeTime = 0
        state.power = 0
      } else {
        state.chargeTime += dt
        state.power = clamp(0.3 + (state.chargeTime / 1.0) * 0.7, 0.3, 1)
      }
    }

    this.applyMovement(player, dir.x, dir.z, sprint && !state.charging, dt)

    if (input.pressed.switch) this.switchControlled(teamIndex)

    if (this.ball.owner === player) {
      if (input.pressed.shoot && !state.charging) {
        state.charging = true
        state.chargeTime = 0
        state.power = 0.3
      }
      if (state.charging && (input.released.shoot || !input.down.shoot)) {
        const power = state.power
        state.charging = false
        state.power = 0
        state.chargeTime = 0
        this.shootBall(player, power, false)
      } else if (!state.charging && input.pressed.pass) {
        this.passBall(player, 'pass', dir)
      } else if (!state.charging && input.pressed.through) {
        this.passBall(player, 'through', dir)
      }
    } else {
      if (input.pressed.shoot || input.pressed.tackle) this.attemptTackle(player, dir)
      if (input.pressed.pass) {
        this.emit('commentary', `${team.team.name} want the ball back.`)
      }
    }
  }

  applyMovement(player, dirX, dirZ, sprint, dt) {
    const dirLength = Math.hypot(dirX, dirZ)
    const staminaFactor = player.stamina > 18 ? 1 : 0.76 + player.stamina * 0.012
    const sprintFactor = sprint ? 1.34 : 1
    const control = player.stumbleTimer > 0 ? 0.12 : 1
    const maxSpeed = player.maxSpeed * sprintFactor * staminaFactor * control
    if (dirLength > 0.02) {
      const analog = Math.min(1, dirLength)
      const targetX = (dirX / dirLength) * maxSpeed * analog
      const targetZ = (dirZ / dirLength) * maxSpeed * analog
      const acceleration = 1 - Math.exp(-(sprint ? 9 : 13) * dt)
      player.velocity.x += (targetX - player.velocity.x) * acceleration
      player.velocity.z += (targetZ - player.velocity.z) * acceleration
      if (player.stumbleTimer <= 0) {
        const desiredFacing = Math.atan2(dirX, dirZ)
        player.facing = dampAngle(player.facing, desiredFacing, sprint ? 11 : 9, dt)
      }
    } else {
      const decel = 1 - Math.exp(-12 * dt)
      player.velocity.x -= player.velocity.x * decel
      player.velocity.z -= player.velocity.z * decel
    }
    player.position.x += player.velocity.x * dt
    player.position.z += player.velocity.z * dt
    player.position.x = clamp(player.position.x, -fieldClampX, fieldClampX)
    player.position.z = clamp(player.position.z, -fieldClampZ, fieldClampZ)
    const speed = Math.hypot(player.velocity.x, player.velocity.z)
    const sprinting = sprint && speed > 3
    if (sprinting) player.stamina = Math.max(0, player.stamina - dt * (player.isGK ? 1.4 : 2.5))
    else player.stamina = Math.min(100, player.stamina + dt * (speed > 1 ? 0.55 : 1.4))
  }

  simulatePlayers(dt) {
    for (const player of this.players) {
      if (!player.active) continue
      player.position.x += 0
      player.mesh.position.copy(player.position)
      player.mesh.rotation.y = player.facing
    }
  }

  resolvePlayerCollisions() {
    for (let i = 0; i < this.players.length; i += 1) {
      const a = this.players[i]
      if (!a.active) continue
      for (let j = i + 1; j < this.players.length; j += 1) {
        const b = this.players[j]
        if (!b.active) continue
        const dx = b.position.x - a.position.x
        const dz = b.position.z - a.position.z
        const distSq = dx * dx + dz * dz
        const minDist = PLAYER_RADIUS * 1.72
        if (distSq > 0.0001 && distSq < minDist * minDist) {
          const dist = Math.sqrt(distSq)
          const push = (minDist - dist) * 0.38
          const nx = dx / dist
          const nz = dz / dist
          a.position.x -= nx * push
          a.position.z -= nz * push
          b.position.x += nx * push
          b.position.z += nz * push
        }
      }
    }
    for (const player of this.players) {
      if (!player.active) continue
      player.position.x = clamp(player.position.x, -fieldClampX, fieldClampX)
      player.position.z = clamp(player.position.z, -fieldClampZ, fieldClampZ)
    }
  }

  updateAI(dt) {
    for (const player of this.players) {
      if (!player.active) continue
      if (this.humans[player.team] && player.id === this.teams[player.team].controlledId) continue
      if (player.stumbleTimer > 0) {
        this.applyMovement(player, 0, 0, false, dt)
        continue
      }
      if (player.isGK) {
        this.updateGoalkeeper(player, dt)
        continue
      }
      if (this.ball.owner === player) {
        this.updateAIOwner(player, dt)
        continue
      }

      const team = this.teams[player.team]
      const owner = this.ball.owner
      const target = this.getFormationTarget(player)
      const press = this.pressMap[player.team] || []
      const isFirst = press[0] === player
      const isSecond = press[1] === player
      const dir = player.team === 0 ? 1 : -1

      if (!owner || owner.team !== player.team) {
        if (isFirst) {
          const intercept = this.ball.position.clone().addScaledVector(this.ball.velocity, 0.24)
          if (owner) {
            intercept.x += (player.position.x - intercept.x) * 0.22
            intercept.z -= dir * 0.9
          }
          target.copy(intercept)
        } else if (isSecond && this.ball.position.z * dir < 15) {
          target.copy(this.ball.position).lerp(player.position, 0.35)
        }
        if (owner && owner.team !== player.team && isFirst) {
          const dist = player.position.distanceTo(owner.position)
          const tackleChance = dt * 1.65 * this.difficulty.tackle
          if (dist < 2.1 && player.tackleCooldown <= 0 && Math.random() < tackleChance) {
            this.attemptTackle(player, null)
          }
        }
      } else if (owner.team === player.team) {
        const goalZ = dir * PITCH.halfLength
        const ball = this.ball.position
        if (isSecond) {
          const side = player.slot.x >= 0 ? 1 : -1
          target.set(
            clamp(ball.x + side * (5.5 + Math.abs(player.slot.x) * 4), -30, 30),
            0,
            clamp(ball.z - dir * (4.5 + player.slot.depth * 5), -49, 49)
          )
        } else if (player.role === 'FW') {
          target.z += dir * (5.5 + Math.sin(this.elapsed * 0.6 + player.slotIndex) * 2.2)
          target.x += Math.sin(this.elapsed * 0.4 + player.slotIndex) * 2.8
        } else if (player.role === 'MF') {
          target.z += dir * 2.5
        }
        if (!isSecond && player.position.distanceTo(ball) < 32 && player.position.z * dir > ball.z * dir - 4) {
          target.x += (ball.x - target.x) * 0.08
        }
        target.z = clamp(target.z, -goalZ * 0.96, Math.abs(goalZ) * 0.96)
      }

      target.x = clamp(target.x, -31, 31)
      target.z = clamp(target.z, -50, 50)
      const delta = this._tmpA.copy(target).sub(player.position)
      const distance = Math.hypot(delta.x, delta.z)
      if (distance > 0.55) {
        const urgency = owner && owner.team !== player.team ? 1.04 : 1
        const sprint = distance > 9 && player.stamina > 22 && (isFirst || player.role === 'FW')
        this.applyMovement(player, delta.x / distance, delta.z / distance, sprint, dt * urgency)
      } else {
        this.applyMovement(player, 0, 0, false, dt)
      }
    }
  }

  getFormationTarget(player) {
    const team = this.teams[player.team]
    const dir = player.team === 0 ? 1 : -1
    const ownGoal = -dir * PITCH.halfLength
    const mentality = MENTALITIES[team.mentality] || MENTALITIES.balanced
    const ball = this.ball.position
    const slot = player.slot
    let x = slot.x * 29 * mentality.width
    let z = ownGoal + dir * slot.depth * 105
    const owner = this.ball.owner
    const possession = owner && owner.team === player.team
    const lineShift = (ball.z - z) * (0.18 + slot.depth * 0.15)
    z += lineShift
    if (possession) {
      z += dir * (4 + mentality.push * 0.75)
      if (player.role === 'FW') z += dir * 2
    } else {
      z -= dir * (2.6 + (mentality.name === 'Attacking' ? 0.5 : 0))
    }
    x += (ball.x - x) * 0.12 * (slot.role === 'DF' ? 1.2 : 0.55)
    if (player.role === 'FW' && possession) x += Math.sin(this.elapsed * 0.45 + player.slotIndex * 1.7) * 2.2
    return new THREE.Vector3(clamp(x, -31, 31), 0, clamp(z, -50, 50))
  }

  updateAIOwner(player, dt) {
    const dir = player.team === 0 ? 1 : -1
    const goalZ = dir * PITCH.halfLength
    const goal = this._tmpB.set(0, 0, goalZ)
    const toGoal = this._tmpC.copy(goal).sub(player.position)
    toGoal.y = 0
    const distanceToGoal = toGoal.length()
    if (distanceToGoal > 0.1) toGoal.normalize()
    const opponent = this.nearestOpponent(player)
    const pressure = opponent ? opponent.position.distanceTo(player.position) : 99
    if (pressure < 3.5 && opponent) {
      const away = this._tmpA.copy(player.position).sub(opponent.position)
      away.y = 0
      if (away.lengthSq() > 0.01) away.normalize()
      toGoal.x += away.x * 0.55
      toGoal.z += away.z * 0.25
      toGoal.normalize()
    }
    if (Math.abs(player.position.x) > 26) {
      toGoal.x += (0 - player.position.x) * 0.06
      toGoal.normalize()
    }
    this.applyMovement(player, toGoal.x, toGoal.z, distanceToGoal > 14 && player.stamina > 28, dt)
    player.decisionTimer -= dt
    if (player.decisionTimer > 0) return

    const angle = Math.abs(player.position.x)
    const keeper = this.getOpponentKeeper(player.team)
    const shotRange = distanceToGoal < 25 && angle < 25
    const close = distanceToGoal < 14
    const contest = this.teams[1 - player.team]
    const ratingBonus = (player.team === 0 ? this.teams[0].team.rating : this.teams[1].team.rating) * 0.001
    const shootProbability = close ? 0.95 : shotRange ? 0.62 : 0.08
    if ((shotRange && Math.random() < shootProbability) || (pressure < 1.7 && Math.random() < 0.18)) {
      const power = clamp(0.42 + distanceToGoal / 38 + randomRange(-0.1, 0.16), 0.35, 1)
      this.shootBall(player, power, true)
      player.decisionTimer = randomRange(0.9, 1.5)
      return
    }

    const passChoice = this.findPassTarget(player, null, true)
    if (pressure < 2.8 || Math.random() < 0.62) {
      if (passChoice) {
        const through = passChoice.progress > 12 && Math.random() < 0.36
        this.passBall(player, through ? 'through' : 'pass', null, true)
      } else if (distanceToGoal > 32) {
        this.passBall(player, 'pass', null, true)
      } else {
        this.shootBall(player, 0.66, true)
      }
    } else if (passChoice && passChoice.score > 1.1 && Math.random() < 0.44) {
      this.passBall(player, 'pass', null, true)
    }
    const reaction = this.difficulty.reaction
    player.decisionTimer = randomRange(0.45, 1.15) + reaction * 0.8
    if (contest && keeper) {
      // Keeps the decision loop grounded even when the keeper is far away.
      player.decisionTimer = Math.min(player.decisionTimer, 1.8)
    }
  }

  updateGoalkeeper(player, dt) {
    if (!player.active) return
    const ownGoalZ = player.team === 0 ? -PITCH.halfLength : PITCH.halfLength
    const dir = player.team === 0 ? 1 : -1
    const ball = this.ball.position
    const ballInBox = Math.abs(ball.x) < PITCH.penaltyWidth / 2 + 2 && Math.abs(ball.z - ownGoalZ) < PITCH.penaltyDepth + 3
    const ballSpeed = Math.hypot(this.ball.velocity.x, this.ball.velocity.z)
    const incoming = this.ball.velocity.z * -dir > 2.5
    let targetX = clamp(ball.x * 0.2, -2.9, 2.9)
    let targetZ = ownGoalZ + dir * 1.35
    let urgency = 1

    if (ballInBox && !this.ball.owner && ballSpeed > 11 && incoming) {
      const timeToLine = Math.abs((ownGoalZ - ball.z) / (this.ball.velocity.z || 0.001))
      if (timeToLine < 0.85) {
        const predictedX = ball.x + this.ball.velocity.x * timeToLine
        targetX = clamp(predictedX, -3.25, 3.25)
        urgency = 2.2
        player.diveDirection = Math.sign(targetX - player.position.x) || 1
        if (player.diveTimer <= 0) player.mesh.userData.dive = 0.55
        player.diveTimer = 0.45
      }
    } else if (ballInBox && this.ball.owner && this.ball.owner.team !== player.team) {
      const dist = player.position.distanceTo(ball)
      if (dist < 8 && Math.abs(ball.x) < 13 && ballSpeed < 6) {
        targetX = clamp(ball.x, -8, 8)
        targetZ = clamp(ball.z, ownGoalZ + dir * 0.5, ownGoalZ + dir * 9)
        urgency = 1.45
      }
    } else if (this.ball.owner?.team === player.team) {
      targetX = clamp(ball.x * 0.1, -2.4, 2.4)
      targetZ = ownGoalZ + dir * 2
    }

    const dx = targetX - player.position.x
    const dz = targetZ - player.position.z
    const dist = Math.hypot(dx, dz)
    if (dist > 0.08) {
      const speed = Math.min(1, (4.2 * urgency + this.difficulty.aiSpeed) * dt / Math.max(dist, 0.01))
      player.position.x += dx * speed
      player.position.z += dz * speed
      player.position.x = clamp(player.position.x, -4.4, 4.4)
      player.position.z = clamp(player.position.z, ownGoalZ - 0.8, ownGoalZ + dir * 12)
    }
    player.velocity.set(0, 0, 0)
    player.facing = this.ball.owner === player ? (player.team === 0 ? 0 : Math.PI) : Math.atan2(dx, dz)
    if (this.ball.owner === player) {
      player.decisionTimer -= dt
      if (player.decisionTimer <= 0) {
        this.passBall(player, 'pass', new THREE.Vector3(0, 0, dir))
        player.decisionTimer = randomRange(0.9, 1.6)
      }
    } else if (this.penaltyKick?.team === player.team) {
      player.decisionTimer = 0.5
    }
  }

  nearestOpponent(player) {
    let best = null
    let bestDist = Infinity
    for (const other of this.players) {
      if (!other.active || other.team === player.team) continue
      const dist = other.position.distanceToSquared(player.position)
      if (dist < bestDist) {
        bestDist = dist
        best = other
      }
    }
    return best
  }

  getOpponentKeeper(teamIndex) {
    return this.teams[1 - teamIndex]?.players.find((player) => player.isGK && player.active) || null
  }

  findPassTarget(player, aimDir, ai = false, through = false) {
    const team = this.teams[player.team]
    const dir = player.team === 0 ? 1 : -1
    const forward = new THREE.Vector3(Math.sin(player.facing), 0, Math.cos(player.facing))
    const aim = aimDir && aimDir.lengthSq() > 0.01 ? aimDir.clone().normalize() : forward
    let best = null
    let bestScore = -Infinity
    for (const mate of team.players) {
      if (!mate.active || mate === player) continue
      const toMate = mate.position.clone().sub(player.position)
      toMate.y = 0
      const distance = toMate.length()
      if (distance < 3.4) continue
      if (ai && distance > 48) continue
      if (!ai && distance > 44) continue
      const normalized = toMate.clone().normalize()
      const alignment = normalized.dot(aim)
      if (!ai && alignment < -0.25) continue
      if (!ai && aim.lengthSq() > 0.01 && alignment < 0.05) continue
      const lanePenalty = this.passLanePenalty(player.position, mate.position, player.team)
      const progress = toMate.z * dir
      const targetPoint = mate.position.clone()
      if (through) targetPoint.addScaledVector(new THREE.Vector3(Math.sin(mate.facing), 0, Math.cos(mate.facing)), 6.5)
      const distanceToPoint = targetPoint.distanceTo(player.position)
      let score = alignment * 2.6 + progress * 0.016 + (mate.role === 'FW' ? 0.32 : 0) - distanceToPoint * 0.008 - lanePenalty * 1.15
      if (through) score += progress * 0.012
      if (mate.isGK) score -= 2.2
      if (score > bestScore) {
        bestScore = score
        best = { mate, target: targetPoint, distance, progress, score }
      }
    }
    return best
  }

  passLanePenalty(from, to, teamIndex) {
    let penalty = 0
    const direction = to.clone().sub(from)
    const length = direction.length()
    if (length < 0.01) return 0
    direction.normalize()
    for (const other of this.players) {
      if (!other.active || other.team === teamIndex || other.isGK) continue
      const rel = other.position.clone().sub(from)
      rel.y = 0
      const projection = rel.dot(direction)
      if (projection < 1 || projection > length - 0.5) continue
      const closest = from.clone().addScaledVector(direction, projection)
      const distance = closest.distanceTo(other.position)
      if (distance < 2.1) penalty += (2.1 - distance) / 2.1
    }
    return penalty
  }

  passBall(player, type = 'pass', aimDir = null, ai = false) {
    if (this.ball.owner !== player) return
    const team = player.team
    const dir = team === 0 ? 1 : -1
    const through = type === 'through'
    const choice = this.findPassTarget(player, aimDir, ai, through)
    let target = null
    let power = through ? 0.8 : 0.68
    const playerForward = new THREE.Vector3(Math.sin(player.facing), 0, Math.cos(player.facing))
    if (choice) {
      target = choice.target
      if (!through) target.addScaledVector(choice.mate.velocity, 0.2)
      power = through ? 0.85 : 0.68
      if (through) this.markOffsideFlags(team, player)
    } else {
      target = player.position.clone().addScaledVector(aimDir && aimDir.lengthSq() > 0.01 ? aimDir.clone().normalize() : playerForward, 18)
      target.z += dir * 2
      power = 0.72
    }
    if (choice && !choice.mate.isGK) this.markOffsideFlags(team, player)
    const toTarget = target.clone().sub(this.ball.position)
    toTarget.y = 0
    const distance = toTarget.length()
    if (distance < 0.3) return
    const horizontal = toTarget.normalize()
    const speed = clamp(14 + distance * 0.24, 15, 27) * (through ? 1.05 : 1)
    const lift = distance > 24 ? 2.7 : distance > 14 ? 0.8 : 0.18
    this.ball.owner = null
    this.ball.controlCooldown = 0.34
    this.ball.lastTouchPlayer = player
    this.ball.lastTouchTeam = team
    this.ball.lastPassTeam = team
    this.ball.velocity.set(horizontal.x * speed, lift, horizontal.z * speed)
    this.ball.spin.set(horizontal.z * 8, horizontal.x * 5, 0)
    this.stats.passes[team] += 1
    player.decisionTimer = randomRange(0.5, 1.1)
    player.kickTimer = 0.26
    player.kickSide = Math.random() < 0.5 ? -1 : 1
    this.audio.pass()
    this.emit('pass', { team, through })
  }

  shootBall(player, power = 0.8, ai = false) {
    if (this.ball.owner !== player && !this.ball.owner) {
      if (!this.ball.owner) return
    }
    if (this.ball.owner !== player) return
    const team = player.team
    const dir = team === 0 ? 1 : -1
    const goalZ = dir * PITCH.halfLength
    const keeper = this.getOpponentKeeper(team)
    let preferredSide = keeper && keeper.position.x > 0 ? -1 : 1
    if (player.position.x > 0) preferredSide = -1
    if (player.position.x < 0) preferredSide = 1
    const spread = ai ? this.difficulty.shotError : 0.7
    let targetX = preferredSide * randomRange(2.0, 3.2) + randomRange(-spread, spread) * 0.65
    if (Math.abs(player.position.x) > 24) {
      targetX = Math.sign(-player.position.x || 1) * randomRange(1.2, 2.7) + randomRange(-spread, spread) * 0.4
    }
    targetX = clamp(targetX, -3.42, 3.42)
    const targetY = randomRange(0.55, 1.85) + (power > 0.85 ? 0.3 : 0)
    const target = new THREE.Vector3(targetX, targetY, goalZ)
    const from = this.ball.position.clone()
    const horizontal = new THREE.Vector3(target.x - from.x, 0, target.z - from.z)
    const distance = horizontal.length()
    if (distance < 0.1) return
    horizontal.normalize()
    const speed = clamp(22 + power * 10 + (ai ? 1.5 : 0), 22, 34)
    const flightTime = Math.max(0.22, distance / speed)
    const vy = (target.y - from.y) / flightTime + 0.5 * GRAVITY * flightTime
    const error = ai ? this.difficulty.shotError : 0.52
    const yawError = randomRange(-error, error) * 0.03
    const cos = Math.cos(yawError)
    const sin = Math.sin(yawError)
    const vx = (horizontal.x * cos - horizontal.z * sin) * speed
    const vz = (horizontal.x * sin + horizontal.z * cos) * speed
    this.ball.owner = null
    this.ball.controlCooldown = 0.42
    this.ball.lastTouchPlayer = player
    this.ball.lastTouchTeam = team
    this.ball.lastPassTeam = team
    this.ball.velocity.set(vx, clamp(vy, -1.5, 9), vz)
    this.ball.spin.set(vz * 0.25, 0, -vx * 0.25)
    this.stats.shots[team] += 1
    if (Math.abs(target.x) < PITCH.goalWidth / 2 && target.y < PITCH.goalHeight) {
      this.stats.onTarget[team] += 1
    }
    this.lastShot = { team, time: this.elapsed, power }
    player.kickTimer = 0.3
    player.kickSide = Math.random() < 0.5 ? -1 : 1
    this.audio.kick(0.68 + power * 0.34)
    this.emit('shot', { team, power })
    if (this.penaltyKick && this.penaltyKick.taker === player) this.penaltyKick = null
  }

  attemptTackle(player, dir = null) {
    if (player.tackleCooldown > 0) return
    player.tackleCooldown = 0.82
    player.tackleTimer = 0.32
    player.ballCooldown = 0.2
    const forward = dir && dir.lengthSq() > 0.01 ? dir.clone().normalize() : new THREE.Vector3(Math.sin(player.facing), 0, Math.cos(player.facing))
    player.velocity.x += forward.x * 3.5
    player.velocity.z += forward.z * 3.5
    let target = null
    let best = 2.35
    for (const other of this.players) {
      if (!other.active || other.team === player.team) continue
      const distance = other.position.distanceTo(player.position)
      if (distance < best) {
        best = distance
        target = other
      }
    }
    if (!target) {
      this.audio.tackle()
      return
    }
    const targetOwnGoalZ = target.team === 0 ? -PITCH.halfLength : PITCH.halfLength
    const fromBehind = Math.cos(target.facing) * (player.position.z - target.position.z) + Math.sin(target.facing) * (player.position.x - target.position.x) < 0
    const foulChance = this.practice ? 0 : clamp(0.1 + (fromBehind ? 0.11 : 0) + (player.stamina < 30 ? 0.08 : 0), 0, 0.38)
    if (Math.random() < foulChance) {
      this.stats.fouls[player.team] += 1
      this.audio.whistle()
      const penalty = Math.abs(target.position.z - targetOwnGoalZ) < PITCH.penaltyDepth && Math.abs(target.position.x) < PITCH.penaltyWidth / 2
      target.stumbleTimer = penalty ? 0.8 : 0.62
      target.stumbleDuration = target.stumbleTimer
      target.velocity.multiplyScalar(0.35)
      this.emit('foul', { team: target.team, offender: player, penalty })
      this.emit('commentary', penalty ? 'The referee points to the spot. A huge moment.' : 'A crunching challenge. Free kick.')
      if (Math.random() < 0.22) {
        this.stats.yellow[player.team] += 1
        this.emit('toast', { title: 'YELLOW CARD', detail: `${player.profile.name} is booked.`, tone: 'warn' })
      }
      this.awardFreeKick(target.team, target.position.clone(), penalty, 'FOUL')
      return
    }
    const winChance = clamp(0.48 + this.difficulty.tackle * 0.26 + (fromBehind ? 0.12 : 0), 0.35, 0.92)
    this.audio.tackle()
    if (this.ball.owner === target && Math.random() < winChance) {
      this.ball.owner = player
      this.ball.lastTouchPlayer = player
      this.ball.lastTouchTeam = player.team
      this.ball.lastPassTeam = player.team
      this.ball.velocity.set(0, 0, 0)
      this.ball.position.copy(player.position).add(new THREE.Vector3(Math.sin(player.facing), 0, Math.cos(player.facing)).multiplyScalar(0.65))
      this.ball.position.y = BALL_RADIUS
      this.stats.tackles[player.team] += 1
      this.clearOffsideFlags()
      if (this.humans[player.team] && this.autoSwitchCooldown <= 0) {
        this.setControlled(player.team, player.id)
        this.autoSwitchCooldown = 0.7
      }
      this.emit('tackle', { team: player.team })
    } else if (Math.random() < 0.35) {
      const away = new THREE.Vector3(Math.sin(player.facing + randomRange(-0.4, 0.4)), 0, Math.cos(player.facing + randomRange(-0.4, 0.4)))
      this.ball.velocity.set(away.x * 7, 1.2, away.z * 7)
      this.ball.owner = null
      this.ball.controlCooldown = 0.28
    }
  }

  awardFreeKick(teamIndex, position, penalty = false, reason = 'FREE KICK') {
    if (this.practice) return
    this.phase = 'restart'
    this.phaseTimer = penalty ? 1.7 : 1.15
    this.ball.owner = null
    this.ball.velocity.set(0, 0, 0)
    this.offsideFlags.clear()
    this.ball.lastPassTeam = null
    const dir = teamIndex === 0 ? 1 : -1
    const goalZ = dir * PITCH.halfLength
    let spot = position.clone()
    if (penalty) {
      spot.set(0, BALL_RADIUS, goalZ - dir * 11)
      for (const player of this.players) {
        if (!player.active) continue
        const ownGoal = player.team === 0 ? -PITCH.halfLength : PITCH.halfLength
        const inBox = Math.abs(player.position.z - ownGoal) < PITCH.penaltyDepth + 1 && Math.abs(player.position.x) < PITCH.penaltyWidth / 2 + 1
        if (inBox && player.team === 1 - teamIndex && !player.isGK) {
          player.position.z = ownGoal + (player.team === 0 ? 18.5 : -18.5)
          player.mesh.position.copy(player.position)
        }
      }
    }
    spot.z = clamp(spot.z, -PITCH.halfLength + 0.5, PITCH.halfLength - 0.5)
    spot.x = clamp(spot.x, -PITCH.halfWidth + 0.5, PITCH.halfWidth - 0.5)
    spot.y = BALL_RADIUS
    this.ball.position.copy(spot)
    this.ball.prev.copy(spot)
    const team = this.teams[teamIndex]
    const candidates = team.players
      .filter((player) => player.active && !player.isGK)
      .sort((a, b) => a.position.distanceToSquared(spot) - b.position.distanceToSquared(spot))
    const taker = candidates[0] || team.players[0]
    if (taker) {
      const behind = penalty
        ? new THREE.Vector3(0, 0, -1.4 * dir)
        : new THREE.Vector3(0.7 * Math.sign(taker.position.x || 1), 0, -1.35 * dir)
      taker.position.set(spot.x + behind.x, 0, spot.z + behind.z)
      taker.mesh.position.copy(taker.position)
      taker.velocity.set(0, 0, 0)
      taker.facing = Math.atan2(spot.x - taker.position.x, spot.z - taker.position.z)
      taker.mesh.rotation.y = taker.facing
    }
    if (penalty) {
      const keeper = this.teams[1 - teamIndex].players.find((player) => player.isGK)
      if (keeper) {
        keeper.position.set(0, 0, goalZ - dir * 0.7)
        keeper.mesh.position.copy(keeper.position)
      }
    }
    this.restartData = {
      type: penalty ? 'penalty' : 'free-kick',
      team: teamIndex,
      taker,
      penalty,
      reason,
      x: spot.x,
      z: spot.z
    }
    this.emit('restart', { type: penalty ? 'PENALTY' : 'FREE KICK', team: teamIndex, reason })
    this.emit('toast', {
      title: penalty ? 'PENALTY' : reason,
      detail: penalty ? `${team.team.name} have a spot kick.` : `Free kick to ${team.team.name}.`,
      tone: penalty ? 'danger' : 'warn'
    })
  }

  setRestart(type, teamIndex, x, z) {
    this.phase = 'restart'
    this.phaseTimer = 1.0
    this.ball.owner = null
    this.ball.velocity.set(0, 0, 0)
    this.ball.position.set(clamp(x, -PITCH.halfWidth + 0.3, PITCH.halfWidth - 0.3), BALL_RADIUS, clamp(z, -PITCH.halfLength + 0.3, PITCH.halfLength - 0.3))
    this.ball.prev.copy(this.ball.position)
    this.offsideFlags.clear()
    this.ball.lastPassTeam = null
    const team = this.teams[teamIndex]
    const candidates = team.players
      .filter((player) => player.active && !player.isGK)
      .sort((a, b) => a.position.distanceToSquared(this.ball.position) - b.position.distanceToSquared(this.ball.position))
    const taker = candidates[0] || team.players[0]
    if (type === 'goal-kick') {
      const keeper = team.players.find((player) => player.isGK)
      if (keeper) {
        keeper.position.set(0, 0, -Math.sign(this.ball.position.z) * 0 - (teamIndex === 0 ? 1 : -1) * 48)
        keeper.mesh.position.copy(keeper.position)
      }
    }
    if (taker) {
      const side = this.ball.position.x >= 0 ? 1 : -1
      const offset = type === 'corner' ? new THREE.Vector3(-side * 1.1, 0, -Math.sign(this.ball.position.z) * 1.1) : new THREE.Vector3(0, 0, Math.sign(this.ball.position.z) * 1.4)
      taker.position.set(this.ball.position.x + offset.x, 0, this.ball.position.z + offset.z)
      taker.mesh.position.copy(taker.position)
      taker.velocity.set(0, 0, 0)
    }
    this.restartData = { type, team: teamIndex, taker, x: this.ball.position.x, z: this.ball.position.z }
    const labels = { 'throw-in': 'THROW-IN', corner: 'CORNER', 'goal-kick': 'GOAL KICK' }
    this.emit('toast', { title: labels[type] || 'RESTART', detail: team.team.name, tone: 'info' })
    this.emit('restart', { type: labels[type] || type, team: teamIndex })
  }

  resolveRestart() {
    const data = this.restartData
    this.phase = 'playing'
    if (!data?.taker) return
    const taker = data.taker
    if (data.type === 'goal-kick') {
      const keeper = this.teams[data.team].players.find((player) => player.isGK)
      if (keeper) {
        this.ball.position.copy(keeper.position)
        this.ball.position.y = 1.05
        this.ball.owner = keeper
        this.ball.lastTouchPlayer = keeper
        this.ball.lastTouchTeam = data.team
      }
    } else {
      this.ball.owner = taker
      this.ball.position.copy(taker.position).add(new THREE.Vector3(Math.sin(taker.facing), 0, Math.cos(taker.facing)).multiplyScalar(0.7))
      this.ball.position.y = BALL_RADIUS
      this.ball.lastTouchPlayer = taker
      this.ball.lastTouchTeam = data.team
      if (this.humans[data.team]) this.setControlled(data.team, taker.id)
    }
    if (data.type === 'penalty') {
      const keeper = this.teams[1 - data.team].players.find((player) => player.isGK)
      this.penaltyKick = { team: data.team, taker: data.taker, timer: this.humans[data.team] ? 2.6 : 0.8 }
      this.emit('commentary', `${data.taker.profile.name} steps up from twelve yards...`)
      if (keeper) keeper.position.z = data.team === 0 ? PITCH.halfLength - 0.6 : -PITCH.halfLength + 0.6
    }
    this.restartData = null
    this.ball.controlCooldown = 0.22
  }

  updateBallMesh(dt) {
    const ball = this.world.ball
    ball.mesh.position.copy(this.ball.position)
    if (dt > 0) {
      ball.mesh.rotation.x += this.ball.velocity.z * dt * 1.4
      ball.mesh.rotation.z -= this.ball.velocity.x * dt * 1.4
    }
    ball.shadow.visible = true
    ball.shadow.position.set(this.ball.position.x, 0.013, this.ball.position.z)
    const scale = clamp(1.15 - this.ball.position.y * 0.18, 0.45, 1.2)
    ball.shadow.scale.set(scale, scale, 1)
    if (!ball.mesh.visible) ball.shadow.visible = false
    const speed = Math.hypot(this.ball.velocity.x, this.ball.velocity.z)
    for (let i = 0; i < ball.trail.length; i += 1) {
      const ghost = ball.trail[i]
      if (speed > 9 && this.ball.owner === null && !this.practice) {
        ghost.visible = true
        const back = 0.035 * (i + 1)
        ghost.position.copy(this.ball.position).addScaledVector(this.ball.velocity, -back)
        ghost.position.y = Math.max(BALL_RADIUS, this.ball.position.y)
      } else {
        ghost.visible = false
      }
    }
  }

  updateBall(dt) {
    const ball = this.ball
    ball.prev.copy(ball.position)
    if (ball.owner) {
      const owner = ball.owner
      const forward = new THREE.Vector3(Math.sin(owner.facing), 0, Math.cos(owner.facing))
      const target = owner.position.clone().addScaledVector(forward, owner.isGK ? 0.25 : 0.62)
      target.y = owner.isGK ? 1.05 : BALL_RADIUS
      const smoothing = 1 - Math.exp(-(owner.isGK ? 9 : 16) * dt)
      const oldX = ball.position.x
      const oldZ = ball.position.z
      ball.position.lerp(target, smoothing)
      if (dt > 0) ball.velocity.set((ball.position.x - oldX) / dt, 0, (ball.position.z - oldZ) / dt).clampLength(0, 13)
      ball.lastTouchPlayer = owner
      ball.lastTouchTeam = owner.team
      if (this.offsideFlags.has(owner.id) && ball.lastPassTeam === owner.team) {
        this.callOffside(owner)
        return
      }
    } else {
      ball.velocity.y -= GRAVITY * dt
      ball.position.addScaledVector(ball.velocity, dt)
      const ground = BALL_RADIUS
      if (ball.position.y < ground) {
        ball.position.y = ground
        if (ball.velocity.y < -1.2) {
          ball.velocity.y = -ball.velocity.y * 0.48
          ball.velocity.x *= 0.86
          ball.velocity.z *= 0.86
        } else {
          ball.velocity.y = 0
          const friction = Math.exp(-1.55 * dt)
          ball.velocity.x *= friction
          ball.velocity.z *= friction
        }
      } else {
        const drag = Math.exp(-0.06 * dt)
        ball.velocity.x *= drag
        ball.velocity.z *= drag
      }
      if (ball.position.y <= ground + 0.02) {
        ball.velocity.x *= Math.exp(-0.5 * dt)
        ball.velocity.z *= Math.exp(-0.5 * dt)
      }
      this.checkKeeperSaves(dt)
      this.checkPlayerBallCollisions()
      this.checkGoalAndPosts()
    }
    this.updateBallMesh(dt)
  }

  checkPlayerBallCollisions() {
    if (this.ball.owner) return
    const speed = Math.hypot(this.ball.velocity.x, this.ball.velocity.z)
    if (speed < 2.2) return
    for (const player of this.players) {
      if (!player.active || player.isGK || player.ballCooldown > 0) continue
      const dx = this.ball.position.x - player.position.x
      const dz = this.ball.position.z - player.position.z
      const dist = Math.hypot(dx, dz)
      if (dist < 0.76 && this.ball.position.y < 1.8) {
        const length = Math.max(0.01, dist)
        const nx = dx / length
        const nz = dz / length
        const dot = this.ball.velocity.x * nx + this.ball.velocity.z * nz
        if (dot < 0) {
          this.ball.velocity.x -= 2 * dot * nx
          this.ball.velocity.z -= 2 * dot * nz
          this.ball.velocity.x *= 0.62
          this.ball.velocity.z *= 0.62
          this.ball.velocity.y = Math.max(this.ball.velocity.y, 1.2)
          this.ball.position.x += nx * 0.18
          this.ball.position.z += nz * 0.18
          this.ball.lastTouchPlayer = player
          this.ball.lastTouchTeam = player.team
          this.ball.lastPassTeam = player.team
          player.ballCooldown = 0.4
          this.clearOffsideFlags()
          this.audio.tackle()
        }
      }
    }
  }

  checkKeeperSaves(dt) {
    const speed = Math.hypot(this.ball.velocity.x, this.ball.velocity.z)
    if (speed < 5.5 || this.ball.owner) return
    for (const keeper of this.players) {
      if (!keeper.active || !keeper.isGK || keeper.ballCooldown > 0) continue
      const dx = this.ball.position.x - keeper.position.x
      const dz = this.ball.position.z - keeper.position.z
      const dist = Math.hypot(dx, dz)
      const ownGoalZ = keeper.team === 0 ? -PITCH.halfLength : PITCH.halfLength
      const headingToGoal = Math.sign(this.ball.velocity.z) === Math.sign(ownGoalZ) || Math.abs(this.ball.position.z - ownGoalZ) < 17
      if (dist < 1.55 && this.ball.position.y < 2.65 && headingToGoal) {
        const saveChance = clamp(0.41 + this.difficulty.keeper * 0.42 - (speed / 40) * 0.12, 0.28, 0.88)
        if (Math.random() < saveChance) {
          const dirOut = keeper.team === 0 ? 1 : -1
          this.ball.velocity.set(randomRange(-7, 7), randomRange(2.5, 5.8), dirOut * randomRange(8, 13))
          this.ball.position.copy(keeper.position)
          this.ball.position.z -= dirOut * 0.5
          this.ball.position.y = randomRange(0.5, 1.25)
          this.ball.owner = null
          this.ball.controlCooldown = 0.45
          this.ball.lastTouchPlayer = keeper
          this.ball.lastTouchTeam = keeper.team
          this.ball.lastPassTeam = keeper.team
          keeper.ballCooldown = 0.7
          keeper.diveTimer = 0.65
          keeper.mesh.userData.dive = dx > 0 ? 1 : -1
          this.stats.saves[keeper.team] += 1
          this.clearOffsideFlags()
          this.audio.save()
          this.emit('save', { team: keeper.team, keeper })
          this.emit('commentary', `${keeper.profile.name} gets a strong hand to it!`)
        }
        return
      }
      if (dist < 1.3 && this.ball.position.y < 1.2 && speed < 6.5 && this.ball.controlCooldown <= 0) {
        this.ball.owner = keeper
        this.ball.velocity.set(0, 0, 0)
        this.ball.lastTouchPlayer = keeper
        this.ball.lastTouchTeam = keeper.team
        this.clearOffsideFlags()
        return
      }
    }
  }

  checkGoalAndPosts() {
    const ball = this.ball
    const z = ball.position.z
    const prevZ = ball.prev.z
    const x = ball.position.x
    const y = ball.position.y
    for (const side of [-1, 1]) {
      const line = side * PITCH.halfLength
      const crossed = side > 0 ? prevZ < line && z >= line : prevZ > line && z <= line
      if (!crossed) continue
      if (Math.abs(x) < PITCH.goalWidth / 2 + 0.08 && y < PITCH.goalHeight + 0.08) {
        const scoringTeam = side > 0 ? 0 : 1
        this.handleGoal(scoringTeam, x, y)
        return
      }
    }

    for (const side of [-1, 1]) {
      const line = side * PITCH.halfLength
      if (Math.abs(z - line) < 0.22 && Math.abs(y - PITCH.goalHeight) < 0.17 && Math.abs(x) < PITCH.goalWidth / 2 + 0.1) {
        ball.velocity.y = -Math.abs(ball.velocity.y) * 0.62
        ball.position.z = line - side * 0.06
        this.audio.post()
        return
      }
      for (const postX of [-PITCH.goalWidth / 2, PITCH.goalWidth / 2]) {
        if (Math.abs(x - postX) < 0.17 && Math.abs(z - line) < 0.3 && y < PITCH.goalHeight + 0.2) {
          ball.velocity.x = -Math.sign(x - postX) * Math.abs(ball.velocity.x) * 0.72
          ball.velocity.z *= -0.35
          ball.position.x = postX + Math.sign(x - postX) * 0.2
          this.audio.post()
          this.emit('commentary', 'Off the woodwork! The stadium gasps.')
          return
        }
      }
    }
  }

  handleGoal(scoringTeam, x, y) {
    if (this.practice) {
      this.handlePracticeGoal(x, y)
      return
    }
    if (this.phase !== 'playing') return
    const scorerPlayer = this.ball.lastTouchPlayer
    const ownGoal = scorerPlayer ? scorerPlayer.team !== scoringTeam : false
    this.score[scoringTeam] += 1
    this.scorers.push({
      team: scoringTeam,
      name: ownGoal ? `${scorerPlayer.profile.name} (OG)` : scorerPlayer?.profile.name || 'Unknown',
      minute: Math.floor((this.elapsed / this.totalDuration) * 90) + 1,
      ownGoal
    })
    this.phase = 'goal'
    this.phaseTimer = 3.4
    this.nextKickoffTeam = 1 - scoringTeam
    this.ball.velocity.set(0, 0, 0)
    this.ball.owner = null
    this.audio.goal()
    this.emit('goal', {
      team: scoringTeam,
      scorer: ownGoal ? `${scorerPlayer.profile.name} (OG)` : scorerPlayer?.profile.name || 'Unknown',
      ownGoal,
      score: [...this.score],
      minute: Math.floor((this.elapsed / this.totalDuration) * 90) + 1,
      snapshot: this.getSnapshot()
    })
    this.emit('commentary', ownGoal ? 'An own goal! Heartbreak under the lights.' : `${scorerPlayer?.profile.name || 'The striker'} finds the net!`)
  }

  handlePracticeGoal(x, y) {
    if (this.phase !== 'playing') return
    let points = 50
    let hitTarget = null
    for (const target of this.practiceTargets) {
      if (!target.active) continue
      const distance = Math.hypot(x - target.x, y - target.y)
      if (distance < target.radius + 0.08) {
        points = target.points
        hitTarget = target
        break
      }
    }
    this.practiceGoals += 1
    this.practicePoints += points
    if (hitTarget) {
      hitTarget.active = false
      hitTarget.timer = 2.2
      hitTarget.mesh.visible = false
      hitTarget.glow.visible = false
      this.audio.goal()
      this.emit('targetHit', { points, x, y })
      this.emit('toast', { title: `TARGET +${points}`, detail: 'Clean finish. Keep the rhythm.', tone: 'success' })
    } else {
      this.audio.goal()
      this.emit('toast', { title: '+50', detail: 'Goal. Now find the glowing rings.', tone: 'info' })
    }
    this.phase = 'goal'
    this.phaseTimer = this.practiceTargets.some((target) => !target.active) ? 1.8 : 1.2
    this.ball.owner = null
    this.ball.velocity.set(0, 0, 0)
    this.emit('practiceGoal', { points, practicePoints: this.practicePoints, practiceGoals: this.practiceGoals, snapshot: this.getSnapshot() })
  }

  updatePracticeTargets(dt) {
    if (!this.practice) return
    for (const target of this.practiceTargets) {
      if (!target.active) {
        target.timer -= dt
        if (target.timer <= 0) {
          target.active = true
          target.mesh.visible = true
          target.glow.visible = true
        }
      }
      if (target.mesh.visible) {
        const pulse = 1 + Math.sin(this.elapsed * 3.2 + target.x) * 0.04
        target.mesh.scale.setScalar(pulse)
      }
    }
    this.targetHitCooldown = Math.max(0, this.targetHitCooldown - dt)
  }

  preparePracticeReset() {
    this.phase = 'kickoff'
    this.phaseTimer = 0.85
    this.resetPositions()
    const user = this.teams[0].players.find((player) => !player.isGK)
    if (user) {
      user.position.set(0, 0, -8)
      user.mesh.position.copy(user.position)
      user.facing = 0
      user.mesh.rotation.y = 0
      this.ball.position.set(0, BALL_RADIUS, -5.5)
      this.ball.prev.copy(this.ball.position)
      this.ball.velocity.set(0, 0, 0)
      this.ball.owner = user
      this.setControlled(0, user.id)
    }
    this.offsideFlags.clear()
    this.emit('throw', { team: this.teams[0] })
  }

  callOffside(player) {
    if (this.phase !== 'playing') return
    this.offsideFlags.clear()
    this.audio.whistle()
    const defendingTeam = 1 - player.team
    this.emit('toast', { title: 'OFFSIDE', detail: `${player.profile.name} moved too early.`, tone: 'warn' })
    this.emit('commentary', 'The flag is up. Offside.')
    this.awardFreeKick(defendingTeam, player.position.clone(), false, 'OFFSIDE')
  }

  markOffsideFlags(teamIndex, passer) {
    if (!this.settings.offside || this.practice) return
    const dir = teamIndex === 0 ? 1 : -1
    const opponent = this.teams[1 - teamIndex]
    const defenders = opponent.players
      .filter((player) => player.active)
      .map((player) => ({ player, progress: player.position.z * dir }))
      .sort((a, b) => b.progress - a.progress)
    if (defenders.length < 2) return
    const offsideLine = defenders[1].progress
    const ballProgress = this.ball.position.z * dir
    for (const player of this.teams[teamIndex].players) {
      if (!player.active || player === passer || player.isGK) continue
      const progress = player.position.z * dir
      if (progress > 0 && progress > offsideLine + 0.2 && progress > ballProgress + 0.2) {
        this.offsideFlags.add(player.id)
      }
    }
  }

  clearOffsideFlags() {
    this.offsideFlags.clear()
  }

  updatePossession(dt) {
    const owner = this.ball.owner
    if (owner) {
      if (!owner.active) this.ball.owner = null
      return
    }
    if (this.ball.controlCooldown > 0) return
    if (this.ball.position.y > 1.5) return
    const speed = Math.hypot(this.ball.velocity.x, this.ball.velocity.z)
    let best = null
    let bestDistance = Infinity
    for (const player of this.players) {
      if (!player.active || player.ballCooldown > 0) continue
      const distance = Math.hypot(this.ball.position.x - player.position.x, this.ball.position.z - player.position.z)
      const radius = player.isGK ? 1.65 : speed > 18 ? 0.74 : CONTROL_RADIUS
      if (distance < radius && distance < bestDistance) {
        best = player
        bestDistance = distance
      }
    }
    if (!best) return
    if (this.offsideFlags.has(best.id) && this.ball.lastPassTeam === best.team) {
      this.callOffside(best)
      return
    }
    this.ball.owner = best
    this.ball.lastTouchPlayer = best
    this.ball.lastTouchTeam = best.team
    this.ball.velocity.set(0, 0, 0)
    if (best.team !== this.ball.lastPassTeam) {
      this.clearOffsideFlags()
      this.ball.lastPassTeam = null
    }
    if (this.humans[best.team] && !best.isGK && this.autoSwitchCooldown <= 0) {
      this.setControlled(best.team, best.id)
      this.autoSwitchCooldown = 0.6
    }
    if (this.lastOwnerTeam !== best.team) {
      for (const teamIndex of [0, 1]) {
        if (this.humans[teamIndex] && teamIndex !== best.team && !this.humanTeamHasControl(teamIndex)) {
          this.autoSelectNearest(teamIndex)
        } else if (this.humans[teamIndex] && teamIndex !== best.team) {
          this.autoSelectNearest(teamIndex)
        }
      }
      if (this.humans[best.team] && best.isGK) {
        // Keep an outfielder controlled when the keeper collects the ball.
        const current = this.getControlled(best.team)
        if (!current || current.isGK) this.autoSelectNearest(best.team)
      }
      this.lastOwnerTeam = best.team
      this.emit('possession', { team: best.team })
    }
  }

  humanTeamHasControl(teamIndex) {
    return Boolean(this.getControlled(teamIndex))
  }

  checkBounds() {
    const ball = this.ball.position
    if (this.phase !== 'playing') return
    if (Math.abs(ball.x) > PITCH.halfWidth + 0.2) {
      const team = 1 - (this.ball.lastTouchTeam ?? 0)
      const x = Math.sign(ball.x) * PITCH.halfWidth
      const z = clamp(this.ball.prev.z, -PITCH.halfLength + 1, PITCH.halfLength - 1)
      this.emit('out', { type: 'throw-in' })
      this.emit('commentary', `Throw-in to ${this.teams[team].team.name}.`)
      this.setRestart('throw-in', team, x, z)
      return
    }
    if (Math.abs(ball.z) > PITCH.halfLength + 0.2) {
      const side = Math.sign(ball.z)
      const attacking = side > 0 ? 0 : 1
      const defending = 1 - attacking
      const lastTouch = this.ball.lastTouchTeam ?? defending
      if (this.practice) {
        this.setRestart('goal-kick', 1, 0, side * (PITCH.halfLength - 5.5))
        return
      }
      if (lastTouch === attacking) {
        this.stats.corners[attacking] += 1
        this.emit('commentary', `Corner kick for ${this.teams[attacking].team.name}.`)
        this.setRestart('corner', attacking, side * (PITCH.halfWidth - 0.4), side * (PITCH.halfLength - 0.4))
      } else {
        this.emit('commentary', `Goal kick to ${this.teams[defending].team.name}.`)
        this.setRestart('goal-kick', defending, 0, side * (PITCH.halfLength - 5.5))
      }
    }
  }

  substitute(teamIndex, playerId, benchIndex) {
    const team = this.teams[teamIndex]
    if (!team || team.subsUsed >= MAX_SUBS) return { ok: false, message: 'No substitutions remaining.' }
    const player = team.players.find((p) => p.id === playerId && p.active)
    const benchProfile = team.bench[benchIndex]
    if (!player || !benchProfile || player.isGK) return { ok: false, message: 'That substitution is not available.' }
    const outgoing = player.profile
    player.profile = benchProfile
    player.stamina = Math.max(82, benchProfile.stamina)
    team.bench[benchIndex] = outgoing
    team.subsUsed += 1
    player.mesh.visible = true
    this.emit('toast', { title: 'SUBSTITUTION', detail: `${benchProfile.name} replaces ${outgoing.name}.`, tone: 'success' })
    this.emit('substitution', { team: teamIndex, player, outgoing, incoming: benchProfile })
    return { ok: true }
  }

  setFormation(teamIndex, formationId) {
    const team = this.teams[teamIndex]
    const formation = FORMATIONS[formationId]
    if (!team || !formation) return
    team.formation = formationId
    const slots = formation.slots
    for (let i = 0; i < team.players.length; i += 1) {
      const player = team.players[i]
      player.slot = slots[i] || slots[slots.length - 1]
      player.role = player.slot.role
      player.isGK = player.slot.role === 'GK'
    }
    this.emit('toast', { title: 'TACTICS UPDATED', detail: `${team.team.name} switch to ${formationId}.`, tone: 'info' })
  }

  setMentality(teamIndex, mentalityId) {
    const team = this.teams[teamIndex]
    if (!team || !MENTALITIES[mentalityId]) return
    team.mentality = mentalityId
    this.emit('toast', { title: 'MENTALITY SET', detail: `${team.team.name}: ${MENTALITIES[mentalityId].name}.`, tone: 'info' })
  }

  getSubOptions(teamIndex = 0) {
    const team = this.teams[teamIndex]
    if (!team) return { players: [], bench: [], subsLeft: 0 }
    return {
      players: team.players.filter((player) => !player.isGK).map((player) => ({
        id: player.id,
        name: player.profile.name,
        number: player.profile.number,
        stamina: Math.round(player.stamina),
        role: player.role
      })),
      bench: team.bench.map((profile, index) => ({
        index,
        name: profile.name,
        number: profile.number,
        stamina: profile.stamina
      })),
      subsLeft: MAX_SUBS - team.subsUsed
    }
  }

  setPracticeMode(enabled) {
    this.practice = enabled
  }

  animatePlayers(dt) {
    for (const player of this.players) {
      if (!player.active) continue
      const speed = Math.hypot(player.velocity.x, player.velocity.z)
      const data = player.mesh.userData
      const speedNorm = clamp(speed / 7.2, 0, 1)
      const moving = speed > 0.4 && player.stumbleTimer <= 0
      const owner = this.ball.owner === player
      data.phase += dt * (moving ? 7.4 + speed * 1.75 : (player.isGK ? 2.1 : 2.6))

      const stride = moving ? 0.2 + speedNorm * 0.92 : 0
      const swing = Math.sin(data.phase) * stride
      const bend = moving ? 0.16 + speedNorm * 0.7 : 0.05
      const leftBend = Math.max(0.035, Math.max(0, -Math.sin(data.phase + 0.35)) * bend)
      const rightBend = Math.max(0.035, Math.max(0, Math.sin(data.phase + 0.35)) * bend)
      const armSwing = swing * (moving ? 0.82 : 0)

      data.leftLeg.rotation.x = swing
      data.rightLeg.rotation.x = -swing
      data.leftKnee.rotation.x = leftBend
      data.rightKnee.rotation.x = rightBend
      data.leftArm.rotation.x = -armSwing
      data.rightArm.rotation.x = armSwing
      data.leftElbow.rotation.x = -0.12 - Math.max(0, -armSwing) * 0.4
      data.rightElbow.rotation.x = -0.12 - Math.max(0, armSwing) * 0.4
      data.leftArm.rotation.z = -0.09 - speedNorm * 0.035
      data.rightArm.rotation.z = 0.09 + speedNorm * 0.035

      const idleBreath = Math.sin(data.phase * 0.7) * 0.007
      data.rig.rotation.x = speedNorm * 0.095 + (owner ? 0.035 : 0)
      data.rig.rotation.z = Math.sin(data.phase * 0.5) * 0.008
      data.rig.position.y = idleBreath + Math.abs(Math.sin(data.phase)) * (moving ? 0.018 : 0) - (owner ? 0.022 : 0)
      data.rig.position.x = 0

      if (player.isGK && !moving && player.stumbleTimer <= 0) {
        data.rig.position.y -= 0.025
        data.rig.rotation.x += 0.035
        data.leftArm.rotation.z = -0.3
        data.rightArm.rotation.z = 0.3
        data.leftElbow.rotation.x = -0.2
        data.rightElbow.rotation.x = -0.2
        data.leftKnee.rotation.x = Math.max(data.leftKnee.rotation.x, 0.12)
        data.rightKnee.rotation.x = Math.max(data.rightKnee.rotation.x, 0.12)
      }

      if (owner && !player.isGK) {
        const dribbleSwing = Math.sin(data.phase * 1.15) * 0.18
        data.leftLeg.rotation.x += dribbleSwing
        data.rightLeg.rotation.x -= dribbleSwing
        data.leftArm.rotation.z -= 0.06
        data.rightArm.rotation.z += 0.06
      }

      if (player.kickTimer > 0) {
        const progress = clamp(1 - player.kickTimer / 0.3, 0, 1)
        const kick = Math.sin(progress * Math.PI)
        const left = player.kickSide < 0
        const leg = left ? data.leftLeg : data.rightLeg
        const knee = left ? data.leftKnee : data.rightKnee
        leg.rotation.x = -1.38 * kick
        knee.rotation.x = 0.18 + (1 - kick) * 0.2
        data.rig.rotation.x += 0.13 * kick
        data.rig.position.y -= 0.035 * kick
        if (left) {
          data.rightArm.rotation.x = -0.5 * kick
          data.leftArm.rotation.x = 0.55 * kick
        } else {
          data.leftArm.rotation.x = -0.5 * kick
          data.rightArm.rotation.x = 0.55 * kick
        }
      }

      if (player.tackleTimer > 0) {
        const slide = Math.sin(Math.min(1, (1 - player.tackleTimer / 0.32) * 1.6) * Math.PI * 0.5)
        data.rig.rotation.x = -0.95 * slide
        data.rig.position.y -= 0.34 * slide
        data.leftLeg.rotation.x = -0.9 * slide
        data.rightLeg.rotation.x = -0.5 * slide
        data.leftKnee.rotation.x = 0.15 + 0.25 * slide
        data.rightKnee.rotation.x = 0.3 + 0.2 * slide
        data.leftArm.rotation.x = 0.45 * slide
        data.rightArm.rotation.x = -0.4 * slide
        data.leftArm.rotation.z = -0.35 * slide - 0.09
        data.rightArm.rotation.z = 0.35 * slide + 0.09
      }

      if (player.stumbleTimer > 0) {
        const duration = player.stumbleDuration || 0.65
        const progress = clamp(1 - player.stumbleTimer / duration, 0, 1)
        const rise = clamp(progress / 0.26, 0, 1)
        const recovery = clamp((progress - 0.62) / 0.38, 0, 1)
        const fall = rise * (1 - recovery)
        data.rig.rotation.x = 1.12 * fall
        data.rig.rotation.z = Math.sin(progress * Math.PI * 2.2) * 0.16 * fall
        data.rig.position.y = -0.48 * fall
        data.leftLeg.rotation.x = -0.35 * fall
        data.rightLeg.rotation.x = 0.15 * fall
        data.leftKnee.rotation.x = 0.55 * fall + 0.05
        data.rightKnee.rotation.x = 0.72 * fall + 0.05
        data.leftArm.rotation.x = -0.8 * fall
        data.rightArm.rotation.x = -0.55 * fall
        data.leftArm.rotation.z = -0.55 * fall - 0.09
        data.rightArm.rotation.z = 0.5 * fall + 0.09
      }

      if (player.diveTimer > 0 && player.isGK) {
        const dive = Math.sin(clamp(player.diveTimer / 0.65, 0, 1) * Math.PI)
        data.rig.rotation.z = (data.dive || player.diveDirection || 1) * 1.18 * dive
        data.rig.rotation.x = 0.05
        data.rig.position.y = -0.28 * dive
        data.leftArm.rotation.z = -0.5 - dive * 0.7
        data.rightArm.rotation.z = 0.5 + dive * 0.7
        data.leftLeg.rotation.x = -0.22 * dive
        data.rightLeg.rotation.x = -0.08 * dive
      } else if (player.isGK) {
        data.dive *= 0.82
      }

      const inFlow = this.phase === 'playing' || this.phase === 'kickoff' || this.phase === 'restart'
      const active = this.humans[player.team] && this.teams[player.team].controlledId === player.id && inFlow
      data.ring.visible = active
      data.ringBack.visible = active
      data.arrow.visible = active
      if (active) {
        data.ring.rotation.z += dt * 1.2
        const pulse = 1 + Math.sin(this.elapsed * 5 + player.slotIndex) * 0.05
        data.ring.scale.setScalar(pulse)
        data.ringBack.scale.setScalar(pulse)
        data.arrow.position.y = 2.62 + Math.sin(this.elapsed * 4) * 0.06
        data.arrow.rotation.y += dt * 1.4
      }
      data.shadow.visible = true
    }
  }
}
