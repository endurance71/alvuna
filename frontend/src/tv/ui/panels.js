// Detail panels: a drawer from the right. Its header stays put; only the list below it scrolls. Every row
// has the same height and the same parts (icon, name, state, value on the right), and a thin bar for values set with
// left/right ([data-adjust]: brightness, blind, volume, temperature). Back closes the panel and focus goes back to
// the tile that opened it.
import { esc, num, wIcon, wxWord, alertWord, calmWord, time, shortDay, fmtTime, ago, age, since, isNum } from "../model/format.js";
import { t, table } from "../../shared/i18n.js";
import { icon } from "./icons.js";
import { mediaArt, camUrl, ring } from "./home.js";
import { WALLPAPERS, currentWallpaper } from "./wallpapers.js";
import { ACCENTS, currentAccent } from "./accents.js";
import { prefs, minutesFor } from "./prefs.js";

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
    ${bar != null ? `<i class="rbar"><i style="transform:scaleX(${(Math.max(0, Math.min(100, bar)) / 100).toFixed(3)})"></i></i>` : ""}</div>`);

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
  if (p.type === "settings") return settingsPanel(h, ctx);
  if (p.type === "addhome") return addHomePanel(ctx);
  if (p.type === "hold") return holdPanel(p);
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
  const sub = [s.t != null && `${num(s.t)}°`, s.h != null && t("tv.humidity_lc", { v: Math.round(s.h) })].filter(Boolean).join(" · ");
  const rows = [];
  if (s.lights.length) rows.push(row({ key: "power", act: "room-power", attrs: `data-room="${p.room}"`,
    ic: s.on ? "mdi:lightbulb-off-outline" : "mdi:lightbulb-on-outline", title: s.on ? t("home.all_off_btn") : t("home.all_on_btn"),
    sub: esc(s.sub) }));
  for (const x of r.lights || []) {
    const id = typeof x === "string" ? x : x.entity, st = h.st(id), on = st?.state === "on", off = !st || st.state === "unavailable";
    const want = ctx.pending[id]?.value, dim = dimmable(st);
    const pct = want ?? (on ? Math.round(((st.attributes.brightness ?? 255) / 255) * 100) : 0), lit = want != null ? want > 0 : on;
    rows.push(row({ key: `light:${id}`, act: "light", attrs: `data-entity="${esc(id)}"`, adjust: dim && !off ? "bright" : "",
      ic: lit ? "mdi:lightbulb" : "mdi:lightbulb-outline", icOn: lit, title: h.name(x), cls: `${lit ? "on" : ""} ${off ? "off" : ""}`,
      sub: off ? t("common.unavailable_n") : lit ? t("common.on_n") : t("common.off_n"), value: off ? "" : dim ? (lit ? `${pct}%` : "0%") : lit ? t("tv.on_short") : t("tv.off_short"),
      bar: dim && !off ? pct : null }));
  }
  for (const x of r.covers || []) {
    const id = typeof x === "string" ? x : x.entity, st = h.st(id);
    const pos = ctx.pending[id]?.value ?? Number(st?.attributes.current_position ?? (st?.state === "open" ? 100 : 0));
    rows.push(row({ key: `cover:${id}`, act: "cover", attrs: `data-entity="${esc(id)}"`, adjust: "cover",
      ic: pos > 0 ? "mdi:blinds-open" : "mdi:blinds", icOn: pos > 0, title: h.name(x), cls: pos > 0 ? "on" : "",
      sub: pos > 0 ? t("covers.open") : t("covers.closed"), value: `${pos}%`, bar: pos }));
  }
  for (const [i, d] of (r.devices || []).entries()) {
    const active = h.on(d.active), bat = h.val(d.battery);
    rows.push(row({ key: `dev:${i}`, ic: d.icon || "mdi:laptop", icOn: active, title: d.name || h.name(d.active),
      sub: active ? t("devices.active") : t("devices.asleep"), value: bat != null ? `${Math.round(bat)}%` : "" }));
  }
  return shell("", head(r.icon || "mdi:home-outline", r.name, esc(sub), s.on > 0), rows.join("") || `<div class="p-empty">${t("tv.room_empty")}</div>`);
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
      attrs: `data-entity="${esc(m.tv)}"`, adjust: "volume", ic: m.muted ? "mdi:volume-off" : "mdi:volume-high", title: t("media.volume"),
      sub: m.muted ? t("tv.media.muted_hint") : t("tv.media.mute_hint"), value: String(vol), bar: vol }),
    (tvf & (F.TURN_ON | F.TURN_OFF)) && row({ key: "power", act: "media-power", attrs: `data-entity="${esc(m.tv)}" data-on="${m.on ? 1 : 0}"`,
      ic: "mdi:power", icOn: m.on, title: m.on ? t("common.turn_off") : t("common.turn_on"), sub: m.on ? t("common.on_m") : t("common.off_m") }),
  ].filter(Boolean).join("");
  const top = `<header class="p-head np">${mediaArt(m, true)}<div class="np-text">
    <div class="kicker">${esc(m.app || m.name)}</div><h1>${esc(m.active ? m.title : m.name)}</h1>
    <div class="sub">${esc(m.active ? m.artist || (m.playing ? t("tv.media.playing") : t("media.paused")) : m.on ? m.input || t("common.on_m") : t("common.off_m"))}</div>
    ${m.active && m.duration ? `<div class="pbar"><i style="width:${pct.toFixed(1)}%" data-progress="${p.media}"></i></div>
      <div class="times"><span data-elapsed="${p.media}">${fmtTime(h.mediaPosition(m))}</span><span>${fmtTime(m.duration)}</span></div>` : ""}
  </div></header>`;
  return shell("media-panel", top, rows || `<div class="p-empty">${t("tv.media.no_controls")}</div>`);
}

// --- weather: a wide view -------------------------------------------------------------------------

const wet = (x) => Number(x.precipitation) >= 0.1 || /rain|pour|snow|hail|lightning/.test(x.condition || "");
const snowy = (x) => /snow/.test(x.condition || "");
const nightAt = (d) => { const hr = new Date(d).getHours(); return hr < 6 || hr >= 20; };
const mm = (v) => `${num(v, v < 10 ? 1 : 0)} mm`;

// One sentence on rain for the next hours, like the weather apps: when it starts, or when it stops. `dry`: no rain at all.
function rainLine(hours) {
  const next = hours.slice(0, 12);
  if (!next.length) return null;
  const at = (x) => time(new Date(x.datetime)), say = (key, x) => ({ text: t(`tv.rain.${key}`, x && { t: at(x) }), dry: key === "dry_until" });
  if (wet(next[0])) {
    const dry = next.findIndex((x) => !wet(x)), snow = snowy(next[0]);
    if (dry > 0 && next.slice(dry).some(wet)) return say(snow ? "showers_snow" : "showers");
    return dry < 0 ? say(snow ? "snow_on" : "rain_on") : say(snow ? "snow_until" : "rain_until", next[dry]);
  }
  const first = next.find(wet);
  return first ? say(snowy(first) ? "snow_from" : "rain_from", first) : say("dry_until", next[next.length - 1]);
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
  const head = cols.map((x, i) => `<div class="hc"><span>${i === 0 ? t("common.now") : new Date(x.datetime).getHours()}</span>
    ${icon(wIcon(x.condition, nightAt(x.datetime)))}<b>${Math.round(x.temperature)}°</b></div>`).join("");
  const foot = cols.map((x) => `<div class="hc-r">${Number(x.precipitation) >= 0.1 ? num(x.precipitation, 1) : ""}</div>`).join("");
  return `<div class="hstrip"><div class="hcols">${head}</div>
    <svg class="hcurve" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs><linearGradient id="hg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" style="stop-color:var(--lime);stop-opacity:.28"/><stop offset="1" style="stop-color:var(--lime);stop-opacity:0"/></linearGradient></defs>
      <path d="${area}" fill="url(#hg)"/>${rain}<path d="${d}" class="tline"/>${dots}</svg>
    <div class="hcols rainrow">${foot}</div></div>`;
}

function weatherPanel(h, ctx) {
  const w = h.weatherNow(), a = w.w?.attributes || {}, cond = wxWord(w.cond) || "", fc = ctx.forecast;
  const now = Date.now(), hours = (fc?.hourly || []).filter((x) => new Date(x.datetime) > now - 3600e3).slice(0, 24);
  const sun = h.st("sun.sun")?.attributes || {};
  const air = h.air(), alert = h.weatherAlert(), days = (fc?.daily || []).slice(0, 7), today = days[0];
  const sky = w.night ? "night" : /snow/.test(w.cond || "") ? "snow" : /rain|pour|hail|lightning/.test(w.cond || "") ? "rain"
    : /cloud|fog/.test(w.cond || "") ? "cloud" : "sun";
  const feels = isNum(a.apparent_temperature) ? Math.round(a.apparent_temperature) : null;
  const rainNow = rainLine(hours);
  const hero = `<div class="wx-hero sky-${sky}">
    <div class="wh-top"><span>${esc(h.c.weather_name || h.name(h.weatherId()) || t("common.now"))}</span>${icon(wIcon(w.cond, w.night))}</div>
    <b class="wh-temp">${w.temp != null ? Math.round(w.temp) + "°" : "–"}</b>
    <div class="wh-cond">${esc(cond)}</div>
    <div class="wh-hl">${today ? t("weather.high_low", { hi: Math.round(today.temperature), lo: Math.round(today.templow ?? today.temperature) }) : ""}${feels != null ? `${today ? " · " : ""}${t("tv.weather.feels", { t: feels })}` : ""}</div>
    ${rainNow ? `<div class="wh-rain">${icon(rainNow.dry ? "mdi:weather-cloudy-clock" : "mdi:umbrella-outline")}${esc(rainNow.text)}</div>` : ""}</div>`;
  const tile = (ic, label, value, sub, extra = "") => (value == null ? "" : `<div class="wtile">
    <div class="wt-l">${icon(ic, "", extra)}${label}</div><b>${value}</b><small>${sub || "&nbsp;"}</small></div>`);
  const dir = isNum(a.wind_bearing) ? table("weather.wind")[Math.round(Number(a.wind_bearing) / 45) % 8] : "";
  const p0 = hours[0]?.pressure, p6 = hours[6]?.pressure, dp = isNum(p0) && isNum(p6) ? p6 - p0 : null;
  const dayLen = sun.next_rising && sun.next_setting ? (() => {
    const up = new Date(sun.next_rising), down = new Date(sun.next_setting);
    if (down < up) up.setDate(up.getDate() - 1);
    const m = Math.round((down - up) / 60000);
    return m > 0 && m < 1440 ? t("tv.weather.day_length", { h: Math.floor(m / 60), m: m % 60 }) : "";
  })() : "";
  const tiles = [
    tile("mdi:navigation", t("weather.wind_label"), isNum(a.wind_speed) ? `${Math.round(a.wind_speed)} <i>${esc(a.wind_speed_unit || "km/h")}</i>` : null,
      [dir, isNum(a.wind_gust_speed) && t("tv.weather.gusts", { n: Math.round(a.wind_gust_speed) })].filter(Boolean).join(" · "),
      isNum(a.wind_bearing) ? `style="transform:rotate(${(Number(a.wind_bearing) + 180) % 360}deg)"` : ""),
    tile("mdi:water-percent", t("common.humidity"), isNum(a.humidity) ? `${Math.round(a.humidity)}%` : null, isNum(a.cloud_coverage) ? t("tv.weather.clouds", { n: Math.round(a.cloud_coverage) }) : ""),
    tile("mdi:gauge", t("weather.pressure"), isNum(a.pressure) ? `${Math.round(a.pressure)} <i>${esc(a.pressure_unit || "hPa")}</i>` : null,
      dp == null ? "" : Math.abs(dp) < 1 ? t("tv.weather.steady") : dp > 0 ? t("tv.weather.rising") : t("tv.weather.falling")),
    tile("mdi:weather-sunset", t("tv.weather.sun"), sun.next_rising && sun.next_setting ? `${time(new Date(sun.next_rising))}<i> – </i>${time(new Date(sun.next_setting))}` : null, dayLen),
    air && tile("mdi:leaf", t("weather.air_label"), esc(air.label.replace(/^./, (c) => c.toUpperCase())), air.pm10 != null ? `PM10 ${air.pm10} µg/m³` : ""),
    hours.length && tile("mdi:water", t("tv.weather.precip"), mm(hours.reduce((sum, x) => sum + Number(x.precipitation || 0), 0)), t("tv.weather.in_24h")),
    isNum(a.uv_index) && tile("mdi:sun-wireless-outline", "UV", num(a.uv_index, 0), ""),
  ].filter(Boolean).join("");
  const lo = Math.min(...days.map((d) => d.templow ?? d.temperature)), hi = Math.max(...days.map((d) => d.temperature)), span = Math.max(1, hi - lo);
  const daily = days.map((d, i) => line(`day:${i}`, `<div class="p-row day" data-f="day:${i}" data-act="none">
      <span class="dn">${i === 0 ? t("common.today") : esc(shortDay(new Date(d.datetime)))}</span>${icon(wIcon(d.condition))}
      <span class="pp">${Number(d.precipitation) >= 0.1 ? `${icon("mdi:water")}${mm(Number(d.precipitation))}` : ""}</span>
      <span class="lo">${Math.round(d.templow ?? d.temperature)}°</span>
      <div class="range"><i style="left:${(((d.templow ?? d.temperature) - lo) / span) * 100}%;right:${100 - ((d.temperature - lo) / span) * 100}%"></i></div>
      <span class="hi">${Math.round(d.temperature)}°</span></div>`)).join("");
  const left = `<div class="wx-left">${hero}
    ${alert ? `<div class="wx-alert">${icon("mdi:alert")}${t("weather.imgw_line")} <b>${esc(alert)}</b></div>` : ""}
    <div class="wtiles">${tiles}</div></div>`;
  const right = `<div class="wx-right">
    <div class="wx-sec">${t("tv.weather.next_24h")}</div>
    ${hours.length ? hourStrip(hours) : `<div class="p-empty">${fc ? t("tv.weather.no_hourly") : t("tv.weather.loading")}</div>`}
    <div class="wx-sec">${days.length ? t("tv.weather.forecast_days", { n: days.length }) : ""}</div>${daily}</div>`;
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
      title: th.on ? th.status : t("climate.heating_off"), sub: isFinite(th.current) ? t("common.now_value", { v: `${num(th.current)}°` }) : "",
      value: th.on ? `${num(th.target)}°` : "", cls: th.heating ? "on" : "" }));
    rows.push(row({ key: "mode", act: "thermo-power", attrs: `data-on="${th.on ? 1 : 0}"`, ic: "mdi:power", icOn: th.on,
      title: th.on ? t("tv.climate.turn_off") : t("tv.climate.turn_on") }));
  }
  // Each sensor is its own tile (three to a line); OK opens that room's last 24 h.
  const cards = h.climateSensors().map((x, i) => {
    const main = x.temperature || x.humidity, second = x.temperature && x.humidity ? x.humidity : "";
    return `<div class="sensor ${x.outdoor ? "out" : ""}" data-f="sensor:${i}" data-act="entity" data-kind="numeric"
      data-entity="${esc(main)}" data-entity2="${esc(second)}" data-name="${esc(x.name)}" data-icon="${esc(x.icon || "mdi:thermometer")}">
      <div class="sn">${icon(x.icon || "mdi:thermometer")}${esc(x.name)}</div><b>${x.t != null ? num(x.t) + "°" : "–"}</b>
      <span>${x.h != null ? `${Math.round(x.h)}%${!x.outdoor && x.h >= 65 ? ` · ${t("climate.humid")}` : !x.outdoor && x.h < 35 ? ` · ${t("climate.dry")}` : ""}` : "&nbsp;"}</span></div>`;
  });
  const grid = [];
  for (let i = 0; i < cards.length; i += 3) grid.push(line(`sensors:${i}`, `<div class="sensors">${cards.slice(i, i + 3).join("")}</div>`));
  return shell("wide", head("mdi:thermometer", t("climate.title"), avg != null ? t("tv.climate.average", { t: num(avg) }) : "", true),
    rows.join("") + grid.join(""));
}

// --- one sensor: its last 24 h -----------------------------------------------------------------------
const dur = (ms) => {
  const m = Math.round(ms / 60000);
  return m < 1 ? "<1 min" : m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}`;
};
// A time of day, with "yesterday" in front when it was not today.
const when = (ms) => (new Date(ms).toDateString() === new Date().toDateString() ? time(new Date(ms)) : t("tv.history.yesterday", { t: time(new Date(ms)) }));
// What a spell of "on" is called, by device class: tv.events.<kind>.count ("3 otwarcia") and .none ("Bez otwarć").
const EVENT_KIND = { door: "open", window: "open", opening: "open", garage_door: "open", moisture: "water", motion: "motion" };
const histKey = (p) => [p.entity, p.entity2].filter(Boolean).join(",");
const loading = (hist) => (!hist ? `<div class="p-empty">${t("tv.history.loading")}</div>`
  : hist.error ? `<div class="p-empty">${t("tv.history.error")}</div>` : "");
