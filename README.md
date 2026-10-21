# NOVA ELEVEN

**THE BEAUTIFUL GAME. RE-ENERGIZED.**

NOVA ELEVEN is an original, fully playable 3D arcade football game for desktop, tablet and phone. Pick one of eight fictional clubs, play quick matches, chase the Aurora Cup in a saved knockout tournament, or sharpen your finishing in practice. Everything runs locally in the browser with Three.js and WebGL.

<!-- omgithub:readme:start -->
## 🚀 Build, play, and remix with OMGithub

**Created using [OMGithub.com](https://omgithub.com).**

[![OMGithub](https://img.shields.io/badge/OMGithub-Open%20project-orange?style=for-the-badge)](https://omgithub.com/mhmwdaslah-ux/PlayGround)
[![GitHub](https://img.shields.io/badge/GitHub-Source-181717?logo=github&style=for-the-badge)](https://github.com/mhmwdaslah-ux/PlayGround)

- 🎮 [Open the project](https://omgithub.com/mhmwdaslah-ux/PlayGround).
- ✨ [Remix this project](https://omgithub.com/?remix=mhmwdaslah-ux%2FPlayGround).
- 💻 [Explore the source](https://github.com/mhmwdaslah-ux/PlayGround).
- 🛠️ [Check build runs](https://github.com/mhmwdaslah-ux/PlayGround/actions).
- 🐛 [Report an issue](https://github.com/mhmwdaslah-ux/PlayGround/issues).
- 👤 [Explore the creator's projects](https://omgithub.com/mhmwdaslah-ux).
- 🌍 [Create with OMGithub](https://omgithub.com).
<!-- omgithub:readme:end -->

## Play

```bash
npm install
npm run dev
```

Open the printed local URL. For a production build:

```bash
npm run build
npm run preview
```

## Modes

- **Quick Match** — choose your club, opponent, match length, difficulty and solo/local 2P, then kick off.
- **Tournament** — an eight-club Aurora Cup knockout. Your progress is saved in local storage. Knockout draws are decided by a penalty shootout. You can return to the bracket after every result.
- **Practice** — a solo finishing session with glowing target rings and a persistent best score.
- **Career hub** — rank divisions, coins, crates, your own club and player statistics (see below).

## Career, money, crates and My Club

Open **CAREER** from the main menu header.

- **Rank** — every match gives XP. Levels run from Rookie to Amateur, Semi-Pro, Pro, Elite and Icon. Each new division and level pays out coins, crate keys and attribute boosts.
- **Crates** — spend coins (and a key for the Elite crate) on Street, Pro or Elite crates. Drops are coins, XP, permanent attribute boosts, new player cards and kit colours. The drop history is saved.
- **My Club** — rename the club, pick the formation, pick a kit and fill all eleven slots from your unlocked player pool. Each card has FIFA-style attributes (PAC, SHO, PAS, DRI, DEF, PHY) and an overall rating. Your club is selectable in Quick Match and plays with the players and attributes you set.
- **Player stats** — season appearances, goals and assists for every club, next to the generated attributes of each player.

## Controls

### Player 1 (classic)

| Action | Key |
| --- | --- |
| Move | `W` `A` `S` `D` |
| Sprint | `Shift` |
| Shoot / tackle | `Space` (hold to charge a shot) |
| Pass | `E` |
| Through pass | `Q` |
| Switch player | `F` |
| Slide tackle | `C` |

Movement is camera-relative: pushing left or right on the keyboard, stick or touch joystick moves your player in that direction on screen, with diagonals blending both axes. An alternate keyboard scheme (`J` / `K` / `L` / `U` / `H`) is available in Settings.

### Local Player 2

| Action | Key |
| --- | --- |
| Move | Arrow keys |
| Sprint | `Right Shift` |
| Shoot / tackle | `Enter` |
| Pass | `.` |
| Through pass | `,` |
| Switch player | `/` |
| Slide tackle | `\` |

Gamepads use the left stick plus A/B/X/Y, LB/RB, and the shoulder buttons. On phones and tablets, use the left virtual stick and the action buttons on the right; the stick has a dead zone so light thumb pressure does not pull your player off line. Matches are designed for landscape on small devices; the menu works in portrait.

Press `Escape` or `P` to pause. Pause for tactics, formations, mentality, substitutions, controls and settings. Audio, camera distance, screen shake, crowd, offside and saved data can be changed in Settings.

## Features

- Full 11-a-side match engine with two halves, kickoffs, goals, throw-ins, corners, goal kicks, free kicks, penalties, goalkeepers, saves, tackles, fouls, stamina, substitutions and offside.
- Smarter team AI: carriers drive at goal, shoot when the lane opens, pass under pressure, and team-mates run beyond the last defender. Defenders press, cover and mark from the side so a shooting lane stays open.
- Powerful shooting: shots travel at up to 40 m/s, smash through blocking defenders and keep their power, while keepers commit to a single dive and can be beaten with good placement.
- Kick-off follows the real rule: only the kicker may play the ball, the opposition holds shape outside the centre circle until the pass is made, and you have six seconds to start the move before the ball is handed to the other team.
- Role-based team AI with pressing, passing, through balls, shooting, formations and mentalities, plus off-ball spacing that keeps team-mates from crowding the ball.
- Career progression: XP, six rank divisions, level rewards, coins, crate keys and three crate types with weighted loot.
- Custom club: rename, re-kit, re-shape and staff your own eleven from unlockable player cards with FIFA-style attributes, then play with that team.
- Player statistics screen with per-player attributes, appearances, goals and assists.
- Eight fictional clubs, generated squads, team crests and a neon night-stadium built procedurally.
- FIFA style squad structure: every player has a real position (GK, LB, CB, RB, CDM, CM, CAM, LW, RW, ST) with a personal overall rating and six attributes (PAC, SHO, PAS, DRI, DEF, PHY). The pause menu shows the **TEAM SHAPE** board with the live XI on a pitch, and playing out of position costs rating.
- Position aware AI: strikers hold the shoulder of the last defender, wingers stay wide and cut in, attacking midfielders arrive late in the box, full backs overlap, defensive midfielders screen the defence and centre backs keep the line. The press order follows the roles on the pitch.
- Detailed player models with shirt numbers, kits, boots, gloves, faces and shadows, animated through idle, run, sprint, dribble, pass, shot, slide tackle, fall and recovery states. Every player has his own height, body build, skin, hairstyle, beard and boot colour, so no two players look the same. Goalkeepers use a ready stance and directional dives.
- Adaptive close-follow camera that smooths toward the ball and your player, zooms with the flow of play and keeps the action framed near both goals.
- Saved local profile, settings, My Club squad and Aurora Cup bracket.
- Responsive HUD with a compact mobile layout, touch controls, gamepad support, local 2P, pause/tactics/substitution screens, match intro, goal presentation and full-time statistics.

## Tech

- [Three.js](https://threejs.org/) for 3D rendering.
- [Vite](https://vite.dev/) for development and production builds.
- Web Audio for procedural crowd, music and sound effects.
- Local storage for persistence. No backend and no account required.

## Notes and limitations

- This is an arcade football game, not a licensed simulation. All clubs and players are original and fictional.
- There is no online multiplayer; the game is built for solo play, local 2P and AI opponents.
- Offside is implemented and can be toggled in Settings.
- Match speed is tuned for short arcade sessions rather than a full 90-minute simulation.
- The game requires WebGL. A current Chrome, Edge, Firefox or Safari is recommended.

## Verification

```bash
node --check src/main.js
node --check src/engine.js
node --check src/world.js
node --check src/input.js
npm run build
```

Browser testing has been performed in Chromium with SwiftShader CPU rendering; the renderer is software-based in this environment, not hardware GPU accelerated.
