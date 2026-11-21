// All drawing: the museum floor, walls and cover, lamp pools, vision
// cones clipped by walls, guards and the thief, the relic and exit, the
// HUD, and the start / pause / caught / victory screens. Nothing here
// changes game state.

import { TILE, VIEW, HUD_H, PALETTE, FONT } from './config.js';
import { tileAt } from './level.js';
import { guardConeColour } from './guard.js';

function coneColour(guard) {
  const kind = guardConeColour(guard);
  if (kind === 'alarm') return PALETTE.coneAlarm;
  if (kind === 'wary') return PALETTE.coneWary;
  return PALETTE.coneCalm;
}

// Cast one ray from the guard until it hits a wall/cover tile or the
// cone's length, and return the endpoint.
function rayEnd(level, x, y, angle, maxLen) {
  const step = 8;
  for (let d = step; d <= maxLen; d += step) {
    const px = x + Math.cos(angle) * d;
    const py = y + Math.sin(angle) * d;
    const col = Math.floor((px - level.originX) / TILE);
    const row = Math.floor((py - level.originY) / TILE);
    const t = tileAt(level, col, row);
    if (t === '#' || t === 'C') {
      return { x: px, y: py };
    }
  }
  return { x: x + Math.cos(angle) * maxLen, y: y + Math.sin(angle) * maxLen };
}

