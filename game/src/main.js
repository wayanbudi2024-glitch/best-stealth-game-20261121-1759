// Shadow Archive — entry point. Owns the state machine (start, playing,
// paused, caught, levelComplete, victory), the fixed-step loop, scoring,
// and the debug handle the play-test drives. Rendering lives in
// render.js, guards in guard.js, vision in vision.js.

import { VIEW, STEP, PLAYER, SCORE, BEST_KEY } from './config.js';
import { buildLevel, levelCount, moveCircle, isShadowPx } from './level.js';
import { createGuard, updateGuard } from './guard.js';
import { createInput, moveVector, isSneaking } from './input.js';
import { createAudio } from './audio.js';
import { drawGame } from './render.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
canvas.width = VIEW.width;
canvas.height = VIEW.height;
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

const audio = createAudio();
const input = createInput(canvas);

const game = {
  state: 'start',
  staged: false,
  time: 0,
  levelIndex: 0,
  level: null,
  player: null,
  guards: [],
  relicTaken: false,
  exitOpen: false,
  alarm: 0,
  maxAlarm: 0,
  score: 0,
  scoreAtLevelStart: 0,
  levelTime: 0,
  totalTime: 0,
  lastBonus: 0,
  caughtCount: 0,
  alarmsTriggered: 0,
  bestScore: 0,
  message: '',
  messageTimer: 0,
  levelCompleteTimer: 0,
  playerStepTimer: 0,
};

try {
  game.bestScore = Number(localStorage.getItem(BEST_KEY) || 0) || 0;
} catch {
  game.bestScore = 0;
}

function setStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

function showMessage(text, seconds = 2.5) {
  game.message = text;
  game.messageTimer = seconds;
}

game.startLevel = function startLevel(index) {
  game.levelIndex = index;
  game.level = buildLevel(index);
  game.player = {
    x: game.level.playerStart.x,
    y: game.level.playerStart.y,
    facing: 0,
    sneaking: false,
    moving: false,
  };
  game.guards = game.level.guards.map((cfg, i) => {
    const guard = createGuard(cfg, i);
    guard.facing = Math.atan2(
      cfg.waypoints[1].y - cfg.waypoints[0].y,
      cfg.waypoints[1].x - cfg.waypoints[0].x,
    );
    return guard;
  });
  game.relicTaken = false;
  game.exitOpen = false;
  game.alarm = 0;
  game.maxAlarm = 0;
  game.levelTime = 0;
  game.scoreAtLevelStart = game.score;
  game.levelCompleteTimer = 0;
  showMessage(`Level ${index + 1}: ${game.level.name} — steal the relic, reach the exit unseen.`, 3);
  setStatus(`Level ${index + 1}, ${game.level.name}. Steal the relic, then reach the exit.`);
};

game.teleportPlayer = function teleportPlayer(x, y) {
  game.player.x = x;
  game.player.y = y;
  input.moveTarget = null;
};

function startGame() {
  game.score = 0;
  game.totalTime = 0;
  game.caughtCount = 0;
  game.alarmsTriggered = 0;
  game.startLevel(0);
  game.state = 'playing';
  audio.unlock();
  setStatus('Playing. Steal the relic, then reach the exit unseen.');
}

function restartLevel() {
  game.score = game.scoreAtLevelStart;
  game.startLevel(game.levelIndex);
  game.state = 'playing';
  setStatus('Level restarted.');
}

function nextLevel() {
  game.totalTime += game.levelTime;
  if (game.levelIndex + 1 >= levelCount()) {
    game.state = 'victory';
    if (game.score > game.bestScore) {
      game.bestScore = game.score;
      try {
        localStorage.setItem(BEST_KEY, String(game.bestScore));
      } catch {
        // Best score is a nicety, never a failure.
      }
    }
    audio.levelComplete();
    setStatus(`Victory. Final score ${game.score}.`);
  } else {
    game.startLevel(game.levelIndex + 1);
    game.state = 'playing';
  }
}

function updatePlayer(dt) {
  const player = game.player;
  const vec = moveVector(input);
  let dx = 0;
  let dy = 0;
  const sneaking = isSneaking(input);
  player.sneaking = sneaking;
  const speed = sneaking ? PLAYER.sneakSpeed : PLAYER.walkSpeed;
  if (vec.x !== 0 || vec.y !== 0) {
    const s = speed * dt;
    dx = vec.x * s;
    dy = vec.y * s;
    player.facing = Math.atan2(vec.y, vec.x);
    player.moving = true;
  } else if (input.moveTarget) {
    const tx = input.moveTarget.x;
    const ty = input.moveTarget.y;
    const dist = Math.hypot(tx - player.x, ty - player.y);
    if (dist < 6) {
      input.moveTarget = null;
      player.moving = false;
    } else {
      const s = speed * dt;
      const step = Math.min(dist, s);
      dx = ((tx - player.x) / dist) * step;
      dy = ((ty - player.y) / dist) * step;
      player.facing = Math.atan2(dy, dx);
      player.moving = true;
    }
  } else {
    player.moving = false;
  }
  if (dx !== 0 || dy !== 0) {
    moveCircle(game.level, player, PLAYER.radius, dx, dy);
    game.playerStepTimer -= dt;
    if (game.playerStepTimer <= 0) {
      game.playerStepTimer = sneaking ? 0.55 : 0.38;
      audio.playerStep(sneaking);
    }
  }
}

