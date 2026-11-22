// main.js — boot and game loop for The Halcyon Heist.
// Normal play runs a fixed timestep (1/60 s) with requestAnimationFrame.
// Shot mode (?shot=play&seed=1) stages one deterministic scene and renders
// that single frame, with no audio and no further stepping.

import { VIEW_W, VIEW_H, STEP } from './config.js';
import { createGame, stepGame } from './world.js';
import { renderGame } from './render.js';
import { createInput } from './input.js';
import { initAudio, playSound, playAlarmPulse, setMuted } from './audio.js';
import { stageShot, SHOT_NAMES } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// Any uncaught error is written into the document title so a headless
// screenshot run can prove the page loaded cleanly.
window.addEventListener('error', (e) => {
  document.title = `ERROR: ${e.message}`;
});

function bestFromStorage() {
  try {
    const v = Number(window.localStorage.getItem('halcyon-best'));
    return Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
  } catch (e) {
    return 0;
  }
}

function saveBest(score) {
  try {
    window.localStorage.setItem('halcyon-best', String(score));
  } catch (e) {
    // Storage is a nicety, never a failure.
  }
}

function runShotMode(shotName, seed) {
  const game = stageShot(shotName, seed);
  game.best = 0;
  renderGame(ctx, game);
  document.title = `The Halcyon Heist — shot ${shotName}`;
}

function runGame() {
  const game = createGame(20261122);
  game.best = bestFromStorage();
  const input = createInput(canvas);
  let acc = 0;
  let last = performance.now();
  let alarmPulseTimer = 0;

  function frame(now) {
    requestAnimationFrame(frame);
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.25) dt = 0.25;
    acc += dt;
    let guard = 0;
    while (acc >= STEP && guard < 5) {
      const frameInput = input.poll();
      if (frameInput.pause) game.paused = !game.paused;
      if (frameInput.mute) {
        game.muted = !game.muted;
        setMuted(game.muted);
      }
      stepGame(game, frameInput, STEP);
      for (const event of game.events) {
        playSound(event);
        if (event === 'win' || event === 'clear') {
          if (game.totalScore > game.best) {
            game.best = game.totalScore;
            saveBest(game.best);
          }
        }
      }
      acc -= STEP;
      guard += 1;
    }
    // Alarm pulse once a second while the meter is high.
    if (game.screen === 'play' && !game.paused && game.alarm > 70) {
      alarmPulseTimer += dt;
      if (alarmPulseTimer > 1) {
        alarmPulseTimer = 0;
        playAlarmPulse();
      }
    } else {
      alarmPulseTimer = 0;
    }
    renderGame(ctx, game);
  }

  function firstGesture() {
    initAudio();
    window.removeEventListener('pointerdown', firstGesture);
    window.removeEventListener('keydown', firstGesture);
  }
  window.addEventListener('pointerdown', firstGesture);
  window.addEventListener('keydown', firstGesture);

  requestAnimationFrame(frame);
}

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot && SHOT_NAMES.includes(shot)) {
  const seed = Number(params.get('seed') || '1') || 1;
  runShotMode(shot, seed);
} else {
  document.title = 'The Halcyon Heist';
  runGame();
}
