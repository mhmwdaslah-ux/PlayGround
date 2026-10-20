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
      { role: 'GK', x: 0, depth: 0.025 },
      { role: 'DF', x: -0.82, depth: 0.19 },
      { role: 'DF', x: -0.28, depth: 0.17 },
      { role: 'DF', x: 0.28, depth: 0.17 },
      { role: 'DF', x: 0.82, depth: 0.19 },
      { role: 'MF', x: -0.58, depth: 0.39 },
      { role: 'MF', x: 0, depth: 0.35 },
      { role: 'MF', x: 0.58, depth: 0.39 },
      { role: 'FW', x: -0.7, depth: 0.62 },
      { role: 'FW', x: 0, depth: 0.67 },
      { role: 'FW', x: 0.7, depth: 0.62 }
    ]
  },
  '4-4-2': {
    name: '4-4-2',
    shape: 'Classic two banks',
    slots: [
      { role: 'GK', x: 0, depth: 0.025 },
      { role: 'DF', x: -0.82, depth: 0.19 },
      { role: 'DF', x: -0.28, depth: 0.17 },
      { role: 'DF', x: 0.28, depth: 0.17 },
      { role: 'DF', x: 0.82, depth: 0.19 },
      { role: 'MF', x: -0.82, depth: 0.4 },
      { role: 'MF', x: -0.28, depth: 0.37 },
      { role: 'MF', x: 0.28, depth: 0.37 },
      { role: 'MF', x: 0.82, depth: 0.4 },
      { role: 'FW', x: -0.35, depth: 0.64 },
      { role: 'FW', x: 0.35, depth: 0.64 }
    ]
  },
  '3-5-2': {
    name: '3-5-2',
    shape: 'Midfield overload',
    slots: [
      { role: 'GK', x: 0, depth: 0.025 },
      { role: 'DF', x: -0.54, depth: 0.17 },
      { role: 'DF', x: 0, depth: 0.15 },
      { role: 'DF', x: 0.54, depth: 0.17 },
      { role: 'MF', x: -0.9, depth: 0.38 },
      { role: 'MF', x: -0.42, depth: 0.37 },
      { role: 'MF', x: 0, depth: 0.34 },
      { role: 'MF', x: 0.42, depth: 0.37 },
      { role: 'MF', x: 0.9, depth: 0.38 },
      { role: 'FW', x: -0.34, depth: 0.65 },
      { role: 'FW', x: 0.34, depth: 0.65 }
    ]
  },
  '4-2-3-1': {
    name: '4-2-3-1',
    shape: 'Control the middle',
    slots: [
      { role: 'GK', x: 0, depth: 0.025 },
      { role: 'DF', x: -0.82, depth: 0.19 },
      { role: 'DF', x: -0.28, depth: 0.17 },
      { role: 'DF', x: 0.28, depth: 0.17 },
      { role: 'DF', x: 0.82, depth: 0.19 },
      { role: 'MF', x: -0.3, depth: 0.35 },
      { role: 'MF', x: 0.3, depth: 0.35 },
      { role: 'MF', x: -0.72, depth: 0.53 },
      { role: 'MF', x: 0, depth: 0.52 },
      { role: 'MF', x: 0.72, depth: 0.53 },
      { role: 'FW', x: 0, depth: 0.69 }
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
export const HAIR_COLORS = ['#16120f', '#2d1d13', '#5b3923', '#d9b26f', '#15181c', '#7a4a2c']
export const BENCH_SIZE = 5
export const MAX_SUBS = 3

export function getTeam(id) {
  return TEAMS.find((team) => team.id === id) || TEAMS[0]
}

export function createRoster(team, count = 16) {
  const teamIndex = TEAMS.findIndex((item) => item.id === team.id)
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
    roster.push({
      name: `${first} ${last}`,
      initials: `${first[0]}${last[0]}`,
      number: i + 1,
      skin: SKIN_TONES[(i + teamIndex) % SKIN_TONES.length],
      hair: HAIR_COLORS[(i * 3 + teamIndex) % HAIR_COLORS.length],
      finishing: 58 + ((i * 17 + teamIndex * 7) % 30),
      pace: 58 + ((i * 11 + teamIndex * 13) % 32),
      stamina: 62 + ((i * 7 + teamIndex * 5) % 28)
    })
  }
  return roster
}

export function seedRng(seed) {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
  }
}
