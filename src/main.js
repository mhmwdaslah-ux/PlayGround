import * as THREE from 'three'
import { DEFAULT_SETTINGS, getTeam, PITCH } from './data.js'
import { StadiumAudio } from './audio.js'
import { MatchEngine } from './engine.js'
import { InputController } from './input.js'
import {
  clearTournament,
  loadProfile,
  loadSettings,
  loadTournament,
  resetAllData,
  saveProfile,
  saveSettings,
  saveTournament
} from './storage.js'
import { createTournament, getUserMatch, recordUserResult } from './tournament.js'
import { UIController } from './ui.js'
import { createWorld } from './world.js'
import { CRATES, levelFromXp, levelUpReward, matchRewards, rankProgress, rollCrate } from './progression.js'
import { PLAYER_POOL, buildCustomTeam } from './squad.js'
import { loadSquad, saveLastRewards, saveSquad } from './storage.js'

const canvas = document.getElementById('scene')
let renderer
try {
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
    alpha: false
  })
} catch (error) {
  document.getElementById('fatalError')?.classList.add('active')
  document.getElementById('loadingScreen')?.classList.remove('active')
  throw error
}

const coarsePointer = window.matchMedia?.('(pointer: coarse)')?.matches || 'ontouchstart' in window
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarsePointer ? 1.35 : 1.8))
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setClearColor('#041017', 1)

const scene = new THREE.Scene()
const world = createWorld(scene, renderer)
const input = new InputController()
const audio = new StadiumAudio()
const settings = loadSettings()
let profile = loadProfile()
let tournament = loadTournament()
let squad = loadSquad()
let appState = 'menu'
let currentConfig = null
let introTimer = null
let cameraSnap = true
let shake = 0
let ui = null
let engine = null

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

function startPractice() {
  startMatch({
    mode: 'practice',
    homeId: 'aurora',
    awayId: 'lunar',
    difficulty: settings.difficulty,
    lengthMinutes: 5,
    humans: [true, false]
  })
}

function startTournamentMatch() {
  if (!tournament) {
    ui.showTournament()
    return
  }
  const match = getUserMatch(tournament)
  if (!match) {
    ui.showTournament()
    return
  }
  const opponentId = match.home === tournament.teamId ? match.away : match.home
  startMatch({
    mode: 'tournament',
    homeId: tournament.teamId,
    awayId: opponentId,
    difficulty: tournament.difficulty,
    lengthMinutes: tournament.lengthMinutes,
    humans: [true, false]
  })
}

function startMatch(config) {
  clearTimeout(introTimer)
  audio.unlock()
  audio.setVolumes(settings)
  currentConfig = config
  if (config.homeId === 'myclub') config.homeTeam = buildCustomTeam(squad)
  if (config.awayId === 'myclub') config.awayTeam = buildCustomTeam(squad)
  engine.setSettings(settings)
  engine.start(config)
  cameraSnap = true
  shake = 0
  appState = 'intro'
  engine.setPaused(true)
  const snapshot = engine.getSnapshot()
  ui.enterMatch(config, snapshot)
  audio.setCrowd(true, 0.42)
  input.clearTransient()
  introTimer = setTimeout(() => {
    if (appState !== 'intro') return
    ui.hideMatchIntro()
    engine.setPaused(false)
    appState = 'match'
    audio.setCrowd(true, 0.55)
    input.clearTransient()
  }, 2300)
}

function handleHalftime(snapshot) {
  appState = 'halftime'
  audio.setCrowd(false)
  ui.showHalftime(snapshot)
}

