// This TV's own switches (Ustawienia → Optymalizacja), kept in its storage. Both default on; a weaker TV can turn
// them off: frosted glass under the home screen's tiles, and the motion (slides, fades, growing focus).
const KEY = "homedeck-prefs";
const DEFAULTS = { frost: true, anim: true };

export function prefs() {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { /* storage blocked */ }
  return { ...DEFAULTS, ...saved };
}
export function setPref(key, value) {
  const p = { ...prefs(), [key]: value };
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) { /* storage blocked: this session only */ }
  applyPrefs();
}
export function applyPrefs() {
  const p = prefs();
  document.body.classList.toggle("frost", p.frost);
  document.body.classList.toggle("no-anim", !p.anim);
}
export const animOn = () => !document.body.classList.contains("no-anim");
