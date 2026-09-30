// UI controller: wires the pure engine to the DOM, storage, sound, notifications.
import { Engine, FOCUS_KINDS, BREAK_KINDS, formatClock } from './engine.js';
import { DEFAULT_PRESETS, FIELDS, applyOverrides, phaseLabelKey } from './presets.js';
import { t, setLang, getLang, detectLang, LANGS } from './i18n.js';
import * as store from './store.js';
import * as stats from './stats.js';
import * as audio from './audio.js';

const DEFAULT_SETTINGS = {
  lang: null, // null = detect
  theme: 'auto',
  autoBreak: true,
  autoFocus: false,
  sound: true,
  volume: 0.6,
  tick: false,
  notify: false,
  title: true,
  wake: true,
  goal: 8,
};

const $ = (sel) => document.querySelector(sel);
const el = {
  stage: $('#stage'), presets: $('#presets'), phaseLabel: $('#phase-label'), ringFg: $('#ring-fg'),
  time: $('#time'), sub: $('#sub'), dots: $('#dots'), main: $('#btn-main'), skip: $('#btn-skip'), reset: $('#btn-reset'),
  desc: $('#desc'), today: $('#today'), hint: $('#hint'), install: $('#btn-install'),
  dlgSettings: $('#dlg-settings'), dlgStats: $('#dlg-stats'), presetFields: $('#preset-fields'),
  settingsPresetName: $('#settings-preset-name'), statsBody: $('#stats-body'), notifyNote: $('#notify-note'),
};

const state = {
  settings: { ...DEFAULT_SETTINGS, ...store.load('settings', {}) },
  overrides: store.load('overrides', {}),
  presetId: store.load('preset', 'pomodoro'),
  log: store.load('log', []),
  presets: [],
  engine: null,
  lastTickSecond: null,
  wakeLock: null,
  installPrompt: null,
};

const now = () => Date.now();

function preset() {
  return state.presets.find((p) => p.id === state.presetId) ?? state.presets[0];
}

function rebuildPresets() {
  state.presets = applyOverrides(DEFAULT_PRESETS, state.overrides);
}

function saveSettings() {
  store.save('settings', state.settings);
}

function saveEngine() {
  store.save('engine', state.engine.snapshot());
}

// ---------- phase transitions ----------

function shouldAutoStart(p, phase) {
  if (phase.kind === 'done') return false;
  if (p.auto || p.kind === 'interval' || p.id === 'eyes') return true;
  if (FOCUS_KINDS.has(phase.kind)) return state.settings.autoFocus;
  if (BREAK_KINDS.has(phase.kind)) return state.settings.autoBreak;
  return true;
}

// `ended` is the record returned by engine.advance/tick. Logs focus time, alerts,
// and auto-starts the next phase at the moment the previous one ended.
function onPhaseEnded(ended, { silent = false } = {}) {
  const p = preset();
  const e = state.engine;
  if (FOCUS_KINDS.has(ended.kind) && ended.elapsedSec >= stats.MIN_LOGGED_SECONDS) {
    state.log = stats.appendSession(state.log, { t: ended.at, p: p.id, s: ended.elapsedSec });
    store.save('log', state.log);
  }
  if (!silent) {
    const nextKind = e.phase.kind;
    if (state.settings.sound) {
      if (nextKind === 'done') audio.chime('done', state.settings.volume);
      else if (p.kind === 'interval') audio.chime('beep', state.settings.volume);
      else audio.chime(FOCUS_KINDS.has(ended.kind) ? 'focus' : 'break', state.settings.volume);
    }
    notify(ended, nextKind);
  }
  if (shouldAutoStart(p, e.phase)) e.start(ended.at);
  saveEngine();
}

// Called on every tick and on wake-up: finish every phase whose end time has passed.
function catchUp(ts) {
  let guard = 0;
  while (guard++ < 1000) {
    const ended = state.engine.tick(ts);
    if (!ended) break;
    // Alerts for phases that ended long ago (tab asleep) would be noise: only the latest one sounds.
    const more = state.engine.status === 'running' && state.engine.endsAt() <= ts;
    onPhaseEnded(ended, { silent: more });
  }
}

