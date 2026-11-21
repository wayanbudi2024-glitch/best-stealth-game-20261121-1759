// Guard behaviour: patrol waypoints, get suspicious, chase, give up and
// return. A guard never teleports and never sees through walls — its cone
// is the only sense it has, so a patient player can always recover.

import { GUARD, VISION } from './config.js';
import { moveCircle } from './level.js';
import { angleDiff, updateSuspicion } from './vision.js';

export function createGuard(cfg, index) {
  return {
    index,
    x: cfg.spawn.x,
    y: cfg.spawn.y,
    facing: 0,
    waypoints: cfg.waypoints,
    waypointIndex: 1 % cfg.waypoints.length,
    waypointDir: 1,
    speed: cfg.speed,
    coneLength: cfg.coneLength,
    fovDeg: cfg.fovDeg,
    suspicion: 0,
    state: 'patrol',
    pauseTimer: 0,
    lastSeen: null,
    seenRecently: 99,
    chaseTimer: 0,
    stepTimer: 0,
    rings: [],
  };
}

function faceToward(guard, targetAngle, dt) {
  const diff = angleDiff(targetAngle, guard.facing);
  const turn = Math.max(-3.2 * dt, Math.min(3.2 * dt, diff));
  guard.facing += turn;
}

function walkToward(level, guard, tx, ty, speed, dt) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 2) return true;
  const step = Math.min(dist, speed * dt);
  const pos = { x: guard.x, y: guard.y };
  moveCircle(level, pos, 15, (dx / dist) * step, (dy / dist) * step);
  guard.x = pos.x;
  guard.y = pos.y;
  faceToward(guard, Math.atan2(dy, dx), dt);
  return dist - step < 2;
}

// One guard update. Returns 'caught' when the guard reaches the player.
export function updateGuard(level, guard, player, sneaking, dt, onFootstep) {
  const suspicion = updateSuspicion(level, guard, player, sneaking, dt);

  if (suspicion >= GUARD.chaseAt) {
    guard.state = 'chase';
    guard.chaseTimer = 0;
  } else if (guard.state === 'chase') {
    guard.chaseTimer += dt;
    if (guard.seenRecently > GUARD.giveUpAfter) guard.state = 'return';
  } else if (suspicion >= GUARD.suspiciousAt) {
    guard.state = 'suspicious';
  } else if (guard.state !== 'patrol' && guard.state !== 'return') {
    guard.state = 'patrol';
  }

  if (guard.state === 'patrol') {
    if (guard.pauseTimer > 0) {
      guard.pauseTimer -= dt;
    } else {
      const target = guard.waypoints[guard.waypointIndex];
      const arrived = walkToward(level, guard, target.x, target.y, guard.speed, dt);
      if (arrived) {
        guard.pauseTimer = GUARD.waypointPause;
        guard.waypointIndex += guard.waypointDir;
        if (guard.waypointIndex >= guard.waypoints.length) {
          guard.waypointIndex = guard.waypoints.length - 2;
          guard.waypointDir = -1;
        } else if (guard.waypointIndex < 0) {
          guard.waypointIndex = 1;
          guard.waypointDir = 1;
        }
      }
    }
  } else if (guard.state === 'suspicious' && guard.lastSeen) {
    walkToward(level, guard, guard.lastSeen.x, guard.lastSeen.y, guard.speed * 0.7, dt);
  } else if (guard.state === 'chase') {
    walkToward(level, guard, player.x, player.y, GUARD.chaseSpeed, dt);
    if (Math.hypot(player.x - guard.x, player.y - guard.y) < 30) return 'caught';
  } else if (guard.state === 'return') {
    const home = guard.waypoints[0];
    const arrived = walkToward(level, guard, home.x, home.y, GUARD.returnSpeed, dt);
    if (arrived) {
      guard.state = 'patrol';
      guard.waypointIndex = 1 % guard.waypoints.length;
      guard.waypointDir = 1;
    }
  }

  // Footstep cue: a step every interval while moving, as a visible ring
  // and a sound the audio module plays. The ring is how the player hears
  // where a guard is without seeing it.
  const moving = guard.state !== 'patrol' || guard.pauseTimer <= 0;
  guard.stepTimer -= dt;
  if (moving && guard.stepTimer <= 0) {
    guard.stepTimer = GUARD.stepInterval * (guard.state === 'chase' ? 0.75 : 1);
    guard.rings.push({ x: guard.x, y: guard.y, r: 6, alpha: 0.55 });
    if (onFootstep) onFootstep(guard);
  }
  for (const ring of guard.rings) {
    ring.r += 90 * dt;
    ring.alpha -= 0.55 * dt;
  }
  guard.rings = guard.rings.filter((ring) => ring.alpha > 0);
  return null;
}

export function guardConeColour(guard) {
  if (guard.suspicion >= GUARD.chaseAt) return 'alarm';
  if (guard.suspicion >= GUARD.suspiciousAt) return 'wary';
  return 'calm';
}
