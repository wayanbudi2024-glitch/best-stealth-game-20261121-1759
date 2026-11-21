// Screenshot staging: put the game into a fixed, readable scene for each
// ?shot= value and freeze the simulation, so the screenshot is a real
// render of the game's own code at a deterministic moment. The play shot
// is the cover: the whole level must read at a glance.

import { TILE } from './config.js';

function tileCentre(game, col, row) {
  return {
    x: game.level.originX + (col + 0.5) * TILE,
    y: game.level.originY + (row + 0.5) * TILE,
  };
}

// Stage one named scene. The caller freezes updates afterwards.
export function stageShot(game, name) {
  game.staged = true;
  game.time = 1.0;
  if (name === 'start') {
    game.startLevel(0);
    game.state = 'start';
    game.time = 1.0;
  } else if (name === 'play') {
    game.startLevel(0);
    game.state = 'playing';
    // Thief in the shadow zone, a guard mid-patrol with its cone sweeping
    // the hall, crates for cover, the relic and the exit all in frame.
    const shadow = tileCentre(game, 3, 2);
    game.teleportPlayer(shadow.x, shadow.y);
    game.player.facing = 0.6;
    game.player.sneaking = true;
    const guard = game.guards[0];
    const post = tileCentre(game, 9, 3);
    guard.x = post.x;
    guard.y = post.y;
    guard.facing = Math.atan2(shadow.y - post.y, shadow.x - post.x);
    guard.suspicion = 0.15;
    guard.state = 'patrol';
    game.time = 1.0;
  } else if (name === 'alarm') {
    game.startLevel(1);
    game.state = 'playing';
    // Spotted in the Gallery: the guard is on the chase, cone red, the
    // alarm meter nearly full, the thief caught in the open.
    const playerAt = tileCentre(game, 12, 3);
    game.teleportPlayer(playerAt.x, playerAt.y);
    game.player.facing = Math.PI;
    const guard = game.guards[1];
    const post = tileCentre(game, 14, 3);
    guard.x = post.x;
    guard.y = post.y;
    guard.facing = Math.PI;
    guard.suspicion = 1.0;
    guard.state = 'chase';
    game.alarm = 1.0;
    game.maxAlarm = 1.0;
    game.alarmsTriggered = 1;
    game.message = 'Spotted! Break line of sight!';
    game.time = 1.0;
  } else if (name === 'end') {
    game.startLevel(2);
    game.state = 'victory';
    game.score = 2450;
    game.totalTime = 245;
    game.levelTime = 82;
    game.caughtCount = 1;
    game.alarmsTriggered = 2;
    game.bestScore = 2450;
    game.time = 1.0;
  } else {
    game.startLevel(0);
    game.state = 'start';
  }
}