function drawCone(ctx, level, guard) {
  const halfFov = (guard.fovDeg * Math.PI) / 360;
  const steps = 24;
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  for (let i = 0; i <= steps; i++) {
    const a = guard.facing - halfFov + (2 * halfFov * i) / steps;
    const end = rayEnd(level, guard.x, guard.y, a, guard.coneLength);
    ctx.lineTo(end.x, end.y);
  }
  ctx.closePath();
  ctx.fillStyle = coneColour(guard);
  ctx.fill();
  // Rim of the cone, so its edge reads even on a dark floor.
  ctx.strokeStyle = 'rgba(255, 220, 120, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawFloor(ctx, level, time) {
  for (let row = 0; row < level.rows; row++) {
    for (let col = 0; col < level.cols; col++) {
      const x = level.originX + col * TILE;
      const y = level.originY + row * TILE;
      const t = level.tiles[row][col];
      if (t === '#') continue;
      ctx.fillStyle = (col + row) % 2 === 0 ? PALETTE.floorA : PALETTE.floorB;
      ctx.fillRect(x, y, TILE, TILE);
      ctx.strokeStyle = PALETTE.floorLine;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, TILE, TILE);
      if (t === 'S') {
        ctx.fillStyle = PALETTE.shadowZone;
        ctx.fillRect(x, y, TILE, TILE);
      }
    }
  }
  // Pools of lamplight on the marble.
  for (const lamp of level.lamps) {
    const grad = ctx.createRadialGradient(lamp.x, lamp.y, 8, lamp.x, lamp.y, 110);
    grad.addColorStop(0, PALETTE.lampLight);
    grad.addColorStop(1, 'rgba(255, 214, 140, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(lamp.x, lamp.y, 110, 0, Math.PI * 2);
    ctx.fill();
    // The lamp itself: a small wall sconce.
    ctx.fillStyle = '#f2c94c';
    ctx.beginPath();
    ctx.arc(lamp.x, lamp.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawWallsAndCover(ctx, level) {
  for (let row = 0; row < level.rows; row++) {
    for (let col = 0; col < level.cols; col++) {
      const t = level.tiles[row][col];
      const x = level.originX + col * TILE;
      const y = level.originY + row * TILE;
      if (t === '#') {
        ctx.fillStyle = PALETTE.wall;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = PALETTE.wallTop;
        ctx.fillRect(x, y, TILE, 5);
      } else if (t === 'C') {
        // A crate: wooden box with a lid line and a darker base.
        ctx.fillStyle = PALETTE.cover;
        ctx.fillRect(x + 6, y + 6, TILE - 12, TILE - 12);
        ctx.fillStyle = PALETTE.coverTop;
        ctx.fillRect(x + 6, y + 6, TILE - 12, 8);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 6, y + 6, TILE - 12, TILE - 12);
        ctx.beginPath();
        ctx.moveTo(x + 6, y + TILE / 2);
        ctx.lineTo(x + TILE - 6, y + TILE / 2);
        ctx.stroke();
      }
    }
  }
}

function drawRelicAndExit(ctx, game, time) {
  const { level } = game;
  if (!game.relicTaken) {
    const pulse = 0.5 + 0.3 * Math.sin(time * 3);
    const grad = ctx.createRadialGradient(game.level.relic.x, game.level.relic.y, 4, game.level.relic.x, game.level.relic.y, 46);
    grad.addColorStop(0, `rgba(242, 201, 76, ${0.45 * pulse + 0.2})`);
    grad.addColorStop(1, 'rgba(242, 201, 76, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(game.level.relic.x, game.level.relic.y, 46, 0, Math.PI * 2);
    ctx.fill();
    // Pedestal + golden relic diamond.
    ctx.fillStyle = '#4a4238';
    ctx.fillRect(game.level.relic.x - 14, game.level.relic.y - 10, 28, 24);
    ctx.fillStyle = PALETTE.relic;
    ctx.beginPath();
    ctx.moveTo(game.level.relic.x, game.level.relic.y - 16);
    ctx.lineTo(game.level.relic.x + 10, game.level.relic.y - 2);
    ctx.lineTo(game.level.relic.x, game.level.relic.y + 12);
    ctx.lineTo(game.level.relic.x - 10, game.level.relic.y - 2);
    ctx.closePath();
    ctx.fill();
  }
  // Exit door: locked red until the relic is taken, then open green.
  const ex = game.level.exit;
  ctx.fillStyle = game.exitOpen ? PALETTE.exitOpen : PALETTE.exitLocked;
  ctx.fillRect(ex.x - 22, ex.y - 22, 44, 44);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(ex.x - 22, ex.y - 22, 44, 10);
  ctx.fillStyle = '#0d1017';
  ctx.font = `bold 15px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(game.exitOpen ? 'EXIT' : 'LOCK', ex.x, ex.y + 2);
}

function drawGuard(ctx, guard) {
  // Footstep rings first, under the body.
  for (const ring of guard.rings) {
    ctx.strokeStyle = `rgba(180, 200, 255, ${ring.alpha})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Body: navy uniform, helmet, and a facing tick.
  ctx.fillStyle = PALETTE.guard;
  ctx.beginPath();
  ctx.arc(guard.x, guard.y, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.guardHelmet;
  ctx.beginPath();
  ctx.arc(guard.x, guard.y - 3, 9, Math.PI, 0);
  ctx.fill();
  ctx.strokeStyle = '#eef1f5';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  ctx.lineTo(guard.x + Math.cos(guard.facing) * 20, guard.y + Math.sin(guard.facing) * 20);
  ctx.stroke();
  // Suspicion mark above the head.
  if (guard.suspicion > 0.05) {
    const mark = guard.suspicion >= 1 ? '!' : guard.suspicion >= 0.35 ? '?' : '·';
    ctx.fillStyle = guard.suspicion >= 1 ? '#ff5a4a' : '#ffd23c';
    ctx.font = `bold ${guard.suspicion >= 1 ? 24 : 20}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(mark, guard.x, guard.y - 28);
  }
}

function drawPlayer(ctx, player) {
  const r = player.sneaking ? 12 : 14;
  // Soft shadow under the thief.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(player.x, player.y + r - 2, r, r * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = player.sneaking ? PALETTE.playerHood : PALETTE.player;
  ctx.beginPath();
  ctx.arc(player.x, player.y, r, 0, Math.PI * 2);
  ctx.fill();
  // Hood point in the facing direction.
  ctx.fillStyle = PALETTE.playerHood;
  ctx.beginPath();
  ctx.moveTo(player.x + Math.cos(player.facing) * (r + 8), player.y + Math.sin(player.facing) * (r + 8));
  ctx.lineTo(player.x + Math.cos(player.facing + 2.4) * r * 0.7, player.y + Math.sin(player.facing + 2.4) * r * 0.7);
  ctx.lineTo(player.x + Math.cos(player.facing - 2.4) * r * 0.7, player.y + Math.sin(player.facing - 2.4) * r * 0.7);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#0d1017';
  ctx.beginPath();
  ctx.arc(player.x + Math.cos(player.facing) * 4, player.y + Math.sin(player.facing) * 4, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawHud(ctx, game) {
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(0, 0, VIEW.width, HUD_H - 8);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 26px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`SHADOW ARCHIVE — ${game.level.name}`, 24, 30);
  ctx.font = `18px ${FONT}`;
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText(`Level ${game.levelIndex + 1} / 3`, 24, 62);
  // Alarm meter.
  const meterX = 420;
  const meterW = 300;
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `bold 16px ${FONT}`;
  ctx.fillText('ALARM', meterX, 30);
  ctx.fillStyle = '#1a1f2b';
  ctx.fillRect(meterX, 44, meterW, 18);
  const alarmColour = game.alarm >= 0.85 ? PALETTE.alarmHigh : game.alarm >= 0.4 ? PALETTE.alarmMid : PALETTE.alarmLow;
  ctx.fillStyle = alarmColour;
  ctx.fillRect(meterX, 44, meterW * Math.max(0.02, game.alarm), 18);
  ctx.strokeStyle = 'rgba(238, 241, 245, 0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(meterX + 0.5, 44.5, meterW, 18);
  // Relic, timer, score.
  ctx.fillStyle = PALETTE.text;
  ctx.font = `18px ${FONT}`;
  ctx.fillText(game.relicTaken ? '◆ Relic: TAKEN' : '◇ Relic: find it', 780, 30);
  ctx.fillText(`Exit: ${game.exitOpen ? 'OPEN' : 'locked'}`, 780, 62);
  ctx.textAlign = 'right';
  ctx.fillText(`Time ${formatTime(game.levelTime)}`, VIEW.width - 24, 30);
  ctx.fillText(`Score ${game.score}`, VIEW.width - 24, 62);
  ctx.textAlign = 'left';
}

function formatTime(t) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function drawFooter(ctx, game) {
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `16px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const hint = game.state === 'playing'
    ? 'WASD / arrows move · Shift sneak · Click to move · P pause · R restart level · M mute'
    : 'Press Enter to continue';
  ctx.fillText(hint, VIEW.width / 2, VIEW.height - 28);
  ctx.textAlign = 'left';
  if (game.message) {
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 20px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(game.message, VIEW.width / 2, HUD_H + 24);
    ctx.textAlign = 'left';
  }
}

function overlay(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(8, 10, 16, 0.78)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.fillStyle = accent || PALETTE.text;
  ctx.font = `bold 44px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, VIEW.width / 2, 250);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `20px ${FONT}`;
  let y = 310;
  for (const line of lines) {
    ctx.fillText(line, VIEW.width / 2, y);
    y += 32;
  }
  ctx.textAlign = 'left';
}

export function drawGame(ctx, game) {
  ctx.fillStyle = PALETTE.backdrop;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  drawFloor(ctx, game.level, game.time);
  for (const guard of game.guards) drawCone(ctx, game.level, guard);
  drawWallsAndCover(ctx, game.level);
  drawRelicAndExit(ctx, game, game.time);
  for (const guard of game.guards) drawGuard(ctx, guard);
  drawPlayer(ctx, game.player);
  drawHud(ctx, game);
  drawFooter(ctx, game);

  if (game.state === 'start') {
    overlay(ctx, 'SHADOW ARCHIVE', [
      'A thief in a museum at night. Steal the relic, reach the exit unseen.',
      'Guards patrol with vision cones — yellow means noticed, red means chase.',
      'Crates and display cases block sight. Shadow zones slow suspicion.',
      'Sneak with Shift to move quietly. Breaking line of sight lets suspicion drain.',
      '',
      'Press Enter or click to begin — Level 1: Foyer',
    ], PALETTE.relic);
  } else if (game.state === 'paused') {
    overlay(ctx, 'PAUSED', ['Press P to resume, R to restart this level.']);
  } else if (game.state === 'caught') {
    overlay(ctx, 'CAUGHT!', [
      'A guard caught you in the open.',
      `Score kept: ${game.score}  ·  Times caught: ${game.caughtCount}`,
      '',
      'Press R or Enter to try this level again.',
    ], PALETTE.alarmHigh);
  } else if (game.state === 'levelComplete') {
    overlay(ctx, 'LEVEL CLEAR', [
      `Relic secured. Time ${formatTime(game.levelTime)} — bonus ${game.lastBonus} points.`,
      game.maxAlarm < 0.5 ? 'Ghost bonus: the guards never truly saw you (+200).' : 'The guards were onto you — next time, stay in the dark.',
      '',
      'Press Enter for the next level.',
    ], PALETTE.exitOpen);
  } else if (game.state === 'victory') {
    overlay(ctx, 'THE ARCHIVE IS YOURS', [
      `Final score: ${game.score}`,
      `Total time ${formatTime(game.totalTime)}  ·  Times caught ${game.caughtCount}  ·  Alarms raised ${game.alarmsTriggered}`,
      `Best score on this browser: ${game.bestScore}`,
      '',
      'Press Enter to play again.',
    ], PALETTE.relic);
  }
}
