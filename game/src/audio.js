// Procedural sound, no audio files: a few WebAudio oscillator blips for
// pickups, tools, the alarm's warning pulse and the caught sting.
export function createAudio() {
  return { context: null, alarmTimer: 0 };
}

function ensureContext(audio) {
  if (audio.context) return audio.context;
  try {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return null;
    audio.context = new Context();
  } catch {
    return null;
  }
  return audio.context;
}

function blip(audio, frequency, duration, type = 'sine', gainValue = 0.08) {
  const context = ensureContext(audio);
  if (!context || context.state === 'suspended') return;
  try {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(gainValue, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
  } catch {
    // Sound is garnish; a failure must never break the game.
  }
}

export function playPickup(audio) {
  blip(audio, 880, 0.12, 'sine', 0.07);
  setTimeout(() => blip(audio, 1320, 0.15, 'sine', 0.06), 70);
}

export function playTool(audio) {
  blip(audio, 320, 0.2, 'triangle', 0.08);
}

export function playCaught(audio) {
  blip(audio, 220, 0.4, 'sawtooth', 0.1);
  setTimeout(() => blip(audio, 110, 0.6, 'sawtooth', 0.1), 150);
}

export function playWin(audio) {
  [523, 659, 784, 1047].forEach((frequency, index) => {
    setTimeout(() => blip(audio, frequency, 0.25, 'sine', 0.08), index * 120);
  });
}

export function playAlarmTick(audio, world) {
  if (world.alarm < 55) return;
  const context = ensureContext(audio);
  if (!context) return;
  audio.alarmTimer -= 1 / 60;
  if (audio.alarmTimer <= 0) {
    audio.alarmTimer = 0.5;
    blip(audio, 980, 0.08, 'square', 0.03);
  }
}
