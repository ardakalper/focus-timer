// localStorage wrapper. Every read/write is guarded: private windows and blocked
// storage must never break the app, only forget things.
const NS = 'ft:';

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(NS + key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(NS + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function remove(key) {
  try {
    localStorage.removeItem(NS + key);
  } catch { /* ignore */ }
}
