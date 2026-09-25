const prefix = 'arcade-lab:';
export function get(key, fallback = null) {
  try { const value = localStorage.getItem(prefix + key); return value === null ? fallback : JSON.parse(value); }
  catch { return fallback; }
}
export function set(key, value) {
  try { localStorage.setItem(prefix + key, JSON.stringify(value)); } catch { /* Storage is optional. */ }
}
export function best(slug, score = 0) {
  const stored = get(`best:${slug}`, 0);
  const value = Math.max(Number.isFinite(stored) && stored >= 0 ? stored : 0, Number.isFinite(score) ? score : 0);
  set(`best:${slug}`, value);
  return value;
}