function notify(ended, nextKind) {
  if (!state.settings.notify || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  const p = preset();
  let body;
  if (nextKind === 'done') body = t('notif.done');
  else if (p.id === 'eyes' && nextKind === 'short') body = t('notif.look');
  else if (FOCUS_KINDS.has(ended.kind)) body = t('notif.focusEnd', { next: formatClock(state.engine.phase.seconds * 1000) });
  else body = t('notif.breakEnd');
  try {
    const n = new Notification(t('app.name'), { body, icon: 'icons/icon-192.png', tag: 'focus-timer', renotify: true, silent: true });
    n.onclick = () => { window.focus(); n.close(); };
  } catch { /* some browsers only allow notifications from a service worker */ }
}

// ---------- actions ----------

function setPreset(id, { force = false } = {}) {
  if (id === state.presetId && state.engine) return;
  if (!state.presets.some((p) => p.id === id)) return;
  if (!force && state.engine?.status === 'running') state.engine.pause(now());
  state.presetId = id;
  store.save('preset', id);
  state.engine = new Engine(preset());
  saveEngine();
  renderAll();
}

function mainAction() {
  audio.unlock();
  const e = state.engine;
  if (e.status === 'done') { e.reset(); saveEngine(); renderAll(); return; }
  e.toggle(now());
  saveEngine();
  render();
}

function skipAction() {
  audio.unlock();
  const e = state.engine;
  if (e.status === 'done') return;
  const ended = e.advance(now(), 'skipped');
  if (ended) onPhaseEnded(ended, { silent: true });
  renderAll();
}

function resetAction() {
  state.engine.reset();
  saveEngine();
  renderAll();
}

// ---------- rendering ----------

function applyTheme() {
  const th = state.settings.theme;
  if (th === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.dataset.theme = th;
}

function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach((n) => { n.textContent = t(n.dataset.i18n); });
  document.querySelectorAll('[data-i18n-title]').forEach((n) => { n.title = t(n.dataset.i18nTitle); n.setAttribute('aria-label', t(n.dataset.i18nTitle)); });
  el.hint.textContent = t('hint.space');
}

function renderPresets() {
  el.presets.replaceChildren(...state.presets.map((p, i) => {
    const b = document.createElement('button');
    b.className = 'chip';
    b.type = 'button';
    b.dataset.preset = p.id;
    b.setAttribute('aria-pressed', String(p.id === state.presetId));
    b.title = `${t(`preset.${p.id}.desc`)}${i < 9 ? `  [${i + 1}]` : ''}`;
    b.innerHTML = `<span class="ico" aria-hidden="true">${p.icon}</span><span>${t(`preset.${p.id}`)}</span>`;
    b.addEventListener('click', () => setPreset(p.id));
    return b;
  }));
}

function renderDots() {
  const p = preset();
  const e = state.engine;
  let total = 0;
  if (p.kind === 'cycle') total = p.rounds > 0 ? p.rounds : (p.longEvery > 0 ? p.longEvery : 0);
  if (p.kind === 'interval') total = p.rounds;
  if (total <= 0 || total > 12) { el.dots.replaceChildren(); return; }
  let filled = p.rounds > 0 || p.kind === 'interval' ? e.round : e.round % total;
  if (p.rounds === 0 && p.kind === 'cycle' && e.round > 0 && e.round % total === 0 && e.phase.kind !== 'focus') filled = total;
  el.dots.replaceChildren(...Array.from({ length: total }, (_, i) => {
    const d = document.createElement('span');
    d.className = 'dot' + (i < filled ? ' on' : '');
    return d;
  }));
}

function renderToday() {
  const td = stats.today(state.log, now());
  const st = stats.streak(state.log, now());
  const parts = [t('today.summary', { sessions: `<b>${td.sessions}</b>`, time: `<b>${stats.formatDuration(td.seconds, getLang())}</b>` })];
  if (state.settings.goal > 0) parts.push(t('today.goal', { done: td.sessions, goal: state.settings.goal }));
  if (st > 1) parts.push(t('streak', { n: st }));
  el.today.innerHTML = parts.join(' · ');
}

// Cheap per-tick render: time, ring, title, tick sound.
function render() {
  const e = state.engine;
  const p = preset();
  const ts = now();
  catchUp(ts);
  if (e.status !== el.stage.dataset.status || e.phase.kind !== el.stage.dataset.phase) return renderAll();

  let text;
  if (e.phase.kind === 'done') text = '✓';
  else if (e.isCountdown) text = formatClock(e.remainingMs(ts));
  else text = formatClock(e.elapsedMs(ts), { ceil: false });
  if (el.time.textContent !== text) el.time.textContent = text;
  el.time.classList.toggle('long', text.length > 5);

  const prog = e.progress(ts);
  el.ringFg.style.strokeDashoffset = prog == null ? (e.status === 'running' ? 0 : 1) : String(prog);
  if (prog == null && e.status === 'running') el.ringFg.style.strokeDashoffset = String(1 - ((ts / 1000) % 60) / 60);

  if (state.settings.title && e.status === 'running' && e.phase.kind !== 'done') {
    document.title = `${text} · ${t(phaseLabelKey(p, e.phase.kind))} — ${t('app.name')}`;
  } else if (document.title !== t('app.name')) {
    document.title = t('app.name');
  }

  if (state.settings.tick && state.settings.sound && e.status === 'running' && FOCUS_KINDS.has(e.phase.kind)) {
    const sec = Math.floor(ts / 1000);
    if (sec !== state.lastTickSecond) { state.lastTickSecond = sec; audio.tick(state.settings.volume); }
  }
}

// Full render on phase/status/preset changes.
function renderAll() {
  const e = state.engine;
  const p = preset();
  el.stage.dataset.phase = e.phase.kind;
  el.stage.dataset.status = e.status;
  el.phaseLabel.textContent = t(phaseLabelKey(p, e.phase.kind));
  el.desc.textContent = t(`preset.${p.id}.desc`);
  document.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.preset === p.id)));

  if (e.status === 'done') el.main.textContent = t('btn.again');
  else if (e.status === 'running') el.main.textContent = t('btn.pause');
  else if (e.status === 'paused') el.main.textContent = t('btn.resume');
  else el.main.textContent = t('btn.start');

  const openEnded = !e.isCountdown && e.phase.kind !== 'done';
  el.skip.disabled = e.status === 'done';
  el.skip.title = t(openEnded ? 'btn.finish' : 'btn.skip');
  el.skip.setAttribute('aria-label', el.skip.title);
  el.skip.innerHTML = openEnded
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l10 7-10 7zM19 5v14" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';

  // sub line: round counter, or "next up" hint
  let sub = '';
  if (e.phase.kind === 'done') sub = t('phase.done');
  else if (p.kind === 'interval') sub = t('round.of', { n: Math.min(e.round + (e.phase.kind === 'work' ? 1 : 0), p.rounds), total: p.rounds });
  else if (p.kind === 'cycle' && p.rounds > 0) sub = t('round.of', { n: Math.min(e.round + (e.phase.kind === 'focus' ? 1 : 0), p.rounds), total: p.rounds });
  else if (p.kind === 'cycle' || p.kind === 'ratio') sub = t('round.n', { n: e.round + (e.phase.kind === 'focus' ? 1 : 0) });
  else if (p.kind === 'stopwatch') sub = t('elapsed');
  el.sub.textContent = sub;

  el.hint.textContent = p.kind === 'ratio' && e.phase.kind === 'focus' ? t('hint.flow') : t('hint.space');
  renderDots();
  renderToday();
  render();
  updateWakeLock();
}

