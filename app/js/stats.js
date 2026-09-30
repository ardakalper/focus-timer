// Session log and derived statistics. The log is an array of
// { t: endTimeMs, p: presetId, s: focusSeconds } for completed (or skipped) focus phases.

export const MIN_LOGGED_SECONDS = 60;

export function dayKey(ms, tz) {
  const d = new Date(ms);
  // local calendar day, YYYY-MM-DD
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function appendSession(log, entry) {
  const next = log.concat([entry]);
  // keep the log bounded: ~2 years of heavy use
  return next.length > 20000 ? next.slice(next.length - 20000) : next;
}

export function totalsByDay(log) {
  const map = new Map();
  for (const e of log) {
    const k = dayKey(e.t);
    const cur = map.get(k) ?? { seconds: 0, sessions: 0 };
    cur.seconds += e.s;
    cur.sessions += 1;
    map.set(k, cur);
  }
  return map;
}

export function today(log, now) {
  return totalsByDay(log).get(dayKey(now)) ?? { seconds: 0, sessions: 0 };
}

// Consecutive days with at least one session, counting back from today
// (or from yesterday if today has none yet, so a streak is not "broken" at 9am).
export function streak(log, now) {
  const days = totalsByDay(log);
  let d = new Date(now);
  d.setHours(12, 0, 0, 0);
  if (!days.has(dayKey(d.getTime()))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days.has(dayKey(d.getTime()))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

// Last `n` days ending today: [{ key, seconds, sessions }]
export function lastDays(log, now, n = 7) {
  const days = totalsByDay(log);
  const out = [];
  const d = new Date(now);
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - (n - 1));
  for (let i = 0; i < n; i++) {
    const key = dayKey(d.getTime());
    out.push({ key, weekday: d.getDay(), ...(days.get(key) ?? { seconds: 0, sessions: 0 }) });
    d.setDate(d.getDate() + 1);
  }
  return out;
}

export function formatDuration(seconds, lang = 'en') {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  const hu = lang === 'tr' ? 'sa' : 'h';
  const mu = lang === 'tr' ? 'dk' : 'm';
  if (h === 0) return `${m} ${mu}`;
  if (m === 0) return `${h} ${hu}`;
  return `${h} ${hu} ${m} ${mu}`;
}