// Hour marks every 6 h under a 24 h axis.
const hourTicks = (start, end, W) => {
  let out = "";
  const first = new Date(start); first.setMinutes(0, 0, 0); first.setHours(Math.ceil(first.getHours() / 6) * 6);
  for (let t = first.getTime(); t <= end; t += 6 * 3600e3) {
    const x = ((t - start) / (end - start)) * W;
    out += `<line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="0" y2="100%" class="tick"/><text x="${x.toFixed(1)}" y="99%" class="tickl">${time(new Date(t))}</text>`;
  }
  return out;
};

function binaryPanel(h, p, ctx) {
  const st = h.st(p.entity), dc = st?.attributes.device_class, on = st?.state === "on";
  const off = !st || ["unavailable", "unknown"].includes(st.state);
  const word = off ? t("tv.binary.unavailable") : on ? alertWord(dc) || t("security.attention") : calmWord(dc) || t("tv.binary.ok");
  const hist = ctx.hist[histKey(p)], kind = EVENT_KIND[dc] || "other";
  const sub = `${esc(word)}${st?.last_changed ? ` ${t("tv.since_time", { t: time(new Date(st.last_changed)) })}` : ""}`;
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
        <div><span>${t("heating.last_24h")}</span><b>${spells.length ? t(`tv.events.${kind}.count`, { n: spells.length }) : t(`tv.events.${kind}.none`)}</b></div>
        <div><span>${t("tv.history.total")}</span><b>${spells.length ? dur(total) : "–"}</b></div>
        <div><span>${t("tv.history.last")}</span><b>${last ? `${when(last.from)}${last.ongoing ? ` · ${t("tv.history.ongoing")}` : ""}` : t("tv.history.over_day")}</b></div>
      </div>
      ${spells.length ? `<div class="wx-sec">${t("tv.history.events")}</div>` : ""}
      ${spells.slice(-12).reverse().map((x, i) => row({ key: `ev:${i}`, ic: on && x.ongoing ? "mdi:alert-circle" : "mdi:history",
        icOn: false, cls: x.ongoing ? "alert" : "", title: x.ongoing ? t("tv.history.from", { t: when(x.from) }) : `${when(x.from)} – ${time(new Date(x.to))}`,
        sub: x.ongoing ? `${esc(alertWord(dc) || t("tv.binary.active"))} · ${t("tv.history.ongoing")}` : esc(alertWord(dc) || t("tv.binary.active")), value: dur(x.to - x.from) })).join("")}`;
  }
  return shell("", head(on ? "mdi:shield-alert-outline" : off ? "mdi:shield-off-outline" : "mdi:shield-check-outline",
    p.name || h.name(p.entity), sub, !on && !off), body);
}

function numericPanel(h, p, ctx) {
  const hist = ctx.hist[histKey(p)], v0 = h.val(p.entity), hu = p.entity2 ? h.val(p.entity2) : null;
  const unit = h.st(p.entity)?.attributes.unit_of_measurement || "", isT = /°/.test(unit) || /temp/.test(p.entity);
  const fmt = (v) => (v == null ? "–" : isT ? `${num(v)}°` : `${Math.round(v)}${unit === "%" ? "%" : ` ${unit}`}`);
  const sub = [v0 != null && fmt(v0), hu != null && t("tv.humidity_lc", { v: Math.round(hu) })].filter(Boolean).join(" · ");
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
    const delta = sa && v0 != null ? v0 - sa.first : null;
    body = `<div class="nchart"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${hourTicks(start, end, W)}${line(b, "hum")}${line(a, "tmp")}</svg>
        <div class="legend"><span class="tmp">${isT ? t("common.temperature") : t("tv.history.value")}</span>${b.length ? `<span class="hum">${t("common.humidity")}</span>` : ""}</div></div>
      ${sa ? `<div class="sstats">
        <div><span>${t("heating.min")} · ${time(new Date(sa.mn.t))}</span><b>${fmt(sa.mn.v)}</b></div>
        <div><span>${t("heating.max")} · ${time(new Date(sa.mx.t))}</span><b>${fmt(sa.mx.v)}</b></div>
        <div><span>${t("heating.avg")}</span><b>${fmt(sa.avg)}</b></div>
        <div><span>${t("tv.history.since_yesterday")}</span><b>${delta == null ? "–" : `${delta > 0 ? "+" : delta < 0 ? "−" : ""}${isT ? num(Math.abs(delta)) + "°" : Math.round(Math.abs(delta))}`}</b></div>
      </div>` : `<div class="p-empty">${t("tv.history.no_data")}</div>`}`;
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
      ic: "mdi:shield-alert-outline", cls: "alert", title: `${a.name} ${alertWord(a.dc) || t("security.attention")}`, sub: since(a.st.last_changed) })),
    ...notifs.map((n) => row({ key: `notif:${n.notification_id}`, act: "attn", attrs: attn("notif", n, ""), cls: "notif",
      ic: "mdi:bell-outline", icOn: true, title: n.title || t("tv.notif.title"), sub: strip(n.message), value: n.created_at ? age(n.created_at) : "" })),
    ...bats.map((b) => row({ key: `bat:${b.id}`, act: "attn", attrs: attn("bat", b, attnKey.bat(b)), ic: b.value <= 5 ? "mdi:battery-alert-variant-outline" : "mdi:battery-low",
      cls: "warn", title: b.name, sub: t("tv.summary.battery_low"), value: `${b.value}%` })),
    ...ups.map((u) => row({ key: `upd:${u.id}`, act: "attn", attrs: attn("upd", u, attnKey.upd(u)), ic: "mdi:package-up", title: u.name,
      sub: u.version ? t("tv.summary.update_to", { v: esc(u.version) }) : t("tv.summary.update") })),
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
    card("lights", lit ? "mdi:lightbulb-on-outline" : "mdi:lightbulb-off-outline", t("tv.summary.lights"), lit ? t("tv.summary.lights_on", { n: lit }) : t("common.off_n"),
      lit ? `${esc(rooms.join(", "))} · ${t("tv.summary.ok_off")}` : t("tv.summary.all_off"), { act: lit ? "all" : "none", attrs: `data-on="0"`, cls: lit ? "lit" : "" }),
    ppl.length && card("people", "mdi:account-group-outline", t("security.people"), t("tv.summary.people_home", { n: home.length, total: ppl.length }), esc(home.map((p) => p.name).join(", ") || t("tv.summary.nobody"))),
    th && card("heat", th.heating ? "mdi:fire" : "mdi:thermostat", t("tabs.heating"), th.on ? `${num(th.target)}°` : t("common.off_n"),
      `${th.heating ? t("tv.summary.heating") : th.on ? t("climate.holding_word") : ""}${isFinite(th.current) ? `${th.on ? " · " : ""}${t("heating.now_lc", { t: num(th.current) })}` : ""}`, { act: "climate", cls: th.heating ? "lit" : "" }),
    ...h.working(true, ctx.hidden).map(({ kind, v, ap }) => kind === "vac"
      ? card("dev:vac", "mdi:robot-vacuum", esc(v.name), esc(v.label), esc(v.room || (v.battery != null ? t("tv.battery_lc", { n: Math.round(v.battery) }) : "")), { act: "device", attrs: `data-dev="vac"`, cls: "lit" })
      : card(`dev:${ap.i}`, ap.icon, esc(ap.name), esc(ap.active && ap.left > 0 ? `${Math.round(ap.left)} min` : ap.label),
        esc(ap.active ? [ap.program, ap.pct != null ? `${Math.round(ap.pct)}%` : ""].filter(Boolean).join(" · ") : t("tv.summary.unload_hint")),
        ap.active ? { act: "device", attrs: `data-dev="${ap.i}"`, cls: "lit" } : { act: "unload", attrs: `data-key="${esc(ap.doneKey)}" data-entity="${esc(ap.unloaded)}"` })),
    waste && card("waste", "mdi:trash-can-outline", t(`tv.summary.waste_${waste.when}`), esc(waste.list[0]), esc(waste.list.slice(1).join(", "))),
    wa && card("wxalert", "mdi:alert", t("tv.summary.imgw"), esc(wa), "", { act: "weather", cls: "warn" }),
    air?.bad && card("air", "mdi:smog", t("weather.air_label"), esc(air.label), t("weather.no_airing"), { act: "weather", cls: "warn" }),
  ].filter(Boolean);
  const grid = [];
  // What plays gets the whole width: its artwork, and a title that may take two lines.
  // A carousel: every player sits side by side in a strip that slides (transform only) to the one picked.
  if (m) grid.push(line("playing", `<div class="scard playing" data-f="playing" data-act="media" data-media="${media.indexOf(m)}"
    ${playing.length > 1 ? 'data-adjust="playing"' : ""}>
    <div class="pl-view"><div class="pl-track" style="transform:translateX(${-pi * 100}%)">${playing.map((x) => `<div class="pl-slide">
      ${mediaArt(x, false)}<div class="pl"><span>${x.active ? t("tv.media.now_playing") : t("common.on_n")} · ${esc(x.app || x.name)}</span>
      <b>${esc(x.active ? x.title : x.input || x.app)}</b><small>${esc([x.active ? x.artist : "", x.name].filter(Boolean).join(" · "))}</small></div></div>`).join("")}
    </div></div>
    ${playing.length > 1 ? `<div class="dots">${playing.map((_, i) => `<i class="${i === pi ? "on" : ""}"></i>`).join("")}</div>` : ""}</div>`));
  for (let i = 0; i < cards.length; i += 2) grid.push(line(`grid:${i}`, cards.slice(i, i + 2).join("")));
  const count = todo.length;
  return shell("summary", head(count ? "mdi:bell-ring-outline" : "mdi:check-circle-outline", t("tv.summary.title"),
      count ? t("tv.summary.attention", { n: count }) : t("tv.summary.all_clear"), !count, gear),
    (todo.length ? `<div class="wx-sec">${t("tv.summary.attention_title")}</div>${todo.join("")}` : "") + `<div class="wx-sec">${t("tabs.home")}</div>${grid.join("")}`, "left");
}

// One item that needs attention, and what can be done about it.
function attnPanel(h, p, ctx) {
  if (p.kind === "notif") {
    const n = (ctx.notifs || {})[p.id];
    if (!n) return shell("", head("mdi:bell-check-outline", t("tv.notif.dismissed"), ""), `<div class="p-empty">${t("tv.notif.gone")}</div>`);
    const text = esc(String(n.message || "").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[*_`#>]/g, "")).replace(/\n/g, "<br>");
    return shell("", head("mdi:bell-outline", n.title || t("tv.notif.title"), n.created_at ? esc(ago(n.created_at)) : "", true),
      `<div class="p-note">${text}</div>` + row({ key: "dismiss", act: "notif-dismiss", attrs: `data-id="${esc(p.id)}"`, ic: "mdi:check", title: t("tv.notif.dismiss"),
        sub: t("tv.notif.dismiss_hint") }));
  }
  const rows = [];
  let ic = "mdi:alert-circle-outline", title = p.name || h.name(p.id), sub = "";
  if (p.kind === "upd") {
    const st = h.st(p.id), a = st?.attributes || {};
    ic = "mdi:package-up";
    title = a.title || a.friendly_name || p.id;
    sub = `${esc(a.installed_version || "?")} → ${esc(a.latest_version || "?")}`;
    rows.push(row({ key: "skip", act: "upd-skip", attrs: `data-entity="${esc(p.id)}"`, ic: "mdi:debug-step-over", title: t("tv.update.skip"),
      sub: t("tv.update.skip_hint") }));
    rows.push(row({ key: "hide", act: "hide", attrs: `data-key="${esc(p.key)}"`, ic: "mdi:eye-off-outline", title: t("tv.update.hide"), sub: t("tv.update.hide_hint") }));
  } else if (p.kind === "bat") {
    ic = "mdi:battery-low";
    sub = t("tv.battery", { n: esc(h.st(p.id)?.state ?? "?") });
    rows.push(row({ key: "hide", act: "hide", attrs: `data-key="${esc(p.key)}"`, ic: "mdi:eye-off-outline", title: t("tv.battery_hide"),
      sub: t("tv.battery_hide_hint") }));
  } else if (p.kind === "alarm") {
    const st = h.st(p.id);
    ic = "mdi:shield-alert-outline";
    sub = `${esc(alertWord(st?.attributes.device_class) || t("security.attention"))}${st?.last_changed ? ` ${esc(since(st.last_changed))}` : ""}`;
    rows.push(row({ key: "history", act: "entity", attrs: `data-kind="binary" data-entity="${esc(p.id)}" data-name="${esc(title)}"`, ic: "mdi:history",
      title: t("tv.alarm.history"), sub: t("tv.alarm.history_hint") }));
    rows.push(row({ key: "hide", act: "hide", attrs: `data-key="${esc(p.key)}"`, ic: "mdi:eye-off-outline", title: t("tv.alarm.hide"),
      sub: t("tv.alarm.hide_hint") }));
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
        icOn: !v.cleaning, title: v.cleaning ? t("common.pause") : v.state === "paused" ? t("tv.vac.resume") : t("cleaning.start"), sub: v.cleaning ? t("tv.vac.pause_hint") : t("tv.vac.start_hint") }),
      v.state !== "docked" && row({ key: "vac-home", act: "vac", attrs: `data-entity="${esc(v.id)}" data-cmd="return_to_base"`, ic: "mdi:home-import-outline",
        title: t("tv.vac.dock"), sub: t("tv.vac.dock_hint") }),
    ].filter(Boolean).join("");
    const tiles = [
      stat(v.charging ? "mdi:battery-charging" : "mdi:battery-outline", t("common.battery"), v.battery != null ? `${Math.round(v.battery)}%` : null),
      stat("mdi:map-marker-outline", t("heating.room"), esc(v.room)),
      stat("mdi:timer-outline", t("cleaning.time"), v.time != null ? `${Math.round(v.time)} <i>${esc(v.timeUnit)}</i>` : null),
      stat("mdi:texture-box", t("cleaning.area"), v.area != null ? `${Math.round(v.area)} <i>m²</i>` : null),
      stat("mdi:fan", t("tv.vac.suction"), esc(v.suction)),
    ].join("");
    return shell("", head("mdi:robot-vacuum", v.name, esc(v.label), v.active),
      `<div class="dev-hero ${v.active ? "on" : ""}">${icon("mdi:robot-vacuum", "xl")}<div><b>${esc(v.label)}</b><span>${esc(v.room || (v.battery != null ? t("tv.battery", { n: Math.round(v.battery) }) : ""))}</span></div></div>
      ${tiles ? `<div class="wtiles dev-tiles">${tiles}</div>` : ""}${rows}`);
  }
  const ap = h.appliances()[p.dev];
  if (!ap) return "";
  const rows = [
    ap.active && !ap.paused && ap.pause && row({ key: "pause", act: "press", attrs: `data-entity="${esc(ap.pause)}"`, ic: "mdi:pause", title: t("common.pause"), sub: t("tv.app.pause_hint") }),
    ap.paused && ap.resume && row({ key: "resume", act: "press", attrs: `data-entity="${esc(ap.resume)}"`, ic: "mdi:play", icOn: true, title: t("common.resume"), sub: t("tv.app.resume_hint") }),
    ap.done && row({ key: "unloaded", act: "unload", attrs: `data-key="${esc(ap.doneKey)}" data-entity="${esc(ap.unloaded)}"`, ic: "mdi:check", icOn: true,
      title: t("appliances.unloaded"), sub: t("tv.app.unloaded_hint") }),
  ].filter(Boolean).join("");
  const pct = ap.active ? ap.pct : ap.done ? 100 : 0;
  const tiles = [
    stat("mdi:file-document-outline", t("appliances.program_label"), esc(ap.program), "wide"),
    stat("mdi:water-sync", t("appliances.phase"), esc(ap.phase)),
    stat("mdi:timer-outline", t("tv.app.total"), ap.total != null ? `${Math.round(ap.total)} <i>min</i>` : null),
    stat("mdi:flash-outline", t("common.power_draw"), ap.power != null ? `${Math.round(ap.power)} <i>W</i>` : null),
    stat("mdi:counter", t("appliances.cycles_label"), ap.cycles != null ? String(ap.cycles) : null),
  ].join("");
  return shell("", head(ap.icon, ap.name, esc([ap.label, ap.room].filter(Boolean).join(" · ")), ap.active || ap.done),
    `<div class="dev-hero ring-hero ${ap.active ? "on" : ap.done ? "done" : ""}"><div class="bigring">${ring(pct, 200)}
      <div>${ap.done && !ap.active ? icon("mdi:check-bold") : `<b>${pct != null ? Math.round(pct) : 0}%</b>`}</div></div>
      <div><b>${ap.active && ap.left > 0 ? `${Math.round(ap.left)} min` : esc(ap.label)}</b><span>${ap.active && ap.left > 0 ? t("tv.app.to_go") : esc(ap.room)}</span></div></div>
    ${tiles ? `<div class="wtiles dev-tiles">${tiles}</div>` : ""}${rows}`);
}

