// The Alvuna panel's Televisions tab: a TV is picked first (cards with its name and state, when there is more than
// one), then only that TV is shown: its state, and its options in three sections: control, settings, error log.
// The data comes from alvuna/tvs/subscribe (custom_components/alvuna/tv.py), which sends the whole list again whenever
// a TV connects, reports, logs an error or is changed; this module only turns it into HTML. The panel handles the
// controls (data-action="tv-…") and sends alvuna/tvs/command and alvuna/tvs/settings.
import { t } from "./strings.js";
import { t as tvT, setLocale } from "../shared/i18n.js";
import { WALLPAPERS } from "../tv/ui/wallpapers.js";
import { ACCENTS } from "../tv/ui/accents.js";
import { STEPS } from "../tv/ui/prefs.js";
import { ROWS } from "../tv/ui/rows.js";
import tvCss from "../tv/styles.css";

// The TV's own tile styles, for the layout editor's tiles (drawn by the TV's code, see previewTiles in the panel),
// scoped to the preview (.tvp): the TV's classes (.name, .sub, .row, .card…) are the panel's too. Its :root variables
// go on .tvp itself, html/body rules are dropped, and its fonts are declared in the document (not in a shadow root).
function splitTop(list) {
  const out = [];
  let depth = 0, cur = "";
  for (const ch of list) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (ch === "," && !depth) { out.push(cur); cur = ""; } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim()).filter(Boolean);
}
function scopeCss(css, scope) {
  let out = "", i = 0;
  while (i < css.length) {
    const open = css.indexOf("{", i);
    if (open < 0) break;
    const head = css.slice(i, open).trim();
    let depth = 1, j = open + 1;
    while (j < css.length && depth) { if (css[j] === "{") depth++; else if (css[j] === "}") depth--; j++; }
    const body = css.slice(open + 1, j - 1);
    if (/^@(media|supports|container)/.test(head)) out += `${head}{${scopeCss(body, scope)}}`;
    else if (head.startsWith("@font-face")) { /* declared in the document */ }
    else if (head.startsWith("@")) out += `${head}{${body}}`;
    else {
      const sels = splitTop(head).map((s) => (s === ":root" ? scope : /^(html|body)\b/.test(s) ? null : `${scope} ${s}`)).filter(Boolean);
      if (sels.length) out += `${sels.join(",")}{${body}}`;
    }
    i = j;
  }
  return out;
}
export const TV_TILE_CSS = scopeCss(tvCss.replace(/\/\*[\s\S]*?\*\//g, ""), ".tvp");
let fontsAdded = false;
export function addTvFonts() {
  if (fontsAdded) return;
  fontsAdded = true;
  const style = document.createElement("style");
  style.textContent = (tvCss.match(/@font-face\s*\{[^}]*\}/g) || []).join("\n");
  document.head.appendChild(style);
}

export { setLocale as setTvLocale };

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ESC[c]);
const icon = (name) => `<ha-icon icon="${name}"></ha-icon>`;

// What the TV shows when it has not said (an older app, or before its first report): its own defaults.
const TV_DEFAULTS = { wallpaper: WALLPAPERS[0].id, accent: ACCENTS[0].id, glass: "frost", ring: false, anim: true, dim: true, shift: true,
  saver: null, exit: null };

function ago(iso, lang) {
  if (!iso) return "";
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return t("tvs.just_now");
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: "auto" });
  if (s < 3600) return rtf.format(-Math.round(s / 60), "minute");
  if (s < 86400) return rtf.format(-Math.round(s / 3600), "hour");
  return rtf.format(-Math.round(s / 86400), "day");
}

