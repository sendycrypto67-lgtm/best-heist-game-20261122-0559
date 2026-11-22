// world.js — level data, game state, and the step logic of The Halcyon Heist.
// Pure logic: no canvas, no audio, no DOM. A fixed step of 1/60 s drives everything
// and every random choice comes from the seeded RNG, so the same seed and the same
// inputs always give the same game.

import {
  VIEW_W, VIEW_H, ROOM, WALL_T, THIEF_SPEED, THIEF_SNEAK_SPEED, THIEF_RADIUS,
  GUARD_SPEED, GUARD_CHASE_SPEED, GUARD_RADIUS, GUARD_CONE_RANGE,
  GUARD_CONE_HALF_DEG, CAMERA_CONE_RANGE, CAMERA_CONE_HALF_DEG,
  DETECT_BASE, DETECT_CLOSE_BONUS, DETECT_SNEAK_MULT, DETECT_RUN_MULT,
  DETECT_DECAY, ALERT_AT, ALARM_RISE_GUARD, ALARM_RISE_CAMERA, ALARM_DECAY,
  ALARM_LOCKDOWN, STEALTH_BONUS_MAX_ALARM, GRAB_TIME, GRAB_RANGE,
  COINS_PER_LEVEL, COIN_LURE_RADIUS, ATTEMPTS_PER_LEVEL, SCORE_DIAMOND,
  SCORE_GOLD_BAR, SCORE_PAINTING_LOOT, SCORE_STEALTH_BONUS,
  SCORE_TIME_PENALTY_PER_SEC, STEP,
} from './config.js';
import { mulberry32 } from './random.js';

const DEG = Math.PI / 180;

// ---------------------------------------------------------------- level data
// Walls and glass cases are rectangles {x, y, w, h} that block movement and
// line of sight. Paintings hang on walls (decor, some are loot). Loot items sit
// on the floor. Guards patrol waypoint loops. Cameras sweep from a wall mount.

