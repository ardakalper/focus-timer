import { test } from 'node:test';
import assert from 'node:assert/strict';

// i18n touches document.documentElement in setLang; stub a minimal document.
globalThis.document = { documentElement: { lang: '' } };
Object.defineProperty(globalThis, 'navigator', { value: { language: 'tr-TR' }, configurable: true });
const i18n = await import('../app/js/i18n.js');
const stats = await import('../app/js/stats.js');
const { DEFAULT_PRESETS, applyOverrides, phaseLabelKey } = await import('../app/js/presets.js');

test('both languages have the same keys', () => {
  assert.deepEqual(i18n.missingKeys(), []);
});

test('every preset has a name and description in both languages', () => {
  for (const p of DEFAULT_PRESETS) {
    for (const l of ['tr', 'en']) {
      assert.ok(i18n.DICTS[l][`preset.${p.id}`], `${l} preset.${p.id}`);
      assert.ok(i18n.DICTS[l][`preset.${p.id}.desc`], `${l} preset.${p.id}.desc`);
    }
  }
});

test('t() substitutes variables and falls back to English', () => {
  i18n.setLang('tr');
  assert.equal(i18n.t('round.of', { n: 2, total: 4 }), 'Tur 2 / 4');
  assert.equal(i18n.t('nope.key'), 'nope.key');
  assert.equal(i18n.detectLang(), 'tr');
  i18n.setLang('xx');
  assert.equal(i18n.getLang(), 'en');
});

test('overrides only touch declared numeric fields', () => {
  const [pomo] = applyOverrides(DEFAULT_PRESETS, { pomodoro: { focus: 1800, kind: 'hack', bogus: 1, short: 'x' } });
  assert.equal(pomo.focus, 1800);
  assert.equal(pomo.short, 300);
  assert.equal(pomo.kind, 'cycle');
  assert.equal('bogus' in pomo, false);
});

test('phase labels honour per-preset overrides', () => {
  const eyes = DEFAULT_PRESETS.find((p) => p.id === 'eyes');
  assert.equal(phaseLabelKey(eyes, 'focus'), 'phase.screen');
  assert.equal(phaseLabelKey(eyes, 'long'), 'phase.long');
});

const DAY = 86400_000;
// noon on a fixed local day, so day boundaries are unambiguous
const base = new Date(2026, 8, 30, 12, 0, 0).getTime();
const log = [
  { t: base - 2 * DAY, p: 'pomodoro', s: 1500 },
  { t: base - 1 * DAY, p: 'pomodoro', s: 1500 },
  { t: base - 1 * DAY + 3600_000, p: 'fiftytwo', s: 3120 },
  { t: base - 600_000, p: 'pomodoro', s: 1500 },
];

test('today totals and streak', () => {
  assert.deepEqual(stats.today(log, base), { seconds: 1500, sessions: 1 });
  assert.equal(stats.streak(log, base), 3);
  // tomorrow morning, nothing logged yet: streak still counts from yesterday
  assert.equal(stats.streak(log, base + DAY), 3);
  // two days later without sessions: broken
  assert.equal(stats.streak(log, base + 2 * DAY), 0);
});

test('lastDays returns a full week ending today', () => {
  const week = stats.lastDays(log, base, 7);
  assert.equal(week.length, 7);
  assert.equal(week[6].sessions, 1);
  assert.equal(week[5].sessions, 2);
  assert.equal(week[5].seconds, 4620);
  assert.equal(week[0].sessions, 0);
});

test('formatDuration', () => {
  assert.equal(stats.formatDuration(1500, 'en'), '25 m');
  assert.equal(stats.formatDuration(3600, 'en'), '1 h');
  assert.equal(stats.formatDuration(4620, 'tr'), '1 sa 17 dk');
});
