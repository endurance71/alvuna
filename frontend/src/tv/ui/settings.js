// This TV's settings as one object, for the Alvuna panel's Televisions tab: what the TV reports to Home Assistant, and
// what the panel sends it (alvuna/tvs/settings, see custom_components/alvuna/tv.py). Each is kept where the TV's own
// Settings keep it (wallpapers.js, accents.js, prefs.js); a wallpaper or accent this app does not know is left alone.
import { WALLPAPERS, currentWallpaper, setWallpaper } from "./wallpapers.js";
import { ACCENTS, currentAccent, setAccent } from "./accents.js";
import { prefs, setPref } from "./prefs.js";

const PREF_KEYS = ["glass", "ring", "anim", "dim", "shift", "saver", "exit"];
const REV_KEY = "alvuna-settings-rev"; // the revision of the panel's settings this TV last applied

export function currentSettings() {
  const p = prefs(), out = { wallpaper: currentWallpaper().id, accent: currentAccent().id };
  for (const k of PREF_KEYS) out[k] = p[k];
  return out;
}

// Applies what the panel sent; true when the wallpaper changed (the frosted glass then needs its new blur).
export function applySettings(s = {}, rev) {
  let wallpaper = false;
  if (s.wallpaper && s.wallpaper !== currentWallpaper().id && WALLPAPERS.some((w) => w.id === s.wallpaper)) {
    setWallpaper(s.wallpaper);
    wallpaper = true;
  }
  if (s.accent && s.accent !== currentAccent().id && ACCENTS.some((a) => a.id === s.accent)) setAccent(s.accent);
  const p = prefs();
  for (const k of PREF_KEYS) if (k in s && s[k] !== p[k]) setPref(k, s[k]);
  if (rev != null) { try { localStorage.setItem(REV_KEY, String(rev)); } catch (e) { /* storage blocked */ } }
  return wallpaper;
}

export function settingsRev() {
  try { return Number(localStorage.getItem(REV_KEY)) || 0; } catch (e) { return 0; }
}
