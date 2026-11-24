// Wording and number formats, taken over from the tablet card (src/card/alvuna-card.js) so both read the same.

import { t, table, date } from "../../shared/i18n.js";

// Weather condition icons; the words are weather.conditions in the i18n tables (the TV has room for the long
// "partly cloudy").
const WEATHER_ICON = {
  "clear-night": "mdi:weather-night", cloudy: "mdi:weather-cloudy", exceptional: "mdi:alert-circle-outline", fog: "mdi:weather-fog",
  hail: "mdi:weather-hail", lightning: "mdi:weather-lightning", "lightning-rainy": "mdi:weather-lightning-rainy",
  partlycloudy: "mdi:weather-partly-cloudy", pouring: "mdi:weather-pouring", rainy: "mdi:weather-rainy", snowy: "mdi:weather-snowy",
  "snowy-rainy": "mdi:weather-snowy-rainy", sunny: "mdi:weather-sunny", windy: "mdi:weather-windy", "windy-variant": "mdi:weather-windy-variant",
};
export const wxWord = (cond) => (cond === "partlycloudy" ? t("weather.partlycloudy_long") : table("weather.conditions")[cond]);
export const wIcon = (cond, night) => (cond === "partlycloudy" && night ? "mdi:weather-night-partly-cloudy"
  : WEATHER_ICON[cond] || "mdi:weather-partly-cloudy");

// What an open (or wet) binary sensor means, by device class: security.alert, and security.calm for closed (or dry).
export const alertWord = (dc) => table("security.alert")[dc];
export const calmWord = (dc) => table("security.calm")[dc];

// GIOŚ air quality (weather.air) and IMGW-PIB warnings (weather.imgw) are worded by the i18n tables.
export const AIR_BAD = ["sufficient", "bad", "very_bad"];

// Streaming apps a TV can only name: [match on app id, name or source, logo in /local/logos/, background, paint white].
export const BRANDS = [
  [/hbo ?max/, "hbomax", "linear-gradient(135deg,#0b0b2b,#2b1bd1)", true], [/netflix/, "netflix", "#000"],
  [/prime|amazon/, "primevideo", "linear-gradient(135deg,#1a98ff,#0a5fd8)", true],
  [/disney/, "disneyplus", "linear-gradient(135deg,#0b1a5c,#1f3dd6)", true], [/canal/, "canalplus", "#000"],
  [/skyshowtime|sky ?show/, "skyshowtime", "linear-gradient(135deg,#120f3a,#3a1d8c)", true],
  [/\bmax\b|com\.wbd\.stream/, "max", "#002be7", true], [/apple ?tv|com\.apple/, "appletv", "#000", true],
  [/youtube/, "youtube", "#fff"], [/polsat/, "polsatboxgo", "#000"], [/spotify/, "spotify", "#000"],
  [/play ?now|playnow/, "playnow", "linear-gradient(135deg,#2a0f4f,#6a2bb8)", true],
  [/tvn\.player|\bplayer\.pl\b|^player$/, "player", "linear-gradient(135deg,#1b1b1b,#3a3a3a)", true],
  [/tv\.launcherx|com\.tcl\./, "tcl", "linear-gradient(135deg,#9e001e,#e4002b)", true],
];
// What a Google TV reports as the open app (only the package): a readable name.
// Names starting with "media." are i18n keys, not brands.
export const TV_APPS = [
  [/tv\.launcherx/, "media.home_screen"], [/netflix/, "Netflix"], [/amazonvideo|primevideo/, "Prime Video"],
  [/com\.wbd\.stream|hbo/, "Max"], [/youtube\.tvmusic/, "YouTube Music"], [/youtube/, "YouTube"],
  [/canal/, "Canal+"], [/disney/, "Disney+"], [/skyshowtime/, "SkyShowtime"], [/playnow|rodzina\.tvstart/, "PLAY NOW"],
  [/tvn\.player/, "Player"], [/polsat/, "Polsat Box Go"], [/spotify/, "Spotify"], [/tv\.settings|tcl\.settings/, "media.tv_settings"],
];
export const tvApp = (v) => { const n = (TV_APPS.find(([re]) => re.test(v)) || [])[1] || ""; return n.startsWith("media.") ? t(n) : n; };

export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export { num, time } from "../../shared/i18n.js";
// "poniedziałek, 24 listopada": the date over the clock.
export const longDate = (d) => date(d, { weekday: "long", day: "numeric", month: "long" });
export const shortDay = (d) => date(d, { weekday: "short" });
export const ids = (list) => (list || []).map((x) => (typeof x === "string" ? x : x.entity));
export const isNum = (v) => v != null && v !== "" && !isNaN(v);
export const fmtTime = (s) => {
  if (!isFinite(s) || s < 0) return "0:00";
  s = Math.floor(s);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
};
// How long ago: a unit (now, min, hour, day) and a count, worded as "5 min temu" (ago), "5 min" (age) or "od 5 min" (since).
const agoParts = (iso) => {
  const min = Math.round((Date.now() - new Date(iso)) / 60000);
  return min < 1 ? ["now", 0] : min < 60 ? ["min", min] : min < 1440 ? ["hour", Math.round(min / 60)] : ["day", Math.round(min / 1440)];
};
export const ago = (iso) => { const [u, n] = agoParts(iso); return t(`common.ago.${u}`, { n }); };
export const age = (iso) => { const [u, n] = agoParts(iso); return t(`common.age.${u}`, { n }); };
export const since = (iso) => { const [u, n] = agoParts(iso); return t(`common.since.${u}`, { n }); };

// Robot vacuum and WashData appliances, as on the tablet card: cleaning.vacuum_state, cleaning.suction, appliances.state
// and appliances.program in the i18n tables.
export const APP_ACTIVE = ["starting", "running", "paused", "user_paused", "ending", "anti_wrinkle", "delay_wait"];
export const APP_DONE = ["finished", "clean"];
