// input.js — keyboard and mouse input for The Halcyon Heist.
// The canvas reports logical 1280x720 coordinates: the click point is scaled
// from the displayed canvas size, so a resized canvas still aims true.

import { VIEW_W, VIEW_H } from './config.js';
import { emptyInput } from './world.js';

const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
};

export function createInput(canvas) {
  const keys = new Set();
  let click = null;
  let startPressed = false;
  let restartPressed = false;
  let pausePressed = false;
  let mutePressed = false;

  function onKeyDown(e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
    if (e.repeat) return;
    keys.add(e.code);
    if (e.code === 'Enter' || e.code === 'Space') startPressed = true;
    if (e.code === 'KeyR') restartPressed = true;
    if (e.code === 'KeyP' || e.code === 'Escape') pausePressed = true;
    if (e.code === 'KeyM') mutePressed = true;
  }

  function onKeyUp(e) {
    keys.delete(e.code);
  }

  function onMouseDown(e) {
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * VIEW_W;
    const y = ((e.clientY - rect.top) / rect.height) * VIEW_H;
    click = { x, y };
  }

  function onBlur() {
    keys.clear();
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('mousedown', onMouseDown);

  // Build one input frame for this step, then clear the one-shot flags.
  // Clicks and key presses are consumed exactly once.
  function poll() {
    const input = emptyInput();
    for (const code of keys) {
      const dir = KEYMAP[code];
      if (dir) input[dir] = true;
    }
    input.sneak = keys.has('ShiftLeft') || keys.has('ShiftRight');
    input.grab = keys.has('KeyE');
    input.click = click;
    click = null;
    input.start = startPressed;
    startPressed = false;
    input.restart = restartPressed;
    restartPressed = false;
    if (pausePressed) {
      input.pause = true;
      pausePressed = false;
    }
    if (mutePressed) {
      input.mute = true;
      mutePressed = false;
    }
    return input;
  }

  return { poll };
}
