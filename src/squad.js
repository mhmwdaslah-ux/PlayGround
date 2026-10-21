import { FORMATIONS } from './data.js'

const ATTR_WEIGHTS = {
  GK: { pac: 0.35, sho: 0.2, pas: 0.62, dri: 0.32, def: 0.9, phy: 0.7 },
  CB: { pac: 0.45, sho: 0.22, pas: 0.5, dri: 0.38, def: 0.95, phy: 0.9 },
  LB: { pac: 0.85, sho: 0.4, pas: 0.66, dri: 0.7, def: 0.72, phy: 0.62 },
  RB: { pac: 0.85, sho: 0.4, pas: 0.66, dri: 0.7, def: 0.72, phy: 0.62 },
  CDM: { pac: 0.5, sho: 0.48, pas: 0.82, dri: 0.6, def: 0.85, phy: 0.8 },
  CM: { pac: 0.6, sho: 0.64, pas: 0.9, dri: 0.8, def: 0.6, phy: 0.7 },
  CAM: { pac: 0.72, sho: 0.86, pas: 0.86, dri: 0.9, def: 0.32, phy: 0.6 },
  LW: { pac: 0.95, sho: 0.76, pas: 0.74, dri: 0.95, def: 0.28, phy: 0.6 },
  RW: { pac: 0.95, sho: 0.76, pas: 0.74, dri: 0.95, def: 0.28, phy: 0.6 },
  ST: { pac: 0.82, sho: 0.96, pas: 0.6, dri: 0.82, def: 0.24, phy: 0.74 }
}

const OVERALL_WEIGHTS = {
  GK: { pac: 0.08, sho: 0.02, pas: 0.2, dri: 0.05, def: 0.45, phy: 0.2 },
  CB: { pac: 0.12, sho: 0.03, pas: 0.1, dri: 0.05, def: 0.5, phy: 0.2 },
  LB: { pac: 0.26, sho: 0.06, pas: 0.18, dri: 0.16, def: 0.24, phy: 0.1 },
  RB: { pac: 0.26, sho: 0.06, pas: 0.18, dri: 0.16, def: 0.24, phy: 0.1 },
  CDM: { pac: 0.1, sho: 0.1, pas: 0.3, dri: 0.16, def: 0.24, phy: 0.1 },
  CM: { pac: 0.12, sho: 0.18, pas: 0.3, dri: 0.22, def: 0.1, phy: 0.08 },
  CAM: { pac: 0.16, sho: 0.28, pas: 0.24, dri: 0.24, def: 0.03, phy: 0.05 },
  LW: { pac: 0.28, sho: 0.24, pas: 0.18, dri: 0.24, def: 0.02, phy: 0.04 },
  RW: { pac: 0.28, sho: 0.24, pas: 0.18, dri: 0.24, def: 0.02, phy: 0.04 },
  ST: { pac: 0.2, sho: 0.42, pas: 0.1, dri: 0.16, def: 0.02, phy: 0.1 }
}

