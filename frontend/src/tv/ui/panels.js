// Detail panels: a drawer from the right. Its header stays put; only the list below it scrolls. Every row
// has the same height and the same parts (icon, name, state, value on the right), and a thin bar for values set with
// left/right ([data-adjust]: brightness, blind, volume, temperature). Back closes the panel and focus goes back to
// the tile that opened it.
import { esc, num, plural, wIcon, WEATHER_PL, ALERT_WORD, CALM_WORD, HOUR_FMT, DAY_FMT, fmtTime, ago, isNum } from "../model/format.js";
import { icon } from "./icons.js";
import { mediaArt, camUrl, ring } from "./home.js";
import { WALLPAPERS, currentWallpaper } from "./wallpapers.js";
import { ACCENTS, currentAccent } from "./accents.js";
import { prefs } from "./prefs.js";

const F = { PAUSE: 1, VOLUME_SET: 4, VOLUME_MUTE: 8, PREVIOUS: 16, NEXT: 32, TURN_ON: 128, TURN_OFF: 256, VOLUME_STEP: 1024, PLAY: 16384 };

const shell = (cls, head, body, side = "") => `<div class="panel-wrap ${side}"><aside class="panel ${cls}">${head}
  <div class="panel-view"><div class="panel-body" data-scroll="fit">${body}</div></div></aside></div>`;
const head = (ic, title, sub, lime, extra = "") => `<header class="p-head"><div class="ic ${lime ? "lime" : ""}">${icon(ic)}</div>
  <div class="p-title"><h1>${esc(title)}</h1>${sub ? `<div class="sub">${sub}</div>` : ""}</div>${extra}</header>`;
// The gear in the summary's header: ↑ from the first row reaches it (its line is "top", so a panel never opens on it).
const gear = `<div class="p-tools" data-line="top"><div class="p-gear" data-f="settings" data-act="settings">${icon("mdi:cog-outline")}</div></div>`;
const line = (key, items) => `<div class="p-line" data-line="${esc(key)}">${items}</div>`;
// One list row. `value` sits on the right; `bar` (0–100) draws the thin bar along the bottom edge.
const row = ({ key, act, attrs = "", ic, icOn, title, sub, value = "", bar, adjust, cls = "" }) => line(key,
  `<div class="p-row ${cls}" data-f="${esc(key)}" data-act="${act || "none"}" ${adjust ? `data-adjust="${adjust}"` : ""} ${attrs}>
    <div class="ic ${icOn ? "lime" : ""}">${icon(ic)}</div>
    <div class="t"><b>${esc(title)}</b>${sub ? `<span>${sub}</span>` : ""}</div>
    ${value !== "" ? `<div class="v">${adjust ? icon("mdi:chevron-left", "chev") : ""}<b>${value}</b>${adjust ? icon("mdi:chevron-right", "chev") : ""}</div>` : ""}
    ${bar != null ? `<i class="rbar"><i style="width:${Math.max(0, Math.min(100, bar))}%"></i></i>` : ""}</div>`);

export function renderPanel(h, p, ctx) {
  if (!p) return "";
  if (p.type === "room") return roomPanel(h, p, ctx);
  if (p.type === "media") return mediaPanel(h, p, ctx);
  if (p.type === "weather") return weatherPanel(h, ctx);
  if (p.type === "climate") return climatePanel(h, ctx);
  if (p.type === "entity") return p.kind === "binary" ? binaryPanel(h, p, ctx) : numericPanel(h, p, ctx);
  if (p.type === "instances") return instancesPanel(ctx);
  if (p.type === "summary") return summaryPanel(h, ctx);
  if (p.type === "attn") return attnPanel(h, p, ctx);
  if (p.type === "device") return devicePanel(h, p);
  if (p.type === "settings") return settingsPanel();
  if (p.type === "wallpapers") return wallpapersPanel();
  if (p.type === "accents") return accentsPanel();
  return "";
}

// --- room -----------------------------------------------------------------------------------------
const dimmable = (st) => (st?.attributes.supported_color_modes || []).some((m) => m !== "onoff");

function roomPanel(h, p, ctx) {
  const r = h.rooms()[p.room];
  if (!r) return "";
  const s = h.roomSummary(r);
  const sub = [s.t != null && `${num(s.t)}°`, s.h != null && `wilgotność ${Math.round(s.h)}%`].filter(Boolean).join(" · ");
  const rows = [];
  if (s.lights.length) rows.push(row({ key: "power", act: "room-power", attrs: `data-room="${p.room}"`,
    ic: s.on ? "mdi:lightbulb-off-outline" : "mdi:lightbulb-on-outline", title: s.on ? "Wyłącz wszystkie" : "Włącz wszystkie",
    sub: esc(s.sub) }));
  for (const x of r.lights || []) {
    const id = typeof x === "string" ? x : x.entity, st = h.st(id), on = st?.state === "on", off = !st || st.state === "unavailable";
    const want = ctx.pending[id]?.value, dim = dimmable(st);
    const pct = want ?? (on ? Math.round(((st.attributes.brightness ?? 255) / 255) * 100) : 0), lit = want != null ? want > 0 : on;
    rows.push(row({ key: `light:${id}`, act: "light", attrs: `data-entity="${esc(id)}"`, adjust: dim && !off ? "bright" : "",
      ic: lit ? "mdi:lightbulb" : "mdi:lightbulb-outline", icOn: lit, title: h.name(x), cls: `${lit ? "on" : ""} ${off ? "off" : ""}`,
      sub: off ? "Niedostępne" : lit ? "Włączone" : "Wyłączone", value: off ? "" : dim ? (lit ? `${pct}%` : "0%") : lit ? "Wł." : "Wył.",
      bar: dim && !off ? pct : null }));
  }
  for (const x of r.covers || []) {
    const id = typeof x === "string" ? x : x.entity, st = h.st(id);
    const pos = ctx.pending[id]?.value ?? Number(st?.attributes.current_position ?? (st?.state === "open" ? 100 : 0));
    rows.push(row({ key: `cover:${id}`, act: "cover", attrs: `data-entity="${esc(id)}"`, adjust: "cover",
      ic: pos > 0 ? "mdi:blinds-open" : "mdi:blinds", icOn: pos > 0, title: h.name(x), cls: pos > 0 ? "on" : "",
      sub: pos > 0 ? "Otwarta" : "Zamknięta", value: `${pos}%`, bar: pos }));
  }
  for (const [i, d] of (r.devices || []).entries()) {
    const active = h.on(d.active), bat = h.val(d.battery);
    rows.push(row({ key: `dev:${i}`, ic: d.icon || "mdi:laptop", icOn: active, title: d.name || h.name(d.active),
      sub: active ? "Aktywny" : "Uśpiony", value: bat != null ? `${Math.round(bat)}%` : "" }));
  }
  return shell("", head(r.icon || "mdi:home-outline", r.name, esc(sub), s.on > 0), rows.join("") || `<div class="p-empty">Brak urządzeń w tym pokoju</div>`);
}

