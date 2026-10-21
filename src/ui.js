import {
  DEFAULT_SETTINGS,
  DIFFICULTIES,
  FORMATIONS,
  MATCH_LENGTHS,
  MENTALITIES,
  TEAMS,
  createRoster,
  getTeam,
  playerAttributes
} from './data.js'
import { CRATES, DIVISIONS, RARITIES, rankProgress } from './progression.js'
import { KIT_PALETTES, PLAYER_POOL, PLAYER_BY_ID, buildLineup, effectiveOverall, kitPalette, positionPenalty, squadLineup, squadPlayers, squadRating } from './squad.js'
import { ROUND_NAMES, cupRoundLabel, getUserMatch, userOpponent } from './tournament.js'

const $ = (id) => document.getElementById(id)

const BASE_SCREENS = [
  'loadingScreen',
  'mainMenu',
  'quickSetup',
  'tournamentScreen',
  'careerScreen',
  'resultsScreen',
  'fatalError'
]

const OVERLAYS = ['helpScreen', 'settingsScreen', 'pauseScreen', 'halftimeScreen', 'matchIntro']

const MENU_TIPS = [
  'TIP: HOLD SHOOT TO POWER UP.',
  'TIP: THE GLOWING RING IS YOUR ACTIVE PLAYER.',
  'TIP: PASS INTO SPACE WITH Q / THROUGH.',
  'TIP: SPRINTING DRAINS STAMINA. USE IT WISELY.',
  'TIP: SWITCH PLAYERS WHEN THE BALL BREAKS LOOSE.',
  'TIP: LOCAL 2P IS PLAYABLE WITH ONE KEYBOARD.'
]

function crestStyle(team) {
  return `--c1:${team.primary};--c2:${team.secondary}`
}

function crestMarkup(team, extraClass = '') {
  return `<span class="crest ${extraClass}" style="${crestStyle(team)}" aria-hidden="true">${team.short}</span>`
}

function statBar(label, homeValue, awayValue, suffix = '') {
  const total = (Number(homeValue) || 0) + (Number(awayValue) || 0)
  const homePercent = total > 0 ? (homeValue / total) * 100 : 50
  return `
    <div class="stat-bar">
      <span>${homeValue}${suffix}</span>
      <div class="stat-track"><i style="width:${homePercent.toFixed(1)}%"></i></div>
      <span>${awayValue}${suffix}</span>
      <span class="stat-label">${label}</span>
    </div>
  `
}

function statsMarkup(stats, compact = false) {
  if (!stats) return ''
  const totalPossession = stats.possession[0] + stats.possession[1]
  const homePossession = totalPossession ? Math.round((stats.possession[0] / totalPossession) * 100) : 50
  return `
    ${statBar('Possession', homePossession, 100 - homePossession, '%')}
    ${statBar('Shots', stats.shots[0], stats.shots[1])}
    ${statBar('On target', stats.onTarget[0], stats.onTarget[1])}
    ${compact ? '' : statBar('Fouls', stats.fouls[0], stats.fouls[1])}
    ${compact ? '' : statBar('Corners', stats.corners[0], stats.corners[1])}
  `
}

export class UIController {
  constructor(settings, actions) {
    this.settings = { ...settings }
    this.actions = actions
    this.selectedTeamId = 'aurora'
    this.selectedOpponentId = 'comets'
    this.quickLength = this.settings.matchLength
    this.quickDifficulty = this.settings.difficulty
    this.quickPlayers = 1
    this.tournamentTeamId = 'aurora'
    this.tournamentLength = this.settings.matchLength
    this.tournamentDifficulty = this.settings.difficulty
    this.tournament = null
    this.profile = { matches: 0, wins: 0, goals: 0, bestPractice: 0, xp: 0, coins: 0, keys: 0, playerStats: {}, crateHistory: [] }
    this.squad = null
    this.careerTab = 'rank'
    this.selectedSlot = 0
    this.statsClubId = 'aurora'
    this.lastSnapshot = null
    this.settingsReturn = 'mainMenu'
    this.subOptions = null
    this.selectedOutId = null
    this.selectedBenchIndex = null
    this.resetArmed = false
    this.resetTimer = null
    this.goalTimer = null
    this.tipIndex = 0
    this.toastTimers = new Set()
    this.touch = window.matchMedia?.('(pointer: coarse)')?.matches || 'ontouchstart' in window
    document.body.classList.toggle('touch', this.touch)
    this.bindStaticEvents()
    this.renderQuickTeams()
    this.renderTournament()
    this.syncSettingsControls()
    this.updateMenuStats()
    this.setIntervalTips()
  }

  setBaseScreen(id) {
    for (const screenId of BASE_SCREENS) {
      const element = $(screenId)
      if (element) element.classList.toggle('active', screenId === id)
    }
    for (const overlayId of OVERLAYS) {
      if (overlayId !== 'matchIntro') $(overlayId)?.classList.remove('active')
    }
  }

  showMainMenu() {
    this.setBaseScreen('mainMenu')
    for (const overlayId of OVERLAYS) $(overlayId)?.classList.remove('active')
    $('goalOverlay')?.classList.remove('show')
    this.hideHud()
    document.body.classList.remove('in-match', 'practice', 'local-two', 'paused')
    this.updateMenuStats()
  }

  enterMatch(config, snapshot) {
    this.setBaseScreen('')
    for (const overlayId of OVERLAYS) {
      if (overlayId !== 'matchIntro') $(overlayId)?.classList.remove('active')
    }
    this.showHud(snapshot)
    this.showMatchIntro(config)
  }

  showLoading(note) {
    this.setBaseScreen('loadingScreen')
    if (note) $('loadingNote').textContent = note
  }

  finishLoading() {
    this.setBaseScreen('mainMenu')
    this.updateMenuStats()
  }

  showQuickSetup() {
    this.setBaseScreen('quickSetup')
    this.renderQuickTeams()
    this.syncQuickOptions()
  }

  showTournament() {
    this.setBaseScreen('tournamentScreen')
    this.renderTournament()
  }

  openHelp() {
    $('helpScreen').classList.add('active')
  }

  closeHelp() {
    $('helpScreen').classList.remove('active')
  }

  openSettings(from = 'mainMenu') {
    this.settingsReturn = from
    this.syncSettingsControls()
    $('settingsScreen').classList.add('active')
  }

  closeSettings() {
    $('settingsScreen').classList.remove('active')
    if (this.settingsReturn === 'mainMenu') this.updateMenuStats()
  }

  setTournament(tournament) {
    this.tournament = tournament
    this.updateMenuStats()
    if ($('tournamentScreen').classList.contains('active')) this.renderTournament()
  }

  setProfile(profile) {
    this.profile = { ...profile }
    this.updateMenuStats()
  }

  setSettings(settings) {
    this.settings = { ...settings }
    this.syncSettingsControls()
    this.updateKeyHints()
  }

  updateMenuStats() {
    const record = $('profileRecord')
    if (record) {
      record.textContent = `${this.profile.wins || 0} WINS · ${this.profile.goals || 0} GOALS`
      $('profileBest').textContent = `PRACTICE BEST ${this.profile.bestPractice || 0}`
      const rank = $('profileRank')
      if (rank) {
        const progress = rankProgress(this.profile)
        rank.textContent = `${progress.division.name.toUpperCase()} · LEVEL ${progress.level} · ${progress.coins} COINS`
      }
    }
    const subtitle = $('tournamentSubtitle')
    if (subtitle) {
      if (!this.tournament) {
        subtitle.textContent = 'Eight clubs. One trophy.'
      } else if (this.tournament.champion) {
        subtitle.textContent = `Champions: ${getTeam(this.tournament.champion).name}`
      } else if (this.tournament.eliminated) {
        subtitle.textContent = 'Cup run ended. Start again.'
      } else {
        subtitle.textContent = `Continue · ${ROUND_NAMES[this.tournament.round] || 'Knockout'}`
      }
    }
  }

