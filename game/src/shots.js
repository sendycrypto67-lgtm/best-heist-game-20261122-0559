// shots.js — deterministic screenshot scenes for The Halcyon Heist.
// Each scene plays the real rules forward from a fresh world for a fixed
// number of fixed steps, steered by a fixed input script (no randomness
// beyond the seeded RNG), so the same seed always gives the same frame.
// Every scene shows the room, guards with vision cones, cameras, the loot
// target and the alarm meter in one frame.
//
// Staging note: a thief who stands still in front of a guard gets caught
// (that is the game working), so the directors kite Rook: the alarm shots
// keep Rook in a camera cone, teleporting to the next cone spot whenever
// a guard closes in, and the high-alarm shot ends with Rook held ahead of
// a guard until that guard's suspicion peaks and it gives chase.

import { ROOM, WALL_T, STEP, CAMERA_CONE_RANGE, CAMERA_CONE_HALF_DEG } from './config.js';
import { createGame, startGame, loadLevel, stepGame, emptyInput, blockers, hasLineOfSight } from './world.js';

const DEG = Math.PI / 180;

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

// Step the game up to maxSteps times with inputs from inputFn, stopping
// early when stopWhen(game) is true.
function runSteps(game, inputFn, maxSteps, stopWhen) {
  for (let i = 0; i < maxSteps; i++) {
    stepGame(game, inputFn(i, game), STEP);
    if (stopWhen && stopWhen(game)) break;
  }
}

function noInput() {
  return emptyInput();
}

// Put the thief at a fixed spot inside the room (staging only; the world
// then steps forward from there under its real rules).
function placeThief(game, x, y) {
  game.thief.x = clamp(x, ROOM.x + WALL_T + 16, ROOM.x + ROOM.w - WALL_T - 16);
  game.thief.y = clamp(y, ROOM.y + WALL_T + 16, ROOM.y + ROOM.h - WALL_T - 16);
}

function pointInBlocker(game, x, y, pad) {
  for (const r of blockers(game)) {
    if (x > r.x - pad && x < r.x + r.w + pad && y > r.y - pad && y < r.y + r.h + pad) return true;
  }
  return false;
}

// Spots inside the first camera's sweeping cone at several radii and
// angles: Rook is on camera here, so the alarm climbs, but the spots sit
// away from the patrol lanes. Only spots the camera can actually see (line
// of sight not blocked by a case or wall) are kept.
function cameraSpots(game) {
  const cam = game.cameras[0];
  const spots = [];
  for (const off of [-0.9, -0.45, 0, 0.45, 0.9]) {
    for (const r of [150, 200]) {
      const a = cam.base + off;
      const spot = {
        x: cam.x + Math.cos(a) * r,
        y: cam.y + Math.sin(a) * r,
      };
      if (!pointInBlocker(game, spot.x, spot.y, 16)
        && hasLineOfSight(game, cam.x, cam.y, spot.x, spot.y)) {
        spots.push(spot);
      }
    }
  }
  return spots.length > 0 ? spots : [{ x: cam.x, y: cam.y + 200 }];
}

// Distance from a point to the nearest guard.
function nearestGuardDist(game, x, y) {
  let best = Infinity;
  for (const g of game.guards) {
    const d = Math.hypot(g.x - x, g.y - y);
    if (d < best) best = d;
  }
  return best;
}

// Kite Rook between camera-cone spots until the alarm reaches target:
// whenever a guard closes in, hop to the spot farthest from every guard,
// and hop on a timer too, so Rook keeps presenting himself to the camera.
// The alarm climbs from the camera alone (21/s) while no guard can close
// in for a catch.
function kiteToAlarm(game, target) {
  const spots = cameraSpots(game);
  let spot = 0;
  let sinceHop = 0;
  placeThief(game, spots[0].x, spots[0].y);
  runSteps(game, () => {
    sinceHop += 1;
    if (nearestGuardDist(game, game.thief.x, game.thief.y) < 170 || sinceHop > 150) {
      let best = spot;
      let bestD = -1;
      spots.forEach((s, i) => {
        const d = nearestGuardDist(game, s.x, s.y);
        if (d > bestD) { bestD = d; best = i; }
      });
      spot = best;
      sinceHop = 0;
      placeThief(game, spots[spot].x, spots[spot].y);
    }
    return emptyInput();
  }, 1200, (g) => g.alarm >= target);
}