function update(dt) {
  game.time += dt;
  if (game.messageTimer > 0) {
    game.messageTimer -= dt;
    if (game.messageTimer <= 0) game.message = '';
  }
  if (game.state === 'levelComplete') {
    game.levelCompleteTimer -= dt;
    if (game.levelCompleteTimer <= 0) nextLevel();
    return;
  }
  if (game.state !== 'playing') return;

  game.levelTime += dt;
  updatePlayer(dt);

  let alarm = 0;
  for (const guard of game.guards) {
    const wasChasing = guard.state === 'chase';
    const result = updateGuard(game.level, guard, game.player, game.player.sneaking, dt, () => audio.guardStep());
    if (guard.state === 'chase' && !wasChasing) {
      game.alarmsTriggered += 1;
      audio.alarm();
      showMessage('Spotted! Break line of sight!');
    }
    alarm = Math.max(alarm, guard.suspicion);
    if (result === 'caught') {
      game.state = 'caught';
      game.caughtCount += 1;
      game.score = game.scoreAtLevelStart;
      audio.caught();
      setStatus('Caught. Press R or Enter to try the level again.');
      return;
    }
  }
  game.alarm = alarm;
  game.maxAlarm = Math.max(game.maxAlarm, alarm);

  // Relic pickup, then the exit opens.
  if (!game.relicTaken) {
    const d = Math.hypot(game.player.x - game.level.relic.x, game.player.y - game.level.relic.y);
    if (d < 34) {
      game.relicTaken = true;
      game.exitOpen = true;
      game.score += SCORE.relic;
      audio.pickup();
      showMessage('Relic secured — reach the EXIT!');
      setStatus('Relic taken. The exit is open.');
    }
  }

  // Reach the exit with the relic: level clear.
  if (game.exitOpen) {
    const d = Math.hypot(game.player.x - game.level.exit.x, game.player.y - game.level.exit.y);
    if (d < 38) {
      const par = SCORE.levelTimePar[game.levelIndex] || 90;
      const timeBonus = Math.max(0, Math.round(par - game.levelTime)) * SCORE.timeBonusPerSecond;
      const ghostBonus = game.maxAlarm < 0.5 ? SCORE.noAlarmBonus : 0;
      game.lastBonus = timeBonus + ghostBonus;
      game.score += game.lastBonus;
      game.state = 'levelComplete';
      game.levelCompleteTimer = 2.4;
      audio.levelComplete();
      setStatus(`Level clear. Bonus ${game.lastBonus} points.`);
    }
  }
}

input.onPause = () => {
  if (game.state === 'playing') {
    game.state = 'paused';
    setStatus('Paused.');
  } else if (game.state === 'paused') {
    game.state = 'playing';
    setStatus('Playing.');
  }
};
input.onRestart = () => {
  if (game.state === 'playing' || game.state === 'paused' || game.state === 'caught') restartLevel();
};
input.onMute = () => {
  audio.muted = !audio.muted;
  showMessage(audio.muted ? 'Sound muted.' : 'Sound on.', 1.5);
};
input.onStart = () => {
  audio.unlock();
  if (game.state === 'start') startGame();
  else if (game.state === 'levelComplete') nextLevel();
  else if (game.state === 'caught') restartLevel();
  else if (game.state === 'victory') startGame();
};

// Boot: fresh load shows the start screen over level 1. A ?shot= value
// stages one fixed scene for screenshots and freezes the simulation.
game.startLevel(0);
game.state = 'start';
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) {
  stageShot(game, shot);
}

let last = performance.now();
let acc = 0;
let shotReady = false;

function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (!game.staged) {
    acc += dt;
    let steps = 0;
    while (acc >= STEP && steps < 5) {
      update(STEP);
      acc -= STEP;
      steps += 1;
    }
    if (steps === 5) acc = 0;
  }
  drawGame(ctx, game);
  if (!shotReady) {
    shotReady = true;
    window.__shotReady = true;
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Debug handle for the headless play-test: read state, move the thief,
// and force guard suspicion without touching the game's own rules.
window.__game = game;
window.__debug = {
  state() {
    return {
      state: game.state,
      level: game.levelIndex + 1,
      levelName: game.level.name,
      alarm: game.alarm,
      maxAlarm: game.maxAlarm,
      score: game.score,
      levelTime: game.levelTime,
      relicTaken: game.relicTaken,
      exitOpen: game.exitOpen,
      player: { x: Math.round(game.player.x), y: Math.round(game.player.y) },
      guards: game.guards.map((g) => ({
        state: g.state,
        suspicion: Number(g.suspicion.toFixed(2)),
        x: Math.round(g.x),
        y: Math.round(g.y),
      })),
      caughtCount: game.caughtCount,
    };
  },
  teleport(x, y) {
    game.teleportPlayer(x, y);
  },
  setGuardSuspicion(i, v) {
    game.guards[i].suspicion = v;
  },
  setGuard(i, x, y) {
    const g = game.guards[i];
    g.x = x;
    g.y = y;
    g.state = 'patrol';
    g.lastSeen = null;
    g.seenRecently = 99;
  },
  press(code) {
    window.dispatchEvent(new KeyboardEvent('keydown', { code }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code }));
  },
};
