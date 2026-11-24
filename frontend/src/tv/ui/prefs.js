// This TV's own settings (Ustawienia), kept in its storage:
//   glass           the tiles: "frost" (frosted glass, the blurred wallpaper), "solid" (full colour in the wallpaper's
//                   hue, the lightest for the TV) or "clear" (plain translucent glass)
//   ring            a ring in the accent colour around the focused item (off: the focused tile is only lit and grown)
//   anim            Wydajność: the motion (slides, fades, growing focus); a weaker TV can turn it off
//   saver, exit     minutes without a key press before the screensaver / before the app closes (0 = never);
//                   null follows Alvuna's options in Home Assistant (tv_screensaver_minutes, tv_idle_minutes)
//   dim, shift      OLED care: dim the screen halfway to the screensaver; move the picture a few pixels now and then
const KEY = "homedeck-prefs";
const DEFAULTS = { glass: "frost", ring: false, anim: true, saver: null, exit: null, dim: true, shift: true };
// The values left/right (and OK, for glass) step through.
export const STEPS = { glass: ["frost", "solid", "clear"], saver: [0, 1, 2, 3, 5, 10, 15, 30, 60], exit: [0, 5, 10, 15, 30, 60, 120, 240] };
// Minutes in effect for "saver" or "exit": this TV's own choice, else Home Assistant's, else the default.
export const minutesFor = (key, config) => prefs()[key]
  ?? Number(config?.[key === "saver" ? "tv_screensaver_minutes" : "tv_idle_minutes"] ?? (key === "saver" ? 2 : 10));

export function prefs() {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { /* storage blocked */ }
  // Before the choice of three, glass was a frost switch: off meant the plain translucent tiles.
  if (saved.glass == null && saved.frost === false) saved.glass = "clear";
  delete saved.frost;
  return { ...DEFAULTS, ...saved };
}
export function setPref(key, value) {
  const p = { ...prefs(), [key]: value };
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) { /* storage blocked: this session only */ }
  applyPrefs();
}
export function applyPrefs() {
  const p = prefs();
  document.body.classList.toggle("frost", p.glass === "frost");
  document.body.classList.toggle("solid", p.glass === "solid");
  document.body.classList.toggle("focus-ring", p.ring); // not "ring": .ring is the progress ring's class
  document.body.classList.toggle("no-anim", !p.anim);
}
// One step of a setting with STEPS: minutes from the value in effect (this TV's or Home Assistant's), clamped at the
// ends; a choice (glass) goes round.
export function stepPref(key, step, config) {
  const steps = STEPS[key];
  if (key === "glass") {
    const i = steps.indexOf(prefs().glass);
    return setPref(key, steps[(i + step + steps.length) % steps.length]);
  }
  const cur = minutesFor(key, config);
  let i = steps.indexOf(cur);
  if (i < 0) i = step > 0 ? steps.findIndex((v) => v > cur) - 1 : steps.findIndex((v) => v >= cur);
  setPref(key, steps[Math.max(0, Math.min(steps.length - 1, (i < 0 ? steps.length - 1 : i) + step))]);
}
export const animOn = () => !document.body.classList.contains("no-anim");
