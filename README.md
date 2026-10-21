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

An alternate keyboard scheme (`J` / `K` / `L` / `U` / `H`) is available in Settings.

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

Gamepads use the left stick plus A/B/X/Y, LB/RB, and the shoulder buttons. On phones and tablets, use the left virtual stick and the action buttons on the right. Movement is camera-relative: pushing the stick right moves your player right on screen, with an analog dead zone and smooth acceleration. Matches are designed for landscape on small devices; the menu works in portrait.

Press `Escape` or `P` to pause. Pause for tactics, formations, mentality, substitutions, controls and settings. Audio, camera distance, screen shake, crowd, offside and saved data can be changed in Settings.

## Features

- Full 11-a-side match engine with two halves, kickoffs, goals, throw-ins, corners, goal kicks, free kicks, penalties, goalkeepers, saves, tackles, fouls, stamina, substitutions and offside.
- Role-based team AI with pressing, passing, through balls, shooting, formations and mentalities.
- Eight fictional clubs, generated squads, team crests and a neon night-stadium built procedurally.
- Saved local profile, settings and Aurora Cup bracket.
- Close, low, adaptive follow camera with camera-relative movement, plus detailed player models with numbered kits and run, kick, tackle, stumble and goalkeeper animations.
- Responsive HUD, touch controls, gamepad support, local 2P, pause/tactics/substitution screens, match intro, goal presentation and full-time statistics.

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
npm run build
```

Browser testing has been performed in Chromium with SwiftShader CPU rendering; the renderer is software-based in this environment, not hardware GPU accelerated.
