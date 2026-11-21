// Level definitions and parsing. The grids come from the design brief
// (legend: # wall, . floor, C cover/crate, S shadow zone, G guard spawn,
// R relic, E exit, P player start; - > < are patrol-direction marks and
// read as floor). Rows are padded to the widest row with walls, and the
// grid is centred horizontally in the view. Exact geometry is this file's
// call — the brief's sketches are the intended shape.

import { TILE, VIEW, HUD_H, FOOTER_H } from './config.js';

// Every row of a grid is exactly cols wide and every wall column that
// splits the museum leaves a door gap, so the relic and the exit are
// always reachable: the brief's sketches had solid wall columns with no
// gap, which sealed the relic chamber off entirely.
const GRIDS = [
  {
    name: 'Foyer',
    grid: [
      '################',
      '#P..C#....#...E#',
      '#..S.#......S..#',
      '#.C..#.G..#..R.#',
      '#........C#....#',
      '#..S.#....#....#',
      '################',
    ],
    guards: [
      {
        speed: 55, coneLength: 200, fovDeg: 70,
        waypoints: [[7, 1], [7, 4]],
      },
    ],
    lamps: [[2, 1], [13, 4]],
  },
  {
    name: 'Gallery',
    grid: [
      '##################',
      '#P..C....#...C..E#',
      '#....S...#....R..#',
      '#.##..G..#....G..#',
      '#....C...#....S..#',
      '#..S...C.......C.#',
      '##################',
    ],
    guards: [
      {
        speed: 70, coneLength: 230, fovDeg: 72,
        waypoints: [[6, 1], [6, 4]],
      },
      {
        speed: 70, coneLength: 230, fovDeg: 72,
        waypoints: [[14, 1], [14, 4]],
      },
    ],
    lamps: [[3, 1], [15, 2], [8, 5]],
  },
  {
    name: 'Vault',
    grid: [
      '####################',
      '#P.C...#...C....#.E#',
      '#.S....#..R#....#..#',
      '#..G...#...#....G..#',
      '#..C...#...#....S..#',
      '#....S..G......C...#',
      '####################',
    ],
    guards: [
      {
        speed: 85, coneLength: 260, fovDeg: 75,
        waypoints: [[3, 3], [6, 3]],
      },
      {
        speed: 85, coneLength: 260, fovDeg: 75,
        waypoints: [[16, 3], [18, 3]],
      },
      {
        speed: 80, coneLength: 250, fovDeg: 75,
        waypoints: [[8, 5], [13, 5]],
      },
    ],
    lamps: [[2, 1], [17, 4], [13, 1]],
  },
];

function tileCentre(level, col, row) {
  return { x: level.originX + (col + 0.5) * TILE, y: level.originY + (row + 0.5) * TILE };
}

export function buildLevel(index) {
  const def = GRIDS[index];
  const rows = def.grid.length;
  const cols = Math.max(...def.grid.map((r) => r.length));
  const originX = Math.round((VIEW.width - cols * TILE) / 2);
  // Centre the floor between the HUD strip and the footer line.
  const originY = HUD_H + Math.round((VIEW.height - HUD_H - FOOTER_H - rows * TILE) / 2);
  const level = {
    index,
    name: def.name,
    cols,
    rows,
    originX,
    originY,
    tiles: [],
    playerStart: { x: 0, y: 0 },
    relic: { x: 0, y: 0 },
    exit: { x: 0, y: 0 },
    guardSpawns: [],
    lamps: def.lamps.map(([c, r]) => tileCentre({ originX, originY }, c, r)),
  };
  for (let r = 0; r < rows; r++) {
    const row = [];
    const line = def.grid[r].padEnd(cols, '#');
    for (let c = 0; c < cols; c++) {
      const ch = line[c];
      if (ch === 'P') {
        level.playerStart = tileCentre(level, c, r);
        row.push('.');
      } else if (ch === 'R') {
        level.relic = tileCentre(level, c, r);
        row.push('.');
      } else if (ch === 'E') {
        level.exit = tileCentre(level, c, r);
        row.push('.');
      } else if (ch === 'G') {
        level.guardSpawns.push(tileCentre(level, c, r));
        row.push('.');
      } else if (ch === '-' || ch === '>' || ch === '<') {
        row.push('.');
      } else {
        row.push(ch);
      }
    }
    level.tiles.push(row);
  }
  level.guards = def.guards.map((g, i) => ({
    spawn: level.guardSpawns[i] || tileCentre(level, 2, 2),
    speed: g.speed,
    coneLength: g.coneLength,
    fovDeg: g.fovDeg,
    waypoints: g.waypoints.map(([c, r]) => tileCentre(level, c, r)),
  }));
  return level;
}

export function levelCount() {
  return GRIDS.length;
}

export function tileAt(level, col, row) {
  if (col < 0 || row < 0 || col >= level.cols || row >= level.rows) return '#';
  return level.tiles[row][col];
}

export function isBlockingTile(level, col, row) {
  const t = tileAt(level, col, row);
  return t === '#' || t === 'C';
}

export function tileAtPx(level, x, y) {
  const col = Math.floor((x - level.originX) / TILE);
  const row = Math.floor((y - level.originY) / TILE);
  return tileAt(level, col, row);
}

export function isBlockingPx(level, x, y) {
  return isBlockingTile(level, Math.floor((x - level.originX) / TILE), Math.floor((y - level.originY) / TILE));
}

export function isShadowPx(level, x, y) {
  return tileAtPx(level, x, y) === 'S';
}

// True when the straight segment between two points crosses no wall or
// cover tile. Shadow zones do not block sight.
export function hasLineOfSight(level, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 6));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (isBlockingPx(level, x1 + dx * t, y1 + dy * t)) return false;
  }
  return true;
}

// Move a circle against blocking tiles, axis by axis, so it slides along
// walls instead of sticking in corners.
export function moveCircle(level, pos, radius, dx, dy) {
  let nx = pos.x + dx;
  if (circleHitsBlocking(level, nx, pos.y, radius)) nx = pos.x;
  let ny = pos.y + dy;
  if (circleHitsBlocking(level, nx, ny, radius)) ny = pos.y;
  pos.x = nx;
  pos.y = ny;
}

function circleHitsBlocking(level, x, y, radius) {
  const col0 = Math.floor((x - radius - level.originX) / TILE);
  const col1 = Math.floor((x + radius - level.originX) / TILE);
  const row0 = Math.floor((y - radius - level.originY) / TILE);
  const row1 = Math.floor((y + radius - level.originY) / TILE);
  for (let row = row0; row <= row1; row++) {
    for (let col = col0; col <= col1; col++) {
      if (!isBlockingTile(level, col, row)) continue;
      const rx = level.originX + col * TILE;
      const ry = level.originY + row * TILE;
      const cx = Math.max(rx, Math.min(x, rx + TILE));
      const cy = Math.max(ry, Math.min(y, ry + TILE));
      if ((x - cx) * (x - cx) + (y - cy) * (y - cy) < radius * radius) return true;
    }
  }
  return false;
}
