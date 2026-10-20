import { DEFAULT_SETTINGS, DIFFICULTIES, MATCH_LENGTHS } from './data.js'

const SETTINGS_KEY = 'nova-eleven-settings-v1'
const TOURNAMENT_KEY = 'nova-eleven-tournament-v1'
const PROFILE_KEY = 'nova-eleven-profile-v1'

function safeParse(raw, fallback) {
  if (!raw) return fallback
  try {
    const value = JSON.parse(raw)
    return value && typeof value === 'object' ? value : fallback
  } catch {
    return fallback
  }
}

export function loadSettings() {
  const saved = safeParse(localStorage.getItem(SETTINGS_KEY), {})
  const settings = { ...DEFAULT_SETTINGS }
  if (Number.isFinite(saved.volume)) settings.volume = Math.min(1, Math.max(0, saved.volume))
  if (Number.isFinite(saved.music)) settings.music = Math.min(1, Math.max(0, saved.music))
  if (DIFFICULTIES[saved.difficulty]) settings.difficulty = saved.difficulty
  if (MATCH_LENGTHS.includes(saved.matchLength)) settings.matchLength = saved.matchLength
  if (['classic', 'alternate'].includes(saved.scheme)) settings.scheme = saved.scheme
  if (Number.isFinite(saved.cameraDistance)) settings.cameraDistance = Math.min(1.25, Math.max(0.78, saved.cameraDistance))
  if (typeof saved.screenShake === 'boolean') settings.screenShake = saved.screenShake
  if (typeof saved.crowd === 'boolean') settings.crowd = saved.crowd
  if (typeof saved.offside === 'boolean') settings.offside = saved.offside
  return settings
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    // Private browsing or a full quota should never stop the match.
  }
}

export function loadTournament() {
  const saved = safeParse(localStorage.getItem(TOURNAMENT_KEY), null)
  if (!saved || !saved.rounds || !saved.teamId) return null
  if (!Array.isArray(saved.rounds) || !Array.isArray(saved.rounds[0])) return null
  return saved
}

export function saveTournament(tournament) {
  try {
    localStorage.setItem(TOURNAMENT_KEY, JSON.stringify(tournament))
  } catch {
    // Non-fatal.
  }
}

export function clearTournament() {
  try {
    localStorage.removeItem(TOURNAMENT_KEY)
  } catch {
    // Non-fatal.
  }
}

export function loadProfile() {
  const saved = safeParse(localStorage.getItem(PROFILE_KEY), {})
  const number = (value) => (Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0)
  return {
    matches: number(saved.matches),
    wins: number(saved.wins),
    goals: number(saved.goals),
    bestPractice: number(saved.bestPractice)
  }
}

export function saveProfile(profile) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
  } catch {
    // Non-fatal.
  }
}

export function resetAllData() {
  try {
    localStorage.removeItem(SETTINGS_KEY)
    localStorage.removeItem(TOURNAMENT_KEY)
    localStorage.removeItem(PROFILE_KEY)
  } catch {
    // Non-fatal.
  }
}