function handleFulltime(snapshot) {
  if (appState === 'results') return
  appState = 'results'
  engine.setPaused(true)
  audio.setCrowd(false)
  const mode = currentConfig?.mode || 'quick'
  const goalsFor = snapshot.score[0]
  const goalsAgainst = snapshot.score[1]
  profile.matches += 1
  if (goalsFor > goalsAgainst) {
    profile.wins += 1
  } else if (goalsFor === goalsAgainst) {
    profile.draws += 1
  } else {
    profile.losses += 1
  }
  profile.goals += goalsFor

  let tournamentResult = null
  let canContinueCup = false
  let cupButtonLabel = 'CONTINUE CUP'
  if (mode === 'tournament' && tournament) {
    tournamentResult = recordUserResult(tournament, goalsFor, goalsAgainst)
    saveTournament(tournament)
    ui.setTournament(tournament)
    canContinueCup = true
    cupButtonLabel = tournament.champion
      ? 'VIEW THE BRACKET'
      : tournament.eliminated
        ? 'VIEW THE BRACKET'
        : 'CONTINUE CUP'
  }

  const rewards = applyMatchRewards({
    result: goalsFor > goalsAgainst ? 'win' : goalsFor === goalsAgainst ? 'draw' : 'loss',
    goalsFor,
    goalsAgainst,
    tournamentRound: Boolean(tournamentResult?.advanced)
  })
  applyPlayerStats(snapshot)
  saveProfile(profile)
  saveLastRewards(rewards)
  ui.setProfile(profile)
  ui.setSquad(squad)

  ui.showResults({
    snapshot,
    mode,
    tournamentResult,
    canContinueCup,
    cupButtonLabel,
    rewards,
    allowRematch: mode !== 'tournament'
  })
}

function applyMatchRewards({ result, goalsFor, goalsAgainst, tournamentRound }) {
  const earned = matchRewards({ result, goalsFor, goalsAgainst, tournamentRound })
  const before = levelFromXp(profile.xp || 0)
  profile.xp += earned.xp
  profile.coins += earned.coins
  profile.keys += earned.keys
  let levelUps = 0
  const after = levelFromXp(profile.xp || 0)
  if (after.level > before.level) {
    levelUps = after.level - before.level
    for (let level = before.level + 1; level <= after.level; level += 1) {
      const reward = levelUpReward(level)
      profile.coins += reward.coins
      profile.keys += reward.keys
    }
  }
  return { xp: earned.xp, coins: earned.coins, keys: earned.keys, levelUp: levelUps, level: after.level }
}

function applyPlayerStats(snapshot) {
  if (!engine) return
  const keys = engine.getStatKeys()
  const stats = profile.playerStats || (profile.playerStats = {})
  const ensure = (key) => {
    if (!stats[key]) stats[key] = { apps: 0, goals: 0, assists: 0, rating: 0 }
    return stats[key]
  }
  for (const player of engine.teams[0]?.players || []) {
    const key = keys[player.id]
    if (key) ensure(key).apps += 1
  }
  for (const scorer of snapshot.scorers || []) {
    if (scorer.ownGoal || scorer.team !== 0) continue
    const goalKey = keys[scorer.scorerId]
    if (goalKey) ensure(goalKey).goals += 1
    const assistKey = keys[scorer.assistId]
    if (assistKey) ensure(assistKey).assists += 1
  }
}

function addShake(amount) {
  if (!settings.screenShake) return
  shake = Math.min(1.8, shake + amount)
}

