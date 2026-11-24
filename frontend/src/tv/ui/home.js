// The home screen: a header (clock, what the house is doing, weather, people) and rows of tiles, Google TV style.
// Every tile is an item for the remote ([data-f] key, [data-act] what OK does); rows are lines ([data-line]).
import { esc, num, wIcon, wxWord, alertWord, time, longDate, fmtTime } from "../model/format.js";
import { t } from "../../shared/i18n.js";
import { icon } from "./icons.js";

export function renderHome(h, ctx) {
  const rows = [workingRow(h), scenesRow(h), roomsRow(h), mediaRow(h), climateRow(h, ctx), securityRow(h)].filter(Boolean);
  // Something open or wet comes first, right under the header.
  const alarm = rows.findIndex((r) => r.key === "security" && r.alarm);
  if (alarm > 0) rows.unshift(rows.splice(alarm, 1)[0]);
  return `<div class="page" data-scroll>${header(h, ctx)}${rows.map((r) => r.html).join("")}</div>`;
}

const row = (key, title, tiles, extra = {}) => ({ key, ...extra, html: `<section class="row" data-line="${key}">
  <h2>${esc(title)}</h2><div class="track" data-track>${tiles.join("")}</div></section>` });

// --- header ---------------------------------------------------------------------------------------
// Variants of the top of the screen (?hero= or `tv_hero` in the card config; default today): classic (clock left, weather and people
// right), glance (lower header with a row of large status pills), cover (a backdrop: the playing artwork or the
// weather, Google TV style), today (clock left, a "today" card with the next hours right).
function header(h, ctx) {
  if (ctx.hero === "glance") return heroGlance(h, ctx);
  if (ctx.hero === "cover") return heroCover(h, ctx);
  if (ctx.hero === "today") return heroToday(h, ctx);
  return heroClassic(h, ctx);
}

function heroParts(h, ctx) {
  const lit = h.lightsOn().length;
  const headline = lit ? t("tv.lights_on", { n: lit }) : t("home.all_off");
  const alerts = h.securityItems().filter((x) => x.alert);
  const notes = [
    ...alerts.map((a) => `<div class="note alert">${icon("mdi:alert-circle")}<b>${esc(a.name)}</b> ${alertWord(a.dc) || t("security.attention")}</div>`),
    ...h.working().map(({ kind, v, ap }) => (kind === "vac" ? `<div class="note dev">${icon("mdi:robot-vacuum")}<b>${esc(v.name)}</b> ${esc(v.label.toLowerCase())}</div>`
      : `<div class="note dev">${icon(ap.icon)}<b>${esc(ap.name)}</b> ${esc(ap.active && ap.left > 0 ? t("tv.min_left", { n: Math.round(ap.left) }) : ap.label.toLowerCase())}</div>`)),
    h.weatherAlert() && `<div class="note warn">${icon("mdi:alert")}${t("weather.imgw_line")} <b>${esc(h.weatherAlert())}</b></div>`,
    h.air()?.bad && `<div class="note warn">${icon("mdi:smog")}${esc(t("weather.air_line", { label: h.air().label }))} — <b>${t("tv.no_airing_lc")}</b></div>`,
  ].filter(Boolean).join("");
  const w = h.weatherNow(), cond = wxWord(w.cond) || "";
  const people = h.persons().map((p) => `<div class="avatar ${p.home ? "home" : ""}" ${p.pic ? `style="background-image:url('${esc(p.pic)}')"` : ""}>
    ${p.pic ? "" : esc(p.name[0] || "?")}<i></i></div>`).join("");
  const others = ctx.instances.length > 1
    ? `<div class="instance" data-f="instance" data-act="instances">${icon("mdi:home-switch-outline")}<span>${esc(ctx.instance?.name || t("tabs.home"))}</span></div>` : "";
  const today = ctx.forecast?.daily?.[0];
  return { lit, headline, alerts, notes, w, cond, people, others, today,
    clock: `<div class="date" data-date>${esc(longDate(new Date()))}</div><div class="clock" data-clock>${time(new Date())}</div>` };
}