// --- media ----------------------------------------------------------------------------------------
function mediaPanel(h, p, ctx) {
  const m = h.mediaItems()[p.media];
  if (!m) return "";
  const f = m.src?.attributes.supported_features || 0, tvf = m.features;
  const btn = (key, ic, act, extra = "") => `<div class="btn round" data-f="${key}" data-act="${act}" ${extra}>${icon(ic)}</div>`;
  const transport = m.active ? [
    f & F.PREVIOUS && btn("prev", "mdi:skip-previous", "media-cmd", `data-cmd="media_previous_track" data-entity="${esc(m.id)}"`),
    (f & (F.PAUSE | F.PLAY)) && btn("play", m.playing ? "mdi:pause" : "mdi:play", "media-cmd", `data-cmd="media_play_pause" data-entity="${esc(m.id)}"`),
    f & F.NEXT && btn("next", "mdi:skip-next", "media-cmd", `data-cmd="media_next_track" data-entity="${esc(m.id)}"`),
  ].filter(Boolean).join("") : "";
  const vol = ctx.pending[m.tv]?.value ?? Math.round((m.volume ?? 0) * 100);
  const pct = m.duration ? (h.mediaPosition(m) / m.duration) * 100 : 0;
  const rows = [
    transport && line("transport", `<div class="transport">${transport}</div>`),
    m.on && (tvf & (F.VOLUME_SET | F.VOLUME_STEP)) && row({ key: "volume", act: tvf & F.VOLUME_MUTE ? "mute" : "none",
      attrs: `data-entity="${esc(m.tv)}"`, adjust: "volume", ic: m.muted ? "mdi:volume-off" : "mdi:volume-high", title: "Głośność",
      sub: m.muted ? "Wyciszone · OK włącza dźwięk" : "OK wycisza", value: String(vol), bar: vol }),
    (tvf & (F.TURN_ON | F.TURN_OFF)) && row({ key: "power", act: "media-power", attrs: `data-entity="${esc(m.tv)}" data-on="${m.on ? 1 : 0}"`,
      ic: "mdi:power", icOn: m.on, title: m.on ? "Wyłącz" : "Włącz", sub: m.on ? "Włączony" : "Wyłączony" }),
  ].filter(Boolean).join("");
  const top = `<header class="p-head np">${mediaArt(m, true)}<div class="np-text">
    <div class="kicker">${esc(m.app || m.name)}</div><h1>${esc(m.active ? m.title : m.name)}</h1>
    <div class="sub">${esc(m.active ? m.artist || (m.playing ? "Odtwarza" : "Wstrzymane") : m.on ? m.input || "Włączony" : "Wyłączony")}</div>
    ${m.active && m.duration ? `<div class="pbar"><i style="width:${pct.toFixed(1)}%" data-progress="${p.media}"></i></div>
      <div class="times"><span data-elapsed="${p.media}">${fmtTime(h.mediaPosition(m))}</span><span>${fmtTime(m.duration)}</span></div>` : ""}
  </div></header>`;
  return shell("media-panel", top, rows || `<div class="p-empty">Brak sterowania dla tego urządzenia</div>`);
}

// --- weather: a wide view -------------------------------------------------------------------------
const WIND_DIR = ["Pn", "Pn-Wsch", "Wsch", "Pd-Wsch", "Pd", "Pd-Zach", "Zach", "Pn-Zach"];
const TIME_FMT = new Intl.DateTimeFormat("pl-PL", { hour: "2-digit", minute: "2-digit" });

const wet = (x) => Number(x.precipitation) >= 0.1 || /rain|pour|snow|hail|lightning/.test(x.condition || "");
const snowy = (x) => /snow/.test(x.condition || "");
const nightAt = (d) => { const hr = new Date(d).getHours(); return hr < 6 || hr >= 20; };
const mm = (v) => `${num(v, v < 10 ? 1 : 0)} mm`;

// One sentence on rain for the next hours, like the weather apps: when it starts, or when it stops.
function rainLine(hours) {
  const next = hours.slice(0, 12);
  if (!next.length) return "";
  const at = (x) => HOUR_FMT.format(new Date(x.datetime));
  if (wet(next[0])) {
    const dry = next.findIndex((x) => !wet(x));
    if (dry > 0 && next.slice(dry).some(wet)) return `Przelotne ${snowy(next[0]) ? "opady śniegu" : "opady"} w najbliższych godzinach`;
    return dry < 0 ? `${snowy(next[0]) ? "Śnieg" : "Opady"} przez najbliższe godziny` : `${snowy(next[0]) ? "Śnieg" : "Opady"} do ok. ${at(next[dry])}`;
  }
  const first = next.find(wet);
  return first ? `${snowy(first) ? "Śnieg" : "Deszcz"} od ok. ${at(first)}` : `Bez opadów do ${at(next[next.length - 1])}`;
}

// The next 24 hours in 12 columns: hour, icon, temperature, and under them one smooth temperature line with the rain as
// blue bars. The SVG is drawn at its real size (no stretching), so the line and dots stay round.
function hourStrip(hours) {
  const cols = hours.filter((_, i) => i % 2 === 0).slice(0, 12);
  if (cols.length < 2) return "";
  const W = 816, H = 96, cw = W / cols.length, ts = cols.map((x) => x.temperature);
  const lo = Math.min(...ts), hi = Math.max(...ts), span = Math.max(2, hi - lo);
  const P = cols.map((x, i) => [cw * (i + .5), 14 + (1 - (x.temperature - lo) / span) * 46]);
  // Catmull-Rom through the points, as cubic Béziers.
  let d = `M${P[0][0].toFixed(1)},${P[0][1].toFixed(1)}`;
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[i - 1] || P[i], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] || p2;
    d += `C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)},${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)},${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  const area = `${d}L${P[P.length - 1][0].toFixed(1)},${H}L${P[0][0].toFixed(1)},${H}Z`;
  const rain = cols.map((x, i) => {
    const v = Math.min(1, Number(x.precipitation || 0) / 2), h = v > 0 ? Math.max(4, v * 30) : 0;
    return h ? `<rect x="${(cw * (i + .5) - 14).toFixed(1)}" y="${(H - h).toFixed(1)}" width="28" height="${h.toFixed(1)}" rx="5" class="rain"/>` : "";
  }).join("");
  const dots = P.map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" class="tdot"/>`).join("");
  const head = cols.map((x, i) => `<div class="hc"><span>${i === 0 ? "Teraz" : new Date(x.datetime).getHours()}</span>
    ${icon(wIcon(x.condition, nightAt(x.datetime)))}<b>${Math.round(x.temperature)}°</b></div>`).join("");
  const foot = cols.map((x) => `<div class="hc-r">${Number(x.precipitation) >= 0.1 ? num(x.precipitation, 1) : ""}</div>`).join("");
  return `<div class="hstrip"><div class="hcols">${head}</div>
    <svg class="hcurve" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs><linearGradient id="hg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" style="stop-color:var(--lime);stop-opacity:.28"/><stop offset="1" style="stop-color:var(--lime);stop-opacity:0"/></linearGradient></defs>
      <path d="${area}" fill="url(#hg)"/>${rain}<path d="${d}" class="tline"/>${dots}</svg>
    <div class="hcols rainrow">${foot}</div></div>`;
}

