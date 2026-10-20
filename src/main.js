import * as THREE from 'three'
import { DEFAULT_SETTINGS, getTeam } from './data.js'
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
  profile.matches += 1
  if (snapshot.score[0] > snapshot.score[1]) profile.wins += 1
  profile.goals += snapshot.score[0]
  saveProfile(profile)
  ui.setProfile(profile)

  let tournamentResult = null
  let canContinueCup = false
  let cupButtonLabel = 'CONTINUE CUP'
  if (mode === 'tournament' && tournament) {
    tournamentResult = recordUserResult(tournament, snapshot.score[0], snapshot.score[1])
    saveTournament(tournament)
    ui.setTournament(tournament)
    canContinueCup = true
    cupButtonLabel = tournament.champion
      ? 'VIEW THE BRACKET'
      : tournament.eliminated
        ? 'VIEW THE BRACKET'
        : 'CONTINUE CUP'
  }
  ui.showResults({
    snapshot,
    mode,
    tournamentResult,
    canContinueCup,
    cupButtonLabel,
    allowRematch: mode !== 'tournament'
  })
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
    profile = { matches: 0, wins: 0, goals: 0, bestPractice: 0 }
    Object.assign(settings, DEFAULT_SETTINGS)
    saveSettings(settings)
    audio.setVolumes(settings)
    engine?.setSettings(settings)
    ui.setTournament(null)
    ui.setProfile(profile)
  },
  onUiSound(type) {
    audio.unlock()
    if (type === 'select') audio.select()
    else audio.ui()
  },
  onSettingsSaved() {},
  onMenuRoute() {}
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

const cameraLook = new THREE.Vector3()
const desiredCamera = new THREE.Vector3()
const idleCamera = new THREE.Vector3()

function updateCamera(dt) {
  const camera = world.camera
  if (!engine?.active || appState === 'menu') {
    world.setMenuCamera(window.innerWidth / window.innerHeight)
    return
  }
  const ball = engine.ball.position
  const distance = settings.cameraDistance
  const targetZ = ball.z + 6.5
  const desiredZ = clamp(ball.z - 20.5 * distance, -40, 40)
  desiredCamera.set(8.5 + ball.x * 0.18, 25.5 + Math.abs(ball.z) * 0.035, desiredZ)
  if (cameraSnap) {
    camera.position.copy(desiredCamera)
    cameraSnap = false
  } else {
    const smoothing = 1 - Math.exp(-3.3 * dt)
    camera.position.lerp(desiredCamera, smoothing)
  }
  cameraLook.set(ball.x * 0.18, 0.8, targetZ)
  camera.lookAt(cameraLook)
  if (shake > 0.01) {
    camera.position.x += (Math.random() - 0.5) * shake * 0.55
    camera.position.y += (Math.random() - 0.5) * shake * 0.38
    camera.position.z += (Math.random() - 0.5) * shake * 0.5
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
    actions
  }
}