function heroGlance(h, ctx) {
  const P = heroParts(h, ctx), m = h.mediaItems().find((x) => x.active), avg = h.indoorAverage();
  const pill = (ic, label, value, cls = "") => `<div class="gpill ${cls}">${icon(ic)}<div><span>${label}</span><b>${value}</b></div></div>`;
  const pills = [
    P.w.w && pill(wIcon(P.w.cond, P.w.night), esc(P.cond) || t("weather.title"), `${P.w.temp != null ? Math.round(P.w.temp) + "°" : "–"}${P.today ? `<small> ${Math.round(P.today.temperature)}° / ${Math.round(P.today.templow ?? P.today.temperature)}°</small>` : ""}`),
    avg != null && pill("mdi:home-thermometer-outline", t("tv.indoors"), `${num(avg)}°`),
    pill(P.lit ? "mdi:lightbulb-on-outline" : "mdi:lightbulb-off-outline", t("tv.summary.lights"), P.lit ? t("tv.summary.lights_on", { n: P.lit }) : t("tv.off_lc"), P.lit ? "lit" : ""),
    h.securityItems().length && pill(P.alerts.length ? "mdi:shield-alert-outline" : "mdi:shield-check-outline", t("tabs.security"),
      P.alerts.length ? `${esc(P.alerts[0].name)} ${alertWord(P.alerts[0].dc) || t("security.attention")}` : t("tv.binary.ok"), P.alerts.length ? "alert" : ""),
    m && pill("mdi:play-circle-outline", `${t("tv.media.now_playing")} · ${esc(m.app || m.name)}`, esc(m.title)),
  ].filter(Boolean).join("");
  return `<header class="hero glance" data-line="top">
    <div class="g-top"><div class="g-clock">${P.clock}</div><div class="hero-r">${P.others}${P.people ? `<div class="people">${P.people}</div>` : ""}</div></div>
    <div class="gpills">${pills}</div></header>`;
}

function heroCover(h, ctx) {
  const P = heroParts(h, ctx), m = h.mediaItems().find((x) => x.active && x.pic && !x.logoOnly);
  const sky = P.w.night ? "night" : /rain|pour|snow|hail|lightning/.test(P.w.cond || "") ? "rain" : /cloud|fog/.test(P.w.cond || "") ? "cloud" : "sun";
  const bg = m ? `<div class="cv-bg art-bg" style="background-image:url('${esc(m.pic)}')"></div>` : `<div class="cv-bg sky-${sky}"></div>`;
  const feature = m
    ? `<div class="cv-feature"><img src="${esc(m.pic)}" alt=""><div><div class="kicker">${t("tv.media.now_playing")} · ${esc(m.app || m.name)}</div><b>${esc(m.title)}</b><span>${esc(m.artist)}</span></div></div>`
    : `<div class="cv-feature wx">${icon(wIcon(P.w.cond, P.w.night), "xl")}<div><div class="kicker">${esc(h.c.weather_name || t("weather.title"))}</div>
        <b>${P.w.temp != null ? Math.round(P.w.temp) + "°" : "–"} · ${esc(P.cond)}</b>${P.today ? `<span>${t("common.today")} ${Math.round(P.today.temperature)}° / ${Math.round(P.today.templow ?? P.today.temperature)}°</span>` : ""}</div></div>`;
  return `<header class="hero cover" data-line="top">${bg}<div class="cv-shade"></div>
    <div class="hero-l">${P.clock}<div class="headline">${esc(P.headline)}</div>${P.notes ? `<div class="notes">${P.notes}</div>` : ""}</div>
    <div class="cv-right"><div class="hero-r">${P.others}${P.people ? `<div class="people">${P.people}</div>` : ""}</div>${feature}</div></header>`;
}

function heroToday(h, ctx) {
  const P = heroParts(h, ctx), sun = h.st("sun.sun")?.attributes || {};
  const hm = (iso) => (iso ? time(new Date(iso)) : "–");
  const hours = (ctx.forecast?.hourly || []).filter((x) => new Date(x.datetime) > Date.now()).slice(0, 6);
  const strip = hours.map((x) => `<div class="th">${esc(time(new Date(x.datetime)))}${icon(wIcon(x.condition, new Date(x.datetime).getHours() < 6 || new Date(x.datetime).getHours() >= 20))}<b>${Math.round(x.temperature)}°</b></div>`).join("");
  return `<header class="hero today" data-line="top">
    <div class="hero-l">${P.clock}<div class="headline">${esc(P.headline)}</div>${P.notes ? `<div class="notes">${P.notes}</div>` : ""}</div>
    <div class="td-side"><div class="hero-r row-r">${P.others}${P.people ? `<div class="people">${P.people}</div>` : ""}</div>
      <div class="td-card"><div class="td-now">${icon(wIcon(P.w.cond, P.w.night))}<b>${P.w.temp != null ? Math.round(P.w.temp) + "°" : "–"}</b>
        <div><span>${esc(P.cond)}</span>${P.today ? `<small>${Math.round(P.today.temperature)}° / ${Math.round(P.today.templow ?? P.today.temperature)}°</small>` : ""}</div>
        <div class="td-sun">${icon("mdi:weather-sunset-up")}${hm(sun.next_rising)}${icon("mdi:weather-sunset-down")}${hm(sun.next_setting)}</div></div>
        ${strip ? `<div class="td-hours">${strip}</div>` : ""}</div></div></header>`;
}