function weatherPanel(h, ctx) {
  const w = h.weatherNow(), a = w.w?.attributes || {}, [cond] = WEATHER_PL[w.cond] || [""], fc = ctx.forecast;
  const now = Date.now(), hours = (fc?.hourly || []).filter((x) => new Date(x.datetime) > now - 3600e3).slice(0, 24);
  const sun = h.st("sun.sun")?.attributes || {};
  const air = h.air(), alert = h.weatherAlert(), days = (fc?.daily || []).slice(0, 7), today = days[0];
  const sky = w.night ? "night" : /snow/.test(w.cond || "") ? "snow" : /rain|pour|hail|lightning/.test(w.cond || "") ? "rain"
    : /cloud|fog/.test(w.cond || "") ? "cloud" : "sun";
  const feels = isNum(a.apparent_temperature) ? Math.round(a.apparent_temperature) : null;
  const rainNow = rainLine(hours);
  const hero = `<div class="wx-hero sky-${sky}">
    <div class="wh-top"><span>${esc(h.c.weather_name || h.name(h.weatherId()) || "Teraz")}</span>${icon(wIcon(w.cond, w.night))}</div>
    <b class="wh-temp">${w.temp != null ? Math.round(w.temp) + "°" : "–"}</b>
    <div class="wh-cond">${esc(cond)}</div>
    <div class="wh-hl">${today ? `Maks. ${Math.round(today.temperature)}° · Min. ${Math.round(today.templow ?? today.temperature)}°` : ""}${feels != null ? `${today ? " · " : ""}odczuwalna ${feels}°` : ""}</div>
    ${rainNow ? `<div class="wh-rain">${icon(/Bez/.test(rainNow) ? "mdi:weather-cloudy-clock" : "mdi:umbrella-outline")}${esc(rainNow)}</div>` : ""}</div>`;
  const tile = (ic, label, value, sub, extra = "") => (value == null ? "" : `<div class="wtile">
    <div class="wt-l">${icon(ic, "", extra)}${label}</div><b>${value}</b><small>${sub || "&nbsp;"}</small></div>`);
  const dir = isNum(a.wind_bearing) ? WIND_DIR[Math.round(Number(a.wind_bearing) / 45) % 8] : "";
  const p0 = hours[0]?.pressure, p6 = hours[6]?.pressure, dp = isNum(p0) && isNum(p6) ? p6 - p0 : null;
  const dayLen = sun.next_rising && sun.next_setting ? (() => {
    const up = new Date(sun.next_rising), down = new Date(sun.next_setting);
    if (down < up) up.setDate(up.getDate() - 1);
    const m = Math.round((down - up) / 60000);
    return m > 0 && m < 1440 ? `dzień ${Math.floor(m / 60)} h ${m % 60} min` : "";
  })() : "";
  const tiles = [
    tile("mdi:navigation", "Wiatr", isNum(a.wind_speed) ? `${Math.round(a.wind_speed)} <i>${esc(a.wind_speed_unit || "km/h")}</i>` : null,
      [dir, isNum(a.wind_gust_speed) && `porywy ${Math.round(a.wind_gust_speed)}`].filter(Boolean).join(" · "),
      isNum(a.wind_bearing) ? `style="transform:rotate(${(Number(a.wind_bearing) + 180) % 360}deg)"` : ""),
    tile("mdi:water-percent", "Wilgotność", isNum(a.humidity) ? `${Math.round(a.humidity)}%` : null, isNum(a.cloud_coverage) ? `zachmurzenie ${Math.round(a.cloud_coverage)}%` : ""),
    tile("mdi:gauge", "Ciśnienie", isNum(a.pressure) ? `${Math.round(a.pressure)} <i>${esc(a.pressure_unit || "hPa")}</i>` : null,
      dp == null ? "" : Math.abs(dp) < 1 ? "stałe" : dp > 0 ? "rośnie" : "spada"),
    tile("mdi:weather-sunset", "Słońce", sun.next_rising && sun.next_setting ? `${TIME_FMT.format(new Date(sun.next_rising))}<i> – </i>${TIME_FMT.format(new Date(sun.next_setting))}` : null, dayLen),
    air && tile("mdi:leaf", "Powietrze", esc(air.label.replace(/^./, (c) => c.toUpperCase())), air.pm10 != null ? `PM10 ${air.pm10} µg/m³` : ""),
    hours.length && tile("mdi:water", "Opady", mm(hours.reduce((t, x) => t + Number(x.precipitation || 0), 0)), "w ciągu 24 godzin"),
    isNum(a.uv_index) && tile("mdi:sun-wireless-outline", "UV", num(a.uv_index, 0), ""),
  ].filter(Boolean).join("");
  const lo = Math.min(...days.map((d) => d.templow ?? d.temperature)), hi = Math.max(...days.map((d) => d.temperature)), span = Math.max(1, hi - lo);
  const daily = days.map((d, i) => line(`day:${i}`, `<div class="p-row day" data-f="day:${i}" data-act="none">
      <span class="dn">${i === 0 ? "Dziś" : esc(DAY_FMT.format(new Date(d.datetime)))}</span>${icon(wIcon(d.condition))}
      <span class="pp">${Number(d.precipitation) >= 0.1 ? `${icon("mdi:water")}${mm(Number(d.precipitation))}` : ""}</span>
      <span class="lo">${Math.round(d.templow ?? d.temperature)}°</span>
      <div class="range"><i style="left:${(((d.templow ?? d.temperature) - lo) / span) * 100}%;right:${100 - ((d.temperature - lo) / span) * 100}%"></i></div>
      <span class="hi">${Math.round(d.temperature)}°</span></div>`)).join("");
  const left = `<div class="wx-left">${hero}
    ${alert ? `<div class="wx-alert">${icon("mdi:alert")}Ostrzeżenie IMGW: <b>${esc(alert)}</b></div>` : ""}
    <div class="wtiles">${tiles}</div></div>`;
  const right = `<div class="wx-right">
    <div class="wx-sec">Najbliższe 24 godziny</div>
    ${hours.length ? hourStrip(hours) : `<div class="p-empty">${fc ? "Brak prognozy godzinowej" : "Wczytuję prognozę…"}</div>`}
    <div class="wx-sec">${days.length ? `Prognoza na ${days.length} ${plural(days.length, "dzień", "dni", "dni")}` : ""}</div>${daily}</div>`;
  return `<div class="panel-wrap"><aside class="panel weather-panel">
    <div class="panel-view"><div class="panel-body wx-cols" data-scroll="fit">${left}${right}</div></div></aside></div>`;
}

