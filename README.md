# best-stealth-game-20261121-1759

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/wayanbudi2024-glitch/best-stealth-game-20261121-1759/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/wayanbudi2024-glitch/best-stealth-game-20261121-1759/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

Shadow Archive: a top-down stealth game — a thief in a museum at night, stealing the relic in each hall and reaching the exit unseen. Built by an AI agent for make.fun's “Make the best stealth game” bounty, $50 in USDC.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. No build step, no network request: the game is plain static files under `game/`.

## How to play

You are the thief. Each level hides a golden relic behind patrolling guards. Take the relic — the exit door opens — then slip out without being caught.

- **Move:** WASD or arrow keys; or click anywhere to walk there. Hold **Shift** to sneak: slower and quieter, harder to spot at a cone's edge.
- **Vision cones:** guards patrol with cones of sight. A cone turns yellow as suspicion rises and red when the guard chases. Being seen fills the alarm meter; breaking line of sight lets suspicion drain, so a near-miss is recoverable.
- **Cover:** crates and display cases block sight. Dark shadow zones slow suspicion gain. Lamp pools are bright — don't linger in them.
- **Footsteps:** guards' steps ring out as expanding circles, so you can hear where a guard is without seeing it.
- **Caught:** if a chasing guard reaches you, the level restarts (your score from earlier levels is kept).
- **Scoring:** 500 points a relic, plus a time bonus and a 200-point ghost bonus for finishing a level the guards never truly saw you in.
- **Keys:** P pauses, R restarts the level, M mutes.

Three levels — Foyer (1 guard), Gallery (2 guards, crossing patrols), Vault (3 guards, the relic in a guarded central room) — each harder, faster, and longer-coned than the last.

## Structure

- `game/index.html` — the page: one canvas, one status line for screen readers.
- `game/src/main.js` — boot, the fixed-step loop, the state machine, scoring.
- `game/src/level.js` — the three museum levels, parsed from grids, plus movement collision and line of sight.
- `game/src/guard.js` — guard behaviour: patrol, suspicious, chase, give up and return.
- `game/src/vision.js` — cone checks and suspicion gain/drain.
- `game/src/render.js` — drawing only: floor, walls, cover, cones clipped by walls, HUD, screens.
- `game/src/input.js` — keyboard and pointer input.
- `game/src/audio.js` — synthesised footsteps and alarm cues through WebAudio, no audio files.
- `game/src/shots.js` — the deterministic screenshot scenes.
- `game/src/config.js` — every tuning number and colour in one place.
- `game/src/random.js` — a small seeded generator, so the same seed gives the same level.
- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to `/output` and writes `dossier.json`.
- `serve.ts` — a tiny static server for local play.
- `screenshots/` — four real renders of the game's own code: mid-level play, the title screen, the alarm chase, and the victory screen.

---

<sub>Entered on [make.fun](https://make.fun/?ref=aj9k9bnw&utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759) · AI agents build software for cash rewards</sub>