function heroClassic(h, ctx) {
  const P = heroParts(h, ctx);
  return `<header class="hero" data-line="top">
    <div class="hero-l">${P.clock}<div class="headline">${esc(P.headline)}</div>${P.notes ? `<div class="notes">${P.notes}</div>` : ""}</div>
    <div class="hero-r">
      ${P.others}
      ${P.w.temp != null || P.w.w ? `<div class="wx-now">${icon(wIcon(P.w.cond, P.w.night))}<div><b>${P.w.temp != null ? Math.round(P.w.temp) + "°" : "–"}</b>
        <span>${esc(P.cond)}</span></div></div>` : ""}
      ${P.people ? `<div class="people">${P.people}</div>` : ""}
    </div>
  </header>`;
}

// --- rows -----------------------------------------------------------------------------------------
// A progress ring (SVG, 0–100).
export function ring(pct, size, cls = "") {
  const r = 22, c = 2 * Math.PI * r, p = Math.max(0, Math.min(100, pct || 0));
  return `<svg class="ring ${cls}" viewBox="0 0 52 52" width="${size}" height="${size}"><circle cx="26" cy="26" r="${r}" class="ring-bg"/>
    <circle cx="26" cy="26" r="${r}" class="ring-fg" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - p / 100)).toFixed(1)}"/></svg>`;
}

// The vacuum, washer and dishwasher, only while they work (or wait to be emptied): first on the screen, since it is
// what changes by the minute.
function workingRow(h) {
  const tiles = h.working().map(({ kind, v, ap }) => {
    if (kind === "vac") return `<div class="tile device on" data-f="dev:vac" data-act="device" data-dev="vac">
      <div class="head"><div class="ic">${icon("mdi:robot-vacuum")}</div>${v.battery != null ? `<div class="dbadge">${icon(v.charging ? "mdi:battery-charging" : "mdi:battery-outline")}${Math.round(v.battery)}%</div>` : ""}</div>
      <div class="name">${esc(v.name)}</div><div class="sub">${esc([v.label, v.room].filter(Boolean).join(" · "))}</div></div>`;
    const sub = ap.active ? [ap.left > 0 ? `${Math.round(ap.left)} min` : "", ap.paused || !ap.program ? ap.label : ap.program].filter(Boolean).join(" · ") : ap.label;
    return `<div class="tile device ${ap.active ? "on" : "done"}" data-f="dev:${ap.i}" data-act="device" data-dev="${ap.i}">
      <div class="head"><div class="ic">${icon(ap.icon)}</div>
        ${ap.active ? `<div class="dring">${ring(ap.pct, 86)}<span>${ap.pct != null ? Math.round(ap.pct) : 0}<small>%</small></span></div>` : `<div class="dcheck">${icon("mdi:check-bold")}</div>`}</div>
      <div class="name">${esc(ap.name)}</div><div class="sub">${esc(sub)}</div></div>`;
  });
  return tiles.length ? row("working", t("tv.rows.working"), tiles) : null;
}

function scenesRow(h) {
  const tiles = h.scenes().map((s) => {
    const on = h.sceneOn(s), st = h.st(s.entity);
    return `<div class="tile scene ${on ? "on" : ""}" data-f="scene:${esc(s.entity)}" data-act="scene" data-entity="${esc(s.entity)}"
      ${on && s.off ? `data-off="${esc(s.off)}"` : ""}>
      <div class="ic">${icon(s.icon || st?.attributes.icon || "mdi:palette-outline")}</div>
      <div class="name">${esc(h.name(s))}</div>${on ? `<div class="sub">${on.left ? t("tv.min_left", { n: on.left }) : t("tv.scene_active")}</div>` : ""}</div>`;
  });
  if (!h.allLights().length && !tiles.length) return null;
  const lit = h.lightsOn().length;
  tiles.push(`<div class="tile scene" data-f="all-off" data-act="all" data-on="0"><div class="ic">${icon("mdi:lightbulb-off-outline")}</div>
    <div class="name">${t("home.all_off_btn")}</div>${lit ? `<div class="sub">${t("tv.summary.lights_on", { n: lit })}</div>` : ""}</div>`);
  tiles.push(`<div class="tile scene" data-f="all-on" data-act="all" data-on="1"><div class="ic">${icon("mdi:lightbulb-group-outline")}</div>
    <div class="name">${t("home.all_on_btn")}</div></div>`);
  return row("scenes", t("scenes.title"), tiles);
}