const clock = (iso, lang) => new Intl.DateTimeFormat(lang, { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

function duration(seconds, lang) {
  const nf = (n, unit) => new Intl.NumberFormat(lang, { style: "unit", unit, unitDisplay: "long", maximumFractionDigits: 0 }).format(n);
  if (seconds < 3600) return nf(Math.max(1, Math.round(seconds / 60)), "minute");
  if (seconds < 172800) return nf(Math.round(seconds / 3600), "hour");
  return nf(Math.round(seconds / 86400), "day");
}

// "Pokój: Salon", "Kamera: Brama", "Ekran główny" from the report's view and detail ("room:Salon").
function onScreen(st) {
  if (!st.view) return "";
  const [kind, ...rest] = String(st.detail || "").split(":");
  const name = rest.join(":");
  if (st.view === "camera") return t("tvs.views.camera", { name });
  if (st.view === "panel") {
    const label = t(`tvs.panels.${kind}`, { name });
    return label === `tvs.panels.${kind}` ? t("tvs.views.panel") : label.replace(/:\s*$/, "");
  }
  return t(`tvs.views.${st.view}`);
}

// The last key press: the idle time the TV reported, plus the time since that report.
function lastKey(tv) {
  const st = tv.status || {};
  if (st.idle == null || !tv.last_seen) return null;
  const at = new Date(new Date(tv.last_seen).getTime() - st.idle * 1000).toISOString();
  return at;
}

export function tvsTab(ctx) {
  const { data, lang } = ctx;
  if (data === "unavailable") return `<div class="state card"><p>${esc(t("tvs.unavailable"))}</p></div>`;
  if (!data) return `<div class="state"><span class="dot"></span>${esc(t("loading"))}</div>`;
  const intro = `<div class="intro"><p>${esc(t("tvs.intro"))}</p></div>`;
  if (!data.tvs.length) {
    const url = `${location.origin}/alvuna/tv/`;
    return `${intro}<div class="state card">
      <p class="state-title">${esc(t("tvs.none_title"))}</p>
      <p>${esc(t("tvs.none", { url }))}</p>
    </div>`;
  }
  const tv = data.tvs.find((x) => x.entry_id === ctx.selected) || data.tvs[0];
  return intro + (data.tvs.length > 1 ? picker(data.tvs, tv, ctx) : "") + tvDetail(tv, ctx);
}

// The state in a few words, for the picker and the TV's header.
function stateLine(tv, lang) {
  if (!tv.connected) {
    // Without last_seen: not seen since Home Assistant started keeping it (this version), not necessarily never.
    return { on: false, text: tv.last_seen ? `${t("tvs.offline")} · ${t("tvs.seen", { ago: ago(tv.last_seen, lang) })}` : t("tvs.offline") };
  }
  return { on: true, text: tv.since ? t("tvs.online_since", { time: clock(tv.since, lang) }) : t("tvs.online") };
}

function picker(tvs, selected, ctx) {
  return `<div class="tv-picker" role="tablist" aria-label="${esc(t("tvs.pick"))}">${tvs.map((tv) => {
    const st = tv.status || {}, s = stateLine(tv, ctx.lang), on = tv === selected;
    const now = tv.connected && st.view ? onScreen(st) : s.text;
    return `<button class="tv-pick" role="tab" aria-selected="${on}" data-action="tv-pick" data-id="${esc(tv.entry_id)}" data-focus="tv-pick|${esc(tv.entry_id)}">
      <span class="icon tv-icon small ${tv.connected ? "" : "off"}">${icon("mdi:television")}</span>
      <span class="tv-pick-text"><span class="tv-pick-name">${esc(tv.name)}</span>
        <span class="tv-pick-state"><span class="tv-dot ${s.on ? "on" : ""}"></span>${esc(now)}</span></span>
    </button>`;
  }).join("")}</div>`;
}

function tvDetail(tv, ctx) {
  const section = ["control", "layout", "settings", "log"].includes(ctx.section) ? ctx.section : "control";
  const n = (tv.log || []).length;
  const tab = (key, label, extra = "") => `<button class="tab" role="tab" data-action="tv-section" data-key="${key}" data-focus="tv-section|${key}"
    aria-selected="${section === key}">${esc(label)}${extra}</button>`;
  const tabs = `<div class="tabs sub" role="tablist">
    ${tab("control", t("tvs.sections.control"))}
    ${tab("layout", t("tvs.sections.layout"))}
    ${tab("settings", t("tvs.sections.settings"), tv.pending ? ` <span class="pending-dot" title="${esc(t("tvs.pending"))}"></span>` : "")}
    ${tab("log", t("tvs.sections.log"), n ? `<span class="count">${n}</span>` : "")}
  </div>`;
  const body = section === "settings" ? settings(tv, ctx) : section === "log" ? log(tv, ctx) : section === "layout" ? layoutEditor(tv, ctx) : actions(tv, ctx);
  return `${tvCard(tv, ctx)}${tabs}${body}`;
}

function tvCard(tv, ctx) {
  const { lang, data } = ctx;
  const st = tv.status || {};
  const id = esc(tv.entry_id);
  const s = stateLine(tv, lang);
  const state = `<span class="tv-dot ${s.on ? "on" : ""}"></span>${esc(s.text)}`;
  const platform = st.platform ? `<span class="badge muted">${esc(t(`tvs.platform.${st.platform}`))}</span>` : "";
  const device = tv.device_id ? `<a class="tv-link" href="/config/devices/device/${encodeURIComponent(tv.device_id)}" data-nav>${esc(t("tvs.device"))}${ctx.svg(ctx.P.next)}</a>` : "";
  const screenLine = tv.connected && st.view
    ? `<div class="tv-now">
        <span class="tv-now-label">${esc(t("tvs.on_screen"))}</span>
        <span class="tv-now-value">${esc(onScreen(st))}${st.dimmed && st.view !== "saver" ? ` <span class="badge muted">${esc(t("tvs.dimmed"))}</span>` : ""}</span>
      </div>` : "";
  const key = lastKey(tv);
  const facts = [
    key && [t("tvs.last_key"), ago(key, lang)],
    st.home && [t("tvs.home"), st.homes > 1 ? `${st.home} (${t("tvs.homes", { n: st.homes })})` : st.home],
    st.screen && [t("tvs.screen"), st.screen.replace("x", " × ")],
    st.language && [t("tvs.language"), st.language.toUpperCase()],
    tv.connected && st.uptime != null && [t("tvs.uptime"), duration(st.uptime, lang)],
    data.version && [t("tvs.version"), data.version],
  ].filter(Boolean);
  return `<section class="tv" aria-labelledby="tv-${id}">
    <div class="card">
      <div class="tv-head">
        <div class="icon tv-icon ${tv.connected ? "" : "off"}">${icon("mdi:television")}</div>
        <div class="main">
          <h2 id="tv-${id}" class="tv-name">${esc(tv.name)}</h2>
          <div class="sub">${state}${platform}</div>
        </div>
        ${device}
      </div>
      ${screenLine}
      ${facts.length ? `<dl class="tv-facts">${facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>` : ""}
      ${st.ua ? `<details class="tv-ua"><summary>${esc(t("tvs.ua"))}</summary><p class="mono">${esc(st.ua)}</p></details>` : ""}
    </div>
  </section>`;
}

// The TV's screen, live: the TV app itself in a frame (?mirror=<entry>), placed over this slot by the panel (it is
// kept out of the re-rendered HTML, which would reload it).
function preview(tv) {
  const id = esc(tv.entry_id);
  return `<div class="tv-mirror">
    <div class="tv-mirror-head"><h3>${esc(t("tvs.preview"))}</h3>${tv.connected ? `<span class="tv-mirror-note">${esc(t("tvs.preview_note"))}</span>` : ""}</div>
    ${tv.connected ? `<div class="tv-mirror-slot" data-id="${id}"></div>${remote(tv)}`
      : `<div class="tv-mirror-off"><span>${icon("mdi:television-off")}</span><p>${esc(t("tvs.preview_off"))}</p></div>`}
  </div>`;
}

// A remote under the preview, for a touch screen (with a mouse, the preview itself is clicked; with a keyboard, its keys).
function remote(tv) {
  const id = esc(tv.entry_id);
  const k = (key, ic, label, cls = "") => `<button class="rc-btn ${cls}" data-action="tv-key" data-id="${id}" data-key="${key}"
    data-focus="rc|${key}" title="${esc(label)}" aria-label="${esc(label)}">${icon(ic)}</button>`;
  return `<div class="rc" role="group" aria-label="${esc(t("tvs.remote.label"))}">
    ${k("back", "mdi:arrow-left", t("tvs.remote.back"), "rc-back")}
    <div class="rc-pad">
      ${k("up", "mdi:chevron-up", t("tvs.remote.up"), "rc-up")}
      ${k("left", "mdi:chevron-left", t("tvs.remote.left"), "rc-left")}
      <button class="rc-btn rc-ok" data-action="tv-key" data-id="${id}" data-key="ok" data-focus="rc|ok" aria-label="${esc(t("tvs.remote.ok"))}">OK</button>
      ${k("right", "mdi:chevron-right", t("tvs.remote.right"), "rc-right")}
      ${k("down", "mdi:chevron-down", t("tvs.remote.down"), "rc-down")}
    </div>
    <span class="rc-hint">${esc(t("tvs.remote.hint"))}</span>
  </div>`;
}

function actions(tv, ctx) {
  return `<div class="tv-control">${preview(tv)}${commands(tv, ctx)}</div>`;
}

function commands(tv, ctx) {
  const id = esc(tv.entry_id), off = tv.connected ? "" : "disabled";
  const st = tv.status || {};
  const btn = (command, ic, label, extra = "") => `<button class="tv-act" data-action="tv-cmd" data-id="${id}" data-command="${command}"
    data-focus="tv-cmd|${id}|${command}" ${off} ${extra}>${icon(ic)}<span>${esc(label)}</span></button>`;
  const saver = st.view === "saver" ? btn("saver_off", "mdi:monitor-eye", t("tvs.saver_off")) : btn("saver_on", "mdi:monitor-star", t("tvs.saver_on"));
  const places = ["summary", "weather", ...(ctx.hasClimate ? ["climate"] : []), "settings"];
  const open = `<select class="tv-select" data-action="tv-open" data-id="${id}" data-focus="tv-open|${id}" aria-label="${esc(t("tvs.open_label"))}" ${off}>
      <option value="">${esc(t("tvs.open"))}</option>
      <optgroup label="${esc(t("tvs.places"))}">${places.map((p) => `<option value="${p}">${esc(t(`tvs.targets.${p}`))}</option>`).join("")}</optgroup>
      ${ctx.rooms.length ? `<optgroup label="${esc(t("tvs.rooms"))}">${ctx.rooms.map((r) => `<option value="room:${esc(r.area)}">${esc(r.name)}</option>`).join("")}</optgroup>` : ""}
    </select>`;
  const camera = ctx.cameras.length ? `<select class="tv-select" data-action="tv-camera" data-id="${id}" data-focus="tv-camera|${id}" aria-label="${esc(t("tvs.camera_label"))}" ${off}>
      <option value="">${esc(t("tvs.camera"))}</option>
      ${ctx.cameras.map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join("")}
    </select>` : "";
  const flash = ctx.flash[tv.entry_id];
  const draft = ctx.drafts[tv.entry_id] || "";
  return `<div class="tv-block">
    <div class="tv-flash-row" role="status">${flash ? `<span class="tv-flash ${flash.error ? "error" : ""}">${esc(flash.text)}</span>` : ""}</div>
    <div class="card tv-pad">
      <div class="tv-acts">
        ${btn("reload", "mdi:refresh", t("tvs.reload"))}
        ${btn("home", "mdi:home-outline", t("tvs.go_home"))}
        ${saver}
        ${st.platform && st.platform !== "browser" ? btn("exit", "mdi:exit-to-app", t("tvs.exit")) : ""}
      </div>
      <div class="tv-selects">${open}${camera}</div>
      <form class="tv-msg" data-action="tv-notify" data-id="${id}">
        <label class="tv-msg-field"><span class="sr">${esc(t("tvs.message"))}</span>
          <input type="text" maxlength="500" data-action="tv-draft" data-id="${id}" data-focus="tv-draft|${id}" value="${esc(draft)}"
            placeholder="${esc(t("tvs.message_placeholder"))}" aria-label="${esc(t("tvs.message"))}" autocomplete="off" ${off}>
        </label>
        <button class="button small" type="submit" data-focus="tv-send|${id}" ${off || (draft.trim() ? "" : "disabled")}>${esc(t("tvs.send"))}</button>
      </form>
      ${tv.connected ? "" : `<p class="note in">${esc(t("tvs.offline_hint"))}</p>`}
    </div>
  </div>`;
}

function settings(tv, ctx) {
  const id = esc(tv.entry_id);
  const reported = tv.settings && Object.keys(tv.settings).length > 0;
  const s = { ...TV_DEFAULTS, ...(tv.settings || {}) };
  const head = `<div class="tv-flash-row">${tv.pending ? `<span class="badge warn">${esc(t("tvs.pending"))}</span>` : ""}</div>`;
  const set = (key, value, label, inner, cls = "") => `<button class="${cls}" data-action="tv-set" data-id="${id}" data-key="${key}" data-value="${esc(value)}"
    data-focus="tv-set|${id}|${key}|${esc(value)}" aria-pressed="${String(s[key]) === String(value)}" title="${esc(label)}" aria-label="${esc(label)}">${inner}</button>`;
  const wp = (list) => `<div class="tv-wps">${list.map((w) => set("wallpaper", w.id, w.name || w.id,
    `<span class="tv-wp" style="background:${esc(w.base || "#000")};background:${esc(w.preview || w.bg)}"></span><span class="tv-wp-name">${esc(w.name || w.id)}</span>`, "tv-wp-btn")).join("")}</div>`;
  const accents = `<div class="tv-accents">${ACCENTS.map((a) => set("accent", a.id, a.name || a.id,
    `<span class="tv-swatch" style="background:${a.c};color:${a.ink}">${s.accent === a.id ? icon("mdi:check-bold") : ""}</span>`, "tv-accent")).join("")}</div>`;
  const glass = `<div class="seg" role="group" aria-label="${esc(tvT("tv.settings.glass"))}">${STEPS.glass.map((g) =>
    set("glass", g, tvT(`tv.settings.glass_${g}`), esc(tvT(`tv.settings.glass_${g}`)), "seg-btn")).join("")}</div>`;
  const row = (label, hint, control) => `<div class="tv-row"><div class="main"><div class="tv-row-label">${esc(label)}</div>
    ${hint ? `<div class="sub">${esc(hint)}</div>` : ""}</div><div class="controls">${control}</div></div>`;
  const toggle = (key) => ctx.switch(`tv-pref|${tv.entry_id}|${key}`, s[key], tvT(`tv.settings.${key}`), `data-tv-id="${id}" data-tv-key="${key}"`);
  const minutes = (key, zero) => {
    const dflt = ctx.data.defaults?.[key];
    const fmt = (v) => (v === 0 ? zero : tvT("tv.settings.min", { n: v }));
    const values = STEPS[key].includes(s[key]) || s[key] == null ? STEPS[key] : [...STEPS[key], s[key]].sort((a, b) => a - b);
    return `<select class="tv-select" data-action="tv-minutes" data-id="${id}" data-key="${key}" data-focus="tv-min|${id}|${key}" aria-label="${esc(tvT(`tv.settings.${key}`))}">
      <option value="" ${s[key] == null ? "selected" : ""}>${esc(t("tvs.follow_ha", { value: fmt(Number(dflt ?? 0)) }))}</option>
      ${values.map((v) => `<option value="${v}" ${s[key] === v ? "selected" : ""}>${esc(fmt(v))}</option>`).join("")}
    </select>`;
  };
  const sec = (key) => `<div class="tv-sec">${esc(tvT(`tv.settings.${key}`))}</div>`;
  return `<div class="tv-block">${head}
    <div class="card tv-pad tv-settings">
      ${reported ? "" : `<p class="note in">${esc(t("tvs.no_settings"))}</p>`}
      ${sec("look")}
      <div class="tv-field"><div class="tv-row-label">${esc(tvT("tv.settings.wallpaper"))}</div>
        <div class="tv-sub-label">${esc(tvT("tv.settings.colors"))}</div>${wp(WALLPAPERS.filter((w) => !w.photo))}
        <div class="tv-sub-label">${esc(tvT("tv.settings.photos"))}</div>${wp(WALLPAPERS.filter((w) => w.photo))}</div>
      <div class="tv-field"><div class="tv-row-label">${esc(tvT("tv.settings.accent"))}</div>${accents}</div>
      <div class="tv-field"><div class="tv-row-label">${esc(tvT("tv.settings.glass"))}</div>${glass}</div>
      ${row(tvT("tv.settings.ring"), tvT("tv.settings.ring_hint"), toggle("ring"))}
      ${sec("screen")}
      ${row(tvT("tv.settings.saver"), tvT("tv.settings.saver_hint"), minutes("saver", tvT("tv.settings.off")))}
      ${row(tvT("tv.settings.dim"), tvT("tv.settings.dim_hint"), toggle("dim"))}
      ${row(tvT("tv.settings.shift"), tvT("tv.settings.shift_hint"), toggle("shift"))}
      ${row(tvT("tv.settings.exit"), tvT("tv.settings.exit_hint"), minutes("exit", tvT("tv.settings.never")))}
      ${sec("performance")}
      ${row(tvT("tv.settings.anim"), tvT("tv.settings.anim_hint"), toggle("anim"))}
      <p class="note in">${esc(t("tvs.settings_hint"))}</p>
    </div>
  </div>`;
}

// --- this TV's layout: its home screen as rows of tiles, in its order ---------------------------------------
// Rows in the TV's order, then the rest in the default one; tiles likewise (the TV does the same, home.js renderHome).
const rowOrder = (L) => [...(L.rows || []).filter((k) => ROWS.includes(k)), ...ROWS.filter((k) => !(L.rows || []).includes(k))];
function tileOrder(L, row) {
  const want = L.order?.[row.key] || [], ids = row.items.map((x) => x.id);
  const pos = (id) => { const i = want.indexOf(id); return i < 0 ? want.length + ids.indexOf(id) : i; };
  return row.items.slice().sort((a, b) => pos(a.id) - pos(b.id));
}

// One step of an edit, on a copy: the panel sends the whole layout.
export function nextLayout(layout, catalog, op) {
  const L = JSON.parse(JSON.stringify(layout || {}));
  const toggle = (list, id) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  const swap = (list, i, j) => { if (j < 0 || j >= list.length) return list; const out = list.slice(); [out[i], out[j]] = [out[j], out[i]]; return out; };
  if (op.kind === "row-move") {
    const rows = rowOrder(L), i = rows.indexOf(op.row);
    L.rows = swap(rows, i, i + op.step);
  } else if (op.kind === "row-hide") L.hidden_rows = toggle(L.hidden_rows || [], op.row);
  else if (op.kind === "tile-hide") L.hidden = toggle(L.hidden || [], op.id);
  else if (op.kind === "tile-move") {
    const row = catalog.find((r) => r.key === op.row);
    if (!row) return L;
    const ids = tileOrder(L, row).map((x) => x.id), i = ids.indexOf(op.id);
    L.order = { ...(L.order || {}), [op.row]: swap(ids, i, i + op.step) };
  } else if (op.kind === "row-order") L.rows = op.ids.filter((k) => ROWS.includes(k));
  else if (op.kind === "tile-order") L.order = { ...(L.order || {}), [op.row]: op.ids };
  else if (op.kind === "reset") return {};
  return L;
}

function layoutEditor(tv, ctx) {
  const id = esc(tv.entry_id), catalog = tv.catalog || [];
  if (!catalog.length) return `<div class="tv-flash-row"></div><div class="state card"><p>${esc(t("tvs.layout.no_catalog"))}</p></div>`;
  const L = tv.settings?.layout || {}, hiddenRows = new Set(L.hidden_rows || []), hidden = new Set(L.hidden || []);
  const wp = WALLPAPERS.find((w) => w.id === tv.settings?.wallpaper) || WALLPAPERS[0];
  // The TV's accent colour on the tiles drawn like on the TV.
  const ac = ACCENTS.find((a) => a.id === tv.settings?.accent) || ACCENTS[0];
  const accentVars = `--lime:${ac.c};--lime-rgb:${ac.rgb};--lime-ink:${ac.ink};--lime-deep:${ac.deep};--lime-deeper:${ac.deeper}`;
  const rows = rowOrder(L).map((k) => catalog.find((r) => r.key === k)).filter(Boolean);
  const btn = (attrs, ic, label, disabled = false) => `<button class="tvl-btn" ${attrs} title="${esc(label)}" aria-label="${esc(label)}" ${disabled ? "disabled" : ""}>${icon(ic)}</button>`;
  const body = rows.map((row, ri) => {
    const off = hiddenRows.has(row.key), tiles = tileOrder(L, row);
    const rattrs = (op, extra = "") => `data-action="tv-layout" data-id="${id}" data-op="${op}" data-row="${row.key}" ${extra}`;
    // The grip drags the row (a finger, or the keyboard: up/down); a mouse can take the row by its whole header.
    const head = `<div class="tvl-row-head">
      <button class="tvl-grip" data-grip data-action="tv-layout-key" data-id="${id}" data-row="${row.key}" data-focus="tvl|${row.key}|grip"
        title="${esc(t("tvs.layout.drag_row", { name: row.title }))}" aria-label="${esc(t("tvs.layout.drag_row", { name: row.title }))}">${icon("mdi:drag")}</button>
      <h4>${esc(row.title)}</h4>${off ? `<span class="badge muted">${esc(t("tvs.layout.row_hidden"))}</span>` : ""}
      <span class="spacer"></span>
      ${btn(`${rattrs("row-hide")} data-focus="tvl|${row.key}|hide"`, off ? "mdi:eye-off-outline" : "mdi:eye-outline",
        t(off ? "tvs.layout.row_show" : "tvs.layout.row_hide", { name: row.title }))}
    </div>`;
    const track = tiles.map((it, ti) => {
      const hid = hidden.has(it.id), attrs = (op, extra = "") => `data-action="tv-layout" data-id="${id}" data-op="${op}" data-row="${row.key}" data-tile="${esc(it.id)}" ${extra}`;
      // The whole tile drags with a mouse, the grip with a finger; focused, left/right move it.
      const live = ctx.preview?.get(it.id);
      const common = `data-sort-item="${esc(it.id)}" tabindex="0" data-action="tv-layout-key" data-id="${id}" data-row="${row.key}"
        data-tile="${esc(it.id)}" data-focus="tvl|${esc(it.id)}" aria-label="${esc(t("tvs.layout.drag_tile", { name: it.name || it.id }))}"`;
      // The tile as the TV draws it, from the home's live states, at the TV's proportions; the controls under it.
      if (live) {
        return `<div class="tvl-tile live ${hid ? "off" : ""}" ${common}>
          <div class="tvp-box"><div class="tvp" style="${accentVars}">${live}</div></div>
          <div class="tvl-tile-bar">
            <span class="tvl-grip small" data-grip aria-hidden="true">${icon("mdi:drag")}</span>
            ${hid ? `<span class="tvl-hidden">${esc(t("tvs.layout.row_hidden"))}</span>` : ""}
            ${btn(`${attrs("tile-hide")} data-focus="tvl|${esc(it.id)}|hide"`, hid ? "mdi:eye-off-outline" : "mdi:eye-outline", t(hid ? "tvs.layout.tile_show" : "tvs.layout.tile_hide", { name: it.name }))}
          </div>
        </div>`;
      }
      return `<div class="tvl-tile ${hid ? "off" : ""}" ${common}>
        <div class="tvl-tile-top">
          <div class="tvl-tile-ic">${icon(it.icon || "mdi:checkbox-blank-outline")}</div>
          <span class="tvl-grip small" data-grip aria-hidden="true">${icon("mdi:drag")}</span>
        </div>
        <div class="tvl-tile-name">${esc(it.name || it.id)}</div>
        <div class="tvl-tile-ctl">
          ${btn(`${attrs("tile-hide")} data-focus="tvl|${esc(it.id)}|hide"`, hid ? "mdi:eye-off-outline" : "mdi:eye-outline", t(hid ? "tvs.layout.tile_show" : "tvs.layout.tile_hide", { name: it.name }))}
          ${hid ? `<span class="tvl-hidden">${esc(t("tvs.layout.row_hidden"))}</span>` : ""}
        </div>
      </div>`;
    }).join("");
    const note = row.key === "working" ? t("tvs.layout.working_note") : row.key === "security" ? t("tvs.layout.security_note")
      : !tiles.length ? t("tvs.layout.empty") : "";
    return `<section class="tvl-row ${off ? "off" : ""}" data-sort-item="${row.key}" data-sort-handle=".tvl-row-head">${head}
      ${track ? `<div class="tvl-track" data-sort-list="x" data-id="${id}" data-row="${row.key}" data-scroll-key="tvl|${row.key}">${track}</div>` : ""}
      ${note ? `<p class="tvl-note">${esc(note)}</p>` : ""}</section>`;
  }).join("");
  const changed = Object.keys(L).some((k) => (Array.isArray(L[k]) ? L[k].length : Object.keys(L[k] || {}).length));
  return `<div class="tv-flash-row">${tv.pending ? `<span class="badge warn">${esc(t("tvs.pending"))}</span>` : ""}
      ${changed ? `<button class="text-button" data-action="tv-layout" data-id="${id}" data-op="reset" data-focus="tvl-reset">${esc(t("tvs.layout.reset"))}</button>` : ""}</div>
    <div class="tvl-screen" data-sort-list="y" data-id="${id}" style="background:${esc(wp.base || "#0b2633")};background:${esc(wp.bg)}">${body}</div>
    <p class="note">${esc(t("tvs.layout.hint"))}</p>`;
}

function log(tv, ctx) {
  const id = esc(tv.entry_id), lines = tv.log || [];
  const head = `<div class="tv-flash-row">${lines.length ? `<button class="text-button" data-action="tv-clear-log" data-id="${id}"
    data-focus="tv-clear|${id}">${esc(t("tvs.clear"))}</button>` : ""}</div>`;
  const body = lines.length ? `<ol class="tv-log">${lines.slice().reverse().map((l) => `<li>
      <span class="tv-log-time">${esc(new Intl.DateTimeFormat(ctx.lang, { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(l.at)))}</span>
      <span class="tv-log-msg mono">${esc(l.message)}${l.source ? ` <span class="id">${esc(l.source)}</span>` : ""}</span></li>`).join("")}</ol>`
    : `<div class="empty">${esc(t("tvs.log_empty"))}</div>`;
  return `<div class="tv-block">${head}<div class="card">${body}</div></div>`;
}

export const TVS_STYLE = `
.tabs { display: flex; gap: 4px; margin: 0 0 20px; padding: 4px; border-radius: 999px; background: var(--alv-hover); width: fit-content; }
.tab { border: 0; background: transparent; padding: 8px 18px; border-radius: 999px; font-size: 15px; font-weight: 500; color: var(--alv-sub); cursor: pointer; display: inline-flex; gap: 6px; align-items: baseline; }
.tab[aria-selected="true"] { background: var(--alv-card); color: var(--primary-text-color); box-shadow: 0 1px 3px rgba(0, 0, 0, .12); }
.tab .count { font-size: 13px; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

section.tv { margin-top: 8px; }
.tv-picker { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 320px)); gap: 10px; margin: 18px 0 20px; }
.tv-pick { display: grid; grid-template-columns: 36px minmax(0, 1fr); gap: 12px; align-items: center; text-align: left; padding: 12px 14px;
  border-radius: var(--alv-radius); border: 1px solid var(--alv-div); background: var(--alv-card); cursor: pointer; color: var(--primary-text-color); }
.tv-pick:hover { background: var(--alv-hover); }
.tv-pick[aria-selected="true"] { border-color: var(--alv-accent); box-shadow: 0 0 0 1px var(--alv-accent); background: var(--alv-tint); }
.tv-icon.small { width: 36px; height: 36px; border-radius: 10px; --mdc-icon-size: 22px; }
.tv-pick-text { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.tv-pick-name { font-size: 16px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tv-pick-state { font-size: 13px; color: var(--alv-sub); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tabs.sub { margin: 20px 0 0; }
.tv-control { display: grid; gap: 4px 24px; }
.tv-mirror { margin-top: 12px; }
.tv-mirror-head { display: flex; align-items: baseline; gap: 12px; margin: 0 2px 8px; flex-wrap: wrap; }
.tv-mirror-head h3 { margin: 0; font-size: 16px; font-weight: 600; }
.tv-mirror-note { font-size: 13px; color: var(--alv-sub); }
.tv-mirror-slot { width: 100%; aspect-ratio: 16 / 9; border-radius: var(--alv-radius); background: #000; }
.rc { display: flex; align-items: center; gap: 18px; margin-top: 12px; flex-wrap: wrap; }
.rc-pad { display: grid; grid-template-columns: repeat(3, 44px); grid-template-rows: repeat(3, 44px); gap: 4px; }
.rc-btn { border: 1px solid var(--alv-div); background: var(--alv-card); color: var(--primary-text-color); border-radius: 12px; cursor: pointer;
  display: grid; place-items: center; padding: 0; --mdc-icon-size: 24px; font: inherit; font-weight: 600; }
.rc-btn:hover { background: var(--alv-tint); border-color: transparent; }
.rc-btn:active { transform: scale(.94); }
.rc-up { grid-area: 1 / 2; } .rc-left { grid-area: 2 / 1; } .rc-ok { grid-area: 2 / 2; border-radius: 50%; background: var(--alv-tint); color: var(--alv-accent); }
.rc-right { grid-area: 2 / 3; } .rc-down { grid-area: 3 / 2; }
.rc-back { width: 44px; height: 44px; border-radius: 50%; }
.rc-hint { font-size: 13px; color: var(--alv-sub); max-width: 420px; line-height: 1.45; }
.tv-mirror-off { width: 100%; aspect-ratio: 16 / 9; border-radius: var(--alv-radius); background: var(--alv-wash); border: 1px dashed var(--alv-div);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: var(--alv-sub); text-align: center; padding: 16px; }
.tv-mirror-off span { --mdc-icon-size: 40px; opacity: .6; }
.tv-mirror-off p { margin: 0; font-size: 14px; max-width: 360px; }
@media (min-width: 1300px) {
  .tv-control { grid-template-columns: minmax(0, 1.7fr) minmax(340px, 1fr); align-items: start; }
}
.pending-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--warning-color, #ffa600); display: inline-block; align-self: center; }
.tv-flash-row { display: flex; align-items: center; justify-content: flex-end; gap: 8px; min-height: 30px; margin: 6px 0 4px; }
.tv-head { display: grid; grid-template-columns: 44px minmax(0, 1fr) auto; gap: 14px; align-items: center; padding: 16px; }
.tv-icon { width: 44px; height: 44px; border-radius: 12px; --mdc-icon-size: 26px; }
.tv-icon.off { background: var(--alv-hover); color: var(--alv-sub); }
.tv-name { font-size: 20px; }
.tv-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--alv-sub); opacity: .5; display: inline-block; margin-right: 6px; }
.tv-dot.on { background: var(--success-color, #43a047); opacity: 1; box-shadow: 0 0 0 3px rgba(67, 160, 71, .18); }
.tv-head .sub { font-size: 14px; }
.tv-link { display: inline-flex; align-items: center; color: var(--alv-accent); text-decoration: none; font-size: 14px; font-weight: 500; white-space: nowrap; }
.tv-link svg { width: 18px; height: 18px; }
.tv-link:hover { text-decoration: underline; }
.tv-now { display: flex; flex-wrap: wrap; gap: 4px 12px; align-items: baseline; padding: 14px 16px; background: var(--alv-wash); }
.tv-now-label { font-size: 13px; color: var(--alv-sub); }
.tv-now-value { font-size: 17px; font-weight: 500; display: inline-flex; gap: 8px; align-items: center; }
.tv-facts { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px 20px; margin: 0; padding: 14px 16px; }
.tv-facts dt { font-size: 12px; color: var(--alv-sub); }
.tv-facts dd { margin: 2px 0 0; font-size: 15px; }
.tv-ua { padding: 0 16px 14px; font-size: 13px; color: var(--alv-sub); }
.tv-ua summary { cursor: pointer; width: fit-content; }
.tv-ua p { margin: 6px 0 0; overflow-wrap: anywhere; }

.tv-block { margin-top: 0; }
.section-head.small { min-height: 32px; margin-bottom: 8px; justify-content: flex-start; }
.section-head.small h3 { margin: 0; font-size: 16px; font-weight: 600; display: flex; gap: 8px; align-items: baseline; }
.section-head.small .text-button { margin-left: auto; font-size: 14px; padding: 6px 10px; }
.section-head.small .spacer { flex: 1; }
.section-head.small .spacer + .text-button { margin-left: 0; }
.tv-flash { font-size: 13px; color: var(--success-color, #2e7d32); }
.tv-flash.error { color: var(--error-color, #c62828); }
.tv-pad { padding: 14px 16px; }
.card.tv-pad > * + *::before { display: none; }
.tv-acts { display: flex; flex-wrap: wrap; gap: 8px; }
.tv-act { display: inline-flex; align-items: center; gap: 8px; border: 1px solid var(--alv-div); background: var(--alv-card); border-radius: 999px;
  padding: 8px 16px 8px 12px; font-size: 14px; font-weight: 500; cursor: pointer; --mdc-icon-size: 20px; color: var(--primary-text-color); }
.tv-act ha-icon { color: var(--alv-accent); }
.tv-act:hover:not(:disabled) { background: var(--alv-tint); border-color: transparent; }
.tv-act:disabled, .tv-select:disabled { opacity: .45; cursor: default; }
.tv-selects { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.tv-select { height: 40px; border-radius: 10px; border: 1px solid var(--alv-div); background: var(--alv-card); color: var(--primary-text-color);
  font: inherit; font-size: 14px; padding: 0 10px; min-width: 180px; max-width: 100%; cursor: pointer; }
.tv-msg { display: flex; gap: 8px; margin-top: 12px; align-items: center; }
.tv-msg-field { flex: 1; min-width: 0; }
.tv-msg input { width: 100%; height: 40px; border-radius: 10px; border: 1px solid var(--alv-div); background: var(--alv-card); color: var(--primary-text-color);
  font: inherit; font-size: 15px; padding: 0 12px; }
.tv-msg input:focus, .tv-select:focus { outline: 2px solid var(--alv-accent); outline-offset: -1px; border-color: transparent; }
.button.small { margin: 0; padding: 9px 18px; font-size: 14px; }
.button:disabled { opacity: .45; cursor: default; }
.note.in { margin: 12px 0 0; }

.tv-settings { padding-top: 6px; }
.tv-sec { margin: 16px 0 6px; font-size: 12px; font-weight: 600; color: var(--alv-sub); letter-spacing: .02em; }
.tv-field { padding: 8px 0 12px; }
.tv-row-label { font-size: 15px; font-weight: 500; }
.tv-sub-label { font-size: 12px; color: var(--alv-sub); margin: 10px 0 6px; }
.tv-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 12px; align-items: center; padding: 10px 0; border-top: 1px solid var(--alv-div); }
.tv-row .sub { margin-top: 2px; }
.tv-row .tv-select { min-width: 160px; }
.tv-wps { display: grid; grid-template-columns: repeat(auto-fill, minmax(104px, 1fr)); gap: 10px; }
.tv-wp-btn { border: 0; background: transparent; padding: 0; cursor: pointer; text-align: left; display: flex; flex-direction: column; gap: 4px; border-radius: 10px; }
.tv-wp { display: block; aspect-ratio: 16 / 9; border-radius: 10px; background-size: cover; outline: 1px solid var(--alv-div); outline-offset: -1px; }
.tv-wp-btn[aria-pressed="true"] .tv-wp { outline: 3px solid var(--alv-accent); outline-offset: 1px; }
.tv-wp-name { font-size: 12px; color: var(--alv-sub); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tv-wp-btn[aria-pressed="true"] .tv-wp-name { color: var(--primary-text-color); font-weight: 500; }
.tv-accents { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 8px; }
.tv-accent { border: 0; background: transparent; padding: 3px; border-radius: 50%; cursor: pointer; }
.tv-swatch { width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; --mdc-icon-size: 20px; outline: 1px solid rgba(0, 0, 0, .12); outline-offset: -1px; }
.tv-accent[aria-pressed="true"] { box-shadow: 0 0 0 2px var(--alv-accent); }
.seg { display: inline-flex; flex-wrap: wrap; margin-top: 8px; border: 1px solid var(--alv-div); border-radius: 10px; overflow: hidden; }
.seg-btn { border: 0; background: var(--alv-card); padding: 8px 14px; font-size: 14px; cursor: pointer; color: var(--primary-text-color); }
.seg-btn + .seg-btn { border-left: 1px solid var(--alv-div); }
.seg-btn[aria-pressed="true"] { background: var(--alv-tint); color: var(--alv-accent); font-weight: 600; }

.tv-log { list-style: none; margin: 0; padding: 6px 0; max-height: 320px; overflow-y: auto; }
.tv-log li { display: grid; grid-template-columns: 76px minmax(0, 1fr); gap: 10px; padding: 6px 16px; font-size: 13px; }
.tv-log-time { color: var(--alv-sub); font-variant-numeric: tabular-nums; }
.tv-log-msg { overflow-wrap: anywhere; }

.tvl-screen { border-radius: var(--alv-radius); padding: 18px 0 8px; color: #fff; background-size: cover; overflow: hidden;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .08); }
.tvl-row { padding: 0 0 14px; }
.tvl-row-head { display: flex; align-items: center; gap: 6px; padding: 0 14px 8px 10px; }
.tvl-row-head h4 { margin: 0; font-size: 16px; font-weight: 600; color: rgba(255, 255, 255, .92); }
.tvl-row-head .spacer { flex: 1; }
.tvl-row.off .tvl-row-head h4, .tvl-row.off .tvl-track { opacity: .38; }
.tvl-row .badge.muted { background: rgba(255, 255, 255, .14); color: rgba(255, 255, 255, .8); }
.tvl-track { display: flex; gap: 10px; overflow-x: auto; padding: 2px 20px 6px; scrollbar-width: thin; }
.tvl-tile { flex: none; width: 140px; border-radius: 14px; padding: 12px 10px 8px; display: flex; flex-direction: column; gap: 8px;
  background: rgba(255, 255, 255, .12); backdrop-filter: blur(6px); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .1); }
.tvl-tile.off { background: rgba(0, 0, 0, .25); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .06); }
.tvl-tile.off .tvl-tile-ic, .tvl-tile.off .tvl-tile-name { opacity: .4; }
.tvl-tile-ic { --mdc-icon-size: 24px; color: rgba(255, 255, 255, .95); }
.tvl-tile-name { font-size: 14px; font-weight: 500; line-height: 1.25; min-height: 2.5em; overflow: hidden; display: -webkit-box;
  -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.tvl-tile-ctl { display: flex; align-items: center; gap: 4px; margin: 0 -4px; }
.tvl-hidden { font-size: 11px; color: rgba(255, 255, 255, .6); }
.tvl-tile-top { display: flex; align-items: flex-start; justify-content: space-between; }
.tvl-tile { cursor: grab; user-select: none; -webkit-user-select: none; }
.tvl-tile:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
.tvl-grip { border: 0; background: transparent; color: rgba(255, 255, 255, .7); cursor: grab; display: grid; place-items: center;
  width: 30px; height: 30px; border-radius: 8px; padding: 0; --mdc-icon-size: 22px; touch-action: none; }
.tvl-grip.small { width: 26px; height: 26px; margin: -6px -4px 0 0; --mdc-icon-size: 20px; }
.tvl-grip:hover { background: rgba(255, 255, 255, .14); color: #fff; }
.tvl-grip:focus-visible { outline: 2px solid #fff; }
.tvl-row-head { cursor: grab; user-select: none; -webkit-user-select: none; }
.dragging { cursor: grabbing !important; z-index: 5; position: relative; transition: none !important; }
.tvl-tile.dragging { box-shadow: 0 14px 30px rgba(0, 0, 0, .45), inset 0 0 0 2px rgba(255, 255, 255, .6); background: rgba(255, 255, 255, .22); }
.tvl-row.dragging { background: rgba(255, 255, 255, .08); box-shadow: 0 14px 30px rgba(0, 0, 0, .4); border-radius: 12px; }
.sorting { scroll-behavior: auto; }
/* A tile drawn by the TV's code, at 42% of its size on the TV (320 × 210 px there), larger as the editor widens. */
.tvl-screen { container-type: inline-size; }
.tvl-tile.live { width: auto; padding: 0; background: transparent; box-shadow: none; backdrop-filter: none; gap: 4px; border-radius: 0; }
.tvp-box { zoom: .42; }
@container (min-width: 1000px) { .tvp-box { zoom: .5; } }
@container (min-width: 1300px) { .tvp-box { zoom: .56; } }
@container (min-width: 1700px) { .tvp-box { zoom: .64; } }
.tvp { color: #fff; font: 400 24px/1.3 Figtree, system-ui, sans-serif; -webkit-font-smoothing: antialiased; pointer-events: none; }
.tvp .tile { transition: none; }
.tvl-tile.live.off .tvp { opacity: .32; filter: grayscale(.6); }
.tvl-tile.live.dragging { box-shadow: none; background: transparent; }
.tvl-tile.live.dragging .tvp .tile { box-shadow: 0 24px 50px rgba(0, 0, 0, .5); outline: 4px solid rgba(255, 255, 255, .7); }
.tvl-tile.live:focus-visible { outline: none; }
.tvl-tile.live:focus-visible .tvp .tile { outline: 5px solid #fff; outline-offset: 4px; }
.tvl-tile-bar { display: flex; align-items: center; gap: 2px; min-height: 30px; }
.tvl-tile-bar .tvl-grip.small { margin: 0; }
.tvl-btn { width: 32px; height: 32px; border: 0; border-radius: 50%; background: transparent; color: rgba(255, 255, 255, .85); cursor: pointer;
  display: grid; place-items: center; --mdc-icon-size: 20px; padding: 0; }
.tvl-btn:hover:not(:disabled) { background: rgba(255, 255, 255, .16); color: #fff; }
.tvl-btn:disabled { opacity: .25; cursor: default; }
.tvl-btn:focus-visible { outline: 2px solid #fff; outline-offset: 1px; }
.tvl-note { margin: 2px 20px 0; font-size: 12px; color: rgba(255, 255, 255, .62); }

@media (max-width: 600px) {
  .tvl-tile { width: 124px; }
  .tv-head { grid-template-columns: 40px minmax(0, 1fr); }
  .tv-head .tv-link { grid-column: 2; }
  .tv-select { min-width: 0; flex: 1 1 160px; }
  .tv-row { grid-template-columns: 1fr; }
  .tv-facts { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
`;
