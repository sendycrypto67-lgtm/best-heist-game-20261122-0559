// render.js — drawing only: world state in, pixels out.
// Everything is drawn with plain Canvas 2D so the game needs no assets.

import {
  VIEW_W, VIEW_H, ROOM, WALL_T, HUD_H, THIEF_RADIUS, GUARD_RADIUS,
  GUARD_CONE_RANGE, GUARD_CONE_HALF_DEG, CAMERA_CONE_RANGE,
  CAMERA_CONE_HALF_DEG, GRAB_TIME, COLORS,
} from './config.js';
import { objectiveText } from './world.js';

const DEG = Math.PI / 180;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCone(ctx, x, y, angle, range, halfDeg, fill, edge) {
  const half = halfDeg * DEG;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - half, angle + half);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function alarmColor(alarm) {
  if (alarm < 50) return COLORS.alarmGreen;
  if (alarm < 75) return COLORS.alarmAmber;
  return COLORS.alarmRed;
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

// ---------------------------------------------------------------- room

function drawFloor(ctx, game) {
  const { x, y, w, h } = ROOM;
  ctx.fillStyle = COLORS.floorA;
  ctx.fillRect(x, y, w, h);
  // Marble tiles.
  ctx.strokeStyle = COLORS.floorLine;
  ctx.lineWidth = 1;
  const tile = 77;
  for (let tx = x + tile; tx < x + w; tx += tile) {
    ctx.beginPath();
    ctx.moveTo(tx, y);
    ctx.lineTo(tx, y + h);
    ctx.stroke();
  }
  for (let ty = y + tile; ty < y + h; ty += tile) {
    ctx.beginPath();
    ctx.moveTo(x, ty);
    ctx.lineTo(x + w, ty);
    ctx.stroke();
  }
  // Red carpet runner leading to the diamond case.
  const c = game.level.carpet;
  ctx.fillStyle = COLORS.carpet;
  ctx.fillRect(c.x, c.y, c.w, c.h);
  ctx.strokeStyle = COLORS.carpetEdge;
  ctx.lineWidth = 3;
  ctx.strokeRect(c.x + 2, c.y, c.w - 4, c.h);
  ctx.strokeStyle = 'rgba(201, 162, 39, 0.35)';
  ctx.lineWidth = 1;
  for (let cy = c.y + 40; cy < c.y + c.h; cy += 80) {
    ctx.beginPath();
    ctx.moveTo(c.x + 10, cy);
    ctx.lineTo(c.x + c.w - 10, cy);
    ctx.stroke();
  }
}

function drawWalls(ctx) {
  const { x, y, w, h } = ROOM;
  ctx.fillStyle = COLORS.wall;
  ctx.fillRect(x, y, w, WALL_T);
  ctx.fillRect(x, y + h - WALL_T, w, WALL_T);
  ctx.fillRect(x, y, WALL_T, h);
  ctx.fillRect(x + w - WALL_T, y, WALL_T, h);
  ctx.fillStyle = COLORS.wallTrim;
  ctx.fillRect(x, y + WALL_T - 3, w, 3);
  ctx.fillRect(x, y + h - WALL_T, w, 3);
  ctx.fillRect(x + WALL_T - 3, y, 3, h);
  ctx.fillRect(x + w - WALL_T, y, 3, h);
  ctx.fillStyle = COLORS.wallTop;
  ctx.fillRect(x, y, w, 4);
}

function drawInteriorWalls(ctx, game) {
  for (const wl of game.level.walls) {
    ctx.fillStyle = COLORS.wall;
    ctx.fillRect(wl.x, wl.y, wl.w, wl.h);
    ctx.strokeStyle = COLORS.wallTrim;
    ctx.lineWidth = 2;
    ctx.strokeRect(wl.x + 1, wl.y + 1, wl.w - 2, wl.h - 2);
  }
}

function drawPaintings(ctx, game) {
  for (const p of game.paintings) {
    if (p.taken) continue;
    ctx.fillStyle = COLORS.paintingFrame;
    ctx.fillRect(p.x - 4, p.y - 4, p.w + 8, p.h + 8);
    ctx.fillStyle = p.hue;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    // A simple framed scene: a horizon and a moon.
    ctx.fillStyle = 'rgba(242, 234, 216, 0.75)';
    ctx.beginPath();
    ctx.arc(p.x + p.w * 0.7, p.y + p.h * 0.32, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(20, 24, 40, 0.55)';
    ctx.fillRect(p.x, p.y + p.h * 0.62, p.w, p.h * 0.38);
    if (p.loot) {
      ctx.fillStyle = COLORS.gold;
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('★ LOOT', p.x + p.w / 2, p.y + p.h + 16);
    }
  }
}

function drawCases(ctx, game) {
  for (const c of game.level.cases) {
    ctx.fillStyle = COLORS.caseBase;
    ctx.fillRect(c.x, c.y + c.h - 8, c.w, 8);
    ctx.fillStyle = COLORS.caseGlass;
    ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.strokeStyle = COLORS.caseFrame;
    ctx.lineWidth = 2;
    ctx.strokeRect(c.x + 1, c.y + 1, c.w - 2, c.h - 2);
    // Glass glint.
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(c.x + 12, c.y + c.h - 10);
    ctx.lineTo(c.x + c.w * 0.45, c.y + 8);
    ctx.stroke();
    // A case's own plaque. The diamond case carries none: the glowing gem
    // above it is already labelled.
    if (c.label && c.label !== 'HALCYON DIAMOND') {
      ctx.fillStyle = '#d8c98a';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(c.label, c.x + c.w / 2, c.y + c.h - 16);
    }
  }
}

function drawDiamond(ctx, game, time) {
  if (game.diamondTaken) return;
  const d = game.level.diamond;
  // Glow.
  const glow = ctx.createRadialGradient(d.x, d.y, 4, d.x, d.y, 90);
  glow.addColorStop(0, COLORS.diamondGlow);
  glow.addColorStop(1, 'rgba(94, 242, 255, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(d.x, d.y, 90, 0, Math.PI * 2);
  ctx.fill();
  // Gem: a faceted diamond shape.
  const s = 17 + Math.sin(time * 3) * 1.5;
  ctx.fillStyle = COLORS.diamond;
  ctx.beginPath();
  ctx.moveTo(d.x, d.y - s);
  ctx.lineTo(d.x + s * 0.75, d.y);
  ctx.lineTo(d.x, d.y + s);
  ctx.lineTo(d.x - s * 0.75, d.y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.beginPath();
  ctx.moveTo(d.x, d.y - s);
  ctx.lineTo(d.x + s * 0.35, d.y - s * 0.1);
  ctx.lineTo(d.x, d.y);
  ctx.lineTo(d.x - s * 0.35, d.y - s * 0.1);
  ctx.closePath();
  ctx.fill();
  // Sparkles, placed from the step count so they are deterministic.
  const n = game.stepCount;
  for (let i = 0; i < 4; i++) {
    const a = (n * 0.05 + i * 1.7) % (Math.PI * 2);
    const r = 26 + ((i * 13 + n) % 18);
    const sx = d.x + Math.cos(a) * r;
    const sy = d.y + Math.sin(a) * r;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(sx - 5, sy);
    ctx.lineTo(sx + 5, sy);
    ctx.moveTo(sx, sy - 5);
    ctx.lineTo(sx, sy + 5);
    ctx.stroke();
  }
  ctx.fillStyle = '#bff6ff';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('◆ HALCYON DIAMOND', d.x, d.y - 34);
}

function drawLoot(ctx, game) {
  for (const l of game.loot) {
    if (l.taken) continue;
    ctx.fillStyle = '#8a6d1f';
    ctx.fillRect(l.x - 11, l.y - 6, 22, 12);
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(l.x - 9, l.y - 8, 18, 10);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillRect(l.x - 9, l.y - 8, 18, 3);
    ctx.fillStyle = COLORS.gold;
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GOLD', l.x, l.y + 22);
  }
}

function drawExit(ctx, game) {
  const e = game.level.exit;
  const open = game.diamondTaken;
  ctx.fillStyle = open ? COLORS.exit : '#274d33';
  ctx.fillRect(e.x, e.y, e.w, e.h);
  ctx.strokeStyle = open ? '#7dffb0' : '#4a7a5a';
  ctx.lineWidth = 3;
  ctx.strokeRect(e.x + 1, e.y + 1, e.w - 2, e.h - 2);
  ctx.fillStyle = open ? '#eafff1' : '#9fc4ab';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('EXIT', e.x + e.w / 2, e.y + e.h / 2 - 2);
  ctx.font = 'bold 10px sans-serif';
  ctx.fillText(open ? 'ESCAPE!' : 'LOCKED', e.x + e.w / 2, e.y + e.h / 2 + 14);
}

function drawCoins(ctx, game) {
  for (const c of game.coinTosses) {
    const pulse = 1 + Math.sin(c.t * 14) * 0.25;
    ctx.strokeStyle = 'rgba(255, 210, 77, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 8 + c.t * 26, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = COLORS.gold;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 6 * pulse, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ---------------------------------------------------------------- actors

function drawGuards(ctx, game) {
  for (const g of game.guards) {
    const alerted = g.state === 'chase' || g.detection >= 1;
    drawCone(
      ctx, g.x, g.y, g.angle, GUARD_CONE_RANGE, GUARD_CONE_HALF_DEG,
      alerted ? COLORS.guardConeAlert : COLORS.guardCone,
      alerted ? COLORS.guardConeAlertEdge : COLORS.guardConeEdge,
    );
    // Body: uniformed figure.
    ctx.fillStyle = COLORS.guardBody;
    ctx.beginPath();
    ctx.arc(g.x, g.y, GUARD_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#9db8dd';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Head and cap.
    ctx.fillStyle = COLORS.guardHead;
    ctx.beginPath();
    ctx.arc(g.x, g.y, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1d2f4d';
    ctx.fillRect(g.x - 7, g.y - 8, 14, 4);
    // Direction tick.
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(g.x, g.y);
    ctx.lineTo(g.x + Math.cos(g.angle) * 20, g.y + Math.sin(g.angle) * 20);
    ctx.stroke();
    // Alert mark.
    if (alerted) {
      ctx.fillStyle = '#ff4040';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', g.x, g.y - 24);
    } else if (g.detection > 0.15) {
      ctx.fillStyle = '#ffd640';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('?', g.x, g.y - 24);
    }
    // Suspicion arc above the guard.
    if (g.detection > 0.02) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(g.x, g.y - 18, 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * g.detection);
      ctx.stroke();
    }
  }
}

function drawCameras(ctx, game) {
  for (const cam of game.cameras) {
    drawCone(
      ctx, cam.x, cam.y, cam.angle, CAMERA_CONE_RANGE, CAMERA_CONE_HALF_DEG,
      COLORS.cameraCone, COLORS.cameraConeEdge,
    );
    ctx.fillStyle = '#20242e';
    ctx.fillRect(cam.x - 10, cam.y - 8, 20, 16);
    ctx.strokeStyle = '#6b7686';
    ctx.lineWidth = 2;
    ctx.strokeRect(cam.x - 10, cam.y - 8, 20, 16);
    // Blinking red light, driven by the step count.
    const on = Math.floor(game.stepCount / 30) % 2 === 0;
    ctx.fillStyle = on ? '#ff2e2e' : '#5a1010';
    ctx.beginPath();
    ctx.arc(cam.x + 12, cam.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c8d2e0';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('CAM', cam.x - 22, cam.y - 12);
  }
}

function drawThief(ctx, game) {
  const t = game.thief;
  // Soft shadow of stealth: a faint dark ring when sneaking.
  if (t.sneaking) {
    ctx.strokeStyle = 'rgba(179, 136, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(t.x, t.y, THIEF_RADIUS + 5, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = COLORS.thiefBody;
  ctx.beginPath();
  ctx.arc(t.x, t.y, THIEF_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = COLORS.thiefTrim;
  ctx.lineWidth = 2;
  ctx.stroke();
  // Hood point and face shadow.
  ctx.fillStyle = COLORS.thiefHood;
  ctx.beginPath();
  ctx.moveTo(t.x + Math.cos(t.dir) * 16, t.y + Math.sin(t.dir) * 16);
  ctx.lineTo(t.x + Math.cos(t.dir + 2.4) * 10, t.y + Math.sin(t.dir + 2.4) * 10);
  ctx.lineTo(t.x + Math.cos(t.dir - 2.4) * 10, t.y + Math.sin(t.dir - 2.4) * 10);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#0e0a18';
  ctx.beginPath();
  ctx.arc(t.x + Math.cos(t.dir) * 4, t.y + Math.sin(t.dir) * 4, 5, 0, Math.PI * 2);
  ctx.fill();
  // Grab progress ring.
  if (game.grabbing && game.grabProgress > 0) {
    ctx.strokeStyle = '#5ef2ff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(t.x, t.y, THIEF_RADIUS + 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * game.grabProgress);
    ctx.stroke();
    ctx.fillStyle = '#bff6ff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CRACKING THE CASE…', t.x, t.y - 30);
  }
  ctx.fillStyle = '#e8ddff';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ROOK', t.x, t.y + 26);
}

// ---------------------------------------------------------------- HUD

function drawHud(ctx, game) {
  ctx.fillStyle = COLORS.hudBg;
  ctx.fillRect(0, 0, VIEW_W, HUD_H);
  ctx.fillStyle = COLORS.hudLine;
  ctx.fillRect(0, HUD_H - 3, VIEW_W, 3);

  // Alarm meter.
  const ax = 24;
  const ay = 16;
  const aw = 360;
  const ah = 26;
  ctx.fillStyle = '#f2ead8';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('ALARM', ax, ay + 19);
  ctx.fillStyle = '#2a2f3d';
  roundRect(ctx, ax + 78, ay, aw, ah, 5);
  ctx.fill();
  ctx.fillStyle = alarmColor(game.alarm);
  const fillW = Math.max(0, (aw - 4) * (game.alarm / 100));
  if (fillW > 0) {
    roundRect(ctx, ax + 80, ay + 2, fillW, ah - 4, 4);
    ctx.fill();
  }
  ctx.strokeStyle = '#5a6274';
  ctx.lineWidth = 1.5;
  roundRect(ctx, ax + 78, ay, aw, ah, 5);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`${Math.floor(game.alarm)}%`, ax + 78 + aw + 10, ay + 19);
  // Objective line under the meter.
  ctx.fillStyle = game.diamondTaken ? '#5ef2ff' : COLORS.textDim;
  ctx.font = '13px sans-serif';
  ctx.fillText(objectiveText(game), ax, ay + 44);
  if (game.diamondTaken) {
    ctx.fillStyle = '#5ef2ff';
    ctx.fillText('◆ DIAMOND SECURED', ax + 380, ay + 44);
  }

  // Right-hand stats.
  const rx = VIEW_W - 24;
  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(`${game.level.name}`, rx, 22);
  ctx.font = '13px sans-serif';
  ctx.fillStyle = COLORS.textDim;
  // Score: completed galleries plus the loot of the gallery in progress.
  const shownScore = game.totalScore + (game.screen === 'play' ? game.lootValue : 0);
  ctx.fillText(
    `TIME ${formatTime(game.time)}    SCORE ${shownScore}    LOOT $${game.lootValue}`,
    rx, 44,
  );
  ctx.fillText(
    `COINS ${game.coinsLeft}    ATTEMPTS ${'●'.repeat(game.attempts)}${'○'.repeat(Math.max(0, 3 - game.attempts))}    BEST ${game.best}`,
    rx, 64,
  );
  ctx.textAlign = 'left';
}

function drawFloaters(ctx, game) {
  ctx.textAlign = 'center';
  for (const f of game.floaters) {
    const alpha = 1 - f.t / 1.4;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = f.color;
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(f.text, f.x, f.y - f.t * 24);
    ctx.globalAlpha = 1;
  }
}

function drawBanner(ctx, game) {
  if (!game.banner || game.screen !== 'play') return;
  ctx.fillStyle = game.banner.color;
  ctx.font = 'bold 30px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(game.banner.text, VIEW_W / 2, 150);
}

// ---------------------------------------------------------------- screens

function dimWorld(ctx) {
  ctx.fillStyle = 'rgba(8, 10, 18, 0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(12, 15, 26, 0.92)';
  roundRect(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.strokeStyle = COLORS.hudLine;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawTitle(ctx, game) {
  dimWorld(ctx);
  // The panel sits low so the diamond case, the top paintings and the
  // patrols stay visible above it: the title frame must show the room too.
  panel(ctx, 300, 240, 680, 350);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#5ef2ff';
  ctx.font = 'bold 52px sans-serif';
  ctx.fillText('THE HALCYON HEIST', VIEW_W / 2, 302);
  ctx.fillStyle = COLORS.text;
  ctx.font = '20px sans-serif';
  ctx.fillText('Steal the Halcyon Diamond. Slip past the guards.', VIEW_W / 2, 338);
  ctx.fillText('Out before the alarm fills.', VIEW_W / 2, 366);
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '16px sans-serif';
  ctx.fillText('WASD / Arrows — move      Shift — sneak', VIEW_W / 2, 406);
  ctx.fillText('Click — toss a coin to lure guards      E — grab the diamond', VIEW_W / 2, 432);
  ctx.fillText('P — pause      R — restart level      M — mute', VIEW_W / 2, 458);
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 17px sans-serif';
  ctx.fillText('3 galleries. 3 attempts each. Stay out of the cones.', VIEW_W / 2, 494);
  if (game.best > 0) {
    ctx.fillStyle = COLORS.text;
    ctx.font = '16px sans-serif';
    ctx.fillText(`Best score: ${game.best}`, VIEW_W / 2, 522);
  }
  ctx.fillStyle = '#7dffb0';
  ctx.font = 'bold 24px sans-serif';
  const blink = Math.floor(game.stepCount / 30) % 2 === 0;
  if (blink) ctx.fillText('— PRESS ENTER OR CLICK TO START —', VIEW_W / 2, 556);
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '13px sans-serif';
  ctx.fillText('A top-down stealth heist in the Halcyon Museum at night.', VIEW_W / 2, 580);
}

function drawClear(ctx, game) {
  dimWorld(ctx);
  panel(ctx, 340, 170, 600, 340);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#7dffb0';
  ctx.font = 'bold 40px sans-serif';
  ctx.fillText('GALLERY CLEARED', VIEW_W / 2, 240);
  ctx.fillStyle = COLORS.text;
  ctx.font = '19px sans-serif';
  ctx.fillText(`${game.level.name}`, VIEW_W / 2, 282);
  ctx.fillText(`Loot this gallery: $${game.lootValue}    Time: ${formatTime(game.levelTime)}`, VIEW_W / 2, 318);
  if (game.maxAlarm < 50) {
    ctx.fillStyle = COLORS.gold;
    ctx.fillText(`Stealth bonus +${250}`, VIEW_W / 2, 348);
  }
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(`Gallery score: ${game.levelScore}      Total: ${game.totalScore}`, VIEW_W / 2, 388);
  ctx.fillStyle = '#7dffb0';
  ctx.font = 'bold 20px sans-serif';
  const blink = Math.floor(game.stepCount / 30) % 2 === 0;
  if (blink) ctx.fillText('— PRESS ENTER FOR THE NEXT GALLERY —', VIEW_W / 2, 452);
}

function drawOver(ctx, game) {
  dimWorld(ctx);
  panel(ctx, 340, 170, 600, 340);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff4040';
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText('CAUGHT IN THE ACT', VIEW_W / 2, 244);
  ctx.fillStyle = COLORS.text;
  ctx.font = '19px sans-serif';
  ctx.fillText('The museum kept its diamond this time.', VIEW_W / 2, 288);
  ctx.fillText(`Score so far: ${game.totalScore}`, VIEW_W / 2, 322);
  ctx.fillStyle = '#7dffb0';
  ctx.font = 'bold 20px sans-serif';
  const blink = Math.floor(game.stepCount / 30) % 2 === 0;
  if (blink) ctx.fillText('— PRESS ENTER TO TRY AGAIN —', VIEW_W / 2, 440);
}

function drawWin(ctx, game) {
  dimWorld(ctx);
  panel(ctx, 290, 130, 700, 440);
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 46px sans-serif';
  ctx.fillText('THE PERFECT HEIST', VIEW_W / 2, 200);
  ctx.fillStyle = COLORS.text;
  ctx.font = '20px sans-serif';
  ctx.fillText('All three galleries cleared. The Halcyon Diamond is yours.', VIEW_W / 2, 242);
  const s = game.winStats || { score: game.totalScore, time: game.totalTime, loot: game.lootCount };
  ctx.fillText(`Total score: ${s.score}      Total time: ${formatTime(s.time)}`, VIEW_W / 2, 288);
  ctx.fillText(`Loot collected: ${s.loot} piece${s.loot === 1 ? '' : 's'}`, VIEW_W / 2, 320);
  ctx.fillStyle = '#5ef2ff';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('◆ HALCYON DIAMOND ◆', VIEW_W / 2, 362);
  ctx.fillStyle = '#7dffb0';
  ctx.font = 'bold 20px sans-serif';
  const blink = Math.floor(game.stepCount / 30) % 2 === 0;
  if (blink) ctx.fillText('— PRESS ENTER TO PLAY AGAIN —', VIEW_W / 2, 500);
}

function drawPaused(ctx) {
  dimWorld(ctx);
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 40px sans-serif';
  ctx.fillText('PAUSED', VIEW_W / 2, VIEW_H / 2 - 10);
  ctx.font = '17px sans-serif';
  ctx.fillStyle = COLORS.textDim;
  ctx.fillText('P or Esc to resume — R to restart the level', VIEW_W / 2, VIEW_H / 2 + 26);
}

// ---------------------------------------------------------------- entry point

export function renderGame(ctx, game) {
  const time = game.stepCount / 60;
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#0a0d16';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  drawFloor(ctx, game);
  drawPaintings(ctx, game);
  drawCases(ctx, game);
  drawDiamond(ctx, game, time);
  drawLoot(ctx, game);
  drawExit(ctx, game);
  drawCoins(ctx, game);
  drawGuards(ctx, game);
  drawCameras(ctx, game);
  drawThief(ctx, game);
  drawFloaters(ctx, game);
  drawBanner(ctx, game);
  drawHud(ctx, game);

  if (game.screen === 'title') drawTitle(ctx, game);
  else if (game.screen === 'clear') drawClear(ctx, game);
  else if (game.screen === 'over') drawOver(ctx, game);
  else if (game.screen === 'win') drawWin(ctx, game);
  else if (game.paused) drawPaused(ctx);
}