const actions = {
  onRoute(route) {
    audio.unlock()
    if (route === 'quick') {
      appState = 'menu'
      ui.showQuickSetup()
      audio.ui()
    } else if (route === 'tournament') {
      appState = 'menu'
      ui.showTournament()
      audio.ui()
    } else if (route === 'practice') {
      audio.select()
      startPractice()
    } else if (route === 'help') {
      ui.openHelp()
    }
  },
  onBackToMenu() {
    clearTimeout(introTimer)
    if (engine?.active) engine.stop()
    currentConfig = null
    appState = 'menu'
    ui.showMainMenu()
    audio.setCrowd(false)
    cameraSnap = true
  },
  onQuickMatch(config) {
    audio.select()
    startMatch(config)
  },
  onStartTournament({ teamId, difficulty, lengthMinutes }) {
    tournament = createTournament({ teamId, difficulty, lengthMinutes })
    saveTournament(tournament)
    ui.setTournament(tournament)
    ui.showTournament()
    ui.showToast({ title: 'CUP DRAWN', detail: 'Your quarter-final is ready. Check the bracket.', tone: 'success' })
    audio.horn()
  },
  onPlayTournamentMatch() {
    audio.select()
    startTournamentMatch()
  },
  onNewTournament() {
    clearTournament()
    tournament = null
    ui.setTournament(null)
    ui.renderTournament()
    ui.showToast({ title: 'NEW CUP', detail: 'The bracket has been reset.', tone: 'info' })
    audio.ui()
  },
  onPause() {
    if (appState !== 'match' || !engine.active) return
    engine.setPaused(true)
    appState = 'paused'
    ui.openPause(engine.getSnapshot())
  },
  onResume() {
    if (appState !== 'paused') return
    ui.closePause()
    engine.setPaused(false)
    appState = 'match'
    input.clearTransient()
  },
  onQuitMatch() {
    clearTimeout(introTimer)
    engine.stop()
    ui.closePause()
    ui.showMainMenu()
    appState = 'menu'
    currentConfig = null
    audio.setCrowd(false)
    cameraSnap = true
  },
  onSecondHalf() {
    ui.hideHalftime()
    engine.startSecondHalf()
    engine.setPaused(false)
    appState = 'match'
    input.clearTransient()
  },
  onRematch() {
    if (!currentConfig || currentConfig.mode === 'tournament') return
    ui.closeResults()
    const config = { ...currentConfig }
    startMatch(config)
  },
  onMenu() {
    clearTimeout(introTimer)
    engine.stop()
    ui.closeResults()
    ui.showMainMenu()
    appState = 'menu'
    currentConfig = null
    audio.setCrowd(false)
    cameraSnap = true
  },
  onContinueCup() {
    engine.stop()
    ui.showTournament()
    appState = 'menu'
    audio.setCrowd(false)
    cameraSnap = true
  },
  onFormation(formation) {
    engine.setFormation(0, formation)
    ui.lastSnapshot = engine.getSnapshot()
    ui.renderTactics(ui.lastSnapshot)
  },
  onMentality(mentality) {
    engine.setMentality(0, mentality)
    ui.lastSnapshot = engine.getSnapshot()
    ui.renderTactics(ui.lastSnapshot)
  },
  onSubstitute({ playerId, benchIndex }) {
    const result = engine.substitute(0, playerId, benchIndex)
    if (!result.ok) {
      ui.showToast({ title: 'SUBSTITUTION UNAVAILABLE', detail: result.message, tone: 'warn' })
      return
    }
    ui.selectedOutId = null
    ui.selectedBenchIndex = null
    ui.lastSnapshot = engine.getSnapshot()
    ui.refreshSubs()
  },
  getSubOptions(teamIndex = 0) {
    return engine.getSubOptions(teamIndex)
  },
  onSettingsChanged(nextSettings) {
    Object.assign(settings, nextSettings)
    saveSettings(settings)
    audio.unlock()
    audio.setVolumes(settings)
    engine?.setSettings(settings)
  },
  onResetData() {
    resetAllData()
    tournament = null
    profile = loadProfile()
    squad = loadSquad()
    Object.assign(settings, DEFAULT_SETTINGS)
    saveSettings(settings)
    audio.setVolumes(settings)
    engine?.setSettings(settings)
    ui.setTournament(null)
    ui.setProfile(profile)
    ui.setSquad(squad)
  },
  onUiSound(type) {
    audio.unlock()
    if (type === 'select') audio.select()
    else audio.ui()
  },
  onSettingsSaved() {},
  onMenuRoute() {},
  onShowCareer() {
    appState = 'menu'
    ui.showCareer()
  },
  onOpenCrate(crateId) {
    const crate = CRATES.find((entry) => entry.id === crateId) || CRATES[0]
    if (profile.keys < crate.keyCost) {
      ui.showToast({ title: 'NO KEY', detail: 'Keys drop from level ups and cup wins.', tone: 'warn' })
      return null
    }
    if (profile.coins < crate.cost) {
      ui.showToast({ title: 'NOT ENOUGH COINS', detail: 'Win matches or level up to earn more.', tone: 'warn' })
      return null
    }
    profile.keys -= crate.keyCost
    profile.coins -= crate.cost
    profile.crateOpens += 1
    const pool = PLAYER_POOL.filter((player) => !(squad.unlocked || []).includes(player.id))
    const reward = rollCrate(crate.id, Math.random, pool)
    if (reward.type === 'coins') profile.coins += reward.amount
    if (reward.type === 'xp') profile.xp += reward.amount
    if (reward.type === 'boost') {
      const keys = ['finishing', 'pace', 'passing', 'defending']
      const key = keys[Math.floor(Math.random() * keys.length)]
      const current = profile.boosts?.[key] || 0
      if (current < 5) {
        profile.boosts = { ...profile.boosts, [key]: current + 1 }
        squad.boosts = { ...squad.boosts, [key]: current + 1 }
      }
    }
    if (reward.type === 'card' && reward.card) {
      squad.unlocked = [...new Set([...(squad.unlocked || []), reward.card.id])]
      reward.detail = `${reward.card.position} · ${reward.card.overall} OVR — added to My Club`
    }
    if (reward.type === 'kit') {
      const kits = ['volt', 'flare', 'gold', 'violet', 'ice', 'ember']
      const next = kits[(kits.indexOf(squad.kit) + 1) % kits.length]
      squad.kit = next
    }
    squad.boosts = { ...squad.boosts, ...(profile.boosts || {}) }
    profile.crateHistory = [
      { name: reward.title, rarity: reward.rarity, type: reward.type, at: Date.now() },
      ...(profile.crateHistory || [])
    ].slice(0, 12)
    saveProfile(profile)
    saveSquad(squad)
    ui.setProfile(profile)
    ui.setSquad(squad)
    audio.horn()
    return reward
  },
  onSquadUpdate(nextSquad) {
    squad = { ...squad, ...nextSquad }
    profile.boosts = { ...profile.boosts, ...(squad.boosts || {}) }
    saveSquad(squad)
    saveProfile(profile)
    ui.setSquad(squad)
  }
}