// --- settings ---------------------------------------------------------------------------------------
// One row per option, each opening its own panel; this TV's choices, kept in its storage.
function settingsPanel(h, ctx) {
  const w = currentWallpaper(), a = currentAccent(), p = prefs();
  const toggle = (key, ic, title, sub) => row({ key: `pref:${key}`, act: "pref", attrs: `data-key="${key}"`, ic, icOn: p[key], title, sub,
    value: p[key] ? t("common.on_n") : t("common.off_n"), cls: p[key] ? "on" : "" });
  // ←/→ steps through the values (STEPS in prefs.js); "z Home Assistanta" marks minutes this TV has not set itself.
  const minutes = (key, ic, title, sub, zero) => {
    const v = minutesFor(key, h.c), own = p[key] != null;
    return row({ key: `pref:${key}`, adjust: "pref", attrs: `data-key="${key}"`, ic, icOn: v > 0, title,
      sub: own ? sub : `${sub} · ${t("tv.settings.from_ha")}`, value: v === 0 ? zero : t("tv.settings.min", { n: v }) });
  };
  const sec = (key) => `<div class="wx-sec">${t(`tv.settings.${key}`)}</div>`;
  return shell("summary", head("mdi:cog-outline", t("common.settings"), t("tv.settings.subtitle")),
    sec("look")
    + row({ key: "wallpaper", act: "wallpapers", ic: "mdi:image-outline", title: t("tv.settings.wallpaper"), sub: esc(w.sub), value: `${esc(w.name)} ${icon("mdi:chevron-right")}` })
    + row({ key: "accent", act: "accents", ic: "mdi:palette-outline", title: t("tv.settings.accent"), sub: t("tv.settings.accent_hint"),
      value: `<i class="adot" style="background:${a.c}"></i>${esc(a.name)} ${icon("mdi:chevron-right")}` })
    // OK or ←/→ go round the three looks; each is shown on the home screen behind the panel at once.
    + row({ key: "pref:glass", act: "pref-step", adjust: "pref", attrs: `data-key="glass"`, ic: "mdi:blur", title: t("tv.settings.glass"),
      sub: t(`tv.settings.glass_${p.glass}_hint`), value: t(`tv.settings.glass_${p.glass}`) })
    + toggle("ring", "mdi:border-radius", t("tv.settings.ring"), t("tv.settings.ring_hint"))
    + sec("screen")
    + minutes("saver", "mdi:monitor-star", t("tv.settings.saver"), t("tv.settings.saver_hint"), t("tv.settings.off"))
    + toggle("dim", "mdi:brightness-6", t("tv.settings.dim"), t("tv.settings.dim_hint"))
    + toggle("shift", "mdi:cursor-move", t("tv.settings.shift"), t("tv.settings.shift_hint"))
    + minutes("exit", "mdi:exit-run", t("tv.settings.exit"), t("tv.settings.exit_hint"), t("tv.settings.never"))
    + sec("performance")
    + toggle("anim", "mdi:animation-outline", t("tv.settings.anim"), t("tv.settings.anim_hint"))
    // This TV and its homes: which Home Assistant it is on, others to switch to or add, and signing out of this one.
    + sec("connection")
    + row({ key: "conn:homes", act: "instances", ic: "mdi:home-switch-outline", title: t("tv.settings.homes"), sub: esc(ctx.instance?.name || ""),
      value: `${ctx.instances.length || 1} ${icon("mdi:chevron-right")}` })
    + row({ key: "conn:add", act: "add-home", ic: "mdi:home-plus-outline", title: t("tv.home.add"), sub: t("tv.home.add_hint"), value: icon("mdi:chevron-right") })
    + row({ key: "conn:logout", act: "logout", ic: "mdi:logout", title: t("tv.settings.logout"), cls: ctx.logoutArmed ? "alert" : "",
      sub: ctx.logoutArmed ? t("tv.settings.logout_confirm") : t("tv.settings.logout_hint", { name: esc(ctx.instance?.name || "") }) }));
}

