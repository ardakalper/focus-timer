// Pure timer engine. No DOM, no timers: every method takes `now` (ms) so it is
// deterministic and testable. Wall-clock based, so background tabs and reloads
// never drift: elapsed = accumulated + (now - startedAt).

// Preset kinds:
//   cycle     focus -> short break (long break every N rounds) -> focus ...   (Pomodoro, 52/17, 90/20, 60/20, 20-20-20)
//   ratio     open-ended focus (stopwatch) -> break = focus / ratio           (Flowtime, Third Time)
//   single    one countdown, then done                                        (Timebox)
//   stopwatch counts up forever                                               (Stopwatch)
//   interval  [prep] -> work -> rest -> work ... for N rounds, then done      (Tabata / HIIT)

export const DONE = Object.freeze({ kind: 'done', seconds: 0 });

export const FOCUS_KINDS = new Set(['focus', 'work']);
export const BREAK_KINDS = new Set(['short', 'long', 'rest']);

export function firstPhase(preset) {
  switch (preset.kind) {
    case 'cycle':
    case 'single':
      return { kind: 'focus', seconds: preset.focus };
    case 'ratio':
    case 'stopwatch':
      return { kind: 'focus', seconds: null };
    case 'interval':
      return preset.prep > 0 ? { kind: 'prep', seconds: preset.prep } : { kind: 'work', seconds: preset.work };
    default:
      throw new Error(`unknown preset kind: ${preset.kind}`);
  }
}

// Given the phase that just ended, the number of completed focus rounds so far and
// how long the ended phase actually lasted, return the next phase and round count.
export function nextPhase(preset, phase, round, elapsedSec) {
  switch (preset.kind) {
    case 'single':
    case 'stopwatch':
      return { phase: DONE, round };
    case 'cycle': {
      if (phase.kind === 'focus') {
        const r = round + 1;
        if (preset.rounds > 0 && r >= preset.rounds) return { phase: DONE, round: r };
        const long = preset.longEvery > 0 && preset.long > 0 && r % preset.longEvery === 0;
        return { phase: { kind: long ? 'long' : 'short', seconds: long ? preset.long : preset.short }, round: r };
      }
      return { phase: { kind: 'focus', seconds: preset.focus }, round };
    }
    case 'ratio': {
      if (phase.kind === 'focus') {
        const min = preset.minBreak ?? 60;
        const max = preset.maxBreak ?? Infinity;
        const br = Math.min(max, Math.max(min, Math.round(elapsedSec / preset.ratio)));
        return { phase: { kind: 'short', seconds: br }, round: round + 1 };
      }
      return { phase: { kind: 'focus', seconds: null }, round };
    }
    case 'interval': {
      if (phase.kind === 'prep') return { phase: { kind: 'work', seconds: preset.work }, round };
      if (phase.kind === 'work') {
        const r = round + 1;
        if (preset.rounds > 0 && r >= preset.rounds) return { phase: DONE, round: r };
        return { phase: { kind: 'rest', seconds: preset.rest }, round: r };
      }
      return { phase: { kind: 'work', seconds: preset.work }, round };
    }
    default:
      throw new Error(`unknown preset kind: ${preset.kind}`);
  }
}

export class Engine {
  constructor(preset) {
    this.preset = preset;
    this.reset();
  }

  reset() {
    this.phase = firstPhase(this.preset);
    this.round = 0;
    this.status = 'idle'; // idle | running | paused | done
    this.startedAt = null; // wall-clock ms when the current run segment began
    this.accum = 0; // ms accumulated in this phase before the current run segment
  }

  get isCountdown() {
    return this.phase.seconds != null;
  }

  elapsedMs(now) {
    return this.accum + (this.status === 'running' ? Math.max(0, now - this.startedAt) : 0);
  }

  // null for stopwatch-style phases
  remainingMs(now) {
    if (!this.isCountdown) return null;
    return Math.max(0, this.phase.seconds * 1000 - this.elapsedMs(now));
  }

  // Wall-clock moment the current countdown phase ends (null if not running / not a countdown).
  endsAt() {
    if (this.status !== 'running' || !this.isCountdown) return null;
    return this.startedAt + this.phase.seconds * 1000 - this.accum;
  }

  // 0..1 for countdowns, null otherwise
  progress(now) {
    if (!this.isCountdown || this.phase.seconds === 0) return null;
    return Math.min(1, this.elapsedMs(now) / (this.phase.seconds * 1000));
  }

  start(now) {
    if (this.status === 'running' || this.status === 'done') return false;
    this.startedAt = now;
    this.status = 'running';
    return true;
  }

  pause(now) {
    if (this.status !== 'running') return false;
    this.accum = this.elapsedMs(now);
    this.startedAt = null;
    this.status = 'paused';
    return true;
  }

  toggle(now) {
    return this.status === 'running' ? this.pause(now) : this.start(now);
  }

  // Ends the current phase now (finished naturally or skipped) and loads the next one.
  // Returns a record of the phase that ended. The engine is left idle (or done).
  advance(now, reason = 'skipped') {
    if (this.status === 'done') return null;
    const elapsedSec = reason === 'finished' && this.isCountdown
      ? this.phase.seconds
      : Math.round(this.elapsedMs(now) / 1000);
    const ended = { kind: this.phase.kind, seconds: this.phase.seconds, elapsedSec, round: this.round, reason, at: now };
    const { phase, round } = nextPhase(this.preset, this.phase, this.round, elapsedSec);
    this.phase = phase;
    this.round = round;
    this.accum = 0;
    this.startedAt = null;
    this.status = phase.kind === 'done' ? 'done' : 'idle';
    return ended;
  }

  // Call regularly. If a running countdown has reached zero, completes it at the exact
  // moment it ended (not at `now`), so late ticks stay accurate. Returns the ended
  // phase record or null.
  tick(now) {
    if (this.status !== 'running' || !this.isCountdown) return null;
    const end = this.endsAt();
    if (now < end) return null;
    return this.advance(end, 'finished');
  }

  snapshot() {
    return {
      presetId: this.preset.id,
      phase: { ...this.phase },
      round: this.round,
      status: this.status,
      startedAt: this.startedAt,
      accum: this.accum,
    };
  }

  static restore(preset, snap) {
    const e = new Engine(preset);
    if (!snap || snap.presetId !== preset.id) return e;
    e.phase = { ...snap.phase };
    e.round = snap.round | 0;
    e.status = snap.status;
    e.startedAt = snap.startedAt;
    e.accum = snap.accum | 0;
    if (e.status === 'running' && typeof e.startedAt !== 'number') e.status = 'paused';
    return e;
  }
}

// mm:ss or h:mm:ss
export function formatClock(ms, { ceil = true } = {}) {
  const total = ceil ? Math.ceil(ms / 1000) : Math.floor(ms / 1000);
  const s = total % 60;
  const m = Math.floor(total / 60) % 60;
  const h = Math.floor(total / 3600);
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