const engineCallbacks = {
  onHud(snapshot) {
    if (appState === 'menu' || appState === 'results') return
    ui.updateHud(snapshot)
    if (snapshot.practice && snapshot.practicePoints > profile.bestPractice) {
      profile.bestPractice = snapshot.practicePoints
      ui.setProfile(profile)
      saveProfile(profile)
    }
  },
  onEvent(type, payload) {
    if (type === 'toast') {
      ui.showToast(payload)
    } else if (type === 'commentary') {
      ui.setCommentary(payload)
    } else if (type === 'goal') {
      ui.showGoal(payload)
      addShake(1.25)
    } else if (type === 'save') {
      addShake(0.22)
      ui.showToast({ title: 'SAVED', detail: `${payload.keeper.profile.name} keeps it out.`, tone: 'info' }, 1600)
    } else if (type === 'foul') {
      addShake(0.55)
    } else if (type === 'shot') {
      addShake(0.12 + (payload.power || 0) * 0.15)
    } else if (type === 'targetHit') {
      ui.targetFlash()
      addShake(0.35)
      profile.xp = (profile.xp || 0) + 14
      profile.coins = (profile.coins || 0) + 7
      saveProfile(profile)
      ui.setProfile(profile)
    } else if (type === 'practiceGoal') {
      ui.updateHud(payload.snapshot)
    } else if (type === 'halftime') {
      handleHalftime(payload)
    } else if (type === 'fulltime') {
      handleFulltime(payload)
    } else if (type === 'restart') {
      addShake(0.1)
    }
  }
}

ui = new UIController(settings, actions)
engine = new MatchEngine(world, input, audio, settings, engineCallbacks)
input.bindTouch(document.getElementById('touchControls'), document.getElementById('joystick'), document.getElementById('joystickKnob'))
input.onActivity = () => audio.unlock()
ui.setTournament(tournament)
ui.setProfile(profile)
ui.setSquad(squad)
audio.setVolumes(settings)
ui.showLoading('Building the stadium…')

document.addEventListener('pointerdown', () => {
  audio.unlock()
  audio.setVolumes(settings)
}, { passive: true })
window.addEventListener('keydown', () => audio.unlock(), { once: true })

window.addEventListener('resize', () => {
  const width = window.innerWidth
  const height = window.innerHeight
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarsePointer ? 1.35 : 1.8))
  renderer.setSize(width, height)
  world.camera.aspect = width / height
  world.camera.updateProjectionMatrix()
})

window.addEventListener('keydown', (event) => {
  if (event.code === 'Escape' || event.code === 'KeyP') {
    if (document.getElementById('settingsScreen')?.classList.contains('active')) {
      ui.closeSettings()
      event.preventDefault()
      return
    }
    if (document.getElementById('helpScreen')?.classList.contains('active')) {
      ui.closeHelp()
      event.preventDefault()
      return
    }
    if (appState === 'paused') {
      actions.onResume()
      event.preventDefault()
    } else if (appState === 'match') {
      actions.onPause()
      event.preventDefault()
    }
  }
})

