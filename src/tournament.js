import { TEAMS, getTeam } from './data.js'

export const ROUND_NAMES = ['QUARTER-FINALS', 'SEMI-FINALS', 'FINAL']
export const ROUND_SHORT = ['QF', 'SF', 'FINAL']

function shuffled(list) {
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function emptyMatch() {
  return { home: null, away: null, homeScore: null, awayScore: null, homePens: null, awayPens: null, winner: null, user: false }
}

export function createTournament({ teamId, difficulty, lengthMinutes }) {
  const others = shuffled(TEAMS.map((team) => team.id).filter((id) => id !== teamId))
  const order = [teamId, ...others]
  const rounds = [
    Array.from({ length: 4 }, () => emptyMatch()),
    Array.from({ length: 2 }, () => emptyMatch()),
    Array.from({ length: 1 }, () => emptyMatch())
  ]
  for (let i = 0; i < 4; i += 1) {
    const home = order[i * 2]
    const away = order[i * 2 + 1]
    rounds[0][i].home = home
    rounds[0][i].away = away
    rounds[0][i].user = home === teamId || away === teamId
  }
  return {
    version: 1,
    id: Date.now().toString(36),
    teamId,
    difficulty,
    lengthMinutes,
    round: 0,
    alive: true,
    eliminated: false,
    champion: null,
    rounds,
    lastResult: null,
    createdAt: Date.now()
  }
}

export function getUserMatch(tournament) {
  if (!tournament || !tournament.alive || tournament.champion) return null
  const round = tournament.rounds[tournament.round]
  if (!round) return null
  return round.find((match) => match.user && !match.winner) || null
}

export function userOpponent(tournament) {
  const match = getUserMatch(tournament)
  if (!match) return null
  return match.home === tournament.teamId ? match.away : match.home
}

function simulateMatch(homeId, awayId) {
  const home = getTeam(homeId)
  const away = getTeam(awayId)
  const homeChance = 1 / (1 + Math.pow(10, (away.rating - home.rating) / 16))
  let homeScore = 0
  let awayScore = 0
  for (let i = 0; i < 5; i += 1) {
    if (Math.random() < 0.14 + home.rating * 0.0023) homeScore += 1
    if (Math.random() < 0.13 + away.rating * 0.0022) awayScore += 1
  }
  let homePens = null
  let awayPens = null
  if (homeScore === awayScore) {
    const shootout = resolveShootout(home, away)
    homePens = shootout.home
    awayPens = shootout.away
    return {
      homeScore,
      awayScore,
      homePens,
      awayPens,
      winner: shootout.home > shootout.away ? homeId : awayId
    }
  }
  return {
    homeScore,
    awayScore,
    homePens,
    awayPens,
    winner: homeScore > awayScore ? homeId : awayId
  }
}

export function resolveShootout(home, away) {
  let homePens = 0
  let awayPens = 0
  const homeSkill = 0.62 + (home.rating - 70) * 0.012
  const awaySkill = 0.62 + (away.rating - 70) * 0.012
  for (let i = 0; i < 5; i += 1) {
    if (Math.random() < homeSkill) homePens += 1
    if (Math.random() < awaySkill) awayPens += 1
  }
  let sudden = 0
  while (homePens === awayPens && sudden < 12) {
    const homeGoal = Math.random() < homeSkill
    const awayGoal = Math.random() < awaySkill
    if (homeGoal) homePens += 1
    if (awayGoal) awayPens += 1
    sudden += 1
  }
  if (homePens === awayPens) homePens += 1
  return { home: homePens, away: awayPens }
}

function simulateRemainingRound(tournament, roundIndex) {
  const round = tournament.rounds[roundIndex]
  for (const match of round) {
    if (match.winner) continue
    if (match.user) continue
    if (!match.home || !match.away) continue
    const result = simulateMatch(match.home, match.away)
    match.homeScore = result.homeScore
    match.awayScore = result.awayScore
    match.homePens = result.homePens
    match.awayPens = result.awayPens
    match.winner = result.winner
  }
}

function advanceBracket(tournament) {
  const round = tournament.rounds[tournament.round]
  if (!round.every((match) => match.winner)) return false
  if (tournament.round >= tournament.rounds.length - 1) {
    tournament.champion = round[0].winner
    return true
  }
  const winners = round.map((match) => match.winner)
  const nextRound = tournament.rounds[tournament.round + 1]
  for (let i = 0; i < nextRound.length; i += 1) {
    nextRound[i].home = winners[i * 2]
    nextRound[i].away = winners[i * 2 + 1]
    nextRound[i].user = nextRound[i].home === tournament.teamId || nextRound[i].away === tournament.teamId
    nextRound[i].winner = null
    nextRound[i].homeScore = null
    nextRound[i].awayScore = null
    nextRound[i].homePens = null
    nextRound[i].awayPens = null
  }
  tournament.round += 1
  return true
}

export function recordUserResult(tournament, userScore, opponentScore) {
  const match = getUserMatch(tournament)
  if (!match) return { advanced: false, error: 'No active cup match.' }
  const userIsHome = match.home === tournament.teamId
  const home = getTeam(match.home)
  const away = getTeam(match.away)
  match.homeScore = userIsHome ? userScore : opponentScore
  match.awayScore = userIsHome ? opponentScore : userScore
  let userWon = userScore > opponentScore
  let shootout = null
  if (userScore === opponentScore) {
    shootout = resolveShootout(home, away)
    match.homePens = shootout.home
    match.awayPens = shootout.away
    const homeWon = shootout.home > shootout.away
    userWon = userIsHome ? homeWon : !homeWon
  }
  match.winner = userWon ? tournament.teamId : (match.home === tournament.teamId ? match.away : match.home)
  tournament.lastResult = {
    round: tournament.round,
    userScore,
    opponentScore,
    userWon,
    shootout,
    opponent: userIsHome ? match.away : match.home
  }
  if (!userWon) {
    tournament.alive = false
    tournament.eliminated = true
    simulateRemainingRound(tournament, tournament.round)
    return {
      advanced: false,
      eliminated: true,
      shootout,
      match,
      opponent: tournament.lastResult.opponent
    }
  }
  simulateRemainingRound(tournament, tournament.round)
  const userMatch = getUserMatch(tournament)
  if (!userMatch) advanceBracket(tournament)
  return {
    advanced: !tournament.champion,
    eliminated: false,
    champion: tournament.champion,
    shootout,
    match,
    round: tournament.round,
    opponent: tournament.lastResult.opponent
  }
}

export function simulateToChampion(tournament) {
  if (tournament.champion) return tournament.champion
  for (let r = tournament.round; r < tournament.rounds.length; r += 1) {
    if (r === tournament.round && getUserMatch(tournament)) break
    simulateRemainingRound(tournament, r)
    if (!advanceBracket(tournament)) break
    if (tournament.champion) break
  }
  return tournament.champion
}

export function cupRoundLabel(tournament) {
  if (!tournament) return ''
  if (tournament.champion) return 'CHAMPIONS'
  if (tournament.eliminated) return 'ELIMINATED'
  return ROUND_NAMES[tournament.round] || 'KNOCKOUT'
}
