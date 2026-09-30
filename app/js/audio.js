// Synthesised sounds via Web Audio: no files, works offline, tiny.
let ctx = null;

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

// Must be called from a user gesture once, so later automatic sounds are allowed.
export function unlock() {
  ac();
}

function tone(c, { freq, at, dur, gain, type = 'sine' }) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(gain, at + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(c.destination);
  o.start(at);
  o.stop(at + dur + 0.05);
}

const CHIMES = {
  // end of a focus phase: rising, rewarding
  focus: [[523.25, 0, 0.5], [659.25, 0.15, 0.5], [783.99, 0.3, 0.9]],
  // end of a break: two firm notes, back to work
  break: [[440, 0, 0.35], [440, 0.25, 0.7]],
  // everything finished
  done: [[523.25, 0, 0.4], [659.25, 0.15, 0.4], [783.99, 0.3, 0.4], [1046.5, 0.45, 1.2]],
  // interval training cues: short beeps
  beep: [[880, 0, 0.12]],
};

export function chime(name, volume = 0.6) {
  const c = ac();
  if (!c || volume <= 0) return;
  const notes = CHIMES[name] ?? CHIMES.focus;
  const t0 = c.currentTime + 0.02;
  for (const [freq, offset, dur] of notes) tone(c, { freq, at: t0 + offset, dur, gain: 0.25 * volume, type: 'triangle' });
}

// Quiet mechanical tick for the "ticking clock" option.
export function tick(volume = 0.6) {
  const c = ac();
  if (!c || volume <= 0) return;
  const t0 = c.currentTime;
  tone(c, { freq: 2200, at: t0, dur: 0.03, gain: 0.05 * volume, type: 'square' });
}