document.addEventListener('visibilitychange', () => {
  if (document.hidden && appState === 'match') actions.onPause()
})

const cameraFocus = new THREE.Vector3()
const cameraLook = new THREE.Vector3()
const desiredCamera = new THREE.Vector3()
const desiredLook = new THREE.Vector3()

function updateCamera(dt) {
  const camera = world.camera
  if (!engine?.active || appState === 'menu') {
    world.setMenuCamera(window.innerWidth / window.innerHeight)
    cameraSnap = true
    return
  }
  const ball = engine.ball.position
  const home = engine.getControlledRaw(0)
  const away = engine.getControlledRaw(1)
  cameraFocus.set(ball.x, 0, ball.z)
  if (home) {
    const separation = home.position.distanceTo(ball)
    cameraFocus.lerp(home.position, clamp(0.2 + separation / 65, 0.2, 0.38))
  }
  if (away && engine.humans?.[1]) cameraFocus.lerp(away.position, 0.1)
  cameraFocus.x = clamp(cameraFocus.x, -PITCH.halfWidth * 0.9, PITCH.halfWidth * 0.9)
  cameraFocus.z = clamp(cameraFocus.z, -PITCH.halfLength * 0.94, PITCH.halfLength * 0.94)

  const ballVelocity = engine.ball.velocity
  const speed = Math.hypot(ballVelocity.x, ballVelocity.z)
  const widthFactor = Math.abs(ball.x) / PITCH.halfWidth
  const endFactor = Math.abs(ball.z) / PITCH.halfLength
  const dynamicZoom = Math.min(1.6, (speed / 24) * 1.15 + widthFactor * 1.05 + endFactor * 0.45)
  const distance = (15.1 + dynamicZoom) * settings.cameraDistance
  const height = 10.35 + distance * 0.075 + widthFactor * 0.7
  const shoulder = 2.15
  desiredCamera.set(
    cameraFocus.x * 0.64 + shoulder,
    height,
    cameraFocus.z - distance
  )

  const leadZ = clamp(ballVelocity.z * 0.14, -2.1, 3.1)
  desiredLook.set(
    cameraFocus.x * 0.72,
    1.18,
    cameraFocus.z + 4.35 + leadZ
  )

  if (cameraSnap) {
    camera.position.copy(desiredCamera)
    cameraLook.copy(desiredLook)
    cameraSnap = false
  } else {
    camera.position.lerp(desiredCamera, 1 - Math.exp(-5.2 * dt))
    cameraLook.lerp(desiredLook, 1 - Math.exp(-7.5 * dt))
  }
  camera.lookAt(cameraLook)
  if (shake > 0.01) {
    const amount = Math.min(shake, 1.2)
    camera.position.x += (Math.random() - 0.5) * amount * 0.34
    camera.position.y += (Math.random() - 0.5) * amount * 0.24
    camera.position.z += (Math.random() - 0.5) * amount * 0.3
    camera.lookAt(cameraLook)
    shake = Math.max(0, shake - dt * 2.1)
  }
}

let lastFrameTime = performance.now()
function frame(now = performance.now()) {
  const dt = Math.min((now - lastFrameTime) / 1000, 0.05)
  lastFrameTime = now
  input.pollGamepads()
  engine.update(dt)
  updateCamera(dt)
  renderer.render(scene, world.camera)
  input.endFrame()
  requestAnimationFrame(frame)
}

world.setMenuCamera(window.innerWidth / window.innerHeight)
requestAnimationFrame(frame)

setTimeout(() => {
  ui.finishLoading()
}, 650)

if (window.matchMedia?.('(pointer: coarse)')?.matches) {
  document.body.classList.add('touch')
}

if (import.meta.env.DEV) {
  window.__nova = {
    get engine() { return engine },
    get appState() { return appState },
    get tournament() { return tournament },
    get settings() { return settings },
    get world() { return world },
    get input() { return input },
    get profile() { return profile },
    get squad() { return squad },
    actions
  }
}