export const LEVELS = [
  {
    name: 'Gallery I — The Grand Gallery',
    diamond: { x: 640, y: 210 },
    spawn: { x: 120, y: 620 },
    exit: { x: 1130, y: 600, w: 84, h: 64 },
    carpet: { x: 596, y: 250, w: 88, h: 400 },
    walls: [
      { x: 300, y: 300, w: 150, h: 22 },
      { x: 830, y: 300, w: 150, h: 22 },
      { x: 300, y: 480, w: 150, h: 22 },
      { x: 830, y: 480, w: 150, h: 22 },
    ],
    cases: [
      { x: 520, y: 150, w: 240, h: 62, label: 'HALCYON DIAMOND' },
      { x: 180, y: 170, w: 110, h: 60 },
      { x: 990, y: 170, w: 110, h: 60 },
      { x: 180, y: 540, w: 110, h: 60 },
      { x: 990, y: 540, w: 110, h: 60 },
    ],
    paintings: [
      { x: 330, y: 112, w: 90, h: 54, hue: '#7a4a6b', loot: true },
      { x: 860, y: 112, w: 90, h: 54, hue: '#3f6b4a', loot: false },
      { x: 40, y: 330, w: 54, h: 90, hue: '#6b5a2f', loot: false },
      { x: 1186, y: 330, w: 54, h: 90, hue: '#4a5a7a', loot: true },
    ],
    loot: [
      { kind: 'gold', x: 375, y: 360, value: SCORE_GOLD_BAR },
      { kind: 'gold', x: 905, y: 360, value: SCORE_GOLD_BAR },
      { kind: 'gold', x: 640, y: 560, value: SCORE_GOLD_BAR },
    ],
    guards: [
      { waypoints: [{ x: 300, y: 250 }, { x: 980, y: 250 }, { x: 980, y: 560 }, { x: 300, y: 560 }] },
      { waypoints: [{ x: 980, y: 420 }, { x: 640, y: 420 }, { x: 640, y: 640 }, { x: 980, y: 640 }] },
    ],
    cameras: [
      // On the left wall, not dead-centre: a camera above the diamond case
      // is blinded by the case itself and could never spot the thief.
      { x: 300, y: 112, baseDeg: 90, sweepDeg: 55, speed: 0.55, phase: 0 },
    ],
  },
  {
    name: 'Gallery II — The Marble Halls',
    diamond: { x: 640, y: 180 },
    spawn: { x: 120, y: 620 },
    exit: { x: 1130, y: 130, w: 84, h: 64 },
    carpet: { x: 596, y: 220, w: 88, h: 420 },
    walls: [
      { x: 260, y: 260, w: 22, h: 170 },
      { x: 998, y: 260, w: 22, h: 170 },
      { x: 480, y: 420, w: 320, h: 22 },
      { x: 200, y: 540, w: 200, h: 22 },
      { x: 880, y: 540, w: 200, h: 22 },
    ],
    cases: [
      { x: 520, y: 122, w: 240, h: 62, label: 'HALCYON DIAMOND' },
      { x: 330, y: 300, w: 110, h: 60 },
      { x: 840, y: 300, w: 110, h: 60 },
      { x: 330, y: 470, w: 110, h: 60 },
      { x: 840, y: 470, w: 110, h: 60 },
      { x: 585, y: 330, w: 110, h: 60 },
    ],
    paintings: [
      { x: 300, y: 112, w: 90, h: 54, hue: '#7a4a6b', loot: true },
      { x: 890, y: 112, w: 90, h: 54, hue: '#3f6b4a', loot: true },
      { x: 40, y: 300, w: 54, h: 90, hue: '#6b5a2f', loot: false },
      { x: 1186, y: 480, w: 54, h: 90, hue: '#4a5a7a', loot: false },
    ],
    loot: [
      { kind: 'gold', x: 385, y: 420, value: SCORE_GOLD_BAR },
      { kind: 'gold', x: 895, y: 420, value: SCORE_GOLD_BAR },
      { kind: 'gold', x: 640, y: 300, value: SCORE_GOLD_BAR },
      { kind: 'gold', x: 300, y: 620, value: SCORE_GOLD_BAR },
    ],
    guards: [
      { waypoints: [{ x: 200, y: 200 }, { x: 1080, y: 200 }, { x: 1080, y: 500 }, { x: 200, y: 500 }] },
      { waypoints: [{ x: 640, y: 620 }, { x: 640, y: 300 }, { x: 1080, y: 620 }] },
      { waypoints: [{ x: 1080, y: 620 }, { x: 200, y: 620 }, { x: 200, y: 300 }] },
    ],
    cameras: [
      { x: 300, y: 112, baseDeg: 90, sweepDeg: 60, speed: 0.6, phase: 0 },
      { x: 980, y: 112, baseDeg: 90, sweepDeg: 60, speed: 0.6, phase: 1.7 },
    ],
  },
  {
    name: 'The Vault — Halcyon Vault',
    diamond: { x: 640, y: 400 },
    spawn: { x: 120, y: 620 },
    exit: { x: 1130, y: 600, w: 84, h: 64 },
    carpet: { x: 596, y: 440, w: 88, h: 200 },
    walls: [
      { x: 380, y: 220, w: 22, h: 200 },
      { x: 878, y: 220, w: 22, h: 200 },
      { x: 380, y: 500, w: 520, h: 22 },
      { x: 180, y: 220, w: 180, h: 22 },
      { x: 920, y: 220, w: 180, h: 22 },
    ],
    cases: [
      { x: 520, y: 330, w: 240, h: 76, label: 'HALCYON DIAMOND' },
      { x: 200, y: 300, w: 110, h: 60 },
      { x: 970, y: 300, w: 110, h: 60 },
      { x: 200, y: 540, w: 110, h: 60 },
      { x: 970, y: 540, w: 110, h: 60 },
      { x: 585, y: 560, w: 110, h: 60 },
    ],
    paintings: [
      { x: 560, y: 112, w: 90, h: 54, hue: '#7a4a6b', loot: true },
      { x: 40, y: 300, w: 54, h: 90, hue: '#6b5a2f', loot: false },
      { x: 1186, y: 300, w: 54, h: 90, hue: '#4a5a7a', loot: true },
    ],
    loot: [
      { kind: 'gold', x: 300, y: 480, value: SCORE_GOLD_BAR },
      { kind: 'gold', x: 980, y: 480, value: SCORE_GOLD_BAR },
      { kind: 'gold', x: 640, y: 180, value: SCORE_GOLD_BAR },
      { kind: 'gold', x: 480, y: 620, value: SCORE_GOLD_BAR },
    ],
    guards: [
      { waypoints: [{ x: 300, y: 180 }, { x: 980, y: 180 }, { x: 980, y: 620 }, { x: 300, y: 620 }] },
      { waypoints: [{ x: 500, y: 460 }, { x: 780, y: 460 }, { x: 780, y: 620 }, { x: 500, y: 620 }] },
      { waypoints: [{ x: 1080, y: 300 }, { x: 1080, y: 560 }, { x: 640, y: 560 }] },
    ],
    cameras: [
      { x: 480, y: 112, baseDeg: 90, sweepDeg: 55, speed: 0.65, phase: 0 },
      { x: 800, y: 112, baseDeg: 90, sweepDeg: 55, speed: 0.65, phase: 2.1 },
    ],
  },
];

