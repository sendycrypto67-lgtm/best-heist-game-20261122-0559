// config.js — every tuning number and colour of The Halcyon Heist in one place.
// The game runs on a fixed logical playfield of 1280x720 and a fixed step of 1/60 s.

export const VIEW_W = 1280;
export const VIEW_H = 720;

// HUD strip at the top; the museum room lives below it.
export const HUD_H = 84;
export const ROOM = { x: 24, y: 96, w: 1232, h: 600 };
export const WALL_T = 14;

// Movement (pixels per second).
export const THIEF_SPEED = 155;
export const THIEF_SNEAK_SPEED = 88;
export const THIEF_RADIUS = 14;
export const GUARD_SPEED = 96;
export const GUARD_CHASE_SPEED = 138;
export const GUARD_RADIUS = 14;

// Vision.
export const GUARD_CONE_RANGE = 245;
export const GUARD_CONE_HALF_DEG = 35;
export const CAMERA_CONE_RANGE = 265;
export const CAMERA_CONE_HALF_DEG = 30;

// Detection: a guard's suspicion runs 0..1 while the thief is inside its cone.
// Rates are per second; proximity and running speed it up, sneaking slows it.
export const DETECT_BASE = 0.55;
export const DETECT_CLOSE_BONUS = 0.65;
export const DETECT_SNEAK_MULT = 0.45;
export const DETECT_RUN_MULT = 1.25;
export const DETECT_DECAY = 0.5;
export const ALERT_AT = 1.0;

// Alarm meter 0..100, shared across guards and cameras.
export const ALARM_RISE_GUARD = 13;
export const ALARM_RISE_CAMERA = 21;
export const ALARM_DECAY = 5.5;
export const ALARM_LOCKDOWN = 100;
export const STEALTH_BONUS_MAX_ALARM = 50;

// Diamond grab: hold still and channel for this many seconds.
export const GRAB_TIME = 1.2;
export const GRAB_RANGE = 56;

// Tools and attempts.
export const COINS_PER_LEVEL = 3;
export const COIN_LURE_RADIUS = 300;
export const ATTEMPTS_PER_LEVEL = 3;

// Scoring.
export const SCORE_DIAMOND = 1000;
export const SCORE_GOLD_BAR = 150;
export const SCORE_PAINTING_LOOT = 100;
export const SCORE_STEALTH_BONUS = 250;
export const SCORE_TIME_PENALTY_PER_SEC = 2;

export const STEP = 1 / 60;

// Colours.
export const COLORS = {
  floorA: '#1c2436',
  floorB: '#202a3e',
  floorLine: '#2b3852',
  wall: '#39415a',
  wallTrim: '#c9a227',
  wallTop: '#4a5470',
  carpet: '#7a1f2b',
  carpetEdge: '#c9a227',
  caseGlass: 'rgba(150, 210, 235, 0.20)',
  caseFrame: '#8fa3bf',
  caseBase: '#5a4632',
  paintingFrame: '#c9a227',
  diamond: '#5ef2ff',
  diamondGlow: 'rgba(94, 242, 255, 0.35)',
  exit: '#1fae5f',
  exitDark: '#0d6e38',
  guardBody: '#2b4a7a',
  guardHead: '#e8c39a',
  guardCone: 'rgba(255, 214, 64, 0.20)',
  guardConeEdge: 'rgba(255, 214, 64, 0.55)',
  guardConeAlert: 'rgba(255, 64, 64, 0.28)',
  guardConeAlertEdge: 'rgba(255, 64, 64, 0.7)',
  cameraCone: 'rgba(255, 70, 70, 0.16)',
  cameraConeEdge: 'rgba(255, 70, 70, 0.5)',
  thiefBody: '#241d33',
  thiefHood: '#3a2d55',
  thiefTrim: '#b388ff',
  gold: '#ffd24d',
  hudBg: '#10141f',
  hudLine: '#c9a227',
  text: '#f2ead8',
  textDim: '#9aa5bd',
  alarmGreen: '#2fbf5a',
  alarmAmber: '#f5a623',
  alarmRed: '#ff4040',
};
