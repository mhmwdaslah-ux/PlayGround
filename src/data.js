export const GAME_TITLE = 'NOVA ELEVEN'
export const GAME_TAGLINE = 'THE BEAUTIFUL GAME. RE-ENERGIZED.'
export const COMPETITION_NAME = 'AURORA CUP'
export const PITCH = {
  halfWidth: 34,
  halfLength: 52.5,
  goalWidth: 7.32,
  goalHeight: 2.44,
  penaltyDepth: 16.5,
  penaltyWidth: 40.32,
  goalAreaDepth: 5.5,
  goalAreaWidth: 18.32,
  centerCircle: 9.15
}

export const TEAMS = [
  {
    id: 'aurora',
    name: 'Aurora FC',
    city: 'Northlight',
    short: 'AUR',
    primary: '#31f2c5',
    secondary: '#072b33',
    accent: '#eafff9',
    rating: 84,
    formation: '4-3-3',
    style: 'High-tempo press'
  },
  {
    id: 'comets',
    name: 'Crimson Comets',
    city: 'Red Mesa',
    short: 'COM',
    primary: '#ff5b57',
    secondary: '#2b0a12',
    accent: '#ffd166',
    rating: 83,
    formation: '4-2-3-1',
    style: 'Lightning counters'
  },
  {
    id: 'solar',
    name: 'Solar City',
    city: 'Helios',
    short: 'SOL',
    primary: '#ffd04a',
    secondary: '#332008',
    accent: '#ff7a45',
    rating: 81,
    formation: '4-4-2',
    style: 'Patient possession'
  },
  {
    id: 'harbour',
    name: 'Iron Harbour',
    city: 'Dock Nine',
    short: 'HAR',
    primary: '#8fa9c2',
    secondary: '#101d2b',
    accent: '#e5f7ff',
    rating: 80,
    formation: '3-5-2',
    style: 'Physical and direct'
  },
  {
    id: 'verdant',
    name: 'Verdant United',
    city: 'Greenfield',
    short: 'VER',
    primary: '#7cf06d',
    secondary: '#0d2917',
    accent: '#f3ffe9',
    rating: 79,
    formation: '4-3-3',
    style: 'Patient build-up'
  },
  {
    id: 'lunar',
    name: 'Lunar Rangers',
    city: 'Mare City',
    short: 'LUN',
    primary: '#bfc2ff',
    secondary: '#17163c',
    accent: '#8b8dff',
    rating: 78,
    formation: '4-2-3-1',
    style: 'Compact mid-block'
  },
  {
    id: 'skyline',
    name: 'Skyline Athletic',
    city: 'Highrise',
    short: 'SKY',
    primary: '#68d7ff',
    secondary: '#0b2636',
    accent: '#ffffff',
    rating: 77,
    formation: '4-4-2',
    style: 'Wing play'
  },
  {
    id: 'ember',
    name: 'Ember Rovers',
    city: 'Ashford',
    short: 'EMB',
    primary: '#ff974d',
    secondary: '#301407',
    accent: '#ffe1bd',
    rating: 76,
    formation: '3-5-2',
    style: 'Fearless transitions'
  }
]

