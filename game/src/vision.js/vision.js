// Guard vision: is the player inside a guard's cone, with a clear line
// of sight? A cone's angle and length come from the guard's config; a
// shadow zone or sneaking at the cone's edge slows suspicion gain, it
// never hides the player outright.

import { VISION, PLAYER } from './config.js';
import { hasLineOfSight, isShadowPx } from './level.js';

export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// Returns { seen, distance, edge } — edge is how close to the cone's rim
// the player is (0 centre, 1 rim), used to soften suspicion at the edge.
export function coneSeesPlayer(level, guard, player) {
  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  const distance = Math.hypot(dx, dy);
  if (distance > guard.coneLength) return { seen: false, distance, edge: 1 };
  const toPlayer = Math.atan2(dy, dx);
  const halfFov = (guard.fovDeg * Math.PI) / 360;
  const off = Math.abs(angleDiff(toPlayer, guard.facing));
  if (off > halfFov) return { seen: false, distance, edge: 1 };
  if (!hasLineOfSight(level, guard.x, guard.y, player.x, player.y)) {
    return { seen: false, distance, edge: 1 };
  }
  return { seen: true, distance, edge: off / halfFov };
}

// Suspicion change for one guard over dt seconds. Returns the new value.
export function updateSuspicion(level, guard, player, sneaking, dt) {
  const seen = coneSeesPlayer(level, guard, player);
  if (seen.seen) {
    const closeness = 1.15 - (seen.distance / guard.coneLength) * 0.6;
    let rate = VISION.gainPerSecond * Math.max(0.3, closeness);
    if (sneaking) rate *= PLAYER.sneakSpotFactor;
    if (isShadowPx(level, player.x, player.y)) rate *= VISION.shadowFactor;
    if (seen.edge > 0.75) rate *= 0.7;
    guard.suspicion = Math.min(1, guard.suspicion + rate * dt);
    guard.lastSeen = { x: player.x, y: player.y };
    guard.seenRecently = 0;
  } else {
    guard.suspicion = Math.max(0, guard.suspicion - VISION.drainPerSecond * dt);
    guard.seenRecently += dt;
  }
  return guard.suspicion;
}