// ---------------------------------------------------------------- geometry

function circleHitsRect(cx, cy, r, rect) {
  const nx = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const ny = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < r * r;
}

// Push a circle out of a rectangle it overlaps; returns true when pushed.
function pushCircleOutOfRect(body, r, rect) {
  const nx = Math.max(rect.x, Math.min(body.x, rect.x + rect.w));
  const ny = Math.max(rect.y, Math.min(body.y, rect.y + rect.h));
  let dx = body.x - nx;
  let dy = body.y - ny;
  const d2 = dx * dx + dy * dy;
  if (d2 >= r * r) return false;
  if (d2 === 0) {
    // Centre inside the rect: push out along the smallest penetration axis.
    const left = body.x - rect.x;
    const right = rect.x + rect.w - body.x;
    const top = body.y - rect.y;
    const bottom = rect.y + rect.h - body.y;
    const m = Math.min(left, right, top, bottom);
    if (m === left) body.x = rect.x - r;
    else if (m === right) body.x = rect.x + rect.w + r;
    else if (m === top) body.y = rect.y - r;
    else body.y = rect.y + rect.h + r;
    return true;
  }
  const d = Math.sqrt(d2);
  dx /= d;
  dy /= d;
  body.x = nx + dx * r;
  body.y = ny + dy * r;
  return true;
}

// Does segment (x1,y1)-(x2,y2) cross rectangle r? Liang-Barsky clipping.
function segmentHitsRect(x1, y1, x2, y2, r) {
  let t0 = 0;
  let t1 = 1;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const p = [-dx, dx, -dy, dy];
  const q = [x1 - r.x, r.x + r.w - x1, y1 - r.y, r.y + r.h - y1];
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) return false;
    } else {
      const t = q[i] / p[i];
      if (p[i] < 0) {
        if (t > t1) return false;
        if (t > t0) t0 = t;
      } else {
        if (t < t0) return false;
        if (t < t1) t1 = t;
      }
    }
  }
  return true;
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

// ---------------------------------------------------------------- state