// Is a point inside any camera's sweeping cone right now?
function cameraSeesPoint(game, x, y) {
  for (const cam of game.cameras) {
    const dx = x - cam.x;
    const dy = y - cam.y;
    const dist = Math.hypot(dx, dy);
    if (dist > CAMERA_CONE_RANGE) continue;
    const ang = Math.atan2(dy, dx);
    let diff = ang - cam.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    if (Math.abs(diff) > CAMERA_CONE_HALF_DEG * DEG) continue;
    if (hasLineOfSight(game, cam.x, cam.y, x, y)) return true;
  }
  return false;
}

// Hold Rook ahead of a guard, at the first clear distance in front of it,
// until that guard's suspicion peaks and it gives chase (red cone) and the
// alarm has climbed into the high band. A spot only counts when the guard
// can actually see it: clear of blockers and with an open line of sight.
// Spots a camera also covers are preferred, so the frame shows the camera
// cone on Rook too. When no spot is clear (the guard faces a wall), Rook
// stays put for that step and the guard turns at its waypoint. Rook is
// re-placed ahead of the guard every step, so even a chasing guard can
// never close in and catch him during staging.
function holdAheadOfGuard(game, guardIndex, maxAlarm) {
  runSteps(game, () => {
    const g = game.guards[guardIndex];
    let fallback = null;
    let chosen = null;
    for (const d of [220, 200, 180, 160, 140, 120, 100]) {
      const cx = g.x + Math.cos(g.angle) * d;
      const cy = g.y + Math.sin(g.angle) * d;
      if (pointInBlocker(game, cx, cy, 16)) continue;
      if (!hasLineOfSight(game, g.x, g.y, cx, cy)) continue;
      if (!fallback) fallback = { x: cx, y: cy };
      if (cameraSeesPoint(game, cx, cy)) {
        chosen = { x: cx, y: cy };
        break;
      }
    }
    const spot = chosen || fallback;
    if (spot) placeThief(game, spot.x, spot.y);
    return emptyInput();
  }, 400, (g) => (g.alarm >= 78 && g.guards.some((gd) => gd.state === 'chase')) || g.alarm >= maxAlarm);
}

// ---------------------------------------------------------------- scenes

function stageStart(seed) {
  const game = createGame(seed);
  game.screen = 'title';
  // Let the patrols and cameras sweep for two seconds behind the title.
  runSteps(game, noInput, 120);
  return game;
}

function stagePlay(seed) {
  const game = createGame(seed);
  startGame(game);
  game.attempts = 3;
  loadLevel(game, 1); // Gallery II: three guards, two cameras, six cases.
  game.screen = 'play';
  runSteps(game, noInput, 120);
  // Kite in the camera cone until the alarm sits in the low 30s.
  kiteToAlarm(game, 32);
  // Settle near the central cases for the frame.
  placeThief(game, 470, 360);
  runSteps(game, noInput, 15);
  return game;
}

function stageAlarm(seed) {
  const game = createGame(seed);
  startGame(game);
  game.attempts = 3;
  loadLevel(game, 0); // Gallery I: camera on the left wall, guard on the top row.
  game.screen = 'play';
  runSteps(game, noInput, 120);
  // Kite in the camera cone until the alarm is high, then hold Rook ahead
  // of a guard until it gives chase with a red cone and the meter sits
  // in the high band.
  kiteToAlarm(game, 55);
  holdAheadOfGuard(game, 0, 85);
  return game;
}

function stageEnd(seed) {
  const game = createGame(seed);
  startGame(game);
  game.attempts = 3;
  loadLevel(game, 2); // The Vault.
  game.screen = 'play';
  runSteps(game, noInput, 60);
  // Stand at the top edge of the vault case, off the patrol lane, and
  // channel the grab (1.2 s = 72 steps).
  placeThief(game, 640, 320);
  const grab = emptyInput();
  grab.grab = true;
  runSteps(game, () => grab, 90, (g) => g.diamondTaken);
  // Slip to the service exit and walk out to clear the vault.
  placeThief(game, 1170, 578);
  const down = emptyInput();
  down.down = true;
  runSteps(game, () => down, 300, (g) => g.screen === 'win');
  return game;
}

// ---------------------------------------------------------------- entry

export const SHOT_NAMES = ['start', 'play', 'alarm', 'end'];

export function stageShot(name, seed = 1) {
  switch (name) {
    case 'start':
      return stageStart(seed);
    case 'play':
      return stagePlay(seed);
    case 'alarm':
      return stageAlarm(seed);
    case 'end':
      return stageEnd(seed);
    default:
      return stageStart(seed);
  }
}