export const FORMATIONS = {
  '4-3-3': {
    name: '4-3-3',
    shape: 'Balanced width',
    slots: [
      { role: 'GK', x: 0, depth: 0.025, positions: ['GK'] },
      { role: 'DF', x: -0.82, depth: 0.19, positions: ['LB', 'CB'] },
      { role: 'DF', x: -0.28, depth: 0.17, positions: ['CB'] },
      { role: 'DF', x: 0.28, depth: 0.17, positions: ['CB'] },
      { role: 'DF', x: 0.82, depth: 0.19, positions: ['RB', 'CB'] },
      { role: 'MF', x: -0.58, depth: 0.39, positions: ['CM', 'CDM'] },
      { role: 'MF', x: 0, depth: 0.35, positions: ['CM', 'CDM', 'CAM'] },
      { role: 'MF', x: 0.58, depth: 0.39, positions: ['CM', 'CDM'] },
      { role: 'FW', x: -0.7, depth: 0.62, positions: ['LW'] },
      { role: 'FW', x: 0, depth: 0.67, positions: ['ST'] },
      { role: 'FW', x: 0.7, depth: 0.62, positions: ['RW'] }
    ]
  },
  '4-4-2': {
    name: '4-4-2',
    shape: 'Classic two banks',
    slots: [
      { role: 'GK', x: 0, depth: 0.025, positions: ['GK'] },
      { role: 'DF', x: -0.82, depth: 0.19, positions: ['LB', 'CB'] },
      { role: 'DF', x: -0.28, depth: 0.17, positions: ['CB'] },
      { role: 'DF', x: 0.28, depth: 0.17, positions: ['CB'] },
      { role: 'DF', x: 0.82, depth: 0.19, positions: ['RB', 'CB'] },
      { role: 'MF', x: -0.82, depth: 0.4, positions: ['LW', 'CM'] },
      { role: 'MF', x: -0.28, depth: 0.37, positions: ['CM'] },
      { role: 'MF', x: 0.28, depth: 0.37, positions: ['CM'] },
      { role: 'MF', x: 0.82, depth: 0.4, positions: ['RW', 'CM'] },
      { role: 'FW', x: -0.35, depth: 0.64, positions: ['ST'] },
      { role: 'FW', x: 0.35, depth: 0.64, positions: ['ST'] }
    ]
  },
  '3-5-2': {
    name: '3-5-2',
    shape: 'Midfield overload',
    slots: [
      { role: 'GK', x: 0, depth: 0.025, positions: ['GK'] },
      { role: 'DF', x: -0.54, depth: 0.17, positions: ['CB'] },
      { role: 'DF', x: 0, depth: 0.15, positions: ['CB'] },
      { role: 'DF', x: 0.54, depth: 0.17, positions: ['CB'] },
      { role: 'MF', x: -0.9, depth: 0.38, positions: ['LW', 'CM'] },
      { role: 'MF', x: -0.42, depth: 0.37, positions: ['CM'] },
      { role: 'MF', x: 0, depth: 0.34, positions: ['CM', 'CDM'] },
      { role: 'MF', x: 0.42, depth: 0.37, positions: ['CM'] },
      { role: 'MF', x: 0.9, depth: 0.38, positions: ['RW', 'CM'] },
      { role: 'FW', x: -0.34, depth: 0.65, positions: ['ST'] },
      { role: 'FW', x: 0.34, depth: 0.65, positions: ['ST'] }
    ]
  },
  '4-2-3-1': {
    name: '4-2-3-1',
    shape: 'Control the middle',
    slots: [
      { role: 'GK', x: 0, depth: 0.025, positions: ['GK'] },
      { role: 'DF', x: -0.82, depth: 0.19, positions: ['LB', 'CB'] },
      { role: 'DF', x: -0.28, depth: 0.17, positions: ['CB'] },
      { role: 'DF', x: 0.28, depth: 0.17, positions: ['CB'] },
      { role: 'DF', x: 0.82, depth: 0.19, positions: ['RB', 'CB'] },
      { role: 'MF', x: -0.3, depth: 0.35, positions: ['CDM', 'CM'] },
      { role: 'MF', x: 0.3, depth: 0.35, positions: ['CDM', 'CM'] },
      { role: 'MF', x: -0.72, depth: 0.53, positions: ['CAM', 'LW'] },
      { role: 'MF', x: 0, depth: 0.52, positions: ['CAM'] },
      { role: 'MF', x: 0.72, depth: 0.53, positions: ['CAM', 'RW'] },
      { role: 'FW', x: 0, depth: 0.69, positions: ['ST'] }
    ]
  }
}