// ---------- settings dialog ----------

function fieldValue(f, seconds) {
  const meta = FIELDS[f];
  if (meta.unit === 'min') return +(seconds / 60).toFixed(2);
  return seconds;
}
function fieldToStored(f, v) {
  const meta = FIELDS[f];
  const n = Math.min(meta.max, Math.max(meta.min, Number(v)));
  if (!Number.isFinite(n)) return null;
  return meta.unit === 'min' ? Math.round(n * 60) : Math.round(n);
}

function renderPresetFields() {
  const p = preset();
  el.settingsPresetName.textContent = `${p.icon} ${t(`preset.${p.id}`)}`;
  el.presetFields.replaceChildren(...p.fields.map((f) => {
    const meta = FIELDS[f];
    const label = document.createElement('label');
    label.className = 'row';
    const input = document.createElement('input');
    input.type = 'number';
    input.min = meta.min; input.max = meta.max; input.step = meta.step ?? (meta.unit === 'min' ? 1 : 1);
    input.value = fieldValue(f, p[f]);
    input.dataset.field = f;
    input.addEventListener('change', () => {
      const stored = fieldToStored(f, input.value);
      if (stored == null) { input.value = fieldValue(f, p[f]); return; }
      state.overrides[p.id] = { ...(state.overrides[p.id] ?? {}), [f]: stored };
      store.save('overrides', state.overrides);
      applyPresetChange();
      input.value = fieldValue(f, preset()[f]);
    });
    const unit = document.createElement('span');
    unit.className = 'unit';
    unit.textContent = t(`unit.${meta.unit}`);
    const right = document.createElement('span');
    right.className = 'inline';
    right.append(input, unit);
    label.append(Object.assign(document.createElement('span'), { textContent: t(`f.${f}`) }), right);
    return label;
  }));
}

