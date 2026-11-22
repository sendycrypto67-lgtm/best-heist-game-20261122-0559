// audio.js — synthesised sound effects with WebAudio only. No audio files.
// The context is created on the first user gesture; shot mode never calls
// initAudio, so headless screenshot runs stay silent.

let ctx = null;
let muted = false;

export function initAudio() {
  if (ctx) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
  } catch (e) {
    ctx = null;
  }
}

export function setMuted(m) {
  muted = m;
}

export function isMuted() {
  return muted;
}

function tone(freq, dur, type, vol, when = 0, slideTo = null) {
  if (!ctx || muted) return;
  try {
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  } catch (e) {
    // Audio must never break the game.
  }
}

function noiseBurst(dur, vol, when = 0) {
  if (!ctx || muted) return;
  try {
    const t0 = ctx.currentTime + when;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(gain);
    gain.connect(ctx.destination);
    src.start(t0);
  } catch (e) {
    // Audio must never break the game.
  }
}

// One named sound per game event. main.js calls playSound(event) for every
// event the world emits during a step.
export function playSound(name) {
  if (!ctx || muted) return;
  switch (name) {
    case 'pickup':
      tone(880, 0.12, 'sine', 0.16);
      tone(1318, 0.16, 'sine', 0.14, 0.07);
      break;
    case 'grab':
      tone(523, 0.12, 'triangle', 0.18);
      tone(659, 0.12, 'triangle', 0.18, 0.09);
      tone(784, 0.2, 'triangle', 0.18, 0.18);
      break;
    case 'coin':
      tone(1568, 0.07, 'square', 0.07);
      tone(2093, 0.1, 'square', 0.06, 0.05);
      break;
    case 'alert':
      tone(220, 0.28, 'sawtooth', 0.14, 0, 440);
      tone(440, 0.2, 'sawtooth', 0.1, 0.12, 660);
      break;
    case 'caught':
      tone(160, 0.35, 'sawtooth', 0.2, 0, 55);
      noiseBurst(0.25, 0.2);
      break;
    case 'lockdown':
      tone(980, 0.18, 'square', 0.12);
      tone(980, 0.18, 'square', 0.12, 0.22);
      tone(980, 0.3, 'square', 0.12, 0.44);
      break;
    case 'clear':
      tone(523, 0.14, 'triangle', 0.16);
      tone(659, 0.14, 'triangle', 0.16, 0.11);
      tone(784, 0.14, 'triangle', 0.16, 0.22);
      tone(1046, 0.28, 'triangle', 0.16, 0.33);
      break;
    case 'win':
      [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => tone(f, 0.3, 'triangle', 0.15, i * 0.12));
      break;
    case 'start':
      tone(392, 0.12, 'triangle', 0.14);
      tone(523, 0.18, 'triangle', 0.14, 0.09);
      break;
    case 'gameover':
      tone(330, 0.3, 'sawtooth', 0.12, 0, 220);
      tone(220, 0.5, 'sawtooth', 0.12, 0.25, 110);
      break;
    default:
      break;
  }
}

// A soft alarm pulse while the meter sits above 70. main.js calls this once
// per second of play when the alarm is high.
export function playAlarmPulse() {
  tone(740, 0.14, 'square', 0.06);
  tone(740, 0.14, 'square', 0.06, 0.18);
}
