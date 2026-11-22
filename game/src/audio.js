// All sound is synthesized with WebAudio oscillators — no audio
// files. A failure to make sound must never break the game.

import { ALARM_ALERT } from './config.js';

// Fresh audio state: no context yet, alarm tick timer at zero.
export function createAudio() {
  return { ctx: null, alarmTimer: 0 };
}

// Lazily create the AudioContext; returns null when unavailable or
// when creation fails.
function ensureCtx(audio) {
  if (audio.ctx) return audio.ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audio.ctx = new AC();
  } catch {
    return null;
  }
  return audio.ctx;
}

// One short tone: an oscillator through a gain that decays
// exponentially to 0.001 over the tone's duration. Silent when there
// is no context or it is suspended.
export function beep(audio, freq, dur, type = 'sine', gain = 0.08) {
  const ctx = ensureCtx(audio);
  if (!ctx || ctx.state === 'suspended') return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(gain, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + dur);
}

// Two-note pickup chime.
export function playPickup(audio) {
  beep(audio, 880, 0.12);
  setTimeout(() => beep(audio, 1320, 0.15), 70);
}

// Gadget blip.
export function playGadget(audio) {
  beep(audio, 320, 0.2, 'triangle');
}

// Caught sting: low sawtooth, then even lower.
export function playCaught(audio) {
  beep(audio, 220, 0.4, 'sawtooth');
  setTimeout(() => beep(audio, 110, 0.6, 'sawtooth'), 150);
}

// Win arpeggio: four rising notes.
export function playWin(audio) {
  const notes = [523, 659, 784, 1047];
  notes.forEach((freq, i) => {
    setTimeout(() => beep(audio, freq, 0.25), i * 120);
  });
}

// Alarm heartbeat while the alarm is at or above the alert threshold.
// Counts the timer down by 1/60 per call and ticks every half second.
export function playAlarmTick(audio, world) {
  if (world.alarm < ALARM_ALERT) return;
  audio.alarmTimer -= 1 / 60;
  if (audio.alarmTimer <= 0) {
    beep(audio, 980, 0.08, 'square', 0.03);
    audio.alarmTimer = 0.5;
  }
}