export function createGame(seed = 1) {
  const rng = mulberry32(seed);
  const game = {
    seed,
    rng,
    screen: 'title', // title | play | clear | over | win
    paused: false,
    levelIndex: 0,
    level: null,
    thief: null,
    guards: [],
    cameras: [],
    loot: [],
    paintings: [],
    coins: [],
    coinTosses: [],
    alarm: 0,
    maxAlarm: 0,
    attempts: ATTEMPTS_PER_LEVEL,
    time: 0,
    totalTime: 0,
    score: 0,
    totalScore: 0,
    lootValue: 0,
    lootCount: 0,
    diamondTaken: false,
    grabProgress: 0,
    grabbing: false,
    coinsLeft: COINS_PER_LEVEL,
    stepCount: 0,
    events: [],
    banner: null, // {text, color, until}
    floaters: [], // {x, y, text, color, t}
    best: 0,
    muted: false,
    levelScore: 0,
    levelTime: 0,
    winStats: null,
  };
  loadLevel(game, 0);
  return game;
}

export function loadLevel(game, index) {
  const def = LEVELS[index];
  game.levelIndex = index;
  game.level = def;
  game.thief = {
    x: def.spawn.x,
    y: def.spawn.y,
    dir: -Math.PI / 2,
    sneaking: false,
    moving: false,
  };
  game.guards = def.guards.map((g, i) => ({
    waypoints: g.waypoints,
    wp: 0,
    x: g.waypoints[0].x,
    y: g.waypoints[0].y,
    angle: 0,
    detection: 0,
    state: 'patrol', // patrol | investigate | chase | return
    target: null,
    lastSeen: null,
    loseTimer: 0,
    pauseTimer: 0,
    index: i,
  }));
  game.cameras = def.cameras.map((c) => ({
    x: c.x,
    y: c.y,
    base: c.baseDeg * DEG,
    sweep: c.sweepDeg * DEG,
    speed: c.speed,
    phase: c.phase,
    angle: c.baseDeg * DEG,
    t: c.phase,
    triggerTimer: 0,
  }));
  game.loot = def.loot.map((l) => ({ ...l, taken: false }));
  game.paintings = def.paintings.map((p) => ({ ...p, taken: false }));
  game.coins = [];
  game.coinTosses = [];
  game.alarm = 0;
  game.maxAlarm = 0;
  game.time = 0;
  game.lootValue = 0;
  game.lootCount = 0;
  game.diamondTaken = false;
  game.grabProgress = 0;
  game.grabbing = false;
  game.coinsLeft = COINS_PER_LEVEL;
  game.floaters = [];
  game.banner = null;
  game.stepCount = 0;
}

// All rectangles that block movement and sight: outer room walls, interior
// walls and glass display cases.
export function blockers(game) {
  const list = [
    { x: ROOM.x, y: ROOM.y, w: ROOM.w, h: WALL_T },
    { x: ROOM.x, y: ROOM.y + ROOM.h - WALL_T, w: ROOM.w, h: WALL_T },
    { x: ROOM.x, y: ROOM.y, w: WALL_T, h: ROOM.h },
    { x: ROOM.x + ROOM.w - WALL_T, y: ROOM.y, w: WALL_T, h: ROOM.h },
  ];
  for (const w of game.level.walls) list.push(w);
  for (const c of game.level.cases) list.push(c);
  return list;
}

export function hasLineOfSight(game, x1, y1, x2, y2) {
  for (const r of blockers(game)) {
    if (segmentHitsRect(x1, y1, x2, y2, r)) return false;
  }
  return true;
}

// ---------------------------------------------------------------- input

// A fresh, empty input frame. The input module and the shot scripts both
// build these: {up, down, left, right, sneak, grab, click, start, restart}
export function emptyInput() {
  return {
    up: false, down: false, left: false, right: false,
    sneak: false, grab: false, click: null, start: false, restart: false,
  };
}

// ---------------------------------------------------------------- stepping

function moveBody(game, body, r, dx, dy) {
  body.x += dx;
  body.y += dy;
  for (const rect of blockers(game)) pushCircleOutOfRect(body, r, rect);
  body.x = clamp(body.x, ROOM.x + WALL_T + r, ROOM.x + ROOM.w - WALL_T - r);
  body.y = clamp(body.y, ROOM.y + WALL_T + r, ROOM.y + ROOM.h - WALL_T - r);
}