// Accents as swatches, three to a line; OK puts one on at once (this panel shows it straight away).
function accentsPanel() {
  const cur = currentAccent().id, cards = ACCENTS.map((a) => `<div class="acard ${a.id === cur ? "on" : ""}" data-f="ac:${a.id}" data-act="accent" data-id="${a.id}">
    <div class="aswatch" style="background:${a.c};color:${a.ink}">${a.id === cur ? icon("mdi:check-bold") : icon("mdi:lightbulb-on")}</div><b>${esc(a.name)}</b></div>`);
  const lines = [];
  for (let i = 0; i < cards.length; i += 3) lines.push(line(`ac:${i}`, cards.slice(i, i + 3).join("")));
  return shell("summary", head("mdi:palette-outline", t("tv.settings.accent"), t("tv.settings.accent_sub"), true), `<div class="acgrid">${lines.join("")}</div>`);
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
  return shell("summary", head("mdi:image-outline", t("tv.settings.wallpaper"), t("tv.settings.wallpaper_sub")),
    `<div class="wx-sec">${t("tv.settings.photos")}</div>${grid("ph", WALLPAPERS.filter((w) => w.photo))}
     <div class="wx-sec">${t("tv.settings.colors")}</div>${grid("gr", WALLPAPERS.filter((w) => !w.photo))}`);
}