// Durations changed: if idle at the start of a phase, reload it; otherwise apply from the next phase on.
function applyPresetChange() {
  rebuildPresets();
  const e = state.engine;
  const p = preset();
  e.preset = p;
  if (e.status === 'idle' && e.accum === 0) {
    const fresh = new Engine(p);
    if (e.round === 0) e.phase = fresh.phase;
    else if (e.phase.seconds != null) {
      // same kind, new length
      const kind = e.phase.kind;
      const secs = kind === 'focus' ? p.focus : kind === 'short' ? p.short : kind === 'long' ? p.long : kind === 'work' ? p.work : kind === 'rest' ? p.rest : kind === 'prep' ? p.prep : e.phase.seconds;
      if (typeof secs === 'number') e.phase = { kind, seconds: secs };
    }
  }
  saveEngine();
  renderPresets();
  renderAll();
}

function bindSettings() {
  document.querySelectorAll('[data-setting]').forEach((input) => {
    const key = input.dataset.setting;
    const sync = () => {
      const v = state.settings[key];
      if (input.type === 'checkbox') input.checked = Boolean(v);
      else if (key === 'lang') input.value = getLang();
      else input.value = v;
    };
    sync();
    input.addEventListener('change', async () => {
      let v;
      if (input.type === 'checkbox') v = input.checked;
      else if (input.type === 'range' || input.type === 'number') v = Number(input.value);
      else v = input.value;
      if (key === 'notify' && v) {
        const ok = await ensureNotifications();
        el.notifyNote.hidden = ok;
        if (!ok) { v = false; input.checked = false; }
      }
      state.settings[key] = v;
      saveSettings();
      if (key === 'theme') applyTheme();
      if (key === 'lang') { setLang(v); applyI18n(); renderPresets(); renderPresetFields(); }
      if (key === 'volume' || key === 'sound') { audio.unlock(); if (state.settings.sound && key === 'volume') audio.chime('beep', state.settings.volume); }
      if (key === 'wake') updateWakeLock();
      renderAll();
    });
    input._sync = sync;
  });
  $('#btn-test-sound').addEventListener('click', () => { audio.unlock(); audio.chime('focus', state.settings.volume); });
  $('#btn-defaults').addEventListener('click', () => {
    delete state.overrides[state.presetId];
    store.save('overrides', state.overrides);
    applyPresetChange();
    renderPresetFields();
  });
  $('#btn-export').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), sessions: state.log }, null, 1)], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `focus-timer-log-${stats.dayKey(now())}.json` });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  $('#btn-clear').addEventListener('click', () => {
    if (!confirm(t('confirm.clear'))) return;
    state.log = [];
    store.save('log', state.log);
    renderToday();
  });
}

async function ensureNotifications() {
  if (typeof Notification === 'undefined') return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  try { return (await Notification.requestPermission()) === 'granted'; } catch { return false; }
}

function openSettings() {
  renderPresetFields();
  document.querySelectorAll('[data-setting]').forEach((i) => i._sync?.());
  el.notifyNote.hidden = true;
  el.dlgSettings.showModal();
}

// ---------- stats dialog ----------

