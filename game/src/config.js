// Every tuning number and colour in one place. The playfield is a fixed
// 1280x720 logical area; the renderer scales it to the window, so no rule
// below depends on the screen size. The museum floor is a tile grid; the
// HUD lives in the strip above it and the hint line below it.

export const VIEW = { width: 1280, height: 720 };

export const TILE = 64;
export const HUD_H = 104;
export const FOOTER_H = 64;

export const STEP = 1 / 60;

export const PLAYER = {
  radius: 14,
  walkSpeed: 175,
  sneakSpeed: 96,
  // Suspicion grows slower while sneaking at a cone's edge.
  sneakSpotFactor: 0.7,
};

export const GUARD = {
  radius: 15,
  // Suspicion 0..1. Above this a guard walks to the last seen spot.
  suspiciousAt: 0.35,
  // At 1 the guard chases the player.
  chaseAt: 1.0,
  chaseSpeed: 162,
  returnSpeed: 90,
  // Seconds after losing sight before a chasing guard gives up.
  giveUpAfter: 2.2,
  // Seconds of patrol pause at each waypoint.
  waypointPause: 0.9,
  stepInterval: 0.42,
};

export const VISION = {
  // How fast suspicion rises while the player is inside a cone (per second).
  gainPerSecond: 1.25,
  // How fast suspicion drains while unseen (per second).
  drainPerSecond: 0.55,
  // Multiplier on suspicion gain while the player stands in a shadow zone.
  shadowFactor: 0.5,
};

export const SCORE = {
  relic: 500,
  levelTimePar: [75, 90, 110],
  timeBonusPerSecond: 10,
  noAlarmBonus: 200,
};

export const PALETTE = {
  backdrop: '#0d1017',
  floorA: '#2b3040',
  floorB: '#262b38',
  floorLine: '#20242f',
  wall: '#12151d',
  wallTop: '#2e3547',
  cover: '#6b4a2f',
  coverTop: '#8a6242',
  caseGlass: '#3a5a6b',
  caseFrame: '#22303c',
  shadowZone: 'rgba(8, 12, 28, 0.55)',
  lampLight: 'rgba(255, 214, 140, 0.16)',
  player: '#4fd1c5',
  playerHood: '#2f8f86',
  guard: '#5a6b8a',
  guardHelmet: '#8b93a3',
  coneCalm: 'rgba(255, 200, 60, 0.22)',
  coneWary: 'rgba(255, 170, 40, 0.32)',
  coneAlarm: 'rgba(255, 60, 50, 0.38)',
  relic: '#f2c94c',
  exitLocked: '#e5534b',
  exitOpen: '#58d68d',
  panel: 'rgba(16, 20, 30, 0.88)',
  text: '#eef1f5',
  muted: '#8b93a3',
  alarmLow: '#58d68d',
  alarmMid: '#f2c94c',
  alarmHigh: '#e5534b',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

export const BEST_KEY = 'shadow-archive.best';