// --- instances ------------------------------------------------------------------------------------
function instancesPanel(ctx) {
  // A home per line: OK switches to it; the bin next to it takes it off this TV's list (this home itself cannot be
  // removed here: signing out is in Ustawienia).
  const rows = ctx.instances.map((x) => {
    const here = x.id === ctx.instance?.id;
    return `<div class="p-line" data-line="inst:${esc(x.id)}">
      <div class="p-row ${here ? "on" : ""}" data-f="inst:${esc(x.id)}" data-act="switch" data-id="${esc(x.id)}">
        <div class="ic ${here ? "lime" : ""}">${icon("mdi:home-outline")}</div>
        <div class="t"><b>${esc(x.name)}</b><span>${here ? t("tv.instances.current") : esc(x.url.replace(/^https?:\/\//, ""))}</span></div></div>
      ${here ? "" : `<div class="btn round small" data-f="del:${esc(x.id)}" data-act="inst-del" data-id="${esc(x.id)}">${icon("mdi:home-remove-outline")}</div>`}</div>`;
  });
  const add = row({ key: "inst:add", act: "add-home", ic: "mdi:home-plus-outline", title: t("tv.home.add"), sub: t("tv.home.add_hint"), value: icon("mdi:chevron-right") });
  return shell("", head("mdi:home-switch-outline", t("tv.instances.title"), t("tv.instances.sub")), rows.join("") + add);
}