const POOL = [
  ['Kai Møller', 'ST', 91, 'legendary'],
  ['Rafael Siza', 'ST', 88, 'epic'],
  ['Diego Aranda', 'ST', 86, 'epic'],
  ['Tobias Renner', 'ST', 84, 'rare'],
  ['Amir Haddad', 'ST', 83, 'rare'],
  ['Noah Verhoeven', 'ST', 81, 'rare'],
  ['Luka Perin', 'ST', 79, 'common'],
  ['Malik Traoré', 'ST', 78, 'common'],
  ['Yusuf Demir', 'ST', 77, 'common'],
  ['Iker Solano', 'CAM', 89, 'legendary'],
  ['Enzo Marchetti', 'CAM', 86, 'epic'],
  ['Rafa Quintero', 'CAM', 85, 'epic'],
  ['Nico Bergström', 'CAM', 83, 'rare'],
  ['Joel Karam', 'CAM', 81, 'rare'],
  ['Casper Holm', 'CAM', 79, 'common'],
  ['Mateo Vidal', 'LW', 88, 'epic'],
  ['Ayo Balogun', 'LW', 86, 'epic'],
  ['Sami Rahimi', 'LW', 84, 'rare'],
  ['Toma Lenc', 'LW', 82, 'rare'],
  ['Jules Marchand', 'LW', 80, 'common'],
  ['Bruno Santi', 'RW', 88, 'epic'],
  ['Kai Oduya', 'RW', 85, 'epic'],
  ['Rian Fletcher', 'RW', 83, 'rare'],
  ['Emre Yilmaz', 'RW', 81, 'rare'],
  ['Vito Serra', 'RW', 79, 'common'],
  ['Cato Vale', 'CM', 87, 'epic'],
  ['Idris Kamara', 'CM', 85, 'epic'],
  ['HugoLindqvist', 'CM', 84, 'rare'],
  ['Marco Bellini', 'CM', 82, 'rare'],
  ['Eden Novak', 'CM', 80, 'common'],
  ['Ravi Menon', 'CM', 79, 'common'],
  ['Jae Lindgren', 'CDM', 86, 'epic'],
  ['Oskar Ilves', 'CDM', 84, 'rare'],
  ['Abel Mensah', 'CDM', 82, 'rare'],
  ['Mika Sohl', 'CDM', 80, 'common'],
  ['Theo Larkin', 'CB', 87, 'epic'],
  ['Ivan Petrovic', 'CB', 85, 'epic'],
  ['Sergio Duarte', 'CB', 84, 'rare'],
  ['Adam Zielinski', 'CB', 82, 'rare'],
  ['Felix Braun', 'CB', 80, 'common'],
  ['Nikolai Rask', 'LB', 85, 'epic'],
  ['Jonas Weiss', 'LB', 83, 'rare'],
  ['Levi Osei', 'LB', 81, 'rare'],
  ['Ansel Ruiz', 'LB', 80, 'common'],
  ['Kai Lindgren', 'LB', 78, 'common'],
  ['Milan Horvat', 'RB', 85, 'epic'],
  ['HugoCosta', 'RB', 83, 'rare'],
  ['Dario Sanna', 'RB', 81, 'rare'],
  ['Ruben Adal', 'RB', 80, 'common'],
  ['Jude Kanter', 'RB', 78, 'common'],
  ['Tobias Lund', 'GK', 87, 'epic'],
  ['Petar Vukovic', 'GK', 85, 'epic'],
  ['Samuel Oduya', 'GK', 83, 'rare'],
  ['Aron Beck', 'GK', 81, 'rare'],
  ['Yuri Gusev', 'GK', 79, 'common']
]

