import { DEFAULT_SETTINGS, DIFFICULTIES, MATCH_LENGTHS } from './data.js'
import { defaultSquad } from './squad.js'

const SETTINGS_KEY = 'nova-eleven-settings-v1'
const TOURNAMENT_KEY = 'nova-eleven-tournament-v1'
const PROFILE_KEY = 'nova-eleven-profile-v1'
const SQUAD_KEY = 'nova-eleven-squad-v1'

function toCount(value) {
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0
}

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
  const number = toCount
  const stats = {}
  const rawStats = saved.playerStats && typeof saved.playerStats === 'object' ? saved.playerStats : {}
  for (const [key, value] of Object.entries(rawStats)) {
    if (!value || typeof value !== 'object') continue
    stats[key] = {
      apps: number(value.apps),
      goals: number(value.goals),
      assists: number(value.assists),
      rating: Math.min(10, Math.max(0, Number(value.rating) || 0))
    }
  }
  return {
    matches: number(saved.matches),
    wins: number(saved.wins),
    goals: number(saved.goals),
    bestPractice: number(saved.bestPractice),
    xp: number(saved.xp),
    coins: number(saved.coins ?? 600),
    keys: number(saved.keys ?? 1),
    crateOpens: number(saved.crateOpens),
    losses: number(saved.losses),
    draws: number(saved.draws),
    playerStats: stats,
    boosts: saved.boosts && typeof saved.boosts === 'object'
      ? {
        finishing: number(saved.boosts.finishing),
        pace: number(saved.boosts.pace),
        passing: number(saved.boosts.passing),
        defending: number(saved.boosts.defending)
      }
      : { finishing: 0, pace: 0, passing: 0, defending: 0 },
    lastRewards: safeParse(localStorage.getItem('nova-eleven-rewards-v1'), { xp: 0, coins: 0, keys: 0, levelUp: 0 }),
    crateHistory: Array.isArray(saved.crateHistory) ? saved.crateHistory.slice(0, 12) : []
  }
}

export function saveProfile(profile) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
  } catch {
    // Non-fatal.
  }
}

export function saveLastRewards(rewards) {
  try {
    localStorage.setItem('nova-eleven-rewards-v1', JSON.stringify(rewards))
  } catch {
    // Non-fatal.
  }
}

export function loadSquad() {
  const saved = safeParse(localStorage.getItem(SQUAD_KEY), null)
  const base = defaultSquad()
  if (!saved) return base
  const lineup = Array.isArray(saved.lineup) ? saved.lineup.slice(0, 11) : base.lineup
  const bench = Array.isArray(saved.bench) ? saved.bench.slice(0, 5) : base.bench
  const unlocked = Array.isArray(saved.unlocked) && saved.unlocked.length ? saved.unlocked : base.unlocked
  return {
    teamName: typeof saved.teamName === 'string' && saved.teamName.trim() ? saved.teamName.trim().slice(0, 18).toUpperCase() : base.teamName,
    formation: typeof saved.formation === 'string' ? saved.formation : base.formation,
    kit: typeof saved.kit === 'string' ? saved.kit : base.kit,
    lineup: lineup.map((id) => (typeof id === 'string' ? id : null)),
    bench: bench.map((id) => (typeof id === 'string' ? id : null)),
    unlocked,
    boosts: saved.boosts && typeof saved.boosts === 'object'
      ? {
        finishing: toCount(saved.boosts.finishing),
        pace: toCount(saved.boosts.pace),
        passing: toCount(saved.boosts.passing),
        defending: toCount(saved.boosts.defending)
      }
      : base.boosts
  }
}

export function saveSquad(squad) {
  try {
    localStorage.setItem(SQUAD_KEY, JSON.stringify(squad))
  } catch {
    // Non-fatal.
  }
}

export function resetAllData() {
  try {
    localStorage.removeItem(SETTINGS_KEY)
    localStorage.removeItem(TOURNAMENT_KEY)
    localStorage.removeItem(PROFILE_KEY)
    localStorage.removeItem(SQUAD_KEY)
    localStorage.removeItem('nova-eleven-rewards-v1')
  } catch {
    // Non-fatal.
  }
}