// --- climate --------------------------------------------------------------------------------------
function climatePanel(h, ctx) {
  const th = h.thermo(), avg = h.indoorAverage();
  if (th && ctx.pending[th.id]) th.target = ctx.pending[th.id].value;
  const rows = [];
  if (th) {
    rows.push(row({ key: "target", adjust: th.on ? "temp" : "", ic: th.heating ? "mdi:fire" : "mdi:thermostat", icOn: th.heating,
      title: th.on ? th.status : "Ogrzewanie wyłączone", sub: isFinite(th.current) ? `Teraz ${num(th.current)}°` : "",
      value: th.on ? `${num(th.target)}°` : "", cls: th.heating ? "on" : "" }));
    rows.push(row({ key: "mode", act: "thermo-power", attrs: `data-on="${th.on ? 1 : 0}"`, ic: "mdi:power", icOn: th.on,
      title: th.on ? "Wyłącz ogrzewanie" : "Włącz ogrzewanie" }));
  }
  // Each sensor is its own tile (three to a line); OK opens that room's last 24 h.
  const cards = h.climateSensors().map((x, i) => {
    const main = x.temperature || x.humidity, second = x.temperature && x.humidity ? x.humidity : "";
    return `<div class="sensor ${x.outdoor ? "out" : ""}" data-f="sensor:${i}" data-act="entity" data-kind="numeric"
      data-entity="${esc(main)}" data-entity2="${esc(second)}" data-name="${esc(x.name)}" data-icon="${esc(x.icon || "mdi:thermometer")}">
      <div class="sn">${icon(x.icon || "mdi:thermometer")}${esc(x.name)}</div><b>${x.t != null ? num(x.t) + "°" : "–"}</b>
      <span>${x.h != null ? `${Math.round(x.h)}%${!x.outdoor && x.h >= 65 ? " · wilgotno" : !x.outdoor && x.h < 35 ? " · sucho" : ""}` : "&nbsp;"}</span></div>`;
  });
  const grid = [];
  for (let i = 0; i < cards.length; i += 3) grid.push(line(`sensors:${i}`, `<div class="sensors">${cards.slice(i, i + 3).join("")}</div>`));
  return shell("wide", head("mdi:thermometer", "Klimat", avg != null ? `Średnio ${num(avg)}° w domu` : "", true),
    rows.join("") + grid.join(""));
}

