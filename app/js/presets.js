// Built-in timer techniques. Durations in seconds. Users can edit the numbers of any
// preset (stored as overrides) and reset them back to these defaults.
//
// `fields` lists which numeric fields the settings panel shows for a preset.

export const DEFAULT_PRESETS = [
  {
    id: 'pomodoro', kind: 'cycle', icon: '🍅',
    focus: 25 * 60, short: 5 * 60, long: 15 * 60, longEvery: 4, rounds: 0,
    fields: ['focus', 'short', 'long', 'longEvery', 'rounds'],
  },
  {
    id: 'fiftytwo', kind: 'cycle', icon: '⌛',
    focus: 52 * 60, short: 17 * 60, long: 0, longEvery: 0, rounds: 0,
    fields: ['focus', 'short', 'rounds'],
  },
  {
    id: 'ultradian', kind: 'cycle', icon: '🌊',
    focus: 90 * 60, short: 20 * 60, long: 0, longEvery: 0, rounds: 0,
    fields: ['focus', 'short', 'rounds'],
  },
  {
    id: 'animedoro', kind: 'cycle', icon: '📺',
    focus: 60 * 60, short: 20 * 60, long: 0, longEvery: 0, rounds: 0,
    fields: ['focus', 'short', 'rounds'],
  },
  {
    id: 'flowtime', kind: 'ratio', icon: '🌀',
    ratio: 5, minBreak: 2 * 60, maxBreak: 30 * 60,
    fields: ['ratio', 'minBreak', 'maxBreak'],
  },
  {
    id: 'thirdtime', kind: 'ratio', icon: '⅓',
    ratio: 3, minBreak: 2 * 60, maxBreak: 60 * 60,
    fields: ['ratio', 'minBreak', 'maxBreak'],
  },
  {
    id: 'eyes', kind: 'cycle', icon: '👀',
    focus: 20 * 60, short: 20, long: 0, longEvery: 0, rounds: 0,
    labels: { focus: 'phase.screen', short: 'phase.look' },
    fields: ['focus', 'short'],
  },
  {
    id: 'timebox', kind: 'single', icon: '📦',
    focus: 30 * 60,
    fields: ['focus'],
  },
  {
    id: 'stopwatch', kind: 'stopwatch', icon: '⏱',
    fields: [],
  },
  {
    id: 'tabata', kind: 'interval', icon: '🔥',
    prep: 10, work: 20, rest: 10, rounds: 8,
    labels: { work: 'phase.work', rest: 'phase.rest' },
    fields: ['prep', 'work', 'rest', 'rounds'],
  },
  {
    id: 'custom', kind: 'cycle', icon: '✎',
    focus: 45 * 60, short: 10 * 60, long: 30 * 60, longEvery: 3, rounds: 0,
    fields: ['focus', 'short', 'long', 'longEvery', 'rounds'],
  },
];

// Field metadata: unit and sane bounds for the settings inputs.
export const FIELDS = {
  focus: { unit: 'min', min: 1, max: 600 },
  short: { unit: 'min', min: 0.25, max: 120, step: 0.25 },
  long: { unit: 'min', min: 0, max: 180 },
  longEvery: { unit: 'count', min: 0, max: 12 },
  rounds: { unit: 'count', min: 0, max: 99 },
  ratio: { unit: 'ratio', min: 1, max: 20 },
  minBreak: { unit: 'min', min: 0, max: 60 },
  maxBreak: { unit: 'min', min: 1, max: 240 },
  prep: { unit: 'sec', min: 0, max: 120 },
  work: { unit: 'sec', min: 1, max: 3600 },
  rest: { unit: 'sec', min: 0, max: 3600 },
};

export function applyOverrides(defaults, overrides) {
  return defaults.map((p) => {
    const o = overrides?.[p.id];
    if (!o) return p;
    const out = { ...p };
    for (const f of p.fields) if (typeof o[f] === 'number' && Number.isFinite(o[f])) out[f] = o[f];
    return out;
  });
}

// Phase label key for a preset/phase, honouring per-preset overrides (20-20-20, Tabata).
export function phaseLabelKey(preset, kind) {
  return preset.labels?.[kind] ?? `phase.${kind}`;
}