export const MENTALITIES = {
  defensive: { name: 'Defensive', push: -5, width: 0.88, press: 0.78, label: 'Hold shape' },
  balanced: { name: 'Balanced', push: 0, width: 1, press: 1, label: 'Adapt to play' },
  attacking: { name: 'Attacking', push: 6, width: 1.08, press: 1.22, label: 'Push forward' }
}

export const DIFFICULTIES = {
  rookie: {
    name: 'Rookie',
    tagline: 'More time, softer pressure',
    aiSpeed: 0.88,
    reaction: 0.58,
    passError: 0.19,
    shotError: 2.1,
    keeper: 0.61,
    press: 0.72,
    tackle: 0.35
  },
  pro: {
    name: 'Pro',
    tagline: 'A fair, fast contest',
    aiSpeed: 1,
    reaction: 0.34,
    passError: 0.1,
    shotError: 1.15,
    keeper: 0.79,
    press: 1,
    tackle: 0.5
  },
  legend: {
    name: 'Legend',
    tagline: 'Ruthless positioning',
    aiSpeed: 1.075,
    reaction: 0.19,
    passError: 0.045,
    shotError: 0.7,
    keeper: 0.9,
    press: 1.18,
    tackle: 0.66
  }
}

export const MATCH_LENGTHS = [3, 5, 10]

export const DEFAULT_SETTINGS = {
  volume: 0.7,
  music: 0.25,
  difficulty: 'pro',
  matchLength: 5,
  scheme: 'classic',
  cameraDistance: 1,
  screenShake: true,
  crowd: true,
  offside: true
}

const FIRST_NAMES = [
  'Ari', 'Kai', 'Mateo', 'Noah', 'Zane', 'Idris', 'Rafa', 'Luca', 'Nico', 'Tariq',
  'Jonas', 'Milo', 'Enzo', 'Sami', 'Dario', 'Yuri', 'Owen', 'Tobias', 'Ravi', 'Marco',
  'Eli', 'Kofi', 'Sergi', 'Levi', 'Ayo', 'Ruben', 'Toma', 'Jae', 'Ivo', 'Abel',
  'Nils', 'Emre', 'Vito', 'Cruz', 'Oskar', 'Nero', 'Jude', 'Rian', 'Mika', 'Soren',
  'Amir', 'Bruno', 'Cato', 'Davi', 'Eden', 'Femi', 'Gio', 'Hugo', 'Ines', 'Jules'
]

const LAST_NAMES = [
  'Vale', 'Okafor', 'Reyes', 'Kovac', 'Sato', 'Lindqvist', 'Moreau', 'Diaz', 'Novak', 'Abbas',
  'Ferrer', 'Mensah', 'Kane', 'Drake', 'Silva', 'Ortega', 'Berg', 'Rahimi', 'Sokol', 'Ito',
  'Marlowe', 'Quinn', 'Hale', 'Varga', 'Costa', 'Adeyemi', 'Petrov', 'Rios', 'Nakamura', 'Wolfe',
  'Frost', 'Aguilar', 'Brennan', 'Castel', 'Osei', 'Larsen', 'Vidal', 'Mercer', 'Voss', 'Ibarra',
  'Navarro', 'Sato', 'Haddad', 'Blake', 'Moreno', 'Asante', 'Keller', 'Pires', 'Rask', 'Tan'
]

export const SKIN_TONES = ['#f1c7a5', '#dfaa7c', '#b97a51', '#8d5536', '#623a27', '#f5d7bd']
export const BOOT_COLORS = ['#101418', '#f4f7f5', '#ff5b57', '#ffd166', '#31f2c5', '#bfc2ff']
export const HAIR_COLORS = ['#16120f', '#2d1d13', '#5b3923', '#d9b26f', '#15181c', '#7a4a2c']
export const BENCH_SIZE = 5
export const MAX_SUBS = 3