// --- one sensor: its last 24 h -----------------------------------------------------------------------
const HM = new Intl.DateTimeFormat("pl-PL", { hour: "2-digit", minute: "2-digit" });
const dur = (ms) => {
  const m = Math.round(ms / 60000);
  return m < 1 ? "<1 min" : m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}`;
};
// A time of day, with "wczoraj" in front when it was not today.
const when = (t) => `${new Date(t).toDateString() === new Date().toDateString() ? "" : "wczoraj "}${HM.format(new Date(t))}`;
const EVENT_NOUN = { door: ["otwarcie", "otwarcia", "otwarć"], window: ["otwarcie", "otwarcia", "otwarć"],
  opening: ["otwarcie", "otwarcia", "otwarć"], garage_door: ["otwarcie", "otwarcia", "otwarć"],
  moisture: ["wykrycie wody", "wykrycia wody", "wykryć wody"], motion: ["ruch", "ruchy", "ruchów"] };
const histKey = (p) => [p.entity, p.entity2].filter(Boolean).join(",");
const loading = (hist) => (!hist ? `<div class="p-empty">Wczytuję historię z ostatnich 24 godzin…</div>`
  : hist.error ? `<div class="p-empty">Nie udało się wczytać historii</div>` : "");
// Hour marks every 6 h under a 24 h axis.
const hourTicks = (start, end, W) => {
  let out = "";
  const first = new Date(start); first.setMinutes(0, 0, 0); first.setHours(Math.ceil(first.getHours() / 6) * 6);
  for (let t = first.getTime(); t <= end; t += 6 * 3600e3) {
    const x = ((t - start) / (end - start)) * W;
    out += `<line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="0" y2="100%" class="tick"/><text x="${x.toFixed(1)}" y="99%" class="tickl">${HM.format(new Date(t))}</text>`;
  }
  return out;
};

function binaryPanel(h, p, ctx) {
  const st = h.st(p.entity), dc = st?.attributes.device_class, on = st?.state === "on";
  const off = !st || ["unavailable", "unknown"].includes(st.state);
  const word = off ? "niedostępny" : on ? ALERT_WORD[dc] || "uwaga" : CALM_WORD[dc] || "w porządku";
  const hist = ctx.hist[histKey(p)], noun = EVENT_NOUN[dc] || ["zdarzenie", "zdarzenia", "zdarzeń"];
  const sub = `${esc(word)}${st?.last_changed ? ` od ${HM.format(new Date(st.last_changed))}` : ""}`;
  let body = loading(hist);
  if (!body) {
    // "On" spells (open, wet) within the window, from the state changes.
    const pts = hist.data[p.entity] || [], spells = [];
    pts.forEach((x, i) => {
      if (x.s !== "on") return;
      const from = Math.max(x.t, hist.start), to = pts[i + 1]?.t ?? Date.now();
      if (to > hist.start) spells.push({ from, to, ongoing: !pts[i + 1] });
    });
    const total = spells.reduce((a, x) => a + (x.to - x.from), 0), W = 1000, span = Date.now() - hist.start;
    const bars = spells.map((x) => `<rect x="${(((x.from - hist.start) / span) * W).toFixed(1)}" width="${Math.max(3, ((x.to - x.from) / span) * W).toFixed(1)}" y="8" height="44" rx="6" class="on"/>`).join("");
    const last = spells[spells.length - 1];
    body = `<div class="stl">
        <svg class="tl24" viewBox="0 0 ${W} 86" preserveAspectRatio="none"><rect x="0" y="8" width="${W}" height="44" rx="10" class="bg"/>${bars}${hourTicks(hist.start, Date.now(), W)}</svg></div>
      <div class="sstats">
        <div><span>Ostatnie 24 h</span><b>${spells.length ? `${spells.length} ${plural(spells.length, ...noun)}` : `Bez ${noun[2]}`}</b></div>
        <div><span>Łącznie</span><b>${spells.length ? dur(total) : "–"}</b></div>
        <div><span>Ostatnio</span><b>${last ? `${when(last.from)}${last.ongoing ? " · trwa" : ""}` : "ponad dobę temu"}</b></div>
      </div>
      ${spells.length ? `<div class="wx-sec">Zdarzenia</div>` : ""}
      ${spells.slice(-12).reverse().map((x, i) => row({ key: `ev:${i}`, ic: on && x.ongoing ? "mdi:alert-circle" : "mdi:history",
        icOn: false, cls: x.ongoing ? "alert" : "", title: x.ongoing ? `Od ${when(x.from)}` : `${when(x.from)} – ${HM.format(new Date(x.to))}`,
        sub: x.ongoing ? `${esc(ALERT_WORD[dc] || "aktywne")} · trwa` : esc(ALERT_WORD[dc] || "aktywne"), value: dur(x.to - x.from) })).join("")}`;
  }
  return shell("", head(on ? "mdi:shield-alert-outline" : off ? "mdi:shield-off-outline" : "mdi:shield-check-outline",
    p.name || h.name(p.entity), sub, !on && !off), body);
}

function numericPanel(h, p, ctx) {
  const hist = ctx.hist[histKey(p)], t = h.val(p.entity), hu = p.entity2 ? h.val(p.entity2) : null;
  const unit = h.st(p.entity)?.attributes.unit_of_measurement || "", isT = /°/.test(unit) || /temp/.test(p.entity);
  const fmt = (v) => (v == null ? "–" : isT ? `${num(v)}°` : `${Math.round(v)}${unit === "%" ? "%" : ` ${unit}`}`);
  const sub = [t != null && fmt(t), hu != null && `wilgotność ${Math.round(hu)}%`].filter(Boolean).join(" · ");
  let body = loading(hist);
  if (!body) {
    const series = (id) => (hist.data[id] || []).map((x) => ({ t: x.t, v: Number(x.s) })).filter((x) => isFinite(x.v));
    const a = series(p.entity), b = p.entity2 ? series(p.entity2) : [], W = 1000, H = 300, start = hist.start, end = Date.now();
    const line = (pts, cls) => {
      if (pts.length < 2) return "";
      const lo = Math.min(...pts.map((x) => x.v)), hi = Math.max(...pts.map((x) => x.v)), pad = Math.max(.5, (hi - lo) * .15);
      const X = (x) => Math.max(0, ((x.t - start) / (end - start)) * W), Y = (v) => 24 + (1 - (v - lo + pad) / (hi - lo + 2 * pad)) * (H - 70);
      const d = pts.map((x, i) => `${i ? "L" : "M"}${X(x).toFixed(1)},${Y(x.v).toFixed(1)}`).join("") + `L${W},${Y(pts[pts.length - 1].v).toFixed(1)}`;
      return `<path d="${d}" class="${cls}"/>`;
    };
    const stats = (pts) => {
      if (!pts.length) return null;
      const mn = pts.reduce((m, x) => (x.v < m.v ? x : m)), mx = pts.reduce((m, x) => (x.v > m.v ? x : m));
      return { mn, mx, avg: pts.reduce((s2, x) => s2 + x.v, 0) / pts.length, first: pts[0].v };
    };
    const sa = stats(a);
    const delta = sa && t != null ? t - sa.first : null;
    body = `<div class="nchart"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${hourTicks(start, end, W)}${line(b, "hum")}${line(a, "tmp")}</svg>
        <div class="legend"><span class="tmp">${isT ? "Temperatura" : "Wartość"}</span>${b.length ? `<span class="hum">Wilgotność</span>` : ""}</div></div>
      ${sa ? `<div class="sstats">
        <div><span>Najniżej · ${HM.format(new Date(sa.mn.t))}</span><b>${fmt(sa.mn.v)}</b></div>
        <div><span>Najwyżej · ${HM.format(new Date(sa.mx.t))}</span><b>${fmt(sa.mx.v)}</b></div>
        <div><span>Średnio</span><b>${fmt(sa.avg)}</b></div>
        <div><span>Od wczoraj</span><b>${delta == null ? "–" : `${delta > 0 ? "+" : delta < 0 ? "−" : ""}${isT ? num(Math.abs(delta)) + "°" : Math.round(Math.abs(delta))}`}</b></div>
      </div>` : `<div class="p-empty">Brak zapisanych pomiarów z ostatniej doby</div>`}`;
  }
  return shell("wide", head(p.icon || "mdi:thermometer", p.name || h.name(p.entity), sub, true), body);
}

// --- summary, from the left: notifications, what needs attention, the house at a glance ----------------------
// What the left edge shows as a count: notifications plus things that need doing.
// What waits, less what the user hid on this TV. Keys change when the thing changes (a new version, a sensor that
// closed and opened again), so a hidden item comes back by itself when it is news again.
const attnKey = { upd: (u) => `upd:${u.id}:${u.version}`, bat: (b) => `bat:${b.id}`, alarm: (a) => `alarm:${a.id}:${a.st?.last_changed || ""}` };
function attention(h, ctx) {
  const hid = ctx.hidden || {};
  return {
    notifs: Object.values(ctx.notifs || {}).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))),
    bats: h.lowBatteries(ctx.platforms).filter((b) => !hid[attnKey.bat(b)]),
    ups: h.updates().filter((u) => !hid[attnKey.upd(u)]),
    alerts: h.securityItems().filter((x) => x.alert && !hid[attnKey.alarm(x)]),
  };
}
export const attentionCount = (h, ctx) => { const a = attention(h, ctx); return a.notifs.length + a.bats.length + a.ups.length; };
export { attnKey };

function summaryPanel(h, ctx) {
  const { notifs, bats, ups, alerts } = attention(h, ctx);
  const strip = (t) => esc(String(t || "").replace(/[*_`#>]/g, "").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/\s+/g, " ").trim());
  // What needs doing: open sensors, notifications, batteries, updates. OK on any of them opens its actions (dismiss,
  // skip, hide). The section is left out when empty.
  const attn = (kind, x, key) => `data-kind="${kind}" data-id="${esc(x.id || x.notification_id)}" data-key="${esc(key)}"`;
  const todo = [
    ...alerts.map((a) => row({ key: `alarm:${a.id}`, act: "attn", attrs: `${attn("alarm", a, attnKey.alarm(a))} data-name="${esc(a.name)}"`,
      ic: "mdi:shield-alert-outline", cls: "alert", title: `${a.name} ${ALERT_WORD[a.dc] || "uwaga"}`, sub: `od ${ago(a.st.last_changed).replace(" temu", "")}` })),
    ...notifs.map((n) => row({ key: `notif:${n.notification_id}`, act: "attn", attrs: attn("notif", n, ""), cls: "notif",
      ic: "mdi:bell-outline", icOn: true, title: n.title || "Powiadomienie", sub: strip(n.message), value: n.created_at ? ago(n.created_at).replace(" temu", "") : "" })),
    ...bats.map((b) => row({ key: `bat:${b.id}`, act: "attn", attrs: attn("bat", b, attnKey.bat(b)), ic: b.value <= 5 ? "mdi:battery-alert-variant-outline" : "mdi:battery-low",
      cls: "warn", title: b.name, sub: "Słaba bateria", value: `${b.value}%` })),
    ...ups.map((u) => row({ key: `upd:${u.id}`, act: "attn", attrs: attn("upd", u, attnKey.upd(u)), ic: "mdi:package-up", title: u.name,
      sub: `Aktualizacja${u.version ? ` do ${esc(u.version)}` : ""}` })),
  ];
  // The house at a glance: compact cards, two to a line; OK does the obvious thing.
  const lit = h.lightsOn().length, rooms = h.roomsLit(), ppl = h.persons(), home = ppl.filter((p) => p.home);
  // Everything that plays, then everything that is on with an app open (a TV on Player): left/right on the card moves
  // between them (it never moves by itself).
  const media = h.mediaItems(), playing = [...media.filter((x) => x.active), ...media.filter((x) => !x.active && x.on && x.input)];
  const pi = playing.length ? (ctx.playIdx || 0) % playing.length : 0, m = playing[pi];
  const th = h.thermo(), waste = h.wasteDue(), wa = h.weatherAlert(), air = h.air();
  const card = (key, ic, label, value, sub, { act = "none", attrs = "", cls = "" } = {}) => `<div class="scard ${cls}" data-f="${key}" data-act="${act}" ${attrs}>
    <div class="ic">${icon(ic)}</div><span>${label}</span><b>${value}</b><small>${sub || "&nbsp;"}</small></div>`;
  const cards = [
    card("lights", lit ? "mdi:lightbulb-on-outline" : "mdi:lightbulb-off-outline", "Światła", lit ? `${lit} ${plural(lit, "włączone", "włączone", "włączonych")}` : "Wyłączone",
      lit ? `${esc(rooms.join(", "))} · OK gasi` : "Wszystkie zgaszone", { act: lit ? "all" : "none", attrs: `data-on="0"`, cls: lit ? "lit" : "" }),
    ppl.length && card("people", "mdi:account-group-outline", "Domownicy", `${home.length} z ${ppl.length} w domu`, esc(home.map((p) => p.name).join(", ") || "Nikogo")),
    th && card("heat", th.heating ? "mdi:fire" : "mdi:thermostat", "Ogrzewanie", th.on ? `${num(th.target)}°` : "Wyłączone",
      `${th.heating ? "Grzeje" : th.on ? "Utrzymuje" : ""}${isFinite(th.current) ? `${th.on ? " · " : ""}teraz ${num(th.current)}°` : ""}`, { act: "climate", cls: th.heating ? "lit" : "" }),
    ...h.working(true, ctx.hidden).map(({ kind, v, ap }) => kind === "vac"
      ? card("dev:vac", "mdi:robot-vacuum", esc(v.name), esc(v.label), esc(v.room || (v.battery != null ? `bateria ${Math.round(v.battery)}%` : "")), { act: "device", attrs: `data-dev="vac"`, cls: "lit" })
      : card(`dev:${ap.i}`, ap.icon, esc(ap.name), esc(ap.active && ap.left > 0 ? `${Math.round(ap.left)} min` : ap.label),
        esc(ap.active ? [ap.program, ap.pct != null ? `${Math.round(ap.pct)}%` : ""].filter(Boolean).join(" · ") : "OK, gdy wyjęte"),
        ap.active ? { act: "device", attrs: `data-dev="${ap.i}"`, cls: "lit" } : { act: "unload", attrs: `data-key="${esc(ap.doneKey)}" data-entity="${esc(ap.unloaded)}"` })),
    waste && card("waste", "mdi:trash-can-outline", `${waste.when} wywóz`, esc(waste.list[0]), esc(waste.list.slice(1).join(", "))),
    wa && card("wxalert", "mdi:alert", "Ostrzeżenie IMGW", esc(wa), "", { act: "weather", cls: "warn" }),
    air?.bad && card("air", "mdi:smog", "Powietrze", esc(air.label), "Lepiej nie wietrzyć", { act: "weather", cls: "warn" }),
  ].filter(Boolean);
  const grid = [];
  // What plays gets the whole width: its artwork, and a title that may take two lines.
  // A carousel: every player sits side by side in a strip that slides (transform only) to the one picked.
  if (m) grid.push(line("playing", `<div class="scard playing" data-f="playing" data-act="media" data-media="${media.indexOf(m)}"
    ${playing.length > 1 ? 'data-adjust="playing"' : ""}>
    <div class="pl-view"><div class="pl-track" style="transform:translateX(${-pi * 100}%)">${playing.map((x) => `<div class="pl-slide">
      ${mediaArt(x, false)}<div class="pl"><span>${x.active ? "Teraz gra" : "Włączone"} · ${esc(x.app || x.name)}</span>
      <b>${esc(x.active ? x.title : x.input || x.app)}</b><small>${esc([x.active ? x.artist : "", x.name].filter(Boolean).join(" · "))}</small></div></div>`).join("")}
    </div></div>
    ${playing.length > 1 ? `<div class="dots">${playing.map((_, i) => `<i class="${i === pi ? "on" : ""}"></i>`).join("")}</div>` : ""}</div>`));
  for (let i = 0; i < cards.length; i += 2) grid.push(line(`grid:${i}`, cards.slice(i, i + 2).join("")));
  const count = todo.length;
  return shell("summary", head(count ? "mdi:bell-ring-outline" : "mdi:check-circle-outline", "Podsumowanie",
      count ? `${count} ${plural(count, "sprawa wymaga", "sprawy wymagają", "spraw wymaga")} uwagi` : "Nic nie wymaga uwagi", !count, gear),
    (todo.length ? `<div class="wx-sec">Wymaga uwagi</div>${todo.join("")}` : "") + `<div class="wx-sec">Dom</div>${grid.join("")}`, "left");
}

