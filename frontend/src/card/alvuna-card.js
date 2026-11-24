// Alvuna style wall-tablet dashboard: clock, home status, scenes, room tiles with light power,
// security, climate and media tiles, plus Rooms / Media / Security tabs and a room sheet.
import { setLocale, t, table, num, int, money, date, time } from "../shared/i18n.js";

// Until the first hass arrives the page's own language stands in (HA sets <html lang> to the user's language).
setLocale({ language: document.documentElement.lang || navigator.language });

// Weather condition icons; the words are in the i18n tables (weather.conditions).
const WEATHER_ICON = {
  "clear-night": "mdi:weather-night", cloudy: "mdi:weather-cloudy", exceptional: "mdi:alert-circle-outline", fog: "mdi:weather-fog",
  hail: "mdi:weather-hail", lightning: "mdi:weather-lightning", "lightning-rainy": "mdi:weather-lightning-rainy",
  partlycloudy: "mdi:weather-partly-cloudy", pouring: "mdi:weather-pouring", rainy: "mdi:weather-rainy", snowy: "mdi:weather-snowy",
  "snowy-rainy": "mdi:weather-snowy-rainy", sunny: "mdi:weather-sunny", windy: "mdi:weather-windy", "windy-variant": "mdi:weather-windy-variant",
};
const wxWord = (cond) => table("weather.conditions")[cond];

// Tab bar glyphs drawn with a thin, even stroke like the iOS tab bar (MDI glyphs are too heavy at this size).
// The selected tab gets the filled version; both keep the same elements so the morph only swaps attributes.
const NAV_ICONS = {
  home: (on) => `<path d="M3.5 10.2 12 3.5l8.5 6.7V19a1.5 1.5 0 0 1-1.5 1.5h-4.2v-6h-5.6v6H5A1.5 1.5 0 0 1 3.5 19z" fill="${on ? "currentColor" : "none"}"/>`,
  rooms: (on) => [[3.5, 3.5], [13.5, 3.5], [3.5, 13.5], [13.5, 13.5]]
    .map(([x, y]) => `<rect x="${x}" y="${y}" width="7" height="7" rx="1.8" fill="${on ? "currentColor" : "none"}"/>`).join(""),
  media: (on) => `<rect x="3" y="4.5" width="18" height="15" rx="3.5" fill="${on ? "currentColor" : "none"}"/>
    <path d="M10 9.2v5.6l4.6-2.8z" fill="${on ? "#F4F7F8" : "currentColor"}" stroke="${on ? "#F4F7F8" : "currentColor"}"/>`,
  clean: (on) => `<path d="M10.5 3.5l1.7 4.6 4.6 1.7-4.6 1.7-1.7 4.6-1.7-4.6-4.6-1.7 4.6-1.7z" fill="${on ? "currentColor" : "none"}"/>
    <path d="M17.5 14l.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9z" fill="${on ? "currentColor" : "none"}"/>`,
  usage: (on) => [[4, 12.5, 4.5], [9.75, 7.5, 9.5], [15.5, 3.5, 13.5]]
    .map(([x, y, h]) => `<rect x="${x}" y="${y}" width="4.5" height="${h}" rx="1.4" fill="${on ? "currentColor" : "none"}"/>`).join("")
    + `<path d="M3 20.5h18"/>`,
  heating: (on) => `<path d="M12 3.2c.9 3.3 5.6 5.6 5.6 10.4a5.6 5.6 0 0 1-11.2 0c0-2.7 1.4-4.5 2.7-5.6.2 1.6.9 2.7 1.9 3.1 0-3.3.2-5.4 1-7.9z" fill="${on ? "currentColor" : "none"}"/>`,
  security: (on) => `<path d="M12 3.2 19 6v5.3c0 4.4-3 8-7 9.6-4-1.6-7-5.2-7-9.6V6z" fill="${on ? "currentColor" : "none"}"/>
    <path d="m8.9 12.1 2.2 2.2 4-4.2" stroke="${on ? "#F4F7F8" : "currentColor"}"/>`,
};

// Tab keys and icons; the labels are tabs.<key> in the i18n tables.
const TABS = [["home", "mdi:home-outline"], ["rooms", "mdi:view-grid-outline"],
  ["media", "mdi:play-box-outline"], ["clean", "mdi:creation-outline"], ["heating", "mdi:fire"], ["usage", "mdi:chart-bar"], ["security", "mdi:shield-check-outline"]];

// Critically damped spring (Apple: damping 1, response ~0.4 s) fitted to a cubic-bezier, so iOS runs it on the compositor.
const EASE_SPRING = "cubic-bezier(.22,1,.36,1)";
// Lite mode for weak wall tablets (config `lite`): no backdrop blur, masks, looping or springy animations.
// Set once per page in setConfig; every animation path below already goes through reducedMotion().
let LITE = false;
const reducedMotion = () => LITE || matchMedia("(prefers-reduced-motion: reduce)").matches;
// `lite: true` turns it on everywhere, a string is a regex tested against the user agent (e.g. the tablet's model),
// and ?lite=1 / ?lite=0 in the address overrides it on this device (kept in localStorage; ?lite=auto clears it).
const liteFor = (cfg) => {
  try {
    const q = new URLSearchParams(location.search).get("lite");
    if (q === "auto") localStorage.removeItem("homedeck-lite");
    else if (q === "1" || q === "0") localStorage.setItem("homedeck-lite", q);
    const forced = localStorage.getItem("homedeck-lite");
    if (forced === "1" || forced === "0") return forced === "1";
  } catch (e) { /* storage blocked */ }
  if (cfg.lite === true) return true;
  if (typeof cfg.lite === "string" && cfg.lite) { try { return new RegExp(cfg.lite, "i").test(navigator.userAgent); } catch (e) { return false; } }
  return false;
};
// TV mode for a TV app or a TV browser (config `tv`), driven by a remote: arrows move focus between controls, OK clicks,
// Back steps out. On by default when the user agent looks like a TV; `tv: false` turns it off, `tv: true` on everywhere,
// a string is a regex for the user agent. ?tv=1 / ?tv=0 override it on this device (kept; ?tv=auto clears it).
let TV = false;
const TV_UA = /Web0S|webOS|SMART-TV|SmartTV|Android TV|GoogleTV|BRAVIA|AFT[A-Z]/i;
const WEBOS = /Web0S|webOS/i.test(navigator.userAgent);
const tvFor = (cfg) => {
  try {
    const q = new URLSearchParams(location.search).get("tv");
    if (q === "auto") localStorage.removeItem("homedeck-tv");
    else if (q === "1" || q === "0") localStorage.setItem("homedeck-tv", q);
    const forced = localStorage.getItem("homedeck-tv");
    if (forced === "1" || forced === "0") return forced === "1";
  } catch (e) { /* storage blocked */ }
  if (cfg.tv === true || cfg.tv === false) return cfg.tv;
  if (typeof cfg.tv === "string" && cfg.tv) { try { return new RegExp(cfg.tv, "i").test(navigator.userAgent); } catch (e) { return false; } }
  return TV_UA.test(navigator.userAgent);
};
const TV_FOCUSABLE = '[role=button]:not([tabindex="-1"]), button:not([disabled]), input:not([disabled]):not([type=hidden]), select, a[href]';
// What identifies a control across re-renders, so focus can come back to "the same" tile after it was rebuilt.
const tvKey = (el) => `${el.dataset.act || el.tagName}|${el.dataset.entity || el.dataset.tab || el.dataset.room || el.dataset.app
  || el.dataset.cam || el.dataset.plant || el.dataset.cmd || el.className}`;
// The focused element through every shadow root, outermost first.
const deepFocusPath = () => {
  const out = [];
  for (let n = document.activeElement; n; n = n.shadowRoot?.activeElement) out.push(n);
  return out;
};
// The nearest control in a direction: it must lie beyond the current one, and a control in the same row (or column)
// beats a closer one that is off to the side.
const tvNearest = (cur, all, dir) => {
  const a = cur.getBoundingClientRect(), ax = (a.left + a.right) / 2, ay = (a.top + a.bottom) / 2;
  let best = null, bestScore = Infinity;
  for (const el of all) {
    if (el === cur || el.contains(cur) || cur.contains(el)) continue;
    const b = el.getBoundingClientRect(), bx = (b.left + b.right) / 2, by = (b.top + b.bottom) / 2;
    const h = dir === "left" || dir === "right";
    const ahead = dir === "right" ? bx > ax + 1 && b.right > a.right : dir === "left" ? bx < ax - 1 && b.left < a.left
      : dir === "down" ? by > ay + 1 && b.bottom > a.bottom : by < ay - 1 && b.top < a.top;
    if (!ahead) continue;
    const along = Math.max(0, dir === "right" ? b.left - a.right : dir === "left" ? a.left - b.right : dir === "down" ? b.top - a.bottom : a.top - b.bottom);
    const overlap = h ? Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) : Math.min(a.right, b.right) - Math.max(a.left, b.left);
    const across = h ? Math.abs(by - ay) : Math.abs(bx - ax);
    const score = along + across * (overlap > 0 ? .3 : 2);
    if (score < bestScore) { bestScore = score; best = el; }
  }
  return best;
};
// Resistance past a boundary: the further the pull, the less the element follows.
const rubberband = (over, dim, k = .55) => (over * dim * k) / (dim + k * over);

// Taps that change something answer with a tap you can feel. The Home Assistant app turns a `haptic` event into a
// Taptic Engine pulse; Android browsers vibrate; Safari 18+ ticks when a hidden switch is toggled through its label.
const haptic = (type, hass) => {
  if (hass?.vibrate === false) return;
  if (window.externalApp || window.webkit?.messageHandlers?.externalBus) {
    window.dispatchEvent(new CustomEvent("haptic", { detail: type }));
  } else if (navigator.vibrate) {
    navigator.vibrate(type === "medium" ? 18 : 10);
  } else {
    const label = document.createElement("label"), input = document.createElement("input");
    label.ariaHidden = "true";
    label.style.display = "none";
    input.type = "checkbox";
    input.setAttribute("switch", "");
    label.appendChild(input);
    document.head.appendChild(label);
    label.click();
    label.remove();
  }
};
const atEdge = (el) => Number(el.value) === Number(el.min || 0) || Number(el.value) === Number(el.max || 100);
// Light for toggles, selection for picking between options, medium for commands that start something.
const HAPTIC = { tab: "selection", tone: "selection", "wx-demo": "selection", "vac-suction": "selection", light: "light",
  "room-power": "light", "all-on": "light", "all-off": "light", kiosk: "light", power: "light", mute: "light", media: "light",
  "todo-toggle": "light", "todo-add": "light", scene: "medium", run: "medium", vac: "medium", "vac-room": "medium",
  press: "medium", "todo-clear": "medium", temp: "selection", "vol-step": "selection", "thermo-run": "medium", "thermo-power": "light", cover: "light" };

// Bumped when a file in /local/logos/ changes: HA serves /local/ with a month-long cache.
const LOGO_V = 2;
// Streaming apps a TV can only name, drawn from crisp SVG logos in /local/logos/ on a card in the brand's colours.
// [match on app id, name or source, file, background, mono = paint the logo white]. More specific names come first.
const BRANDS = [
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

// What a Google TV reports as the open app (Android TV Remote gives only the package): a readable name for the media
// tile while the TV is on but nothing plays. Names starting with "media." are i18n keys (not a brand).
const TV_APPS = [
  [/tv\.launcherx/, "media.home_screen"], [/netflix/, "Netflix"], [/amazonvideo|primevideo/, "Prime Video"],
  [/com\.wbd\.stream|hbo/, "Max"], [/youtube\.tvmusic/, "YouTube Music"], [/youtube/, "YouTube"],
  [/canal/, "Canal+"], [/disney/, "Disney+"], [/skyshowtime/, "SkyShowtime"], [/playnow|rodzina\.tvstart/, "PLAY NOW"],
  [/tvn\.player/, "Player"], [/polsat/, "Polsat Box Go"], [/spotify/, "Spotify"], [/tv\.settings|tcl\.settings/, "media.tv_settings"],
];
const tvApp = (v) => { const n = (TV_APPS.find(([re]) => re.test(v)) || [])[1] || ""; return n.startsWith("media.") ? t(n) : n; };

// querySelector that also looks inside open shadow roots (HA's camera player keeps its <video> there).
const deepQuery = (root, sel) => {
  for (const el of root.querySelectorAll("*")) {
    if (el.matches(sel)) return el;
    const hit = el.shadowRoot && deepQuery(el.shadowRoot, sel);
    if (hit) return hit;
  }
  return null;
};

const deepQueryAll = (root, sel, out = []) => {
  for (const el of root.querySelectorAll("*")) {
    if (el.matches(sel)) out.push(el);
    if (el.shadowRoot) deepQueryAll(el.shadowRoot, sel, out);
  }
  return out;
};

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const wIcon = (cond, night) => (cond === "partlycloudy" && night ? "mdi:weather-night-partly-cloudy" : WEATHER_ICON[cond] || "mdi:weather-partly-cloudy");
// Translucent tints: the frosted sheet blurs the dashboard behind and colours it by the weather.
const WX_BG = {
  day: "linear-gradient(160deg, rgba(56,150,215,.55) 0%, rgba(27,92,147,.45) 100%)", night: "linear-gradient(160deg, rgba(34,52,92,.6) 0%, rgba(11,19,36,.55) 100%)",
  cloud: "linear-gradient(160deg, rgba(96,124,142,.5) 0%, rgba(42,59,71,.5) 100%)", rain: "linear-gradient(160deg, rgba(70,96,118,.55) 0%, rgba(28,43,55,.55) 100%)",
  snow: "linear-gradient(160deg, rgba(140,165,185,.5) 0%, rgba(58,80,97,.5) 100%)", storm: "linear-gradient(160deg, rgba(66,70,108,.6) 0%, rgba(23,25,42,.6) 100%)",
};
// Preview only (`demo_weather: true`): every condition the weather sheet can draw, by day and by night.
const WX_DEMO = ["sunny", "clear-night", "partlycloudy", "partlycloudy", "cloudy", "fog", "windy", "rainy", "pouring",
  "snowy", "snowy-rainy", "hail", "lightning", "lightning-rainy", "exceptional"].map((cond, i) => [cond, cond === "clear-night" || i === 3]);
// How long ago, as a unit (now, min, hour, day) and a count, worded by common.since ("od 3 dni") or common.changed
// ("zmiana 5 min temu").
const agoParts = (iso) => {
  const min = Math.round((Date.now() - new Date(iso)) / 60000);
  return min < 1 ? ["now", 0] : min < 60 ? ["min", min] : min < 1440 ? ["hour", Math.round(min / 60)] : ["day", Math.round(min / 1440)];
};
const since = (iso) => { const [u, n] = agoParts(iso); return t(`common.since.${u}`, { n }); };
const changed = (iso) => { const [u, n] = agoParts(iso); return t(`common.changed.${u}`, { n }); };
const distanceKm = (a, b) => {
  const rad = (d) => (d * Math.PI) / 180;
  const h = Math.sin(rad(b.latitude - a.latitude) / 2) ** 2
    + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(rad(b.longitude - a.longitude) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};
const battIcon = (level, charging) => {
  const step = Math.round(Number(level) / 10) * 10;
  return charging ? "mdi:battery-charging" : step >= 100 ? "mdi:battery" : step <= 0 ? "mdi:battery-outline" : `mdi:battery-${step}`;
};
// Robot vacuum wording (cleaning.vacuum_state, .suction, .vacuum_mode, .wear); a state not listed falls back to HA's own
// translation of the state.
const VAC_WEAR = ["main_brush_left", "side_brush_left", "filter_left", "mop_pad_left", "sensor_dirty_left"];

// WashData appliance states (washer and dishwasher are both feminine in Polish).
// Program values that are a status, not a program: Home Connect sends "detecting..." while the dishwasher picks one
// (appliances.program); the states' words are appliances.state.
// Fraction colours of a Polish municipal (PGK) leaflet, matched on the calendar or event name (folded, no Polish letters;
// the common English names match too).
const WASTE_COLORS = [[/zmiesz|mixed|general|residual/, "#6E6E6C", "mdi:delete"], [/bio|organic|garden/, "#9A6230", "mdi:leaf"],
  [/papier|paper/, "#1A73C8", "mdi:newspaper-variant"], [/szklo|glass/, "#16A34A", "mdi:bottle-wine"],
  [/metal|tworzyw|plastic/, "#F2A900", "mdi:recycle"], [/gabaryt|rtv|agd|bulky/, "#E2483D", "mdi:sofa"],
  [/odziez|tekstyl|textile|cloth/, "#9B6BC4", "mdi:tshirt-crew"], [/choink|christmas/, "#C77FC4", "mdi:pine-tree"]];
const APP_ACTIVE = ["starting", "running", "paused", "user_paused", "ending", "anti_wrinkle", "delay_wait"];
const APP_DONE = ["finished", "clean"];
const RING_C = 2 * Math.PI * 22;

// IMGW-PIB warning types (sensor.<miasto>_alert_pogodowy) are worded by weather.imgw.
// GIOŚ air quality index (sensor options), worded by weather.air; the last three mean "better not to air the rooms".
const AIR_BAD = ["sufficient", "bad", "very_bad"];

const isCharging = (state) => /charging/i.test(state || "") && !/not/i.test(state || "");
// Plant metrics shown in the plant sheet; `status` names the attribute plant.* reports for that metric. `label`, `Low` and
// `High` (the advice for that status) read plants.metrics.<key> in the user's language.
const PLANT_METRICS = [
  { key: "moisture", status: "moisture_status", icon: "mdi:water", color: "#0A84FF", unit: "%", digits: 0 },
  { key: "illuminance", status: "illuminance_status", icon: "mdi:brightness-5", color: "#FF9F0A", unit: " lx", digits: 0 },
  { key: "dli", status: "dli_status", icon: "mdi:white-balance-sunny", color: "#FFD60A", unit: " mol/d", digits: 2 },
  { key: "temperature", status: "temperature_status", icon: "mdi:thermometer", color: "#FF453A", unit: "°", digits: 1 },
  { key: "humidity", status: "humidity_status", icon: "mdi:water-percent", color: "#30B0C7", unit: "%", digits: 0 },
].map((m) => Object.defineProperties(m, Object.fromEntries(["label", "Low", "High"]
  .map((k) => [k, { get: () => table(`plants.metrics.${m.key}`)[k] }]))));
// Page behind the deck: HA containers go transparent and the root carries the deck's own vertical gradient,
// so the iPhone status bar and home-indicator areas blend into the card.
const PAGE_TOP = "#165566";
// One screen-high gradient that does not repeat; below it the page is the deck's own bottom colour, so the area
// under the deck (and the bottom overscroll) never shows a lighter band.
const PAGE_BG = `linear-gradient(180deg, ${PAGE_TOP} 0%, #0F3B49 35%, #0B2633 70%, #081A24 100%) no-repeat #081A24`;
const fold = (t) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ł/g, "l").replace(/Ł/g, "L").toLowerCase();
// The first Alvuna card config in a Lovelace dashboard config (any depth), with rooms written out.
const findDeckConfig = (v) => {
  if (Array.isArray(v)) { for (const x of v) { const f = findDeckConfig(x); if (f) return f; } return null; }
  if (!v || typeof v !== "object") return null;
  if ((v.type === "custom:alvuna-card" || v.type === "custom:homedeck-card") && Array.isArray(v.rooms)) return v;
  for (const x of Object.values(v)) { const f = findDeckConfig(x); if (f) return f; }
  return null;
};
const ids = (list) => (list || []).map((x) => (typeof x === "string" ? x : x.entity));
const fmtTime = (s) => {
  if (!isFinite(s) || s < 0) return "0:00";
  s = Math.floor(s);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
};

// Updates `from` in place to match `to`, so unchanged nodes (icons, images, open sheets) are kept and
// nothing re-runs its entrance animation or reloads.
let morphQuiet = false;
// The part of a state that the deck can show. Media players report their playback position every few seconds and
// rotate the artwork token every few minutes, and the sun recomputes its position; none of that changes the screen
// (progress is extrapolated by _tick), so such updates skip the re-render. null means compare the whole state.
const visible = (id, st) => {
  if (!st) return "";
  const domain = id.split(".")[0];
  if (domain === "sun") return st.state;
  if (domain !== "media_player") return null;
  const { media_position: pos, media_position_updated_at: at, entity_picture: pic, ...rest } = st.attributes;
  // While playing, "updated_at - position" stays put; it moves only on a seek or a new track.
  const anchor = pos != null && at ? Math.round((Date.parse(at) / 1000 - pos) / 3) : "";
  return `${st.state}|${anchor}|${String(pic || "").replace(/[?&]token=[^&]*/, "")}|${JSON.stringify(rest)}`;
};

const morph = (from, to) => {
  const a = [...from.childNodes], b = [...to.childNodes];
  b.forEach((nb, i) => {
    const na = a[i];
    if (!na) { from.appendChild(nb); return; }
    if (na.nodeType !== nb.nodeType || na.nodeName !== nb.nodeName) { from.replaceChild(nb, na); return; }
    if (na.nodeType !== 1) { if (na.nodeValue !== nb.nodeValue) na.nodeValue = nb.nodeValue; return; }
    // data-keep: the element is driven from script (camera stills); only its data-* attributes follow the markup.
    if (nb.hasAttribute("data-keep")) {
      for (const { name, value } of [...nb.attributes]) if (name.startsWith("data-") && na.getAttribute(name) !== value) na.setAttribute(name, value);
      return;
    }
    for (const { name } of [...na.attributes]) if (!nb.hasAttribute(name)) na.removeAttribute(name);
    for (const { name, value } of [...nb.attributes]) if (na.getAttribute(name) !== value) {
      if (name === "icon" && !morphQuiet && na.isConnected && !reducedMotion())
        na.animate([{ opacity: .2, transform: "scale(.6) rotate(-12deg)" }, { opacity: 1, transform: "none" }], { duration: 480, easing: EASE_SPRING });
      na.setAttribute(name, value);
    }
    if (na.tagName === "INPUT") { if (na.value !== nb.value && !na.matches(":focus")) na.value = nb.value; return; }
    if (na.tagName !== "HA-ICON") morph(na, nb);
  });
  for (let i = a.length - 1; i >= b.length; i--) from.removeChild(a[i]);
};

// Figtree is a variable font served by the integration (/alvuna/static/fonts), so the deck needs no internet and does not
// call Google on every load. Declared in the document because @font-face does not work inside a shadow root.
if (!document.querySelector("style[data-homedeck-font]")) {
  const face = (file, range) => `@font-face{font-family:Figtree;font-style:normal;font-weight:300 700;font-display:swap;`
    + `src:url(/alvuna/static/fonts/${file}) format("woff2");unicode-range:${range}}`;
  const style = document.createElement("style");
  style.dataset.homedeckFont = "";
  style.textContent = face("figtree-latin.woff2", "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD")
    + face("figtree-latin-ext.woff2", "U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C4,U+2113,U+2C60-2C7F,U+A720-A7FF");
  document.head.appendChild(style);
}

const CSS = `
:host { display: block; --mdc-icon-size: 20px; --lime: #B8F03C; --lime-ink: #13240A; --tile-on: rgba(226,233,237,.94); --ink: #12232C;
  --glass: rgba(255,255,255,.075); --glass-line: rgba(255,255,255,.12); --muted: rgba(255,255,255,.62); }
* { box-sizing: border-box; }
.deck { position: relative; min-height: calc(100vh - var(--header-height, 56px)); padding: 28px 32px 112px;
  color: #fff; font-family: Figtree, var(--ha-font-family-body, Roboto), system-ui, sans-serif;
  background: linear-gradient(180deg, #165566 0%, #114556 32%, #0B2633 70%, #081A24 100%);
  -webkit-font-smoothing: antialiased; overflow: hidden; }
.deck.kiosk { min-height: 100vh; min-height: 100dvh; }
.deck { padding-bottom: calc(112px + env(safe-area-inset-bottom)); }
.nav { margin-bottom: env(safe-area-inset-bottom); }
/* The glow fades in below the top edge, so the edge stays exactly the page colour behind the iPhone status bar. */
.deck::before { content: ""; position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(110% 60% at 32% 6%, rgba(44,140,152,.5), transparent 72%), radial-gradient(60% 45% at 92% 0%, rgba(56,170,180,.16), transparent 70%);
  -webkit-mask-image: linear-gradient(180deg, transparent 0, #000 160px); mask-image: linear-gradient(180deg, transparent 0, #000 160px); }
button { font: inherit; color: inherit; border: 0; background: none; cursor: pointer; padding: 0; }
* { scrollbar-width: none; }
*::-webkit-scrollbar { display: none; }
ha-icon { display: inline-flex; }

.top { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; position: relative; }
.date { font-size: 13px; letter-spacing: .16em; text-transform: uppercase; color: var(--muted); font-weight: 500; }
.clockrow { display: flex; align-items: center; gap: 12px; margin-top: 2px; }
.clock { font-size: 58px; font-weight: 300; letter-spacing: -.02em; line-height: 1.05; font-variant-numeric: tabular-nums; }
.chip-btn { position: relative; width: 40px; height: 40px; border-radius: 50%; background: var(--glass);
  border: 1px solid var(--glass-line); display: grid; place-items: center; }
.chip-btn .badge { position: absolute; top: -4px; right: -4px; min-width: 18px; height: 18px; padding: 0 5px; border-radius: 9px;
  font-size: 11px; font-weight: 700; display: grid; place-items: center; background: #FF5A4E; color: #fff; }
.chip-btn .badge.ok { background: var(--lime); color: var(--lime-ink); }
.right { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; justify-content: flex-end; }
.pill { height: 44px; padding: 0 16px 0 12px; border-radius: 22px; display: inline-flex; align-items: center; gap: 8px;
  background: var(--glass); border: 1px solid var(--glass-line); white-space: nowrap; }
.pill b { font-size: 20px; font-weight: 600; }
.pill.warn { border-color: rgba(255,179,64,.55); background: rgba(255,159,10,.16); }
.pill.warn ha-icon { color: #FFB340; }
.pill span { font-size: 14px; color: var(--muted); }
.avatars { display: flex; }
.avatar { position: relative; width: 44px; height: 44px; border-radius: 50%; margin-left: -8px; border: 0;
  box-shadow: 0 0 0 2px rgba(255,255,255,.22), 0 4px 12px rgba(0,0,0,.25);
  background: #E9A15B center/cover; display: grid; place-items: center; font-weight: 700; color: #3A2412; }
.avatar:first-child { margin-left: 0; }
.avatar i { position: absolute; right: -1px; bottom: -1px; width: 12px; height: 12px; border-radius: 50%;
  background: #7A8790; border: 2px solid #0E3442; }
.avatar i.home { background: #4CD964; }
.round { width: 44px; height: 44px; border-radius: 50%; background: var(--glass); border: 1px solid var(--glass-line); display: grid; place-items: center; }
.round.kiosk.off { background: var(--lime); color: var(--lime-ink); border-color: transparent; }

.status { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; margin-top: 22px; flex-wrap: wrap; position: relative; }
.label { font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: var(--muted); font-weight: 600; }
.headline { font-size: 30px; font-weight: 400; margin-top: 4px; }
.attn { display: flex; flex-wrap: wrap; align-items: center; row-gap: 4px; margin-top: 6px; font-size: 15px; color: var(--muted); --mdc-icon-size: 18px; }
.attn > ha-icon { margin-right: 8px; }
.attn > span { margin-right: 6px; }
.attn-item { color: rgba(255,255,255,.86); }
.attn-item b { font-weight: 600; color: #fff; margin-left: 5px; }
.attn.waste > ha-icon { color: var(--lime); }
.attn.smog > ha-icon { color: #FFB340; }
.attn.alert > ha-icon { color: #FF9F0A; }
.attn.heat > ha-icon { color: #FF9F0A; }
.attn.heat.urgent > ha-icon, .attn.heat .attn-item.urgent b { color: #FF6B5A; }
.attn.heat .attn-item b { margin-left: 0; }
.attn.heat .attn-item span + b { margin-left: 5px; }
.ic.waste-ic, .tile.on .ic.waste-ic { flex: none; background: var(--c); color: #fff; }
.waste-tile .kicker { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.waste-note { margin-top: 10px; font-size: 13px; color: var(--muted); }
.attn.waste .attn-item b { margin-left: 0; }
.attn-item + .attn-item::before { content: "·"; margin: 0 8px; color: var(--muted); }
.actions { display: flex; gap: 10px; }
.act { height: 40px; padding: 0 18px; border-radius: 20px; display: inline-flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 500;
  background: var(--glass); border: 1px solid var(--glass-line); --mdc-icon-size: 18px; }
.act.light { background: #F4F7F8; color: var(--ink); border-color: transparent; }

.scenes { margin-top: 20px; position: relative; }
.scenes .label i { font-style: normal; margin-left: 6px; padding: 1px 6px; border-radius: 6px; background: var(--glass); }
.scene-row { display: flex; gap: 10px; margin-top: 10px; flex-wrap: wrap; }
.scene { height: 40px; padding: 0 18px 0 14px; border-radius: 20px; display: inline-flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 500;
  background: rgba(40,140,150,.22); border: 1px solid rgba(120,220,220,.25); --mdc-icon-size: 18px;
  transition: transform .15s, background .3s, color .3s, border-color .3s; }
.scene.on { background: var(--lime); color: var(--lime-ink); border-color: transparent; }
.scene .left { font-size: 12px; font-weight: 600; opacity: .7; font-variant-numeric: tabular-nums; }
.scene:active, .tile:active, .act:active { transform: scale(.96); }

.gridwrap { container-type: inline-size; margin-top: 24px; position: relative; }
.grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
@container (min-width: 640px) { .grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; } }
@container (min-width: 960px) { .grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
@container (min-width: 1500px) { .grid { grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 20px; } }
.tile { position: relative; border-radius: 26px; padding: 18px; min-height: 190px; display: flex; flex-direction: column;
  background: var(--glass); border: 1px solid var(--glass-line); text-align: left;
  transition: transform .15s, background .45s ease, color .45s ease, border-color .45s ease; overflow: hidden; }
.tile.on { background: var(--tile-on); color: var(--ink); border-color: transparent; }
.tile .head { display: flex; justify-content: space-between; align-items: flex-start; }
.ic { width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; background: rgba(255,255,255,.12); --mdc-icon-size: 22px; }
.tile.on .ic, .ic.lime { background: var(--lime); color: var(--lime-ink); }
.ic.heat { background: #FF9F0A; color: #fff; }
.pw { width: 48px; height: 48px; border-radius: 50%; display: grid; place-items: center; background: rgba(255,255,255,.12); --mdc-icon-size: 24px; }
.tile.on .pw { background: rgba(18,35,44,.12); }
.tile .name { margin-top: auto; font-size: 17px; font-weight: 600; }
.tile .sub { font-size: 13px; opacity: .7; margin-top: 2px; }
.tile.launch { background: #14232d; border-color: rgba(255,255,255,.12); cursor: pointer; }
.tile.launch .logo { flex: 1; min-height: 50px; margin: 6px 0 10px; background: center/auto 82% no-repeat; }
.tile.launch .name, .tile.launch .sub { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tile.launch .sub { display: flex; align-items: center; gap: 6px; }
.tile.launch .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--lime); flex: none; }
.tile.launch.playing { box-shadow: inset 0 0 0 3px var(--lime); }
.tile.launch.playing .sub { opacity: 1; }
.tile .foot { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; min-height: 16px; }
.dots { display: flex; gap: 4px; }
.dots i { width: 7px; height: 7px; border-radius: 50%; background: currentColor; opacity: .28; }
.dots i.on { background: #7BC91E; opacity: 1; }
.tile:not(.on) .dots i.on { background: var(--lime); }
.temp { font-size: 13px; opacity: .75; font-variant-numeric: tabular-nums; }
.kicker { font-size: 11px; letter-spacing: .14em; font-weight: 600; text-transform: uppercase; opacity: .7; }
/* An icon in a kicker sits on the text's centre line, not on its baseline. */
.kicker:has(> ha-icon) { display: flex; align-items: center; gap: 6px; line-height: 1; }
.kicker > ha-icon { display: flex; flex: none; }
.tile .big { font-size: 22px; font-weight: 400; line-height: 1.15; margin-top: auto; }
.tile .alerts { margin-top: auto; font-size: 16px; line-height: 1.25; display: flex; flex-direction: column; gap: 4px; }
.tile .alerts b { font-weight: 600; }
.tile .alerts > div { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.tile.alert { background: rgba(255,90,78,.22); border-color: rgba(255,120,110,.5); }
.media-tile .kicker { color: var(--lime); opacity: 1; }
.media-tile.has-art { background: rgba(8,26,34,.6); border-color: rgba(255,255,255,.16); }
.tile-art { position: absolute; inset: -40px; background: center/cover; filter: blur(24px) saturate(170%); opacity: .75; will-change: transform; }
.media-tile.has-art::after { content: ""; position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(180deg, rgba(6,18,26,.2) 0%, rgba(6,18,26,.62) 100%); }
.media-tile.has-art > :not(.tile-art) { position: relative; z-index: 1; }
.tile.media-tile.multi { padding: 0; }
/* Bento: a playing media tile spans two cells; artwork on the left, title and controls on the right. */
.grid { grid-auto-flow: row dense; }
.tile.media-tile.wide { grid-column: span 2; }
/* The artwork is a square; a 16:9 thumbnail fits inside it whole. */
.mt-wide { flex: 1; min-height: 0; display: flex; gap: 18px; align-items: stretch; }
.mt-art { flex: none; align-self: center; height: 100%; max-width: 44%; aspect-ratio: 1; border-radius: 18px; background: rgba(255,255,255,.08) center/cover;
  box-shadow: 0 14px 34px rgba(0,0,0,.4); display: grid; place-items: center; --mdc-icon-size: 48px; color: rgba(255,255,255,.5); }
.mt-art.fit { background-color: rgba(0,0,0,.35); background-size: contain; background-repeat: no-repeat; background-position: center; }
/* Station logos (PLAY NOW's colour versions, made for its dark app) on a dark tile of their own. */
.mt-art.fit.chan { background-color: #14232d; background-size: 92%; box-shadow: inset 0 0 0 1px rgba(255,255,255,.1), 0 14px 34px rgba(0,0,0,.4); }
.mt-art .np-logo { width: 72px; height: 72px; border-radius: 18px; }
.mt-art.brand .np-brand { width: 70%; }
.mt-body { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.mt-body > * { flex: none; }
.media-tile.wide .title { margin-top: 6px; font-size: 15px; line-height: 1.25; -webkit-line-clamp: 2; overflow-wrap: break-word; }
.mt-foot { margin-top: auto; padding-top: 8px; }
.tile.media-tile.wide .mt-foot .bar { margin-top: 0; }
.tile.media-tile.wide .mt-foot .ctrls { margin-top: 6px; padding: 0 4px; }
.tile.media-tile.wide .mt-foot .times { margin-top: 4px; font-size: 11px; }
.media-tile.wide .sub { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.media-tile .kt { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mt-track { flex: 1; display: flex; overflow-x: auto; overflow-y: hidden; scroll-snap-type: x mandatory; scrollbar-width: none;
  overscroll-behavior-x: contain; border-radius: inherit; }
.mt-track::-webkit-scrollbar { display: none; }
.mt-slide { flex: 0 0 100%; scroll-snap-align: start; scroll-snap-stop: always; position: relative; overflow: hidden;
  display: flex; flex-direction: column; padding: 16px 16px 20px; }
.mt-slide.has-art { background: rgba(8,26,34,.6); }
.mt-slide.has-art::after { content: ""; position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(180deg, rgba(6,18,26,.2) 0%, rgba(6,18,26,.62) 100%); }
.mt-slide.has-art > :not(.tile-art) { position: relative; z-index: 1; }
.mt-dots { position: absolute; left: 0; right: 0; bottom: 7px; display: flex; justify-content: center; gap: 5px; pointer-events: none; z-index: 2; }
.mt-dots i { width: 5px; height: 5px; border-radius: 50%; background: rgba(255,255,255,.35); }
.mt-dots i.on { background: #fff; }
.media-tile .title { margin-top: auto; font-size: 16px; font-weight: 600; overflow-wrap: anywhere; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.bar { height: 4px; border-radius: 2px; background: rgba(255,255,255,.2); margin-top: 10px; overflow: hidden; }
.bar i { display: block; height: 100%; background: #fff; border-radius: 2px; transform-origin: 0 50%; transition: transform 1s linear; }
.ctrls { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; padding: 0 6px; }
.ctrls button { width: 32px; height: 32px; display: grid; place-items: center; --mdc-icon-size: 22px; }
.ctrls .play { width: 40px; height: 40px; border-radius: 50%; background: #fff; color: var(--ink); }

.nav { position: fixed; left: 50%; bottom: 22px; transform: translateX(-50%); z-index: 3; display: flex; gap: 4px; padding: 5px;
  border-radius: 26px; background: rgba(20,60,74,.72); border: 1px solid var(--glass-line);
  -webkit-backdrop-filter: blur(24px) saturate(160%); backdrop-filter: blur(24px) saturate(160%); }
.nav button { position: relative; z-index: 1; height: 40px; padding: 0 16px; border-radius: 20px; display: inline-flex; align-items: center; gap: 8px;
  font-size: 14px; font-weight: 500; color: rgba(255,255,255,.78); --mdc-icon-size: 19px;
  transition: color .4s cubic-bezier(.22,1,.36,1), transform .12s ease-out; }
.nav button:active { transform: scale(.93); }
.nav button.sel { color: var(--ink); }
.nav-badge { position: absolute; top: 3px; right: 3px; width: 9px; height: 9px; border-radius: 50%; background: #FF9F0A; box-shadow: 0 0 0 2px #12343F; pointer-events: none; }
.nav-badge.urgent { background: #FF6B5A; }
.hh-alerts { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
.hh-alerts button { display: inline-flex; align-items: center; gap: 8px; min-height: 34px; padding: 6px 14px; border-radius: 17px; font-size: 14px; font-weight: 500; text-align: left;
  color: #FFD59A; background: rgba(255,159,10,.16); --mdc-icon-size: 17px; }
.hh-alerts button.urgent { color: #FFC2B8; background: rgba(255,107,90,.2); }
.nav-ic { width: var(--mdc-icon-size); height: var(--mdc-icon-size); flex: none; fill: none; stroke: currentColor; stroke-width: 1.5;
  stroke-linecap: round; stroke-linejoin: round; }
@media (max-width: 760px) { .nav-ic { stroke-width: 1.45; } }
.nav-pill { position: absolute; left: 0; top: 5px; height: 40px; border-radius: 20px; background: #F4F7F8; transform-origin: 0 50%;
  box-shadow: 0 6px 18px rgba(0,0,0,.22); pointer-events: none; }

.section-title { font-size: 22px; font-weight: 500; margin: 26px 0 0; position: relative; }
.panels { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(340px, 100%), 1fr)); gap: 14px; margin-top: 16px; position: relative; }
.panel { border-radius: 24px; padding: 18px; background: var(--glass); border: 1px solid var(--glass-line); }
.panel h3 { margin: 0; font-size: 17px; font-weight: 600; display: flex; align-items: center; gap: 10px; }
.panel h3 .meta { margin-left: auto; font-size: 13px; font-weight: 400; color: var(--muted); }
.panels.rooms { display: flex; flex-wrap: wrap; }
.panels.use-panels { grid-template-columns: repeat(auto-fit, minmax(min(250px, 100%), 1fr)); }
/* Landscape tablet and wider: every meter in one row, so the tab needs no scrolling. */
@media (min-width: 900px) and (orientation: landscape) { .panels.use-panels { grid-template-columns: repeat(var(--n, 3), minmax(0, 1fr)); } }
.use-ic { background: var(--use); color: var(--lime-ink); }
.panel.use { padding: 16px 18px; }
.use-big { margin-top: 12px; font-size: 34px; font-weight: 300; line-height: 1; font-variant-numeric: tabular-nums; display: flex; align-items: baseline; }
.use-cost { margin-left: auto; font-size: 15px; font-weight: 600; padding: 4px 10px; border-radius: 12px; background: rgba(255,255,255,.1); }
.use-big small { font-size: 16px; font-weight: 500; margin-left: 6px; color: var(--muted); }
.use-sub { margin-top: 6px; font-size: 13px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.use-chart { display: flex; align-items: flex-end; gap: 4px; height: 96px; margin-top: 12px; padding-bottom: 18px; }
.use-col { flex: 1; min-width: 0; height: 100%; position: relative; display: flex; align-items: flex-end; }
.use-col i { display: block; width: 100%; border-radius: 4px 4px 2px 2px; background: var(--use); opacity: .45; }
.use-col.on i { opacity: 1; }
.use-col span { position: absolute; left: 50%; bottom: -18px; transform: translateX(-50%); font-size: 10px; color: var(--muted); white-space: nowrap; }
/* Compact rows, label left and value right: they fit narrow panels without cutting either. */
.use-infos { margin-top: 10px; display: flex; flex-direction: column; gap: 4px; }
.use-info { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; min-width: 0; padding: 6px 10px;
  border-radius: 10px; background: rgba(255,255,255,.05); }
.use-info span { font-size: 12px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.use-info b { flex: none; font-size: 13px; font-weight: 600; white-space: nowrap; }
.use-info[data-act] { cursor: pointer; }
.use-info.warn b { color: #FFB340; }
/* Ogrzewanie: the water loop, today in four numbers, the day's chart and the heating curve. */
.panels.heat-panels { grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr)); align-items: stretch; }
.panels.heat-panels > .panel { display: flex; flex-direction: column; min-width: 0; }
@media (min-width: 900px) and (orientation: landscape) { .panels.heat-panels { grid-template-columns: minmax(0, 1.55fr) minmax(0, 1fr); } }
/* Wall tablet and small laptops: the drawing takes the full width and the thermostat lies flat (dial left, rooms right),
   so neither card is stretched to the other's height with empty space. */
@media (min-width: 900px) and (max-width: 1299px) and (orientation: landscape) {
  .panels.heat-panels { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
  .panels.heat-panels > .hh, .panels.heat-panels > .heat-thermo { grid-column: 1 / -1; }
  .panels.heat-panels > .panel.heat-thermo { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr); column-gap: 28px; row-gap: 14px; align-items: start; }
  .hh .hl { max-height: 330px; }
  .heat-thermo > h3 { grid-column: 1 / -1; }
  .heat-thermo > .td-row, .heat-thermo > .td-note, .heat-thermo > .th-modes { grid-column: 1; }
  .heat-thermo > .td-rooms { grid-column: 2; grid-row: 2 / span 3; align-self: center; }
  .td-dial { flex-basis: 210px; }
}
.panel.heat-wide { min-width: 0; grid-column: 1 / -1; }
@media (min-width: 900px) and (orientation: landscape) {
  .panel.heat-wide .hs-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .panel.heat-wide .hs { flex-direction: row; align-items: center; justify-content: flex-start; gap: 16px; padding: 16px 18px; }
  .panel.heat-wide .hs-ic { width: 46px; height: 46px; flex: none; --mdc-icon-size: 22px; }
  .panel.heat-wide .hs b { font-size: 34px; } }
.td-row { display: flex; align-items: center; justify-content: center; gap: 22px; margin-top: 4px; }
.td-dial { position: relative; flex: 0 1 250px; min-width: 150px; aspect-ratio: 1; }
.td-dial svg { display: block; width: 100%; height: 100%; }
.td-track { fill: none; stroke: rgba(255,255,255,.1); stroke-width: 14; stroke-linecap: round; }
.td-val { fill: none; stroke: var(--lime); stroke-width: 14; stroke-linecap: round; }
.td-dial.heat .td-val { stroke: #FF9F0A; }
.td-now { fill: #fff; stroke: rgba(255,255,255,.35); stroke-width: 7; paint-order: stroke; }
.td-in { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
.td-in b { font-size: 60px; font-weight: 300; line-height: 1.05; letter-spacing: -.02em; font-variant-numeric: tabular-nums; }
.td-in span { font-size: 13px; color: var(--muted); }
.td-dial.heat .td-st { color: #FFB340; }
.td-note { text-align: center; font-size: 13px; color: var(--muted); margin-top: 2px; }
.heat-thermo .th-modes { margin-top: 0; }
.heat-thermo { justify-content: space-between; gap: 14px; }
.td-rooms { display: flex; flex-direction: column; gap: 2px; padding: 6px; border-radius: 18px; background: rgba(255,255,255,.05); }
.td-room { display: grid; grid-template-columns: 20px minmax(0, 1.1fr) minmax(70px, 1fr) 52px; align-items: center; gap: 10px; padding: 8px 10px;
  border-radius: 12px; cursor: pointer; --mdc-icon-size: 18px; }
.td-room:hover { background: rgba(255,255,255,.06); }
.td-room ha-icon { color: var(--muted); }
.td-room span { font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.td-room b { text-align: right; font-size: 16px; font-weight: 600; font-variant-numeric: tabular-nums; }
.td-bar { position: relative; height: 6px; border-radius: 3px; background: rgba(255,255,255,.1); }
.td-tgt { position: absolute; top: -4px; width: 2px; height: 14px; margin-left: -1px; border-radius: 1px; background: rgba(255,255,255,.55); }
.td-dot { --d: var(--lime); position: absolute; top: 50%; width: 10px; height: 10px; margin: -5px 0 0 -5px; border-radius: 50%; background: var(--d); box-shadow: 0 0 0 4px color-mix(in srgb, var(--d) 28%, transparent); }
.td-room.cold .td-dot { --d: #5AC8FA; }
.td-room.cold b { color: #7FD4FF; }
.td-room.warm .td-dot { --d: #FF9F5A; }
.td-room.warm b { color: #FFB067; }
.td-room.out { border-top: 1px solid rgba(255,255,255,.07); border-radius: 0 0 12px 12px; margin-top: 2px; }
.td-room.out span, .td-room.out b { color: var(--muted); }
.ic.fault { background: #FF453A; color: #fff; }
.hh { position: relative; overflow: hidden; }
.hh.heat { background: radial-gradient(120% 90% at 0% 0%, rgba(255,140,40,.20), transparent 60%), var(--glass); }
.hh.fault { background: radial-gradient(120% 90% at 0% 0%, rgba(255,69,58,.25), transparent 60%), var(--glass); }
.hh-head { display: flex; align-items: center; gap: 12px; }
.hh-title { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.hh-title b { font-size: 22px; font-weight: 600; line-height: 1.15; }
.hh-title span { font-size: 13px; color: var(--muted); }
.hh-set { text-align: right; cursor: pointer; }
.hh-set span { display: block; font-size: 13px; color: var(--muted); }
.hh-set b { font-size: 28px; font-weight: 300; font-variant-numeric: tabular-nums; }
.hh-loop { flex: 1; display: flex; align-items: center; margin: 4px -8px 0; }
.hl { display: block; width: 100%; height: auto; max-height: 460px; }
.hl-floor { stroke: rgba(255,255,255,.12); stroke-width: 2; }
.hl-p-out { fill: none; stroke: rgba(6,24,32,.35); stroke-width: 11; stroke-linecap: round; stroke-linejoin: round; }
.hl-p { fill: none; stroke-width: 8; stroke-linecap: round; stroke-linejoin: round; }
.hl-p.hot { stroke: #FF9F5A; }
.hl-p.cold { stroke: #5AC8FA; }
.hl-p.gas { stroke: #FFD54A; }
.hl-p.mains { stroke: #A9BCC8; stroke-width: 6; }
.hl-p.dhw { stroke: #FF7AB6; stroke-width: 6; }
.hl-tap rect { fill: #E2E9ED; }
.hl-tap path { fill: none; stroke: #E2E9ED; stroke-width: 6; stroke-linecap: round; }
.hl-tap .hl-tapk { fill: #FF7AB6; }
.hl-drop { fill: #8FDBFF; opacity: 0; animation: hl-drip 1s ease-in infinite; }
@keyframes hl-drip { 0% { transform: translateY(0); opacity: 0; } 15% { opacity: 1; } 100% { transform: translateY(26px); opacity: 0; } }
.hl-dhwt { fill: #FF9CC8; font-size: 28px; font-weight: 300; font-variant-numeric: tabular-nums; }
.hl-flow { fill: none; stroke: rgba(255,255,255,.6); stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 2 14; animation: hl-run 1.4s linear infinite; }
.hl-flow.gas { stroke: rgba(70,50,0,.6); }
@keyframes hl-run { to { stroke-dashoffset: -16; } }
.hl-valve rect { fill: #E2E9ED; }
.hl-valve .hl-handle { fill: #FFD54A; }
.hl-case { fill: #E2E9ED; }
.hl-seam { fill: rgba(18,35,44,.10); }
.hl-lcd { fill: #12232C; }
.hl-lcdt { fill: #fff; font-size: 20px; font-weight: 600; text-anchor: middle; dominant-baseline: middle; font-variant-numeric: tabular-nums; }
.hl-lcdf { fill: #FF9F0A; }
.hl-key { fill: rgba(18,35,44,.14); }
.hl-win { fill: #12232C; }
.hl-burner { fill: rgba(255,255,255,.28); }
.hl-tongue { transform-box: fill-box; transform-origin: 50% 100%; animation: hl-flick 1.6s ease-in-out infinite; }
@keyframes hl-flick { 0%, 100% { transform: scaleY(1); } 50% { transform: scaleY(.86) scaleX(1.06); } }
.hl-cap { fill: rgba(18,35,44,.55); font-size: 12px; font-weight: 600; text-anchor: middle; }
.hl-rad2 { fill: #E2E9ED; }
.hl-ribs line { stroke: rgba(18,35,44,.10); stroke-width: 2; }
.hl-trv { fill: #E2E9ED; stroke: rgba(18,35,44,.4); stroke-width: 1; }
.hl-air { fill: none; stroke: rgba(255,159,90,.55); stroke-width: 2; stroke-linecap: round; animation: hl-rise 2.7s ease-in-out infinite; opacity: 0; }
@keyframes hl-rise { 0% { transform: translateY(8px); opacity: 0; } 40% { opacity: .9; } 100% { transform: translateY(-14px); opacity: 0; } }
.hl-badge { fill: #12232C; }
.hl-radt { fill: #FFD0A8; font-size: 24px; font-weight: 600; text-anchor: middle; dominant-baseline: middle; font-variant-numeric: tabular-nums; }
.hl-room { fill: #fff; font-size: 34px; font-weight: 300; font-variant-numeric: tabular-nums; }
.hl-num { font-size: 40px; font-weight: 300; text-anchor: middle; font-variant-numeric: tabular-nums; }
.hl-num.hot { fill: #FFB067; }
.hl-num.cold { fill: #7FD4FF; }
.hl-lbl { fill: var(--muted); font-size: 14px; text-anchor: middle; }
.hl-lbl.start { text-anchor: start; }
.hl-lbl.gas { fill: #E8C547; }
:host([lite]) .hl-flow, :host([lite]) .hl-tongue, :host([lite]) .hl-air, :host([lite]) .hl-drop { animation: none; }
:host([lite]) .hl-drop { opacity: .8; }
:host([lite]) .hl-air { opacity: .6; }
@media (prefers-reduced-motion: reduce) { .hl-flow, .hl-tongue { animation: none; } .hl-air { animation: none; opacity: .6; } }
/* Phones: the drawing shrinks to the screen, so its words would be unreadable; they move to a row of numbers under it. */
.hh-strip { display: none; }
@media (max-width: 760px) {
  .hl-num, .hl-lbl, .hl-room, .hl-dhwt, .hl-cap { display: none; }
  .hl-radt { font-size: 34px; }
  .hl-lcdt { font-size: 26px; }
  .hh-strip { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; margin: 4px 0 8px; }
  .hh-strip div { padding: 8px 6px; border-radius: 14px; background: rgba(255,255,255,.06); text-align: center; min-width: 0; }
  .hh-strip b { display: block; font-size: 22px; font-weight: 300; font-variant-numeric: tabular-nums; color: var(--c, #fff); }
  .hh-strip span { display: block; font-size: 11px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .td-row { gap: 8px; }
  .td-dial { flex-basis: min(230px, 54vw); }
  .heat-thermo .th-btn { width: 46px; height: 46px; --mdc-icon-size: 22px; }
  .td-in b { font-size: 48px; }
  .td-room { grid-template-columns: 18px minmax(0, 1.3fr) minmax(50px, 1fr) 46px; gap: 8px; padding: 8px 6px; }
}
.heat-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.heat-tag { padding: 5px 11px; border-radius: 13px; background: rgba(255,255,255,.08); font-size: 12px; }
.heat-tag.good { background: rgba(184,240,60,.16); color: var(--lime); }
.heat-tag.warn { background: rgba(255,159,10,.2); color: #FFB340; }
.hs-grid { flex: 1; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); grid-auto-rows: 1fr; gap: 10px; margin-top: 14px; }
.hs { display: flex; flex-direction: column; justify-content: space-between; gap: 12px; padding: 14px 16px; border-radius: 20px; background: rgba(255,255,255,.06); cursor: pointer; min-width: 0; --mdc-icon-size: 18px; }
.hs-ic { width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; font-style: normal; color: var(--k); background: color-mix(in srgb, var(--k) 20%, transparent); }
.hs b { display: block; font-size: 36px; font-weight: 300; line-height: 1; font-variant-numeric: tabular-nums; }
.hs b small { font-size: 15px; font-weight: 500; margin-left: 4px; color: var(--muted); }
.hs span { display: block; margin-top: 6px; font-size: 12px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hs.warn { background: rgba(255,159,10,.14); }
.hs.warn b { color: #FFB340; }
.hc-legend { display: flex; flex-wrap: wrap; gap: 4px 14px; margin-top: 10px; font-size: 12px; color: var(--muted); }
.hc-legend span::before { content: ""; display: inline-block; width: 14px; height: 3px; border-radius: 2px; background: var(--c); margin-right: 6px; vertical-align: middle; }
.hc-legend span.dash::before { background: repeating-linear-gradient(90deg, var(--c) 0 4px, transparent 4px 7px); }
.hc-legend span.flame::before { height: 8px; }
.hc-plot, .cv-plot { position: relative; margin-top: 12px; }
.hc-plot { height: 190px; }
.cv-plot { height: 170px; }
.hc-plot svg, .cv-plot svg { display: block; width: 100%; height: 100%; overflow: visible; }
.hc-plot .ln, .cv-line { fill: none; stroke-linejoin: round; stroke-linecap: round; vector-effect: non-scaling-stroke; }
.hc-plot .ln.flow { stroke: #FF9F5A; stroke-width: 2.5; }
.hc-plot .ln.ret { stroke: #5AC8FA; stroke-width: 2.5; }
.hc-plot .ln.set { stroke: rgba(255,255,255,.7); stroke-width: 1.5; stroke-dasharray: 5 5; }
.hc-zone { fill: rgba(184,240,60,.045); }
.hc-45 { stroke: rgba(184,240,60,.55); stroke-width: 1; stroke-dasharray: 3 5; vector-effect: non-scaling-stroke; }
.hc-45l { position: absolute; left: 6px; transform: translateY(-50%); padding: 2px 8px; border-radius: 9px; background: rgba(9,34,44,.85); font-size: 10px; color: var(--lime); white-space: nowrap; }
.cv-yl { position: absolute; left: 0; top: -16px; font-size: 11px; color: var(--muted); }
.hc-plot .grid, .cv-plot .grid { stroke: rgba(255,255,255,.07); stroke-width: 1; vector-effect: non-scaling-stroke; }
.hc-y { position: absolute; right: 0; font-size: 11px; color: var(--muted); transform: translateY(-120%); }
.hc-flame { display: block; width: 100%; height: 10px; margin-top: 10px; fill: #FF9F0A; background: rgba(255,255,255,.05); border-radius: 3px; }
.hc-x { position: relative; height: 16px; margin-top: 6px; }
.hc-x span { position: absolute; top: 0; transform: translateX(-50%); font-size: 11px; color: var(--muted); white-space: nowrap; }
/* The 24 h chart runs from edge to edge of its card; the degree labels sit on the plot, inset from the edge. */
.heat-chart .hc-plot, .heat-chart .hc-flame, .heat-chart .hc-x { margin-left: -18px; margin-right: -18px; }
.heat-chart .hc-flame { border-radius: 0; }
.heat-chart .hc-y { right: 12px; }
.heat-chart .hc-45l { left: 12px; }
.heat-curve .cv-plot, .heat-curve .cv-x { margin-left: -18px; margin-right: -18px; }
.heat-curve .hc-y, .heat-curve .cv-x em { right: 12px; }
.heat-curve .cv-yl { left: 18px; }
.cv-x em { position: absolute; right: 0; top: 0; font-size: 11px; font-style: normal; color: var(--muted); }
.cv-line { stroke-width: 3.5; }
.cv-guide { stroke: rgba(255,255,255,.35); stroke-width: 1; stroke-dasharray: 3 4; vector-effect: non-scaling-stroke; }
.cv-dot { position: absolute; width: 14px; height: 14px; margin: -7px 0 0 -7px; border-radius: 50%; background: #fff; box-shadow: 0 0 0 5px rgba(255,159,90,.35); }
.cv-tag { position: absolute; transform: translate(-50%, -190%); padding: 3px 8px; border-radius: 10px; background: rgba(255,255,255,.92); color: var(--ink); font-size: 12px; font-weight: 600; white-space: nowrap; }
.cv-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
.cv-chips span { padding: 6px 11px; border-radius: 13px; background: rgba(255,255,255,.07); font-size: 12px; color: var(--muted); cursor: pointer; }
.cv-chips b { color: #fff; font-weight: 600; margin-left: 4px; }
.heat-empty { height: 190px; margin-top: 12px; display: grid; place-items: center; font-size: 13px; color: var(--muted); }

.panels.rooms > .panel { flex: 1 1 280px; min-width: 0; }
.panels.rooms > .panel.hero { flex-basis: 100%; }
/* The hero room's rows flow into columns (as many 280 px columns as fit), filled top to bottom and kept whole. */
.panel.hero .rows { display: block; columns: 280px; column-gap: 10px; }
.panel.hero .rows > * { break-inside: avoid; margin-bottom: 8px; }
.room-climate { margin-top: 12px; }
.room-climate .wx-stat { background: rgba(255,255,255,.05); border-color: transparent; padding: 12px 14px; }
.room-climate .wx-stat b { font-size: 22px; font-weight: 500; --mdc-icon-size: 20px; }
.rows { margin-top: 12px; display: flex; flex-direction: column; gap: 8px; }
.row { display: grid; grid-template-columns: 36px 1fr auto; align-items: center; gap: 0 10px; padding: 8px 10px; border-radius: 16px; background: rgba(255,255,255,.05); text-align: left; }
.row .ic { width: 36px; height: 36px; --mdc-icon-size: 19px; }
.cov-btns { display: flex; gap: 6px; }
.cov-btns .icon-btn { width: 34px; height: 34px; --mdc-icon-size: 18px; }
.cov-btns .icon-btn:active { transform: scale(.9); background: rgba(255,255,255,.22); }
.row .t { font-size: 15px; font-weight: 500; }
.row .s { font-size: 12px; color: var(--muted); }
.row .fold { grid-column: 1 / -1; display: grid; grid-template-rows: 0fr; opacity: 0;
  transition: grid-template-rows .5s cubic-bezier(.22,1,.36,1), opacity .25s ease-out; }
.row .fold.open { grid-template-rows: 1fr; opacity: 1; transition-delay: 0s, .08s; }
.row .fold > div { min-height: 0; overflow: hidden; }
.ctl { display: grid; grid-template-columns: 36px minmax(0, 1fr) 38px; align-items: center; gap: 10px; min-height: 38px; margin-top: 8px;
  color: var(--muted); --mdc-icon-size: 19px; }
.ctl > ha-icon { justify-self: center; }
.ctl .vol-num { width: auto; font-size: 12px; text-align: center; }
.ctl .icon-btn { color: #fff; }
.icon-btn { transition: background-color .45s ease, color .45s ease, transform .12s ease-out; }
.icon-btn:active { transform: scale(.92); }
.icon-btn.sel { background: #F4F7F8; color: var(--ink); }
.slider.ct { background: linear-gradient(90deg, #FFA149, #FFD9A8 35%, #FFF6EA 55%, #DCE8FF 80%, #B9D2FF); }
.slider.hue { background: linear-gradient(90deg, #f44, #ff4 17%, #4f4 33%, #4ff 50%, #44f 67%, #f4f 83%, #f44); }
.swatch { justify-self: center; width: 20px; height: 20px; border-radius: 50%; background: var(--c); box-shadow: 0 0 0 2px rgba(255,255,255,.35); }
.sw { width: 48px; height: 28px; border-radius: 14px; background: rgba(255,255,255,.2); position: relative; transition: background .35s ease; }
.sw::after { content: ""; position: absolute; top: 3px; left: 3px; width: 22px; height: 22px; border-radius: 50%; background: #fff;
  box-shadow: 0 2px 6px rgba(0,0,0,.25); transition: transform .45s cubic-bezier(.22,1,.36,1); }
.sw.on { background: #6CC417; }
.sw.on::after { transform: translateX(20px); }
.empty { color: var(--muted); font-size: 14px; padding: 6px 2px; }
.state-ok { color: #8BE07A; }
.state-bad { color: #FF8A80; font-weight: 600; }

.np { position: relative; overflow: hidden; margin-top: 16px; border-radius: 30px; border: 1px solid rgba(255,255,255,.14);
  background: rgba(8,26,34,.6); box-shadow: 0 24px 60px rgba(0,0,0,.25); }
.np-bg { position: absolute; inset: -60px; background: center/cover; filter: blur(36px) saturate(170%); opacity: .6; will-change: transform; }
.np::after { content: ""; position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(100deg, rgba(6,18,26,.35) 0%, rgba(6,18,26,.62) 55%, rgba(6,18,26,.78) 100%); }
.np-inner { position: relative; z-index: 1; display: grid; grid-template-columns: minmax(0, 380px) minmax(0, 1fr); gap: 32px; padding: 28px; align-items: center; }
.np-art { width: 100%; aspect-ratio: 16 / 9; border-radius: 20px; background: rgba(255,255,255,.08) center/cover;
  box-shadow: 0 22px 50px rgba(0,0,0,.45); display: grid; place-items: center; --mdc-icon-size: 72px; color: rgba(255,255,255,.5); }
.np-art.square { aspect-ratio: 1; max-width: 280px; }
/* A TV that only knows the open app sends that app's small icon: show it at its own size, like an iOS app icon. */
.np-art.logo { display: grid; place-items: center; }
.np-art.brand, .np-bg.brand, .tile-art.brand { display: grid; place-items: center; }
.np-brand { width: 64%; height: 42%; background: var(--logo) center/contain no-repeat; }
.np-brand.mono { background: #fff; -webkit-mask: var(--logo) center/contain no-repeat; mask: var(--logo) center/contain no-repeat; }
.np-logo { width: 112px; height: 112px; border-radius: 26px; background: center/cover; box-shadow: 0 12px 32px rgba(0,0,0,.35); }
.np-chips { display: flex; gap: 8px; flex-wrap: wrap; }
.chip { display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 11px; border-radius: 14px; font-size: 12px; font-weight: 600;
  background: rgba(255,255,255,.14); border: 1px solid rgba(255,255,255,.1); --mdc-icon-size: 15px; }
.chip.app ha-icon { color: #FF4E45; }
.chip.app.logo { padding: 0 12px; }
.chip.app.logo .np-brand { width: 76px; height: 15px; }
.np-art.chan { background: #14232d center/62% no-repeat; box-shadow: inset 0 0 0 1px rgba(255,255,255,.1), 0 22px 50px rgba(0,0,0,.45); }
.tile-art.chan, .np-bg.chan { background-size: 90%; background-repeat: no-repeat; background-position: center; }
.chip.state i { width: 7px; height: 7px; border-radius: 50%; background: rgba(255,255,255,.5); }
.chip.state.on i { background: var(--lime); box-shadow: 0 0 8px var(--lime); animation: np-pulse 1.8s ease-in-out infinite; }
@keyframes np-pulse { 50% { opacity: .35; } }
.np-title { font-size: 26px; font-weight: 600; line-height: 1.2; margin-top: 14px; overflow-wrap: anywhere;
  display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.np-sub { font-size: 15px; color: var(--muted); margin-top: 4px; }
.np-prog { margin-top: 20px; }
.np-prog .bar { height: 6px; border-radius: 3px; margin: 0; background: rgba(255,255,255,.18); }
.np-ctrls { display: flex; align-items: center; gap: 18px; margin-top: 16px; }
.np-ctrls button { width: 52px; height: 52px; border-radius: 50%; display: grid; place-items: center; --mdc-icon-size: 30px; transition: background .2s, transform .15s; }
.np-ctrls button:hover { background: rgba(255,255,255,.1); }
.np-ctrls button:active { transform: scale(.92); }
.np-ctrls .play { width: 68px; height: 68px; background: #fff; color: var(--ink); --mdc-icon-size: 36px; box-shadow: 0 12px 30px rgba(0,0,0,.35); }
.np-ctrls .play:hover { background: #fff; }
.vol2 { display: flex; align-items: center; gap: 12px; margin-top: 18px; max-width: 440px; }
.vol2 .step { background: none; border: 1px solid rgba(255,255,255,.16); transition: transform .12s ease, opacity .2s ease; }
.vol2 .step:active { transform: scale(.88); background: rgba(255,255,255,.12); }
.vol2 .step:disabled { opacity: .35; }
/* Transport buttons and the volume row share one line; everything else in the body spans it. */
.np-body { display: grid; grid-template-columns: auto minmax(0, 1fr); column-gap: 32px; align-items: center; }
.np-body > :not(.np-ctrls):not(.vol2) { grid-column: 1 / -1; }
.np-body > .vol2 { margin-top: 16px; }
.icon-btn { width: 38px; height: 38px; flex: none; border-radius: 50%; display: grid; place-items: center; background: rgba(255,255,255,.12); --mdc-icon-size: 19px; }
.slider { -webkit-appearance: none; appearance: none; flex: 1; min-width: 0; height: 6px; margin: 0; border-radius: 3px; outline: none; cursor: pointer;
  background: linear-gradient(90deg, #fff 0 var(--v), rgba(255,255,255,.2) var(--v) 100%); }
.slider::-webkit-slider-thumb { -webkit-appearance: none; width: 22px; height: 22px; border-radius: 50%; background: #fff; border: 0; box-shadow: 0 2px 10px rgba(0,0,0,.4); }
.slider::-moz-range-thumb { width: 22px; height: 22px; border-radius: 50%; background: #fff; border: 0; box-shadow: 0 2px 10px rgba(0,0,0,.4); }
.vol-num { width: 30px; text-align: right; font-size: 13px; color: var(--muted); font-variant-numeric: tabular-nums; }
.players { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(340px, 100%), 1fr)); gap: 14px; margin-top: 14px; position: relative; align-items: start; }
.player { border-radius: 24px; padding: 16px 18px; background: var(--glass); border: 1px solid var(--glass-line); }
.player.is-on { background: rgba(255,255,255,.1); }
.player-hd { display: flex; align-items: center; gap: 12px; }
.player-hd .ic { width: 46px; height: 46px; flex: none; --mdc-icon-size: 23px; }
.player-hd .ic.lime { background: rgba(255,255,255,.2); color: #fff; }
.player-hd .t { font-size: 16px; font-weight: 600; }
.player-hd .s { font-size: 13px; color: var(--muted); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pwr { margin-left: auto; width: 42px; height: 42px; flex: none; border-radius: 50%; display: grid; place-items: center; background: rgba(255,255,255,.12); --mdc-icon-size: 20px; }
.pwr.on { background: var(--lime); color: var(--lime-ink); }
.player .vol2 { margin-top: 14px; max-width: none; }
.times { display: flex; justify-content: space-between; font-size: 12px; color: var(--muted); margin-top: 6px; font-variant-numeric: tabular-nums; }
.vol { display: flex; align-items: center; gap: 10px; margin-top: 12px; --mdc-icon-size: 20px; color: var(--muted); }
.vol input { flex: 1; accent-color: #fff; }

.sheet-wrap { position: fixed; inset: 0; z-index: 5; display: grid; place-items: center; padding: 20px;
  touch-action: none; overscroll-behavior: contain; overflow: visible; }
/* The dimmed, blurred page sits in its own layer so it can fade while the sheet itself stays solid. */
/* HA starts its view below the status bar, so the dimmed page is pulled up under it as well. */
.sheet-bg { position: absolute; inset: calc(-1 * env(safe-area-inset-top, 0px)) 0 0; background: rgba(4,14,20,.38);
  -webkit-backdrop-filter: blur(14px) saturate(120%); backdrop-filter: blur(14px) saturate(120%); }
.sheet { position: relative; touch-action: pan-y; overscroll-behavior: contain; -webkit-overflow-scrolling: touch; }
.sheet { width: min(520px, 100%); max-height: 86vh; overflow: auto; border-radius: 28px; padding: 22px;
  background: linear-gradient(180deg, rgba(255,255,255,.12), rgba(255,255,255,.03)), rgba(20,62,76,.66);
  border: 1px solid rgba(255,255,255,.2); box-shadow: inset 0 1px 0 rgba(255,255,255,.3), 0 30px 80px rgba(0,0,0,.35); color: #fff;
  font-family: Figtree, var(--ha-font-family-body, Roboto), system-ui, sans-serif; }
.sheet .hd { display: flex; align-items: center; gap: 12px; }
.grab { display: none; position: absolute; top: 7px; left: 50%; z-index: 3; width: 40px; height: 5px; margin-left: -20px; border-radius: 3px;
  background: rgba(255,255,255,.45); }
.sheet .hd h2 { margin: 0; font-size: 22px; font-weight: 600; }
.sheet .rows { margin-top: 16px; }
.thermo { margin-top: 16px; padding: 18px; border-radius: 24px; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.1); }
.th-status { display: flex; align-items: center; justify-content: center; gap: 6px; margin-bottom: 10px; font-size: 13px; color: var(--muted); --mdc-icon-size: 16px; transition: color .3s; }
.th-status.heat { color: #FFB340; }
.th-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.th-btn { width: 56px; height: 56px; flex: none; border-radius: 50%; display: grid; place-items: center; --mdc-icon-size: 26px;
  background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.14); transition: transform .15s, background .2s; }
.th-btn:active { transform: scale(.92); background: rgba(255,255,255,.2); }
.th-btn:disabled { opacity: .35; }
.th-val { text-align: center; min-width: 0; }
.th-val b { display: block; font-size: 56px; font-weight: 300; line-height: 1.05; letter-spacing: -.02em; font-variant-numeric: tabular-nums; }
.th-val span { display: block; font-size: 14px; color: var(--muted); }
/* Its own line, always there, so a note coming or going never changes the panel's height. */
.th-note { font-size: 13px !important; line-height: 18px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.th-modes { display: flex; gap: 8px; margin-top: 16px; }
.th-modes button { flex: 1; min-width: 0; height: 40px; padding: 0 8px; border-radius: 20px; display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  font-size: 13px; font-weight: 500; white-space: nowrap; background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.12); --mdc-icon-size: 16px;
  transition: background .25s, color .25s, transform .15s; }
.th-modes button:active { transform: scale(.96); }
.th-modes button.on { background: var(--lime); color: var(--lime-ink); border-color: transparent; }
.cams { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(300px, 100%), 1fr)); gap: 14px; margin-top: 10px; }
.cam { position: relative; aspect-ratio: 16 / 9; border-radius: 22px; overflow: hidden; cursor: pointer;
  background: rgba(255,255,255,.06); border: 1px solid var(--glass-line); transition: transform .15s; }
.cam:active { transform: scale(.98); }
.cam img, .cam-tile > img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.cam-meta { position: absolute; left: 0; right: 0; bottom: 0; padding: 28px 14px 12px; display: flex; align-items: center; gap: 6px;
  font-size: 14px; font-weight: 600; color: #fff; background: linear-gradient(transparent, rgba(0,0,0,.6)); --mdc-icon-size: 16px; }
.cam-tile::after { content: ""; position: absolute; inset: 0; background: linear-gradient(rgba(0,0,0,.45), transparent 45%, rgba(0,0,0,.65)); }
.cam-tile > :not(img) { position: relative; z-index: 1; }
.cam-tile .kicker { color: #fff; opacity: .9; }
.cam-tile .title { margin-top: auto; font-size: 16px; font-weight: 600; }
.sheet.cam-sheet { width: min(960px, 100%); }
.cam-live { position: relative; margin-top: 14px; aspect-ratio: 16 / 9; border-radius: 20px; overflow: hidden; background: #000 var(--still, none) center/cover; }
.cam-slot, .cam-feed, .cam-freeze { position: absolute; inset: 0; width: 100%; height: 100%; }
.cam-freeze { object-fit: contain; }
.cam-feed { opacity: 0; transition: opacity .45s ease; object-fit: contain; display: block; --video-max-height: 100%; }
.cam-feed.ready { opacity: 1; }
/* The still only bridges the wait and goes once the live picture is up. */
.cam-live:has(.cam-feed.settled) { --still: none !important; }
.cam-badge { position: absolute; top: 12px; right: 12px; padding: 4px 10px; border-radius: 12px; display: flex; align-items: center; gap: 6px;
  font-size: 12px; font-weight: 600; background: rgba(0,0,0,.45); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); }
.cam-badge i { width: 7px; height: 7px; border-radius: 50%; background: #FF3B30; animation: cam-pulse 1.6s ease-in-out infinite; transition: background .3s ease; }
.cam-badge .wait { display: none; }
.cam-live:not(:has(.cam-feed.ready)) .cam-badge i { background: rgba(255,255,255,.7); animation-duration: .9s; }
.cam-live:not(:has(.cam-feed.ready)) .cam-badge .wait { display: inline; }
.cam-live:not(:has(.cam-feed.ready)) .cam-badge .on { display: none; }
@keyframes cam-pulse { 50% { opacity: .35; } }
@media (prefers-reduced-motion: reduce) { .cam-badge i { animation: none; } }
.cam-thumbs { display: flex; gap: 12px; overflow-x: auto; margin: 18px -22px 0; padding: 3px 22px 4px; scroll-padding: 0 22px;
  scroll-snap-type: x proximity; overscroll-behavior-x: contain; scrollbar-width: none; }
.cam-thumbs::-webkit-scrollbar { display: none; }
.cam-thumb { flex: none; width: 160px; display: flex; flex-direction: column; gap: 8px; text-align: left; scroll-snap-align: start; }
.ct-img { display: block; aspect-ratio: 16 / 9; border-radius: 14px; overflow: hidden; background: rgba(255,255,255,.08);
  box-shadow: 0 0 0 0 var(--lime); transition: box-shadow .3s ease, transform .15s; }
.ct-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
.cam-thumb.on .ct-img { box-shadow: 0 0 0 3px var(--lime); }
.cam-thumb:active .ct-img { transform: scale(.96); }
.ct-name { padding-left: 2px; font-size: 14px; font-weight: 500; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; transition: color .3s; }
.cam-thumb.on .ct-name { color: #fff; font-weight: 600; }
.cam-sheet .wide-btn { margin-top: 18px; }
.cam-sheet .cam-fs { display: none; margin-right: 10px; }
/* Short landscape screens (the wall tablet at native density, 1000 x 600): the whole picture has to fit without
   scrolling. The video takes its size from the screen height, the sheet hugs it, the thumbnails shrink to one row
   under it with the name on the picture, and "Pełny ekran" moves into the header as an icon.
   Height budget: 24 wrap + 32 padding + 44 header + 10 + 10 gaps + 7 thumb padding + thumbs (video / 6 tall). */
@media (orientation: landscape) and (min-width: 900px) and (max-height: 640px) {
  .sheet-wrap:has(.cam-sheet) { padding: 12px; }
  .sheet.cam-sheet { width: fit-content; max-width: 100%; max-height: none; padding: 16px; overflow: visible; }
  .cam-sheet .cam-live:not(.full) { margin-top: 10px; width: calc((100vh - 124px) * 32 / 21); max-width: calc(100vw - 56px); }
  .cam-sheet .cam-thumbs { width: 0; min-width: 100%; margin: 10px 0 0; padding: 3px 0 4px; gap: 8px; overflow: visible; }
  .cam-sheet .cam-thumb { flex: 1 1 0; width: auto; min-width: 0; position: relative; }
  .cam-sheet .ct-img { border-radius: 10px; }
  .cam-sheet .ct-name { position: absolute; left: 0; right: 0; bottom: 0; padding: 12px 7px 5px; font-size: 11px; color: #fff;
    border-radius: 0 0 10px 10px; background: linear-gradient(transparent, rgba(0,0,0,.65)); pointer-events: none; }
  .cam-sheet .wide-btn { display: none; }
  .cam-sheet .cam-fs { display: grid; }
}
.cam-exit { position: absolute; top: max(12px, env(safe-area-inset-top)); right: 12px; z-index: 2; display: none;
  background: rgba(0,0,0,.45); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); }
.cam-live:fullscreen .cam-exit, .cam-live.full .cam-exit { display: grid; }
.cam-live:fullscreen, .cam-live.full { border-radius: 0; background: #000; }
/* Full screen: the still sits in the 16:9 frame the stream will fill, cropped as in the sheet (the doorbell's 4:3
   snapshot would otherwise stick out above and below the picture), with a spinner over it until the live picture
   fades in. No black between the still and the stream. */
.cam-live:fullscreen::before, .cam-live.full::before { content: ""; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
  width: min(100%, 100dvh * 16 / 9); aspect-ratio: 16 / 9; background: var(--still, none) center/cover no-repeat; }
.cam-live:fullscreen:not(:has(.cam-feed.ready))::after, .cam-live.full:not(:has(.cam-feed.ready))::after { content: ""; position: absolute;
  top: 50%; left: 50%; width: 34px; height: 34px; margin: -17px 0 0 -17px; border-radius: 50%; border: 3px solid rgba(255,255,255,.22);
  border-top-color: #fff; animation: cam-spin .8s linear infinite; pointer-events: none; }
@keyframes cam-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .cam-live.full::after, .cam-live:fullscreen::after { animation: cam-pulse 1.6s ease-in-out infinite; } }
.cam-live.full { position: fixed; inset: 0; z-index: 60; margin: 0; aspect-ratio: auto !important; }
.cam-live:fullscreen .cam-badge, .cam-live.full .cam-badge { top: max(12px, env(safe-area-inset-top)); right: 64px; }
.sensors { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-top: 16px; }
.sensor { padding: 14px; border-radius: 18px; background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.1); text-align: left; cursor: pointer; }
.sensor .sn { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 500; color: var(--muted); --mdc-icon-size: 18px; }
.sensor .sv { font-size: 30px; font-weight: 400; margin-top: 6px; font-variant-numeric: tabular-nums; }
.sensor .sh { display: flex; align-items: center; gap: 4px; font-size: 13px; color: var(--muted); --mdc-icon-size: 16px; margin-top: 2px; }
.sheet.wx { width: min(640px, 100%); background: linear-gradient(180deg, rgba(255,255,255,.14), rgba(255,255,255,.02)), var(--wx-bg); }
.wx-hero { display: flex; align-items: center; gap: 12px; margin-top: 4px; }
.wx-temp { font-size: 64px; font-weight: 300; line-height: 1; font-variant-numeric: tabular-nums; }
.wx-cond { font-size: 18px; font-weight: 500; margin-top: 6px; }
.wx-stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin-top: 16px; }
.wx-stat { padding: 10px 12px; border-radius: 16px; background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.12); font-size: 12px; color: var(--muted);
  display: flex; flex-direction: column; gap: 2px; --mdc-icon-size: 16px; }
.wx-stat { min-width: 0; }
/* person sheet: values like "W spoczynku" or an SSID need wider tiles than 4 columns give */
.wx-stats.two { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.wx-stats.three { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.hsh-big { margin-top: 18px; font-size: 54px; font-weight: 300; line-height: 1; color: var(--c); font-variant-numeric: tabular-nums; }
.hsh-big small { font-size: 20px; font-weight: 500; margin-left: 6px; color: var(--muted); }
.hsh-hint { margin: 10px 0 0; font-size: 14px; line-height: 1.45; color: var(--muted); }
.sheet.heat-sheet { --sx: 22px; }
/* The chart runs from edge to edge of the sheet (no side margins), like the charts on the iPhone. */
.hsh-chart { position: relative; margin: 18px calc(-1 * var(--sx)) 0; padding-bottom: 20px; }
@media (max-width: 760px) { .sheet.heat-sheet { --sx: 20px; } }
.hsh-chart svg { display: block; width: 100%; height: 150px; }
.hsh-x span { position: absolute; bottom: 0; transform: translateX(-50%); font-size: 11px; color: var(--muted); }
.hsh-ph { height: 150px; display: grid; place-items: center; color: var(--muted); font-size: 14px; }
.hsh-x { height: 0; }
.hsh-set { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 16px; padding: 10px 12px 10px 16px; border-radius: 20px; background: rgba(255,255,255,.08); font-size: 14px; color: var(--muted); }
.hsh-step { display: flex; align-items: center; gap: 14px; }
.hsh-step b { min-width: 52px; text-align: center; font-size: 24px; font-weight: 400; color: #fff; font-variant-numeric: tabular-nums; }
.hsh-issues { display: grid; gap: 8px; margin-top: 16px; }
.hsh-issues > div { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-radius: 16px; font-size: 15px; color: #FFD59A; background: rgba(255,159,10,.16); --mdc-icon-size: 20px; }
.hsh-issues > div.urgent { color: #FFC2B8; background: rgba(255,107,90,.2); }
.hsh-issues > div.ok { color: var(--lime); background: rgba(184,240,60,.12); }
/* Low landscape screens (the wall tablet, 599 px tall): the whole sheet fits without scrolling. */
@media (max-height: 700px) and (orientation: landscape) {
  .sheet.heat-sheet { width: min(640px, 100%); padding: 18px 22px; }
  .heat-sheet .hsh-big { margin-top: 8px; font-size: 40px; }
  .heat-sheet .hsh-hint { margin-top: 6px; font-size: 13px; }
  .heat-sheet .hsh-set { margin-top: 10px; padding: 6px 8px 6px 16px; }
  .heat-sheet .hsh-set .th-btn { width: 44px; height: 44px; --mdc-icon-size: 22px; }
  .heat-sheet .hsh-chart { margin-top: 10px; }
  .heat-sheet .hsh-chart svg, .heat-sheet .hsh-ph { height: 92px; }
  .heat-sheet .wx-stats { margin-top: 8px; }
  .heat-sheet .wide-btn { margin-top: 10px; height: 40px; }
}
.wx-stats.five { grid-template-columns: repeat(5, minmax(0, 1fr)); }
.wx-stats.two > :only-child { grid-column: 1 / -1; }
.wx-stat b { color: #fff; font-size: 15px; font-weight: 600; display: flex; align-items: center; gap: 4px; line-height: 1.2; overflow-wrap: anywhere; }
.wx-stat b ha-icon { flex: none; }
.sheet .label { margin-top: 20px; }
.hours { display: flex; gap: 8px; overflow-x: auto; margin: 8px -22px 0; padding: 0 22px 4px; scroll-padding: 0 22px;
  scroll-snap-type: x proximity; overscroll-behavior-x: contain; scrollbar-width: none; }
.hours .hr { scroll-snap-align: start; }
.wx-demo { display: flex; gap: 6px; overflow-x: auto; margin: 0 -22px 12px; padding: 0 22px; scrollbar-width: none; overscroll-behavior-x: contain; }
.wx-demo::-webkit-scrollbar { display: none; }
.wx-demo button { flex: none; height: 32px; padding: 0 12px 0 8px; border-radius: 16px; display: inline-flex; align-items: center; gap: 5px;
  font: inherit; font-size: 13px; color: #fff; background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.12); --mdc-icon-size: 18px;
  transition: background .25s ease, color .25s ease; }
.wx-demo button.on { background: #fff; color: #0B2633; }
.hours::-webkit-scrollbar { display: none; }
.hr { flex: none; width: 58px; padding: 10px 0; border-radius: 16px; background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.1); display: flex; flex-direction: column;
  align-items: center; gap: 6px; font-size: 12px; color: var(--muted); --mdc-icon-size: 22px; }
.hr ha-icon { color: #fff; }
.hr b { color: #fff; font-size: 15px; font-weight: 600; }
.hr i { font-style: normal; color: #9AD8FF; font-size: 11px; }
.days { margin-top: 6px; }
.day { display: grid; grid-template-columns: 58px 26px 40px 34px minmax(0, 1fr) 34px; align-items: center; gap: 8px; padding: 9px 2px;
  font-size: 14px; border-top: 1px solid rgba(255,255,255,.08); --mdc-icon-size: 22px; }
.day:first-child { border-top: 0; }
.day .p { color: #9AD8FF; font-size: 12px; }
.day .lo { color: var(--muted); text-align: right; font-variant-numeric: tabular-nums; }
.day .hi { font-variant-numeric: tabular-nums; }
.range { position: relative; height: 6px; border-radius: 3px; background: rgba(255,255,255,.12); }
.range i { position: absolute; top: 0; bottom: 0; border-radius: 3px; background: linear-gradient(90deg, #7FD3FF, #FFD36B, #FF9F5A); }

.wx-art { position: relative; width: 150px; height: 120px; flex: none; }
.wx-art .sun { position: absolute; left: 30px; top: 12px; width: 64px; height: 64px; border-radius: 50%;
  background: radial-gradient(circle at 40% 38%, #FFF1A8, #FFB627 72%); box-shadow: 0 0 44px rgba(255,190,60,.7); animation: wx-pulse 4s ease-in-out infinite; }
.wx-art .sun::before { content: ""; position: absolute; inset: -20px; border-radius: 50%;
  background: repeating-conic-gradient(rgba(255,214,102,.7) 0 5deg, transparent 5deg 30deg);
  -webkit-mask: radial-gradient(circle, transparent 40px, #000 41px, #000 51px, transparent 52px);
  mask: radial-gradient(circle, transparent 40px, #000 41px, #000 51px, transparent 52px); animation: wx-spin 20s linear infinite; }
.wx-art .moon { position: absolute; left: 30px; top: 10px; width: 60px; height: 60px; border-radius: 50%;
  box-shadow: inset 16px -6px 0 0 #F6F1D8; filter: drop-shadow(0 0 16px rgba(246,241,216,.5)); animation: wx-pulse 6s ease-in-out infinite; }
.wx-art .stars i { position: absolute; width: 3px; height: 3px; border-radius: 50%; background: #fff; left: var(--x); top: var(--y);
  animation: wx-twinkle 3s ease-in-out infinite; animation-delay: calc(var(--i) * -.7s); }
.wx-art .cloud { position: absolute; left: 44px; top: 50px; width: 92px; height: 34px; border-radius: 20px; background: #EAF1F5;
  box-shadow: 0 10px 22px rgba(0,0,0,.18); animation: wx-drift 7s ease-in-out infinite alternate; }
.wx-art .cloud::before { content: ""; position: absolute; left: 12px; top: -20px; width: 40px; height: 40px; border-radius: 50%; background: #EAF1F5; }
.wx-art .cloud::after { content: ""; position: absolute; left: 36px; top: -30px; width: 50px; height: 50px; border-radius: 50%; background: #FFFFFF; }
.wx-art .cloud.back { left: 8px; top: 34px; transform: scale(.72); opacity: .8; animation-duration: 9s; animation-direction: alternate-reverse; }
.wx-art .cloud.dark, .wx-art .cloud.dark::before { background: #A9B9C4; }
.wx-art .cloud.dark::after { background: #C3CFD7; }
.wx-art .cloud.back.dark, .wx-art .cloud.back.dark::before, .wx-art .cloud.back.dark::after { background: #7F93A1; }
.wx-art .rain, .wx-art .snow, .wx-art .fog { position: absolute; left: 54px; top: 86px; width: 84px; height: 34px; }
.wx-art .rain i { position: absolute; left: calc(var(--i) * 12px); top: 0; width: 2px; height: 12px; border-radius: 1px;
  background: linear-gradient(transparent, #8FD3FF); animation: wx-fall .9s linear infinite; animation-delay: calc(var(--i) * -.17s); }
.wx-art .snow i { position: absolute; left: calc(var(--i) * 13px); top: 0; width: 6px; height: 6px; border-radius: 50%; background: #fff;
  animation: wx-snow 2.8s linear infinite; animation-delay: calc(var(--i) * -.47s); }
.wx-art .bolt { position: absolute; left: 82px; top: 72px; width: 24px; height: 42px; background: #FFD54A;
  clip-path: polygon(45% 0, 100% 0, 62% 42%, 96% 42%, 22% 100%, 40% 54%, 6% 54%); filter: drop-shadow(0 0 10px #FFD54A); animation: wx-flash 3.2s infinite; }
.wx-art .fog { top: 78px; left: 30px; width: 110px; }
.wx-art .fog i { display: block; height: 5px; margin: 6px 0; border-radius: 3px; background: rgba(255,255,255,.55);
  animation: wx-drift 5s ease-in-out infinite alternate; animation-delay: calc(var(--i) * -1.4s); }
.wx-art .fog.wind i { height: 3px; width: 70%; margin-left: calc(var(--i) * 12px); }
ha-icon { transition: color .45s ease; }
.ic, .pw, .pwr, .round, .chip-btn, .chip-btn .badge, .act, .devchip, .pstate, .chip, .row, .dot, .dots i, .sensor, .pmetric, .wide-btn {
  transition: background-color .45s ease, color .45s ease, border-color .45s ease, box-shadow .45s ease; }
@keyframes wx-spin { to { transform: rotate(360deg); } }
@keyframes wx-pulse { 50% { transform: scale(1.05); } }
@keyframes wx-drift { from { translate: -6px 0; } to { translate: 8px 0; } }
@keyframes wx-fall { from { transform: translateY(-4px); opacity: 0; } 20% { opacity: 1; } to { transform: translateY(34px); opacity: 0; } }
@keyframes wx-snow { from { transform: translate(0, -4px); opacity: 0; } 20% { opacity: 1; } 50% { transform: translate(5px, 14px); } to { transform: translate(-2px, 34px); opacity: 0; } }
@keyframes wx-flash { 0%, 86%, 100% { opacity: 0; } 88%, 94% { opacity: 1; } 91% { opacity: .2; } }
@keyframes wx-twinkle { 50% { opacity: .2; } }
.person-hero { display: flex; align-items: center; gap: 16px; flex: 1; min-width: 0; }
.person-pic { position: relative; width: 88px; height: 88px; border-radius: 50%; flex: none; background: #E9A15B center/cover;
  display: grid; place-items: center; font-size: 34px; font-weight: 700; color: #3A2412; box-shadow: 0 0 0 3px rgba(255,255,255,.2); }
.person-pic.home { box-shadow: 0 0 0 3px #4CD964, 0 0 28px rgba(76,217,100,.45); }
.person-hero h2 { margin: 0; font-size: 26px; font-weight: 600; }
.person-hero .st { font-size: 15px; margin-top: 4px; color: var(--muted); }
.person-hero .st b { color: #8BE07A; font-weight: 600; }
.where { display: flex; gap: 10px; align-items: flex-start; margin-top: 12px; padding: 12px 14px; border-radius: 16px; font-size: 14px;
  background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.12); --mdc-icon-size: 20px; }
.wide-btn { margin-top: 14px; width: 100%; height: 44px; border-radius: 22px; display: flex; align-items: center; justify-content: center; gap: 8px;
  font-size: 14px; font-weight: 500; background: rgba(255,255,255,.14); border: 1px solid rgba(255,255,255,.16); --mdc-icon-size: 18px; }
.pw.ring, .tile.on .pw.ring { position: relative; background: none; }
.pw.ring span { position: absolute; inset: 0; display: grid; place-items: center; font-size: 12px; font-weight: 700; font-variant-numeric: tabular-nums; }
.ring-svg { transform: rotate(-90deg); display: block; }
.ring-svg circle { fill: none; stroke-width: 5; }
.ring-bg { stroke: rgba(255,255,255,.14); }
.tile.on .ring-bg { stroke: rgba(18,35,44,.12); }
.ring-fg { stroke: var(--lime); stroke-linecap: round; transition: stroke-dashoffset .8s cubic-bezier(.22,1,.36,1); }
.tile.on .ring-fg { stroke: #5E9E12; }
.app-hero { display: grid; place-items: center; margin-top: 18px; }
.app-ring { position: relative; width: 132px; height: 132px; }
.app-ring .ring-svg circle { stroke-width: 4; }
.app-ring-txt { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
.app-ring-txt b { font-size: 30px; font-weight: 600; font-variant-numeric: tabular-nums; --mdc-icon-size: 34px; display: flex; }
.app-ring-txt span { font-size: 12px; color: var(--muted); margin-top: 2px; max-width: 100px; }
.app-hero.done .app-ring-txt b { color: var(--lime); }
.app-actions { margin-top: 16px; justify-content: center; }
.vac-map { margin-top: 16px; border-radius: 22px; overflow: hidden; background: rgba(0,0,0,.22); border: 1px solid rgba(255,255,255,.12); }
.vac-map img { display: block; width: 100%; height: auto; }
.vac-ctrls { display: flex; justify-content: space-around; margin-top: 18px; }
.vac-ctrls button { display: flex; flex-direction: column; align-items: center; gap: 6px; font-size: 12px; color: var(--muted); }
.vac-ctrls .c { width: 54px; height: 54px; border-radius: 50%; display: grid; place-items: center; background: rgba(255,255,255,.12); color: #fff;
  --mdc-icon-size: 24px; transition: background-color .45s ease, color .45s ease, transform .12s ease-out; }
.vac-ctrls button:active .c { transform: scale(.92); }
.vac-ctrls .main .c { background: #F4F7F8; color: var(--ink); }
.vac-label { margin-top: 22px; }
.vac-rooms { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.vac-rooms .scene.cur { background: var(--lime); color: var(--lime-ink); border-color: transparent; }
.seg { display: flex; padding: 3px; margin-top: 10px; border-radius: 14px; background: rgba(255,255,255,.1); }
.seg button { flex: 1; height: 34px; border-radius: 11px; font-size: 13px; font-weight: 500; color: var(--muted);
  transition: background-color .3s ease, color .3s ease; }
.seg button.sel { background: #F4F7F8; color: var(--ink); font-weight: 600; }
.wears { display: grid; gap: 12px; margin-top: 12px; }
.wear { display: grid; grid-template-columns: 1fr auto; gap: 6px 10px; font-size: 14px; }
.wear b { font-weight: 600; font-variant-numeric: tabular-nums; }
.wear .bar { grid-column: 1 / -1; margin-top: 0; }
.wear.low b { color: #FFC56B; }
.wear.low .bar i { background: #FFB340; }
.sub.one-line { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.devchip { white-space: nowrap; display: inline-flex; align-items: center; gap: 4px; font-size: 13px; opacity: .8; --mdc-icon-size: 16px; font-variant-numeric: tabular-nums; }
.devchip i { width: 7px; height: 7px; border-radius: 50%; background: currentColor; opacity: .35; }
.devchip i.on { background: #7BC91E; opacity: 1; }
.tile:not(.on) .devchip i.on { background: var(--lime); }
.row-end { display: flex; align-items: center; gap: 10px; }
.mini { height: 32px; padding: 0 12px; border-radius: 16px; display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600;
  background: rgba(255,255,255,.14); border: 1px solid rgba(255,255,255,.16); --mdc-icon-size: 16px; }
.mini.busy { opacity: .6; pointer-events: none; }
.batt { display: inline-flex; align-items: center; gap: 4px; font-size: 14px; font-weight: 600; font-variant-numeric: tabular-nums; --mdc-icon-size: 18px; }
.todo-add { display: flex; gap: 8px; margin-top: 16px; }
.todo-add input { flex: 1; min-width: 0; height: 44px; border-radius: 22px; border: 1px solid rgba(255,255,255,.18); background: rgba(255,255,255,.1);
  color: #fff; padding: 0 16px; font: inherit; font-size: 15px; outline: none; }
.todo-add input::placeholder { color: var(--muted); }
.todo-add input:focus { border-color: rgba(184,240,60,.6); }
.todo-add button { width: 44px; height: 44px; flex: none; border-radius: 50%; background: var(--lime); color: var(--lime-ink); display: grid; place-items: center; --mdc-icon-size: 22px; }
.todos { margin-top: 12px; display: flex; flex-direction: column; gap: 6px; }
.todo { display: flex; align-items: center; gap: 12px; padding: 11px 12px; border-radius: 14px; text-align: left; cursor: pointer;
  background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.08); font-size: 15px; }
.chk { width: 24px; height: 24px; flex: none; border-radius: 50%; border: 2px solid rgba(255,255,255,.55); display: grid; place-items: center;
  color: transparent; --mdc-icon-size: 16px; transition: background .2s, border-color .2s; }
.chk ha-icon { transform: scale(.3); transition: transform .45s cubic-bezier(.22,1,.36,1), color .3s ease; }
.todo.done .chk ha-icon { transform: none; }
.todo .tt { transition: color .35s ease; }
.todo.done .chk { background: var(--lime); border-color: var(--lime); color: var(--lime-ink); }
.todo.done .tt { text-decoration: line-through; color: var(--muted); }
.tt small { display: block; font-size: 12px; color: var(--muted); margin-top: 1px; }
.done-hd { display: flex; justify-content: space-between; align-items: center; margin-top: 18px; }
.link { font-size: 13px; color: #9AD8FF; font-weight: 500; }
.plant-tile { background: linear-gradient(160deg, rgba(52,199,89,.22), rgba(20,60,40,.35)); }
.plant-tile.has-photo { background: #12301f; border-color: rgba(255,255,255,.16); }
.tile-photo { position: absolute; inset: 0; background: center/cover; transform: scale(1.02); transition: transform .6s ease; }
.plant-tile:hover .tile-photo { transform: scale(1.07); }
.plant-tile.has-photo::after { content: ""; position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(180deg, rgba(6,18,26,.45) 0%, rgba(6,18,26,0) 28%); }
.pbody { margin: auto -16px -16px; padding: 10px 16px 14px; }
.plant-tile.has-photo .pbody { background: rgba(8,24,32,.74); border-top: 1px solid rgba(255,255,255,.12);
  -webkit-backdrop-filter: blur(16px) saturate(150%); backdrop-filter: blur(16px) saturate(150%); }
.plant-tile > :not(.tile-photo) { position: relative; z-index: 1; }
.ptop { display: flex; justify-content: space-between; align-items: center; }
.plant-tile .kicker { opacity: .9; text-shadow: 0 1px 6px rgba(0,0,0,.5); }
.pstat { display: inline-flex; align-items: center; gap: 4px; height: 24px; padding: 0 9px; border-radius: 12px; font-size: 11px; font-weight: 700;
  background: rgba(52,199,89,.85); color: #fff; --mdc-icon-size: 14px; -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); }
.pstate { background: rgba(184,240,60,.16); color: var(--lime); --mdc-icon-size: 22px; }
.pstate.bad { background: rgba(255,159,10,.2); color: #FFB340; }
.plant-tile .name { font-size: 17px; margin-top: auto; }
.proom { margin-left: 6px; font-size: 12px; font-weight: 500; opacity: .6; }
.plant-tile .plant-pic { width: 48px; height: 48px; }
.plant-tile .sub { opacity: .85; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.plant-tile.plant-warn { background: linear-gradient(160deg, rgba(255,159,10,.2), rgba(255,159,10,.06)); border-color: rgba(255,179,64,.45); }
.plant-tile.plant-warn .sub { color: #FFD08A; }
.pfoot { justify-content: flex-start; gap: 12px; min-width: 0; }
.pfoot .devchip { min-width: 0; }
.pfoot .devchip span { overflow: hidden; text-overflow: ellipsis; }
.pfoot .devchip.keep { flex: none; }
.pchip { display: inline-flex; align-items: center; gap: 4px; height: 22px; padding: 0 8px; border-radius: 11px; font-size: 12px; font-weight: 600;
  background: rgba(255,255,255,.14); --mdc-icon-size: 13px; white-space: nowrap; -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); font-variant-numeric: tabular-nums; }
.plant-sheet { padding-top: 0; }
.plant-banner { position: relative; height: 240px; margin: 0 -22px; border-radius: 28px 28px 0 0; background: #12301f center/cover;
  display: flex; align-items: flex-end; overflow: hidden; }
.plant-banner::after { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(6,18,26,.15) 0%, rgba(6,18,26,0) 35%, rgba(10,30,38,.85) 100%); }
.plant-banner .round { position: absolute; top: 14px; right: 14px; z-index: 2; background: rgba(0,0,0,.3); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); }
.pb-txt { position: relative; z-index: 1; padding: 0 22px 18px; }
.pb-txt h2 { margin: 6px 0 0; font-size: 30px; font-weight: 700; text-shadow: 0 2px 12px rgba(0,0,0,.5); }
.pb-txt .sp { font-size: 14px; font-style: italic; opacity: .85; margin-top: 2px; }
.plant-pic { width: 40px; height: 40px; border-radius: 50%; flex: none; background: #34C759 center/cover; display: grid; place-items: center;
  color: #fff; --mdc-icon-size: 22px; box-shadow: 0 0 0 2px rgba(255,255,255,.18); }
.tile.plant-warn { background: rgba(255,159,10,.16); border-color: rgba(255,179,64,.45); }
.tile.plant-warn .sub { color: #FFC56B; opacity: 1; }
.plant-hero { display: flex; align-items: center; gap: 16px; flex: 1; min-width: 0; }
.plant-hero .plant-pic { width: 96px; height: 96px; border-radius: 26px; --mdc-icon-size: 44px; box-shadow: 0 14px 34px rgba(0,0,0,.35); }
.plant-hero h2 { margin: 0; font-size: 26px; font-weight: 600; }
.plant-hero .sp { font-size: 14px; font-style: italic; color: var(--muted); margin-top: 2px; }
.pbadge { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: var(--lime); --mdc-icon-size: 16px;
  text-shadow: 0 1px 8px rgba(0,0,0,.6); }
.pbadge.bad { color: #FFC56B; }
.pproblems { margin-top: 16px; display: flex; flex-direction: column; gap: 8px; }
.pproblem { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 16px; background: rgba(255,159,10,.14); border: 1px solid rgba(255,179,64,.3); }
.pproblem .ic { width: 36px; height: 36px; flex: none; color: #fff; --mdc-icon-size: 19px; }
.pproblem .t { font-size: 15px; font-weight: 600; }
.pproblem .s { font-size: 12px; color: var(--muted); margin-top: 2px; }
.pmetrics { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-top: 16px; }
.pmetric { padding: 12px 14px; border-radius: 18px; background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.1); cursor: pointer; min-width: 0;
  display: flex; flex-direction: column; }
.pmetric .pm-hd { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--muted); --mdc-icon-size: 18px; }
.pmetric .pm-hd ha-icon { color: var(--c); }
.pmetric .pm-v { font-size: 22px; font-weight: 500; margin-top: 6px; font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pmetric .pm-s { display: flex; align-items: center; gap: 4px; margin-top: auto; padding-top: 8px; font-size: 13px; color: var(--muted); --mdc-icon-size: 16px; }
.pmetric .pm-s ha-icon { color: var(--lime); }
.pmetric .pm-s.bad { color: #FFC56B; }
.pmetric .pm-s.bad ha-icon { color: #FFB340; }
.sensor .warn { margin-left: 6px; padding: 1px 7px; border-radius: 8px; background: rgba(255,179,64,.18); color: #FFC56B; font-size: 11px; font-weight: 600; }

@media (max-width: 760px) {
  .deck { padding: 18px 16px calc(104px + env(safe-area-inset-bottom)); }
  .vol2 { gap: 9px; }
  .clock { font-size: 44px; }
  .headline { font-size: 24px; }
  .actions { width: 100%; }
  .act { flex: 1; justify-content: center; padding: 0 10px; white-space: nowrap; }
  .tile { min-height: 176px; padding: 16px; border-radius: 24px; }
  .nav { left: 16px; right: 16px; bottom: max(8px, calc(env(safe-area-inset-bottom) - 12px)); margin-bottom: 0; transform: none; gap: 0; border-radius: 34px;
    clip-path: inset(0 0 0 0 round 34px); transform-origin: var(--mx, 0px) 100%;
    transition: clip-path .55s cubic-bezier(.22,1,.36,1), transform .55s cubic-bezier(.22,1,.36,1); }
  .nav button { flex: 1; height: 56px; padding: 0; border-radius: 28px; justify-content: center; --mdc-icon-size: 30px; }
  .nav button span { display: none; }
  .nav-pill { border-radius: 28px; clip-path: inset(0 0 round 28px); transition: clip-path .55s cubic-bezier(.22,1,.36,1); }
  .nav.folded { clip-path: inset(0 calc(100% - var(--mx) - 68px) 0 var(--mx) round 34px); transform: translateX(calc(-1 * var(--mx))) scale(.9); }
  .nav.folded .nav-pill { clip-path: inset(0 calc(50% - 28px) round 28px); }
  .np-inner { grid-template-columns: 1fr; gap: 18px; padding: 18px; }
  .np-title { font-size: 21px; }
  .np-ctrls { justify-content: center; }
  .np-body { display: block; }
  .np-body > .vol2 { margin-top: 18px; }
  .right { width: 100%; flex-wrap: nowrap; justify-content: flex-start; }
  .pill { min-width: 0; flex: 0 1 auto; }
  .pill span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .right > :not(.pill) { flex: none; }
  /* Phone: icon above the label, like Control Center tiles, so "Harmonogram" fits a third of the sheet. */
  .th-modes button { flex-direction: column; height: 60px; gap: 4px; border-radius: 18px; font-size: 12px; --mdc-icon-size: 20px; }
  .cams { grid-template-columns: 1fr 1fr; gap: 12px; }
  .cam-thumbs { margin-left: -20px; margin-right: -20px; padding-left: 20px; padding-right: 20px; scroll-padding: 0 20px; }
  .cam-thumb { width: 140px; }
  .cam { border-radius: 18px; }
  .cam-meta { font-size: 12px; padding: 20px 10px 8px; --mdc-icon-size: 14px; }
  .hours, .wx-demo { margin-left: -20px; margin-right: -20px; padding-left: 20px; padding-right: 20px; scroll-padding: 0 20px; }
  /* Tighter chips so three scenes fit a Max-size screen; the row only scrolls when they really overflow. */
  .scene-row { flex-wrap: nowrap; overflow-x: auto; gap: 8px; margin: 10px -16px 0; padding: 0 16px; scroll-padding: 0 16px;
    scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch; overscroll-behavior-x: contain; scrollbar-width: none; }
  .scene-row::-webkit-scrollbar { display: none; }
  .scene { flex: none; white-space: nowrap; scroll-snap-align: start; padding: 0 14px 0 12px; }
  .scene:last-child { scroll-snap-align: end; }
  .sheet-wrap { place-items: end center; padding: 0 8px 8px; }
  /* Bottom corners run concentric with the iPhone screen corners (~58pt) inset by the 8px gap; the top ones are tighter. */
  .sheet { border-radius: 34px 34px 50px 50px; padding: 28px 20px 22px;
    /* Stops below the status bar and Dynamic Island, like a native sheet at its full height. */
    max-height: calc(100dvh - max(env(safe-area-inset-top), 20px) - 24px); }
  .grab { display: block; }
  .sheet .hd { position: relative; justify-content: center; text-align: center; min-height: 44px; padding: 0 52px; }
  .sheet .hd > .ic { display: none; }
  .sheet .hd > div { flex: 1; }
  .sheet .hd h2 { font-size: 19px; }
  .sheet .hd > .round[data-act="close-sheet"] { position: absolute; right: 0; top: 0; }
  .sheet .hd > .round[data-act="more"] { position: absolute; left: 0; top: 0; }
  .sheet .hd .person-hero { flex-direction: column; gap: 10px; }
  .sheet.plant-sheet { padding-top: 0; }
  .plant-banner { margin: 0 -20px; border-radius: 33px 33px 0 0; }
  .wx-stats, .wx-stats.five { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .pmetrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .wx-temp { font-size: 52px; }
  .wx-art { transform: scale(.85); margin: -8px -12px; }
}
@media (prefers-reduced-motion: reduce) { .sheet, .sheet-wrap, .wx-art *, .wx-art *::before { animation: none !important; } .row .fold { transition: opacity .2s; } }

/* TV remote: a clear ring on the focused control, only while the arrows are in use. */
:host([tv]) :focus { outline: none; }
:host([tv]) .deck { min-height: calc((100vh - var(--header-height, 56px)) / var(--tv-zoom, 1)); }
/* Focus scrolls a control fully into view, clear of the floating tab bar at the bottom. */
:host([tv]) .deck :is([role=button], button, input) { scroll-margin: 24px 0 120px; }
:host([tv][tvkeys]) :is([role=button], button, input, select, a):focus { outline: 4px solid var(--lime); outline-offset: 3px; }
:host([tv][tvkeys]) .tile:focus { box-shadow: 0 0 0 4px var(--lime), 0 12px 32px rgba(0,0,0,.35); outline: none; }

/* Lite (weak wall tablets): blur, masks, transitions and looping animations off; frosted glass becomes solid colour
   close to what the glass showed over the deck. Only the camera spinner keeps turning, as loading feedback. */
:host([lite]) *, :host([lite]) *::before, :host([lite]) *::after {
  -webkit-backdrop-filter: none !important; backdrop-filter: none !important; animation: none !important; transition: none !important; }
:host([lite]) .deck::before { -webkit-mask-image: none; mask-image: none; }
:host([lite]) .nav { background: #12343F; }
:host([lite]) .nav-pill { display: none; }
:host([lite]) .view[hidden] { display: none !important; }
/* Wall tablet in landscape (wide but only ~726 px tall): a tighter header and lower tiles, so the two rows of the home
   screen sit fully above the floating tab bar instead of running under it. */
@media (orientation: landscape) and (min-width: 900px) and (max-height: 820px) {
  :host([lite]) .deck { padding-top: 22px; padding-bottom: 96px; }
  :host([lite]) .clock { font-size: 46px; }
  :host([lite]) .status { margin-top: 12px; }
  :host([lite]) .headline { font-size: 26px; }
  :host([lite]) .scenes { margin-top: 12px; }
  :host([lite]) .scene-row { margin-top: 8px; }
  :host([lite]) .gridwrap { margin-top: 16px; }
  /* 10 home tiles in two rows of five, so nothing sits under the dock */
  :host([lite]) .grid { grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 14px; }
  :host([lite]) .tile { min-height: 158px; padding: 16px; }
  :host([lite]) .nav { bottom: 16px; }
  /* A dock band under the bar: what scrolls below fades into the page colour instead of being cut by the pill. */
  :host([lite]) .deck::after { content: ""; position: fixed; left: 0; right: 0; bottom: 0; height: 104px; z-index: 2; pointer-events: none;
    background: linear-gradient(180deg, rgba(8,26,36,0) 0%, rgba(8,26,36,.88) 42%, #081A24 70%); }
}
/* Same tablet at its native density (1000 x 600 CSS px): only 600 px of height, so the header packs tighter, the scenes
   lose their label and the tiles get shorter, keeping both rows of the home screen above the dock. */
@media (orientation: landscape) and (min-width: 900px) and (max-height: 640px) {
  :host([lite]) .deck { padding-top: 14px; padding-bottom: 84px; }
  :host([lite]) .clock { font-size: 40px; }
  :host([lite]) .status { margin-top: 6px; }
  :host([lite]) .headline { font-size: 22px; line-height: 1.25; margin-top: 2px; }
  :host([lite]) .attn { margin-top: 4px; font-size: 14px; }
  :host([lite]) .scenes { margin-top: 10px; }
  :host([lite]) .scenes .label { display: none; }
  :host([lite]) .scene-row { margin-top: 0; }
  :host([lite]) .scene, :host([lite]) .act { height: 36px; }
  :host([lite]) .gridwrap { margin-top: 12px; }
  :host([lite]) .grid { gap: 12px; }
  :host([lite]) .tile { min-height: 144px; padding: 14px; }
  :host([lite]) .tile .pw { width: 40px; height: 40px; --mdc-icon-size: 22px; }
  :host([lite]) .tile .name { line-height: 1.25; }
  :host([lite]) .tile .sub { line-height: 1.3; }
  :host([lite]) .tile .foot { margin-top: 6px; }
  :host([lite]) .tile .big { font-size: 20px; }
  /* A playing media tile (one or several sources) has to stay as low as the other tiles: tighter controls. */
  :host([lite]) .tile.media-tile.multi { padding: 0; }
  :host([lite]) .mt-slide { padding: 14px 14px 18px; }
  :host([lite]) .media-tile .bar { margin-top: 8px; }
  :host([lite]) .media-tile .ctrls { margin-top: 6px; }
  :host([lite]) .media-tile .ctrls .play { width: 36px; height: 36px; }
  :host([lite]) .nav { bottom: 10px; }
  :host([lite]) .deck::after { height: 76px; }
  /* Media tab: the now-playing card was 354 px tall and hid the other players. Smaller artwork, and the controls share
     one row with the volume. */
  :host([lite]) .np { margin-top: 12px; border-radius: 24px; }
  :host([lite]) .np-inner { grid-template-columns: 240px minmax(0, 1fr); gap: 22px; padding: 18px; }
  :host([lite]) .np-art.square { max-width: 170px; }
  :host([lite]) .np-logo { width: 84px; height: 84px; border-radius: 20px; }
  :host([lite]) .np-title { font-size: 20px; margin-top: 10px; }
  :host([lite]) .np-prog { margin-top: 12px; }
  :host([lite]) .np-body { display: grid; grid-template-columns: auto minmax(0, 1fr); column-gap: 24px; align-items: center; }
  :host([lite]) .np-body > :not(.np-ctrls):not(.vol2) { grid-column: 1 / -1; }
  :host([lite]) .np-ctrls { margin-top: 12px; gap: 8px; }
  :host([lite]) .np-ctrls button { width: 44px; height: 44px; --mdc-icon-size: 26px; }
  :host([lite]) .np-ctrls .play { width: 56px; height: 56px; --mdc-icon-size: 30px; }
  :host([lite]) .np .vol2 { margin-top: 12px; max-width: none; }
  /* Without the "Wymaga uwagi" line the header has ~26 px to spare: give it back as air between the blocks. */
  :host([lite]) .view:not(:has(.attn)) .status { margin-top: 16px; }
  :host([lite]) .view:not(:has(.attn)) .scenes { margin-top: 18px; }
  :host([lite]) .view:not(:has(.attn)) .gridwrap { margin-top: 20px; }
}
:host([lite]) .nav button.sel { background: #F4F7F8; }
:host([lite]) .sheet-bg { background: rgba(4,14,20,.72); }
:host([lite]) .sheet:not(.wx) { background: #17404D; box-shadow: inset 0 1px 0 rgba(255,255,255,.18); }
/* The weather tint is translucent; without the blur the deck would show through it, so it sits on a solid base. */
:host([lite]) .sheet.wx { background: linear-gradient(180deg, rgba(255,255,255,.14), rgba(255,255,255,.02)), var(--wx-bg), #123A47; box-shadow: none; }
:host([lite]) .plant-tile.has-photo .pbody { background: rgba(8,24,32,.9); }
:host([lite]) .cam-live.full:not(:has(.cam-feed.ready))::after { animation: cam-spin .8s linear infinite !important; }
`;

class HomedeckCard extends HTMLElement {
  // Picked from the card list: an empty config means "the automatic layout from the Alvuna integration".
  static getStubConfig() { return {}; }

  // With `rooms` the card shows the config as written. Without it the layout comes from the integration
  // (alvuna/layout/subscribe: built from areas, or read from the dashboard named in its options), and every key written
  // here still overrides the matching key of that layout.
  setConfig(config) {
    this._own = config || {};
    this._layoutKey = null;
    if (Array.isArray(config?.rooms) && config.rooms.length) this._apply(config);
    else { this._config = null; if (this._hass) this._subscribeLayout(); }
  }

  _subscribeLayout() {
    if (this._layoutSub || !this._hass?.connection) return;
    this._waiting(t("common.loading_layout"));
    this._layoutSub = this._hass.connection.subscribeMessage((ev) => this._layout(ev), { type: "alvuna/layout/subscribe" })
      .catch(() => { this._layoutSub = null; this._waiting(t("common.no_integration")); });
  }

  async _layout(ev) {
    let base = ev.config;
    if (ev.source === "dashboard") {
      try {
        const cfg = await this._hass.connection.sendMessagePromise({ type: "lovelace/config", url_path: ev.dashboard });
        base = findDeckConfig(cfg);
      } catch (e) { base = null; }
      if (!base) { this._waiting(t("common.no_dashboard_card", { dashboard: ev.dashboard })); return; }
    }
    if (!base) { this._waiting(t("common.no_integration")); return; }
    const config = { ...base, ...this._own };
    const key = JSON.stringify(config);
    if (key === this._layoutKey) return;
    this._layoutKey = key;
    if (!config.rooms?.length) { this._waiting(t("common.no_rooms")); return; }
    this._apply(config);
  }

  // Before the deck is drawn (no shadow root yet), a line of plain text in the card's own light DOM.
  _waiting(text) {
    if (this.shadowRoot) return;
    this.style.cssText += ";display:block;padding:24px;font:16px/1.4 var(--primary-font-family, sans-serif);color:var(--secondary-text-color)";
    this.textContent = text;
  }

  _apply(config) {
    // Cameras may be written as plain entity ids, like every other list; the camera code reads objects.
    if (Array.isArray(config.cameras)) config = { ...config, cameras: config.cameras.map((x) => (typeof x === "string" ? { entity: x } : x)) };
    this._config = config;
    LITE = liteFor(config);
    this.toggleAttribute("lite", LITE);
    TV = tvFor(config);
    this.toggleAttribute("tv", TV);
    // Seen from the sofa the deck needs to be bigger than on a desk: `tv_zoom` (default 1.25) scales it in TV mode.
    const zoom = TV ? Number(config.tv_zoom ?? 1.25) || 1 : 1;
    this.style.zoom = zoom === 1 ? "" : String(zoom);
    this.style.setProperty("--tv-zoom", String(zoom));
    if (this.isConnected) this._tvBind(TV);
    // `?tab=heating` in the address opens that tab first (the boiler's push notifications link to it).
    const want = new URLSearchParams(location.search).get("tab");
    this._tab = this._tab || (want && TABS.some(([k]) => k === want) ? want : "home");
    this._seen = new Map();
    this._watch = null;
    // Preview only: `demo_appliances: true` shows the washer and dishwasher mid-cycle on made-up values, without
    // touching the devices, so the running layout can be checked on a phone. Remove the flag to go back to live data.
    const [washer, dishwasher] = config.demo_appliances ? config.appliances || [] : [];
    this._demo = config.demo_appliances ? {
      ...(washer && { [washer.state]: "running", [washer.program]: "Delikatne", [washer.phase]: "Płukanie", [washer.remaining]: 38,
        [washer.duration]: 95, [washer.progress]: 60, [washer.power]: 1850 }),
      ...(dishwasher && { [dishwasher.state]: "ending", [dishwasher.program]: "Mycie codzienne", [dishwasher.phase]: "Suszenie",
        [dishwasher.remaining]: 9, [dishwasher.duration]: 140, [dishwasher.progress]: 94, [dishwasher.power]: 12 }),
    } : null;
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    // A new language or number/time format redraws everything: the watched states may not have changed at all.
    const relocale = setLocale({ language: hass.locale?.language || hass.language, numberFormat: hass.locale?.number_format,
      timeFormat: hass.locale?.time_format, currency: hass.config?.currency });
    if (relocale) this._heatChartFor = null;
    if (!this._config) { if (this._own && !this._own.rooms) this._subscribeLayout(); return; }
    this._camHold(hass);
    const todo = this._todoOpen && hass.states[this._todoOpen];
    if (todo && todo !== this._todoState) { this._todoState = todo; this._loadTodo(); }
    if (!this._monthlyAt || Date.now() - this._monthlyAt > 15 * 60000) { this._monthlyAt = Date.now(); this._loadMonthly(); }
    if (this._config.waste && (!this._wasteAt || Date.now() - this._wasteAt > 30 * 60000)) { this._wasteAt = Date.now(); this._loadWaste(); }
    if (this._config.usage && (!this._usageAt || Date.now() - this._usageAt > 15 * 60000)) { this._usageAt = Date.now(); this._loadUsage(); }
    this._heatDue();
    // The map camera refreshes every few seconds while cleaning; follow it only while its sheet is open.
    const map = this._vacOpen && hass.states[this._config.vacuum?.map];
    if (map && map !== this._vacMap) { this._vacMap = map; this._schedule(); }
    if (this._changed() || relocale) this._schedule();
  }

  connectedCallback() {
    this._onScroll = this._onScroll || (() => this._scrolled());
    window.addEventListener("scroll", this._onScroll, { passive: true });
    this._onVisible = this._onVisible || (() => this._startTick());
    document.addEventListener("visibilitychange", this._onVisible);
    this._startTick();
    this._pageChrome(true);
    if (TV) this._tvBind(true);
  }

  disconnectedCallback() {
    window.removeEventListener("scroll", this._onScroll);
    document.removeEventListener("visibilitychange", this._onVisible);
    clearInterval(this._timer);
    this._timer = null;
    this._navRO?.disconnect();
    this._navRO = null;
    this._pageChrome(false);
    this._lockScroll(false);
    this._tvBind(false);
    // The layout subscription ends with the card; set hass on the next page opens it again.
    this._layoutSub?.then((unsub) => unsub?.()).catch(() => {});
    this._layoutSub = null;
  }

  // While the deck is on screen, paint HA's own page background and the browser's theme colour with the deck's
  // navy, so iPhone safe areas (status bar, home indicator) do not show white or black bands; restore on leave.
  _pageChrome(on) {
    const root = document.documentElement;
    const meta = document.querySelector('meta[name="theme-color"]');
    const vars = ["--primary-background-color", "--lovelace-background"];
    if (on) {
      if (this._saved) return;
      this._saved = { vars: vars.map((v) => root.style.getPropertyValue(v)), bg: root.style.background, meta: meta?.content };
      vars.forEach((v) => root.style.setProperty(v, "transparent"));
      root.style.background = PAGE_BG;
      if (meta) meta.content = PAGE_TOP;
      // Scrolling stays, the bars go: the page itself scrolls outside the shadow root, so it needs a document-level rule.
      this._noBars = Object.assign(document.createElement("style"), {
        textContent: "html, body { scrollbar-width: none; } html::-webkit-scrollbar, body::-webkit-scrollbar { display: none; }" });
      document.head.appendChild(this._noBars);
    } else if (this._saved) {
      vars.forEach((v, i) => (this._saved.vars[i] ? root.style.setProperty(v, this._saved.vars[i]) : root.style.removeProperty(v)));
      root.style.background = this._saved.bg;
      if (meta && this._saved.meta) meta.content = this._saved.meta;
      this._noBars?.remove();
      this._saved = null;
    }
  }

  getCardSize() { return 14; }

  // --- data -------------------------------------------------------------------------------------
  _lights(room) { return ids(room.lights); }
  _allLights() { return this._config.rooms.flatMap((r) => this._lights(r)); }
  _st(id) {
    const st = id && this._hass?.states[id];
    const fake = this._demo?.[id];
    return fake == null ? st : { ...st, entity_id: id, state: String(fake), attributes: st?.attributes || {} };
  }
  _on(id) { return this._st(id)?.state === "on"; }
  _name(x) {
    if (typeof x !== "string" && x.name) return x.name;
    const st = this._st(typeof x === "string" ? x : x.entity);
    return st?.attributes.friendly_name || (typeof x === "string" ? x : x.entity);
  }
  _watched() {
    const c = this._config;
    if (this._watch) return this._watch;
    this._watch = [
      ...this._allLights(), ...this._config.rooms.flatMap((r) => [r.temperature, r.humidity, r.power, r.energy_today, ...ids(r.covers), ...ids(r.humidifiers), ...(r.devices || []).flatMap((d) => Object.values(d))]),
      ...[].concat(c.weather || []), c.outdoor_temperature, ...this._persons().flatMap((x) => Object.values(x)), "zone.home", c.kiosk, ...(c.plants || []).flatMap((x) => Object.values(x)), ...ids(c.chips), ...ids(c.scenes), ...(c.scenes || []).flatMap((x) => [x.active, x.off, x.requires]), ...(c.launchers || []).flatMap((x) => [x.entity, x.active, x.off]),
      ...ids(c.security), ...ids(c.media), ...(c.media || []).flatMap((x) => [...ids([].concat(x.now_playing || [])), ...[].concat(x.picture || [], x.subtitle || [], x.schedule || [])]), c.energy_price, c.weather_alert, ...ids(c.waste), c.air_quality?.index, c.air_quality?.pm10, c.air_quality?.pm25, ...(c.usage || []).flatMap((u) => [u.meter, u.today, u.live, typeof u.price === "string" ? u.price : null, ...(u.info || []).map((i) => i.entity)]), ...["entity", "battery", "room", "area", "time", "suction"].map((k) => c.vacuum?.[k]),
      ...(c.appliances || []).flatMap((ap) => Object.entries(ap).filter(([k]) => !["name", "icon", "room"].includes(k)).map(([, v]) => v)), c.climate?.temperature, c.climate?.humidity, c.climate?.entity, ...ids(c.climate?.humidifiers), c.climate?.schedule, c.climate?.timer,
      ...Object.entries(c.heating || {}).filter(([k, v]) => typeof v === "string" && k !== "name").map(([, v]) => v),
      ...this._climateSensors().flatMap((x) => [x.temperature, x.humidity]), "sun.sun", ...this._batteryIds(),
    ].filter(Boolean);
    return this._watch;
  }
  // Battery sensors of the home's devices for the "Wymaga uwagi" line. Phones (mobile_app) and browser_mod's
  // browser battery are left out: people's phones are not the home's problem. `battery_ignore` drops more.
  _batteryIds() {
    if (this._battIds) return this._battIds;
    const skip = new Set(["mobile_app", "browser_mod"]), ignore = new Set(ids(this._config.battery_ignore));
    const reg = this._hass.entities || {};
    this._battIds = Object.values(this._hass.states).filter((st) => {
      const id = st.entity_id, domain = id.split(".")[0];
      return (domain === "sensor" || domain === "binary_sensor") && st.attributes.device_class === "battery"
        && !skip.has(reg[id]?.platform) && !ignore.has(id) && !reg[id]?.hidden;
    }).map((st) => st.entity_id);
    return this._battIds;
  }
  _batteryIssues() {
    const limit = this._config.battery_low ?? 10, reg = this._hass.entities || {}, devs = this._hass.devices || {};
    const byDevice = new Map();
    for (const id of this._batteryIds()) {
      const st = this._hass.states[id];
      if (!st) continue;
      const dev = reg[id]?.device_id, key = dev || id, binary = id.startsWith("binary_sensor.");
      let issue = null;
      if (st.state === "unavailable") issue = { id, icon: "mdi:battery-off-outline", value: t("home.battery_no_signal"), rank: 0 };
      else if (binary && st.state === "on") issue = { id, icon: "mdi:battery-alert-variant-outline", value: t("home.battery_low"), low: true, rank: 1 };
      else if (!binary && Number(st.state) < limit) issue = { id, icon: battIcon(st.state, false), value: `${Math.round(Number(st.state))}%`, rank: 2 + Number(st.state) };
      if (!issue) continue;
      const d = devs[dev], raw = d?.name_by_user || d?.name || (st.attributes.friendly_name || id).replace(/\s+(bateria|battery.*)$/i, "");
      let name = /\s/.test(raw) ? raw : raw.replace(/[-_]+/g, " ").replace(/^./, (ch) => ch.toUpperCase());
      // Zigbee names carry no Polish letters ("czujnik-ruchu-garaz"); a trailing room name is swapped for the HA area: "Czujnik ruchu · Garaż".
      const area = this._hass.areas?.[reg[id]?.area_id || d?.area_id]?.name;
      if (area) {
        const f = fold(name), at = f.lastIndexOf(fold(area));
        if (at > 0 && at + area.length === f.length) name = `${name.slice(0, at).replace(/[\s_-]+$/, "")} · ${area}`;
      }
      issue.name = name;
      // A device with both a % sensor and a low flag shows once, preferring the percentage.
      const prev = byDevice.get(key);
      if (!prev || (prev.low && issue.value.endsWith("%"))) byDevice.set(key, issue);
    }
    return [...byDevice.values()].sort((a, b) => a.rank - b.rank);
  }
  _changed() {
    let changed = !this._seen.size;
    for (const id of this._watched()) {
      const st = this._hass.states[id], prev = this._seen.get(id);
      if (prev === st) continue;
      this._seen.set(id, st);
      const now = visible(id, st);
      if (now === null || !prev || now !== visible(id, prev)) changed = true;
    }
    return changed;
  }

  _call(domain, service, data) { this._hass.callService(domain, service, data); }

  // Players without volume_set (the Android TV Remote of the TCL only steps, one press = 1 %) reach the target level as
  // that many volume_up/volume_down presses, capped so a stale reading can never blast the TV.
  _volSet(id, value) {
    const a = this._st(id)?.attributes || {}, f = a.supported_features || 0;
    if (f & 4 || !(f & 1024)) return this._call("media_player", "volume_set", { entity_id: id, volume_level: value / 100 });
    const n = Math.round(value - (a.volume_level ?? 0) * 100), svc = n > 0 ? "volume_up" : "volume_down";
    clearTimeout(this._volPress);
    let left = Math.min(Math.abs(n), 30);
    const press = () => { if (left-- <= 0) return; this._call("media_player", svc, { entity_id: id }); this._volPress = setTimeout(press, 150); };
    press();
  }
  // Uploaded person photos are served at 512 px; the deck shows them at 40–96 px, so ask HA for its 256 px copy.
  _pic(pic) {
    const url = pic.replace(/(\/api\/image\/serve\/[^/]+\/)512x512$/, "$1256x256");
    return this._hass.hassUrl ? this._hass.hassUrl(url) : url;
  }
  _moreInfo(entityId) {
    this.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId }, bubbles: true, composed: true }));
  }
  _navigate(path) {
    history.pushState(null, "", path);
    window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: false } }));
  }
  _anySheet() {
    return this._sheetRoom != null || this._climateOpen || this._weatherOpen || this._personOpen || this._todoOpen
      || this._plantOpen != null || this._vacOpen || this._appOpen != null || this._camOpen != null || !!this._heatOpen;
  }

  // --- TV remote (tv mode) --------------------------------------------------------------------------
  // Arrows move focus to the nearest control in that direction (inside the open sheet when there is one), OK clicks it
  // (the keydown handler in _bind), Back closes the sheet, then goes back to the home tab, then leaves the TV app.
  // The focus ring shows only while the arrows are in use; moving the Magic Remote's pointer hides it again.
  _tvBind(on) {
    if (this._tvKey) {
      window.removeEventListener("keydown", this._tvKey, true);
      window.removeEventListener("pointermove", this._tvPointer, true);
    }
    clearTimeout(this._tvIdle);
    if (!on) return;
    this._tvKey = this._tvKey || ((ev) => this._tvKeydown(ev));
    this._tvPointer = this._tvPointer || (() => { this.removeAttribute("tvkeys"); this._tvActive(); });
    window.addEventListener("keydown", this._tvKey, true);
    window.addEventListener("pointermove", this._tvPointer, { capture: true, passive: true });
    this._tvActive();
  }

  // An OLED should not hold a still dashboard for long: in the webOS app, after `tv_idle_minutes` (default 10, 0 = never)
  // without the remote, the app closes and the TV goes back to what it showed before.
  _tvActive() {
    clearTimeout(this._tvIdle);
    const min = Number(this._config?.tv_idle_minutes ?? 10);
    if (WEBOS && min > 0) this._tvIdle = setTimeout(() => window.close(), min * 60000);
  }

  _tvKeydown(ev) {
    if (!this.isConnected || !this.getClientRects().length) return;
    this._tvActive();
    const dir = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" }[ev.key];
    const back = ev.keyCode === 461 || ev.key === "GoBack" || ev.key === "BrowserBack";
    const path = deepFocusPath();
    // A Home Assistant dialog (more-info and friends) keeps its own keys; Back closes it the way HA expects, through history.
    if (path.some((n) => /DIALOG/.test(n.tagName))) {
      if (back) { ev.preventDefault(); history.back(); }
      return;
    }
    const root = this.shadowRoot, cur = root?.activeElement;
    if (!root) return;
    if (ev.key === "Enter" && cur && !this._anySheet()) this._tvOpener = tvKey(cur);
    if (back) {
      ev.preventDefault();
      if (this._anySheet()) { this._closeSheets(); this._tvRefocus(); return; }
      if (this._tab !== "home") {
        root.querySelector('.nav [data-tab="home"]')?.click();
        requestAnimationFrame(() => root.querySelector('.nav [data-tab="home"]')?.focus({ preventScroll: true }));
        return;
      }
      if (WEBOS) window.close();
      return;
    }
    if (!dir) return;
    this.setAttribute("tvkeys", "");
    // Sliders and text fields keep left and right for themselves.
    if ((dir === "left" || dir === "right") && cur?.matches?.("input:not([type=checkbox]):not([type=radio]), textarea")) return;
    ev.preventDefault();
    const sheet = !this._sheetClosing && root.querySelector(".sheet-host .sheet");
    const scope = sheet || root.querySelector(".deck");
    const all = [...scope.querySelectorAll(TV_FOCUSABLE)].filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && !el.closest("[hidden], [inert], .sheet-bg");
    });
    if (!all.length) return;
    const next = cur && scope.contains(cur) ? tvNearest(cur, all, dir) : this._tvStart(all);
    if (!next) return;
    next.focus({ preventScroll: true });
    next.scrollIntoView({ block: "nearest", inline: "nearest" });
    this._tvLast = tvKey(next);
  }

  // Where focus starts when nothing in scope has it: the control focused last (if it is still there), else the first one
  // in the open sheet or the current view.
  _tvStart(all) {
    const keep = this._tvLast && all.find((el) => tvKey(el) === this._tvLast);
    if (keep) return keep;
    return all.find((el) => el.closest(".sheet")) || all.find((el) => el.classList.contains("tile")) || all[0];
  }

  // After a sheet closes, focus goes back to the tile that opened it.
  _tvRefocus() {
    if (!TV || !this._tvOpener) return;
    const want = this._tvOpener;
    requestAnimationFrame(() => {
      const el = [...this.shadowRoot.querySelectorAll(TV_FOCUSABLE)].find((n) => tvKey(n) === want);
      if (el) { el.focus({ preventScroll: true }); this._tvLast = want; }
    });
  }

  // --- rendering --------------------------------------------------------------------------------
  _schedule() {
    if (this._raf) return;
    this._raf = requestAnimationFrame(() => {
      this._raf = 0;
      if (this._dragging) { this._pending = true; return; }
      this._render();
    });
  }

  _render() {
    if (!this._config || !this._hass) return;
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
      this.shadowRoot.innerHTML = `<style>${CSS}</style><div class="deck"></div><div class="sheet-host"></div>`;
      this._bind();
    }
    const body = this._body(this._tab);
    const deck = this.shadowRoot.querySelector(".deck");
    deck.classList.toggle("kiosk", !!this._config.kiosk && this._on(this._config.kiosk));
    morphQuiet = this._shownTab !== this._tab;
    if (LITE) {
      // Lite keeps every visited tab built and only hides the others, so switching tabs does not rebuild the view
      // (new elements, icons and their theme lookups were most of the cost of a switch on the wall tablet).
      this._patch(deck, this._top() + `<div class="views" data-keep></div>` + this._nav());
      const views = deck.querySelector(".views");
      let view = [...views.children].find((v) => v.dataset.tab === this._tab);
      if (!view) {
        view = Object.assign(document.createElement("div"), { className: "view" });
        view.dataset.tab = this._tab;
        views.appendChild(view);
      }
      this._patch(view, body);
      for (const v of views.children) if (v.hidden !== (v !== view)) v.hidden = v !== view;
      this._prebuild(views);
    } else this._patch(deck, this._top() + `<div class="view">${body}</div>` + this._nav());
    if (this._config.cameras) this._camSwap(deck);
    morphQuiet = false;
    // Lite marks the selected tab in CSS, so it never measures the bar (that forced an extra layout per render).
    if (!LITE && (this._shownTab !== this._tab || !this._pill)) this._syncNav(true);
    if (this._shownTab !== this._tab) {
      if (this._shownTab) this._enterView(deck.querySelector(".view"), this._shownTab);
      this._shownTab = this._tab;
    }
    const host = this.shadowRoot.querySelector(".sheet-host");
    const feed = this.shadowRoot.querySelector(".cam-slot ha-camera-stream");
    if (feed) feed.hass = this._hass;
    let sheet = this._sheetRoom != null ? this._sheet(this._config.rooms[this._sheetRoom])
      : this._climateOpen ? this._climateSheet() : this._weatherOpen ? this._weatherSheet()
      : this._personOpen ? this._personSheet(this._personOpen) : this._todoOpen ? this._todoSheet(this._todoOpen)
      : this._plantOpen != null ? this._plantSheet(this._config.plants[this._plantOpen])
      : this._vacOpen ? this._vacuumSheet()
      : this._appOpen != null ? this._applianceSheet(this._config.appliances[this._appOpen])
      : this._camOpen != null ? this._cameraSheet(this._camOpen)
      : this._heatOpen ? this._heatSheet(this._heatOpen) : "";
    const shown = !!host.querySelector(".sheet-wrap");
    if (sheet) {
      sheet = sheet.replace(/(<div class="sheet[ "][^>]*>)/, '$1<div class="grab" aria-hidden="true"></div>')
        .replace('<div class="sheet-wrap" data-act="close-sheet">', '$&<div class="sheet-bg" data-act="close-sheet"></div>');
      const flip = this._todoOpen && this._todoShown === this._todoOpen && host._html !== sheet ? this._flipSnapshot(host) : null;
      // Any other change of content eases the open sheet to its new height instead of letting it jump.
      const was = !flip && shown && !this._sheetClosing && !this._drag?.active && host._html !== sheet
        ? host.querySelector(".sheet")?.getBoundingClientRect().height : null;
      this._patch(host, sheet);
      if (flip) this._flipPlay(host, flip);
      if (was != null) this._resizeSheet(host, was);
      if (this._camOpen != null) { this._camSwap(host); this._camMount(host); }
      this._todoShown = this._todoOpen && this._todoItems?.id === this._todoOpen ? this._todoOpen : null;
      if (!shown || this._sheetClosing) this._animateSheet(host, true);
    } else if (shown && !this._sheetClosing) this._animateSheet(host, false);
    this._lockScroll(!!sheet || !!this._sheetClosing);
  }

  _body(tab) {
    return { home: () => this._home(), rooms: () => this._roomsTab(), media: () => this._mediaTab(), clean: () => this._cleanTab(), heating: () => this._heatingTab(), usage: () => this._usageTab(), security: () => this._securityTab() }[tab]();
  }

  // The Zużycie tab exists only with `usage:` meters, Ogrzewanie only with a `heating:` boiler.
  _tabs() { return TABS.filter(([k]) => (k !== "usage" || this._config.usage?.length) && (k !== "heating" || this._config.heating)); }

  // Lite: build the tabs not visited yet while the tablet is idle, one per idle slot, so even the first tap on a tab
  // only shows it. The hidden copy is brought up to date when the tab is shown.
  _prebuild(views) {
    if (this._prebuildId || !window.requestIdleCallback) return;
    const next = this._tabs().map(([k]) => k).find((k) => ![...views.children].some((v) => v.dataset.tab === k));
    if (!next) return;
    this._prebuildId = requestIdleCallback(() => {
      this._prebuildId = 0;
      if (!views.isConnected || [...views.children].some((v) => v.dataset.tab === next)) return;
      const view = Object.assign(document.createElement("div"), { className: "view", hidden: true });
      view.dataset.tab = next;
      views.appendChild(view);
      this._patch(view, this._body(next));
      this._prebuild(views);
    }, { timeout: 4000 });
  }

  // Starts from the height on screen, so a resize that interrupts another one carries on without a jump.
  _resizeSheet(host, was) {
    const sheet = host.querySelector(".sheet");
    if (!sheet || reducedMotion()) return;
    this._sheetResize?.cancel();
    const now = sheet.getBoundingClientRect().height;
    if (Math.abs(now - was) < 1) return;
    this._sheetResize = sheet.animate([{ height: `${was}px` }, { height: `${now}px` }], { duration: 480, easing: EASE_SPRING });
  }

  // List rows are matched by key across a re-render: kept rows glide to their new place, new rows fade in, removed rows fade out
  // where they were, and the sheet eases to its new height. Positions are taken relative to the sheet so both move together.
  _flipSnapshot(host) {
    const sheet = host.querySelector(".sheet");
    if (!sheet) return null;
    const box = sheet.getBoundingClientRect();
    const rows = new Map([...sheet.querySelectorAll("[data-flip]")].map((el) => {
      const r = el.getBoundingClientRect();
      return [el.dataset.flip, { top: r.top - box.top, left: r.left - box.left, width: r.width, ghost: el.cloneNode(true) }];
    }));
    (this._flipAnims || []).forEach((a) => a.cancel());
    return { height: box.height, rows };
  }

  _flipPlay(host, before) {
    const sheet = host.querySelector(".sheet");
    if (!sheet || reducedMotion()) return;
    const box = sheet.getBoundingClientRect(), opts = { duration: 520, easing: EASE_SPRING };
    const anims = [], seen = new Set();
    for (const el of sheet.querySelectorAll("[data-flip]")) {
      const was = before.rows.get(el.dataset.flip);
      seen.add(el.dataset.flip);
      if (!was) {
        anims.push(el.animate([{ opacity: 0, transform: "translateY(-8px) scale(.97)" }, { opacity: 1, transform: "none" }], { ...opts, duration: 420 }));
        continue;
      }
      const dy = was.top - (el.getBoundingClientRect().top - box.top);
      if (Math.abs(dy) > .5) anims.push(el.animate([{ transform: `translateY(${dy}px)` }, { transform: "none" }], opts));
    }
    for (const [k, was] of before.rows) {
      if (seen.has(k)) continue;
      const g = was.ghost;
      g.removeAttribute("data-flip");
      g.removeAttribute("data-act");
      Object.assign(g.style, { position: "absolute", top: `${was.top + sheet.scrollTop - sheet.clientTop}px`,
        left: `${was.left - sheet.clientLeft}px`, width: `${was.width}px`, margin: "0", pointerEvents: "none" });
      sheet.appendChild(g);
      const a = g.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "scale(.94)" }], { duration: 300, easing: "ease-out", fill: "forwards" });
      a.finished.then(() => g.remove(), () => g.remove());
      anims.push(a);
    }
    if (Math.abs(before.height - box.height) > 1) {
      anims.push(sheet.animate([{ height: `${before.height}px` }, { height: `${box.height}px` }], opts));
    }
    this._flipAnims = anims;
  }

  // Swipe a bottom sheet down to dismiss it: it follows the finger 1:1, and on release it either glides away at the finger's
  // speed or springs back. From the grabber or header it always drags; from the content only once that is scrolled to the top.
  _sheetDragStart(ev) {
    this._drag = null;
    if (this._sheetClosing || !matchMedia("(max-width: 760px)").matches) return;
    const path = ev.composedPath(), sheet = path.find((n) => n.classList?.contains("sheet"));
    if (!sheet || path[0]?.matches?.("input")) return;
    const t = ev.touches[0];
    this._drag = { sheet, x: t.clientX, y: t.clientY, dy: 0, active: false, samples: [[t.clientY, ev.timeStamp]],
      handle: path.some((n) => ["grab", "hd", "plant-banner"].some((c) => n.classList?.contains(c))) };
  }

  _sheetDragMove(ev) {
    const d = this._drag;
    if (!d) return false;
    const t = ev.touches[0];
    if (!d.active) {
      const dy = t.clientY - d.y, dx = t.clientX - d.x;
      if (Math.abs(dy) < 8 || Math.abs(dx) > Math.abs(dy)) return false;
      // Down drags the sheet once its content is at the top; up stretches it once there is nothing left to scroll.
      const scrollable = d.sheet.scrollHeight > d.sheet.clientHeight + 1;
      if (!d.handle && (dy > 0 ? d.sheet.scrollTop > 0 : scrollable)) { this._drag = null; return false; }
      d.active = true;
      d.y = t.clientY;
      d.h = d.sheet.offsetHeight;
      this._dragging = true;
      this._sheetAnims?.forEach((a) => a.cancel());
      this._sheetAnims = null;
    }
    ev.preventDefault();
    const off = t.clientY - d.y;
    d.samples.push([t.clientY, ev.timeStamp]);
    if (d.samples.length > 5) d.samples.shift();
    // Pulled up, the sheet grows against increasing resistance from its bottom edge, like a native iOS sheet.
    d.dy = Math.max(0, off);
    d.stretch = off < 0 ? rubberband(-off, d.h) : 0;
    d.sheet.style.transform = d.dy ? `translateY(${d.dy}px)` : "";
    d.sheet.style.maxHeight = d.stretch ? "none" : "";
    d.sheet.style.height = d.stretch ? `${d.h + d.stretch}px` : "";
    // The backdrop holds on for the first part of the pull and only then starts to clear.
    const pull = Math.min(1, Math.max(0, d.dy) / d.sheet.offsetHeight);
    d.sheet.previousElementSibling.style.opacity = String(1 - .6 * pull * pull);
    return true;
  }

  _sheetDragEnd() {
    const d = this._drag;
    this._drag = null;
    if (!d?.active) return;
    this._dragging = false;
    const a = d.samples[0], b = d.samples[d.samples.length - 1];
    const v = b[1] > a[1] ? ((b[0] - a[0]) / (b[1] - a[1])) * 1000 : 0;
    const h = d.h, bg = d.sheet.previousElementSibling;
    if (d.stretch) {
      d.sheet.style.height = d.sheet.style.maxHeight = "";
      d.sheet.animate([{ height: `${h + d.stretch}px`, maxHeight: "none" }, { height: `${h}px`, maxHeight: "none" }], { duration: 560, easing: EASE_SPRING });
      if (this._pending) { this._pending = false; this._schedule(); }
      return;
    }
    if (d.dy + (v / 1000) * .998 / (1 - .998) > h * .5 && v > -200) {
      const rest = h + 24 - d.dy, duration = Math.round(Math.min(420, Math.max(220, (rest / Math.max(v, 1)) * 1600)));
      const y1 = Math.min(1, Math.max(.1, ((v / 1000) * duration / rest) * .25));
      this._fling = { duration, easing: `cubic-bezier(.25,${y1.toFixed(2)},.4,1)` };
      this._closeSheets();
      this._fling = null;
      return;
    }
    const from = d.sheet.style.transform, fade = bg.style.opacity || "1";
    d.sheet.style.transform = bg.style.opacity = "";
    d.sheet.animate([{ transform: from }, { transform: "none" }], { duration: 520, easing: EASE_SPRING });
    bg.animate([{ opacity: fade }, { opacity: 1 }], { duration: 320, easing: "ease-out" });
    if (this._pending) { this._pending = false; this._schedule(); }
  }

  _closeSheets() {
    this._sheetRoom = this._personOpen = this._todoOpen = this._plantOpen = this._appOpen = this._camOpen = null; this._camFull = false;
    this._climateOpen = this._weatherOpen = this._vacOpen = false; this._heatOpen = null;
    this._render();
  }

  // Sheets rise from the bottom edge on a phone and grow out of the centre elsewhere, and leave the same way they came.
  // Each move starts from what is on screen, so closing a sheet mid-opening (or reopening one mid-closing) never jumps.
  _animateSheet(host, open) {
    const wrap = host.querySelector(".sheet-wrap"), sheet = wrap?.querySelector(".sheet");
    if (!sheet) return;
    if (LITE) {
      // No animation at all: open shows at once, close clears at once.
      this._sheetAnims?.forEach((a) => a.cancel());
      this._sheetAnims = null;
      this._sheetClosing = false;
      wrap.style.pointerEvents = "";
      if (open) return;
      host._html = "";
      host.replaceChildren();
      this._lockScroll(false);
      return;
    }
    const running = this._sheetAnims?.some((a) => a.playState === "running");
    const bg = wrap.querySelector(".sheet-bg");
    let live = running && [getComputedStyle(bg).opacity, getComputedStyle(sheet).transform, getComputedStyle(sheet).opacity];
    this._sheetAnims?.forEach((a) => a.cancel());
    // A swipe hands over where the finger let go and how fast it was moving.
    const flung = !open && sheet.style.transform ? this._fling : null;
    if (flung) {
      live = [bg.style.opacity || "1", sheet.style.transform, "1"];
      sheet.style.transform = bg.style.opacity = "";
    }
    const reduce = reducedMotion(), bottom = matchMedia("(max-width: 760px)").matches;
    const away = reduce ? { transform: "none", opacity: 0 }
      : bottom ? { transform: "translateY(calc(100% + 24px))", opacity: 1 } : { transform: "translateY(22px) scale(.93)", opacity: 0 };
    const rest = { transform: "none", opacity: 1 };
    const from = live ? { transform: live[1], opacity: live[2] } : open ? away : rest;
    const opts = reduce ? { duration: 200, easing: "ease-out", fill: "forwards" }
      : open ? { duration: bottom ? 560 : 520, easing: EASE_SPRING, fill: "forwards" }
      : flung ? { duration: flung.duration, easing: flung.easing, fill: "forwards" }
      : { duration: bottom ? 420 : 340, easing: "cubic-bezier(.4,0,.2,1)", fill: "forwards" };
    this._sheetClosing = !open;
    wrap.style.pointerEvents = open ? "" : "none";
    this._sheetAnims = [
      bg.animate([{ opacity: live ? live[0] : open ? 0 : 1 }, { opacity: open ? 1 : 0 }], opts),
      sheet.animate([from, open ? rest : away], opts),
    ];
    this._sheetAnims[1].finished.then(() => {
      this._sheetAnims.forEach((a) => a.cancel());
      this._sheetAnims = null;
      if (open) return;
      this._sheetClosing = false;
      host._html = "";
      host.replaceChildren();
      this._lockScroll(false);
    }, () => {});
  }

  // Like the iOS tab bar: scrolling down shrinks the bar to the current tab, scrolling up (or a tap) brings it back.
  _scrolled() {
    const y = window.scrollY, dy = y - (this._lastY ?? y);
    this._lastY = y;
    if (this._scrollLocked) return;
    // iOS rubber-band at the bottom scrolls back up by itself; that is not the user asking for the bar.
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (y >= max - 4 && y > 60) return;
    const mini = y > 60 && (dy > 4 ? true : dy < -4 ? false : !!this._navMini);
    if (mini === !!this._navMini) return;
    this._navMini = mini;
    this.shadowRoot?.querySelector(".nav")?.classList.toggle("folded", mini);
  }

  // Slides the selection pill to the selected tab, starting from wherever it is on screen if a move is still running.
  _syncNav(animate) {
    const nav = this.shadowRoot.querySelector(".nav"), sel = nav?.querySelector("button.sel"), pill = nav?.querySelector(".nav-pill");
    if (!sel || !pill) return;
    if (!this._navRO) (this._navRO = new ResizeObserver(() => this._syncNav(false))).observe(nav);
    const next = { x: sel.offsetLeft, w: sel.offsetWidth, y: sel.offsetTop, h: sel.offsetHeight };
    let prev = this._pill;
    if (prev && prev.x === next.x && prev.w === next.w && prev.y === next.y && prev.h === next.h) return;
    if (this._pillAnim?.playState === "running") {
      const m = new DOMMatrix(getComputedStyle(pill).transform);
      prev = { x: m.e, w: m.a * prev.w };
      this._pillAnim.cancel();
    }
    this._pill = next;
    pill.style.cssText = `width:${next.w}px;height:${next.h}px;top:${next.y}px;transform:translateX(${next.x}px)`;
    next.mx = Math.round(next.x + nav.clientLeft + next.w / 2 - nav.offsetHeight / 2);
    nav.style.cssText = `--mx:${next.mx}px`;
    if (!animate || !prev || reducedMotion()) return;
    this._pillAnim = pill.animate([{ transform: `translateX(${prev.x}px) scaleX(${prev.w / next.w})` }, { transform: `translateX(${next.x}px)` }],
      { duration: 520, easing: EASE_SPRING });
  }

  // The new tab's content glides in from the side of the tab it came from, section by section.
  _enterView(view, fromTab) {
    // Lite: no animation and no reads that force a layout; the scroll position comes from the scroll listener.
    if (LITE) { if ((this._lastY || 0) > 0) window.scrollTo(0, 0); return; }
    const keys = this._tabs().map(([k]) => k), dir = Math.sign(keys.indexOf(this._tab) - keys.indexOf(fromTab)) || 1;
    if (window.scrollY > 0) window.scrollTo(0, 0);
    // Sideways rows start at their first item again, like the page itself.
    view.querySelectorAll(".scene-row").forEach((row) => { row.scrollLeft = 0; });
    (this._viewAnims || []).forEach((a) => a.cancel());
    const reduce = reducedMotion();
    this._viewAnims = [...view.children].map((el, i) => el.animate(reduce
      ? [{ opacity: 0 }, { opacity: 1 }]
      : [{ opacity: 0, transform: `translate3d(${dir * 36}px, 6px, 0) scale(.985)` }, { opacity: 1, transform: "none" }],
    { duration: reduce ? 200 : 560, delay: reduce ? 0 : Math.min(i, 6) * 40, easing: EASE_SPRING, fill: "backwards" }));
  }

  // iOS keeps scrolling the page under a fixed overlay, so pin the document where it is while a sheet is open.
  // overflow: hidden alone resets the scroll position to the top, so the body is fixed at its current offset instead.
  _lockScroll(on) {
    if (on === !!this._scrollLocked) return;
    this._scrollLocked = on;
    this.shadowRoot?.[on ? "addEventListener" : "removeEventListener"]("touchmove", this._onTouchMove, { passive: false });
    const b = document.body.style;
    if (on) {
      this._lockY = window.scrollY;
      Object.assign(b, { position: "fixed", top: `-${this._lockY}px`, left: "0", right: "0", overflow: "hidden" });
    } else {
      Object.assign(b, { position: "", top: "", left: "", right: "", overflow: "" });
      window.scrollTo(0, this._lockY || 0);
    }
  }

  _patch(host, html) {
    if (host._html === html) return;
    host._html = html;
    const tpl = document.createElement("template");
    tpl.innerHTML = html;
    morph(host, tpl.content);
  }

  _top() {
    const c = this._config;
    const chips = (c.chips || []).map((ch) => {
      const id = typeof ch === "string" ? ch : ch.entity;
      const n = Number(this._st(id)?.state);
      const badge = n > 0 ? `<span class="badge">${n}</span>` : "";
      return `<button class="chip-btn" data-act="todo" data-entity="${esc(id)}" title="${esc(this._name(ch))}">
        <ha-icon icon="${esc(ch.icon || "mdi:format-list-checks")}"></ha-icon>${badge}</button>`;
    }).join("");
    const { w, cond: wCond, night: wNight } = this._wxNow();
    const out = this._st(c.outdoor_temperature);
    const temp = out && !isNaN(out.state) ? Number(out.state) : w?.attributes.temperature;
    const cond = wxWord(wCond) || "";
    const warn = this._wxAlert(), air = this._air(), smog = !warn && air?.bad;
    const weather = w || out ? `<button class="pill ${warn || smog ? "warn" : ""}" data-act="weather" ${warn ? `title="${esc(t("weather.warning", { alert: warn }))}"` : ""}>
      <ha-icon icon="${warn ? "mdi:alert" : smog ? "mdi:smog" : wIcon(wCond, wNight)}"></ha-icon><b>${temp != null ? Math.round(temp) + "°" : "–"}</b><span>${esc(smog ? t("weather.smog") : cond)}</span></button>` : "";
    const people = this._persons();
    // The first person sits on top and each next one tucks in underneath, like stacked contacts in iOS.
    const avatars = people.map((p, i) => {
      const { name, pic, home } = this._who(p);
      return `<button class="avatar" data-act="person" data-entity="${esc(p.entity)}" title="${esc(name)}"
        style="z-index:${people.length - i};${pic ? `background-image:url('${esc(this._pic(pic))}')` : ""}">
        ${pic ? "" : esc(name[0])}<i class="${home ? "home" : ""}"></i></button>`;
    }).join("");
    return `<div class="top">
      <div><div class="date" data-date>${this._dateText()}</div>
        <div class="clockrow"><div class="clock" data-clock>${this._clockText()}</div>${chips}</div></div>
      <div class="right">${weather}<div class="avatars">${avatars}</div>
        ${this._kioskButton()}</div>
    </div>`;
  }

  _kioskButton() {
    const id = this._config.kiosk;
    if (!id) return `<button class="round" data-act="settings" title="${t("common.settings")}"><ha-icon icon="mdi:cog-outline"></ha-icon></button>`;
    const on = this._on(id);
    return `<button class="round kiosk ${on ? "" : "off"}" data-act="kiosk" data-entity="${esc(id)}" title="${on ? t("home.kiosk_exit") : t("home.kiosk")}"
      aria-pressed="${on}"><ha-icon icon="${on ? "mdi:fullscreen-exit" : "mdi:fullscreen"}"></ha-icon></button>`;
  }

  _home() {
    const c = this._config;
    const lights = this._allLights();
    const on = lights.filter((id) => this._on(id)).length;
    const headline = on ? t("home.lights_on", { n: on }) : t("home.all_off");
    // `requires: switch.x` on a scene: the button shows only while that device is reachable (the gate's Wemos can be
    // offline for weeks; a button that silently does nothing is worse than no button).
    const usable = (s) => !s.requires || !["unavailable", "unknown", undefined].includes(this._st(s.requires)?.state);
    const scenes = (c.scenes || []).filter(usable).map((s) => {
      const on = this._sceneOn(s);
      return `<button class="scene ${on ? "on" : ""}" data-act="scene" data-entity="${esc(s.entity || s)}" ${on && s.off ? `data-off="${esc(s.off)}"` : ""}>
      <ha-icon icon="${esc(s.icon || "mdi:creation-outline")}"></ha-icon>${esc(this._name(s))}${on?.left ? `<span class="left">${on.left} min</span>` : ""}</button>`;
    }).join("");
    // `home_end: [Garaż, security]`: rooms (by name) and built-in tiles (security, climate, media, cameras) that go
    // after everything else, in that order.
    const end = [].concat(c.home_end || []);
    // A room with `home: active` (the garage) is on the home grid only while one of its lights is on; it stays in Pokoje.
    const shown = (r) => r.home !== "active" || this._lights(r).some((id) => this._on(id));
    const parts = [...c.rooms.map((r, i) => [r.name, () => (shown(r) ? this._roomTile(r, i) : "")]), ["security", () => this._securityTile()],
      ["climate", () => this._climateTile()], ["media", () => this._mediaTile()], ["cameras", () => this._camerasTile()],
      ...(c.launchers || []).map((l) => [l.name, () => this._launcherTile(l)]),
      ["", () => this._cleaningTiles(true)], ["", () => (c.plants || []).map((pl, i) => this._plantTile(pl, i)).join("")]];
    const rank = (k) => (end.includes(k) ? end.indexOf(k) + 1 : 0);
    const tiles = parts.map((p, i) => [p, i]).sort((a, b) => rank(a[0][0]) - rank(b[0][0]) || a[1] - b[1]).map(([p]) => p[1]()).join("");
    return `<div class="status">
        <div><div class="label">${t("home.status")}</div><div class="headline">${headline}</div>${this._attention()}${this._heatLine()}${this._alertLine()}${this._waste()}${this._airLine()}</div>
        <div class="actions">
          <button class="act" data-act="all-on"><ha-icon icon="mdi:lightbulb-outline"></ha-icon>${t("home.all_on_btn")}</button>
          <button class="act light" data-act="all-off"><ha-icon icon="mdi:power"></ha-icon>${t("home.all_off_btn")}</button>
        </div></div>
      ${scenes ? `<div class="scenes"><div class="label">${t("scenes.title")}<i>${(c.scenes || []).filter(usable).length}</i></div><div class="scene-row">${scenes}</div></div>` : ""}
      <div class="gridwrap"><div class="grid">${tiles}</div></div>`;
  }

  // `launchers: [{ entity: script.x, off: script.y, active: media_player.z, name, sub, logo }]`: one grid cell with a big
  // logo that starts something with a tap (Republika on the kitchen Nest Hub) and stops it with the next tap while
  // `active` is playing. Same toggle as a scene button, big enough to hit from across the room.
  _launcherTile(l) {
    const on = this._sceneOn(l);
    return `<div class="tile launch ${on ? "playing" : ""}" role="button" tabindex="0" data-act="scene" data-entity="${esc(l.entity)}"
        ${on && l.off ? `data-off="${esc(l.off)}"` : ""}>
      <div class="logo" style="background-image:url('${esc(l.logo)}')"></div>
      <div class="name">${esc(l.name)}</div>
      <div class="sub">${on ? `<i class="dot"></i>${t("media.playing_now")}` : esc(l.sub || "")}</div></div>`;
  }

  _attention() {
    const issues = this._batteryIssues();
    if (!issues.length) return "";
    return `<div class="attn"><ha-icon icon="mdi:battery-alert-variant-outline"></ha-icon><span>${t("home.attention")}</span>${issues.map((x) =>
      `<button class="attn-item" data-act="more" data-entity="${esc(x.id)}">${esc(x.name)}<b>${esc(x.value)}</b></button>`).join("")}</div>`;
  }

  // `waste: [calendar.papier, ...]`: under the headline, "Jutro wywóz: Papier · Szkło" the day before a pickup and
  // "Dziś wywóz" until noon on the day, from each calendar's next event (all-day events).
  _waste() {
    const now = new Date(), day = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const today = day(now), tomorrow = day(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
    const due = (when) => ids(this._config.waste).map((id) => this._st(id)).filter((st) => st && String(st.attributes.start_time || "").startsWith(when))
      .map((st) => st.attributes.message || st.attributes.friendly_name);
    const [label, list] = now.getHours() < 12 && due(today).length ? [t("waste.today"), due(today)] : [t("waste.tomorrow"), due(tomorrow)];
    if (!list.length) return "";
    return `<div class="attn waste"><ha-icon icon="mdi:trash-can-outline"></ha-icon><span>${label}</span>${list.map((n) =>
      `<span class="attn-item"><b>${esc(n)}</b></span>`).join("")}</div>`;
  }

  // `weather_alert`: an IMGW-PIB warning gets its own line under the headline, not only the icon on the weather pill.
  _alertLine() {
    const warn = this._wxAlert();
    return warn ? `<div class="attn alert"><ha-icon icon="mdi:alert"></ha-icon><span>${t("weather.imgw_line")}</span><span class="attn-item"><b>${esc(warn)}</b></span></div>` : "";
  }

  // Under the headline only when the air is bad: nobody should air the rooms then.
  _airLine() {
    const air = this._air();
    if (!air?.bad) return "";
    return `<div class="attn smog"><ha-icon icon="mdi:smog"></ha-icon><span>${esc(t("weather.air_line", { label: air.label }))}${air.pm10 != null ? ` (PM10 ${air.pm10} µg/m³)` : ""}</span>
      <span class="attn-item"><b>${t("weather.no_airing")}</b></span></div>`;
  }

  _roomTile(r, i) {
    const lights = this._lights(r);
    const on = lights.filter((id) => this._on(id)).length;
    const temp = this._st(r.temperature), h = this._st(r.humidity)?.state;
    const sub = !lights.length ? (h != null && h !== "" && !isNaN(h) ? t("rooms.humidity", { v: Math.round(h) }) : r.humidity ? t("rooms.humidity_none") : t("rooms.no_lights"))
      : on === 0 ? t("rooms.all_off") : on === lights.length ? (on > 1 ? t("rooms.all_on") : t("common.on_n")) : t("rooms.some_on", { n: on, total: lights.length });
    return `<div class="tile ${on ? "on" : ""}" role="button" tabindex="0" data-act="room" data-room="${i}">
      <div class="head"><div class="ic"><ha-icon icon="${esc(r.icon || "mdi:home-outline")}"></ha-icon></div>
        ${lights.length ? `<button class="pw" data-act="room-power" data-room="${i}" aria-label="${t("rooms.power", { name: esc(r.name) })}"><ha-icon icon="mdi:power"></ha-icon></button>` : ""}</div>
      <div class="name">${esc(r.name)}</div><div class="sub">${sub}</div>
      <div class="foot"><div class="dots">${lights.map((id) => `<i class="${this._on(id) ? "on" : ""}"></i>`).join("")}</div>
        ${temp && !isNaN(temp.state) ? `<div class="temp">${num(temp.state)}°</div>` : (r.devices || []).slice(0, 1).map((d) => this._deviceChip(d)).join("")}</div></div>`;
  }

  _deviceChip(d) {
    const bat = this._st(d.battery)?.state;
    const hasBat = bat != null && !isNaN(bat);
    return `<div class="devchip"><i class="${this._on(d.active) ? "on" : ""}"></i><ha-icon icon="${esc(d.icon || "mdi:laptop")}"></ha-icon>${hasBat ? `${Math.round(bat)}%` : ""}</div>`;
  }

  _deviceRow(d) {
    const active = this._on(d.active);
    const bat = this._st(d.battery)?.state, detail = this._st(d.detail)?.state;
    const hasBat = bat != null && !isNaN(bat), charging = isCharging(this._st(d.battery_state)?.state);
    const sub = [active ? t("devices.active") : this._st(d.active)?.state === "unavailable" ? t("common.unavailable_m") : t("devices.asleep"),
      active && detail && !["unknown", "unavailable"].includes(detail) ? detail : "", charging ? t("devices.charging") : ""].filter(Boolean).join(" · ");
    return `<div class="row" role="button" tabindex="0" data-act="more" data-entity="${esc(d.active || d.battery)}">
      <div class="ic ${active ? "lime" : ""}"><ha-icon icon="${esc(d.icon || "mdi:laptop")}"></ha-icon></div>
      <div><div class="t">${esc(d.name || this._name(d.active || d.battery))}</div><div class="s">${esc(sub)}</div></div>
      <div class="row-end">${active && d.sleep ? `<button class="mini" data-act="run" data-entity="${esc(d.sleep)}" aria-label="${t("devices.sleep_label", { name: esc(d.name || "") })}">
        <ha-icon icon="mdi:power-sleep"></ha-icon>${t("devices.sleep")}</button>` : ""}
        ${hasBat ? `<div class="batt"><ha-icon icon="${battIcon(bat, charging)}"></ha-icon>${Math.round(bat)}%</div>` : ""}</div></div>`;
  }

  _securityItems() {
    return (this._config.security || []).map((x) => {
      const id = typeof x === "string" ? x : x.entity;
      const st = this._st(id);
      const dc = st?.attributes.device_class;
      return { id, name: this._name(x), st, dc, alert: st?.state === "on", off: !st || st.state === "unavailable" };
    });
  }

  _securityTile() {
    const items = this._securityItems();
    if (!items.length) return "";
    const alerts = items.filter((x) => x.alert);
    // `security_tile: alert`: the home grid shows the tile only while something is open or wet; the tab stays.
    if (this._config.security_tile === "alert" && !alerts.length) return "";
    const offline = items.filter((x) => x.off);
    // Open sensors are a list, set at the size of a tile name; the big type is only for the short one-line states.
    const shown = alerts.slice(0, 3), more = alerts.length - shown.length;
    const body = alerts.length ? `<div class="alerts">${shown.map((a) => `<div><b>${esc(a.name)}</b> ${table("security.alert")[a.dc] || t("security.attention")}</div>`).join("")}${more ? `<div>${t("security.more", { n: more })}</div>` : ""}</div>`
      : `<div class="big">${offline.length ? t("security.offline", { n: offline.length }) : t("security.safe")}</div>`;
    return `<div class="tile ${alerts.length ? "alert" : ""}" role="button" tabindex="0" data-act="tab" data-tab="security">
      <div class="head" style="justify-content:flex-start;gap:10px;align-items:center">
        <div class="ic"><ha-icon icon="${alerts.length ? "mdi:shield-alert-outline" : "mdi:shield-check-outline"}"></ha-icon></div><div class="kicker">${t("tabs.security")}</div></div>
      ${body}
      <div class="sub" style="margin-top:6px">${t("security.monitored", { n: items.length })}</div></div>`;
  }

  _climateTile() {
    const cl = this._config.climate;
    if (!cl) return "";
    const temp = this._st(cl.temperature), h = this._st(cl.humidity), out = this._st(this._config.outdoor_temperature);
    const th = this._thermo();
    const parts = th ? [th.status, th.note] : [cl.name, h && !isNaN(h.state) ? t("climate.humidity_short", { v: Math.round(h.state) }) : "", out && !isNaN(out.state) ? t("climate.outside", { t: num(out.state) }) : ""];
    return `<div class="tile" role="button" tabindex="0" data-act="climate">
      <div class="head" style="justify-content:flex-start;gap:10px;align-items:center">
        <div class="ic ${th?.heating ? "heat" : "lime"}"><ha-icon icon="${th?.heating ? "mdi:fire" : "mdi:thermometer"}"></ha-icon></div><div class="kicker">${t("climate.title")}</div></div>
      <div class="big" style="font-size:30px">${temp && !isNaN(temp.state) ? num(temp.state) + "°" : "–"}</div>
      <div class="sub" style="margin-top:6px">${esc(parts.filter(Boolean).join(" · "))}</div>${this._humidifierLine()}</div>`;
  }

  // `climate.humidifiers`: portable (de)humidifiers that move between rooms, so they live with the climate, not a room.
  // On the tile: one short line per device that is plugged in (an unplugged one is left out).
  _humidifierLine() {
    return ids(this._config.climate?.humidifiers).map((id) => {
      const st = this._st(id), a = st?.attributes || {};
      if (!st || st.state === "unavailable") return "";
      const name = this._name((this._config.climate.humidifiers || []).find((x) => (typeof x === "string" ? x : x.entity) === id) || id);
      // One line on the narrow tile: "Osuszacz 44 → 35%" (now → target).
      const now = a.current_humidity != null ? Math.round(a.current_humidity) : null;
      const txt = st.state !== "on" ? t("climate.humidifier_off", { name })
        : `${name} ${now != null && a.humidity != null ? `${now} → ${a.humidity}%` : now != null ? `${now}%` : a.humidity != null ? `→ ${a.humidity}%` : ""}`;
      return `<div class="sub" style="margin-top:2px;display:flex;align-items:center;gap:4px">
        <ha-icon icon="mdi:air-humidifier" style="--mdc-icon-size:14px;flex:none;${st.state === "on" ? "color:var(--lime)" : ""}"></ha-icon>
        <span style="min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(txt.trim())}</span></div>`;
    }).join("");
  }

  // The heating thermostat (`climate.entity`), with its schedule, its one-hour boost timer and the scripts that start the
  // boost (`boost`) or go back to the schedule (`resume`). A target picked with +/- shows at once and is sent shortly after.
  _thermo() {
    const cl = this._config.climate || {}, st = this._st(cl.entity);
    if (!st || st.state === "unavailable") return null;
    const a = st.attributes, p = this._tempPending;
    if (p && (Number(a.temperature) === p.value || Date.now() - p.at > 8000)) this._tempPending = null;
    const target = this._tempPending ? this._tempPending.value : Number(a.temperature);
    const on = st.state !== "off", heating = on && a.hvac_action === "heating";
    const timer = this._st(cl.timer), boost = timer?.state === "active";
    const left = boost && timer.attributes.finishes_at ? Math.max(1, Math.round((new Date(timer.attributes.finishes_at) - Date.now()) / 60000)) : null;
    const sched = Number(this._st(cl.schedule)?.attributes.temperature);
    const onSchedule = on && !boost && !isNaN(sched) && Math.abs(target - sched) < .05;
    const status = !on ? t("climate.heating_off") : `${t(heating ? "climate.heating_word" : "climate.holding_word")} ${num(target)}°`;
    const note = boost ? `${t("climate.boost_note")}${left ? t("climate.boost_left", { n: left }) : ""}` : on && !onSchedule && !isNaN(sched) ? t("climate.manual", { t: num(sched) }) : "";
    return { id: cl.entity, cl, a, on, heating, target, boost, sched, onSchedule, status, note };
  }

  _thermoPanel() {
    const th = this._thermo();
    if (!th) return "";
    const { cl, a } = th, min = Number(a.min_temp ?? 7), max = Number(a.max_temp ?? 30), cur = Number(a.current_temperature);
    return `<div class="thermo">
      <div class="th-status ${th.heating ? "heat" : ""}"><ha-icon icon="${th.heating ? "mdi:fire" : th.on ? "mdi:thermostat" : "mdi:power"}"></ha-icon>${esc(th.status)}</div>
      <div class="th-row">
        <button class="th-btn" data-act="temp" data-step="-0.5" aria-label="${t("climate.cooler")}" ${!th.on || th.target <= min ? "disabled" : ""}><ha-icon icon="mdi:minus"></ha-icon></button>
        <div class="th-val"><b>${num(th.target)}°</b><span>${isNaN(cur) ? "&nbsp;" : t("common.now_value", { v: `${num(cur)}°` })}</span>
          <span class="th-note">${th.note ? esc(th.note) : "&nbsp;"}</span></div>
        <button class="th-btn" data-act="temp" data-step="0.5" aria-label="${t("climate.warmer")}" ${!th.on || th.target >= max ? "disabled" : ""}><ha-icon icon="mdi:plus"></ha-icon></button></div>
      <div class="th-modes">
        ${cl.resume ? `<button class="${th.onSchedule ? "on" : ""}" data-act="thermo-run" data-entity="${esc(cl.resume)}"><ha-icon icon="mdi:calendar-clock"></ha-icon>${t("climate.schedule")}</button>` : ""}
        ${cl.boost ? `<button class="${th.boost ? "on" : ""}" data-act="thermo-run" data-entity="${esc(cl.boost)}"><ha-icon icon="mdi:fire"></ha-icon>${t("climate.boost")}</button>` : ""}
        <button class="${th.on ? "" : "on"}" data-act="thermo-power" data-on="${th.on ? 1 : 0}"><ha-icon icon="mdi:power"></ha-icon>${th.on ? t("common.turn_off") : t("common.off_n")}</button></div></div>`;
  }

  _climateSensors() {
    const c = this._config, cl = c.climate || {};
    if (cl.sensors) return cl.sensors;
    const list = c.rooms.filter((r) => r.temperature || r.humidity)
      .map((r) => ({ name: r.name, icon: r.icon, temperature: r.temperature, humidity: r.humidity }));
    if (c.outdoor_temperature) list.push({ name: t("climate.outdoor"), icon: "mdi:tree-outline", temperature: c.outdoor_temperature, humidity: cl.outdoor_humidity, outdoor: true });
    return list;
  }

  _climateSheet() {
    const val = (id) => {
      const st = this._st(id);
      return st && st.state !== "" && !isNaN(st.state) ? Number(st.state) : null;
    };
    const items = this._climateSensors().map((x) => ({ ...x, t: val(x.temperature), h: val(x.humidity) }));
    const indoor = items.filter((x) => !x.outdoor && x.t != null);
    const avg = indoor.length ? indoor.reduce((a, x) => a + x.t, 0) / indoor.length : null;
    const cards = items.map((x) => {
      const note = x.h == null || x.outdoor ? "" : x.h >= 65 ? `<span class="warn">${t("climate.humid")}</span>` : x.h < 35 ? `<span class="warn">${t("climate.dry")}</span>` : "";
      return `<div class="sensor" role="button" tabindex="0" data-act="more" data-entity="${esc(x.temperature || x.humidity)}">
        <div class="sn"><ha-icon icon="${esc(x.icon || "mdi:thermometer")}"></ha-icon>${esc(x.name)}</div>
        <div class="sv">${x.t != null ? num(x.t) + "°" : "–"}</div>
        <div class="sh"><ha-icon icon="mdi:water-percent"></ha-icon>${x.h != null ? Math.round(x.h) + "%" : "–"}${note}</div></div>`;
    }).join("");
    return `<div class="sheet-wrap" data-act="close-sheet"><div class="sheet" role="dialog" aria-label="${t("climate.title")}">
      <div class="hd"><span class="ic lime"><ha-icon icon="mdi:thermometer"></ha-icon></span>
        <div style="flex:1"><h2>${t("climate.title")}</h2><div class="s" style="color:var(--muted);font-size:13px">${avg != null ? t("climate.average", { t: num(avg) }) : ""}</div></div>
        <button class="round" data-act="close-sheet" aria-label="${t("common.close")}"><ha-icon icon="mdi:close"></ha-icon></button></div>
      ${this._thermoPanel()}${(this._config.climate?.humidifiers || []).length
        ? `<div class="rows" style="margin-bottom:12px">${this._config.climate.humidifiers.map((x) => this._humidifierRow(x)).join("")}</div>` : ""}
      <div class="sensors">${cards}</div></div></div>`;
  }

  // `weather` may list fallbacks: the first entity with a known condition wins (IMGW reports "unknown" for up to an
  // hour after an HA restart, until its next hourly observation).
  _weatherId() {
    const list = [].concat(this._config.weather || []);
    return list.find((id) => this._st(id) && !["unavailable", "unknown"].includes(this._st(id).state)) || list.find((id) => this._st(id));
  }

  _night() { return this._st("sun.sun")?.state === "below_horizon"; }

  // Current condition, or the one picked in the `demo_weather` preview row.
  _wxNow() {
    const w = this._st(this._weatherId());
    const [cond, night] = (this._config.demo_weather && WX_DEMO[this._wxDemo]) || [w?.state, this._night()];
    return { w, cond, night };
  }

  // `air_quality: { index, pm10, pm25 }`: GIOŚ sensors of the nearest station.
  _air() {
    const c = this._config.air_quality, st = c && this._st(c.index);
    if (!st || !table("weather.air")[st.state]) return null;
    const pm = (id) => { const v = this._st(id)?.state; return v != null && !isNaN(v) ? Math.round(Number(v)) : null; };
    return { level: st.state, label: table("weather.air")[st.state], bad: AIR_BAD.includes(st.state), pm10: pm(c.pm10), pm25: pm(c.pm25) };
  }

  _wxAlert() {
    const st = this._st(this._config.weather_alert)?.state;
    return st && !["no_alert", "unknown", "unavailable"].includes(st) ? table("weather.imgw")[st] || st : "";
  }

  _foldTwiceDaily(parts) {
    const days = new Map();
    for (const p of parts) {
      const key = new Date(p.datetime).toDateString();
      const d = days.get(key) || { datetime: p.datetime, temperature: -Infinity, templow: Infinity, precipitation: 0 };
      const hi = p.temperature, low = p.templow ?? p.temperature;
      d.temperature = Math.max(d.temperature, hi);
      d.templow = Math.min(d.templow, low);
      d.precipitation += p.precipitation || 0;
      d.precipitation_probability = Math.max(d.precipitation_probability || 0, p.precipitation_probability || 0);
      if (!d.condition || p.is_daytime) d.condition = p.condition;
      days.set(key, d);
    }
    return [...days.values()];
  }

  async _loadForecast() {
    const id = this._weatherId();
    if (!id || (this._forecast && Date.now() - this._forecast.at < 15 * 60000)) return;
    const get = async (type) => {
      try {
        const res = await this._hass.callWS({ type: "call_service", domain: "weather", service: "get_forecasts",
          service_data: { type }, target: { entity_id: id }, return_response: true });
        return res?.response?.[id]?.forecast || [];
      } catch (e) {
        return [];
      }
    };
    const [hourly, daily] = await Promise.all([get("hourly"), get("daily")]);
    // Some providers (IMGW) offer only day/night halves; fold them into one entry per calendar day.
    this._forecast = { hourly, daily: daily.length ? daily : this._foldTwiceDaily(await get("twice_daily")), at: Date.now() };
    if (this._weatherOpen) this._render();
  }

  _wxArt(cond, night) {
    const fall = (cls, n) => `<div class="${cls}">${Array.from({ length: n }, (_, i) => `<i style="--i:${i}"></i>`).join("")}</div>`;
    const sky = night ? `<div class="moon"></div>` : `<div class="sun"></div>`;
    const stars = `<div class="stars">${[[12, 18], [118, 10], [104, 44], [20, 70], [136, 66]].map(([x, y], i) =>
      `<i style="--x:${x}px;--y:${y}px;--i:${i}"></i>`).join("")}</div>`;
    const parts = {
      sunny: sky, "clear-night": stars + `<div class="moon"></div>`,
      partlycloudy: (night ? stars : "") + sky + `<div class="cloud"></div>`,
      cloudy: `<div class="cloud back"></div><div class="cloud"></div>`,
      fog: `<div class="cloud back"></div><div class="cloud"></div>` + fall("fog", 3),
      windy: `<div class="cloud"></div>` + fall("fog wind", 3), "windy-variant": `<div class="cloud"></div>` + fall("fog wind", 3),
      rainy: `<div class="cloud back dark"></div><div class="cloud dark"></div>` + fall("rain", 6),
      pouring: `<div class="cloud back dark"></div><div class="cloud dark"></div>` + fall("rain", 7) + fall("rain", 6).replace('class="rain"', 'class="rain" style="left:60px;top:80px"'),
      snowy: `<div class="cloud back"></div><div class="cloud"></div>` + fall("snow", 6),
      "snowy-rainy": `<div class="cloud dark"></div>` + fall("rain", 4) + fall("snow", 4).replace('class="snow"', 'class="snow" style="left:60px"'),
      hail: `<div class="cloud dark"></div>` + fall("snow", 6),
      lightning: `<div class="cloud back dark"></div><div class="cloud dark"></div><div class="bolt"></div>`,
      "lightning-rainy": `<div class="cloud back dark"></div><div class="cloud dark"></div>` + fall("rain", 6) + `<div class="bolt"></div>`,
    };
    return `<div class="wx-art" aria-hidden="true">${parts[cond] || `<div class="cloud"></div>`}</div>`;
  }

  _weatherSheet() {
    const c = this._config, { w, cond, night } = this._wxNow(), a = w?.attributes || {}, air = this._air();
    const out = this._st(c.outdoor_temperature);
    const temp = out && !isNaN(out.state) ? Number(out.state) : a.temperature;
    const f = this._forecast;
    const today = f?.daily?.[0];
    const bg = ["rainy", "pouring", "hail"].includes(cond) ? WX_BG.rain : ["snowy", "snowy-rainy"].includes(cond) ? WX_BG.snow
      : String(cond).startsWith("lightning") ? WX_BG.storm : night ? WX_BG.night : ["cloudy", "fog", "windy", "windy-variant"].includes(cond) ? WX_BG.cloud : WX_BG.day;
    const stat = (icon, label, value) => `<div class="wx-stat"><span>${label}</span><b><ha-icon icon="${icon}"></ha-icon>${value}</b></div>`;
    const wind = a.wind_speed != null ? `${Math.round(a.wind_speed)} ${esc(a.wind_speed_unit || "km/h")}` : "–";
    const windDir = a.wind_bearing != null ? " · " + table("weather.wind")[Math.round(a.wind_bearing / 45) % 8] : "";
    const stats = stat("mdi:water-percent", t("common.humidity"), a.humidity != null ? `${Math.round(a.humidity)}%` : "–")
      + stat("mdi:weather-windy", t("weather.wind_label") + windDir, wind)
      + stat("mdi:gauge", t("weather.pressure"), a.pressure != null ? `${Math.round(a.pressure)} hPa` : "–")
      + stat("mdi:cloud-outline", t("weather.clouds"), a.cloud_coverage != null ? `${Math.round(a.cloud_coverage)}%` : "–")
      + (air ? stat(air.bad ? "mdi:smog" : "mdi:leaf", t("weather.air_label") + (air.pm10 != null ? ` · PM10 ${air.pm10}` : ""), esc(air.label[0].toUpperCase() + air.label.slice(1))) : "");
    const hours = (f?.hourly || []).slice(0, 12).map((h, i) => {
      const d = new Date(h.datetime);
      const hNight = d.getHours() < 7 || d.getHours() >= 17;
      return `<div class="hr"><span>${i ? String(d.getHours()).padStart(2, "0") : t("common.now")}</span><ha-icon icon="${wIcon(h.condition, hNight)}"></ha-icon>
        <b>${Math.round(h.temperature)}°</b>${h.precipitation_probability ? `<i>${Math.round(h.precipitation_probability)}%</i>` : ""}</div>`;
    }).join("");
    const days = (f?.daily || []).slice(0, 7);
    const lo = Math.min(...days.map((d) => d.templow ?? d.temperature)), hi = Math.max(...days.map((d) => d.temperature));
    const span = hi - lo || 1;
    const dayRows = days.map((d, i) => {
      const low = d.templow ?? d.temperature;
      const name = i === 0 ? t("common.today") : date(d.datetime, { weekday: "short" }).replace(".", "");
      const rain = d.precipitation_probability ? `${Math.round(d.precipitation_probability)}%` : d.precipitation ? `${num(d.precipitation)} mm` : "";
      return `<div class="day"><span>${esc(name)}</span><ha-icon icon="${wIcon(d.condition)}"></ha-icon><span class="p">${rain}</span>
        <span class="lo">${Math.round(low)}°</span><div class="range"><i style="left:${((low - lo) / span) * 100}%;width:${Math.max(((d.temperature - low) / span) * 100, 4)}%"></i></div>
        <span class="hi">${Math.round(d.temperature)}°</span></div>`;
    }).join("");
    const loading = `<div class="empty">${f ? t("weather.no_forecast") : t("weather.loading")}</div>`;
    return `<div class="sheet-wrap" data-act="close-sheet"><div class="sheet wx" role="dialog" aria-label="${t("weather.title")}" style="--wx-bg:${bg}">
      <div class="hd"><h2 style="flex:1">${esc(c.weather_name || t("weather.title"))}</h2>
        <button class="round" data-act="close-sheet" aria-label="${t("common.close")}"><ha-icon icon="mdi:close"></ha-icon></button></div>
      ${c.demo_weather ? `<div class="wx-demo">${WX_DEMO.map(([k, n], i) => `<button class="${this._wxDemo === i ? "on" : ""}" data-act="wx-demo" data-i="${i}">
        <ha-icon icon="${wIcon(k, n)}"></ha-icon>${esc(wxWord(k))}${n && k !== "clear-night" ? ` (${t("weather.night")})` : ""}</button>`).join("")}</div>` : ""}
      <div class="wx-hero">${this._wxArt(cond, night)}
        <div><div class="wx-temp">${temp != null ? Math.round(temp) + "°" : "–"}</div>
          <div class="wx-cond">${esc(wxWord(cond) ?? cond)}</div>
          ${today ? `<div class="s" style="color:var(--muted);font-size:14px;margin-top:2px">${t("weather.high_low", { hi: Math.round(today.temperature), lo: Math.round(today.templow ?? today.temperature) })}</div>` : ""}</div></div>
      ${this._wxAlert() ? `<div class="pproblems"><div class="pproblem"><div class="ic" style="background:#FF9F0A"><ha-icon icon="mdi:alert"></ha-icon></div>
        <div><div class="t">${esc(t("weather.warning", { alert: this._wxAlert() }))}</div><div class="s">${t("weather.imgw_source")}</div></div></div></div>` : ""}
      <div class="wx-stats ${air ? "five" : ""}">${stats}</div>
      <div class="label">${t("weather.hours")}</div><div class="hours">${hours || loading}</div>
      <div class="label">${t("weather.days")}</div><div class="days">${dayRows || loading}</div></div></div>`;
  }

  // A scene can name what shows it is running (`active`: a timer, switch or script). While it runs the button lights up,
  // a timer adds its minutes left, and a tap runs `off` (when given) instead of starting it again.
  _sceneOn(s) {
    const st = typeof s === "object" && this._st(s.active);
    if (!st || !["on", "active", "playing", "heat", "open"].includes(st.state)) return null;
    const end = st.attributes.finishes_at;
    return { left: end ? Math.max(1, Math.round((new Date(end) - Date.now()) / 60000)) : null };
  }

  _persons() { return (this._config.persons || []).map((x) => (typeof x === "string" ? { entity: x } : x)); }

  // A person entry may point at a bare phone tracker; `name` and `picture` then stand in for what a person entity carries.
  _who(p) {
    const st = this._st(p.entity), a = st?.attributes || {};
    return { st, a, name: p.name || a.friendly_name || p.entity, pic: p.picture || a.entity_picture, home: st?.state === "home" };
  }

  _personSheet(id) {
    const p = this._persons().find((x) => x.entity === id) || { entity: id };
    const { st, a, name, pic, home } = this._who(p);
    const val = (key) => { const v = this._st(p[key])?.state; return v && !["unknown", "unavailable", "--", ""].includes(v) ? v : null; };
    const zone = home ? t("persons.home") : st?.state === "not_home" ? t("persons.away") : this._st(`zone.${st?.state}`)?.attributes.friendly_name || st?.state || t("persons.unknown");
    const homeZone = this._st("zone.home")?.attributes;
    let dist = "";
    if (!home && a.latitude != null && homeZone?.latitude != null) {
      const km = distanceKm(a, homeZone);
      dist = ` · ${km < 1 ? t("persons.dist_m", { d: Math.round(km * 1000) }) : t("persons.dist_km", { d: num(km) })}`;
    }
    const stat = (icon, label, value) => `<div class="wx-stat"><span>${label}</span><b><ha-icon icon="${icon}"></ha-icon>${esc(value)}</b></div>`;
    const stats = [];
    const battery = val("battery") ?? a.battery_level;
    if (battery != null) {
      const charging = isCharging(val("battery_state"));
      stats.push(stat(battIcon(battery, charging), charging ? t("persons.battery_charging") : t("common.battery"), `${Math.round(battery)}%`));
    }
    if (val("steps") != null) stats.push(stat("mdi:shoe-print", t("persons.steps"), int(val("steps"))));
    if (val("activity") != null) stats.push(stat("mdi:run", t("persons.activity_label"), table("persons.activity")[val("activity")] || val("activity")));
    if (val("connection") != null) {
      const wifi = /wi-?fi/i.test(val("connection"));
      stats.push(stat(wifi ? "mdi:wifi" : "mdi:signal-cellular-3", t("persons.connection"), wifi ? val("ssid") || "Wi-Fi" : t("persons.cellular")));
    }
    const address = val("address");
    const where = address ? `<div class="where"><ha-icon icon="mdi:map-marker-outline"></ha-icon><span>${esc(address.split("\n").slice(0, 2).join(", "))}</span></div>` : "";
    return `<div class="sheet-wrap" data-act="close-sheet"><div class="sheet" role="dialog" aria-label="${esc(name)}">
      <div class="hd"><div class="person-hero">
          <div class="person-pic ${home ? "home" : ""}" style="${pic ? `background-image:url('${esc(this._pic(pic))}')` : ""}">${pic ? "" : esc(name[0])}</div>
          <div><h2>${esc(name)}</h2><div class="st"><b style="${home ? "" : "color:#fff"}">${esc(zone)}</b>${st ? ` · ${since(st.last_changed)}` : ""}${esc(dist)}</div></div></div>
        <button class="round" data-act="close-sheet" aria-label="${t("common.close")}" style="align-self:flex-start"><ha-icon icon="mdi:close"></ha-icon></button></div>
      ${stats.length ? `<div class="wx-stats two">${stats.join("")}</div>` : ""}${where}
      <button class="wide-btn" data-act="more" data-entity="${esc(id)}"><ha-icon icon="mdi:map-outline"></ha-icon>${t("persons.map")}</button></div></div>`;
  }

  async _loadTodo() {
    const id = this._todoOpen;
    if (!id) return;
    try {
      const res = await this._hass.callWS({ type: "todo/item/list", entity_id: id });
      this._todoItems = { id, items: res.items || [] };
    } catch (e) {
      this._todoItems = { id, items: [], error: true };
    }
    if (this._todoOpen === id) this._render();
  }

  _todoSheet(id) {
    const chip = (this._config.chips || []).map((x) => (typeof x === "string" ? { entity: x } : x)).find((x) => x.entity === id) || { entity: id };
    const name = this._name(chip);
    const data = this._todoItems?.id === id ? this._todoItems : null;
    const open = data ? data.items.filter((i) => i.status !== "completed") : [];
    const done = data ? data.items.filter((i) => i.status === "completed") : [];
    const seen = {};
    const key = new Map((data?.items || []).map((i) => [i, `${i.summary}#${(seen[i.summary] = (seen[i.summary] ?? -1) + 1)}`]));
    const due = (d) => (d ? date(d, { weekday: "short", day: "numeric", month: "short" }) : "");
    const row = (i) => `<div class="todo ${i.status === "completed" ? "done" : ""}" role="button" tabindex="0" data-act="todo-toggle" data-uid="${esc(i.uid)}" data-flip="${esc(key.get(i))}">
      <span class="chk"><ha-icon icon="mdi:check"></ha-icon></span><span class="tt">${esc(i.summary)}${i.due ? `<small>${esc(due(i.due))}</small>` : ""}</span></div>`;
    const sub = !data ? t("common.loading") : data.error ? t("todo.error") : open.length ? t("todo.open", { n: open.length }) : t("todo.all_done");
    return `<div class="sheet-wrap" data-act="close-sheet"><div class="sheet" role="dialog" aria-label="${esc(name)}">
      <div class="hd"><span class="ic lime"><ha-icon icon="${esc(chip.icon || "mdi:format-list-checks")}"></ha-icon></span>
        <div style="flex:1"><h2>${esc(name)}</h2><div class="s" style="color:var(--muted);font-size:13px">${sub}</div></div>
        <button class="round" data-act="close-sheet" aria-label="${t("common.close")}"><ha-icon icon="mdi:close"></ha-icon></button></div>
      <div class="todo-add"><input type="text" placeholder="${t("todo.add_placeholder")}" data-act="todo-input" aria-label="${t("todo.new_item")}" enterkeyhint="done">
        <button data-act="todo-add" aria-label="${t("todo.add")}"><ha-icon icon="mdi:plus"></ha-icon></button></div>
      <div class="todos">${open.map(row).join("")}</div>
      ${done.length ? `<div class="done-hd" data-flip="done-hd"><span class="label" style="margin:0">${t("todo.done", { n: done.length })}</span>
        <button class="link" data-act="todo-clear">${t("todo.clear")}</button></div><div class="todos">${done.map(row).join("")}</div>` : ""}</div></div>`;
  }

  _todoAdd() {
    const input = this.shadowRoot.querySelector("[data-act=todo-input]");
    const text = input?.value.trim();
    if (!text) return;
    this._todoItems?.items.push({ uid: `tmp-${Date.now()}`, summary: text, status: "needs_action" });
    input.value = "";
    this._render();
    this._call("todo", "add_item", { entity_id: this._todoOpen, item: text });
    input.focus();
  }

  _plantPic(pl, thumb) {
    const st = this._st(pl.entity), pic = (thumb && pl.thumb) || pl.image || st?.attributes.entity_picture;
    return pic ? `background-image:url('${esc(encodeURI(pic))}')` : "";
  }

  _plantTile(pl, i) {
    const st = this._st(pl.entity), a = st?.attributes || {};
    const problems = Array.isArray(a.problems) ? a.problems : [];
    const first = problems[0] && PLANT_METRICS.find((m) => m.key === problems[0].sensor_type);
    const sub = !st ? t("common.no_data") : problems.length ? (first ? first[problems[0].status] || t("plants.attention") : t("plants.attention")).split(" — ")[0] : t("common.all_ok");
    const val = (id, digits, unit) => { const v = this._st(id)?.state; return v != null && !isNaN(v) ? num(v, digits) + unit : null; };
    const chips = [[pl.moisture && val(pl.moisture, 0, "%"), "mdi:water"], [pl.illuminance && val(pl.illuminance, 0, " lx"), "mdi:brightness-5"]]
      .filter(([v]) => v).map(([v, icon]) => `<div class="devchip"><ha-icon icon="${icon}"></ha-icon>${v}</div>`).join("");
    const photo = this._plantPic(pl, true);
    return `<div class="tile plant-tile ${problems.length ? "plant-warn" : ""}" role="button" tabindex="0" data-act="plant" data-plant="${i}">
      <div class="ptop"><div class="plant-pic" style="${photo}">${photo ? "" : `<ha-icon icon="mdi:sprout"></ha-icon>`}</div>
        <div class="pw pstate ${problems.length ? "bad" : ""}" title="${problems.length ? t("plants.attention") : t("plants.ok")}">
          <ha-icon icon="${problems.length ? "mdi:exclamation-thick" : "mdi:check-bold"}"></ha-icon></div></div>
      <div class="name">${esc(pl.name || a.friendly_name || t("plants.plant"))}<span class="proom">${esc(pl.room || "")}</span></div><div class="sub">${esc(sub)}</div>
      <div class="foot pfoot">${chips}</div></div>`;
  }

  _plantSheet(pl) {
    const st = this._st(pl.entity), a = st?.attributes || {};
    const problems = Array.isArray(a.problems) ? a.problems : [];
    const pic = this._plantPic(pl);
    const probRows = problems.map((p) => {
      const m = PLANT_METRICS.find((x) => x.key === p.sensor_type) || { icon: "mdi:alert-circle-outline", color: "#8E8E93", unit: "", digits: 1 };
      const range = p.min != null && p.max != null ? ` · ${t("plants.range", { range: `${num(p.min, m.digits)}–${num(p.max, m.digits)}${m.unit}` })}` : "";
      return `<div class="pproblem"><div class="ic" style="background:${m.color}"><ha-icon icon="${m.icon}"></ha-icon></div>
        <div><div class="t">${esc(m[p.status] || `${p.sensor_type}: ${p.status}`)}</div>
        <div class="s">${t("common.now_value", { v: `${num(p.current, m.digits)}${esc(m.unit)}` })}${range}</div></div></div>`;
    }).join("");
    const metric = (m, id, statusVal) => {
      const v = this._st(id)?.state;
      const ok = !statusVal || String(statusVal).toLowerCase() === "ok";
      const label = !statusVal ? "" : ok ? t("plants.in_range") : String(statusVal).toLowerCase() === "low" ? t("plants.low") : t("plants.high");
      return `<div class="pmetric" role="button" tabindex="0" data-act="more" data-entity="${esc(id)}" style="--c:${m.color}">
        <div class="pm-hd"><ha-icon icon="${m.icon}"></ha-icon>${esc(m.label)}</div>
        <div class="pm-v">${v != null && !isNaN(v) ? num(v, m.digits) + esc(m.unit) : "–"}</div>
        ${label ? `<div class="pm-s ${ok ? "" : "bad"}"><ha-icon icon="${ok ? "mdi:check-circle" : String(statusVal).toLowerCase() === "low" ? "mdi:arrow-down-circle" : "mdi:arrow-up-circle"}"></ha-icon>${label}</div>` : ""}</div>`;
    };
    const metrics = PLANT_METRICS.filter((m) => pl[m.key]).map((m) => metric(m, pl[m.key], a[m.status])).join("")
      + (pl.battery ? metric({ label: t("plants.sensor_battery"), icon: "mdi:battery-60", color: "#34C759", unit: "%", digits: 0 }, pl.battery,
        Number(this._st(pl.battery)?.state) < 15 ? "low" : "ok") : "");
    return `<div class="sheet-wrap" data-act="close-sheet"><div class="sheet plant-sheet" role="dialog" aria-label="${esc(pl.name || a.friendly_name || "")}">
      <div class="plant-banner" style="${pic}">
        <button class="round" data-act="close-sheet" aria-label="${t("common.close")}"><ha-icon icon="mdi:close"></ha-icon></button>
        <div class="pb-txt"><span class="pbadge ${problems.length ? "bad" : ""}"><ha-icon icon="${problems.length ? "mdi:alert-circle" : "mdi:check-circle"}"></ha-icon>
            ${problems.length ? t("plants.attention") : t("plants.ok")}</span>
          <h2>${esc(pl.name || a.friendly_name || t("plants.plant"))}</h2>${a.species ? `<div class="sp">${esc(a.species)}${pl.room ? ` · ${esc(pl.room)}` : ""}</div>` : ""}</div></div>
      ${probRows ? `<div class="pproblems">${probRows}</div>` : ""}
      <div class="pmetrics">${metrics}</div></div></div>`;
  }

  // A media entry is an entity id, or { entity, name, now_playing } for a TV that only reports which app is open: while the
  // TV is on, a companion player (YouTube on TV, Google Cast) that is playing lends its title, artwork and transport
  // controls, and the TV keeps its own name, power and volume.
  _mediaInfo(x) {
    const id = typeof x === "string" ? x : x?.entity;
    const st = this._st(id);
    if (!st) return null;
    const live = (s) => s && ["playing", "paused", "buffering"].includes(s.state);
    const on = !["off", "unavailable", "unknown", "standby"].includes(st.state);
    // `now_playing: [{ entity, app: youtube }]`: that companion counts only while the TV has that app open, so a YouTube
    // session left paused in the background does not cover what the TV shows now.
    const appOpen = (p) => !p?.app || new RegExp(p.app, "i").test([st.attributes.app_id, st.attributes.app_name].join(" "));
    const extra = on && typeof x === "object" && [].concat(x.now_playing || []).filter(appOpen)
      .map((p) => this._st(typeof p === "string" ? p : p.entity)).find(live);
    const src = extra || st, tv = { ...st.attributes, ...(x?.name && { friendly_name: x.name }) };
    const a = extra ? { ...extra.attributes, friendly_name: tv.friendly_name, device_class: tv.device_class,
      volume_level: tv.volume_level, is_volume_muted: tv.is_volume_muted } : tv;
    const active = live(src);
    // TV inputs by name: `sources: { HDMI2: "Dekoder" }` on the media item; otherwise "HDMI2" reads as "HDMI 2".
    const names = (typeof x === "object" && x.sources) || {};
    const srcName = (v) => v && (names[v] || String(v).replace(/^HDMI\s*(\d)$/i, "HDMI $1"));
    // `picture: input_text.x` on the media item: an entity whose state is an artwork URL, for players that report a
    // title but no picture (PLAY NOW over Cast). Used only while something plays and the player has no art itself.
    const own = a.entity_picture_local || a.entity_picture;
    const ext = !own && active && typeof x === "object" && x.picture && this._st(x.picture);
    const given = own || (ext && /^https?:\/\//.test(ext.state) ? ext.state : "");
    const found = !given && active ? this._lookupArt(a) : "", pic = given || found;
    // `subtitle: input_text.x`: a line under the title (the TV channel name) when the player sends no artist.
    const subSt = active && typeof x === "object" && x.subtitle && this._st(x.subtitle);
    const subtitle = subSt && !["unknown", "unavailable"].includes(subSt.state) ? subSt.state : "";
    return {
      id: src.entity_id, tv: id, st, a, active, playing: src.state === "playing", srcName,
      // A TV that is on but plays nothing HA can see (decoder, console on HDMI) still shows what it is on.
      input: on && !active ? srcName(tv.source) || tvApp(String(tv.app_id || "")) : "",
      title: a.media_title || (active ? a.app_name || srcName(a.source) : "") || "",
      artist: a.media_artist || a.media_album_name || a.media_series_title || subtitle || "",
      // The TV channel (from `subtitle`) and, from `channel_logos: { "TV Republika": url | { logo, color } }`, its logo
      // (and the colour behind it in the blurred background) for when the programme has no picture of its own.
      // `channel_list: /local/logos/playnow-channels.json` ({ liveId: { name, logo } }, from PLAY NOW's public channel
      // list): the station's logo by the liveId Cast reports, shown instead of the programme picture.
      ...(() => {
        const live = active && typeof x === "object" && x.channel_list ? (String(a.media_content_id || "").match(/"liveId":(\d+)/) || [])[1] : "";
        if (live && !this._channels) this._loadChannels(x.channel_list);
        // The list goes by the same liveId as the logo, so its name never lags behind a channel change like the
        // ADB-read subtitle can.
        const listed = (live && this._channels?.[live]) || {}, name = listed.name || subtitle || "";
        const c = (name && typeof x === "object" && x.channel_logos?.[name]) || "";
        return { channel: name, channelLogo: (typeof c === "string" ? c : c.logo) || listed.logo || "",
          channelColor: (typeof c === "object" && c.color) || "" };
      })(),
      // A Google TV reports the open app as its package (com.google.android.youtube.tv): show the app's name instead.
      app: [a.app_name, srcName(a.source), tv.app_name, srcName(tv.source)].filter(Boolean)
        .map((v) => (/^[a-z][\w]*(\.[\w]+)+$/i.test(v) ? tvApp(v) : v)).find(Boolean) || "",
      pic, cover: !!found,
      // No title means the picture is the open app's icon, not artwork.
      logo: !a.media_title,
      // Without artwork (Cast from Google TV apps sends none) the app's logo fills the tile instead of nothing.
      // `schedule: input_text.x` holding "17:25–17:45" (the programme's slot from the EPG): live TV's progress and times
      // follow it, since Cast's position only counts from the moment the channel was tuned.
      slot: (() => {
        const v = active && typeof x === "object" && x.schedule && this._st(x.schedule)?.state;
        const t = /^(\d{1,2}):(\d{2})\s*[–-]\s*(\d{1,2}):(\d{2})$/.exec(v || "");
        if (!t) return null;
        const at = (h, mi) => { const d = new Date(); d.setHours(+h, +mi, 0, 0); return d; };
        let from = at(t[1], t[2]), to = at(t[3], t[4]);
        if (to <= from) (Date.now() < to.getTime() + 864e5 / 2 ? from.setDate(from.getDate() - 1) : to.setDate(to.getDate() + 1));
        return { from, to, label: [t[1].padStart(2, "0") + ":" + t[2], t[3].padStart(2, "0") + ":" + t[4]] };
      })(),
      appBrand: BRANDS.find(([re]) => re.test([a.app_id, a.app_name, a.source, tv.app_id, tv.source].join(" ").toLowerCase())),
      brand: (!a.media_title || !pic) && BRANDS.find(([re]) => re.test([a.app_id, a.app_name, a.source, tv.app_id, tv.source].join(" ").toLowerCase())),
    };
  }

  // Players that send a title and an artist but no picture (YouTube on Google TV over Cast): the cover is looked up by
  // artist and title in the iTunes Search API, once per song, and kept for the session. `artwork_lookup: false` turns it off.
  _lookupArt(a) {
    if (this._config.artwork_lookup === false || !a.media_title || !a.media_artist) return "";
    const key = `${a.media_artist}\n${a.media_title}`.toLowerCase(), cache = (this._artCache ||= new Map());
    if (cache.has(key)) return cache.get(key);
    cache.set(key, "");
    const term = encodeURIComponent(`${a.media_artist} ${a.media_title.replace(/\s*[([].*?[)\]]/g, "")}`);
    fetch(`https://itunes.apple.com/search?term=${term}&media=music&entity=song&limit=1&country=${this._hass.config?.country || "US"}`)
      .then((r) => r.json()).then((d) => {
        // A video that is not a song can still match some record: take the cover only when the artist agrees.
        const hit = d.results?.[0], want = fold(a.media_artist).split(/\W+/)[0] || "";
        const url = hit && want && fold(hit.artistName || "").includes(want) ? hit.artworkUrl100 : "";
        if (url) { cache.set(key, url.replace(/100x100bb/, "600x600bb")); this._schedule(); }
      }).catch(() => {});
    return "";
  }

  async _loadChannels(url) {
    if (this._channelsLoading) return;
    this._channelsLoading = true;
    try {
      const res = await fetch(url, { cache: "no-cache" });
      this._channels = res.ok ? await res.json() : {};
    } catch (e) { this._channels = {}; }
    this._schedule();
  }

  _progressAttrs(m) {
    if (m.slot) {
      const dur = (m.slot.to - m.slot.from) / 1000, pos = Math.max(0, Math.min(dur, (Date.now() - m.slot.from) / 1000));
      return `data-progress data-pos="${pos}" data-at="${new Date().toISOString()}" data-dur="${dur}" data-playing="1" style="transform:scaleX(${(pos / dur).toFixed(4)})"`;
    }
    if (!m.a.media_duration) return "";
    const data = { pos: m.a.media_position || 0, at: m.a.media_position_updated_at || "", dur: m.a.media_duration, playing: m.playing ? "1" : "0" };
    const pct = (this._position(data) / m.a.media_duration) * 100;
    return `data-progress data-pos="${data.pos}" data-at="${esc(data.at)}" data-dur="${data.dur}" data-playing="${data.playing}" style="transform:scaleX(${(pct / 100).toFixed(4)})"`;
  }

  // This calendar month's consumption per appliance, from the recorder's long-term statistics of its energy meter.
  async _loadMonthly() {
    const meters = [...(this._config.appliances || []), ...this._config.rooms].map((x) => x.energy_meter).filter(Boolean);
    if (!meters.length) return;
    const values = {};
    await Promise.all(meters.map(async (id) => {
      try {
        const res = await this._hass.callWS({ type: "recorder/statistic_during_period", statistic_id: id,
          calendar: { period: "month" }, types: ["change"] });
        if (res?.change != null) values[id] = res.change;
      } catch (e) { /* no statistics yet */ }
    }));
    this._monthly = values;
    this._schedule();
  }

  // --- usage: electricity, gas, water ----------------------------------------------------------------
  // `usage: [{ name, icon, color, meter, price, chart: month | day, spike, today, live, updated, info: [...] }]`.
  // `meter` is a total_increasing meter with long-term statistics. `chart: month` draws the last 12 months (meters read
  // by the supplier: Energa, Orlen), `chart: day` the last 30 days (a meter in the house). `label` replaces "W tym miesiącu" and `compare: false` hides last month (a meter read every
  // two months). `spike` drops days above that
  // value (a pulse meter that sometimes jumps). `digits` / `today_digits` set the decimals. `price` is a number or an entity; `updated` an attribute of the meter
  // with the date the supplier's data reaches. `info` rows: { entity, attribute, name, days, date, unit, digits }.
  async _loadUsage() {
    const list = this._config.usage || [], now = new Date();
    const by = (k) => list.filter((u) => (u.chart || "month") === k).map((u) => u.meter);
    const ws = (start, period, statistic_ids) => (statistic_ids.length ? this._hass.callWS({ type: "recorder/statistics_during_period",
      start_time: start.toISOString(), statistic_ids, period, types: ["change"] }) : Promise.resolve({}));
    try {
      const [m, d] = await Promise.all([ws(new Date(now.getFullYear(), now.getMonth() - 11, 1), "month", by("month")),
        ws(new Date(now.getFullYear(), now.getMonth() - 1, 1), "day", by("day"))]);
      this._usage = { m, d };
      this._schedule();
    } catch (e) { /* recorder busy: next try in 15 min */ }
  }

  _usageData(u) {
    const now = new Date(), y = now.getFullYear(), mo = now.getMonth(), st = this._st(u.meter);
    const key = (t) => { const d = new Date(t); return `${d.getFullYear()}-${d.getMonth()}-${u.chart === "day" ? d.getDate() : 0}`; };
    const rows = new Map(((u.chart === "day" ? this._usage?.d : this._usage?.m)?.[u.meter] || [])
      .map((r) => [key(r.start), Math.max(0, r.change || 0)]).filter(([, v]) => !(u.spike && v > u.spike)));
    // A meter that resets every midnight (history_stats "today") is its own today: statistics only hold finished hours.
    if (u.chart === "day" && u.today === u.meter && st && !isNaN(st.state)) rows.set(key(now), Number(st.state));
    let bars, cur, prev;
    if (u.chart === "day") {
      bars = Array.from({ length: 30 }, (_, i) => { const d = new Date(y, mo, now.getDate() - 29 + i);
        return { v: rows.get(key(d)) || 0, label: `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, "0")}`, on: i === 29 }; });
      const sum = (m) => [...rows].filter(([k]) => k.startsWith(`${new Date(y, m, 1).getFullYear()}-${(m + 12) % 12}-`)).reduce((a, [, v]) => a + v, 0);
      cur = sum(mo); prev = sum(mo - 1);
    } else {
      bars = Array.from({ length: 12 }, (_, i) => { const d = new Date(y, mo - 11 + i, 1);
        return { v: rows.get(key(d)) || 0, label: date(d, { month: "short" }).replace(".", ""), on: i === 11 }; });
      cur = bars[11].v; prev = bars[10].v;
    }
    const price = typeof u.price === "number" ? u.price : Number(this._st(u.price)?.state);
    return { st, bars, cur, prev, unit: st?.attributes.unit_of_measurement || "", price: isNaN(price) ? null : price, loaded: !!this._usage };
  }

  _usageInfo(i) {
    const st = this._st(i.entity);
    if (!st) return "";
    const v = i.attribute ? st.attributes[i.attribute] : st.state;
    if (v == null || ["unknown", "unavailable", "None"].includes(String(v))) return "";
    const day = (x) => date(new Date(String(x).replace(" ", "T")), { day: "numeric", month: "short" });
    // The panels are narrow: the date is the value, how many days away goes into the label ("Odczyt · 17 dni" / "3 gru").
    let txt, label = i.name;
    if (i.days) {
      const n = Math.round(Number(v)), when = n <= 0 ? t("common.today_lc") : n === 1 ? t("common.tomorrow_lc") : t("usage.days", { n });
      if (st.attributes.event_time) { txt = day(st.attributes.event_time); label = `${i.name} · ${when}`; } else txt = when;
    } else if (i.date) txt = day(v);
    else txt = isNaN(v) ? String(v) : `${num(v, i.digits ?? 2)}${i.unit ? " " + i.unit : ""}`;
    return `<div class="use-info"><span>${esc(label)}</span><b>${esc(txt)}</b></div>`;
  }

  _usagePanel(u) {
    const d = this._usageData(u), max = Math.max(...d.bars.map((b) => b.v), 1e-9);
    const digits = u.digits ?? (d.unit === "kWh" ? 0 : d.cur < 10 ? 2 : 0);
    const live = u.live && this._st(u.live), today = u.today && this._st(u.today);
    const upd = u.updated && d.st?.attributes[u.updated];
    const cost = d.price != null && d.cur ? money(d.cur * d.price, 0) : "";
    const prev = d.prev && u.compare !== false ? `<div class="use-info"><span>${t("usage.prev_month")}</span><b>${num(d.prev, digits)} ${esc(d.unit)}</b></div>` : "";
    const label = (i) => (u.chart === "day" ? i % 7 === 1 : i % 2 === 1);
    return `<div class="panel use" style="--use:${esc(u.color || "var(--lime)")}">
      <h3><span class="ic use-ic"><ha-icon icon="${esc(u.icon || "mdi:meter-electric-outline")}"></ha-icon></span>${esc(u.name)}
        ${live && !isNaN(live.state) ? `<span class="meta" style="white-space:nowrap">${num(live.state, 1)} ${esc(live.attributes.unit_of_measurement || "")}</span>` : ""}</h3>
      <div class="use-big">${d.loaded ? num(d.cur, digits) : "–"}<small>${esc(d.unit)}</small>${cost ? `<span class="use-cost">${t("usage.approx", { v: cost })}</span>` : ""}</div>
      <div class="use-sub">${esc(u.label || t("usage.this_month"))}</div>
      <div class="use-chart" aria-hidden="true">${d.bars.map((b, i) => `<div class="use-col ${b.on ? "on" : ""}">
        <i style="height:${Math.max(b.v ? 3 : 0, (b.v / max) * 100).toFixed(1)}%"></i><span>${label(i) || b.on ? esc(b.label) : ""}</span></div>`).join("")}</div>
      <div class="use-infos">${prev}${today && !isNaN(today.state) ? `<div class="use-info"><span>${t("common.today")}</span><b>${num(today.state, u.today_digits ?? 0)} ${esc(today.attributes.unit_of_measurement || "")}</b></div>` : ""}
        ${upd ? `<div class="use-info"><span>${t("usage.data_until")}</span><b>${esc(date(new Date(String(upd).replace(" ", "T")), { day: "numeric", month: "short" }))}</b></div>` : ""}
        ${(u.info || []).map((i) => this._usageInfo(i)).join("")}</div></div>`;
  }

  _usageTab() {
    const list = this._config.usage || [];
    return `<div class="section-title">${t("tabs.usage")}</div><div class="panels use-panels" style="--n:${list.length}">${list.map((u) => this._usagePanel(u)).join("")}</div>`;
  }

  // --- heating: the OpenTherm boiler -------------------------------------------------------------------
  // `heating: { flame, ch_active, dhw_active, fault, modulation, flow, return, setpoint, curve, correction, outdoor, mode,
  // pressure, dhw, starts, hours, slope, offset }`: entities of the boiler and of the ESP that drives it. The tab shows
  // what the boiler does now, the last 24 h (flow, return, target, flame) and today's burner time and starts.
  // The boiler's 24 h history is read only while its tab is on screen, then every 5 minutes. Called on each hass update
  // and right on the tab click: waiting for the next state change left the chart empty for up to ~10 s.
  _heatDue() {
    if (this._config.heating && this._tab === "heating" && this._hass && (!this._heatAt || Date.now() - this._heatAt > 5 * 60000)) { this._heatAt = Date.now(); this._loadHeating(); }
  }

  async _loadHeating() {
    const h = this._config.heating, now = Date.now();
    const list = [h.flow, h.return, h.setpoint, h.flame, h.starts].filter(Boolean);
    try {
      const r = await this._hass.callWS({ type: "history/history_during_period", start_time: new Date(now - 24 * 3600e3).toISOString(),
        entity_ids: list, minimal_response: true, no_attributes: true, significant_changes_only: false });
      const pts = (id) => (r[id] || []).map((x) => [(x.lu ?? x.lc) * 1000, x.s]);
      this._heatHist = { flow: pts(h.flow), ret: pts(h.return), set: pts(h.setpoint), flame: pts(h.flame), starts: pts(h.starts) };
      this._schedule();
    } catch (e) { this._heatAt = now - 4 * 60000; /* recorder busy: try again in a minute */ }
  }

  // Burner time and starts since midnight, from the 24 h history (the starts counter only ever grows).
  _heatToday() {
    const d = this._heatHist;
    if (!d) return null;
    const mid = new Date(); mid.setHours(0, 0, 0, 0);
    const m = mid.getTime(), now = Date.now();
    let on = 0;
    d.flame.forEach(([t, s], i) => {
      if (s !== "on") return;
      const a = Math.max(t, m), b = Math.min(d.flame[i + 1]?.[0] ?? now, now);
      if (b > a) on += b - a;
    });
    const n = d.starts.map(([t, s]) => [t, Number(s)]).filter(([, v]) => !isNaN(v) && v > 0);
    const base = [...n].reverse().find(([t]) => t <= m) || n[0];
    const cur = Number(this._st(this._config.heating.starts)?.state);
    return { hours: on / 3600e3, starts: base && !isNaN(cur) ? Math.max(0, cur - base[1]) : null };
  }

  // Samples a stepwise sensor history every `step` ms (the value held at that moment), so the chart draws a calm line
  // instead of every 1 °C flicker, while ignition peaks still show.
  _heatSample(arr, start, end, step) {
    const p = arr.filter(([, s]) => s !== "" && s != null && !isNaN(s)).map(([t, s]) => [t, Number(s)]);
    if (!p.length) return [];
    const out = [];
    let i = 0, cur = null;
    for (let t = start; t <= end; t += step) {
      while (i < p.length && p[i][0] <= t) cur = p[i++][1];
      if (cur != null) out.push([t, cur]);
    }
    return out;
  }

  // The chart is rebuilt only when a new 24 h history arrives (every 5 min). Rebuilt per render it rewrote every
  // path of the SVG on each boiler reading, ~60 ms a time on the wall tablet.
  _heatChart() {
    const d = this._heatHist;
    if (d && this._heatChartFor === d) return this._heatChartHtml;
    this._heatChartFor = d;
    return (this._heatChartHtml = this._heatChartBuild());
  }
  _heatChartBuild() {
    const d = this._heatHist;
    if (!d) return `<div class="heat-empty">${t("heating.loading")}</div>`;
    const end = Date.now(), first = Math.min(...[d.flow, d.ret].map((a) => a[0]?.[0] ?? end));
    // Until a full day is recorded the chart starts at the first reading, so it is not mostly empty.
    const start = Math.max(end - 24 * 3600e3, first), span = Math.max(end - start, 3600e3), step = Math.max(60e3, span / 240);
    const lines = { flow: this._heatSample(d.flow, start, end, step), ret: this._heatSample(d.ret, start, end, step), set: this._heatSample(d.set, start, end, step) };
    const all = [...lines.flow, ...lines.ret, ...lines.set].map(([, v]) => v);
    if (!all.length) return `<div class="heat-empty">${t("heating.no_data_24h")}</div>`;
    const W = 640, H = 190, lo = Math.min(30, Math.floor(Math.min(...all) / 5) * 5), hi = Math.max(lo + 20, Math.ceil(Math.max(...all) / 5) * 5);
    const x = (t) => ((t - start) / span) * W, y = (v) => H - ((v - lo) / (hi - lo)) * H;
    const line = (p) => p.map(([t, v], i) => `${i ? "L" : "M"}${x(t).toFixed(1)} ${y(v).toFixed(1)}`).join("");
    const area = (p) => (p.length ? `${line(p)}L${x(p[p.length - 1][0]).toFixed(1)} ${H}L${x(p[0][0]).toFixed(1)} ${H}Z` : "");
    const fl = d.flame, flames = fl.map(([t, s], i) => {
      if (s !== "on") return "";
      const a = x(Math.max(t, start)), b = x(Math.min(fl[i + 1]?.[0] ?? end, end));
      return b > a ? `<rect x="${a.toFixed(1)}" y="0" width="${Math.max(2, b - a).toFixed(1)}" height="10" rx="3"/>` : "";
    }).join("");
    const cond = Math.min(Math.max(45, lo), hi), condY = y(cond);
    const ticks = [], hourStep = span > 12 * 3600e3 ? 6 : span > 4 * 3600e3 ? 2 : 1, t0 = new Date(start); t0.setMinutes(0, 0, 0);
    for (let t = t0.getTime() + 3600e3; t < end - 900e3; t += 3600e3) if (new Date(t).getHours() % hourStep === 0) ticks.push(t);
    const yTicks = []; for (let v = lo; v <= hi; v += hi - lo > 30 ? 10 : 5) yTicks.push(v);
    return `<div class="hc-legend"><span style="--c:#FF9F5A">${t("heating.flow")}</span><span style="--c:#5AC8FA">${t("heating.return")}</span>
        <span class="dash" style="--c:rgba(255,255,255,.7)">${t("heating.target_short")}</span><span class="flame" style="--c:#FF9F0A">${t("heating.burner")}</span></div>
      <div class="hc-plot"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
        <defs><linearGradient id="hc-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF9F5A" stop-opacity=".22"/><stop offset="1" stop-color="#FF9F5A" stop-opacity="0"/></linearGradient></defs>
        <rect class="hc-zone" x="0" y="${condY.toFixed(1)}" width="${W}" height="${(H - condY).toFixed(1)}"/><line class="hc-45" x1="0" x2="${W}" y1="${condY.toFixed(1)}" y2="${condY.toFixed(1)}"/>
        ${yTicks.map((v) => `<line class="grid" x1="0" x2="${W}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/>`).join("")}
        <path d="${area(lines.flow)}" fill="url(#hc-fill)"/>
        <path class="ln set" d="${line(lines.set)}"/><path class="ln ret" d="${line(lines.ret)}"/><path class="ln flow" d="${line(lines.flow)}"/></svg>
        ${yTicks.map((v) => `<span class="hc-y" style="top:${((y(v) / H) * 100).toFixed(1)}%">${v}°</span>`).join("")}
        <span class="hc-45l" style="top:${((condY / H) * 100).toFixed(1)}%">${t("heating.condense_line")}</span></div>
      <svg class="hc-flame" viewBox="0 0 ${W} 10" preserveAspectRatio="none" aria-hidden="true">${flames}</svg>
      <div class="hc-x">${ticks.map((t) => `<span style="left:${((x(t) / W) * 100).toFixed(2)}%">${String(new Date(t).getHours()).padStart(2, "0")}:00</span>`).join("")}</div>`;
  }

  // The installation as it hangs on the wall: a white wall boiler with its blue display and the burner seen through a
  // window (flames taller with more power), copper flow and return pipes running down and across to a panel radiator,
  // the gas pipe with its yellow valve coming up from the floor. Dashes run in the pipes while water or gas flows, and
  // warm air rises from the radiator when it is warm.
  _heatLoop(s) {
    const deg = (v) => (v == null ? "–" : `${num(v, 0)}°`);
    const warm = s.rad != null ? Math.min(1, Math.max(0, (s.rad - 22) / 23)) : s.pump && s.flow != null ? Math.min(1, Math.max(0.12, (s.flow - 25) / 35)) : 0;
    const room = s.room != null ? `${num(s.room, 1)}°` : "–";
    const goal = s.target != null && !isNaN(s.target) ? `<tspan class="hl-long"> · </tspan>${t("heating.goal", { t: num(s.target, 1) })}` : "";
    const h = s.flame ? 0.45 + Math.min(100, Math.max(0, s.mod ?? 0)) / 100 * 0.55 : 0;
    const flames = s.flame ? [0, 1, 2, 3, 4].map((i) => {
      const x = 112 + i * 14, k = h * (i % 2 ? 0.85 : 1);
      return `<path class="hl-tongue" style="animation-delay:${(i * 0.17).toFixed(2)}s" d="M${x} 168c-5 0-7-4-7-9 0-${(14 * k).toFixed(1)} 7-${(26 * k).toFixed(1)} 7-${(34 * k).toFixed(1)}c0 ${(8 * k).toFixed(1)} 7 ${(20 * k).toFixed(1)} 7 ${(34 * k).toFixed(1)} 0 5-2 9-7 9z"/>`;
    }).join("") : "";
    const ribs = Array.from({ length: 17 }, (_, i) => `<line x1="${482 + i * 10}" x2="${482 + i * 10}" y1="98" y2="208"/>`).join("");
    const pipe = (d, cls) => `<path class="hl-p-out" d="${d}"/><path class="hl-p ${cls}" d="${d}"/>`;
    const flowD = "M178 204V226H490V214", retD = "M638 214V262H140V204", gasD = "M-44 286H112V204";
    // Hot tap water: cold mains in from the left, hot out to the tap on the wall.
    const coldD = "M-44 258H94V204", dhwD = "M76 204V234H2V156";
    return `<svg class="hl" viewBox="-44 6 724 306" role="img" aria-label="${t("heating.loop_aria", { flow: deg(s.flow), ret: deg(s.ret), rad: s.rad != null ? deg(s.rad) : "–", room })}">
      <defs>
        <linearGradient id="hl-burn" gradientUnits="userSpaceOnUse" x1="0" y1="168" x2="0" y2="118"><stop offset="0" stop-color="#3D7BFF"/><stop offset=".35" stop-color="#FF8A1E"/><stop offset="1" stop-color="#FFE08A"/></linearGradient>
        <radialGradient id="hl-glow2"><stop offset="0" stop-color="#FF9F0A" stop-opacity=".7"/><stop offset="1" stop-color="#FF9F0A" stop-opacity="0"/></radialGradient>
        <linearGradient id="hl-radwarm" gradientUnits="userSpaceOnUse" x1="0" y1="92" x2="0" y2="214"><stop offset="0" stop-color="#FFB067" stop-opacity="${(warm * 0.85).toFixed(2)}"/><stop offset="1" stop-color="#FF9F5A" stop-opacity="${(warm * 0.25).toFixed(2)}"/></linearGradient>
      </defs>
      <line class="hl-floor" x1="-44" x2="680" y1="308" y2="308"/>
      ${pipe(gasD, "gas")}${pipe(coldD, "mains")}${pipe(dhwD, "dhw")}${pipe(flowD, "hot")}${pipe(retD, "cold")}
      ${s.dhwOn ? `<path class="hl-flow" d="${coldD}"/><path class="hl-flow" d="${dhwD}"/>` : ""}
      <g class="hl-tap"><rect x="-8" y="140" width="20" height="18" rx="5"/><path d="M-8 146H-24a6 6 0 0 0-6 6v6" /><rect class="hl-tapk" x="-4" y="132" width="12" height="7" rx="3"/></g>
      ${s.dhwOn ? [0, 1, 2].map((i) => `<circle class="hl-drop" style="animation-delay:${(i * 0.33).toFixed(2)}s" cx="-30" cy="164" r="2.6"/>`).join("") : ""}
      <text class="hl-dhwt" x="-36" y="116">${s.dhw != null ? deg(s.dhw) : "–"}</text><text class="hl-lbl start" x="-36" y="134">${t("heating.dhw_short")}</text>
      ${s.flame ? `<path class="hl-flow gas" d="${gasD}"/>` : ""}${s.pump ? `<path class="hl-flow" d="${flowD}"/><path class="hl-flow" d="${retD}"/>` : ""}
      <g class="hl-valve"><rect x="24" y="279" width="12" height="14" rx="3"/><rect class="hl-handle" x="27" y="266" width="7" height="16" rx="3.5"/></g>
      <text class="hl-lbl gas start" x="-42" y="302">${t("heating.gas_lc")}</text>
      <rect class="hl-case" x="60" y="14" width="160" height="190" rx="18"/>
      <rect class="hl-seam" x="60" y="92" width="160" height="1.5"/>
      <rect class="hl-lcd" x="92" y="30" width="96" height="40" rx="6"/>
      <text class="hl-lcdt" x="140" y="51">${deg(s.flow)}</text>
      ${s.flame ? `<path class="hl-lcdf" d="M101 44c1 3 5 4 5 9a5 5 0 0 1-10 0c0-3 2-5 3-6 0 2 1 3 2 3 0-3 0-4 0-6z"/>` : ""}
      ${[0, 1, 2, 3].map((i) => `<rect class="hl-key" x="${96 + i * 23}" y="76" width="18" height="8" rx="4"/>`).join("")}
      <rect class="hl-win" x="98" y="106" width="84" height="70" rx="10"/>
      ${s.flame ? `<circle cx="140" cy="150" r="46" fill="url(#hl-glow2)"/>` : ""}
      <g fill="url(#hl-burn)">${flames}</g>
      <rect class="hl-burner" x="104" y="166" width="72" height="5" rx="2.5"/>
      <text class="hl-cap" x="140" y="196">${t("heating.boiler_lc")}</text>
      ${warm > 0.3 ? [0, 1, 2].map((i) => `<path class="hl-air" style="animation-delay:${(i * 0.9).toFixed(1)}s" d="M${586 + i * 26} 88c-4-5 4-8 0-12s4-8 0-12"/>`).join("") : ""}
      <rect class="hl-rad2" x="472" y="92" width="184" height="122" rx="8"/>
      <rect x="472" y="92" width="184" height="122" rx="8" fill="url(#hl-radwarm)"/>
      <g class="hl-ribs">${ribs}</g>
      <rect class="hl-trv" x="482" y="212" width="16" height="11" rx="3"/><rect class="hl-trv" x="630" y="212" width="16" height="11" rx="3"/>
      ${s.rad != null ? `<rect class="hl-badge" x="518" y="131" width="92" height="44" rx="22"/><text class="hl-radt" x="564" y="154">${num(s.rad, 0)}°</text>` : ""}
      <text class="hl-lbl" x="564" y="230">${t("heating.radiator_lc")}</text>
      <text class="hl-room" x="472" y="36">${room}</text><text class="hl-lbl start" x="474" y="56"><tspan class="hl-long">${t("heating.indoors")}</tspan>${goal}</text>
      <text class="hl-num hot" x="310" y="212">${deg(s.flow)}</text><text class="hl-lbl start" x="362" y="206">${t("heating.flow_lc")}</text>
      <text class="hl-num cold" x="310" y="302">${deg(s.ret)}</text><text class="hl-lbl start" x="362" y="296">${t("heating.return_lc")}</text>
    </svg>`;
  }



  // The heating curve itself: water temperature against outdoor temperature for the current settings, with today's point.
  _heatCurve(s) {
    const W = 300, H = 170, x0 = -15, x1 = 20, ylo = 20, yhi = 60;
    const x = (t) => ((t - x0) / (x1 - x0)) * W, y = (v) => H - ((Math.min(yhi, Math.max(ylo, v)) - ylo) / (yhi - ylo)) * H;
    const f = (t) => Math.min(s.tmax ?? 60, Math.max(s.tmin ?? 20, s.target + s.slope * (s.target - t) + s.offset));
    const pts = []; for (let t = x0; t <= x1; t += 1) pts.push(`${pts.length ? "L" : "M"}${x(t).toFixed(1)} ${y(f(t)).toFixed(1)}`);
    const out = s.out != null ? Math.min(x1, Math.max(x0, s.out)) : null, now = out != null ? f(out) : null;
    const fill = `${pts.join("")}L${W} ${H}L0 ${H}Z`;
    return `<div class="cv-plot"><span class="cv-yl">${t("heating.water_lc")}</span><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
        <defs><linearGradient id="cv-g" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${W}" y2="0"><stop offset="0" stop-color="#FF6B3D"/><stop offset=".55" stop-color="#FFB347"/><stop offset="1" stop-color="#7FD4FF"/></linearGradient>
          <linearGradient id="cv-f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFB347" stop-opacity=".16"/><stop offset="1" stop-color="#FFB347" stop-opacity="0"/></linearGradient></defs>
        <path d="${fill}" fill="url(#cv-f)"/>
        ${[30, 40, 50].map((v) => `<line class="grid" x1="0" x2="${W}" y1="${y(v)}" y2="${y(v)}"/>`).join("")}
        ${[-10, 0, 10].map((t) => `<line class="grid" y1="0" y2="${H}" x1="${x(t)}" x2="${x(t)}"/>`).join("")}
        <path class="cv-line" stroke="url(#cv-g)" d="${pts.join("")}"/>
        ${now != null ? `<line class="cv-guide" x1="${x(out).toFixed(1)}" x2="${x(out).toFixed(1)}" y1="${H}" y2="${y(now).toFixed(1)}"/>` : ""}</svg>
      ${now != null ? `<i class="cv-dot" style="left:${((x(out) / W) * 100).toFixed(1)}%;top:${((y(now) / H) * 100).toFixed(1)}%"></i>
        <span class="cv-tag" style="left:${((x(out) / W) * 100).toFixed(1)}%;top:${((y(now) / H) * 100).toFixed(1)}%">${num(s.out, 0)}° → ${num(now, 0)}°</span>` : ""}
      ${[30, 40, 50].map((v) => `<span class="hc-y" style="top:${((y(v) / H) * 100).toFixed(1)}%">${v}°</span>`).join("")}</div>
      <div class="hc-x cv-x">${[-10, 0, 10].map((t) => `<span style="left:${((x(t) / W) * 100).toFixed(1)}%">${t}°</span>`).join("")}<em>${t("heating.outside_lc")}</em></div>`;
  }

  // The thermostat as a dial: the arc fills up to the target, a dot marks the room now, − / + on the sides, then the
  // schedule / 1 h / off buttons and every room's temperature, so the panel answers "is it warm enough everywhere".
  _heatThermo() {
    const th = this._thermo();
    if (!th) return "";
    const { a } = th, min = Number(a.min_temp ?? 15), max = Number(a.max_temp ?? 25), cur = Number(a.current_temperature);
    const R = 84, C = 100, sweep = 270, start = 135;
    const ang = (v) => start + (Math.min(max, Math.max(min, v)) - min) / (max - min) * sweep;
    const pt = (deg) => [C + R * Math.cos((deg * Math.PI) / 180), C + R * Math.sin((deg * Math.PI) / 180)];
    const arc = (d0, d1) => { const [x0, y0] = pt(d0), [x1, y1] = pt(d1); return `M${x0.toFixed(1)} ${y0.toFixed(1)}A${R} ${R} 0 ${d1 - d0 > 180 ? 1 : 0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`; };
    const [cx, cy] = !isNaN(cur) ? pt(ang(cur)) : [null, null];
    const tone = !th.on ? "off" : th.heating ? "heat" : "ok";
    const rooms = this._climateSensors().map((x) => ({ ...x, t: Number(this._st(x.temperature)?.state) })).filter((x) => !isNaN(x.t));
    return `<div class="panel heat-thermo"><h3>${t("heating.thermostat")}</h3>
      <div class="td-row">
        <button class="th-btn" data-act="temp" data-step="-0.5" aria-label="${t("climate.cooler")}" ${!th.on || th.target <= min ? "disabled" : ""}><ha-icon icon="mdi:minus"></ha-icon></button>
        <div class="td-dial ${tone}"><svg viewBox="0 0 200 200" aria-hidden="true">
            <path class="td-track" d="${arc(start, start + sweep)}"/>
            ${th.on ? `<path class="td-val" d="${arc(start, Math.max(start + 1, ang(th.target)))}"/>` : ""}
            ${cx != null ? `<circle class="td-now" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="6"/>` : ""}</svg>
          <div class="td-in"><span class="td-st">${th.on ? (th.heating ? t("climate.heating_word") : t("climate.holding_word")) : t("common.off_n")}</span>
            <b>${num(th.target)}°</b><span>${isNaN(cur) ? "" : t("heating.now_lc", { t: num(cur) })}</span></div></div>
        <button class="th-btn" data-act="temp" data-step="0.5" aria-label="${t("climate.warmer")}" ${!th.on || th.target >= max ? "disabled" : ""}><ha-icon icon="mdi:plus"></ha-icon></button></div>
      ${th.note ? `<div class="td-note">${esc(th.note)}</div>` : ""}
      <div class="th-modes">
        ${th.cl.resume ? `<button class="${th.onSchedule ? "on" : ""}" data-act="thermo-run" data-entity="${esc(th.cl.resume)}"><ha-icon icon="mdi:calendar-clock"></ha-icon>${t("climate.schedule")}</button>` : ""}
        ${th.cl.boost ? `<button class="${th.boost ? "on" : ""}" data-act="thermo-run" data-entity="${esc(th.cl.boost)}"><ha-icon icon="mdi:fire"></ha-icon>${t("climate.boost")}</button>` : ""}
        <button class="${th.on ? "" : "on"}" data-act="thermo-power" data-on="${th.on ? 1 : 0}"><ha-icon icon="mdi:power"></ha-icon>${th.on ? t("common.turn_off") : t("common.off_n")}</button></div>
      <div class="td-rooms">${rooms.map((x) => {
        // Indoor rooms on a 16–26 °C track with the target marked: blue when colder than the target, orange when warmer.
        const pos = (v) => Math.min(100, Math.max(0, ((v - 16) / 10) * 100)).toFixed(1);
        const diff = x.t - th.target, tone = x.outdoor ? "out" : diff < -0.7 ? "cold" : diff > 0.7 ? "warm" : "ok";
        return `<div class="td-room ${tone}" role="button" tabindex="0" data-act="heat" data-entity="${esc(x.temperature)}">
          <ha-icon icon="${esc(x.icon || "mdi:thermometer")}"></ha-icon><span>${esc(x.name)}</span>
          ${x.outdoor ? "<i></i>" : `<i class="td-bar"><i class="td-tgt" style="left:${pos(th.target)}%"></i><i class="td-dot" style="left:${pos(x.t)}%"></i></i>`}
          <b>${num(x.t)}°</b></div>`;
      }).join("")}</div></div>`;
  }

  // `heating.status`: a template sensor that reads "OK" or the boiler's problems joined by " | ", urgent ones with a
  // leading "!" (a template sensor, same thresholds as the boiler push notifications).
  _heatIssues() {
    const st = this._st(this._config.heating?.status)?.state;
    if (!st || ["OK", "unknown", "unavailable", ""].includes(st)) return [];
    return st.split(" | ").filter(Boolean).map((x) => ({ urgent: x.startsWith("!"), text: x.replace(/^!/, "") }));
  }
  // Under the Dom headline, like the battery and IMGW lines; a tap opens the Ogrzewanie tab.
  _heatLine() {
    const list = this._heatIssues();
    if (!list.length) return "";
    return `<div class="attn heat ${list.some((x) => x.urgent) ? "urgent" : ""}"><ha-icon icon="mdi:water-boiler-alert"></ha-icon><span>${t("heating.boiler_line")}</span>${list.map((x) => {
      const [head, ...rest] = x.text.split(" – ");
      return `<button class="attn-item ${x.urgent ? "urgent" : ""}" data-act="tab" data-tab="heating">${rest.length ? `<span>${esc(head)}</span><b>${esc(rest.join(" – "))}</b>` : `<b>${esc(head)}</b>`}</button>`;
    }).join("")}</div>`;
  }

  _heatingTab() {
    const h = this._config.heating;
    const val = (id) => { const st = id && this._st(id); return st && st.state !== "" && !isNaN(st.state) ? Number(st.state) : null; };
    const flowSt = this._st(h.flow), online = flowSt && !["unavailable", "unknown"].includes(flowSt.state);
    const flame = this._on(h.flame), ch = this._on(h.ch_active), dhw = this._on(h.dhw_active), fault = this._on(h.fault);
    const flow = val(h.flow), ret = val(h.return), set = val(h.setpoint), mod = val(h.modulation), press = val(h.pressure);
    const mode = this._st(h.mode)?.state;
    // ILEA reports 0 % at its smallest flame, so 0 with the flame on means "minimum", not "off".
    const power = mod == null ? "" : mod > 0 ? t("heating.power_pct", { n: Math.round(mod) }) : t("heating.power_min");
    const [title, sub, tone] = !online ? [t("heating.offline"), t("heating.esp_silent"), "off"] : fault ? [t("heating.fault"), t("heating.check_display"), "fault"]
      : flame && dhw ? [t("heating.heating_water"), power, "heat"] : flame ? [t("heating.heating_home"), power, "heat"]
      : ch ? [t("heating.burner_resting"), t("heating.pump"), "idle"]
      // Heat is asked for but the water in the boiler is still warmer than needed (often right after hot tap water).
      : this._on(h.request) && flow != null && set != null && flow > set ? [t("heating.waiting"), t("heating.water_warmer", { t: num(flow, 0) }), "idle"]
      : this._on(h.request) ? [t("heating.waiting"), t("heating.igniting"), "idle"]
      // "Krzywa + korekta" is the controller's own mode name (a select option), the normal one: not worth a line.
      : h.request ? [t("heating.heating_off"), mode && mode !== "Krzywa + korekta" ? mode : t("heating.no_demand"), "idle"] : [t("heating.waiting"), "", "idle"];
    // Condensing starts below ~55 °C on the return and works well below ~45 °C.
    const cond = ret == null || !online ? null : ret < 45 ? [t("heating.condensing"), "good"] : ret < 55 ? [t("heating.partial"), ""] : [t("heating.no_condensing"), "warn"];
    const ht = this._heatToday(), dhwT = val(h.dhw);
    const room = val(this._config.climate?.temperature), target = Number(this._st(this._config.climate?.entity)?.attributes.temperature);
    const more = (id) => (id ? ` role="button" tabindex="0" data-act="heat" data-entity="${esc(id)}"` : "");
    const issues = this._heatIssues();
    const hero = `<div class="panel hh ${tone}">
        <div class="hh-head"><span class="ic ${tone === "heat" ? "heat" : tone === "fault" ? "fault" : ""}"><ha-icon icon="${fault ? "mdi:alert-circle-outline" : flame ? "mdi:fire" : online ? "mdi:water-boiler" : "mdi:lan-disconnect"}"></ha-icon></span>
          <div class="hh-title"><b>${esc(title)}</b><span>${esc(sub)}</span></div>
          <div class="hh-set"${more(h.setpoint)}><span>${t("heating.target_water_lc")}</span><b>${set == null ? "–" : num(set, 1) + "°"}</b></div></div>
        ${issues.length ? `<div class="hh-alerts">${issues.map((x) => `<button class="${x.urgent ? "urgent" : ""}"${more(h.status)}><ha-icon icon="${x.urgent ? "mdi:alert-circle" : "mdi:alert-outline"}"></ha-icon>${esc(x.text)}</button>`).join("")}</div>` : ""}
        <div class="hh-loop">${this._heatLoop({ flow, ret, mod, flame, pump: online && (ch || flame), room, target, rad: val(h.radiator), dhw: val(h.dhw), dhwOn: online && dhw })}</div>
        <div class="hh-strip">
          <div${more(h.flow)} style="--c:#FFB067"><b>${flow == null ? "–" : num(flow, 0) + "°"}</b><span>${t("heating.flow_lc")}</span></div>
          <div${more(h.return)} style="--c:#7FD4FF"><b>${ret == null ? "–" : num(ret, 0) + "°"}</b><span>${t("heating.return_lc")}</span></div>
          <div${more(h.dhw)} style="--c:#FF9CC8"><b>${val(h.dhw) == null ? "–" : num(val(h.dhw), 0) + "°"}</b><span>${t("heating.dhw_short")}</span></div>
          <div${more(this._config.climate?.temperature)}><b>${room == null ? "–" : num(room, 1) + "°"}</b><span>${isNaN(target) ? t("heating.indoors") : t("heating.goal", { t: num(target, 1) })}</span></div></div>
        <div class="heat-tags">${cond ? `<span class="heat-tag ${cond[1]}">${cond[0]}</span>` : ""}${ret != null && flow != null && online ? `<span class="heat-tag">${t("heating.delta", { t: num(flow - ret, 0) })}</span>` : ""}${mode && online ? `<span class="heat-tag">${esc(mode)}</span>` : ""}</div></div>`;
    const stat = (icon, k, v, unit, label, id, cls = "") => `<div class="hs ${cls}" style="--k:${k}"${more(id)}><i class="hs-ic"><ha-icon icon="${icon}"></ha-icon></i><div><b>${v}${unit ? `<small>${unit}</small>` : ""}</b><span>${label}</span></div></div>`;
    const gasToday = val(h.gas_today), price = val(h.gas_price);
    const today = `<div class="panel heat-wide"><h3>${t("common.today")}</h3><div class="hs-grid">
        ${h.gas_today ? stat("mdi:meter-gas-outline", "#FFD54A", gasToday != null ? `≈${num(gasToday, 1)}` : "–", "m³", gasToday != null && price != null ? t("heating.gas_cost", { v: money(gasToday * price, 0) }) : t("heating.gas_estimate"), h.gas_today) : ""}
        ${stat("mdi:fire", "#FF9F0A", ht ? num(ht.hours, 1) : "–", "h", ht?.starts != null ? t("heating.burner_starts", { n: ht.starts }) : t("heating.burner_time"), h.flame)}
        ${stat("mdi:gauge", "#5AC8FA", press != null ? num(press, 1) : "–", "bar", press != null && press < 1 ? t("heating.pressure_low") : t("heating.pressure_lc"), h.pressure, press != null && press < 1 ? "warn" : "")}
        ${stat("mdi:water-thermometer-outline", "#FF7AB6", dhwT != null ? `${num(dhwT, 0)}°` : "–", "", t("heating.hot_water_lc"), h.dhw)}</div></div>`;
    const chart = `<div class="panel heat-chart"><h3>${this._heatHist && (Date.now() - Math.min(...[this._heatHist.flow, this._heatHist.ret].map((a) => a[0]?.[0] ?? Date.now()))) < 23 * 3600e3 ? t("heating.since_morning") : t("heating.last_24h")}</h3>${this._heatChart()}</div>`;
    const slope = val(h.slope), offset = val(h.offset), corr = val(h.correction), out = val(h.outdoor);
    const curve = h.curve && slope != null && !isNaN(target) ? `<div class="panel heat-curve"><h3>${t("heating.curve")}</h3>
        ${this._heatCurve({ slope, offset: offset ?? 0, target, out, tmin: val(h.min), tmax: val(h.max) })}
        <div class="cv-chips"><span${more(h.slope)}>${t("heating.slope_lc")} <b>${num(slope, 1)}</b></span><span${more(h.offset)}>${t("heating.offset_lc")} <b>${offset > 0 ? "+" : ""}${num(offset ?? 0, 1)}°</b></span>
          ${corr != null ? `<span${more(h.correction)}>${t("heating.from_room")} <b>${corr > 0 ? "+" : ""}${num(corr, 1)}°</b></span>` : ""}</div></div>` : "";
    const thermo = this._heatThermo();
    return `<div class="section-title">${t("tabs.heating")}</div><div class="panels heat-panels">${hero}${thermo}${chart}${curve}${today}</div>`;
  }

  _appMonth(ap) {
    const kwh = this._monthly?.[ap.energy_meter];
    const price = Number(this._st(this._config.energy_price)?.state);
    return { kwh: kwh ?? null, cost: kwh != null && !isNaN(price) ? kwh * price : null };
  }

  _appState(ap) {
    const st = this._st(ap.state)?.state || "unknown";
    return { st, active: APP_ACTIVE.includes(st), done: APP_DONE.includes(st), label: table("appliances.state")[st] || st };
  }

  _appNum(id) {
    const st = this._st(id);
    return st && st.state !== "" && !isNaN(st.state) ? Number(st.state) : null;
  }

  _ring(pct, size) {
    const p = Math.max(0, Math.min(100, pct || 0));
    return `<svg class="ring-svg" viewBox="0 0 52 52" width="${size}" height="${size}" aria-hidden="true">
      <circle cx="26" cy="26" r="22" class="ring-bg"></circle>
      <circle cx="26" cy="26" r="22" class="ring-fg" stroke-dasharray="${RING_C.toFixed(1)}" stroke-dashoffset="${(RING_C * (1 - p / 100)).toFixed(1)}"></circle></svg>`;
  }

  _applianceTile(ap, i) {
    const { active, done, label } = this._appState(ap);
    const pct = this._appNum(ap.progress), left = this._appNum(ap.remaining), prog = this._st(ap.program)?.state;
    const program = table("appliances.program")[prog] || prog;
    const sub = active ? [label, left != null ? `${Math.round(left)} min` : ""].filter(Boolean).join(" · ")
      : done ? label : label;
    const chip = (icon, text, keep) => `<div class="devchip ${keep ? "keep" : ""}"><ha-icon icon="${icon}"></ha-icon><span>${text}</span></div>`;
    const power = this._appNum(ap.power), cycles = this._appNum(ap.cycles), today = this._appNum(ap.energy_today), month = this._appMonth(ap);
    const chips = active
      // The tile is narrow: "Mycie codzienne" reads as "Codzienne" next to the power chip; the sheet keeps the full name.
      ? (program && !["off", "none", "unknown"].includes(prog) ? chip("mdi:file-document-outline",
        esc(program.replace(/^(mycie|pranie|program)\s+(\S)/i, (_, __, c) => c.toUpperCase()))) : "")
        + (power != null ? chip("mdi:flash-outline", `${Math.round(power)} W`, true) : "")
      : (cycles != null ? chip("mdi:counter", t("appliances.cycles", { n: cycles })) : "")
        + (month.cost != null ? chip("mdi:cash", money(month.cost)) : today != null ? chip("mdi:lightning-bolt-outline", `${num(today, 1)} kWh`) : "");
    const badge = active ? `<div class="pw ring">${this._ring(pct, 48)}<span>${pct != null ? Math.round(pct) : 0}%</span></div>`
      : done ? `<div class="pw pstate"><ha-icon icon="mdi:check-bold"></ha-icon></div>` : "";
    return `<div class="tile ${active ? "on" : ""}" role="button" tabindex="0" data-act="appliance" data-app="${i}">
      <div class="head"><div class="ic ${done ? "lime" : ""}"><ha-icon icon="${esc(ap.icon || "mdi:washing-machine")}"></ha-icon></div>${badge}</div>
      <div class="name">${esc(ap.name)}${ap.room ? `<span class="proom">${esc(ap.room)}</span>` : ""}</div>
      <div class="sub one-line">${esc(sub)}</div>
      <div class="foot pfoot">${chips}</div></div>`;
  }

  // Boiler details in Alvuna's own sheet (not HA's more-info): 24 h of the value, what it means, and steppers for
  // the settings the house may change (hot water, curve). "Szczegóły" still opens HA's dialog.
  async _loadHeatSheet(id) {
    const now = Date.now();
    if (this._heatSheetHist?.id === id && now - this._heatSheetHist.at < 120e3) return;
    try {
      const r = await this._hass.callWS({ type: "history/history_during_period", start_time: new Date(now - 24 * 3600e3).toISOString(),
        entity_ids: [id], minimal_response: true, no_attributes: true, significant_changes_only: false });
      this._heatSheetHist = { id, at: now, pts: (r[id] || []).map((x) => [(x.lu ?? x.lc) * 1000, x.s]) };
    } catch (e) { this._heatSheetHist = { id, at: now, pts: [] }; }
    if (this._heatOpen === id) this._render();
  }

  // Until the history arrives the sheet shows an empty chart and "–" tiles of exactly the same size, so the sheet does
  // not grow (and its opening animation does not jump) when the chart comes in.
  _heatSheetChart(pts, color, digits, unit, loading) {
    const end = Date.now(), first = pts.find(([, s]) => !isNaN(s) && s !== "" && s != null)?.[0];
    if (first == null) return `<div class="hsh-chart"><div class="hsh-ph">${loading ? "" : t("heating.no_data_24h")}</div><div class="hsh-x"></div></div>
      <div class="wx-stats three">${[["mdi:arrow-down", t("heating.min")], ["mdi:approximately-equal", t("heating.avg")], ["mdi:arrow-up", t("heating.max")]].map(([i, k]) => `<div class="wx-stat"><span>${k}</span><b><ha-icon icon="${i}"></ha-icon>–</b></div>`).join("")}</div>`;
    const start = Math.max(end - 24 * 3600e3, first), span = Math.max(end - start, 3600e3);
    const p = this._heatSample(pts, start, end, Math.max(60e3, span / 200));
    if (!p.length) return "";
    const vals = p.map(([, v]) => v), mn = Math.min(...vals), mx = Math.max(...vals);
    const pad = Math.max((mx - mn) * 0.15, unit === "bar" ? 0.05 : 0.5), lo = mn - pad, hi = mx + pad;
    const W = 600, H = 150, x = (t) => ((t - start) / span) * W, y = (v) => H - ((v - lo) / (hi - lo)) * H;
    const line = p.map(([t, v], i) => `${i ? "L" : "M"}${x(t).toFixed(1)} ${y(v).toFixed(1)}`).join("");
    const ticks = [], t0 = new Date(start); t0.setMinutes(0, 0, 0);
    const hs = span > 12 * 3600e3 ? 6 : span > 4 * 3600e3 ? 2 : 1;
    for (let t = t0.getTime() + 3600e3; t < end - 900e3; t += 3600e3) if (new Date(t).getHours() % hs === 0) ticks.push(t);
    const avg = vals.reduce((a, v) => a + v, 0) / vals.length, f = (v) => `${num(v, digits)}${unit === "°" ? "°" : ` ${unit}`}`;
    return `<div class="hsh-chart" style="--c:${color}"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
        <defs><linearGradient id="hsh-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".28"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
        <path d="${line}L${x(p[p.length - 1][0]).toFixed(1)} ${H}L${x(p[0][0]).toFixed(1)} ${H}Z" fill="url(#hsh-fill)"/>
        <path d="${line}" fill="none" stroke="${color}" stroke-width="2.5" vector-effect="non-scaling-stroke" stroke-linejoin="round"/></svg>
      <div class="hsh-x">${ticks.map((t) => `<span style="left:${(x(t) / W * 100).toFixed(1)}%">${new Date(t).getHours()}:00</span>`).join("")}</div></div>
      <div class="wx-stats three">${[["mdi:arrow-down", t("heating.min"), f(mn)], ["mdi:approximately-equal", t("heating.avg"), f(avg)], ["mdi:arrow-up", t("heating.max"), f(mx)]]
        .map(([i, k, v]) => `<div class="wx-stat"><span>${k}</span><b><ha-icon icon="${i}"></ha-icon>${esc(v)}</b></div>`).join("")}</div>`;
  }

  _heatSheet(id) {
    const h = this._config.heating, st = this._st(id), a = st?.attributes || {};
    const key = Object.entries(h).find(([, v]) => v === id)?.[0];
    const val = (e) => { const x = this._st(e); return x && x.state !== "" && !isNaN(x.state) ? Number(x.state) : null; };
    const deg = (v, d = 0) => (v == null ? "–" : `${num(v, d)}°`);
    const ht = this._heatToday(), v = val(id);
    // [title, icon, colour, decimals, unit, what it means]; the words are heating.info.<key> in the i18n tables.
    const I = table("heating.info"), word = (k, ...rest) => [I[k]?.title, ...rest, I[k]?.hint];
    const INFO = {
      flow: word("flow", "mdi:thermometer-chevron-up", "#FF9F5A", 0, "°"),
      return: word("return", "mdi:thermometer-chevron-down", "#5AC8FA", 0, "°"),
      setpoint: word("setpoint", "mdi:target", "#FFD54A", 1, "°"),
      curve: word("curve", "mdi:chart-bell-curve-cumulative", "#FFD54A", 1, "°"),
      correction: word("correction", "mdi:home-thermometer", "#B8F03C", 1, "°"),
      dhw: word("dhw", "mdi:water-thermometer-outline", "#FF7AB6", 0, "°"),
      pressure: word("pressure", "mdi:gauge", "#5AC8FA", 2, "bar"),
      outdoor: word("outdoor", "mdi:home-thermometer-outline", "#A9BCC8", 1, "°"),
      radiator: word("radiator", "mdi:radiator", "#FF9F5A", 1, "°"),
      modulation: word("modulation", "mdi:fire", "#FF9F0A", 0, "%"),
      gas_today: word("gas_today", "mdi:meter-gas-outline", "#FFD54A", 2, "m³"),
    };
    let info = INFO[key], extra = "", chart = "";
    const stepper = (e, step, digits, unit) => {
      const x = this._st(e), cur = x ? Number(x.state) : null;
      return x ? `<div class="hsh-step"><button class="th-btn" data-act="heat-step" data-entity="${esc(e)}" data-step="${-step}" aria-label="${t("common.less")}"><ha-icon icon="mdi:minus"></ha-icon></button>
        <b>${cur == null || isNaN(cur) ? "–" : num(cur, digits) + unit}</b>
        <button class="th-btn" data-act="heat-step" data-entity="${esc(e)}" data-step="${step}" aria-label="${t("common.more")}"><ha-icon icon="mdi:plus"></ha-icon></button></div>` : "";
    };
    const stats = (list) => `<div class="wx-stats ${list.length === 3 ? "three" : "two"}">${list.map(([i, k, x]) => `<div class="wx-stat"><span>${k}</span><b><ha-icon icon="${i}"></ha-icon>${esc(x)}</b></div>`).join("")}</div>`;
    if (key === "flame" || key === "starts") {
      info = word("flame", "mdi:fire", "#FF9F0A", 0, "");
      extra = stats([["mdi:clock-outline", t("heating.run_today"), ht ? `${num(ht.hours, 1)} h` : "–"], ["mdi:restart", t("heating.starts_today"), ht?.starts != null ? String(ht.starts) : "–"],
        ["mdi:fire", t("common.now"), this._on(h.flame) ? t("heating.burning_pct", { n: num(val(h.modulation) ?? 0, 0) }) : t("heating.not_burning")]]);
    } else if (key === "status") {
      info = word("status", "mdi:water-boiler-alert", "#FF9F0A", 0, "");
      const list = this._heatIssues();
      extra = `<div class="hsh-issues">${list.length ? list.map((x) => `<div class="${x.urgent ? "urgent" : ""}"><ha-icon icon="${x.urgent ? "mdi:alert-circle" : "mdi:alert-outline"}"></ha-icon>${esc(x.text)}</div>`).join("")
        : `<div class="ok"><ha-icon icon="mdi:check-circle-outline"></ha-icon>${t("common.all_ok")}</div>`}</div>`;
    } else if (key === "gas_today") {
      const price = val(h.gas_price), flow = val(h.gas_flow);
      extra = stats([["mdi:cash", t("heating.cost_today"), v != null && price != null ? t("heating.about", { v: money(v * price) }) : "–"], ["mdi:fire", t("heating.draw_now"), flow != null ? `${num(flow, 2)} m³/h` : "–"]]);
    } else if (key === "dhw" && h.dhw_set) {
      extra = `<div class="hsh-set"><span>${t("heating.set_temp")}</span>${stepper(h.dhw_set, 1, 0, "°")}</div>`;
    } else if (key === "slope" || key === "offset") {
      info = key === "slope"
        ? word("slope", "mdi:slope-uphill", "#FFD54A", 2, "")
        : word("offset", "mdi:arrow-up-down", "#FFD54A", 1, "°");
      extra = `<div class="hsh-set"><span>${t("heating.setting")}</span>${stepper(id, key === "slope" ? 0.05 : 0.5, key === "slope" ? 2 : 1, key === "slope" ? "" : "°")}</div>`;
    } else if (key === "setpoint") {
      extra = stats([["mdi:chart-bell-curve-cumulative", t("heating.from_curve"), deg(val(h.curve), 1)], ["mdi:home-thermometer", t("heating.correction"), val(h.correction) == null ? "–" : `${val(h.correction) > 0 ? "+" : ""}${num(val(h.correction), 1)}°`],
        ["mdi:state-machine", t("common.mode"), this._st(h.mode)?.state || "–"]]);
    }
    const room = this._climateSensors().find((x) => x.temperature === id);
    if (!info && room) info = [room.name, room.icon || "mdi:thermometer", "#B8F03C", 1, "°", ""];
    if (!info) info = [a.friendly_name || id, a.device_class === "temperature" ? "mdi:thermometer" : "mdi:information-outline", "#B8F03C", 1, a.unit_of_measurement === "°C" ? "°" : a.unit_of_measurement || "", ""];
    const [title, icon, color, digits, unit, hint] = info;
    if (!chart && st && !["flame", "starts", "status", "slope", "offset", "gas_today"].includes(key)) {
      const mine = this._heatSheetHist?.id === id;
      chart = this._heatSheetChart(mine ? this._heatSheetHist.pts : [], color, digits, unit, !mine);
    }
    const big = key === "flame" || key === "starts" ? (this._on(h.flame) ? t("heating.burning") : t("heating.not_burning_big")) : ["status", "slope", "offset"].includes(key) ? "" : v == null ? (st?.state || "–") : `${num(v, digits)}${unit === "°" ? "°" : unit ? `<small>${unit}</small>` : ""}`;
    return `<div class="sheet-wrap" data-act="close-sheet"><div class="sheet heat-sheet" role="dialog" aria-label="${esc(title)}" style="--c:${color}">
      <div class="hd"><span class="ic" style="background:color-mix(in srgb, ${color} 22%, transparent);color:${color}"><ha-icon icon="${icon}"></ha-icon></span>
        <div style="flex:1;min-width:0"><h2>${esc(title)}</h2><div class="s" style="color:var(--muted);font-size:13px">${room ? (room.outdoor ? t("heating.sensor_outdoor") : t("heating.room")) : t("heating.boiler")}${st?.last_changed ? ` · ${changed(st.last_changed)}` : ""}</div></div>
        <button class="round" data-act="close-sheet" aria-label="${t("common.close")}"><ha-icon icon="mdi:close"></ha-icon></button></div>
      ${big ? `<div class="hsh-big">${big}</div>` : ""}${hint ? `<p class="hsh-hint">${esc(hint)}</p>` : ""}${extra}${chart}
      <button class="wide-btn" data-act="more" data-entity="${esc(id)}"><ha-icon icon="mdi:chart-line"></ha-icon>${t("heating.details")}</button></div></div>`;
  }

  _applianceSheet(ap) {
    if (!ap) return "";
    const { active, done, label } = this._appState(ap);
    const pct = this._appNum(ap.progress), left = this._appNum(ap.remaining), total = this._appNum(ap.duration);
    const phase = this._st(ap.phase)?.state, prog = this._st(ap.program)?.state, program = table("appliances.program")[prog] || prog;
    const shown = (v) => v && !["off", "none", "unknown", "unavailable"].includes(v);
    const stat = (icon, k, v) => `<div class="wx-stat"><span>${k}</span><b><ha-icon icon="${icon}"></ha-icon>${esc(v)}</b></div>`;
    const kwh = (id) => { const n = this._appNum(id); return n != null ? `${num(n, 2)} kWh` : "–"; };
    const power = this._appNum(ap.power), cycles = this._appNum(ap.cycles), month = this._appMonth(ap);
    const btn = (id, icon, text) => { const st = this._st(id); return st && st.state !== "unavailable"
      ? `<button class="act" data-act="press" data-entity="${esc(id)}"><ha-icon icon="${icon}"></ha-icon>${text}</button>` : ""; };
    const buttons = [btn(ap.pause, "mdi:pause", t("common.pause")), btn(ap.resume, "mdi:play", t("common.resume")), btn(ap.unloaded, "mdi:check", t("appliances.unloaded"))].join("");
    const tasks = this._st(ap.maintenance)?.attributes.due_tasks || [];
    const maint = tasks.map((task) => `<div class="pproblem"><div class="ic" style="background:#FF9F0A"><ha-icon icon="mdi:wrench-outline"></ha-icon></div>
      <div><div class="t">${esc(task.name)}</div><div class="s">${task.cycles_interval ? t("appliances.maint", { n: task.cycles_since, every: task.cycles_interval }) : ""}</div></div></div>`).join("");
    return `<div class="sheet-wrap" data-act="close-sheet"><div class="sheet" role="dialog" aria-label="${esc(ap.name)}">
      <div class="hd"><span class="ic lime"><ha-icon icon="${esc(ap.icon || "mdi:washing-machine")}"></ha-icon></span>
        <div style="flex:1"><h2>${esc(ap.name)}</h2><div class="s" style="color:var(--muted);font-size:13px">${esc([label, ap.room].filter(Boolean).join(" · "))}</div></div>
        <button class="round" data-act="close-sheet" aria-label="${t("common.close")}"><ha-icon icon="mdi:close"></ha-icon></button></div>
      <div class="app-hero ${active ? "on" : done ? "done" : ""}">
        <div class="app-ring">${this._ring(active ? pct : done ? 100 : 0, 132)}
          <div class="app-ring-txt"><b>${active ? `${pct != null ? Math.round(pct) : 0}%` : done ? `<ha-icon icon="mdi:check-bold"></ha-icon>` : `<ha-icon icon="${esc(ap.icon || "mdi:washing-machine")}"></ha-icon>`}</b>
            <span>${active && left != null ? t("appliances.left", { n: Math.round(left) }) : esc(label)}</span></div></div></div>
      <div class="wx-stats">${stat("mdi:file-document-outline", t("appliances.program_label"), shown(program) ? program : "–")}
        ${stat("mdi:water-sync", t("appliances.phase"), shown(phase) ? phase : "–")}
        ${stat("mdi:timer-outline", t("appliances.duration"), total != null ? `${Math.round(total)} min` : "–")}
        ${stat("mdi:flash-outline", t("common.power_draw"), power != null ? `${Math.round(power)} W` : "–")}
        ${stat("mdi:lightning-bolt-outline", t("appliances.energy_today"), kwh(ap.energy_today))}
        ${stat("mdi:calendar-month", t("common.this_month"), month.kwh != null ? `${num(month.kwh, 2)} kWh` : "–")}
        ${stat("mdi:cash", t("common.month_cost"), month.cost != null ? money(month.cost) : "–")}
        ${stat("mdi:counter", t("appliances.cycles_label"), cycles != null ? String(cycles) : "–")}</div>
      ${buttons ? `<div class="actions app-actions">${buttons}</div>` : ""}
      ${maint ? `<div class="label vac-label">${t("common.maintenance")}</div><div class="pproblems">${maint}</div>` : ""}</div></div>`;
  }

  _vacuumTile() {
    const v = this._config.vacuum, st = this._st(v?.entity);
    if (!st) return "";
    const active = ["cleaning", "returning"].includes(st.state), cleaning = st.state === "cleaning";
    const room = this._st(v.room)?.state, bat = this._vacBattery();
    const sub = [this._vacState(st), active && room && !["unknown", "unavailable"].includes(room) ? room : ""].filter(Boolean).join(" · ");
    const chips = [bat != null ? `<div class="devchip"><ha-icon icon="${battIcon(bat, st.attributes.charging)}"></ha-icon>${Math.round(bat)}%</div>` : "",
      active ? this._vacValue(v.time, "mdi:timer-outline") : ""].join("");
    return `<div class="tile ${active ? "on" : ""}" role="button" tabindex="0" data-act="vacuum">
      <div class="head"><div class="ic"><ha-icon icon="mdi:robot-vacuum"></ha-icon></div>
        <button class="pw" data-act="vac" data-cmd="${cleaning ? "pause" : "start"}" aria-label="${cleaning ? t("common.pause") : t("cleaning.start")}">
          <ha-icon icon="${cleaning ? "mdi:pause" : "mdi:play"}"></ha-icon></button></div>
      <div class="name">${esc(v.name || t("cleaning.vacuum"))}</div><div class="sub one-line">${esc(sub)}</div>
      <div class="foot pfoot">${chips}</div></div>`;
  }

  _vacState(st) {
    return table("cleaning.vacuum_state")[st.state] || (this._hass.formatEntityState ? this._hass.formatEntityState(st) : st.state);
  }

  _vacBattery() {
    const v = this._config.vacuum, st = this._st(v.entity);
    const raw = v.battery ? this._st(v.battery)?.state : st?.attributes.battery_level ?? st?.attributes.battery;
    return raw != null && !isNaN(raw) ? Number(raw) : null;
  }

  _vacValue(id, icon) {
    const st = this._st(id);
    if (!st || isNaN(st.state)) return "";
    return `<div class="devchip"><ha-icon icon="${icon}"></ha-icon>${Math.round(st.state)} ${esc(st.attributes.unit_of_measurement || "")}</div>`;
  }

  _vacuumSheet() {
    const v = this._config.vacuum, st = this._st(v.entity);
    if (!st) return "";
    const a = st.attributes, cleaning = st.state === "cleaning", active = cleaning || st.state === "returning";
    const room = this._st(v.room)?.state, bat = this._vacBattery();
    const val = (id, digits = 0) => { const s = this._st(id); return s && !isNaN(s.state) ? `${num(s.state, digits)} ${s.attributes.unit_of_measurement || ""}` : "–"; };
    const stat = (icon, label, value) => `<div class="wx-stat"><span>${label}</span><b><ha-icon icon="${icon}"></ha-icon>${esc(value)}</b></div>`;
    const map = this._st(v.map)?.attributes.entity_picture;
    const ctrl = (cmd, icon, label, main) => `<button class="${main ? "main" : ""}" data-act="vac" data-cmd="${cmd}">
      <span class="c"><ha-icon icon="${icon}"></ha-icon></span>${label}</button>`;
    const rooms = (a.rooms && (a.rooms[a.selected_map] || Object.values(a.rooms)[0])) || [];
    const roomBtns = rooms.map((r) => `<button class="scene ${active && a.current_segment === r.id ? "cur" : ""}" data-act="vac-room" data-seg="${r.id}">
      <ha-icon icon="${esc(r.icon || "mdi:floor-plan")}"></ha-icon>${esc(r.name)}</button>`).join("");
    const suction = this._st(v.suction), options = suction?.attributes.options || [];
    const seg = suction && !["unknown", "unavailable"].includes(suction.state) && options.length
      ? `<div class="label vac-label">${t("cleaning.suction_label")}</div><div class="seg">${options.map((o) => `<button class="${o === suction.state ? "sel" : ""}"
          data-act="vac-suction" data-option="${esc(o)}">${esc(table("cleaning.suction")[o] || o)}</button>`).join("")}</div>` : "";
    const wear = VAC_WEAR.filter((k) => a[k] != null).map((k) => {
      const label = table("cleaning.wear")[k];
      const p = Math.max(0, Math.min(100, Number(a[k])));
      return `<div class="wear ${p < 20 ? "low" : ""}"><span>${label}</span><b>${p}%</b><div class="bar"><i style="transform:scaleX(${p / 100})"></i></div></div>`;
    }).join("");
    return `<div class="sheet-wrap" data-act="close-sheet"><div class="sheet" role="dialog" aria-label="${esc(v.name || t("cleaning.vacuum"))}">
      <div class="hd"><span class="ic lime"><ha-icon icon="mdi:robot-vacuum"></ha-icon></span>
        <div style="flex:1"><h2>${esc(v.name || t("cleaning.vacuum"))}</h2><div class="s" style="color:var(--muted);font-size:13px">${esc(
          [this._vacState(st), active && room && !["unknown", "unavailable"].includes(room) ? room : ""].filter(Boolean).join(" · "))}</div></div>
        <button class="round" data-act="close-sheet" aria-label="${t("common.close")}"><ha-icon icon="mdi:close"></ha-icon></button></div>
      ${map ? `<div class="vac-map"><img src="${esc(this._hass.hassUrl ? this._hass.hassUrl(map) : map)}" alt="${t("cleaning.map")}"></div>` : ""}
      <div class="wx-stats">${stat(bat != null ? battIcon(bat, a.charging) : "mdi:battery-unknown", t("common.battery"), bat != null ? `${Math.round(bat)}%` : "–")}
        ${stat("mdi:texture-box", t("cleaning.area"), val(v.area))}${stat("mdi:timer-outline", t("cleaning.time"), val(v.time))}
        ${stat("mdi:broom", t("common.mode"), table("cleaning.vacuum_mode")[a.cleaning_mode] || a.cleaning_mode || "–")}</div>
      <div class="vac-ctrls">${ctrl(cleaning ? "pause" : "start", cleaning ? "mdi:pause" : "mdi:play", cleaning ? t("cleaning.pause") : st.state === "paused" ? t("common.resume") : t("cleaning.start_btn"), true)}
        ${ctrl("stop", "mdi:stop", t("cleaning.stop"))}${ctrl("home", "mdi:home-import-outline", t("cleaning.dock"))}${ctrl("locate", "mdi:map-marker-radius-outline", t("cleaning.locate"))}</div>
      ${seg}
      ${roomBtns ? `<div class="label vac-label">${t("cleaning.room")}</div><div class="vac-rooms">${roomBtns}</div>` : ""}
      ${wear ? `<div class="label vac-label">${t("common.maintenance")}</div><div class="wears">${wear}</div>` : ""}</div></div>`;
  }

  // The home media tile: every source that plays or shows an input (the TV on the decoder) gets a slide. With two or
  // more the tile swipes sideways between them, with dots underneath; with one it is a plain tile; with none it shows
  // the first player's "Nic nie gra".
  _mediaTile() {
    const all = (this._config.media || []).map((x, i) => ({ x, i, m: this._mediaInfo(x) })).filter((e) => e.m);
    if (!all.length) return "";
    const live = all.filter((e) => e.m.active || e.m.input), slides = live.length ? live : [all[0]];
    const room = (e) => (typeof e.x === "object" && (e.x.room || e.x.name)) || (e.i === 0 ? this._config.media_room || t("media.living_room") : e.m.a.friendly_name);
    // An open app with nothing playing (or the TV's home screen) still shows its logo.
    const glow = (e) => (e.m.active || (e.m.input && e.m.brand) ? this._glow(e.m, "tile-art") : "");
    // Bento: while something plays the tile takes two cells and shows the artwork next to the title and controls.
    const wide = slides.some((e) => e.m.active) ? "wide" : "";
    if (slides.length === 1) {
      const e = slides[0], g = glow(e);
      return `<div class="tile media-tile ${wide} ${g ? "has-art" : ""}" role="button" tabindex="0" data-act="tab" data-tab="media">${g}${this._mediaSlide(e.m, room(e), wide)}</div>`;
    }
    const at = Math.min(this._mtIndex || 0, slides.length - 1);
    return `<div class="tile media-tile multi ${wide}" role="button" tabindex="0" data-act="tab" data-tab="media">
      <div class="mt-track">${slides.map((e) => { const g = glow(e);
        return `<div class="mt-slide ${g ? "has-art" : ""}">${g}${this._mediaSlide(e.m, room(e), wide)}</div>`; }).join("")}</div>
      <div class="mt-dots">${slides.map((_, j) => `<i class="${j === at ? "on" : ""}"></i>`).join("")}</div></div>`;
  }

  _mediaSlide(m, room, wide) {
    const icon = (name) => `<ha-icon icon="${name}" style="--mdc-icon-size:14px"></ha-icon>`;
    if (!m.active) {
      return `<div class="kicker">${icon(m.input ? "mdi:television" : "mdi:music-note")}<span class="kt">${esc(room)}</span></div>
        <div class="title">${m.input ? esc(m.input) : m.st.state === "unavailable" ? t("common.unavailable_m") : t("media.nothing")}</div>
        <div class="sub">${esc(m.a.friendly_name)}</div>`;
    }
    // YouTube titles carry the channel's series after " | " and emoji: the tile shows only the title itself.
    const title = m.title.split(" | ")[0].replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, "").replace(/\s{2,}/g, " ").trim() || m.title;
    // What plays, not a fixed note: a TV channel, music, or a video on the TV.
    const type = String(m.a.media_content_type || "");
    const kind = m.channel ? "mdi:television-classic" : /music|track|album|playlist|podcast|radio/.test(type) ? "mdi:music-note"
      : m.a.device_class === "tv" || /video|movie|tvshow|episode/.test(type) ? "mdi:television-play" : "mdi:play-circle-outline";
    const kick = `<div class="kicker">${icon(kind)}<span class="kt">${esc((wide ? [m.channel || m.app || room] : [m.app, room]).filter(Boolean).join(" · "))}</span></div>
      <div class="title">${esc(title)}</div>`;
    const sub = m.artist ? `<div class="sub">${esc(m.artist)}</div>` : "";
    const bar = m.slot || m.a.media_duration ? `<div class="bar"><i ${this._progressAttrs(m)}></i></div>` : "";
    const ctrls = `<div class="ctrls">
        <button data-act="media" data-cmd="media_previous_track" data-entity="${esc(m.id)}" aria-label="${t("media.previous")}"><ha-icon icon="mdi:skip-previous"></ha-icon></button>
        <button class="play" data-act="media" data-cmd="media_play_pause" data-entity="${esc(m.id)}" aria-label="${t("media.play_pause")}"><ha-icon icon="${m.playing ? "mdi:pause" : "mdi:play"}"></ha-icon></button>
        <button data-act="media" data-cmd="media_next_track" data-entity="${esc(m.id)}" aria-label="${t("media.next")}"><ha-icon icon="mdi:skip-next"></ha-icon></button>
      </div>`;
    if (!wide) return kick + sub + bar + ctrls;
    // Wide: title, progress and the buttons; the channel or artist is left to the Media tab.
    const pos = m.a.media_duration ? this._position({ pos: m.a.media_position || 0, at: m.a.media_position_updated_at || "",
      dur: m.a.media_duration, playing: m.playing ? "1" : "0" }) : 0;
    const times = m.slot ? `<div class="times"><span>${m.slot.label[0]}</span><span>${m.slot.label[1]}</span></div>`
      : m.a.media_duration ? `<div class="times"><span data-elapsed>${fmtTime(pos)}</span><span>${fmtTime(m.a.media_duration)}</span></div>` : "";
    const body = `${kick}<div class="mt-foot">${bar}${times}${ctrls}</div>`;
    const pic = m.pic ? esc(m.pic) : "";
    const art = m.channelLogo ? `<div class="mt-art fit chan" style="background-image:url('${esc(m.channelLogo)}')"></div>`
      : m.brand ? this._brandArt(m, "mt-art")
      : pic && m.logo ? `<div class="mt-art logo"><i class="np-logo" style="background-image:url('${pic}')"></i></div>`
      : `<div class="mt-art fit" style="${pic ? `background-image:${this._fitArt(pic)}` : ""}">${pic ? "" : `<ha-icon icon="${this._appIcon(m)}"></ha-icon>`}</div>`;
    return `<div class="mt-wide">${art}<div class="mt-body">${body}</div></div>`;
  }

  // The whole picture fits the square. YouTube's hqdefault is 4:3 with black bars baked in: use its 16:9 hq720, with
  // mqdefault (always there, also 16:9) underneath for videos that have no HD thumbnail.
  _fitArt(pic) {
    const yt = /^(https:\/\/i\d?\.ytimg\.com\/vi(?:_webp)?\/[^/]+\/)(?:hq|mq|sd|maxres)?default\.(?:jpg|webp)/.exec(pic);
    return yt ? `url('${yt[1]}hq720.jpg'), url('${yt[1]}mqdefault.jpg')` : `url('${pic}')`;
  }

  // Blinds: up, stop and down, plus a position slider when the motor reports one (0 = closed, 100 = fully up).
  _coverRow(x) {
    const id = typeof x === "string" ? x : x.entity, st = this._st(id), a = st?.attributes || {};
    const pos = a.current_position, moving = ["opening", "closing"].includes(st?.state);
    const open = moving || (pos != null ? pos > 0 : st?.state === "open");
    const sub = !st || st.state === "unavailable" ? t("common.unavailable_f") : st.state === "opening" ? t("covers.opening") : st.state === "closing" ? t("covers.closing")
      : pos != null ? (pos === 0 ? t("covers.closed") : pos === 100 ? t("covers.open") : t("covers.open_pct", { n: pos })) : st.state === "closed" ? t("covers.closed") : t("covers.open");
    const btn = (cmd, icon, label) => `<button class="icon-btn" data-act="cover" data-cmd="${cmd}" data-entity="${esc(id)}" aria-label="${label}"><ha-icon icon="${icon}"></ha-icon></button>`;
    return `<div class="row cover-row">
      <div class="ic ${open ? "lime" : ""}"><ha-icon icon="${open ? "mdi:blinds-horizontal" : "mdi:blinds-horizontal-closed"}"></ha-icon></div>
      <div><div class="t">${esc(this._name(x))}</div><div class="s">${sub}</div></div>
      <div class="cov-btns">${btn("open_cover", "mdi:arrow-up", t("covers.up"))}${btn("stop_cover", "mdi:stop", t("covers.stop"))}${btn("close_cover", "mdi:arrow-down", t("covers.down"))}</div>
      ${pos != null ? `<div class="fold open"><div><div class="ctl"><ha-icon icon="mdi:arrow-expand-vertical"></ha-icon>
        <input type="range" class="slider" min="0" max="100" value="${pos}" style="--v:${pos}%" data-unit="%" data-act="cover-pos"
          data-entity="${esc(id)}" aria-label="${t("covers.position")}"><span class="vol-num" data-vol>${pos}%</span></div></div></div>` : ""}</div>`;
  }

  // Dehumidifier / humidifier (humidifier.*): what it does now, room humidity against the target, − / + on the target
  // in the device's own step, and power. Room option `humidifiers: [entity | { entity, name }]`.
  _humidifierRow(x) {
    const id = typeof x === "string" ? x : x.entity, st = this._st(id), a = st?.attributes || {};
    const on = st?.state === "on", off = !st || st.state === "unavailable";
    const dry = a.device_class === "dehumidifier";
    const MODES = table("climate.humidifier_modes");
    const cur = a.current_humidity, target = a.humidity;
    const sub = off ? t("common.unavailable_m") : !on ? t("common.off_m")
      : [cur != null && target != null && (dry ? cur > target : cur < target) ? (dry ? t("climate.drying") : t("climate.humidifying")) : t("climate.holding_humidity"),
        cur != null ? `${Math.round(cur)}%` + (target != null ? ` → ${target}%` : "") : target != null ? t("climate.target", { v: `${target}%` }) : "",
        a.mode ? MODES[a.mode] || a.mode : ""].filter(Boolean).join(" · ");
    const btn = (cmd, icon, label, extra = "") => `<button class="icon-btn" data-act="humid" data-cmd="${cmd}" data-entity="${esc(id)}"
      aria-label="${label}" ${extra}><ha-icon icon="${icon}"></ha-icon></button>`;
    return `<div class="row cover-row">
      <div class="ic ${on ? "lime" : ""}"><ha-icon icon="mdi:air-humidifier"></ha-icon></div>
      <div><div class="t">${esc(this._name(x))}</div><div class="s">${esc(sub)}</div></div>
      <div class="cov-btns">${on && target != null ? btn("down", "mdi:minus", t("climate.humidity_lower")) + btn("up", "mdi:plus", t("climate.humidity_higher")) : ""}
        ${off ? "" : btn("toggle", "mdi:power", on ? t("common.turn_off") : t("common.turn_on"))}</div></div>`;
  }

  _lightRow(x) {
    const id = typeof x === "string" ? x : x.entity;
    const st = this._st(id);
    const on = st?.state === "on";
    const modes = st?.attributes.supported_color_modes || [];
    const dim = modes.some((m) => m !== "onoff");
    const pct = on && st.attributes.brightness != null ? Math.round(st.attributes.brightness / 2.55) : 0;
    const a = st?.attributes || {};
    const ct = modes.includes("color_temp"), color = modes.some((m) => ["hs", "rgb", "rgbw", "rgbww", "xy"].includes(m));
    const toneOpen = on && (ct || color) && !!this._tone?.has(id);
    const kMin = a.min_color_temp_kelvin || 2000, kMax = a.max_color_temp_kelvin || 6500;
    const kelvin = a.color_temp_kelvin || Math.round((kMin + kMax) / 2), hue = Math.round(a.hs_color?.[0] ?? 30);
    const lock = (open) => (open ? "" : 'disabled tabindex="-1"');
    const trail = ct || color ? `<button class="icon-btn ${toneOpen ? "sel" : ""}" data-act="tone" data-entity="${esc(id)}" aria-expanded="${toneOpen}"
        aria-label="${color ? t("lights.color_tone") : t("lights.tone")}" ${lock(on)}><ha-icon icon="mdi:tune-variant"></ha-icon></button>`
      : `<span class="vol-num" data-vol>${pct || 1}%</span>`;
    const bri = `<div class="fold ${on ? "open" : ""}" data-act="fold"><div><div class="ctl"><ha-icon icon="mdi:brightness-6"></ha-icon>
        <input type="range" class="slider" min="1" max="100" value="${pct || 1}" style="--v:${pct || 1}%" data-unit="%" data-act="bright"
          data-entity="${esc(id)}" aria-label="${t("lights.brightness")}" ${lock(on)}>${trail}</div></div></div>`;
    const tone = ct || color ? `<div class="fold ${toneOpen ? "open" : ""}" data-act="fold"><div>
        ${ct ? `<div class="ctl"><ha-icon icon="mdi:thermometer"></ha-icon><input type="range" class="slider ct" min="${kMin}" max="${kMax}" step="50"
          value="${kelvin}" data-unit="K" data-act="ct" data-entity="${esc(id)}" aria-label="${t("lights.color_temp")}" ${lock(toneOpen)}>
          <span class="vol-num" data-vol>${kelvin}K</span></div>` : ""}
        ${color ? `<div class="ctl"><ha-icon icon="mdi:palette-outline"></ha-icon><input type="range" class="slider hue" min="0" max="359" value="${hue}"
          data-act="hue" data-entity="${esc(id)}" aria-label="${t("lights.color")}" ${lock(toneOpen)}>
          <span class="swatch" data-swatch style="--c:hsl(${hue},100%,50%)"></span></div>` : ""}</div></div>` : "";
    const sub = !st || st.state === "unavailable" ? t("common.unavailable_n") : on ? (dim ? `${pct}%` : t("common.on_n")) : t("common.off_n");
    return `<div class="row" role="button" tabindex="0" data-act="light" data-entity="${esc(id)}" data-hold="${esc(id)}">
      <div class="ic ${on ? "lime" : ""}"><ha-icon icon="${on ? "mdi:lightbulb" : "mdi:lightbulb-outline"}"></ha-icon></div>
      <div><div class="t">${esc(this._name(x))}</div><div class="s">${sub}</div></div>
      <div class="sw ${on ? "on" : ""}"></div>
      ${dim ? bri + tone : ""}</div>`;
  }

  _roomMeta(r) {
    const temp = this._st(r.temperature), h = this._st(r.humidity);
    return [temp && !isNaN(temp.state) ? num(temp.state) + "°" : "", h && !isNaN(h.state) ? t("climate.humidity_short", { v: Math.round(h.state) }) : ""].filter(Boolean).join(" · ");
  }

  _roomRows(r) {
    const rows = (r.devices || []).map((d) => this._deviceRow(d)).join("") + (r.humidifiers || []).map((x) => this._humidifierRow(x)).join("")
      + (r.covers || []).map((x) => this._coverRow(x)).join("") + (r.lights || []).map((x) => this._lightRow(x)).join("");
    if (!rows && (r.temperature || r.humidity)) return this._roomClimate(r);
    return `<div class="rows">${rows || `<div class="empty">${t("rooms.no_lights_room")}</div>`}</div>`;
  }

  // A room with nothing to switch (Pokój babci) shows its climate as two stat tiles instead of an empty list.
  _roomClimate(r) {
    const temp = this._st(r.temperature), h = this._st(r.humidity), ok = (x) => x && !isNaN(x.state);
    const stat = (icon, label, value, id) => `<div class="wx-stat" role="button" tabindex="0" data-act="more" data-entity="${esc(id)}"><span>${label}</span>
      <b><ha-icon icon="${icon}"></ha-icon>${value}</b></div>`;
    return `<div class="wx-stats two room-climate">${ok(temp) ? stat("mdi:thermometer", t("common.temperature"), `${num(temp.state)}°`, r.temperature) : ""}${ok(h)
      ? stat("mdi:water-percent", t("common.humidity"), `${Math.round(h.state)}%`, r.humidity) : ""}</div>`;
  }

  _roomPanel(r) {
    return `<h3><span class="ic lime" style="width:34px;height:34px;--mdc-icon-size:18px"><ha-icon icon="${esc(r.icon || "mdi:home-outline")}"></ha-icon></span>${esc(r.name)}<span class="meta">${this._roomMeta(r)}</span></h3>
      ${this._roomRows(r)}`;
  }

  // Vacuum, washer and dishwasher: on the home screen only while they work, always on the Porządki tab.
  _cleaningTiles(onlyActive) {
    const c = this._config, vac = this._st(c.vacuum?.entity);
    const vacActive = vac && ["cleaning", "returning", "paused"].includes(vac.state);
    return (!onlyActive || vacActive ? this._vacuumTile() : "")
      + (c.appliances || []).map((ap, i) => (!onlyActive || this._appState(ap).active ? this._applianceTile(ap, i) : "")).join("");
  }

  _cleanTab() {
    const tiles = this._cleaningTiles(false);
    return `<div class="section-title">${t("tabs.clean")}</div>${tiles ? `<div class="gridwrap"><div class="grid">${tiles}</div></div>`
      : `<div class="empty">${t("cleaning.no_devices")}</div>`}${this._wasteSection()}`;
  }

  // The next three weeks of `waste:` calendars, one card per pickup day, coloured like the operator's leaflet.
  // `waste` entries are calendar ids or { entity, color }; the colour otherwise follows the fraction's name.
  async _loadWaste() {
    const cals = ids(this._config.waste);
    if (!cals.length) return;
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(start); end.setDate(end.getDate() + 22);
    try {
      const res = await this._hass.callWS({ type: "call_service", domain: "calendar", service: "get_events",
        service_data: { start_date_time: start.toISOString(), end_date_time: end.toISOString() }, target: { entity_id: cals }, return_response: true });
      const list = [];
      for (const [id, v] of Object.entries(res?.response || {})) for (const e of v.events || []) list.push({ id, date: String(e.start).slice(0, 10), name: e.summary });
      this._wasteEvents = list.sort((a, b) => a.date.localeCompare(b.date) || cals.indexOf(a.id) - cals.indexOf(b.id));
      this._schedule();
    } catch (e) { /* calendar not ready: next try in 30 min */ }
  }

  _wasteStyle(id, name) {
    const own = (this._config.waste || []).find((x) => typeof x === "object" && x.entity === id) || {};
    const [, color, icon] = WASTE_COLORS.find(([re]) => re.test(fold(name || id))) || [];
    return { color: own.color || color || "#8E9AA0", icon: own.icon || icon || "mdi:trash-can-outline" };
  }

  _wasteSection() {
    if (!ids(this._config.waste).length) return "";
    const days = [];
    for (const e of this._wasteEvents || []) {
      const d = days.find((x) => x.date === e.date);
      d ? d.items.push(e) : days.push({ date: e.date, items: [e] });
    }
    const today = new Date(); today.setHours(0, 0, 0, 0);
    // The next five pickup days as home-grid tiles (one row on the tablet): fraction icons in the tile's round icon
    // slots, the weekday as the kicker, the date as the big line. The next pickup is lit like an active tile.
    const cards = days.slice(0, 5).map((d, i) => {
      const dt = new Date(`${d.date}T00:00:00`), n = Math.round((dt - today) / 86400000);
      const when = n === 0 ? t("common.today_lc") : n === 1 ? t("common.tomorrow_lc") : t("waste.in_days", { n });
      const icons = d.items.map((e) => { const w = this._wasteStyle(e.id, e.name);
        return `<div class="ic waste-ic" style="--c:${esc(w.color)}"><ha-icon icon="${esc(w.icon)}"></ha-icon></div>`; }).join("");
      return `<div class="tile waste-tile ${i === 0 ? "on" : ""}">
        <div class="head" style="justify-content:flex-start;gap:8px;align-items:center">${icons}
          <div class="kicker" style="margin-left:4px">${esc(date(dt, { weekday: "long" }))}</div></div>
        <div class="big">${esc(date(dt, { day: "numeric", month: "long" }))}</div>
        <div class="sub" style="margin-top:6px">${esc(d.items.map((e) => e.name).join(" · "))} · ${when}</div></div>`;
    }).join("");
    return `<div class="section-title">${t("waste.title")}</div>${cards ? `<div class="gridwrap"><div class="grid">${cards}</div></div>`
      : `<div class="empty">${this._wasteEvents ? t("waste.none") : t("waste.loading")}</div>`}
      <div class="waste-note">${t("waste.note")}</div>`;
  }

  // Bento: the room with the most controls spans the full width with its rows in columns; the rest share the lines
  // below, and a short last line stretches to fill the width instead of leaving an empty cell.
  _roomsTab() {
    const rooms = this._config.rooms, size = (r) => (r.lights || []).length + (r.covers || []).length + (r.devices || []).length
      + (r.humidifiers || []).length;
    const top = Math.max(...rooms.map(size)), heroAt = top >= 4 && rooms.filter((r) => size(r) === top).length === 1 ? rooms.findIndex((r) => size(r) === top) : -1;
    return `<div class="section-title">${t("tabs.rooms")}</div><div class="panels rooms">${rooms.map((r, i) => `<div class="panel ${i === heroAt ? "hero" : ""}">${this._roomPanel(r)}</div>`).join("")}</div>`;
  }

  _mediaTab() {
    const list = (this._config.media || []).map((x) => this._mediaInfo(x)).filter(Boolean);
    const hero = list.find((m) => m.active);
    const rest = list.filter((m) => m !== hero);
    return `<div class="section-title">${t("tabs.media")}</div>${hero ? this._nowPlaying(hero) : ""}
      <div class="players">${rest.map((m) => this._playerCard(m)).join("")}</div>`;
  }

  _appIcon(m) {
    const app = String(m.app).toLowerCase();
    return app.includes("youtube") ? "mdi:youtube" : app.includes("netflix") ? "mdi:netflix" : app.includes("spotify") ? "mdi:spotify"
      : app.includes("prime") ? "mdi:filmstrip" : m.a.device_class === "tv" ? "mdi:television" : "mdi:cast";
  }

  _volume(m) {
    if (m.a.volume_level == null) return "";
    // A TV steps by one like its remote; speakers by five, so a few taps make an audible difference.
    const step = m.a.device_class === "tv" ? 1 : 5, p = this._volPending?.[m.tv], real = Math.round(m.a.volume_level * 100);
    if (p && (p.value === real || Date.now() - p.at > 8000)) delete this._volPending[m.tv];
    const v = this._volPending?.[m.tv] ? p.value : real, muted = m.a.is_volume_muted;
    return `<div class="vol2"><button class="icon-btn" data-act="mute" data-entity="${esc(m.tv)}" aria-label="${muted ? t("media.unmute") : t("media.mute")}">
        <ha-icon icon="${muted ? "mdi:volume-off" : v < 35 ? "mdi:volume-low" : v < 70 ? "mdi:volume-medium" : "mdi:volume-high"}"></ha-icon></button>
      <button class="icon-btn step" data-act="vol-step" data-step="-${step}" data-entity="${esc(m.tv)}" aria-label="${t("media.vol_down")}" ${v <= 0 ? "disabled" : ""}><ha-icon icon="mdi:minus"></ha-icon></button>
      <input type="range" class="slider" min="0" max="100" value="${v}" style="--v:${v}%" data-act="volume" data-entity="${esc(m.tv)}" aria-label="${t("media.volume")}">
      <button class="icon-btn step" data-act="vol-step" data-step="${step}" data-entity="${esc(m.tv)}" aria-label="${t("media.vol_up")}" ${v >= 100 ? "disabled" : ""}><ha-icon icon="mdi:plus"></ha-icon></button></div>`;
  }

  // The brand card for an app the TV can only name: its colours with the crisp logo on top.
  _brandArt(m, cls) {
    return `<div class="${cls} brand" style="background:${m.brand[2]}"><i class="np-brand ${m.brand[3] ? "mono" : ""}"
      style="--logo:url('/local/logos/${m.brand[1]}.svg?v=${LOGO_V}')"></i></div>`;
  }

  // The blurred light behind playing media: the artwork itself, or the brand card when all there is is an app logo.
  _glow(m, cls) {
    // A known TV channel lends its logo's colours (Republika: navy and red) instead of the programme or the app.
    if (m.channelLogo) return `<div class="${cls} chan" style="background-image:url('${esc(m.channelLogo)}');${m.channelColor ? `background-color:${esc(m.channelColor)}` : ""}"></div>`;
    return m.brand ? this._brandArt(m, cls) : m.pic ? `<div class="${cls}" style="background-image:url('${esc(m.pic)}')"></div>` : "";
  }

  _nowPlaying(m) {
    const pic = m.pic ? esc(m.pic) : "";
    const square = m.cover || /music|track|album|playlist/.test(m.a.media_content_type || "");
    const pos = m.a.media_duration ? this._position({ pos: m.a.media_position || 0, at: m.a.media_position_updated_at || "",
      dur: m.a.media_duration, playing: m.playing ? "1" : "0" }) : 0;
    return `<div class="np">${this._glow(m, "np-bg")}
      <div class="np-inner">
        ${m.channelLogo ? `<div class="np-art chan" style="background-image:url('${esc(m.channelLogo)}')"></div>`
          : m.brand ? this._brandArt(m, "np-art")
          : pic && m.logo ? `<div class="np-art logo"><i class="np-logo" style="background-image:url('${pic}')"></i></div>`
          : `<div class="np-art ${square ? "square" : ""}" style="${pic ? `background-image:url('${pic}')` : ""}">${pic ? "" : `<ha-icon icon="${this._appIcon(m)}"></ha-icon>`}</div>`}
        <div class="np-body">
          <div class="np-chips">
            ${m.appBrand ? `<span class="chip app logo" title="${esc(m.app)}"><i class="np-brand ${m.appBrand[3] ? "mono" : ""}" style="--logo:url('/local/logos/${m.appBrand[1]}.svg?v=${LOGO_V}')"></i></span>`
              : m.app ? `<span class="chip app"><ha-icon icon="${this._appIcon(m)}"></ha-icon>${esc(m.app)}</span>` : ""}
            <span class="chip"><ha-icon icon="${m.a.device_class === "tv" ? "mdi:television" : "mdi:cast"}"></ha-icon>${esc(m.a.friendly_name)}</span>
            <span class="chip state ${m.playing ? "on" : ""}"><i></i>${m.playing ? t("media.playing") : t("media.paused")}</span></div>
          <div class="np-title">${esc(m.title)}</div>${m.channel || m.artist ? `<div class="np-sub">${esc(m.channel || m.artist)}</div>` : ""}
          ${m.slot || m.a.media_duration ? `<div class="np-prog"><div class="bar"><i ${this._progressAttrs(m)}></i></div>
            <div class="times">${m.slot ? `<span>${m.slot.label[0]}</span><span>${m.slot.label[1]}</span>`
              : `<span data-elapsed>${fmtTime(pos)}</span><span>${fmtTime(m.a.media_duration)}</span>`}</div></div>` : ""}
          <div class="np-ctrls">
            <button data-act="media" data-cmd="media_previous_track" data-entity="${esc(m.id)}" aria-label="${t("media.previous")}"><ha-icon icon="mdi:skip-previous"></ha-icon></button>
            <button class="play" data-act="media" data-cmd="media_play_pause" data-entity="${esc(m.id)}" aria-label="${t("media.play_pause")}"><ha-icon icon="${m.playing ? "mdi:pause" : "mdi:play"}"></ha-icon></button>
            <button data-act="media" data-cmd="media_next_track" data-entity="${esc(m.id)}" aria-label="${t("media.next")}"><ha-icon icon="mdi:skip-next"></ha-icon></button></div>
          ${this._volume(m)}
        </div></div></div>`;
  }

  _playerCard(m) {
    const st = m.st.state, on = !["off", "unavailable", "unknown", "standby"].includes(st);
    const sub = st === "unavailable" ? t("common.unavailable_m") : !on ? t("common.off_m")
      : [m.srcName(m.a.source), m.a.sound_mode].filter(Boolean).join(" · ") || (m.active ? m.title : t("common.on_m"));
    const icon = m.a.device_class === "tv" ? "mdi:television" : /soundbar/i.test(m.a.friendly_name) ? "mdi:soundbar" : "mdi:speaker";
    return `<div class="player ${on ? "is-on" : ""}"><div class="player-hd">
        <div class="ic ${on ? "lime" : ""}"><ha-icon icon="${icon}"></ha-icon></div>
        <div style="min-width:0"><div class="t">${esc(m.a.friendly_name)}</div><div class="s">${esc(sub)}</div></div>
        ${st !== "unavailable" ? `<button class="pwr ${on ? "on" : ""}" data-act="power" data-entity="${esc(m.tv)}" data-on="${on ? 1 : 0}" aria-label="${t("common.power")}"><ha-icon icon="mdi:power"></ha-icon></button>` : ""}</div>
      ${on ? this._volume(m) : ""}</div>`;
  }

  // --- cameras ---------------------------------------------------------------------------------
  // Stills come from HA's camera proxy scaled to 640 px (the cameras shoot up to 2304 px), refreshed every 15 s while they
  // are on screen; the sheet plays the proxy's MJPEG stream. `preview` may name a lighter substream for the stills.
  _camUrl(id, extra = "") {
    const token = this._st(id)?.attributes.access_token;
    if (!token || this._camStale?.[id] === token || this._camBad?.has(token)) return "";
    return this._hass.hassUrl(`/api/camera_proxy/${id}?token=${token}${extra}`);
  }

  // A still that failed to load marks its token as bad (HA answered 401: a camera still starting after an HA restart
  // can carry a token it does not accept yet). That token is not tried again; the next one HA hands out is.
  _camFailed(url) {
    const token = /[?&]token=([^&]+)/.exec(url || "")?.[1];
    if (token) (this._camBad ||= new Set()).add(token);
  }

  // While HA is away (a restart, a network drop) the camera tokens in hand may already be dead, and HA counts every
  // request with a dead token as a failed login: after `login_attempts_threshold` of them it bans the tablet's IP for
  // good. So the tokens seen while disconnected are not used again; the last still stays on screen until HA hands out
  // new tokens (after a restart at once, otherwise at the next 5-minute rotation).
  _camHold(hass) {
    const cams = this._config.cameras;
    if (!cams?.length) return;
    const ids = cams.flatMap((c) => [c.entity, c.preview]).filter(Boolean);
    const tok = (id) => hass.states[id]?.attributes.access_token;
    if (hass.connected === false) {
      this._camStale ||= {};
      for (const id of ids) if (tok(id) && !(id in this._camStale)) this._camStale[id] = tok(id);
      return;
    }
    if (!this._camStale) return;
    for (const id of Object.keys(this._camStale)) if (tok(id) && tok(id) !== this._camStale[id]) delete this._camStale[id];
    if (!Object.keys(this._camStale).length) { this._camStale = null; this._schedule(); }
  }

  // Each still moves on in its own 15 s slot, 3 s after the previous camera, so they never all load at once; the clock
  // only advances while no camera is open, so the stills behind the sheet do not compete with the live view.
  _camStill(cam) {
    const i = Math.max(0, (this._config.cameras || []).indexOf(cam)), now = this._camClock ?? Date.now(), id = cam.preview || cam.entity;
    // Held back (see _camHold): keep the still already on screen, which needs no request.
    return this._camUrl(id, `&width=640&t=${Math.floor((now + i * 3000) / 15000)}`) || this._camShown?.[id] || "";
  }

  _camName(cam) { return cam.name || this._name(cam.entity); }

  // Which players a camera offers hardly ever changes; asking once (and again after 10 min) saves a round trip on
  // every open. All cameras are asked as soon as their tiles are on screen.
  _camCaps(id) {
    const c = (this._camCapsCache ||= {})[id];
    if (c && Date.now() - c.at < 600000) return c.p;
    const p = this._hass.callWS({ type: "camera/capabilities", entity_id: id }).catch(() => { delete this._camCapsCache[id]; return null; });
    this._camCapsCache[id] = { p, at: Date.now() };
    return p;
  }

  _camerasTile() {
    const cams = this._config.cameras || [];
    if (!cams.length) return "";
    const src = this._camStill(cams[0]);
    return `<div class="tile cam-tile" role="button" tabindex="0" data-act="tab" data-tab="security">${src ? `<img data-keep data-src="${esc(src)}" alt="">` : ""}
      <div class="kicker"><ha-icon icon="mdi:cctv" style="--mdc-icon-size:14px"></ha-icon> ${t("cameras.count", { n: cams.length })}</div>
      <div class="title">${esc(this._camName(cams[0]))}</div></div>`;
  }

  _camerasGrid() {
    const cams = this._config.cameras || [];
    if (!cams.length) return "";
    return `<div class="label" style="margin-top:18px">${t("cameras.title")}</div><div class="cams">${cams.map((cam, i) => {
      const src = this._camStill(cam);
      return `<div class="cam" role="button" tabindex="0" data-act="camera" data-cam="${i}">${src ? `<img data-keep data-src="${esc(src)}" alt="">` : ""}
        <div class="cam-meta"><ha-icon icon="${esc(cam.icon || "mdi:cctv")}"></ha-icon>${esc(this._camName(cam))}</div></div>`;
    }).join("")}</div>`;
  }

  // A new still is fetched off-screen and swapped in only once it has arrived, so a tile never goes blank while a slow
  // camera (up to ~9 s here) answers.
  _camSwap(root) {
    for (const cam of this._config.cameras) this._camCaps(cam.entity);
    const shown = (this._camShown ||= {}), seen = (url) => { shown[url.match(/camera_proxy\/([^?]+)/)?.[1]] = url; };
    for (const img of root.querySelectorAll("img[data-keep][data-src]")) {
      const want = img.dataset.src;
      if (!want || img._want === want) continue;
      img._want = want;
      if (!img.getAttribute("src")) {
        img.src = want;
        img.addEventListener("load", () => seen(img.src), { once: true });
        img.addEventListener("error", () => this._camFailed(want), { once: true });
        continue;
      }
      const next = new Image();
      next.onload = () => { seen(want); if (img._want === want) img.src = want; };
      next.onerror = () => this._camFailed(want);
      next.src = want;
    }
  }

  // The sheet starts from the still already on screen (in memory, so it paints at once) rather than asking the camera
  // for a newer one, which can take seconds.
  _camShownStill(cam) {
    return this._camShown?.[cam.preview || cam.entity] || this._camStill(cam);
  }

  // Live view: HA's own camera player (WebRTC, falling back to HLS) for cameras with a stream; for still-only cameras a
  // chain of stills, each requested once the previous one has arrived, so no connection is held open. The last still of
  // the chosen camera shows at once underneath, so switching is instant and the live picture fades in over it.
  _cameraSheet(i) {
    const cams = this._config.cameras, cam = cams[i], name = this._camName(cam);
    const still = this._camShownStill(cam);
    return `<div class="sheet-wrap" data-act="close-sheet"><div class="sheet cam-sheet" role="dialog" aria-label="${esc(name)}">
      <div class="hd"><h2 style="flex:1">${esc(name)}</h2>
        <button class="round cam-fs" data-act="cam-full" aria-label="${t("cameras.fullscreen")}"><ha-icon icon="mdi:fullscreen"></ha-icon></button>
        <button class="round" data-act="close-sheet" aria-label="${t("common.close")}"><ha-icon icon="mdi:close"></ha-icon></button></div>
      <div class="cam-live ${this._camFull ? "full" : ""}" style="${still ? `--still:url('${esc(still)}')` : ""}"><div class="cam-slot" data-keep></div>
        <span class="cam-badge"><i></i><span class="on">${t("cameras.live")}</span><span class="wait">${t("cameras.connecting")}</span></span>
        <button class="round cam-exit" data-act="cam-exit" aria-label="${t("cameras.exit_fullscreen")}"><ha-icon icon="mdi:fullscreen-exit"></ha-icon></button></div>
      ${cams.length > 1 ? `<div class="cam-thumbs">${cams.map((c, j) => `<button class="cam-thumb ${j === i ? "on" : ""}" data-act="camera" data-cam="${j}">
        <span class="ct-img"><img data-keep data-src="${esc(this._camShownStill(c))}" alt=""></span><span class="ct-name">${esc(this._camName(c))}</span></button>`).join("")}</div>` : ""}
      <button class="wide-btn" data-act="cam-full"><ha-icon icon="mdi:fullscreen"></ha-icon>${t("cameras.fullscreen")}</button></div></div>`;
  }

  // The player lives in .cam-slot, which morph leaves alone (data-keep), so re-renders never restart it.
  async _camMount(host) {
    const slot = host.querySelector(".cam-slot"), i = this._camOpen;
    if (!slot || i == null || slot._cam === i) return;
    const cam = this._config.cameras[i];
    slot._cam = i;
    clearTimeout(slot._next);
    slot.parentElement.style.aspectRatio = "";
    // Bring the chosen camera's thumbnail into view in the strip below.
    const strip = host.querySelector(".cam-thumbs"), on = strip?.querySelector(".on");
    if (on) strip.scrollTo({ left: on.offsetLeft - strip.firstElementChild.offsetLeft, behavior: reducedMotion() ? "auto" : "smooth" });
    // The outgoing picture fades out over the new camera's still: it drops its classes at once, so the still (which
    // hides behind a settled feed) is back underneath before the fade starts and no black shows through.
    for (const old of [...slot.children]) {
      old.classList.remove("ready", "settled");
      old.style.opacity = "1";
      if (!reducedMotion()) old.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, easing: "ease-out", fill: "forwards" });
      setTimeout(() => old.remove(), 230);
    }
    const caps = await this._camCaps(cam.entity);
    if (slot._cam !== i || !slot.isConnected) return;
    let el;
    if (caps?.frontend_stream_types?.length && customElements.get("ha-camera-stream")) {
      el = document.createElement("ha-camera-stream");
      el.hass = this._hass;
      el.stateObj = this._st(cam.entity);
      el.muted = true;
      el.controls = false;
    } else {
      el = document.createElement("img");
      el.alt = "";
      const next = () => {
        if (slot._cam !== i || !slot.isConnected) return;
        const url = this._camUrl(cam.entity, `&t=${Date.now()}`);
        if (url) el.src = url;
        else slot._next = setTimeout(next, 2000); // token held back while HA restarts: try again shortly
      };
      el.addEventListener("load", () => {
        if (!el.classList.contains("ready") && el.naturalWidth) slot.parentElement.style.aspectRatio = `${el.naturalWidth} / ${el.naturalHeight}`;
        el.classList.add("ready");
        slot._next = setTimeout(next, 1000);
      });
      el.addEventListener("error", () => { this._camFailed(el.src); slot._next = setTimeout(next, 3000); });
      next();
    }
    el.className = "cam-feed";
    slot.appendChild(el);
    if (el.tagName !== "IMG") this._camWhenLive(el, slot, i);
  }

  // ha-camera-stream fires nothing usable across WebRTC, HLS and MJPEG, so look inside it for a <video> (or MJPEG <img>)
  // that has a frame to show. It runs the HLS and WebRTC players side by side and shows whichever starts first, so every
  // video counts. Gives up after 30 s and shows whatever the player has.
  _camWhenLive(el, slot, i) {
    const t0 = Date.now(), show = (w, h) => {
      if (el._shown) return;
      el._shown = true;
      if (w && h && Math.abs(w / h - 16 / 9) > .02) slot.parentElement.style.aspectRatio = `${w} / ${h}`;
      el.classList.add("ready");
      this._camFreeze(el, slot, i);
      // The still underneath goes once the 0.45 s fade is over, so the picture never fades in over black.
      setTimeout(() => { if (slot._cam === i && el.isConnected) el.classList.add("settled"); }, 500);
    };
    const check = () => {
      if (slot._cam !== i || !el.isConnected) return;
      // Only this player's own videos: the outgoing camera's player is still in the slot while it fades out.
      const root = el.shadowRoot || el;
      const v = deepQueryAll(root, "video").find((x) => x.readyState >= 2 && x.videoWidth), img = !v && deepQuery(root, "img");
      if (v) {
        // requestVideoFrameCallback fires as the frame is composited, so the fade starts on a picture, not before it.
        // A paused video never calls back, hence the timer behind it.
        if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(() => show(v.videoWidth, v.videoHeight));
        setTimeout(() => show(v.videoWidth, v.videoHeight), v.requestVideoFrameCallback ? 500 : 0);
      } else if (img?.complete && img.naturalWidth) show(img.naturalWidth, img.naturalHeight);
      else if (Date.now() - t0 > 30000) show();
      else setTimeout(check, 80);
    };
    check();
  }

  // A few seconds in, HA swaps its HLS video for the WebRTC one, which shows nothing until its first frame: up to
  // 0.8 s of black here. A canvas under the player keeps the last frame shown (redrawn every 0.3 s from whichever
  // video is on screen), so the swap passes unseen.
  _camFreeze(el, slot, i) {
    const canvas = document.createElement("canvas");
    canvas.className = "cam-freeze";
    slot.insertBefore(canvas, el);
    const ctx = canvas.getContext("2d");
    const draw = () => {
      if (slot._cam !== i || !el.isConnected) return;
      const v = deepQueryAll(el.shadowRoot || el, "video").find((x) => x.readyState >= 2 && x.videoWidth && x.getClientRects().length);
      if (v) {
        if (canvas.width !== v.videoWidth || canvas.height !== v.videoHeight) Object.assign(canvas, { width: v.videoWidth, height: v.videoHeight });
        ctx.drawImage(v, 0, 0);
      }
      setTimeout(draw, 300);
    };
    draw();
  }

  _securityTab() {
    const rows = this._securityItems().map((x) => `<div class="row" role="button" tabindex="0" data-act="more" data-entity="${esc(x.id)}">
      <div class="ic ${x.alert ? "" : "lime"}"><ha-icon icon="${x.dc === "moisture" ? "mdi:water-outline" : x.dc === "door" ? "mdi:door" : "mdi:shield-outline"}"></ha-icon></div>
      <div><div class="t">${esc(x.name)}</div><div class="s">${x.st ? changed(x.st.last_changed) : ""}</div></div>
      <div class="${x.alert ? "state-bad" : "state-ok"}">${x.off ? t("security.offline_word") : x.alert ? table("security.alert")[x.dc] || t("security.attention") : t("security.ok")}</div></div>`).join("");
    const people = this._persons().map((p) => {
      const { st, name } = this._who(p), id = p.entity;
      return `<div class="row" role="button" tabindex="0" data-act="person" data-entity="${esc(id)}">
        <div class="ic ${st?.state === "home" ? "lime" : ""}"><ha-icon icon="mdi:account-outline"></ha-icon></div>
        <div><div class="t">${esc(name)}</div><div class="s">${st ? since(st.last_changed) : ""}</div></div>
        <div class="${st?.state === "home" ? "state-ok" : "s"}">${st?.state === "home" ? t("persons.home_lc") : st?.state === "not_home" ? t("persons.away_lc") : esc(st?.state || "")}</div></div>`;
    }).join("");
    return `<div class="section-title">${t("tabs.security")}</div>${this._camerasGrid()}<div class="panels">
      <div class="panel"><h3>${t("security.sensors")}</h3><div class="rows">${rows || `<div class="empty">${t("security.no_sensors")}</div>`}</div></div>
      <div class="panel"><h3>${t("security.people")}</h3><div class="rows">${people || `<div class="empty">${t("security.no_people")}</div>`}</div></div></div>`;
  }

  _nav() {
    const p = this._pill;
    return `<nav class="nav ${this._navMini ? "folded" : ""}" style="${p ? `--mx:${p.mx}px` : ""}">
      <i class="nav-pill" style="${p ? `width:${p.w}px;height:${p.h}px;top:${p.y}px;transform:translateX(${p.x}px)` : "opacity:0"}"></i>${this._tabs().map(([k]) => `<button class="${this._tab === k ? "sel" : ""}" data-act="tab" data-tab="${k}">
      <svg class="nav-ic" viewBox="0 0 24 24" aria-hidden="true">${NAV_ICONS[k](this._tab === k)}</svg><span>${t(`tabs.${k}`)}</span>${k === "heating" ? this._navBadge() : ""}</button>`).join("")}</nav>`;
  }

  _navBadge() {
    const list = this._heatIssues();
    return list.length ? `<i class="nav-badge ${list.some((x) => x.urgent) ? "urgent" : ""}"></i>` : "";
  }

  _sheet(r) {
    return `<div class="sheet-wrap" data-act="close-sheet"><div class="sheet" role="dialog" aria-label="${esc(r.name)}">
      <div class="hd"><span class="ic lime"><ha-icon icon="${esc(r.icon || "mdi:home-outline")}"></ha-icon></span>
        <div style="flex:1"><h2>${esc(r.name)}</h2><div class="s" style="color:var(--muted);font-size:13px">${this._roomMeta(r)}</div></div>
        <button class="round" data-act="close-sheet" aria-label="${t("common.close")}"><ha-icon icon="mdi:close"></ha-icon></button></div>
      ${this._roomEnergy(r)}${this._roomRows(r)}</div></div>`;
  }

  // Power draw and this month's cost for rooms behind a metered socket (e.g. the desk).
  _roomEnergy(r) {
    if (!r.energy_meter) return "";
    const power = this._appNum(r.power), today = this._appNum(r.energy_today), month = this._appMonth(r);
    const stat = (icon, k, v) => `<div class="wx-stat"><span>${k}</span><b><ha-icon icon="${icon}"></ha-icon>${esc(v)}</b></div>`;
    return `${r.energy_name ? `<div class="label vac-label">${esc(r.energy_name)}</div>` : ""}<div class="wx-stats">${stat("mdi:flash-outline", t("rooms.power_now"), power != null ? `${Math.round(power)} W` : "–")}
      ${stat("mdi:lightning-bolt-outline", t("common.today"), today != null ? `${num(today, 2)} kWh` : "–")}
      ${stat("mdi:calendar-month", t("common.this_month"), month.kwh != null ? `${num(month.kwh, 2)} kWh` : "–")}
      ${stat("mdi:cash", t("common.month_cost"), month.cost != null ? money(month.cost) : "–")}</div>`;
  }

  // --- live bits ----------------------------------------------------------------------------------
  // The clock and progress bars tick once a second, but not while the app is in the background.
  _startTick() {
    clearInterval(this._timer);
    this._timer = null;
    if (document.hidden) return;
    this._timer = setInterval(() => this._tick(), 1000);
    this._tick();
  }

  _tick() {
    const root = this.shadowRoot;
    if (!root) return;
    const clock = root.querySelector("[data-clock]"), clockText = this._clockText();
    // A new minute also refreshes the countdowns (boost, appliances) that are worked out at render time.
    if (clock && clock.textContent !== clockText) { clock.textContent = clockText; this._schedule(); }
    // Camera stills on screen move on every 3 s slot (each camera every 15 s); the live sheet streams on its own.
    if (this._config.cameras?.length && ["home", "security"].includes(this._tab) && this._camOpen == null) {
      this._camClock = Date.now();
      const slot = Math.floor(this._camClock / 3000);
      if (slot !== this._camSlot) { this._camSlot = slot; this._schedule(); }
    }
    const date = root.querySelector("[data-date]"), dateText = this._dateText();
    if (date && date.textContent !== dateText) date.textContent = dateText;
    root.querySelectorAll("[data-progress]").forEach((bar) => {
      const pos = this._position(bar.dataset);
      bar.style.transform = `scaleX(${(pos / Number(bar.dataset.dur)).toFixed(4)})`;
      const el = bar.closest("div")?.parentElement?.querySelector("[data-elapsed]");
      if (el) el.textContent = fmtTime(pos);
    });
  }

  _clockText() { return time(new Date()); }
  _dateText() { return date(new Date(), { weekday: "long", day: "numeric", month: "long" }); }
  _position({ pos, at, dur, playing }) {
    let p = Number(pos);
    if (playing === "1" && at) p += (Date.now() - new Date(at)) / 1000;
    return Math.min(p, Number(dur));
  }

  // --- interaction --------------------------------------------------------------------------------
  _bind() {
    const root = this.shadowRoot;
    root.addEventListener("click", (ev) => this._onClick(ev));
    // Scroll does not bubble, so the media tile's swipe is caught on the way down; it only moves the dots.
    root.addEventListener("scroll", (ev) => {
      const t = ev.target;
      if (!t.classList?.contains("mt-track")) return;
      const i = Math.round(t.scrollLeft / Math.max(1, t.clientWidth));
      if (i === this._mtIndex) return;
      this._mtIndex = i;
      t.parentElement.querySelectorAll(".mt-dots i").forEach((d, j) => d.classList.toggle("on", j === i));
    }, true);
    root.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" && ev.target.dataset?.act === "todo-input") { ev.preventDefault(); this._todoAdd(); return; }
      if ((ev.key === "Enter" || ev.key === " ") && ev.target.matches?.("[role=button]")) { ev.preventDefault(); ev.target.click(); }
      if (ev.key === "Escape" && this._anySheet()) { this._closeSheets(); this._tvRefocus(); }
    });
    root.addEventListener("pointerdown", (ev) => {
      if (ev.target.matches?.("input[type=range]")) { this._dragging = true; ev.target._edge = atEdge(ev.target); return; }
      const el = ev.composedPath().find((n) => n.dataset?.hold);
      if (!el) return;
      this._held = false;
      clearTimeout(this._holdTimer);
      this._holdTimer = setTimeout(() => { this._held = true; haptic("medium", this._hass); this._moreInfo(el.dataset.hold); }, 550);
    });
    const release = () => {
      clearTimeout(this._holdTimer);
      if (this._dragging) {
        this._dragging = false;
        if (this._pending) { this._pending = false; this._schedule(); }
      }
    };
    root.addEventListener("touchstart", (ev) => this._sheetDragStart(ev), { passive: true });
    root.addEventListener("touchend", () => this._sheetDragEnd());
    root.addEventListener("touchcancel", () => this._sheetDragEnd());
    // Non-passive, so it is only attached while a sheet is open (see _lockScroll): on the rest of the page Safari
    // can scroll without waiting for JavaScript.
    this._onTouchMove = (ev) => {
      if (this._sheetDragMove(ev)) return;
      if (!this._scrollLocked) return;
      const path = ev.composedPath();
      if (path[0]?.matches?.("input[type=range]")) return;
      // Rows that scroll sideways (hourly forecast, rooms) keep their own swipe.
      if (path.some((n) => n.nodeType === 1 && n.scrollWidth > n.clientWidth + 1 && getComputedStyle(n).overflowX === "auto")) return;
      const sheet = path.find((n) => n.classList?.contains("sheet"));
      if (!sheet || sheet.scrollHeight <= sheet.clientHeight) ev.preventDefault();
    };
    root.addEventListener("pointerup", release);
    root.addEventListener("pointercancel", release);
    root.addEventListener("input", (ev) => {
      const el = ev.target;
      if (!el.classList?.contains("slider")) return;
      el.style.setProperty("--v", `${el.value}%`);
      // A tick as the slider reaches either end, like iOS Control Center.
      const edge = atEdge(el);
      if (edge && el._edge === false) haptic("selection", this._hass);
      el._edge = edge;
      const num = el.parentElement.querySelector("[data-vol]");
      if (num) num.textContent = el.value + (el.dataset.unit || "");
      if (el.dataset.act === "hue") el.parentElement.querySelector("[data-swatch]")?.style.setProperty("--c", `hsl(${el.value},100%,50%)`);
    });
    root.addEventListener("change", (ev) => {
      const el = ev.target;
      const id = el.dataset.entity;
      if (el.dataset.act === "bright") this._call("light", "turn_on", { entity_id: id, brightness_pct: Number(el.value) });
      if (el.dataset.act === "ct") this._call("light", "turn_on", { entity_id: id, color_temp_kelvin: Number(el.value) });
      if (el.dataset.act === "hue") this._call("light", "turn_on", { entity_id: id, hs_color: [Number(el.value), 100] });
      if (el.dataset.act === "cover-pos") this._call("cover", "set_cover_position", { entity_id: id, position: Number(el.value) });
      if (el.dataset.act === "volume") this._volSet(id, Number(el.value));
    });
  }

  _onClick(ev) {
    if (this._held) { this._held = false; return; }
    const path = ev.composedPath();
    const el = path.find((n) => n.dataset?.act);
    if (!el || ["fold", "bright", "ct", "hue", "volume", "cover-pos", "todo-input"].includes(el.dataset.act)) return;
    const act = el.dataset.act;
    const id = el.dataset.entity;
    const c = this._config;
    if (HAPTIC[act]) haptic(HAPTIC[act], this._hass);
    if (act === "close-sheet") {
      if (el.classList.contains("sheet-wrap") && path[0] !== el) return;
      this._sheetRoom = this._personOpen = this._todoOpen = this._plantOpen = this._appOpen = this._camOpen = null; this._camFull = false;
      this._climateOpen = this._weatherOpen = this._vacOpen = false; this._heatOpen = null;
      this._render();
    } else if (act === "room") {
      this._sheetRoom = Number(el.dataset.room);
      this._render();
    } else if (act === "climate") {
      this._climateOpen = true;
      this._render();
    } else if (act === "appliance") {
      this._appOpen = Number(el.dataset.app);
      this._render();
    } else if (act === "press") {
      this._call("button", "press", { entity_id: id });
    } else if (act === "vacuum") {
      this._vacOpen = true;
      this._render();
    } else if (act === "vac") {
      const svc = { start: "start", pause: "pause", stop: "stop", home: "return_to_base", locate: "locate" }[el.dataset.cmd];
      if (svc) this._call("vacuum", svc, { entity_id: this._config.vacuum.entity });
    } else if (act === "vac-room") {
      this._call("dreame_vacuum", "vacuum_clean_segment", { entity_id: this._config.vacuum.entity, segments: [Number(el.dataset.seg)] });
    } else if (act === "vac-suction") {
      this._call("select", "select_option", { entity_id: this._config.vacuum.suction, option: el.dataset.option });
    } else if (act === "plant") {
      this._plantOpen = Number(el.dataset.plant);
      this._render();
    } else if (act === "person") {
      this._personOpen = id;
      this._render();
    } else if (act === "heat") {
      this._heatOpen = id;
      this._render();
      this._loadHeatSheet(id);
    } else if (act === "heat-step") {
      const st = this._st(id), a = st?.attributes || {}, step = Number(el.dataset.step);
      const v = Math.min(a.max ?? Infinity, Math.max(a.min ?? -Infinity, Math.round((Number(st?.state) + step) * 100) / 100));
      if (st && !isNaN(v)) this._call("number", "set_value", { entity_id: id, value: v });
    } else if (act === "wx-demo") {
      const i = Number(el.dataset.i);
      this._wxDemo = this._wxDemo === i ? null : i;
      this._render();
    } else if (act === "weather") {
      this._weatherOpen = true;
      this._render();
      this._loadForecast();
    } else if (act === "room-power") {
      const lights = this._lights(c.rooms[Number(el.dataset.room)]);
      const anyOn = lights.some((l) => this._on(l));
      this._call("light", anyOn ? "turn_off" : "turn_on", { entity_id: lights });
    } else if (act === "all-on" || act === "all-off") {
      this._call("light", act === "all-on" ? "turn_on" : "turn_off", { entity_id: this._allLights() });
    } else if (act === "scene") {
      const target = el.dataset.off || id, domain = target.split(".")[0];
      this._call(domain === "scene" || domain === "script" ? domain : "homeassistant", "turn_on", { entity_id: target });
    } else if (act === "cover") {
      this._call("cover", el.dataset.cmd, { entity_id: id });
    } else if (act === "humid") {
      const a = this._st(id)?.attributes || {};
      if (el.dataset.cmd === "toggle") this._call("humidifier", "toggle", { entity_id: id });
      else if (a.humidity != null) {
        const step = a.target_humidity_step || 5, dir = el.dataset.cmd === "up" ? 1 : -1;
        const v = Math.min(a.max_humidity ?? 100, Math.max(a.min_humidity ?? 0, a.humidity + dir * step));
        if (v !== a.humidity) this._call("humidifier", "set_humidity", { entity_id: id, humidity: v });
      }
    } else if (act === "cam-full") {
      // iPad and desktop: element full screen, which keeps whatever the player does inside it. iPhone has only the
      // system video player (it turns to landscape), and only for the WebRTC video: HA shows its HLS video first and
      // hides it once WebRTC is up, a few seconds later, which would end the full screen. Until WebRTC is up, and for
      // a still-only camera, the live box covers the whole screen instead.
      const live = this.shadowRoot.querySelector(".cam-live");
      const video = live && deepQueryAll(live, "video").find((v) => v.srcObject && v.readyState >= 2 && v.getClientRects().length);
      // iPhone also exposes webkitRequestFullscreen, but it only works on <video>, so the standard API decides.
      if (document.fullscreenEnabled && live?.requestFullscreen) live.requestFullscreen().catch(() => { this._camFull = true; this._render(); });
      else if (video?.webkitEnterFullscreen) {
        try { video.webkitEnterFullscreen(); } catch (e) { this._camFull = true; this._render(); }
      } else { this._camFull = true; this._render(); }
    } else if (act === "cam-exit") {
      if (document.fullscreenElement) document.exitFullscreen();
      else if (document.webkitFullscreenElement) document.webkitExitFullscreen();
      this._camFull = false;
      this._render();
    } else if (act === "camera") {
      const live = this.shadowRoot.querySelector(".cam-live");
      this._camOpen = Number(el.dataset.cam);
      this._render();
      if (live?.isConnected && !reducedMotion()) live.animate([{ filter: "blur(8px) brightness(.8)" }, { filter: "none" }], { duration: 420, easing: EASE_SPRING });
    } else if (act === "temp") {
      const th = this._thermo();
      if (!th?.on) return;
      const a = th.a, value = Math.min(Number(a.max_temp ?? 30), Math.max(Number(a.min_temp ?? 7), Math.round((th.target + Number(el.dataset.step)) * 2) / 2));
      this._tempPending = { value, at: Date.now() };
      this._render();
      clearTimeout(this._tempTimer);
      this._tempTimer = setTimeout(() => this._call("climate", "set_temperature", { entity_id: th.id, temperature: value }), 700);
    } else if (act === "thermo-run") {
      this._call("script", "turn_on", { entity_id: id });
    } else if (act === "thermo-power") {
      this._call("climate", "set_hvac_mode", { entity_id: c.climate.entity, hvac_mode: el.dataset.on === "1" ? "off" : "heat" });
    } else if (act === "run") {
      this._call(id.split(".")[0], "turn_on", { entity_id: id });
      el.classList.add("busy");
      el.lastChild.textContent = t("devices.sleeping");
    } else if (act === "tone") {
      this._tone = this._tone || new Set();
      if (!this._tone.delete(id)) this._tone.add(id);
      this._render();
    } else if (act === "light") {
      this._call("light", "toggle", { entity_id: id });
    } else if (act === "kiosk") {
      this._call("input_boolean", "toggle", { entity_id: id });
    } else if (act === "power") {
      this._call("media_player", el.dataset.on === "1" ? "turn_off" : "turn_on", { entity_id: id });
    } else if (act === "vol-step") {
      // Several quick taps add up locally and go to the device as one change once the taps stop.
      const slider = el.parentElement.querySelector(".slider");
      const value = Math.min(100, Math.max(0, Number(slider.value) + Number(el.dataset.step)));
      (this._volPending ||= {})[id] = { value, at: Date.now() };
      this._render();
      clearTimeout(this._volTimer);
      this._volTimer = setTimeout(() => this._volSet(id, value), 400);
    } else if (act === "mute") {
      this._call("media_player", "volume_mute", { entity_id: id, is_volume_muted: !this._st(id)?.attributes.is_volume_muted });
    } else if (act === "media") {
      this._call("media_player", el.dataset.cmd, { entity_id: id });
    } else if (act === "tab") {
      if (this._navMini && el.closest(".nav")) { this._navMini = false; this._render(); return; }
      this._tab = el.dataset.tab;
      this._sheetRoom = this._personOpen = this._todoOpen = this._plantOpen = this._appOpen = this._camOpen = null; this._camFull = false;
      this._climateOpen = this._weatherOpen = this._vacOpen = false; this._heatOpen = null;
      this._heatDue();
      this._render();
    } else if (act === "more") {
      this._moreInfo(id);
    } else if (act === "todo") {
      this._todoOpen = id;
      this._todoState = this._hass.states[id];
      if (this._todoItems?.id !== id) this._todoItems = null;
      this._render();
      this._loadTodo();
    } else if (act === "todo-add") {
      this._todoAdd();
    } else if (act === "todo-toggle") {
      const item = this._todoItems?.items.find((i) => i.uid === el.dataset.uid);
      if (!item || item.uid.startsWith("tmp-")) return;
      item.status = item.status === "completed" ? "needs_action" : "completed";
      this._render();
      this._call("todo", "update_item", { entity_id: this._todoOpen, item: item.uid, status: item.status });
    } else if (act === "todo-clear") {
      this._todoItems.items = this._todoItems.items.filter((i) => i.status !== "completed");
      this._render();
      this._call("todo", "remove_completed_items", { entity_id: this._todoOpen });
    } else if (act === "settings") {
      this._navigate(c.settings_path || "/config/dashboard");
    }
  }
}

customElements.define("alvuna-card", HomedeckCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: "alvuna-card", name: "Alvuna", description: t("common.card_description") });