  setIntervalTips() {
    setInterval(() => {
      this.tipIndex = (this.tipIndex + 1) % MENU_TIPS.length
      const tip = $('menuTip')
      if (tip) tip.textContent = MENU_TIPS[this.tipIndex]
    }, 6500)
  }

  bindStaticEvents() {
    document.querySelectorAll('[data-route]').forEach((button) => {
      button.addEventListener('click', () => {
        const route = button.dataset.route
        this.actions.onRoute?.(route)
      })
    })

    $('menuHelpButton')?.addEventListener('click', () => this.openHelp())
    $('menuSettingsButton')?.addEventListener('click', () => this.openSettings('mainMenu'))
    $('careerButton')?.addEventListener('click', () => this.actions.onShowCareer?.())
    $('helpDone')?.addEventListener('click', () => this.closeHelp())
    document.querySelectorAll('[data-close="help"]').forEach((button) => button.addEventListener('click', () => this.closeHelp()))
    document.querySelectorAll('[data-close="settings"]').forEach((button) => button.addEventListener('click', () => this.closeSettings()))
    $('settingsDone')?.addEventListener('click', () => this.closeSettings())

    document.querySelectorAll('[data-back]').forEach((button) => {
      button.addEventListener('click', () => {
        if (button.dataset.back === 'menu') this.actions.onBackToMenu?.()
      })
    })

    $('quickTeamGrid')?.addEventListener('click', (event) => {
      const card = event.target.closest('[data-team]')
      if (!card) return
      this.selectedTeamId = card.dataset.team
      if (this.selectedOpponentId === this.selectedTeamId) {
        this.selectedOpponentId = TEAMS.find((team) => team.id !== this.selectedTeamId)?.id || 'comets'
      }
      this.renderQuickTeams()
      this.renderOpponentSelect()
      this.actions.onUiSound?.('select')
    })

    $('opponentSelect')?.addEventListener('change', (event) => {
      this.selectedOpponentId = event.target.value
      this.renderQuickTeams()
      this.actions.onUiSound?.('select')
    })

    $('randomOpponent')?.addEventListener('click', () => {
      const choices = TEAMS.filter((team) => team.id !== this.selectedTeamId)
      this.selectedOpponentId = choices[Math.floor(Math.random() * choices.length)].id
      this.renderQuickTeams()
      this.renderOpponentSelect()
      this.actions.onUiSound?.('select')
    })

    $('lengthOptions')?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-length]')
      if (!button) return
      this.quickLength = Number(button.dataset.length)
      this.syncQuickOptions()
      this.actions.onUiSound?.('click')
    })

    $('difficultyOptions')?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-difficulty]')
      if (!button) return
      this.quickDifficulty = button.dataset.difficulty
      this.syncQuickOptions()
      this.actions.onUiSound?.('click')
    })

    $('playerOptions')?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-players]')
      if (!button) return
      this.quickPlayers = Number(button.dataset.players)
      this.syncQuickOptions()
      this.actions.onUiSound?.('click')
    })

    $('startQuickMatch')?.addEventListener('click', () => {
      this.actions.onQuickMatch?.(this.getQuickConfig())
    })

    $('tournamentContent')?.addEventListener('click', (event) => {
      const teamButton = event.target.closest('[data-tour-team]')
      if (teamButton) {
        this.tournamentTeamId = teamButton.dataset.tourTeam
        this.renderTournament()
        this.actions.onUiSound?.('select')
        return
      }
      const difficulty = event.target.closest('[data-tour-difficulty]')
      if (difficulty) {
        this.tournamentDifficulty = difficulty.dataset.tourDifficulty
        this.renderTournament()
        this.actions.onUiSound?.('click')
        return
      }
      const length = event.target.closest('[data-tour-length]')
      if (length) {
        this.tournamentLength = Number(length.dataset.tourLength)
        this.renderTournament()
        this.actions.onUiSound?.('click')
        return
      }
      if (event.target.closest('[data-start-cup]')) {
        this.actions.onStartTournament?.({
          teamId: this.tournamentTeamId,
          difficulty: this.tournamentDifficulty,
          lengthMinutes: this.tournamentLength
        })
        return
      }
      if (event.target.closest('[data-play-cup]')) {
        this.actions.onPlayTournamentMatch?.()
        return
      }
      if (event.target.closest('[data-new-cup]')) {
        this.actions.onNewTournament?.()
        return
      }
    })

    $('pauseButton')?.addEventListener('click', () => this.actions.onPause?.())
    $('resumeButton')?.addEventListener('click', () => this.actions.onResume?.())
    $('quitMatchButton')?.addEventListener('click', () => this.actions.onQuitMatch?.())
    $('secondHalfButton')?.addEventListener('click', () => this.actions.onSecondHalf?.())
    $('rematchButton')?.addEventListener('click', () => this.actions.onRematch?.())
    $('resultsMenuButton')?.addEventListener('click', () => this.actions.onMenu?.())
    $('tournamentContinueButton')?.addEventListener('click', () => this.actions.onContinueCup?.())

    document.querySelectorAll('[data-pause-panel]').forEach((button) => {
      button.addEventListener('click', () => {
        const panel = button.dataset.pausePanel
        if (panel === 'settings') {
          this.openSettings('pause')
          return
        }
        this.showPausePanel(panel)
        this.actions.onUiSound?.('click')
      })
    })

    document.querySelectorAll('[data-pause-back]').forEach((button) => {
      button.addEventListener('click', () => this.showPausePanel('main'))
    })

    $('formationGrid')?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-formation]')
      if (!button) return
      this.actions.onFormation?.(button.dataset.formation)
      document.querySelectorAll('#formationGrid .formation-button').forEach((item) => item.classList.toggle('active', item === button))
      this.actions.onUiSound?.('click')
    })

    $('mentalityOptions')?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-mentality]')
      if (!button) return
      this.actions.onMentality?.(button.dataset.mentality)
      document.querySelectorAll('#mentalityOptions button').forEach((item) => item.classList.toggle('active', item === button))
      const hint = $('tacticsHint')
      if (hint) hint.textContent = MENTALITIES[button.dataset.mentality]?.label || ''
      this.actions.onUiSound?.('click')
    })

    $('subsOutList')?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-out-id]')
      if (!button) return
      this.selectedOutId = button.dataset.outId
      this.renderSubs()
      this.actions.onUiSound?.('click')
    })

    $('subsInList')?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-in-index]')
      if (!button) return
      this.selectedBenchIndex = Number(button.dataset.inIndex)
      this.renderSubs()
      this.actions.onUiSound?.('click')
    })

    $('confirmSubButton')?.addEventListener('click', () => {
      if (this.selectedOutId === null || this.selectedBenchIndex === null) return
      this.actions.onSubstitute?.({
        playerId: this.selectedOutId,
        benchIndex: this.selectedBenchIndex
      })
    })

    const bindRange = (id, valueId, key) => {
      const input = $(id)
      const value = $(valueId)
      if (!input) return
      input.addEventListener('input', () => {
        const raw = Number(input.value)
        this.settings[key] = raw / 100
        if (value) value.textContent = `${raw}%`
        this.actions.onSettingsChanged?.({ ...this.settings })
      })
    }
    bindRange('volumeRange', 'volumeValue', 'volume')
    bindRange('musicRange', 'musicValue', 'music')
    bindRange('cameraRange', 'cameraValue', 'cameraDistance')

    $('settingsDifficulty')?.addEventListener('change', (event) => {
      this.settings.difficulty = event.target.value
      this.quickDifficulty = event.target.value
      this.actions.onSettingsChanged?.({ ...this.settings })
    })
    $('settingsLength')?.addEventListener('change', (event) => {
      this.settings.matchLength = Number(event.target.value)
      this.quickLength = Number(event.target.value)
      this.actions.onSettingsChanged?.({ ...this.settings })
    })
    $('settingsScheme')?.addEventListener('change', (event) => {
      this.settings.scheme = event.target.value
      this.updateKeyHints()
      this.actions.onSettingsChanged?.({ ...this.settings })
    })
    $('crowdToggle')?.addEventListener('change', (event) => {
      this.settings.crowd = event.target.checked
      this.actions.onSettingsChanged?.({ ...this.settings })
    })
    $('shakeToggle')?.addEventListener('change', (event) => {
      this.settings.screenShake = event.target.checked
      this.actions.onSettingsChanged?.({ ...this.settings })
    })
    $('offsideToggle')?.addEventListener('change', (event) => {
      this.settings.offside = event.target.checked
      this.actions.onSettingsChanged?.({ ...this.settings })
      if (this.lastSnapshot) {
        $('hudMeta').textContent = this.settings.offside ? `OFFSIDE ON · ${DIFFICULTIES[this.quickDifficulty]?.name.toUpperCase()}` : 'OFFSIDE OFF'
      }
    })

    $('resetDataButton')?.addEventListener('click', () => {
      if (!this.resetArmed) {
        this.resetArmed = true
        $('resetDataButton').textContent = 'CLICK AGAIN TO CONFIRM'
        this.resetTimer = setTimeout(() => {
          this.resetArmed = false
          $('resetDataButton').textContent = 'RESET SAVED DATA'
        }, 3200)
        return
      }
      clearTimeout(this.resetTimer)
      this.resetArmed = false
      $('resetDataButton').textContent = 'RESET SAVED DATA'
      this.actions.onResetData?.()
      this.settings = { ...DEFAULT_SETTINGS }
      this.quickDifficulty = DEFAULT_SETTINGS.difficulty
      this.quickLength = DEFAULT_SETTINGS.matchLength
      this.syncSettingsControls()
      this.updateMenuStats()
      this.actions.onSettingsChanged?.({ ...this.settings })
      this.showToast({ title: 'DATA RESET', detail: 'Settings, cup and profile cleared.', tone: 'info' })
    })

    $('careerTabs')?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-career-tab]')
      if (!button) return
      this.careerTab = button.dataset.careerTab
      this.renderCareer()
      this.actions.onUiSound?.('click')
    })

    $('crateGrid')?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-open-crate]')
      if (!button) return
      const reward = this.actions.onOpenCrate?.(button.dataset.openCrate)
      if (reward) {
        this.showCrateReward(reward)
        this.renderCratePanel()
        this.renderCareer()
      }
      this.actions.onUiSound?.('select')
    })

    $('squadSlots')?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-slot]')
      if (!button) return
      this.selectedSlot = Number(button.dataset.slot)
      this.renderSquadPanel()
      this.actions.onUiSound?.('click')
    })

    $('playerPool')?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-pool-player]')
      if (!button || !this.squad) return
      const player = PLAYER_BY_ID.get(button.dataset.poolPlayer)
      if (!player) return
      const lineup = [...(this.squad.lineup || [])]
      const slotIndex = Math.min(this.selectedSlot, lineup.length - 1)
      const previous = lineup[slotIndex]
      lineup[slotIndex] = player.id
      const bench = [...(this.squad.bench || [])]
      if (previous && previous !== player.id && !bench.includes(previous)) {
        bench.unshift(previous)
        bench.length = 5
      }
      this.actions.onSquadUpdate?.({ lineup, bench })
      this.squad = { ...this.squad, lineup, bench }
      this.renderSquadPanel()
      this.actions.onUiSound?.('select')
    })

    $('squadFormations')?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-squad-formation]')
      if (!button || !this.squad) return
      const formationId = button.dataset.squadFormation
      const current = squadLineup(this.squad).filter(Boolean)
      const extras = squadPlayers(this.squad).filter((player) => !current.some((entry) => entry.id === player.id))
      const players = [...current, ...extras]
      const assigned = buildLineup(players, formationId)
      const lineup = assigned.map((player) => player?.id || null)
      while (lineup.length < 11) lineup.push(null)
      this.actions.onSquadUpdate?.({ formation: formationId, lineup })
      this.squad = { ...this.squad, formation: formationId, lineup }
      this.renderSquadPanel()
      this.actions.onUiSound?.('click')
    })

    $('kitPicker')?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-kit]')
      if (!button || !this.squad) return
      this.actions.onSquadUpdate?.({ kit: button.dataset.kit })
      this.squad = { ...this.squad, kit: button.dataset.kit }
      this.renderSquadPanel()
      this.actions.onUiSound?.('select')
    })

    $('squadNameInput')?.addEventListener('input', (event) => {
      const value = event.target.value.toUpperCase().slice(0, 18)
      event.target.value = value
      this.actions.onSquadUpdate?.({ teamName: value || 'MY CLUB' })
    })

    $('statsClubSelect')?.addEventListener('change', (event) => {
      this.statsClubId = event.target.value
      this.renderStatsPanel()
      this.actions.onUiSound?.('click')
    })
  }

  syncSettingsControls() {
    const settings = this.settings
    const volume = Math.round(settings.volume * 100)
    const music = Math.round(settings.music * 100)
    const camera = Math.round(settings.cameraDistance * 100)
    if ($('volumeRange')) $('volumeRange').value = volume
    if ($('volumeValue')) $('volumeValue').textContent = `${volume}%`
    if ($('musicRange')) $('musicRange').value = music
    if ($('musicValue')) $('musicValue').textContent = `${music}%`
    if ($('cameraRange')) $('cameraRange').value = camera
    if ($('cameraValue')) $('cameraValue').textContent = `${camera}%`
    if ($('settingsDifficulty')) $('settingsDifficulty').value = settings.difficulty
    if ($('settingsLength')) $('settingsLength').value = String(settings.matchLength)
    if ($('settingsScheme')) $('settingsScheme').value = settings.scheme
    if ($('crowdToggle')) $('crowdToggle').checked = settings.crowd
    if ($('shakeToggle')) $('shakeToggle').checked = settings.screenShake
    if ($('offsideToggle')) $('offsideToggle').checked = settings.offside
    this.updateKeyHints()
  }

  updateKeyHints() {
    const hints = $('keyHints')
    if (!hints) return
    const alt = this.settings.scheme === 'alternate'
    hints.innerHTML = alt
      ? '<span><kbd>J</kbd> SHOOT</span><span><kbd>K</kbd> PASS</span><span><kbd>L</kbd> THROUGH</span><span><kbd>SHIFT</kbd> SPRINT</span><span><kbd>U</kbd> SWITCH</span>'
      : '<span><kbd>SPACE</kbd> SHOOT</span><span><kbd>E</kbd> PASS</span><span><kbd>Q</kbd> THROUGH</span><span><kbd>SHIFT</kbd> SPRINT</span><span><kbd>F</kbd> SWITCH</span>'
  }

  selectableTeams() {
    if (!this.squad) return TEAMS
    const custom = {
      id: 'myclub',
      name: this.squad.teamName || 'MY CLUB',
      city: 'Your Club',
      short: 'MYC',
      primary: kitPalette(this.squad.kit).primary,
      secondary: kitPalette(this.squad.kit).secondary,
      accent: kitPalette(this.squad.kit).accent,
      rating: squadRating(this.squad),
      formation: this.squad.formation || '4-3-3',
      style: 'Your XI'
    }
    return [custom, ...TEAMS]
  }

  renderQuickTeams() {
    const grid = $('quickTeamGrid')
    if (!grid) return
    grid.innerHTML = this.selectableTeams().map((team) => `
      <button class="team-card ${team.id === this.selectedTeamId ? 'selected' : ''}" data-team="${team.id}" style="--team-color:${team.primary}" role="option" aria-selected="${team.id === this.selectedTeamId}" type="button">
        <span class="select-mark"></span>
        <span class="crest" style="${crestStyle(team)}">${team.short}</span>
        <span class="team-name">${team.name}</span>
        <span class="team-city">${team.city}</span>
        <span class="team-meta"><span>${team.formation} · ${team.style}</span><span class="team-rating">${team.rating}</span></span>
      </button>
    `).join('')
    this.renderOpponentSelect()
    this.updateQuickSummary()
  }

  renderOpponentSelect() {
    const select = $('opponentSelect')
    if (!select) return
    const options = TEAMS.filter((team) => team.id !== this.selectedTeamId)
    if (!options.some((team) => team.id === this.selectedOpponentId)) {
      this.selectedOpponentId = options[0]?.id || 'comets'
    }
    select.innerHTML = options.map((team) => `<option value="${team.id}" ${team.id === this.selectedOpponentId ? 'selected' : ''}>${team.name} · ${team.rating}</option>`).join('')
    const opponent = getTeam(this.selectedOpponentId)
    const crest = $('opponentCrest')
    if (crest) {
      crest.textContent = opponent.short
      crest.style.setProperty('--c1', opponent.primary)
      crest.style.setProperty('--c2', opponent.secondary)
    }
    this.updateQuickSummary()
  }

  updateQuickSummary() {
    const teams = this.selectableTeams()
    const home = teams.find((team) => team.id === this.selectedTeamId) || teams[0]
    const away = getTeam(this.selectedOpponentId)
    if ($('selectedTeamLabel')) $('selectedTeamLabel').textContent = home.name.toUpperCase()
    if ($('homeMiniName')) $('homeMiniName').textContent = home.name.toUpperCase()
    if ($('awayMiniName')) $('awayMiniName').textContent = away.name.toUpperCase()
  }

  syncQuickOptions() {
    document.querySelectorAll('#lengthOptions [data-length]').forEach((button) => {
      button.classList.toggle('active', Number(button.dataset.length) === this.quickLength)
    })
    document.querySelectorAll('#difficultyOptions [data-difficulty]').forEach((button) => {
      button.classList.toggle('active', button.dataset.difficulty === this.quickDifficulty)
    })
    document.querySelectorAll('#playerOptions [data-players]').forEach((button) => {
      button.classList.toggle('active', Number(button.dataset.players) === this.quickPlayers)
    })
    const hint = $('playerHint')
    if (hint) {
      hint.textContent = this.quickPlayers === 2
        ? 'Player 1 uses WASD, Player 2 uses the arrow keys. One shared camera, two rival teams.'
        : 'Play as the home club. Your teammates are driven by role-based AI.'
    }
    this.updateQuickSummary()
  }

  getQuickConfig() {
    return {
      mode: 'quick',
      homeId: this.selectedTeamId,
      awayId: this.selectedOpponentId,
      difficulty: this.quickDifficulty,
      lengthMinutes: this.quickLength,
      humans: this.quickPlayers === 2 ? [true, true] : [true, false]
    }
  }

  renderTournament() {
    const content = $('tournamentContent')
    if (!content) return
    if (!this.tournament) {
      content.innerHTML = this.tournamentSetupMarkup()
      return
    }
    content.innerHTML = this.tournamentBracketMarkup()
  }

  tournamentSetupMarkup() {
    return `
      <div class="tournament-setup">
        <div>
          <div class="section-label"><span>SELECT YOUR CLUB</span><span>${this.tournamentTeamId.toUpperCase()}</span></div>
          <div class="team-grid">
            ${TEAMS.map((team) => `
              <button class="team-card ${team.id === this.tournamentTeamId ? 'selected' : ''}" data-tour-team="${team.id}" style="--team-color:${team.primary}" type="button">
                <span class="select-mark"></span>
                <span class="crest" style="${crestStyle(team)}">${team.short}</span>
                <span class="team-name">${team.name}</span>
                <span class="team-city">${team.city}</span>
                <span class="team-meta"><span>${team.formation} · ${team.style}</span><span class="team-rating">${team.rating}</span></span>
              </button>
            `).join('')}
          </div>
        </div>
        <aside class="tournament-side">
          <div class="tournament-status">
            <p class="eyebrow">AURORA CUP</p>
            <h3>EIGHT CLUBS.<br>ONE TROPHY.</h3>
            <p>Quarter-finals, semi-finals and the final. Every match is sudden knockout: draws go to a penalty shootout. Your progress saves automatically.</p>
            <div class="option-card" style="border:0;background:transparent;padding:0">
              <div class="option-row"><span>DIFFICULTY</span>
                <div class="segmented">
                  ${Object.entries(DIFFICULTIES).map(([id, diff]) => `<button data-tour-difficulty="${id}" class="${this.tournamentDifficulty === id ? 'active' : ''}" type="button">${diff.name.toUpperCase()}</button>`).join('')}
                </div>
              </div>
              <div class="option-row"><span>MATCH LENGTH</span>
                <div class="segmented">
                  ${MATCH_LENGTHS.map((length) => `<button data-tour-length="${length}" class="${this.tournamentLength === length ? 'active' : ''}" type="button">${length} MIN</button>`).join('')}
                </div>
              </div>
            </div>
          </div>
          <button class="cta-button" data-start-cup type="button"><span>START THE CUP</span><small>FIXTURES ARE DRAWN IMMEDIATELY</small></button>
        </aside>
      </div>
    `
  }

  tournamentBracketMarkup() {
    const t = this.tournament
    const userTeam = getTeam(t.teamId)
    const nextMatch = getUserMatch(t)
    const opponentId = userOpponent(t)
    const opponent = opponentId ? getTeam(opponentId) : null
    const roundName = ROUND_NAMES[t.round] || 'KNOCKOUT'
    const champion = t.champion ? getTeam(t.champion) : null
    const statusTitle = champion
      ? `${champion.name.toUpperCase()} LIFT THE CUP`
      : t.eliminated
        ? 'THE RUN ENDS HERE'
        : `NEXT: ${roundName}`
    const statusDetail = champion
      ? 'Your name is on the Aurora Cup. Start another run or return to the pitch.'
      : t.eliminated
        ? `${userTeam.name} are out. The dream ends here — start a new run when you are ready.`
        : `You are managing ${userTeam.name}. Win three knockout ties to take the trophy.`
    return `
      <div class="bracket-wrap">
        <div class="bracket-head">
          <h3>AURORA CUP · ${cupRoundLabel(t)}</h3>
          <span>${DIFFICULTIES[t.difficulty]?.name.toUpperCase() || 'PRO'} · ${t.lengthMinutes} MIN MATCHES</span>
        </div>
        <div class="bracket">
          ${t.rounds.map((round, roundIndex) => `
            <div class="bracket-round">
              <span>${ROUND_NAMES[roundIndex]}</span>
              ${round.map((match) => this.bracketMatchMarkup(match, t)).join('')}
            </div>
          `).join('')}
          <div class="champion-card">
            ${champion ? `<span class="crest crest-lg" style="${crestStyle(champion)}">${champion.short}</span>` : '<span class="crest crest-lg" style="--c1:#5b7d83;--c2:#172d33">?</span>'}
            <small>CHAMPION</small>
            <strong>${champion ? champion.name.toUpperCase() : 'TO BE CROWNED'}</strong>
          </div>
        </div>
      </div>
      <div class="tournament-side">
        <div class="tournament-status">
          <p class="eyebrow">${t.champion ? 'AURORA CUP CHAMPIONS' : t.eliminated ? 'ELIMINATED' : roundName}</p>
          <h3>${statusTitle}</h3>
          <p>${statusDetail}</p>
          ${nextMatch && opponent ? `<div class="tournament-round-label">YOUR OPPONENT: ${opponent.name.toUpperCase()} · ${opponent.rating} OVR</div>` : ''}
        </div>
        ${nextMatch ? `<button class="cta-button" data-play-cup type="button"><span>PLAY ${roundName}</span><small>${userTeam.name.toUpperCase()} VS ${opponent.name.toUpperCase()}</small></button>` : ''}
        <button class="secondary-button" data-new-cup type="button">${t.champion || t.eliminated ? 'START A NEW CUP' : 'ABANDON & RESTART CUP'}</button>
      </div>
    `
  }

  bracketMatchMarkup(match, tournament) {
    const teamRow = (teamId) => {
      if (!teamId) return `<div class="bracket-team bracket-empty"><span>—</span><span>TBD</span></div>`
      const team = getTeam(teamId)
      const isWinner = match.winner === teamId
      const isUser = teamId === tournament.teamId
      let score = ''
      if (match.homeScore !== null && match.awayScore !== null) {
        const isHome = match.home === teamId
        const value = isHome ? match.homeScore : match.awayScore
        const pens = isHome ? match.homePens : match.awayPens
        score = `<strong>${value}${pens !== null && pens !== undefined ? `<small> (${pens})</small>` : ''}</strong>`
      }
      return `<div class="bracket-team ${isWinner ? 'winner' : ''} ${isUser ? 'you' : ''}"><span class="crest" style="${crestStyle(team)}">${team.short}</span><span>${team.name}</span>${score}</div>`
    }
    return `<div class="bracket-match ${match.user ? 'user-match' : ''}">${teamRow(match.home)}${teamRow(match.away)}</div>`
  }

  showMatchIntro(config) {
    const home = config.homeTeam || getTeam(config.homeId)
    const away = config.awayTeam || getTeam(config.awayId)
    $('introHomeCrest').textContent = home.short
    $('introHomeCrest').style.cssText = crestStyle(home)
    $('introHomeName').textContent = home.name.toUpperCase()
    $('introHomeCity').textContent = home.city.toUpperCase()
    $('introAwayCrest').textContent = away.short
    $('introAwayCrest').style.cssText = crestStyle(away)
    $('introAwayName').textContent = away.name.toUpperCase()
    $('introAwayCity').textContent = away.city.toUpperCase()
    $('introLength').textContent = `${config.lengthMinutes} MIN`
    $('introHint').textContent = config.humans?.[1]
      ? 'P1: WASD · P2: ARROWS · HOLD SHOOT TO POWER UP'
      : 'HOLD SHOOT TO POWER UP · PASS INTO SPACE · USE THE ACTIVE RING'
    $('matchIntro').classList.add('active')
  }

  hideMatchIntro() {
    $('matchIntro').classList.remove('active')
  }

  showHud(snapshot) {
    $('gameHud').classList.add('active')
    document.body.classList.add('in-match')
    document.body.classList.toggle('practice', Boolean(snapshot?.practice))
    document.body.classList.toggle('local-two', Boolean(snapshot?.humanSecond))
    this.updateHud(snapshot)
  }

  hideHud() {
    $('gameHud')?.classList.remove('active')
    document.body.classList.remove('in-match', 'practice', 'local-two')
  }

  updateHud(snapshot) {
    if (!snapshot || !snapshot.homeTeam || !snapshot.awayTeam) return
    this.lastSnapshot = snapshot
    const home = snapshot.homeTeam
    const away = snapshot.awayTeam
    $('hudHomeCrest').textContent = home.short
    $('hudHomeCrest').style.cssText = crestStyle(home)
    $('hudAwayCrest').textContent = away.short
    $('hudAwayCrest').style.cssText = crestStyle(away)
    $('hudHomeName').textContent = home.name.toUpperCase()
    $('hudAwayName').textContent = away.name.toUpperCase()
    $('hudHomeScore').textContent = snapshot.score[0]
    $('hudAwayScore').textContent = snapshot.score[1]
    $('hudClock').textContent = snapshot.clock
    const halfLabel = snapshot.practice
      ? 'PRACTICE'
      : snapshot.phase === 'halftime'
        ? 'HALF TIME'
        : snapshot.phase === 'fulltime'
          ? 'FULL TIME'
          : snapshot.half === 1 ? '1ST HALF' : '2ND HALF'
    $('hudHalf').textContent = halfLabel
    const difficultyName = DIFFICULTIES[snapshot.difficulty || this.settings.difficulty]?.name || 'PRO'
    $('hudMeta').textContent = snapshot.practice
      ? 'TARGET TRAINING'
      : snapshot.kickoff
        ? `KICK OFF · ${snapshot.kickoff.seconds}s`
        : `${this.settings.offside ? 'OFFSIDE ON' : 'OFFSIDE OFF'} · ${difficultyName.toUpperCase()}`
    if (snapshot.controlled) {
      $('hudPlayerNumber').textContent = snapshot.controlled.number
      $('hudPlayerName').textContent = snapshot.controlled.name
      $('hudStamina').style.width = `${Math.max(0, Math.min(100, snapshot.controlled.stamina))}%`
    }
    $('possessionHome').textContent = `${snapshot.possession[0]}%`
    $('possessionAway').textContent = `${snapshot.possession[1]}%`
    $('possessionFill').style.width = `${snapshot.possession[0]}%`
    $('hudSubsLeft').textContent = snapshot.practice ? 'TRAINING' : `${snapshot.subsLeft} SUBS`
    $('practiceScore').textContent = snapshot.practicePoints
    $('practiceGoals').textContent = `${snapshot.practiceGoals} GOALS`
    const powerMeter = $('powerMeter')
    powerMeter.classList.toggle('visible', Boolean(snapshot.charging && snapshot.charge > 0))
    $('powerFill').style.width = `${Math.round((snapshot.charge || 0) * 100)}%`
    document.body.classList.toggle('local-two', Boolean(snapshot.humanSecond))
    this.drawRadar(snapshot)
  }

  drawRadar(snapshot) {
    const canvas = $('radar')
    if (!canvas || !snapshot.radar) return
    const ctx = canvas.getContext('2d')
    const w = canvas.width
    const h = canvas.height
    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = 'rgba(5, 25, 30, 0.55)'
    ctx.fillRect(0, 0, w, h)
    const padX = 14
    const padY = 12
    const pitchW = w - padX * 2
    const pitchH = h - padY * 2
    const toX = (x) => padX + ((x + 36) / 72) * pitchW
    const toY = (z) => padY + ((z + 54) / 108) * pitchH
    ctx.strokeStyle = 'rgba(189, 255, 240, 0.28)'
    ctx.lineWidth = 1
    ctx.strokeRect(padX, padY, pitchW, pitchH)
    ctx.beginPath()
    ctx.moveTo(padX, padY + pitchH / 2)
    ctx.lineTo(padX + pitchW, padY + pitchH / 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(padX + pitchW / 2, padY + pitchH / 2, Math.min(pitchW, pitchH) * 0.14, 0, Math.PI * 2)
    ctx.stroke()
    ctx.strokeRect(padX + pitchW * 0.22, padY, pitchW * 0.56, pitchH * 0.14)
    ctx.strokeRect(padX + pitchW * 0.22, padY + pitchH * 0.86, pitchW * 0.56, pitchH * 0.14)
    const home = getTeam(snapshot.homeTeam.id)
    const away = getTeam(snapshot.awayTeam.id)
    for (const dot of snapshot.radar) {
      ctx.beginPath()
      ctx.fillStyle = dot.team === 0 ? home.primary : away.primary
      const x = toX(dot.x)
      const y = toY(dot.z)
      if (dot.gk) {
        ctx.fillRect(x - 2.5, y - 2.5, 5, 5)
      } else {
        ctx.arc(x, y, dot.active ? 3.4 : 2.5, 0, Math.PI * 2)
        ctx.fill()
      }
      if (dot.active) {
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(x, y, 5.2, 0, Math.PI * 2)
        ctx.stroke()
      }
    }
    if (snapshot.ballRadar) {
      ctx.beginPath()
      ctx.fillStyle = '#ffffff'
      ctx.arc(toX(snapshot.ballRadar.x), toY(snapshot.ballRadar.z), 2.2, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  setCommentary(text) {
    const line = $('commentaryLine')
    if (!line) return
    line.textContent = text
    line.style.animation = 'none'
    void line.offsetHeight
    line.style.animation = ''
  }

  showToast({ title, detail, tone = 'info' }, duration = 2600) {
    const stack = $('toastStack')
    if (!stack) return
    const toast = document.createElement('div')
    toast.className = `toast ${tone}`
    toast.innerHTML = `<strong>${title}</strong>${detail ? `<span>${detail}</span>` : ''}`
    stack.appendChild(toast)
    while (stack.children.length > 3) stack.removeChild(stack.firstChild)
    const timer = setTimeout(() => {
      toast.classList.add('out')
      setTimeout(() => {
        toast.remove()
        this.toastTimers.delete(timer)
      }, 300)
    }, duration)
    this.toastTimers.add(timer)
  }

  showGoal(payload) {
    const overlay = $('goalOverlay')
    $('goalKicker').textContent = payload.ownGoal ? 'OWN GOAL' : 'GOAL'
    $('goalScorer').textContent = (payload.scorer || 'UNKNOWN').toUpperCase()
    $('goalTeam').textContent = (payload.team === 0 ? payload.snapshot.homeTeam.name : payload.snapshot.awayTeam.name).toUpperCase()
    $('goalMinute').textContent = `${payload.minute}'`
    overlay.classList.remove('show')
    void overlay.offsetHeight
    overlay.classList.add('show')
    clearTimeout(this.goalTimer)
    this.goalTimer = setTimeout(() => overlay.classList.remove('show'), 3300)
  }

  targetFlash() {
    const flash = $('targetFlash')
    flash.classList.remove('show')
    void flash.offsetHeight
    flash.classList.add('show')
    setTimeout(() => flash.classList.remove('show'), 750)
  }

  openPause(snapshot) {
    this.lastSnapshot = snapshot
    const home = snapshot.homeTeam
    const away = snapshot.awayTeam
    $('pauseScore').textContent = `${snapshot.score[0]} — ${snapshot.score[1]}`
    $('pauseSubsLabel').textContent = `${snapshot.subsLeft} remaining`
    this.showPausePanel('main')
    this.renderTactics(snapshot)
    this.selectedOutId = null
    this.selectedBenchIndex = null
    this.subOptions = this.actions.getSubOptions?.(0) || null
    this.renderSubs()
    $('pauseScreen').classList.add('active')
    document.body.classList.add('paused')
  }

  closePause() {
    $('pauseScreen').classList.remove('active')
    document.body.classList.remove('paused')
  }

  showPausePanel(panel) {
    const main = $('pauseMain')
    const panels = { tactics: $('tacticsPanel'), subs: $('subsPanel'), controls: $('controlsPanel') }
    if (panel === 'main') {
      main.style.display = ''
      Object.values(panels).forEach((item) => item.classList.remove('active'))
      return
    }
    main.style.display = 'none'
    Object.entries(panels).forEach(([key, element]) => element.classList.toggle('active', key === panel))
    if (panel === 'subs') {
      this.subOptions = this.actions.getSubOptions?.(0) || null
      this.renderSubs()
    }
    if (panel === 'tactics') this.renderTactics(this.lastSnapshot)
  }

  renderTactics(snapshot) {
    if (!snapshot) return
    const grid = $('formationGrid')
    if (grid) {
      grid.innerHTML = Object.entries(FORMATIONS).map(([id, formation]) => `
        <button class="formation-button ${snapshot.formation === id ? 'active' : ''}" data-formation="${id}" type="button">
          <strong>${id}</strong>${formation.shape}
        </button>
      `).join('')
    }
    document.querySelectorAll('#mentalityOptions button').forEach((button) => {
      button.classList.toggle('active', button.dataset.mentality === snapshot.mentality)
    })
    const hint = $('tacticsHint')
    if (hint) hint.textContent = MENTALITIES[snapshot.mentality]?.label || 'Adapt to the match.'
    this.renderShape(snapshot)
  }

  renderShape(snapshot) {
    const pitch = $('shapePitch')
    if (!pitch) return
    const lineup = snapshot.lineup || []
    if (!lineup.length) {
      pitch.innerHTML = '<p class="help-copy">No lineup data yet.</p>'
      return
    }
    pitch.innerHTML = `
      <div class="shape-lines"></div>
      ${lineup.map((player) => {
        const left = 50 + player.slotX * 34
        const top = 92 - player.slotDepth * 78
        const out = player.position !== player.natural
        return `
          <div class="shape-player ${out ? 'out-of-position' : ''}" style="left:${left}%;top:${top}%">
            <span class="shape-number">${player.number}</span>
            <span class="shape-pos">${player.position}</span>
            <span class="shape-name">${player.name.split(' ').slice(-1)[0]}</span>
            <span class="shape-rating">${player.rating}</span>
          </div>
        `
      }).join('')}
    `
  }

  refreshSubs() {
    this.subOptions = this.actions.getSubOptions?.(0) || null
    this.renderSubs()
  }

  renderSubs() {
    const outList = $('subsOutList')
    const inList = $('subsInList')
    const confirm = $('confirmSubButton')
    if (!outList || !inList) return
    const data = this.subOptions
    if (!data) {
      outList.innerHTML = '<span class="help-copy">Substitutions unlock during a match.</span>'
      inList.innerHTML = ''
      if (confirm) confirm.disabled = true
      return
    }
    if (this.selectedOutId && !data.players.some((player) => player.id === this.selectedOutId)) this.selectedOutId = null
    if (this.selectedBenchIndex !== null && !data.bench.some((player) => player.index === this.selectedBenchIndex)) this.selectedBenchIndex = null
    outList.innerHTML = data.players.map((player) => `
      <button class="sub-player ${player.id === this.selectedOutId ? 'selected' : ''}" data-out-id="${player.id}" type="button">
        <span class="sub-number">${player.number}</span>
        <span class="sub-name">${player.name} <em>${player.role}</em></span>
        <span class="sub-stamina">${player.stamina}%</span>
      </button>
    `).join('')
    inList.innerHTML = data.bench.map((player) => `
      <button class="sub-player ${player.index === this.selectedBenchIndex ? 'selected' : ''}" data-in-index="${player.index}" type="button">
        <span class="sub-number">${player.number}</span>
        <span class="sub-name">${player.name}</span>
        <span class="sub-stamina">${player.stamina}%</span>
      </button>
    `).join('')
    const remaining = $('subsRemaining')
    if (remaining) remaining.textContent = `${data.subsLeft} REMAINING`
    const pauseLabel = $('pauseSubsLabel')
    if (pauseLabel) pauseLabel.textContent = `${data.subsLeft} remaining`
    if (confirm) {
      confirm.disabled = !(this.selectedOutId && this.selectedBenchIndex !== null && data.subsLeft > 0)
      confirm.textContent = data.subsLeft <= 0
        ? 'NO SUBSTITUTIONS REMAINING'
        : this.selectedOutId && this.selectedBenchIndex !== null
          ? 'MAKE SUBSTITUTION'
          : 'SELECT A PLAYER AND A SUBSTITUTE'
    }
  }

  showHalftime(snapshot) {
    this.lastSnapshot = snapshot
    $('halftimeHome').textContent = snapshot.homeTeam.short
    $('halftimeAway').textContent = snapshot.awayTeam.short
    $('halftimeScore').textContent = `${snapshot.score[0]} — ${snapshot.score[1]}`
    $('halftimeStats').innerHTML = statsMarkup(snapshot.stats)
    $('halftimeScreen').classList.add('active')
  }

  setSquad(squad) {
    this.squad = squad
    if ($('careerScreen')?.classList.contains('active')) this.renderCareer()
  }

  showCareer() {
    this.setBaseScreen('careerScreen')
    this.careerTab = 'rank'
    this.renderCareer()
  }

  renderCareer() {
    const progress = rankProgress(this.profile)
    if ($('careerCoins')) $('careerCoins').textContent = progress.coins
    if ($('careerKeys')) $('careerKeys').textContent = progress.keys
    const headings = { rank: 'RANK & REWARDS', crates: 'CRATE ROOM', squad: 'MY CLUB', stats: 'PLAYER STATS' }
    if ($('careerHeading')) $('careerHeading').textContent = headings[this.careerTab] || 'CAREER'
    document.querySelectorAll('[data-career-tab]').forEach((button) => {
      button.classList.toggle('active', button.dataset.careerTab === this.careerTab)
    })
    document.querySelectorAll('[data-career-panel]').forEach((panel) => {
      panel.classList.toggle('active', panel.dataset.careerPanel === this.careerTab)
    })
    if (this.careerTab === 'rank') this.renderRankPanel()
    else if (this.careerTab === 'crates') this.renderCratePanel()
    else if (this.careerTab === 'squad') this.renderSquadPanel()
    else this.renderStatsPanel()
  }

  renderRankPanel() {
    const progress = rankProgress(this.profile)
    const card = $('rankCard')
    if (card) {
      card.innerHTML = `
        <p class="eyebrow">CURRENT DIVISION</p>
        <h3 class="rank-division" style="--rank:${progress.division.color}">${progress.division.name}</h3>
        <p class="rank-level">LEVEL ${progress.level}</p>
        <div class="rank-bar"><i style="width:${progress.pct}%; --rank:${progress.division.color}"></i></div>
        <p class="rank-xp">${progress.xpIntoLevel} / ${progress.xpNeeded === Infinity ? 'MAX' : progress.xpNeeded} XP</p>
        <p class="rank-next">${progress.next
          ? `Next: <strong>${progress.next.name}</strong> at level ${progress.next.minLevel} · ${progress.next.reward} coins`
          : 'Top division reached. You are an Icon.'}</p>
        <div class="rank-records">
          <span><b>${this.profile.matches || 0}</b> matches</span>
          <span><b>${this.profile.wins || 0}</b> wins</span>
          <span><b>${this.profile.draws || 0}</b> draws</span>
          <span><b>${this.profile.losses || 0}</b> losses</span>
          <span><b>${this.profile.goals || 0}</b> goals</span>
          <span><b>${this.profile.bestPractice || 0}</b> practice</span>
        </div>
      `
    }
    const track = $('rewardTrack')
    if (track) {
      track.innerHTML = DIVISIONS.map((division) => {
        const reached = progress.level >= division.minLevel
        return `
          <div class="reward-step ${reached ? 'reached' : ''}" style="--rank:${division.color}">
            <span class="reward-tier">TIER ${division.tier}</span>
            <strong>${division.name}</strong>
            <small>LV ${division.minLevel}+ · ${division.reward} coins${division.keys ? ` · ${division.keys} key` : ''}</small>
          </div>
        `
      }).join('')
    }
  }

  renderCratePanel() {
    const grid = $('crateGrid')
    if (grid) {
      grid.innerHTML = CRATES.map((crate) => `
        <article class="crate-card" style="--crate:${crate.color}">
          <span class="crate-icon">${crate.icon}</span>
          <h3>${crate.name}</h3>
          <p>${crate.subtitle}</p>
          <div class="crate-cost">
            <span>${crate.cost} COINS</span>
            ${crate.keyCost ? `<span>${crate.keyCost} KEY</span>` : ''}
          </div>
          <button class="cta-button compact" data-open-crate="${crate.id}" type="button">OPEN</button>
        </article>
      `).join('')
    }
    const history = $('crateHistory')
    if (history) {
      const entries = this.profile.crateHistory || []
      history.innerHTML = entries.length
        ? `<h3>RECENT DROPS</h3>${entries.map((entry) => `
          <div class="crate-entry" style="--rarity:${RARITIES[entry.rarity]?.color || '#9fb4c7'}">
            <strong>${entry.name}</strong><span>${RARITIES[entry.rarity]?.name || entry.rarity}</span>
          </div>`).join('')}`
        : '<p class="career-note">No drops yet. Open a crate to start the collection.</p>'
    }
  }

  showCrateReward(reward) {
    const reveal = $('crateReveal')
    if (!reveal || !reward) return
    const color = RARITIES[reward.rarity]?.color || '#31f2c5'
    reveal.classList.remove('reveal-pop')
    void reveal.offsetWidth
    reveal.style.setProperty('--rarity', color)
    reveal.classList.add('reveal-pop')
    if ($('crateRevealTitle')) $('crateRevealTitle').textContent = reward.title
    if ($('crateRevealDetail')) $('crateRevealDetail').textContent = reward.detail
  }

  renderSquadPanel() {
    const squad = this.squad
    if (!squad) return
    const formation = FORMATIONS[squad.formation] || FORMATIONS['4-3-3']
    const nameInput = $('squadNameInput')
    if (nameInput && document.activeElement !== nameInput) nameInput.value = squad.teamName || 'MY CLUB'
    const rating = squadRating(squad)
    if ($('squadRating')) $('squadRating').textContent = rating
    const slots = $('squadSlots')
    if (slots) {
      const lineup = squadLineup(squad)
      slots.innerHTML = formation.slots.map((slot, index) => {
        const player = lineup[index]
        const effective = player ? effectiveOverall(player, slot) : 0
        const out = player && positionPenalty(player, slot) > 0
        return `
          <button class="squad-slot ${this.selectedSlot === index ? 'selected' : ''} ${out ? 'out-of-position' : ''}" data-slot="${index}" type="button">
            <span class="slot-role">${slot.positions?.join('/') || slot.role}</span>
            <strong>${player ? player.name : 'EMPTY'}</strong>
            <small>${player ? `${player.position} · ${effective} OVR${out ? ' · OUT OF POSITION' : ''}` : 'Pick a player'}</small>
          </button>
        `
      }).join('')
    }
    const formations = $('squadFormations')
    if (formations) {
      formations.innerHTML = Object.entries(FORMATIONS).map(([id, entry]) => `
        <button class="formation-button ${squad.formation === id ? 'active' : ''}" data-squad-formation="${id}" type="button">
          <strong>${id}</strong>${entry.shape}
        </button>
      `).join('')
    }
    const kits = $('kitPicker')
    if (kits) {
      kits.innerHTML = KIT_PALETTES.map((kit) => `
        <button class="kit-swatch ${squad.kit === kit.id ? 'active' : ''}" data-kit="${kit.id}" type="button"
          style="--c1:${kit.primary};--c2:${kit.secondary}" aria-label="Kit ${kit.id}"></button>
      `).join('')
    }
    const pool = $('playerPool')
    if (pool) {
      const unlocked = PLAYER_POOL.filter((player) => (squad.unlocked || []).includes(player.id))
      const formation = FORMATIONS[squad.formation] || FORMATIONS['4-3-3']
      const slot = formation.slots[Math.min(this.selectedSlot, formation.slots.length - 1)]
      pool.innerHTML = unlocked.map((player) => {
        const penalty = positionPenalty(player, slot)
        const effective = effectiveOverall(player, slot)
        return `
          <button class="pool-player" data-pool-player="${player.id}" type="button" style="--rarity:${RARITIES[player.rarity]?.color || '#9fb4c7'}">
            <span class="pool-ovr">${effective}</span>
            <span class="pool-name">${player.name}</span>
            <span class="pool-pos">${player.position}${penalty ? ` · -${penalty}` : ''}</span>
            <span class="pool-attrs">PAC ${player.attributes.pac} · SHO ${player.attributes.sho} · PAS ${player.attributes.pas} · DRI ${player.attributes.dri} · DEF ${player.attributes.def} · PHY ${player.attributes.phy}</span>
          </button>
        `
      }).join('')
    }
  }

  renderStatsPanel() {
    const select = $('statsClubSelect')
    if (select) {
      const options = [{ id: 'myclub', name: 'MY CLUB' }, ...TEAMS.map((team) => ({ id: team.id, name: team.name }))]
      if (!options.some((option) => option.id === this.statsClubId)) this.statsClubId = 'aurora'
      select.innerHTML = options.map((option) => `
        <option value="${option.id}" ${option.id === this.statsClubId ? 'selected' : ''}>${option.name}</option>
      `).join('')
    }
    const table = $('statTable')
    if (!table) return
    const stats = this.profile.playerStats || {}
    let rows = []
    let title = ''
    if (this.statsClubId === 'myclub') {
      title = 'MY CLUB'
      rows = squadLineup(this.squad || {}).map((player) => ({
        key: `myclub-${player.id}`,
        name: player.name,
        position: player.position,
        attributes: player.attributes,
        overall: player.overall
      }))
    } else {
      const team = getTeam(this.statsClubId)
      title = team.name
      const roster = createRoster(team, 11)
      const formation = FORMATIONS[team.formation] || FORMATIONS['4-3-3']
      rows = roster.map((profile, index) => {
        const slot = formation.slots[index]
        const attributes = playerAttributes(profile, slot?.role || 'MF', index)
        return {
          key: `${team.id}-${index}`,
          name: profile.name,
          position: slot?.positions?.[0] || slot?.role || 'MF',
          attributes,
          overall: attributes.overall
        }
      })
    }
    table.innerHTML = `
      <div class="stat-table-head">
        <span>PLAYER</span><span>POS</span><span>OVR</span><span>PAC</span><span>SHO</span><span>PAS</span><span>DRI</span><span>DEF</span><span>PHY</span><span>APPS</span><span>G</span><span>A</span>
      </div>
      ${rows.map((row) => {
        const entry = stats[row.key] || { apps: 0, goals: 0, assists: 0 }
        return `
          <div class="stat-table-row">
            <span class="row-name">${row.name}</span>
            <span>${row.position}</span>
            <span class="row-ovr">${row.overall}</span>
            <span>${row.attributes.pac}</span>
            <span>${row.attributes.sho}</span>
            <span>${row.attributes.pas}</span>
            <span>${row.attributes.dri}</span>
            <span>${row.attributes.def}</span>
            <span>${row.attributes.phy}</span>
            <span>${entry.apps}</span>
            <span>${entry.goals}</span>
            <span>${entry.assists}</span>
          </div>
        `
      }).join('')}
      <p class="career-note">Season stats for ${title}. Attributes are generated per player and improve with attribute boosts from crates.</p>
    `
  }

  hideHalftime() {
    $('halftimeScreen').classList.remove('active')
  }

  showResults(payload) {
    const { snapshot, tournamentResult, practice } = payload
    if (!snapshot) return
    this.lastSnapshot = snapshot
    const home = snapshot.homeTeam
    const away = snapshot.awayTeam
    this.closePause()
    this.hideHalftime()
    this.hideMatchIntro()
    $('settingsScreen')?.classList.remove('active')
    $('helpScreen')?.classList.remove('active')
    $('goalOverlay').classList.remove('show')
    $('resultsHomeCrest').textContent = home.short
    $('resultsHomeCrest').style.cssText = crestStyle(home)
    $('resultsAwayCrest').textContent = away.short
    $('resultsAwayCrest').style.cssText = crestStyle(away)
    $('resultsHomeName').textContent = home.name.toUpperCase()
    $('resultsAwayName').textContent = away.name.toUpperCase()
    $('resultsScore').textContent = `${snapshot.score[0]} — ${snapshot.score[1]}`
    const draw = snapshot.score[0] === snapshot.score[1]
    const local = snapshot.humanSecond
    let headline = 'MATCH RESULT'
    let verdict = 'A hard-fought night under the lights.'
    if (payload.mode === 'tournament' && tournamentResult) {
      if (tournamentResult.champion) {
        headline = 'AURORA CUP CHAMPIONS'
        verdict = `${home.name} lift the trophy after an unforgettable knockout run.`
      } else if (tournamentResult.eliminated) {
        headline = 'CUP RUN ENDED'
        verdict = `${away.name} advance. ${home.name} will regroup and return.`
      } else {
        headline = 'THROUGH TO THE NEXT ROUND'
        verdict = `${home.name} keep the Aurora Cup dream alive.`
      }
      if (tournamentResult.shootout) {
        const homePens = tournamentResult.shootout.home
        const awayPens = tournamentResult.shootout.away
        verdict += ` Penalties: ${homePens}—${awayPens}.`
      }
    } else if (local) {
      if (draw) {
        headline = 'HONOURS EVEN'
        verdict = 'An end-to-end local derby finishes level.'
      } else if (snapshot.score[0] > snapshot.score[1]) {
        headline = 'PLAYER 1 WINS'
        verdict = 'Player 2 will want the rematch.'
      } else {
        headline = 'PLAYER 2 WINS'
        verdict = 'A statement performance from the away side.'
      }
    } else if (draw) {
      headline = 'HONOURS EVEN'
      verdict = 'A point apiece. The next one is already on your mind.'
    } else if (snapshot.score[0] > snapshot.score[1]) {
      headline = 'VICTORY'
      verdict = `${home.name} take the night. The crowd loved it.`
    } else {
      headline = 'DEFEAT'
      verdict = `${away.name} take the points. Dust off and go again.`
    }
    if (practice) {
      headline = 'SESSION COMPLETE'
      verdict = `Practice score: ${snapshot.practicePoints}. Keep finding the target rings.`
    }
    $('resultsEyebrow').textContent = payload.mode === 'tournament' ? 'AURORA CUP' : practice ? 'TRAINING' : 'FULL TIME'
    $('resultsHeadline').textContent = headline
    $('resultsVerdict').textContent = verdict
    const scorerList = $('resultsScorers')
    if (scorerList) {
      scorerList.innerHTML = snapshot.scorers?.length
        ? snapshot.scorers.map((scorer) => `<li><span>${scorer.name}</span><em>${getTeam(scorer.team === 0 ? home.id : away.id).short} ${scorer.minute}'</em></li>`).join('')
        : '<li><span>No goals recorded.</span><em>—</em></li>'
    }
    $('resultsStats').innerHTML = statsMarkup(snapshot.stats, true)
    const rewardsBox = $('resultsRewards')
    if (rewardsBox) {
      const rewards = payload.rewards
      if (rewards && (rewards.xp || rewards.coins || rewards.keys)) {
        const progress = rankProgress(this.profile)
        rewardsBox.innerHTML = `
          <span class="reward-pill xp">+${rewards.xp} XP</span>
          <span class="reward-pill coins">+${rewards.coins} COINS</span>
          ${rewards.keys ? `<span class="reward-pill keys">+${rewards.keys} KEY</span>` : ''}
          <span class="reward-pill rank" style="--rank:${progress.division.color}">${progress.division.name} · LV ${progress.level}</span>
          ${rewards.levelUp ? `<span class="reward-pill level">LEVEL UP! +${rewards.levelUp} REWARD</span>` : ''}
        `
      } else {
        rewardsBox.innerHTML = ''
      }
    }
    const cupButton = $('tournamentContinueButton')
    if (cupButton) {
      cupButton.style.display = payload.canContinueCup ? '' : 'none'
      cupButton.textContent = payload.cupButtonLabel || 'CONTINUE CUP'
    }
    const rematch = $('rematchButton')
    if (rematch) rematch.style.display = payload.allowRematch === false ? 'none' : ''
    this.setBaseScreen('resultsScreen')
    this.hideHud()
    document.body.classList.remove('in-match', 'practice', 'local-two')
  }

  closeResults() {
    $('resultsScreen').classList.remove('active')
  }

  showRotate() {
    $('rotateNotice').classList.add('active')
  }

  showFatal() {
    this.setBaseScreen('fatalError')
  }
}