function renderStats() {
  const ts = now();
  const lang = getLang();
  if (state.log.length === 0) {
    el.statsBody.innerHTML = `<p class="empty-msg">${t('stats.empty')}</p>`;
    return;
  }
  const td = stats.today(state.log, ts);
  const week = stats.lastDays(state.log, ts, 7);
  const weekSec = week.reduce((a, d) => a + d.seconds, 0);
  const total = state.log.reduce((a, e) => a + e.s, 0);
  const max = Math.max(1, ...week.map((d) => d.seconds));
  const stat = (v, k) => `<div class="stat"><div class="v">${v}</div><div class="k">${k}</div></div>`;
  el.statsBody.innerHTML = `
    <div class="stat-grid">
      ${stat(stats.formatDuration(td.seconds, lang), `${t('stats.today')} · ${td.sessions} ${t('stats.sessions')}`)}
      ${stat(stats.formatDuration(weekSec, lang), t('stats.week'))}
      ${stat(stats.formatDuration(total, lang), `${t('stats.total')} · ${state.log.length} ${t('stats.sessions')}`)}
    </div>
    <div class="bars">
      ${week.map((d) => `
        <div class="bar" title="${d.key}: ${stats.formatDuration(d.seconds, lang)}">
          <div class="fill${d.seconds ? '' : ' empty'}" style="height:${Math.max(2, Math.round((d.seconds / max) * 100))}%"></div>
          <div class="n">${d.sessions || ''}</div>
          <div>${t(`weekday.${d.weekday}`)}</div>
        </div>`).join('')}
    </div>
    <p class="streak-line">${t('streak', { n: stats.streak(state.log, ts) })}</p>`;
}

// ---------- misc platform ----------

async function updateWakeLock() {
  const want = state.settings.wake && state.engine.status === 'running' && document.visibilityState === 'visible';
  try {
    if (want && !state.wakeLock && navigator.wakeLock) {
      state.wakeLock = await navigator.wakeLock.request('screen');
      state.wakeLock.addEventListener('release', () => { state.wakeLock = null; });
    } else if (!want && state.wakeLock) {
      await state.wakeLock.release();
      state.wakeLock = null;
    }
  } catch { state.wakeLock = null; }
}

function bindKeys() {
  document.addEventListener('keydown', (ev) => {
    if (ev.defaultPrevented || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    const tag = ev.target?.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || el.dlgSettings.open || el.dlgStats.open) return;
    if (ev.code === 'Space' || ev.key === 'Enter') { ev.preventDefault(); mainAction(); }
    else if (ev.key === 'n' || ev.key === 'N') skipAction();
    else if (ev.key === 'r' || ev.key === 'R') resetAction();
    else if (ev.key === 's' || ev.key === 'S') openSettings();
    else if (ev.key === 'i' || ev.key === 'I') { renderStats(); el.dlgStats.showModal(); }
    else if (/^[1-9]$/.test(ev.key)) { const p = state.presets[Number(ev.key) - 1]; if (p) setPreset(p.id); }
  });
}

function bindInstall() {
  window.addEventListener('beforeinstallprompt', (ev) => {
    ev.preventDefault();
    state.installPrompt = ev;
    el.install.hidden = false;
  });
  el.install.addEventListener('click', async () => {
    if (!state.installPrompt) return;
    state.installPrompt.prompt();
    await state.installPrompt.userChoice.catch(() => {});
    state.installPrompt = null;
    el.install.hidden = true;
  });
  if ('serviceWorker' in navigator && location.protocol !== 'file:' && !new URLSearchParams(location.search).has('nosw')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

// ---------- boot ----------

function boot() {
  setLang(state.settings.lang && LANGS.includes(state.settings.lang) ? state.settings.lang : detectLang());
  applyTheme();
  rebuildPresets();
  if (!state.presets.some((p) => p.id === state.presetId)) state.presetId = 'pomodoro';
  state.engine = Engine.restore(preset(), store.load('engine', null));
  catchUp(now());

  applyI18n();
  renderPresets();
  bindSettings();
  bindKeys();
  bindInstall();
  el.main.addEventListener('click', mainAction);
  el.skip.addEventListener('click', skipAction);
  el.reset.addEventListener('click', resetAction);
  $('#btn-settings').addEventListener('click', openSettings);
  $('#btn-stats').addEventListener('click', () => { renderStats(); el.dlgStats.showModal(); });
  el.dlgSettings.addEventListener('close', renderAll);
  document.addEventListener('visibilitychange', () => { render(); updateWakeLock(); });
  window.addEventListener('pagehide', saveEngine);

  renderAll();
  setInterval(render, 250);

  // test hook: lets end-to-end tests inspect state without poking the DOM
  window.__ft = { state, preset, Engine };
}

boot();