function guardSeesThief(game, guard) {
  const t = game.thief;
  const dx = t.x - guard.x;
  const dy = t.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > GUARD_CONE_RANGE) return { sees: false, dist };
  const ang = Math.atan2(dy, dx);
  if (Math.abs(angleDiff(ang, guard.angle)) > GUARD_CONE_HALF_DEG * DEG) {
    return { sees: false, dist };
  }
  if (!hasLineOfSight(game, guard.x, guard.y, t.x, t.y)) return { sees: false, dist };
  return { sees: true, dist };
}

function cameraSeesThief(game, cam) {
  const t = game.thief;
  const dx = t.x - cam.x;
  const dy = t.y - cam.y;
  const dist = Math.hypot(dx, dy);
  if (dist > CAMERA_CONE_RANGE) return false;
  const ang = Math.atan2(dy, dx);
  if (Math.abs(angleDiff(ang, cam.angle)) > CAMERA_CONE_HALF_DEG * DEG) return false;
  if (!hasLineOfSight(game, cam.x, cam.y, t.x, t.y)) return false;
  return true;
}

function nearestGuard(game, x, y) {
  let best = null;
  let bestD = Infinity;
  for (const g of game.guards) {
    const d = Math.hypot(g.x - x, g.y - y);
    if (d < bestD) { bestD = d; best = g; }
  }
  return best;
}

function addFloater(game, x, y, text, color) {
  game.floaters.push({ x, y, text, color, t: 0 });
}

function showBanner(game, text, color, seconds = 1.6) {
  game.banner = { text, color, until: game.stepCount + Math.round(seconds * 60) };
}

function failLevel(game, reason) {
  game.events.push(reason === 'caught' ? 'caught' : 'lockdown');
  game.attempts -= 1;
  game.grabProgress = 0;
  game.grabbing = false;
  if (game.attempts <= 0) {
    game.screen = 'over';
    game.events.push('gameover');
    showBanner(game, 'GAME OVER', '#ff4040', 3);
  } else {
    loadLevel(game, game.levelIndex);
    game.screen = 'play';
    showBanner(game, reason === 'caught' ? 'CAUGHT!  —  1 attempt lost' : 'LOCKDOWN!  —  1 attempt lost', '#ff4040', 2.2);
  }
}

function clearLevel(game) {
  const timePenalty = Math.floor(game.time) * SCORE_TIME_PENALTY_PER_SEC;
  let levelScore = game.lootValue - timePenalty;
  if (levelScore < 0) levelScore = 0;
  if (game.maxAlarm < STEALTH_BONUS_MAX_ALARM) levelScore += SCORE_STEALTH_BONUS;
  game.levelScore = levelScore;
  game.levelTime = game.time;
  game.totalScore += levelScore;
  game.totalTime += game.time;
  game.events.push('clear');
  if (game.levelIndex >= LEVELS.length - 1) {
    game.screen = 'win';
    game.winStats = {
      score: game.totalScore,
      time: game.totalTime,
      loot: game.lootCount,
    };
    game.events.push('win');
  } else {
    game.screen = 'clear';
  }
}

function startLevel(game, index) {
  game.attempts = ATTEMPTS_PER_LEVEL;
  loadLevel(game, index);
  game.screen = 'play';
}

export function startGame(game) {
  game.totalScore = 0;
  game.totalTime = 0;
  startLevel(game, 0);
  game.events.push('start');
}

function stepAmbient(game, dt) {
  // Guards keep patrolling and cameras keep sweeping behind title/clear
  // screens so the room feels alive.
  game.stepCount += 1;
  for (const cam of game.cameras) {
    cam.t += dt;
    cam.angle = cam.base + Math.sin(cam.t * cam.speed * 2) * cam.sweep;
  }
  for (const guard of game.guards) {
    stepGuardPatrol(game, guard, dt);
  }
}