// Held OK on a tile: what can be done with it beyond opening it.
function holdPanel(p) {
  return shell("", head("mdi:dots-horizontal-circle-outline", p.name, t("tv.hold.sub")),
    row({ key: "hold:hide", act: "hold-hide", attrs: `data-item="${esc(p.item)}"`, ic: "mdi:eye-off-outline", title: t("tv.hold.hide"), sub: t("tv.hold.hide_hint") })
    + row({ key: "hold:cancel", act: "close", ic: "mdi:close", title: t("tv.hold.cancel") }));
}

// Another home by its address: typed with the remote on the TV's own keyboard (OK on the field), then Połącz.
function addHomePanel(ctx) {
  return shell("", head("mdi:home-plus-outline", t("tv.home.add"), t("tv.home.add_sub")),
    `<div class="p-line" data-line="addr"><label class="p-input" data-f="addr" data-act="add-focus">${icon("mdi:web")}
      <input id="addr" type="url" inputmode="url" value="${esc(ctx.addAddr)}" placeholder="192.168.1.20" spellcheck="false" autocomplete="off"></label></div>
     <p class="p-note">${t("tv.home.address_hint")}</p>`
    + row({ key: "addr:go", act: "add-go", ic: "mdi:arrow-right", icOn: true, title: t("tv.home.connect"), sub: t("tv.home.connect_hint") }));
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
    <div class="cam-top"><span class="live ${ui.live ? "on" : ""}"><i></i>${ui.live ? t("cameras.live") : t("tv.camera.preview")}</span>${esc(h.name(cam))}</div>
    <div class="cam-strip" data-line="cams"><div class="track" data-track>${thumbs}</div></div></div>`;
}