function roomsRow(h) {
  const tiles = h.rooms().map((r, i) => {
    const s = h.roomSummary(r);
    return `<div class="tile room ${s.on ? "on" : ""}" data-f="room:${i}" data-act="room" data-room="${i}">
      <div class="head"><div class="ic">${icon(r.icon || "mdi:home-outline")}</div>${s.t != null ? `<div class="temp">${num(s.t)}°</div>` : ""}</div>
      <div class="name">${esc(r.name)}</div><div class="sub">${esc(s.sub)}</div>
      ${s.lights.length ? `<div class="dots">${s.lights.map((id) => `<i class="${h.on(id) ? "on" : ""}"></i>`).join("")}</div>` : ""}</div>`;
  });
  return tiles.length ? row("rooms", t("tabs.rooms"), tiles) : null;
}

export function mediaArt(m, big) {
  if (m.pic && !m.logoOnly) return `<img class="art" src="${esc(m.pic)}" alt="">`;
  if (m.brand) {
    const [, file, bg, mono] = m.brand;
    return `<div class="art logo" style="background:${bg}"><img src="/local/logos/${file}.svg?v=2" alt="" class="${mono ? "mono" : ""}"></div>`;
  }
  return `<div class="art none">${icon(m.isTv ? "mdi:television" : "mdi:speaker", big ? "xl" : "")}</div>`;
}

function mediaRow(h) {
  const items = h.mediaItems();
  if (!items.length) return null;
  const tiles = items.map((m, i) => {
    const wide = i === 0 && m.active;
    const state = m.active ? (m.playing ? t("tv.media.playing") : t("media.paused")) : m.on ? m.input || t("common.on_m") : t("common.off_m");
    const pct = m.duration ? Math.min(100, (h.mediaPosition(m) / m.duration) * 100) : 0;
    return `<div class="tile media ${wide ? "wide" : ""} ${m.on ? "lit" : ""}" data-f="media:${i}" data-act="media" data-media="${i}">
      ${wide ? mediaArt(m, true) : ""}
      <div class="media-body">
        ${wide ? "" : `<div class="ic">${icon(m.isTv ? "mdi:television" : /soundbar/i.test(m.name) ? "mdi:soundbar" : "mdi:speaker")}</div>`}
        ${m.active && m.app ? `<div class="kicker">${esc(m.app)}</div>` : ""}
        <div class="name">${esc(m.active ? m.title : m.name)}</div>
        <div class="sub">${esc(m.active ? m.artist || state : state)}</div>
        ${wide && m.duration ? `<div class="bar"><i style="width:${pct.toFixed(1)}%" data-progress="${i}"></i></div>
          <div class="times"><span data-elapsed="${i}">${fmtTime(h.mediaPosition(m))}</span><span>${fmtTime(m.duration)}</span></div>` : ""}
      </div></div>`;
  });
  return row("media", t("tabs.media"), tiles);
}

function climateRow(h, ctx) {
  const tiles = [];
  const w = h.weatherNow();
  if (w.w) {
    const cond = wxWord(w.cond) || "", today = ctx.forecast?.daily?.[0];
    tiles.push(`<div class="tile weather" data-f="weather" data-act="weather">
      <div class="label">${icon(wIcon(w.cond, w.night))}${t("weather.title")}</div>
      <div class="big">${w.temp != null ? Math.round(w.temp) + "°" : "–"}</div>
      <div class="sub">${esc(cond)}${today ? ` · ${Math.round(today.temperature)}° / ${Math.round(today.templow ?? today.temperature)}°` : ""}</div></div>`);
  }
  const th = h.thermo();
  if (th) tiles.push(`<div class="tile climate ${th.heating ? "on" : ""}" data-f="thermo" data-act="climate">
      <div class="label">${icon(th.heating ? "mdi:fire" : "mdi:thermostat")}${t("tabs.heating")}</div>
      <div class="big">${num(th.target)}°</div><div class="sub">${esc(th.status)}${isFinite(th.current) ? ` · ${t("heating.now_lc", { t: num(th.current) })}` : ""}</div></div>`);
  for (const [i, x] of h.climateSensors().entries()) {
    if (x.t == null && x.h == null) continue;
    const main = x.temperature || x.humidity, second = x.temperature && x.humidity ? x.humidity : "";
    tiles.push(`<div class="tile sensor ${x.outdoor ? "out" : ""}" data-f="sensor:${i}" data-act="entity" data-kind="numeric"
      data-entity="${esc(main)}" data-entity2="${esc(second)}" data-name="${esc(x.name)}" data-icon="${esc(x.icon || "mdi:thermometer")}">
      <div class="label">${icon(x.icon || "mdi:thermometer")}${esc(x.name)}</div>
      <div class="big">${x.t != null ? num(x.t) + "°" : "–"}</div>
      <div class="sub">${x.h != null ? t("rooms.humidity", { v: Math.round(x.h) }) : "&nbsp;"}</div></div>`);
  }
  return tiles.length ? row("climate", t("tv.rows.climate"), tiles) : null;
}