function stepGuardPatrol(game, guard, dt) {
  if (guard.pauseTimer > 0) {
    guard.pauseTimer -= dt;
    return;
  }
  const wp = guard.waypoints[guard.wp];
  const dx = wp.x - guard.x;
  const dy = wp.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 6) {
    guard.wp = (guard.wp + 1) % guard.waypoints.length;
    guard.pauseTimer = 0.7;
    return;
  }
  const speed = GUARD_SPEED;
  const step = Math.min(dist, speed * dt);
  guard.x += (dx / dist) * step;
  guard.y += (dy / dist) * step;
  guard.angle = Math.atan2(dy, dx);
}

function stepGuard(game, guard, dt, input) {
  const t = game.thief;
  const seen = guardSeesThief(game, guard);

  if (seen.sees) {
    let rate = DETECT_BASE + DETECT_CLOSE_BONUS * (1 - seen.dist / GUARD_CONE_RANGE);
    if (t.sneaking) rate *= DETECT_SNEAK_MULT;
    else rate *= DETECT_RUN_MULT;
    guard.detection = clamp(guard.detection + rate * dt, 0, 1);
    guard.lastSeen = { x: t.x, y: t.y };
    if (guard.detection >= ALERT_AT && guard.state !== 'chase') {
      guard.state = 'chase';
      game.events.push('alert');
    }
  } else {
    guard.detection = clamp(guard.detection - DETECT_DECAY * dt, 0, 1);
    if (guard.state === 'chase') {
      guard.loseTimer += dt;
      if (guard.loseTimer > 3.5) {
        guard.state = 'return';
        guard.loseTimer = 0;
      }
    }
  }

  if (guard.state === 'chase' && guard.lastSeen) {
    const dx = guard.lastSeen.x - guard.x;
    const dy = guard.lastSeen.y - guard.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 10) {
      guard.state = 'return';
    } else {
      const step = Math.min(dist, GUARD_CHASE_SPEED * dt);
      const nx = guard.x + (dx / dist) * step;
      const ny = guard.y + (dy / dist) * step;
      const probe = { x: nx, y: ny };
      moveBody(game, probe, GUARD_RADIUS, 0, 0);
      guard.x = probe.x;
      guard.y = probe.y;
      guard.angle = Math.atan2(dy, dx);
    }
  } else if (guard.state === 'investigate' && guard.target) {
    const dx = guard.target.x - guard.x;
    const dy = guard.target.y - guard.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 12) {
      guard.pauseTimer = 1.2;
      guard.state = 'patrol';
      guard.target = null;
    } else {
      const step = Math.min(dist, GUARD_SPEED * 1.15 * dt);
      const probe = { x: guard.x + (dx / dist) * step, y: guard.y + (dy / dist) * step };
      moveBody(game, probe, GUARD_RADIUS, 0, 0);
      guard.x = probe.x;
      guard.y = probe.y;
      guard.angle = Math.atan2(dy, dx);
    }
  } else if (guard.state === 'return') {
    // Walk back to the nearest waypoint, then resume the patrol loop.
    let best = 0;
    let bestD = Infinity;
    guard.waypoints.forEach((wp, i) => {
      const d = Math.hypot(wp.x - guard.x, wp.y - guard.y);
      if (d < bestD) { bestD = d; best = i; }
    });
    guard.wp = best;
    const wp = guard.waypoints[guard.wp];
    const dx = wp.x - guard.x;
    const dy = wp.y - guard.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 8) {
      guard.state = 'patrol';
    } else {
      const step = Math.min(dist, GUARD_SPEED * dt);
      const probe = { x: guard.x + (dx / dist) * step, y: guard.y + (dy / dist) * step };
      moveBody(game, probe, GUARD_RADIUS, 0, 0);
      guard.x = probe.x;
      guard.y = probe.y;
      guard.angle = Math.atan2(dy, dx);
    }
  } else {
    stepGuardPatrol(game, guard, dt);
  }

  // Caught: an alerted guard touches the thief.
  if (guard.state === 'chase' || guard.detection >= ALERT_AT) {
    const d = Math.hypot(t.x - guard.x, t.y - guard.y);
    if (d < THIEF_RADIUS + GUARD_RADIUS - 2) {
      failLevel(game, 'caught');
    }
  }
}