export function getTeam(id) {
  return TEAMS.find((team) => team.id === id) || TEAMS[0]
}

const BENCH_POSITIONS = ['GK', 'CB', 'LB', 'RB', 'CM', 'CM', 'ST', 'LW', 'RW', 'CB']
const POSITION_RANGES = {
  GK: { finishing: [24, 44], pace: [48, 68], stamina: [70, 88] },
  CB: { finishing: [38, 58], pace: [58, 76], stamina: [76, 92] },
  LB: { finishing: [48, 68], pace: [72, 88], stamina: [78, 92] },
  RB: { finishing: [48, 68], pace: [72, 88], stamina: [78, 92] },
  CDM: { finishing: [50, 68], pace: [58, 76], stamina: [78, 94] },
  CM: { finishing: [60, 78], pace: [62, 80], stamina: [74, 92] },
  CAM: { finishing: [68, 84], pace: [70, 86], stamina: [70, 88] },
  LW: { finishing: [66, 84], pace: [78, 92], stamina: [70, 88] },
  RW: { finishing: [66, 84], pace: [78, 92], stamina: [70, 88] },
  ST: { finishing: [74, 90], pace: [72, 90], stamina: [70, 85] }
}
const BUILDS = ['lean', 'athletic', 'power', 'stocky', 'athletic', 'lean']

export function createRoster(team, count = 16, formationId = team.formation) {
  const teamIndex = TEAMS.findIndex((item) => item.id === team.id)
  const formation = FORMATIONS[formationId] || FORMATIONS['4-3-3']
  const slotPositions = formation.slots.map((slot) => slot.positions?.[0] || slot.role)
  const roster = []
  const used = new Set()
  for (let i = 0; i < count; i += 1) {
    let first = ''
    let last = ''
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const a = (i * 7 + teamIndex * 11 + attempt * 13) % FIRST_NAMES.length
      const b = (i * 5 + teamIndex * 7 + attempt * 17) % LAST_NAMES.length
      first = FIRST_NAMES[a]
      last = LAST_NAMES[b]
      if (!used.has(`${first} ${last}`)) break
    }
    used.add(`${first} ${last}`)
    const position = i < slotPositions.length ? slotPositions[i] : BENCH_POSITIONS[(i - slotPositions.length) % BENCH_POSITIONS.length]
    const ranges = POSITION_RANGES[position] || POSITION_RANGES.CM
    const profile = {
      name: `${first} ${last}`,
      initials: `${first[0]}${last[0]}`,
      number: i + 1,
      position,
      skin: SKIN_TONES[(i + teamIndex) % SKIN_TONES.length],
      hair: HAIR_COLORS[(i * 3 + teamIndex) % HAIR_COLORS.length],
      finishing: ranges.finishing[0] + ((i * 17 + teamIndex * 7) % (ranges.finishing[1] - ranges.finishing[0] + 1)),
      pace: ranges.pace[0] + ((i * 11 + teamIndex * 13) % (ranges.pace[1] - ranges.pace[0] + 1)),
      stamina: ranges.stamina[0] + ((i * 7 + teamIndex * 5) % (ranges.stamina[1] - ranges.stamina[0] + 1)),
      height: 1.72 + ((i * 13 + teamIndex * 3) % 27) / 100,
      build: BUILDS[(i * 5 + teamIndex) % BUILDS.length],
      beard: (i * 7 + teamIndex) % 5 === 0,
      boot: BOOT_COLORS[(i * 3 + teamIndex) % BOOT_COLORS.length]
    }
    const attributes = playerAttributes(profile, roleForPosition(position), i)
    profile.attributes = attributes
    profile.overall = attributes.overall
    roster.push(profile)
  }
  return roster
}

export function roleForPosition(position) {
  if (position === 'GK') return 'GK'
  if (['CB', 'LB', 'RB'].includes(position)) return 'DF'
  if (['CM', 'CDM', 'CAM'].includes(position)) return 'MF'
  return 'FW'
}

