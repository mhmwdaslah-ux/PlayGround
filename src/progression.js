export const DIVISIONS = [
  { id: 'rookie', name: 'Rookie', tier: 1, minLevel: 1, color: '#9fb4c7', reward: 120, keys: 0 },
  { id: 'amateur', name: 'Amateur', tier: 2, minLevel: 5, color: '#7cf06d', reward: 180, keys: 1 },
  { id: 'semi', name: 'Semi-Pro', tier: 3, minLevel: 10, color: '#68d7ff', reward: 260, keys: 1 },
  { id: 'pro', name: 'Pro', tier: 4, minLevel: 16, color: '#31f2c5', reward: 380, keys: 1 },
  { id: 'elite', name: 'Elite', tier: 5, minLevel: 23, color: '#ffd04a', reward: 520, keys: 2 },
  { id: 'icon', name: 'Icon', tier: 6, minLevel: 31, color: '#ff5b57', reward: 700, keys: 2 }
]

export const MAX_LEVEL = 40

export function xpToClear(level) {
  if (level >= MAX_LEVEL) return Infinity
  return 340 + (level - 1) * 150
}

export function levelFromXp(xp) {
  let level = 1
  let remaining = Math.max(0, xp || 0)
  while (level < MAX_LEVEL) {
    const need = xpToClear(level)
    if (remaining < need) break
    remaining -= need
    level += 1
  }
  return { level, xpIntoLevel: remaining }
}

export function divisionForLevel(level) {
  let division = DIVISIONS[0]
  for (const entry of DIVISIONS) {
    if (level >= entry.minLevel) division = entry
  }
  return division
}

export function nextDivisionForLevel(level) {
  return DIVISIONS.find((entry) => entry.minLevel > level) || null
}

export function rankProgress(profile) {
  const xp = Math.max(0, profile?.xp || 0)
  const { level, xpIntoLevel } = levelFromXp(xp)
  const need = xpToClear(level)
  const division = divisionForLevel(level)
  const next = nextDivisionForLevel(level)
  return {
    xp,
    level,
    xpIntoLevel,
    xpNeeded: need,
    pct: need === Infinity ? 100 : Math.min(100, Math.round((xpIntoLevel / need) * 100)),
    division,
    next,
    coins: profile?.coins || 0,
    keys: profile?.keys || 0
  }
}

export function levelUpReward(level) {
  return {
    coins: 100 + level * 30,
    keys: level % 2 === 0 ? 1 : 0,
    xp: 0
  }
}

export function matchRewards({ result = 'draw', goalsFor = 0, goalsAgainst = 0, tournamentRound = false, practicePoints = 0 }) {
  let xp = 0
  let coins = 0
  let keys = 0
  if (result === 'win') {
    xp = 130
    coins = 70
  } else if (result === 'draw') {
    xp = 70
    coins = 35
  } else {
    xp = 40
    coins = 18
  }
  xp += goalsFor * 22
  coins += goalsFor * 12
  if (goalsAgainst === 0 && result === 'win') {
    xp += 25
    coins += 15
  }
  if (tournamentRound) {
    xp += 150
    coins += 90
    keys = 1
  }
  if (practicePoints > 0) {
    xp += Math.floor(practicePoints / 12)
    coins += Math.floor(practicePoints / 20)
  }
  return { xp, coins, keys }
}

export const RARITIES = {
  common: { name: 'Common', color: '#9fb4c7', weight: 62 },
  rare: { name: 'Rare', color: '#68d7ff', weight: 26 },
  epic: { name: 'Epic', color: '#bfc2ff', weight: 9 },
  legendary: { name: 'Legendary', color: '#ffd04a', weight: 3 }
}

export const CRATES = [
  {
    id: 'street',
    name: 'Street Crate',
    subtitle: 'Common drop, quick boost',
    cost: 220,
    keyCost: 0,
    color: '#7cf06d',
    icon: '▣',
    pool: [
      { type: 'coins', min: 90, max: 260, weight: 46, rarity: 'common' },
      { type: 'xp', min: 40, max: 130, weight: 28, rarity: 'common' },
      { type: 'boost', min: 1, max: 1, weight: 16, rarity: 'rare' },
      { type: 'card', min: 1, max: 1, weight: 8, rarity: 'rare' },
      { type: 'kit', min: 1, max: 1, weight: 2, rarity: 'epic' }
    ]
  },
  {
    id: 'pro',
    name: 'Pro Crate',
    subtitle: 'Better cards, bigger purse',
    cost: 480,
    keyCost: 0,
    color: '#68d7ff',
    icon: '◈',
    pool: [
      { type: 'coins', min: 220, max: 620, weight: 40, rarity: 'common' },
      { type: 'xp', min: 130, max: 320, weight: 24, rarity: 'rare' },
      { type: 'boost', min: 1, max: 2, weight: 18, rarity: 'rare' },
      { type: 'card', min: 1, max: 1, weight: 13, rarity: 'epic' },
      { type: 'kit', min: 1, max: 1, weight: 5, rarity: 'epic' }
    ]
  },
  {
    id: 'elite',
    name: 'Elite Crate',
    subtitle: 'Key only. Icon rewards inside',
    cost: 700,
    keyCost: 1,
    color: '#ffd04a',
    icon: '✦',
    pool: [
      { type: 'coins', min: 520, max: 1400, weight: 34, rarity: 'rare' },
      { type: 'xp', min: 320, max: 700, weight: 20, rarity: 'epic' },
      { type: 'boost', min: 2, max: 3, weight: 18, rarity: 'epic' },
      { type: 'card', min: 1, max: 1, weight: 20, rarity: 'legendary' },
      { type: 'kit', min: 1, max: 1, weight: 8, rarity: 'legendary' }
    ]
  }
]

export function getCrate(id) {
  return CRATES.find((crate) => crate.id === id) || CRATES[0]
}

function pickWeighted(entries, roll) {
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0)
  let cursor = roll * total
  for (const entry of entries) {
    cursor -= entry.weight
    if (cursor <= 0) return entry
  }
  return entries[entries.length - 1]
}

export function rollCrate(crateId, random = Math.random, cardPool = []) {
  const crate = getCrate(crateId)
  const entry = pickWeighted(crate.pool, random())
  const value = Math.round(entry.min + random() * (entry.max - entry.min))
  if (entry.type === 'coins') {
    return { type: 'coins', amount: value, rarity: entry.rarity, title: `${value} COINS`, detail: 'Pocket money for the next crate.' }
  }
  if (entry.type === 'xp') {
    return { type: 'xp', amount: value, rarity: entry.rarity, title: `+${value} XP`, detail: 'Career ranking points.' }
  }
  if (entry.type === 'boost') {
    return { type: 'boost', amount: value, rarity: entry.rarity, title: `+${value} ATTRIBUTE BOOST`, detail: 'Applied to your custom club.' }
  }
  if (entry.type === 'kit') {
    return { type: 'kit', amount: value, rarity: entry.rarity, title: 'LEGENDARY KIT', detail: 'A new colourway for My Club.' }
  }
  const card = cardPool.length ? cardPool[Math.floor(random() * cardPool.length) % cardPool.length] : null
  return {
    type: 'card',
    amount: 1,
    rarity: entry.rarity,
    title: card ? card.name.toUpperCase() : 'PLAYER CARD',
    detail: card ? `${card.position} · ${card.overall} OVR` : 'A new signing for your squad.',
    card: card || null
  }
}