function stepPlay(game, input, dt) {
  game.stepCount += 1;
  game.time += dt;
  const t = game.thief;

  // --- movement
  let mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  let my = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  const moving = mx !== 0 || my !== 0;
  t.moving = moving;
  t.sneaking = !!input.sneak;
  if (moving) {
    const len = Math.hypot(mx, my);
    mx /= len;
    my /= len;
    const speed = t.sneaking ? THIEF_SNEAK_SPEED : THIEF_SPEED;
    moveBody(game, t, THIEF_RADIUS, mx * speed * dt, my * speed * dt);
    t.dir = Math.atan2(my, mx);
    game.grabProgress = 0; // moving breaks the grab channel
  }

  // --- coin toss: click throws a coin that lures nearby guards. A click on
  // the diamond case itself is a grab, not a coin toss.
  const clickNearDiamond =
    input.click && Math.hypot(input.click.x - game.level.diamond.x, input.click.y - game.level.diamond.y) < GRAB_RANGE + 40;
  if (input.click && game.coinsLeft > 0 && game.screen === 'play' && !clickNearDiamond) {
    const px = clamp(input.click.x, ROOM.x + WALL_T + 8, ROOM.x + ROOM.w - WALL_T - 8);
    const py = clamp(input.click.y, ROOM.y + WALL_T + 8, ROOM.y + ROOM.h - WALL_T - 8);
    game.coinsLeft -= 1;
    game.coinTosses.push({ x: px, y: py, t: 0 });
    game.events.push('coin');
    for (const g of game.guards) {
      const d = Math.hypot(g.x - px, g.y - py);
      if (d < COIN_LURE_RADIUS && g.state !== 'chase') {
        g.state = 'investigate';
        g.target = { x: px, y: py };
      }
    }
  }
  for (const c of game.coinTosses) c.t += dt;
  game.coinTosses = game.coinTosses.filter((c) => c.t < 1.4);

  // --- diamond grab: hold E (or click the case) while standing close
  const dxDiamond = game.level.diamond.x - t.x;
  const dyDiamond = game.level.diamond.y - t.y;
  const nearDiamond = Math.hypot(dxDiamond, dyDiamond) < GRAB_RANGE + 30;
  const wantGrab = input.grab || (input.click && nearDiamond);
  if (!game.diamondTaken && nearDiamond && wantGrab && !moving) {
    game.grabbing = true;
    game.grabProgress += dt / GRAB_TIME;
    if (game.grabProgress >= 1) {
      game.diamondTaken = true;
      game.grabProgress = 0;
      game.grabbing = false;
      game.lootValue += SCORE_DIAMOND;
      game.lootCount += 1;
      game.events.push('grab');
      addFloater(game, game.level.diamond.x, game.level.diamond.y - 40, '+1000  HALCYON DIAMOND', '#5ef2ff');
      showBanner(game, 'DIAMOND SECURED — REACH THE GREEN EXIT', '#5ef2ff', 2.4);
    }
  } else {
    game.grabbing = false;
    if (!nearDiamond) game.grabProgress = 0;
  }

  // --- side loot: touch a gold bar or a loot painting
  for (const l of game.loot) {
    if (l.taken) continue;
    if (Math.hypot(l.x - t.x, l.y - t.y) < 26) {
      l.taken = true;
      game.lootValue += l.value;
      game.lootCount += 1;
      game.events.push('pickup');
      addFloater(game, l.x, l.y - 18, `+${l.value}`, '#ffd24d');
    }
  }
  for (const p of game.paintings) {
    if (!p.loot || p.taken) continue;
    const cx = clamp(t.x, p.x, p.x + p.w);
    const cy = clamp(t.y, p.y, p.y + p.h);
    if (Math.hypot(cx - t.x, cy - t.y) < 26) {
      p.taken = true;
      game.lootValue += SCORE_PAINTING_LOOT;
      game.lootCount += 1;
      game.events.push('pickup');
      addFloater(game, p.x + p.w / 2, p.y + p.h + 14, `+${SCORE_PAINTING_LOOT}`, '#ffd24d');
    }
  }

  // --- cameras sweep; a camera that sees the thief raises the alarm fast
  // and sends the nearest guard to investigate.
  let anySeen = false;
  for (const cam of game.cameras) {
    cam.t += dt;
    cam.angle = cam.base + Math.sin(cam.t * cam.speed * 2) * cam.sweep;
    cam.triggerTimer = Math.max(0, cam.triggerTimer - dt);
    if (cameraSeesThief(game, cam)) {
      anySeen = true;
      game.alarm = clamp(game.alarm + ALARM_RISE_CAMERA * dt, 0, ALARM_LOCKDOWN);
      if (cam.triggerTimer <= 0) {
        cam.triggerTimer = 2.0;
        const g = nearestGuard(game, t.x, t.y);
        if (g && g.state !== 'chase') {
          g.state = 'investigate';
          g.target = { x: t.x, y: t.y };
        }
        game.events.push('alert');
      }
    }
  }

  // --- guards patrol, detect, chase
  for (const guard of game.guards) {
    if (game.screen !== 'play') break; // a catch can end the level mid-loop
    stepGuard(game, guard, dt, input);
  }
  if (game.screen !== 'play') return;

  // --- alarm rises while any guard sees the thief, decays when unseen
  let guardSeen = false;
  for (const guard of game.guards) {
    if (guard.detection > 0.15) guardSeen = true;
  }
  if (guardSeen) {
    anySeen = true;
    game.alarm = clamp(game.alarm + ALARM_RISE_GUARD * dt, 0, ALARM_LOCKDOWN);
  }
  if (!anySeen) {
    game.alarm = clamp(game.alarm - ALARM_DECAY * dt, 0, ALARM_LOCKDOWN);
  }
  if (game.alarm > game.maxAlarm) game.maxAlarm = game.alarm;
  if (game.alarm >= ALARM_LOCKDOWN) {
    failLevel(game, 'lockdown');
    return;
  }

  // --- exit: only after the diamond is secured
  if (game.diamondTaken) {
    const e = game.level.exit;
    if (t.x > e.x && t.x < e.x + e.w && t.y > e.y && t.y < e.y + e.h) {
      clearLevel(game);
      return;
    }
  }

  // --- floaters and banner expiry
  for (const f of game.floaters) f.t += dt;
  game.floaters = game.floaters.filter((f) => f.t < 1.4);
  if (game.banner && game.stepCount > game.banner.until) game.banner = null;
}

// ---------------------------------------------------------------- main step

export function stepGame(game, input, dt = STEP) {
  game.events.length = 0;
  if (game.screen === 'title') {
    if (input.start) {
      startGame(game);
      return;
    }
    stepAmbient(game, dt);
    return;
  }
  if (game.screen === 'clear') {
    if (input.start) {
      startLevel(game, game.levelIndex + 1);
      return;
    }
    stepAmbient(game, dt);
    return;
  }
  if (game.screen === 'over') {
    if (input.start) {
      startGame(game);
      return;
    }
    stepAmbient(game, dt);
    return;
  }
  if (game.screen === 'win') {
    if (input.start) {
      game.screen = 'title';
      loadLevel(game, 0);
      return;
    }
    stepAmbient(game, dt);
    return;
  }
  if (game.paused) return;
  if (input.restart) {
    startLevel(game, game.levelIndex);
    return;
  }
  stepPlay(game, input, dt);
}

// Objective line for the HUD.
export function objectiveText(game) {
  if (game.screen !== 'play') return '';
  if (!game.diamondTaken) return 'Steal the Halcyon Diamond — press E at the glowing case';
  return 'Diamond secured — reach the green service EXIT';
}

export { VIEW_W, VIEW_H };
