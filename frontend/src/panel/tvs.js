// The Alvuna panel's Televisions tab: each paired TV with what it shows now, commands for it and its settings.
// The data comes from alvuna/tvs/subscribe (custom_components/alvuna/tv.py), which sends the whole list again whenever
// a TV connects, reports, logs an error or is changed; this module only turns it into HTML. The panel handles the
// controls (data-action="tv-…") and sends alvuna/tvs/command and alvuna/tvs/settings.
import { t } from "./strings.js";
import { t as tvT, setLocale } from "../shared/i18n.js";
import { WALLPAPERS } from "../tv/ui/wallpapers.js";
import { ACCENTS } from "../tv/ui/accents.js";
import { STEPS } from "../tv/ui/prefs.js";

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
  return intro + data.tvs.map((tv) => tvCard(tv, ctx)).join("");
}

function tvCard(tv, ctx) {
  const { lang, data } = ctx;
  const st = tv.status || {};
  const id = esc(tv.entry_id);
  const state = tv.connected
    ? `<span class="tv-dot on"></span>${esc(tv.since ? t("tvs.online_since", { time: clock(tv.since, lang) }) : t("tvs.online"))}`
    // Without last_seen: not seen since Home Assistant started keeping it (this version), not necessarily never.
    : `<span class="tv-dot"></span>${esc(tv.last_seen ? `${t("tvs.offline")} · ${t("tvs.seen", { ago: ago(tv.last_seen, lang) })}` : t("tvs.offline"))}`;
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
    ${actions(tv, ctx)}
    ${settings(tv, ctx)}
    ${log(tv, ctx)}
  </section>`;
}

function actions(tv, ctx) {
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
    <div class="section-head small"><h3>${esc(t("tvs.actions"))}</h3>
      ${flash ? `<span class="tv-flash ${flash.error ? "error" : ""}" role="status">${esc(flash.text)}</span>` : ""}</div>
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
  const open = ctx.open.has(`settings|${tv.entry_id}`);
  const head = `<div class="section-head small"><h3>${esc(t("tvs.settings"))}</h3>
    ${tv.pending ? `<span class="badge warn">${esc(t("tvs.pending"))}</span>` : ""}
    <button class="text-button" data-action="tv-toggle-open" data-key="settings|${id}" data-focus="tv-open-settings|${id}" aria-expanded="${open}">
      ${esc(t(open ? "tvs.hide" : "tvs.show"))}</button></div>`;
  if (!open) return `<div class="tv-block">${head}</div>`;
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

function log(tv, ctx) {
  const id = esc(tv.entry_id), lines = tv.log || [];
  const open = ctx.open.has(`log|${tv.entry_id}`);
  const head = `<div class="section-head small"><h3>${esc(t("tvs.log"))}${lines.length ? `<span class="count">${lines.length}</span>` : ""}</h3>
    <span class="spacer"></span>
    ${open && lines.length ? `<button class="text-button" data-action="tv-clear-log" data-id="${id}" data-focus="tv-clear|${id}">${esc(t("tvs.clear"))}</button>` : ""}
    <button class="text-button" data-action="tv-toggle-open" data-key="log|${id}" data-focus="tv-open-log|${id}" aria-expanded="${open}">
      ${esc(t(open ? "tvs.hide" : "tvs.show"))}</button></div>`;
  if (!open) return `<div class="tv-block">${head}</div>`;
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

section.tv { margin-top: 28px; }
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

.tv-block { margin-top: 18px; }
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

@media (max-width: 600px) {
  .tv-head { grid-template-columns: 40px minmax(0, 1fr); }
  .tv-head .tv-link { grid-column: 2; }
  .tv-select { min-width: 0; flex: 1 1 160px; }
  .tv-row { grid-template-columns: 1fr; }
  .tv-facts { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
`;
