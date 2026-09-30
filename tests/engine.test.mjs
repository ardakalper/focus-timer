import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Engine, nextPhase, firstPhase, formatClock } from '../app/js/engine.js';

const pomodoro = { id: 'pomodoro', kind: 'cycle', focus: 1500, short: 300, long: 900, longEvery: 4, rounds: 0 };
const flow = { id: 'flowtime', kind: 'ratio', ratio: 5, minBreak: 60 };
const timebox = { id: 'timebox', kind: 'single', focus: 600 };
const tabata = { id: 'tabata', kind: 'interval', prep: 10, work: 20, rest: 10, rounds: 8 };
const watch = { id: 'stopwatch', kind: 'stopwatch' };

const S = 1000;

test('pomodoro cycles: short breaks, long break every 4th round', () => {
  let round = 0;
  let phase = firstPhase(pomodoro);
  const seq = [];
  for (let i = 0; i < 9; i++) {
    ({ phase, round } = nextPhase(pomodoro, phase, round, phase.seconds));
    seq.push(phase.kind);
  }
  assert.deepEqual(seq, ['short', 'focus', 'short', 'focus', 'short', 'focus', 'long', 'focus', 'short']);
});

test('cycle with a round limit ends after the last focus', () => {
  const p = { ...pomodoro, rounds: 2 };
  let r = nextPhase(p, { kind: 'focus', seconds: 1500 }, 0, 1500);
  assert.equal(r.phase.kind, 'short');
  r = nextPhase(p, { kind: 'focus', seconds: 1500 }, 1, 1500);
  assert.equal(r.phase.kind, 'done');
  assert.equal(r.round, 2);
});

test('engine counts down on the wall clock and finishes at the exact end time', () => {
  const e = new Engine(pomodoro);
  assert.equal(e.status, 'idle');
  e.start(10_000);
  assert.equal(e.remainingMs(10_000), 1500 * S);
  assert.equal(e.remainingMs(10_000 + 1000 * S), 500 * S);
  assert.equal(e.tick(10_000 + 1499 * S), null);
  // late tick: the tab was asleep, we wake up 40s after the end
  const ended = e.tick(10_000 + 1540 * S);
  assert.equal(ended.kind, 'focus');
  assert.equal(ended.reason, 'finished');
  assert.equal(ended.elapsedSec, 1500);
  assert.equal(ended.at, 10_000 + 1500 * S, 'phase ends at its real end, not at the tick');
  assert.equal(e.phase.kind, 'short');
  assert.equal(e.status, 'idle');
  assert.equal(e.round, 1);
});

test('pause and resume keep accumulated time', () => {
  const e = new Engine(pomodoro);
  e.start(0);
  e.pause(100 * S);
  assert.equal(e.status, 'paused');
  assert.equal(e.remainingMs(500 * S), 1400 * S, 'time does not pass while paused');
  e.start(500 * S);
  assert.equal(e.remainingMs(600 * S), 1300 * S);
  assert.equal(e.endsAt(), 500 * S + 1400 * S);
});

test('skip records the real elapsed time', () => {
  const e = new Engine(pomodoro);
  e.start(0);
  const ended = e.advance(90 * S, 'skipped');
  assert.equal(ended.elapsedSec, 90);
  assert.equal(ended.reason, 'skipped');
  assert.equal(e.phase.kind, 'short');
});

test('flowtime: open-ended focus, break proportional to focus with a floor', () => {
  const e = new Engine(flow);
  assert.equal(e.isCountdown, false);
  e.start(0);
  assert.equal(e.remainingMs(1000 * S), null);
  assert.equal(e.tick(99999 * S), null, 'stopwatch phases never auto-finish');
  const ended = e.advance(50 * 60 * S, 'skipped');
  assert.equal(ended.elapsedSec, 3000);
  assert.equal(e.phase.kind, 'short');
  assert.equal(e.phase.seconds, 600, '50 min / 5 = 10 min break');
  // a very short focus still gets the minimum break
  const e2 = new Engine(flow);
  e2.start(0);
  e2.advance(30 * S);
  assert.equal(e2.phase.seconds, 60);
});

test('timebox finishes once', () => {
  const e = new Engine(timebox);
  e.start(0);
  const ended = e.tick(600 * S);
  assert.equal(ended.kind, 'focus');
  assert.equal(e.status, 'done');
  assert.equal(e.start(700 * S), false, 'done engines do not restart');
  e.reset();
  assert.equal(e.status, 'idle');
});

test('tabata: prep, then work/rest for N rounds, then done', () => {
  const e = new Engine(tabata);
  assert.equal(e.phase.kind, 'prep');
  const kinds = [];
  let t = 0;
  e.start(t);
  while (e.status !== 'done') {
    t += e.phase.seconds * S;
    const ended = e.tick(t);
    kinds.push(ended.kind);
    e.start(t);
  }
  assert.equal(kinds[0], 'prep');
  assert.equal(kinds.filter((k) => k === 'work').length, 8);
  assert.equal(kinds.filter((k) => k === 'rest').length, 7, 'no rest after the last work');
  assert.equal(e.round, 8);
  assert.equal(t, (10 + 8 * 20 + 7 * 10) * S);
});

test('stopwatch runs up and never ends on its own', () => {
  const e = new Engine(watch);
  e.start(0);
  assert.equal(e.elapsedMs(3600 * S), 3600 * S);
  assert.equal(e.tick(3600 * S), null);
  assert.equal(e.progress(3600 * S), null);
});

test('snapshot/restore survive a reload mid-run', () => {
  const e = new Engine(pomodoro);
  e.start(0);
  e.pause(60 * S);
  e.start(120 * S);
  const snap = JSON.parse(JSON.stringify(e.snapshot()));
  const r = Engine.restore(pomodoro, snap);
  assert.equal(r.status, 'running');
  assert.equal(r.remainingMs(180 * S), (1500 - 120) * S);
  // a snapshot from another preset is ignored
  const other = Engine.restore(flow, snap);
  assert.equal(other.status, 'idle');
  assert.equal(other.phase.seconds, null);
});

test('progress goes 0..1 for countdowns', () => {
  const e = new Engine(timebox);
  assert.equal(e.progress(0), 0);
  e.start(0);
  assert.equal(e.progress(300 * S), 0.5);
  assert.equal(e.progress(900 * S), 1);
});

test('formatClock', () => {
  assert.equal(formatClock(0), '00:00');
  assert.equal(formatClock(1), '00:01', 'ceil so 0.001s still shows 1');
  assert.equal(formatClock(1500 * S), '25:00');
  assert.equal(formatClock(5400 * S), '1:30:00');
  assert.equal(formatClock(61 * S + 400, { ceil: false }), '01:01');
});