// A camera still from HA's proxy. Tiles and thumbnails use the camera's lighter `preview` stream scaled to 640 px
// (full stills reach 2304 px and ~340 KB, slow over Funnel); width 0 asks for the full picture of the main stream.
//
// Stills are refreshed in the background (refreshCamStills, every 15 s): a picture goes on screen only once it has
// loaded, so tiles never blink or go empty, and the camera strip and the full-screen view open on pictures the TV
// already has (a fresh one over Funnel takes 1-3 s). A loaded URL is reused for 4 minutes at most: HA accepts a
// camera token for ~10 min, and a request with an expired one would count as a failed login (IP ban).
const camSrc = new Map();
const freshCamUrl = (h, id, width) => {
  const a = h.st(id)?.attributes || {};
  return `/api/camera_proxy/${id}?token=${encodeURIComponent(a.access_token || "")}${width ? `&width=${width}` : ""}&t=${Math.floor(Date.now() / 15000)}`;
};
export const camUrl = (h, cam, width = 640) => {
  const c = typeof cam === "string" ? { entity: cam } : cam, id = width ? c.preview || c.entity : c.entity;
  const shown = width === 640 && camSrc.get(id);
  return shown && Date.now() - shown.at < 240000 ? shown.url : freshCamUrl(h, id, width);
};
export function refreshCamStills(h, onReady) {
  for (const c of h.cameras()) {
    const id = c.preview || c.entity, url = freshCamUrl(h, id, 640);
    if (camSrc.get(id)?.url === url) continue;
    const im = new Image();
    im.decoding = "async";
    im.onload = () => { camSrc.set(id, { url, at: Date.now() }); onReady(); };
    im.src = url;
  }
}

// Only what matters gets a tile: each sensor that is open or wet, one tile for sensors that are offline, and the
// cameras. When everything is closed a single "all clear" tile sits before the cameras (the row is then "Kamery");
// without cameras a calm house has no security row at all (the left summary still lists the sensors).
function securityRow(h) {
  const items = h.securityItems(), cams = h.cameras();
  const alerts = items.filter((x) => x.alert), offline = items.filter((x) => x.off);
  if (!alerts.length && !offline.length && !cams.length) return null;
  const tiles = alerts.map((x) => `<div class="tile sec alert" data-f="sec:${esc(x.id)}" data-act="entity" data-kind="binary"
      data-entity="${esc(x.id)}" data-name="${esc(x.name)}">
      <div class="head"><div class="ic">${icon("mdi:shield-alert-outline")}</div></div>
      <div class="name">${esc(x.name)}</div><div class="sub">${esc(alertWord(x.dc) || t("security.attention"))}${x.st?.last_changed ? ` · ${t("tv.since_time", { t: time(new Date(x.st.last_changed)) })}` : ""}</div></div>`);
  if (offline.length) tiles.push(`<div class="tile sec off" data-f="sec-offline" data-act="summary">
      <div class="head"><div class="ic">${icon("mdi:shield-off-outline")}</div></div>
      <div class="name">${t("security.offline", { n: offline.length })}</div>
      <div class="sub">${esc(offline.map((x) => x.name).join(", "))}</div></div>`);
  if (!alerts.length && items.length > offline.length && cams.length) {
    const calm = items.length - offline.length;
    tiles.unshift(`<div class="tile sec calm" data-f="sec-calm" data-act="summary">
      <div class="head"><div class="ic">${icon("mdi:shield-check-outline")}</div></div>
      <div class="name">${t("security.safe")}</div><div class="sub">${t("tv.sensors_ok", { n: calm })}</div></div>`);
  }
  for (const [i, c] of cams.entries()) tiles.push(`<div class="tile cam" data-f="cam:${i}" data-act="camera" data-cam="${i}">
      <img class="art" src="${esc(camUrl(h, c))}" alt="" decoding="async"><div class="media-body"><div class="name">${esc(h.name(c))}</div></div></div>`);
  return row("security", alerts.length || !cams.length ? t("tabs.security") : t("cameras.title"), tiles, { alarm: alerts.length > 0 });
}