function seeded(seed) {
  let state = (seed * 2654435761) >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function buildPlayer(entry, index) {
  const [name, position, base, rarity] = entry
  const random = seeded(index * 97 + 13)
  const weights = ATTR_WEIGHTS[position] || ATTR_WEIGHTS.CM
  const attributes = {}
  for (const [key, weight] of Object.entries(weights)) {
    const jitter = (random() - 0.5) * 13
    attributes[key] = clamp(Math.round(base * (0.5 + weight * 0.62) + jitter), 26, 99)
  }
  const overallWeights = OVERALL_WEIGHTS[position] || OVERALL_WEIGHTS.CM
  let overall = 0
  let weightSum = 0
  for (const [key, weight] of Object.entries(overallWeights)) {
    overall += attributes[key] * weight
    weightSum += weight
  }
  const rating = clamp(Math.round(overall / weightSum), 40, 99)
  const id = `card-${index}`
  const [first, ...rest] = name.split(' ')
  return {
    id,
    name,
    position,
    overall: rating,
    attributes,
    rarity,
    value: Math.round((rating - 55) * (rarity === 'legendary' ? 2600 : rarity === 'epic' ? 1800 : rarity === 'rare' ? 1200 : 700)),
    initials: `${first[0]}${rest[0] ? rest[0][0] : ''}`.toUpperCase(),
    number: 0
  }
}

export const PLAYER_POOL = POOL.map(buildPlayer)

export const PLAYER_BY_ID = new Map(PLAYER_POOL.map((player) => [player.id, player]))

export const POSITION_GROUPS = {
  GK: 'GK',
  CB: 'DF',
  LB: 'DF',
  RB: 'DF',
  CDM: 'MF',
  CM: 'MF',
  CAM: 'MF',
  LW: 'FW',
  RW: 'FW',
  ST: 'FW'
}

export function formatAttributes(player) {
  if (!player?.attributes) return { pac: 0, sho: 0, pas: 0, dri: 0, def: 0, phy: 0 }
  return player.attributes
}

export function slotAccepts(slot, position) {
  const options = slot.positions || [slot.role === 'GK' ? 'GK' : slot.role === 'DF' ? 'CB' : slot.role === 'MF' ? 'CM' : 'ST']
  if (options.includes(position)) return 3
  const group = POSITION_GROUPS[position] || 'MF'
  if (options.some((option) => (POSITION_GROUPS[option] || 'MF') === group)) return 1
  return 0
}

export function positionPenalty(player, slot) {
  const fit = slotAccepts(slot, player.position)
  if (fit === 3) return 0
  if (fit === 1) return 6
  return 14
}

export function effectiveOverall(player, slot) {
  return Math.max(30, player.overall - positionPenalty(player, slot))
}

export function autoAssign(players, formationId) {
  const formation = FORMATIONS[formationId] || FORMATIONS['4-3-3']
  const slots = formation.slots
  const used = new Set()
  const assignment = new Array(slots.length).fill(null)
  const pool = [...players].sort((a, b) => b.overall - a.overall)

  // First fill the strict slots (one position only) so specialists keep their role.
  const order = slots
    .map((slot, index) => ({ slot, index }))
    .sort((a, b) => (a.slot.positions?.length || 1) - (b.slot.positions?.length || 1))
  for (const { slot, index } of order) {
    const options = slot.positions || []
    if (options.length !== 1) continue
    const best = pool.find((player) => !used.has(player.id) && player.position === options[0])
    if (!best) continue
    used.add(best.id)
    assignment[index] = best
  }

  // Then fill the flexible slots with the best remaining fit.
  for (const { slot, index } of order) {
    if (assignment[index]) continue
    let bestIndex = -1
    let bestScore = -Infinity
    for (let i = 0; i < pool.length; i += 1) {
      if (used.has(pool[i].id)) continue
      const player = pool[i]
      const fit = slotAccepts(slot, player.position)
      if (fit === 0) continue
      const score = fit * 1000 + player.overall
      if (score > bestScore) {
        bestScore = score
        bestIndex = i
      }
    }
    if (bestIndex >= 0) {
      used.add(pool[bestIndex].id)
      assignment[index] = pool[bestIndex]
    }
  }
  return assignment
}

export function teamRating(lineup) {
  const list = lineup.filter(Boolean)
  if (!list.length) return 60
  const total = list.reduce((sum, player) => sum + player.overall, 0)
  return Math.round(total / list.length)
}

export const KIT_PALETTES = [
  { id: 'volt', primary: '#31f2c5', secondary: '#072b33', accent: '#eafff9' },
  { id: 'flare', primary: '#ff5b57', secondary: '#2b0a12', accent: '#ffd166' },
  { id: 'gold', primary: '#ffd04a', secondary: '#332008', accent: '#ff7a45' },
  { id: 'violet', primary: '#bfc2ff', secondary: '#17163c', accent: '#8b8dff' },
  { id: 'ice', primary: '#68d7ff', secondary: '#0b2636', accent: '#ffffff' },
  { id: 'ember', primary: '#ff974d', secondary: '#301407', accent: '#ffe1bd' }
]

export function buildLineup(players, formationId) {
  const formation = FORMATIONS[formationId] || FORMATIONS['4-3-3']
  const assigned = autoAssign(players, formationId)
  const remaining = players.filter((player) => !assigned.some((entry) => entry && entry.id === player.id))
  for (let index = 0; index < formation.slots.length; index += 1) {
    if (assigned[index]) continue
    const slot = formation.slots[index]
    const wanted = slot.positions || []
    let pick = remaining.find((player) => wanted.includes(player.position))
    if (!pick) {
      const group = slot.role === 'GK' ? 'GK' : slot.role === 'DF' ? 'DF' : slot.role === 'MF' ? 'MF' : 'FW'
      pick = remaining.find((player) => (POSITION_GROUPS[player.position] || 'MF') === group)
    }
    if (!pick) pick = remaining[0]
    if (!pick) break
    remaining.splice(remaining.indexOf(pick), 1)
    assigned[index] = pick
  }
  return assigned
}

export function defaultSquad() {
  const unlocked = PLAYER_POOL.slice()
  const used = new Set()
  const pick = (positions, count) => {
    const chosen = unlocked
      .filter((player) => positions.includes(player.position) && !used.has(player.id))
      .sort((a, b) => b.overall - a.overall)
      .slice(0, count)
    for (const player of chosen) used.add(player.id)
    return chosen
  }
  const gk = pick(['GK'], 2)
  const cb = pick(['CB'], 2)
  const fb = pick(['LB', 'RB'], 2)
  const dm = pick(['CDM'], 1)
  const cm = pick(['CM'], 2)
  const cam = pick(['CAM'], 1)
  const winger = pick(['LW', 'RW'], 2)
  const striker = pick(['ST'], 2)
  const core = [...gk, ...cb, ...fb, ...dm, ...cm, ...cam, ...winger, ...striker]
  const assigned = buildLineup(core, '4-3-3')
  const lineup = assigned.map((player) => player?.id || null)
  while (lineup.length < 11) lineup.push(null)
  const bench = core.filter((player) => !lineup.includes(player.id)).slice(0, 5).map((player) => player.id)
  return {
    teamName: 'MY CLUB',
    formation: '4-3-3',
    kit: 'volt',
    lineup,
    bench,
    boosts: { finishing: 0, pace: 0, passing: 0, defending: 0 },
    unlocked: Array.from(new Set([...core.map((player) => player.id), ...bench.map((player) => player.id)]))
  }
}

const RESERVE_NAMES = ['Alex Vale', 'Dean Moss', 'Rory Slate', 'Gus Ferro', 'Pavel Novak', 'Ike Barrow']

function reserveProfile(index, slot) {
  const name = RESERVE_NAMES[index % RESERVE_NAMES.length]
  return {
    name,
    initials: name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase(),
    number: 20 + index,
    skin: SKIN_TONES[index % SKIN_TONES.length],
    hair: HAIR_COLORS[index % HAIR_COLORS.length],
    finishing: 62,
    pace: 66,
    stamina: 78,
    attributes: { pac: 66, sho: 62, pas: 64, dri: 64, def: 66, phy: 70 },
    overall: 64,
    position: slot?.positions?.[0] || 'CM',
    cardId: null
  }
}

export function squadPlayers(squad) {
  const unlocked = new Set(squad?.unlocked?.length ? squad.unlocked : PLAYER_POOL.map((player) => player.id))
  const ids = [...(squad?.lineup || []), ...(squad?.bench || [])]
  return ids.map((id) => PLAYER_BY_ID.get(id)).filter((player) => player && unlocked.has(player.id))
}

export function squadLineup(squad) {
  return (squad?.lineup || []).map((id) => PLAYER_BY_ID.get(id) || null)
}

export function resolveLineup(squad) {
  const lineup = squadLineup(squad)
  const used = new Set(lineup.filter(Boolean).map((player) => player.id))
  const available = squadPlayers(squad).filter((player) => !used.has(player.id))
  const formation = FORMATIONS[squad?.formation] || FORMATIONS['4-3-3']
  const result = []
  for (let index = 0; index < formation.slots.length; index += 1) {
    const current = lineup[index] || null
    if (current) {
      result.push(current)
      continue
    }
    const slot = formation.slots[index]
    const wanted = slot.positions || []
    const filler = available.find((player) => wanted.includes(player.position))
      || available.find((player) => (POSITION_GROUPS[player.position] || 'MF') === (slot.role === 'GK' ? 'GK' : slot.role === 'DF' ? 'DF' : slot.role === 'MF' ? 'MF' : 'FW'))
      || available[0]
    if (filler) {
      available.splice(available.indexOf(filler), 1)
      result.push(filler)
    } else {
      result.push(null)
    }
  }
  return result
}

export function squadRating(squad) {
  const formation = FORMATIONS[squad?.formation] || FORMATIONS['4-3-3']
  const lineup = squadLineup(squad)
  let total = 0
  let count = 0
  for (let index = 0; index < formation.slots.length; index += 1) {
    const player = lineup[index]
    if (!player) continue
    total += effectiveOverall(player, formation.slots[index])
    count += 1
  }
  return count ? Math.round(total / count) : 60
}

export function kitPalette(kitId) {
  return KIT_PALETTES.find((kit) => kit.id === kitId) || KIT_PALETTES[0]
}

export function applyBoosts(player, boosts = {}) {
  const attributes = { ...player.attributes }
  const bonus = {
    pac: boosts.pace || 0,
    sho: boosts.finishing || 0,
    pas: boosts.passing || 0,
    dri: boosts.passing || 0,
    def: boosts.defending || 0,
    phy: boosts.pace || 0
  }
  for (const [key, value] of Object.entries(bonus)) {
    attributes[key] = clamp(attributes[key] + value, 26, 99)
  }
  const weights = OVERALL_WEIGHTS[player.position] || OVERALL_WEIGHTS.CM
  let overall = 0
  let weightSum = 0
  for (const [key, weight] of Object.entries(weights)) {
    overall += attributes[key] * weight
    weightSum += weight
  }
  return { ...player, attributes, overall: clamp(Math.round(overall / weightSum), 40, 99) }
}

export function buildCustomTeam(squad) {
  const palette = kitPalette(squad?.kit)
  const formation = FORMATIONS[squad?.formation] || FORMATIONS['4-3-3']
  const resolved = resolveLineup(squad)
  const lineup = resolved
    .map((player, index) => {
      if (!player) return null
      const boosted = applyBoosts(player, squad?.boosts)
      const slot = formation.slots[index]
      const penalty = slot ? positionPenalty(player, slot) : 0
      return { ...boosted, overall: Math.max(30, boosted.overall - penalty), outOfPosition: penalty > 0 }
    })
    .filter(Boolean)
  const rating = teamRating(lineup)
  const padded = [...lineup]
  for (let index = 0; padded.length < formation.slots.length; index += 1) {
    padded.push({ attributes: { pac: 66, sho: 62, pas: 64, dri: 64, def: 66, phy: 70 }, overall: 64, position: formation.slots[padded.length]?.positions?.[0] || 'CM', name: RESERVE_NAMES[index % RESERVE_NAMES.length], initials: 'RP', id: `reserve-${index}` })
  }
  const profiles = padded.map((player, index) => ({
    name: player.name,
    initials: player.initials,
    number: index === 0 ? 1 : index + 1,
    position: player.position,
    skin: SKIN_TONES[index % SKIN_TONES.length],
    hair: HAIR_COLORS[index % HAIR_COLORS.length],
    finishing: player.attributes.sho,
    pace: player.attributes.pac,
    stamina: Math.round(58 + player.attributes.phy * 0.4),
    attributes: player.attributes,
    overall: player.overall,
    cardId: player.id,
    height: 1.7 + ((index * 13 + 7) % 28) / 100,
    build: BUILDS[index % BUILDS.length],
    beard: (index * 7 + 3) % 5 === 0,
    boot: BOOT_COLORS[index % BOOT_COLORS.length]
  }))
  const bench = squadPlayers(squad)
    .filter((player) => !(squad.lineup || []).includes(player.id))
    .slice(0, 5)
    .map((player, index) => ({
      name: player.name,
      initials: player.initials,
      number: 12 + index,
      position: player.position,
      skin: SKIN_TONES[(index + 3) % SKIN_TONES.length],
      hair: HAIR_COLORS[(index + 2) % HAIR_COLORS.length],
      finishing: player.attributes.sho,
      pace: player.attributes.pac,
      stamina: Math.round(58 + player.attributes.phy * 0.4),
      attributes: player.attributes,
      overall: player.overall,
      cardId: player.id,
      height: 1.7 + ((index * 11 + 5) % 28) / 100,
      build: BUILDS[(index + 2) % BUILDS.length],
      beard: (index * 5 + 1) % 5 === 0,
      boot: BOOT_COLORS[(index + 2) % BOOT_COLORS.length]
    }))
  return {
    id: 'myclub',
    name: squad?.teamName || 'MY CLUB',
    city: 'Your Club',
    short: 'MYC',
    primary: palette.primary,
    secondary: palette.secondary,
    accent: palette.accent,
    rating,
    formation: squad?.formation || '4-3-3',
    style: 'Your XI',
    squadPlayers: [...profiles, ...bench]
  }
}

const SKIN_TONES = ['#f1c7a5', '#dfaa7c', '#b97a51', '#8d5536', '#623a27', '#f5d7bd']
const HAIR_COLORS = ['#16120f', '#2d1d13', '#5b3923', '#d9b26f', '#15181c', '#7a4a2c']
const BOOT_COLORS = ['#101418', '#f4f7f5', '#ff5b57', '#ffd166', '#31f2c5', '#bfc2ff']
const BUILDS = ['lean', 'athletic', 'power', 'stocky', 'athletic', 'lean']