// One item that needs attention, and what can be done about it.
function attnPanel(h, p, ctx) {
  if (p.kind === "notif") {
    const n = (ctx.notifs || {})[p.id];
    if (!n) return shell("", head("mdi:bell-check-outline", "Powiadomienie odrzucone", ""), `<div class="p-empty">Nie ma go już w Home Assistant.</div>`);
    const text = esc(String(n.message || "").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[*_`#>]/g, "")).replace(/\n/g, "<br>");
    return shell("", head("mdi:bell-outline", n.title || "Powiadomienie", n.created_at ? esc(ago(n.created_at)) : "", true),
      `<div class="p-note">${text}</div>` + row({ key: "dismiss", act: "notif-dismiss", attrs: `data-id="${esc(p.id)}"`, ic: "mdi:check", title: "Odrzuć",
        sub: "Znika też z Home Assistanta" }));
  }
  const rows = [];
  let ic = "mdi:alert-circle-outline", title = p.name || h.name(p.id), sub = "";
  if (p.kind === "upd") {
    const st = h.st(p.id), a = st?.attributes || {};
    ic = "mdi:package-up";
    title = a.title || a.friendly_name || p.id;
    sub = `${esc(a.installed_version || "?")} → ${esc(a.latest_version || "?")}`;
    rows.push(row({ key: "skip", act: "upd-skip", attrs: `data-entity="${esc(p.id)}"`, ic: "mdi:debug-step-over", title: "Pomiń tę wersję",
      sub: "Znika też z Home Assistanta, wróci przy następnej" }));
    rows.push(row({ key: "hide", act: "hide", attrs: `data-key="${esc(p.key)}"`, ic: "mdi:eye-off-outline", title: "Ukryj tylko tutaj", sub: "Do następnej wersji" }));
  } else if (p.kind === "bat") {
    ic = "mdi:battery-low";
    sub = `Bateria ${esc(h.st(p.id)?.state ?? "?")}%`;
    rows.push(row({ key: "hide", act: "hide", attrs: `data-key="${esc(p.key)}"`, ic: "mdi:eye-off-outline", title: "Ukryj do wymiany baterii",
      sub: "Wróci, gdy po wymianie znów będzie słaba" }));
  } else if (p.kind === "alarm") {
    const st = h.st(p.id);
    ic = "mdi:shield-alert-outline";
    sub = `${esc(ALERT_WORD[st?.attributes.device_class] || "uwaga")}${st?.last_changed ? ` od ${esc(ago(st.last_changed).replace(" temu", ""))}` : ""}`;
    rows.push(row({ key: "history", act: "entity", attrs: `data-kind="binary" data-entity="${esc(p.id)}" data-name="${esc(title)}"`, ic: "mdi:history",
      title: "Pokaż historię", sub: "Ostatnie 24 godziny" }));
    rows.push(row({ key: "hide", act: "hide", attrs: `data-key="${esc(p.key)}"`, ic: "mdi:eye-off-outline", title: "Ukryj, dopóki się nie zamknie",
      sub: "Wróci przy następnym otwarciu" }));
  }
  return shell("", head(ic, title, sub), rows.join(""));
}

// --- vacuum, washer, dishwasher ------------------------------------------------------------------------
// A big ring with what is left, the cycle's numbers as tiles, and the buttons the integration offers.
function devicePanel(h, p) {
  const stat = (ic, label, value, cls = "") => (value == null || value === "" ? "" : `<div class="wtile ${cls}">
    <div class="wt-l">${icon(ic)}${label}</div><b>${value}</b></div>`);
  if (p.dev === "vac") {
    const v = h.vacuum();
    if (!v) return "";
    const rows = [
      row({ key: "vac-go", act: "vac", attrs: `data-entity="${esc(v.id)}" data-cmd="${v.cleaning ? "pause" : "start"}"`, ic: v.cleaning ? "mdi:pause" : "mdi:play",
        icOn: !v.cleaning, title: v.cleaning ? "Wstrzymaj" : v.state === "paused" ? "Wznów sprzątanie" : "Sprzątaj", sub: v.cleaning ? "Zostaje tam, gdzie jest" : "Cały dom, jak w aplikacji" }),
      v.state !== "docked" && row({ key: "vac-home", act: "vac", attrs: `data-entity="${esc(v.id)}" data-cmd="return_to_base"`, ic: "mdi:home-import-outline",
        title: "Wróć do stacji", sub: "Kończy sprzątanie" }),
    ].filter(Boolean).join("");
    const tiles = [
      stat(v.charging ? "mdi:battery-charging" : "mdi:battery-outline", "Bateria", v.battery != null ? `${Math.round(v.battery)}%` : null),
      stat("mdi:map-marker-outline", "Pokój", esc(v.room)),
      stat("mdi:timer-outline", "Czas", v.time != null ? `${Math.round(v.time)} <i>${esc(v.timeUnit)}</i>` : null),
      stat("mdi:texture-box", "Powierzchnia", v.area != null ? `${Math.round(v.area)} <i>m²</i>` : null),
      stat("mdi:fan", "Ssanie", esc(v.suction)),
    ].join("");
    return shell("", head("mdi:robot-vacuum", v.name, esc(v.label), v.active),
      `<div class="dev-hero ${v.active ? "on" : ""}">${icon("mdi:robot-vacuum", "xl")}<div><b>${esc(v.label)}</b><span>${esc(v.room || (v.battery != null ? `Bateria ${Math.round(v.battery)}%` : ""))}</span></div></div>
      ${tiles ? `<div class="wtiles dev-tiles">${tiles}</div>` : ""}${rows}`);
  }
  const ap = h.appliances()[p.dev];
  if (!ap) return "";
  const rows = [
    ap.active && !ap.paused && ap.pause && row({ key: "pause", act: "press", attrs: `data-entity="${esc(ap.pause)}"`, ic: "mdi:pause", title: "Wstrzymaj", sub: "Cykl poczeka" }),
    ap.paused && ap.resume && row({ key: "resume", act: "press", attrs: `data-entity="${esc(ap.resume)}"`, ic: "mdi:play", icOn: true, title: "Wznów", sub: "Cykl rusza dalej" }),
    ap.done && row({ key: "unloaded", act: "unload", attrs: `data-key="${esc(ap.doneKey)}" data-entity="${esc(ap.unloaded)}"`, ic: "mdi:check", icOn: true,
      title: "Wyjęte", sub: "Znika z Podsumowania do następnego prania" }),
  ].filter(Boolean).join("");
  const pct = ap.active ? ap.pct : ap.done ? 100 : 0;
  const tiles = [
    stat("mdi:file-document-outline", "Program", esc(ap.program), "wide"),
    stat("mdi:water-sync", "Faza", esc(ap.phase)),
    stat("mdi:timer-outline", "Cały cykl", ap.total != null ? `${Math.round(ap.total)} <i>min</i>` : null),
    stat("mdi:flash-outline", "Moc", ap.power != null ? `${Math.round(ap.power)} <i>W</i>` : null),
    stat("mdi:counter", "Cykle", ap.cycles != null ? String(ap.cycles) : null),
  ].join("");
  return shell("", head(ap.icon, ap.name, esc([ap.label, ap.room].filter(Boolean).join(" · ")), ap.active || ap.done),
    `<div class="dev-hero ring-hero ${ap.active ? "on" : ap.done ? "done" : ""}"><div class="bigring">${ring(pct, 200)}
      <div>${ap.done && !ap.active ? icon("mdi:check-bold") : `<b>${pct != null ? Math.round(pct) : 0}%</b>`}</div></div>
      <div><b>${ap.active && ap.left > 0 ? `${Math.round(ap.left)} min` : esc(ap.label)}</b><span>${ap.active && ap.left > 0 ? "do końca" : esc(ap.room)}</span></div></div>
    ${tiles ? `<div class="wtiles dev-tiles">${tiles}</div>` : ""}${rows}`);
}

// --- settings ---------------------------------------------------------------------------------------
// One row per option, each opening its own panel; this TV's choices, kept in its storage.
function settingsPanel() {
  const w = currentWallpaper();
  const a = currentAccent(), p = prefs();
  const toggle = (key, ic, title, sub) => row({ key: `pref:${key}`, act: "pref", attrs: `data-key="${key}"`, ic, icOn: p[key], title, sub,
    value: p[key] ? "Włączone" : "Wyłączone", cls: p[key] ? "on" : "" });
  return shell("summary", head("mdi:cog-outline", "Ustawienia", "Na tym telewizorze"),
    `<div class="wx-sec">Wygląd</div>` + row({ key: "wallpaper", act: "wallpapers", ic: "mdi:image-outline", title: "Tapeta", sub: esc(w.sub), value: `${esc(w.name)} ${icon("mdi:chevron-right")}` })
    + row({ key: "accent", act: "accents", ic: "mdi:palette-outline", title: "Kolor akcentu", sub: "Ikony włączonych, postęp, zaznaczenia",
      value: `<i class="adot" style="background:${a.c}"></i>${esc(a.name)} ${icon("mdi:chevron-right")}` })
    + `<div class="wx-sec">Optymalizacja</div>`
    + toggle("frost", "mdi:blur", "Szronione szkło", "Kafle przepuszczają rozmytą tapetę; wyłączone są gładkie")
    + toggle("anim", "mdi:animation-outline", "Animacje", "Wysuwanie paneli, przejścia i powiększanie; wyłącz na słabszym TV"));
}

// Accents as swatches, three to a line; OK puts one on at once (this panel shows it straight away).
function accentsPanel() {
  const cur = currentAccent().id, cards = ACCENTS.map((a) => `<div class="acard ${a.id === cur ? "on" : ""}" data-f="ac:${a.id}" data-act="accent" data-id="${a.id}">
    <div class="aswatch" style="background:${a.c};color:${a.ink}">${a.id === cur ? icon("mdi:check-bold") : icon("mdi:lightbulb-on")}</div><b>${esc(a.name)}</b></div>`);
  const lines = [];
  for (let i = 0; i < cards.length; i += 3) lines.push(line(`ac:${i}`, cards.slice(i, i + 3).join("")));
  return shell("summary", head("mdi:palette-outline", "Kolor akcentu", "To, co się świeci i jest zaznaczone", true), `<div class="acgrid">${lines.join("")}</div>`);
}

// Wallpapers as previews, two to a line; OK puts one on at once (the screen behind the panel shows it).
function wallpapersPanel() {
  const cur = currentWallpaper().id;
  const card = (w) => `<div class="wcard ${w.id === cur ? "on" : ""}" data-f="wp:${w.id}" data-act="wallpaper" data-id="${w.id}">
    <div class="wprev" style="background:${w.preview || w.bg}">${w.id === cur ? `<span class="wcheck">${icon("mdi:check-bold")}</span>` : ""}</div>
    <b>${esc(w.name)}</b><span>${esc(w.sub)}</span></div>`;
  const grid = (key, list) => {
    const lines = [];
    for (let i = 0; i < list.length; i += 2) lines.push(line(`${key}:${i}`, list.slice(i, i + 2).map(card).join("")));
    return `<div class="wgrid">${lines.join("")}</div>`;
  };
  return shell("summary", head("mdi:image-outline", "Tapeta", "Tło całego ekranu"),
    `<div class="wx-sec">Zdjęcia</div>${grid("ph", WALLPAPERS.filter((w) => w.photo))}
     <div class="wx-sec">Kolory</div>${grid("gr", WALLPAPERS.filter((w) => !w.photo))}`);
}

// --- instances ------------------------------------------------------------------------------------
function instancesPanel(ctx) {
  const rows = ctx.instances.map((x) => row({ key: `inst:${x.id}`, act: "switch", attrs: `data-id="${esc(x.id)}"`, ic: "mdi:home-outline",
    icOn: x.id === ctx.instance?.id, cls: x.id === ctx.instance?.id ? "on" : "", title: x.name,
    sub: x.id === ctx.instance?.id ? "Teraz wyświetlany" : esc(x.url.replace(/^https?:\/\//, "")) }));
  return shell("", head("mdi:home-switch-outline", "Przełącz dom", "Inny serwer Home Assistant"), rows.join(""));
}

// --- camera, full screen --------------------------------------------------------------------------
// The picture fills the screen; a strip of all cameras runs along the bottom. Left/right move along the strip and the
// big picture follows at once; the strip hides after a few seconds without the remote and any key brings it back.
export function renderCamera(h, i, ui) {
  const cams = h.cameras(), cam = cams[i];
  if (!cam) return "";
  const thumbs = cams.map((c, j) => `<div class="cthumb ${j === i ? "cur" : ""}" data-f="camsel:${j}" data-act="camsel" data-cam="${j}">
    <img src="${esc(camUrl(h, c))}" alt="" decoding="async"><span>${esc(h.name(c))}</span></div>`).join("");
  return `<div class="camera-full ${ui.stripHidden ? "bare" : ""}">
    <div class="cam-stage" data-keep data-cam="${esc(cam.entity)}" data-preview="${esc(camUrl(h, cam))}" data-still="${esc(camUrl(h, cam, 0))}"></div>
    <div class="cam-top"><span class="live ${ui.live ? "on" : ""}"><i></i>${ui.live ? "Na żywo" : "Podgląd"}</span>${esc(h.name(cam))}</div>
    <div class="cam-strip" data-line="cams"><div class="track" data-track>${thumbs}</div></div></div>`;
}