export function seedRng(seed) {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
  }
}

const ATTR_PROFILES = {
  GK: { pac: 0.4, sho: 0.2, pas: 0.6, dri: 0.3, def: 0.9, phy: 0.7 },
  DF: { pac: 0.6, sho: 0.3, pas: 0.55, dri: 0.45, def: 0.85, phy: 0.8 },
  MF: { pac: 0.65, sho: 0.7, pas: 0.85, dri: 0.75, def: 0.6, phy: 0.7 },
  FW: { pac: 0.85, sho: 0.85, pas: 0.65, dri: 0.85, def: 0.3, phy: 0.65 }
}

export function playerAttributes(profile, role = 'MF', seed = 0) {
  const weights = ATTR_PROFILES[role] || ATTR_PROFILES.MF
  const isKeeper = profile.position === 'GK'
  const base = isKeeper
    ? Math.round((profile.stamina + profile.pace) / 2 + 10)
    : Math.round((profile.finishing + profile.pace + profile.stamina) / 3)
  const rand = (n) => {
    const value = Math.sin((seed + 1) * 12.9898 + n * 78.233) * 43758.5453
    return value - Math.floor(value)
  }
  const clampAttr = (value) => Math.max(24, Math.min(99, Math.round(value)))
  const attributes = {
    pac: clampAttr(base + (weights.pac - 0.6) * 32 + (rand(1) - 0.5) * 12),
    sho: clampAttr(profile.finishing + (weights.sho - 0.6) * 30 + (rand(2) - 0.5) * 12),
    pas: clampAttr(base + (weights.pas - 0.6) * 32 + (rand(3) - 0.5) * 12),
    dri: clampAttr(base + (weights.dri - 0.6) * 32 + (rand(4) - 0.5) * 12),
    def: clampAttr(base + (weights.def - 0.6) * 34 + (rand(5) - 0.5) * 12),
    phy: clampAttr(profile.stamina + (weights.phy - 0.6) * 30 + (rand(6) - 0.5) * 12)
  }
  const overallWeights = OVERALL_BY_POSITION[profile.position] || OVERALL_BY_POSITION.MF
  let overall = 0
  let weightSum = 0
  for (const [key, weight] of Object.entries(overallWeights)) {
    overall += attributes[key] * weight
    weightSum += weight
  }
  return { ...attributes, overall: Math.round(overall / weightSum) }
}

const OVERALL_BY_POSITION = {
  GK: { pac: 0.05, sho: 0.02, pas: 0.2, dri: 0.05, def: 0.45, phy: 0.23 },
  CB: { pac: 0.14, sho: 0.03, pas: 0.1, dri: 0.06, def: 0.48, phy: 0.19 },
  LB: { pac: 0.26, sho: 0.06, pas: 0.18, dri: 0.16, def: 0.24, phy: 0.1 },
  RB: { pac: 0.26, sho: 0.06, pas: 0.18, dri: 0.16, def: 0.24, phy: 0.1 },
  CDM: { pac: 0.1, sho: 0.1, pas: 0.3, dri: 0.16, def: 0.24, phy: 0.1 },
  CM: { pac: 0.12, sho: 0.18, pas: 0.3, dri: 0.22, def: 0.1, phy: 0.08 },
  CAM: { pac: 0.16, sho: 0.28, pas: 0.24, dri: 0.24, def: 0.03, phy: 0.05 },
  LW: { pac: 0.28, sho: 0.24, pas: 0.18, dri: 0.24, def: 0.02, phy: 0.04 },
  RW: { pac: 0.28, sho: 0.24, pas: 0.18, dri: 0.24, def: 0.02, phy: 0.04 },
  ST: { pac: 0.2, sho: 0.42, pas: 0.1, dri: 0.16, def: 0.02, phy: 0.1 }
}
