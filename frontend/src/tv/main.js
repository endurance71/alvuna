// Alvuna TV: a Home Assistant dashboard built for the TV and its remote. Rows of tiles (Google TV style), detail
// panels, a screensaver for the OLED and an exit after a long idle. What it shows is the layout the Alvuna integration
// builds from the home's areas and devices, adjusted in the Alvuna panel (alvuna/layout/subscribe); nobody writes it.
import "./ui/icons.js";
import { connect, call, loadForecast, cameraStream, loadHistory, subscribeNotifications, entityPlatforms,
  userLocale, hasTokens, pair, subscribeLayout, subscribeTv, signOut, hideItem } from "./ha.js";
import { Home } from "./model/home.js";
import { esc, time, longDate, fmtTime, wIcon } from "./model/format.js";
import { setLocale, t, language } from "../shared/i18n.js";
import { renderHome, refreshCamStills } from "./ui/home.js";
import { applyWallpaper, setWallpaper } from "./ui/wallpapers.js";
import { applyAccent, setAccent } from "./ui/accents.js";
import { applyPrefs, setPref, prefs, animOn, stepPref, minutesFor } from "./ui/prefs.js";
import { alignFrost, refreshFrost } from "./ui/frost.js";
import { renderPanel, renderCamera, attentionCount, attnKey } from "./ui/panels.js";
import { patch } from "./ui/morph.js";
import { Focus } from "./ui/focus.js";
import { icon, preloadIcons } from "./ui/icons.js";
import { loadInstances, saveInstances, currentInstance, withHere, normalizeAddress, addInstance, removeInstance, renameInstance, switchTo, reachable } from "./instances.js";

const WEBOS = /Web0S|webOS/i.test(navigator.userAgent);
// The Android TV app (tv-apps/androidtv) runs this page in a WebView and gives it window.AlvunaNative, which closes it.
const ANDROID_TV = !!window.AlvunaNative;
const TV_APP = WEBOS || ANDROID_TV; // inside a TV app, which Back on the first row and the idle timeout leave
// Icons used by the screens themselves (kept in step with the code: grep -oh '"mdi:[a-z0-9-]*"' src).
const APP_ICONS = ["mdi:alert", "mdi:alert-circle", "mdi:alert-circle-outline", "mdi:blinds", "mdi:blinds-open", "mdi:cctv",
  "mdi:chevron-left", "mdi:chevron-right", "mdi:close", "mdi:door", "mdi:fire", "mdi:home-outline", "mdi:home-switch-outline",
  "mdi:laptop", "mdi:lightbulb", "mdi:lightbulb-outline", "mdi:lightbulb-group-outline", "mdi:lightbulb-off-outline",
  "mdi:lightbulb-on-outline", "mdi:palette-outline", "mdi:pause", "mdi:play", "mdi:power", "mdi:shield-alert-outline",
  "mdi:shield-check-outline", "mdi:skip-next", "mdi:skip-previous", "mdi:smog", "mdi:soundbar", "mdi:speaker",
  "mdi:television", "mdi:thermometer", "mdi:thermostat", "mdi:tree-outline", "mdi:volume-high", "mdi:volume-off",
  "mdi:water-outline", "mdi:water-percent", "mdi:weather-windy", "mdi:weather-sunset-up", "mdi:weather-sunset-down",
  "mdi:gauge", "mdi:eye-outline", "mdi:sun-wireless-outline", "mdi:umbrella-outline", "mdi:navigation", "mdi:wifi-off",
  "mdi:keyboard-return", "mdi:arrow-left", "mdi:home-thermometer-outline", "mdi:play-circle-outline", "mdi:history", "mdi:shield-off-outline", "mdi:bell-outline", "mdi:bell-ring-outline", "mdi:battery-low", "mdi:battery-alert-variant-outline", "mdi:package-up", "mdi:account-group-outline", "mdi:trash-can-outline", "mdi:check-circle-outline", "mdi:check", "mdi:eye-off-outline", "mdi:debug-step-over", "mdi:bell-check-outline", "mdi:monitor-star", "mdi:brightness-6", "mdi:cursor-move", "mdi:exit-run", "mdi:blur", "mdi:animation-outline", "mdi:check-bold", "mdi:border-radius", "mdi:home-plus-outline", "mdi:logout", "mdi:home-remove-outline", "mdi:home-switch-outline", "mdi:home-outline", "mdi:arrow-right", "mdi:web", "mdi:dots-horizontal-circle-outline", "mdi:close", "mdi:pencil-outline"];
const params = new URLSearchParams(location.search);
let instances = loadInstances();
let instance = currentInstance(instances);

const S = { states: {}, config: null, panel: null, camera: null, camUi: { stripHidden: false, live: false }, forecast: null,
  status: "connecting", toast: "", pending: {}, saver: false, lastInput: Date.now(), hist: {}, notifs: {}, platforms: {},
  panelStack: [], hidden: loadHidden() };

// Items hidden from "Wymaga uwagi" on this TV, kept across restarts.
function loadHidden() { try { return JSON.parse(localStorage.getItem("homedeck-hidden")) || {}; } catch (e) { return {}; } }
let hiddenVer = 0;
function saveHidden() { hiddenVer++; try { localStorage.setItem("homedeck-hidden", JSON.stringify(S.hidden)); } catch (e) { /* storage blocked */ } }
let conn = null, watched = new Set(), seen = {}, raf = 0, attnMemo = {};

const $ = (sel) => document.querySelector(sel);
// The browser's language until Home Assistant says which one the user picked (see the start below).
setLocale({ language: navigator.language });
document.documentElement.lang = language();
applyWallpaper();
applyAccent();
document.body.innerHTML = `<main id="home"></main><div id="edge"></div><div id="panel"></div><div id="camera"></div>
  <div id="saver" hidden></div><div id="status"></div><div id="toast"></div>`;
applyPrefs();
refreshFrost().then(() => alignFrost());
const edgeEl = $("#edge"), homeEl = $("#home"), panelEl = $("#panel"), camEl = $("#camera"), saverEl = $("#saver"), statusEl = $("#status"), toastEl = $("#toast");

const ctx = () => ({ instances, instance, logoutArmed: !!S.logoutArmed, addAddr: S.addAddr || "", forecast: S.forecast, pending: S.pending, hist: S.hist, notifs: S.notifs, platforms: S.platforms, playIdx: S.playIdx, hidden: S.hidden, hero: params.get("hero") || S.config?.tv_hero || "today" });
const home = () => new Home(S.states, S.config);

// --- render ---------------------------------------------------------------------------------------
const focus = new Focus({ onActivate: (el) => act(el), onAdjust: (el, step) => adjust(el, step) });

function schedule() {
  if (raf) return;
  raf = requestAnimationFrame(() => { raf = 0; render(); });
}

function render() {
  if (!S.config) return;
  const h = home(), c = ctx();
  patch(homeEl, renderHome(h, c));
  const panelHtml = (p) => {
    const html = renderPanel(h, p, c);
    return p.side === "left" && !/class="panel-wrap left/.test(html) ? html.replace('class="panel-wrap', 'class="panel-wrap left') : html;
  };
  const fromW = navAnim && navAnim !== "fade" ? panelEl.querySelector(".panel")?.offsetWidth : 0;
  patch(panelEl, S.panel ? (S.panelPrep ? panelHtml(S.panel).replace('class="panel-wrap', 'class="panel-wrap prep') : panelHtml(S.panel))
    : S.panelClosing ? panelHtml(S.panelClosing).replace('class="panel-wrap', 'class="panel-wrap closing') : "");
  if (navAnim) { animateNav(navAnim, fromW); navAnim = null; }
  // The left edge says there is a summary to slide out (← on the first tile of a row); the bell lights up when something waits.
  // The bell's count scans every entity (batteries, updates): only again when something it reads has changed.
  const key = [S.states, S.notifs, S.platforms, hiddenVer];
  if (!attnMemo.key || attnMemo.key.some((v, i) => v !== key[i])) attnMemo = { key, n: attentionCount(h, c) };
  const n = attnMemo.n;
  patch(edgeEl, S.panel || S.camera != null ? "" : `<div class="edge ${n ? "has" : ""}" data-f="edge" data-act="summary">${icon(n ? "mdi:bell-ring-outline" : "mdi:bell-outline")}</div>`);
  patch(camEl, S.camera != null ? renderCamera(h, S.camera, S.camUi)
    : S.camClosing ? renderCamera(h, S.camClosing.i, S.camClosing.ui).replace('class="camera-full', 'class="camera-full closing') : "");
  document.body.classList.toggle("has-panel", !!S.panel || S.camera != null);
  if (S.camera != null) { focus.use("camera", camEl.firstElementChild); mountCamera(h); }
  else if (S.panel) focus.use(S.panel.scope, panelEl.querySelector(".panel"));
  else focus.use("home", homeEl);
  alignFrost();
  statusEl.innerHTML = S.status === "offline" ? `<div class="pill">${icon("mdi:wifi-off")}${t("tv.reconnecting")}</div>` : "";
}

// The Alvuna logo, as on the TV shell's start screen (the shell's largeIcon.png), so the picture does
// not change when the shell hands over to the app.
const LOGO = `<svg class="logo" viewBox="0 0 130 130" aria-hidden="true">
  <rect x="4" y="4" width="122" height="122" rx="30" fill="#1A6676"/>
  <g transform="translate(17 17) scale(.1875)">
    <path d="M84 236 256 88 428 236V420q0 28-28 28H112q-28 0-28-28z" fill="none" stroke="#fff" stroke-width="34" stroke-linejoin="round"/>
    <rect x="152" y="204" width="94" height="94" rx="20" fill="#B8F03C"/>
    <rect x="266" y="204" width="94" height="94" rx="20" fill="#fff" fill-opacity=".38"/>
    <rect x="152" y="318" width="94" height="94" rx="20" fill="#fff" fill-opacity=".38"/>
    <rect x="266" y="318" width="94" height="94" rx="20" fill="#fff" fill-opacity=".38"/></g></svg>`;

function fatal(text) {
  homeEl.innerHTML = `<div class="fatal">${icon("mdi:alert-circle-outline", "xl")}<h1>Alvuna</h1><p>${esc(text)}</p></div>`;
}

function toast(text, ms = 4000, html) {
  toastEl.innerHTML = html || `<div class="pill">${icon("mdi:alert-circle-outline")}${esc(text)}</div>`;
  clearTimeout(toast.t);
  toast.t = setTimeout(hideToast, ms);
}
// Notifications leave the way they came, softly, and only then are removed.
function hideToast() {
  const pill = toastEl.firstElementChild;
  if (!pill || !animOn()) { toastEl.innerHTML = ""; return; }
  pill.classList.add("out");
  clearTimeout(toast.t);
  toast.t = setTimeout(() => { toastEl.innerHTML = ""; }, 460);
}

// --- actions --------------------------------------------------------------------------------------
const svc = (domain, service, data) => call(conn, domain, service, data).catch((e) => toast(t("tv.failed", { msg: e?.message || domain + "." + service })));

// A panel opened from another panel goes on top of it (Klimat → one sensor, Podsumowanie → a sensor or the media):
// Back then steps down to the one below, with its focus where it was. A panel opened from the home screen starts a
// new stack. A panel opened from the left summary stays on the left.
function openPanel(p) {
  clearTimeout(outTimer);
  S.panelClosing = null;
  if (S.panel) { S.panelStack.push(S.panel); navAnim = "push"; if (S.panel.side === "left" && !p.side) p = { ...p, side: "left" }; }
  else { S.panelStack = []; S.panelPrep = animOn(); }
  S.panel = { ...p, scope: `panel:${p.type}:${p.room ?? p.media ?? p.entity ?? p.dev ?? p.id ?? ""}:${S.panelStack.length}` };
  focus.forget(S.panel.scope);
  if (p.type === "weather") refreshForecast(true);
  if (p.type === "entity") refreshHistory(p);
  render();
  if (S.panelPrep) whenSettled(() => { if (!S.panelPrep) return; S.panelPrep = false; render(); });
}

// A new panel is first laid out and painted where it will stand, nearly transparent (.prep), while only the dimming
// fades in; it slides in once the TV has painted it. Sliding it in straight away made the TV paint the whole panel
// (~100 ms on the GPU for the weather) during the slide, which dropped 5-9 frames of the motion. "Painted" is read
// from the frame rate (two frames in a row on time) after the ~150 ms the GPU needs for a full panel, at most 320 ms.
function whenSettled(cb) {
  const start = performance.now();
  let last = start, calm = 0;
  const step = (t) => {
    calm = t - last < 20 ? calm + 1 : 0;
    last = t;
    if ((calm >= 2 && t - start > 150) || t - start > 320) cb(); else requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// Moving between stacked panels, like a navigation push in iOS: going deeper, the new content comes in from the far
// side; going back, from the near side; content that arrives late (a sensor's history) fades in. Transform and
// opacity only, on the same sheet curve as the panels themselves.
let navAnim = null;
function animateNav(kind, fromW) {
  const panel = panelEl.querySelector(".panel");
  if (!panel || !animOn()) return;
  // A panel of another width: the content takes its new width at once, the sheet behind it eases there.
  const toW = fromW && panel.offsetWidth;
  if (toW && fromW !== toW) panel.animate([{ transform: `scaleX(${fromW / toW})` }, { transform: "none" }],
    { duration: 520, easing: "cubic-bezier(.32,.72,0,1)", pseudoElement: "::before" });
  const away = panelEl.querySelector(".panel-wrap.left") ? -1 : 1, dx = (kind === "push" ? 80 : -80) * away;
  const frames = kind === "fade" ? [{ opacity: 0 }, { opacity: 1 }]
    : [{ transform: `translateX(${dx}px)`, opacity: 0 }, { transform: "none", opacity: 1 }];
  const parts = kind === "fade" ? panel.querySelectorAll(":scope > .panel-view") : panel.querySelectorAll(":scope > .p-head, :scope > .panel-view");
  for (const el of parts) el.animate(frames, { duration: kind === "fade" ? 360 : 520, easing: "cubic-bezier(.32,.72,0,1)" });
}

// Closing plays the way out (the panel slides back to its edge, the camera fades) while focus is already back on the
// home screen, so the remote never waits for the animation; the layer is dropped once it has finished.
const OUT_MS = 560; // the way out in the CSS (.55s on --sheet-out), plus a frame
let outTimer = 0;
function closeLayer() {
  if (S.camera != null) {
    stopCamera();
    S.camClosing = { i: S.camera, ui: { ...S.camUi } };
    S.camera = null;
    focus.forget("camera");
  } else if (S.panel && S.panelStack.length) {
    // One step back, to the panel this one was opened from.
    focus.forget(S.panel.scope);
    S.panel = S.panelStack.pop();
    navAnim = "pop";
    render();
    return true;
  } else if (S.panel) {
    focus.forget(S.panel.scope);
    S.panelPrep = false;
    S.panelClosing = S.panel;
    S.panel = null;
  } else return false;
  clearTimeout(outTimer);
  // Without animations the layer goes at once.
  if (!animOn()) S.panelClosing = S.camClosing = null;
  else outTimer = setTimeout(() => { S.panelClosing = S.camClosing = null; render(); }, OUT_MS);
  render();
  return true;
}

function act(el) {
  const d = el.dataset, h = home(), id = d.entity;
  switch (d.act) {
    case "scene": {
      const target = d.off || id, domain = target.split(".")[0];
      return svc(domain === "scene" || domain === "script" ? domain : "homeassistant", "turn_on", { entity_id: target });
    }
    case "all": return svc("light", d.on === "1" ? "turn_on" : "turn_off", { entity_id: h.allLights() });
    case "room": return openPanel({ type: "room", room: Number(d.room) });
    case "media": return openPanel({ type: "media", media: Number(d.media) });
    case "weather": return openPanel({ type: "weather" });
    case "climate": return openPanel({ type: "climate" });
    case "entity": return openPanel({ type: "entity", kind: d.kind, entity: d.entity, entity2: d.entity2 || "", name: d.name || "", icon: d.icon || "" });
    case "instances": return openPanel({ type: "instances" });
    case "add-home": S.addAddr = ""; return openPanel({ type: "addhome" });
    case "hold-hide":
      closeLayer();
      return hideItem(conn, d.item).then(() => toast(t("tv.hold.hidden"), 6000)).catch(() => toast(t("tv.hold.failed")));
    // OK on the address field: the TV's own keyboard comes up for the <input>; Enter there connects (see keydown).
    case "add-focus": { const input = document.getElementById("addr"); if (input) { input.focus(); input.select?.(); } return; }
    case "add-go": return addHome();
    case "inst-rename": return openPanel({ type: "rename", id: d.id });
    case "rename-save": return renameHome(d.id);
    case "inst-del":
      instances = removeInstance(instances, d.id);
      saveInstances(instances);
      return render();
    // Twice, so a slip of the remote does not sign the TV out: the first OK arms it for five seconds.
    case "logout":
      if (!S.logoutArmed) {
        S.logoutArmed = true;
        clearTimeout(act.logout);
        act.logout = setTimeout(() => { S.logoutArmed = false; render(); }, 5000);
        return render();
      }
      return signOut().then(() => location.replace(`/alvuna/tv/${location.search}`));
    case "settings": return openPanel({ type: "settings" });
    case "wallpapers": return openPanel({ type: "wallpapers" });
    case "wallpaper": setWallpaper(d.id); refreshFrost(); return render();
    case "accents": return openPanel({ type: "accents" });
    case "accent": setAccent(d.id); return render();
    case "pref": setPref(d.key, !prefs()[d.key]); if (d.key === "shift") oledShift(new Date()); render(); return alignFrost();
    case "pref-step": stepPref(d.key, 1, S.config); render(); return alignFrost();
    case "summary": return openPanel({ type: "summary", side: "left" });
    case "device": return openPanel({ type: "device", dev: d.dev === "vac" ? "vac" : Number(d.dev) });
    case "press": svc("button", "press", { entity_id: d.entity }); return;
    case "vac": svc("vacuum", d.cmd, { entity_id: d.entity }); return;
    case "attn": return openPanel({ type: "attn", kind: d.kind, id: d.id, key: d.key, name: d.name || "" });
    case "notif-dismiss": svc("persistent_notification", "dismiss", { notification_id: d.id }); return S.panel?.type === "attn" && closeLayer();
    case "upd-skip": svc("update", "skip", { entity_id: d.entity }); return closeLayer();
    // A finished wash taken out: HA's own "unloaded" button when it is available, and hidden on this TV either way.
    case "unload":
      if (d.entity) svc("button", "press", { entity_id: d.entity });
      S.hidden[d.key] = Date.now();
      saveHidden();
      if (S.panel?.type === "device") return closeLayer();
      return render();
    case "hide":
      S.hidden[d.key] = Date.now();
      saveHidden();
      return closeLayer();
    case "camera": return openCamera(Number(d.cam));
    case "camsel": S.camUi.stripHidden = !S.camUi.stripHidden; return render();
    case "close": return closeLayer();
    case "switch": {
      const to = instances.find((x) => x.id === d.id);
      if (!to || to === instance) return closeLayer();
      toast(t("tv.switching", { name: to.name }));
      return reachable(to).then((ok) => (ok ? switchTo(to, instances) : toast(t("tv.unreachable", { name: to.name }))));
    }
    case "room-power": {
      const lights = h.lights(h.rooms()[Number(d.room)]);
      return svc("light", lights.some((l) => h.on(l)) ? "turn_off" : "turn_on", { entity_id: lights });
    }
    case "light": delete S.pending[id]; return svc("light", "toggle", { entity_id: id });
    case "cover": return svc("cover", "toggle", { entity_id: id });
    case "media-cmd": return svc("media_player", d.cmd, { entity_id: id });
    case "mute": return svc("media_player", "volume_mute", { entity_id: id, is_volume_muted: !h.st(id)?.attributes.is_volume_muted });
    case "media-power": return svc("media_player", d.on === "1" ? "turn_off" : "turn_on", { entity_id: id });
    case "thermo-power": { const th = h.thermo(); return th && svc("climate", d.on === "1" ? "turn_off" : "turn_on", { entity_id: th.id }); }
    default: return undefined;
  }
}

// Left/right on a value: shown at once (S.pending), sent once the presses stop.
function adjust(el, step) {
  const d = el.dataset, h = home();
  const later = (key, ms, fn) => { clearTimeout(adjust[key]); adjust[key] = setTimeout(fn, ms); };
  if (d.adjust === "bright") {
    const id = d.entity, st = h.st(id), p = S.pending[id];
    const cur = p ? p.value : st?.state === "on" ? Math.round(((st.attributes.brightness ?? 255) / 255) * 100) : 0;
    const value = Math.max(0, Math.min(100, cur === 0 && step > 0 ? 10 : Math.round((cur + step * 10) / 10) * 10));
    S.pending[id] = { value, at: Date.now() };
    render();
    later(id, 350, () => svc("light", value ? "turn_on" : "turn_off", value ? { entity_id: id, brightness_pct: value } : { entity_id: id }));
  } else if (d.adjust === "cover") {
    const id = d.entity, p = S.pending[id], st = h.st(id);
    const value = Math.max(0, Math.min(100, (p ? p.value : Number(st?.attributes.current_position ?? 0)) + step * 10));
    S.pending[id] = { value, at: Date.now() };
    render();
    later(id, 500, () => svc("cover", "set_cover_position", { entity_id: id, position: value }));
  } else if (d.adjust === "volume") {
    const m = h.mediaItems()[S.panel?.media];
    if (!m) return;
    if (m.features & 4) {
      const p = S.pending[m.tv], value = Math.max(0, Math.min(100, (p ? p.value : Math.round((m.volume ?? 0) * 100)) + step * 2));
      S.pending[m.tv] = { value, at: Date.now() };
      render();
      later(m.tv, 300, () => svc("media_player", "volume_set", { entity_id: m.tv, volume_level: value / 100 }));
    } else svc("media_player", step > 0 ? "volume_up" : "volume_down", { entity_id: m.tv });
  } else if (d.adjust === "pref") {
    stepPref(d.key, step, S.config);
    render();
    if (d.key === "glass") alignFrost();
  } else if (d.adjust === "playing") {
    S.playIdx = (S.playIdx || 0) + step + 100;
    render();
  } else if (d.adjust === "temp") {
    const th = h.thermo();
    if (!th?.on) return;
    const p = S.pending[th.id], value = Math.max(th.min, Math.min(th.max, (p ? p.value : th.target) + step * th.step));
    S.pending[th.id] = { value, at: Date.now() };
    render();
    later(th.id, 700, () => svc("climate", "set_temperature", { entity_id: th.id, temperature: value }));
  }
}

// --- input ----------------------------------------------------------------------------------------
const KEYS = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };
const isBack = (ev) => ev.keyCode === 461 || ev.key === "GoBack" || ev.key === "BrowserBack" || ev.key === "Escape"
  || (ev.key === "Backspace" && !/INPUT|TEXTAREA/.test(ev.target.tagName));

window.addEventListener("keydown", (ev) => {
  const woke = wake();
  if (woke) { ev.preventDefault(); return; }
  // Typing an address: the keys belong to the field (and the TV's keyboard); Enter connects, Back leaves the field.
  if (document.activeElement?.tagName === "INPUT") {
    S.lastInput = Date.now();
    if (ev.key === "Enter" || ev.keyCode === 13) { ev.preventDefault(); if (S.panel?.type === "rename") renameHome(S.panel.id); else addHome(); }
    else if (isBack(ev)) { ev.preventDefault(); S.addAddr = document.activeElement.value; document.activeElement.blur(); }
    return;
  }
  const dir = KEYS[ev.key];
  if (dir) {
    ev.preventDefault();
    const moved = focus.move(dir);
    if (moved) alignFrost();
    document.body.classList.add("keys");
    // ← past the first tile slides the summary out from the left; → past the summary's rows slides it back.
    if (!moved && dir === "left" && !S.panel && S.camera == null) return void openPanel({ type: "summary", side: "left" });
    if (!moved && dir === "right" && S.panel?.side === "left") return void closeLayer();
    if (S.camera != null) cameraFollowFocus();
    return;
  }
  // OK: a short press acts on release; held for 0.65 s it opens the item's menu (hide it from Alvuna's screens).
  if (ev.key === "Enter" || ev.keyCode === 13) {
    ev.preventDefault();
    if (ev.repeat || hold.t) return;
    hold.fired = false;
    hold.t = setTimeout(() => { hold.t = 0; hold.fired = true; openHold(); }, 650);
    return;
  }
  if (isBack(ev)) {
    ev.preventDefault();
    if (closeLayer()) return;
    if (!focus.isFirstLine()) { focus.toFirstLine(); return; }
    if (TV_APP) platformBack();
  }
});
window.addEventListener("keyup", (ev) => {
  if (!(ev.key === "Enter" || ev.keyCode === 13) || document.activeElement?.tagName === "INPUT") return;
  ev.preventDefault();
  if (hold.t) { clearTimeout(hold.t); hold.t = 0; if (!hold.fired) focus.activate(); }
});
const hold = { t: 0, fired: false };

// What a held tile stands for: a room ("area:<id>"), a scene, a sensor, a camera or a player. Nothing for the rest
// (panels, settings), where holding OK simply does what pressing it does.
function holdTarget(el) {
  const d = el?.dataset || {}, h = home();
  if (d.act === "room") { const r = h.rooms()[Number(d.room)]; return r?.area ? `area:${r.area}` : null; }
  if (d.act === "scene") return d.entity || null;
  if (d.f?.startsWith("sec:")) return d.f.slice(4);
  if (d.act === "camera") return h.cameras()[Number(d.cam)]?.entity || null;
  if (d.act === "media") return h.mediaItems()[Number(d.media)]?.tv || null;
  return null;
}

function openHold() {
  const el = document.querySelector(".f");
  const item = !S.panel && S.camera == null ? holdTarget(el) : null;
  if (!item) return focus.activate();
  const name = el.querySelector(".name, b, .title")?.textContent?.trim() || item;
  openPanel({ type: "hold", item, name });
}

// Back on the first row leaves the way the TV does it (webOS 23 and later go Home, older ones show the system's exit
// prompt), as LG's app review requires; window.close() is meant only for an app's own exit popup. This is what
// webOSTV.js webOS.platformBack() calls. On Android TV the app closes, as Back does in any Android TV app.
function platformBack() {
  if (window.webOS?.platformBack) window.webOS.platformBack();
  else if (window.PalmSystem?.platformBack) window.PalmSystem.platformBack();
  else closeApp();
}
function closeApp() {
  if (ANDROID_TV) window.AlvunaNative.exit();
  else window.close();
}
// The Magic Remote wheel moves between rows (the pointer itself never scrolls the page).
let wheelAt = 0;
window.addEventListener("wheel", (ev) => {
  ev.preventDefault();
  if (wake() || Date.now() - wheelAt < 220 || Math.abs(ev.deltaY) < 4) return;
  wheelAt = Date.now();
  focus.move(ev.deltaY > 0 ? "down" : "up");
}, { passive: false });
// The Magic Remote pointer: hovering focuses, a click is OK.
window.addEventListener("pointermove", (ev) => { wake(); document.body.classList.remove("keys"); focus.pointAt(ev.target); }, { passive: true });
window.addEventListener("click", (ev) => {
  if (wake()) return;
  const item = ev.target.closest?.("[data-f]");
  if (item) { focus.pointAt(item); act(item); return; }
  // A click on the dimmed screen beside an open side panel closes it, as Back does (Magic Remote, a mouse).
  if (S.panel && ev.target.closest?.(".panel-wrap") && !ev.target.closest(".panel")) closeLayer();
});

// --- screensaver and idle exit ----------------------------------------------------------------------
// ?saver= / ?idle= (tests) override this TV's setting, which overrides Alvuna's options in Home Assistant. 0 = never.
const minutes = (key) => Number(params.get(key === "exit" ? "idle" : key) ?? minutesFor(key, S.config)) * 60000;
// OLED care: every three minutes the picture moves a few pixels around a small loop, so static parts (the clock, the
// row titles, tile edges) never sit on the same pixels for hours. Moves whole layers (CSS translate), nothing repaints.
const SHIFTS = [[0, 0], [4, 2], [2, -3], [-3, -2], [-2, 3], [3, -1]];
function oledShift(now) {
  const [x, y] = prefs().shift ? SHIFTS[Math.floor((now.getHours() * 60 + now.getMinutes()) / 3) % SHIFTS.length] : [0, 0];
  document.body.style.setProperty("--sx", `${x}px`);
  document.body.style.setProperty("--sy", `${y}px`);
}

function wake() {
  S.lastInput = Date.now();
  document.body.classList.remove("dimmed");
  if (!S.saver) return false;
  S.saver = false;
  // The black fades away (#saver.out) and is hidden once the fade is over.
  saverEl.classList.add("out");
  clearTimeout(wake.t);
  wake.t = setTimeout(() => { if (!S.saver) { saverEl.hidden = true; saverEl.classList.remove("out"); } }, animOn() ? 520 : 0);
  document.body.classList.remove("saving");
  return true;
}

// Each minute the clock glides to a new place (the box is kept, so its transform transition plays) instead of jumping.
function drawSaver() {
  const h = home(), w = h.weatherNow(), now = new Date();
  const at = `translate(${Math.round(Math.random() * 1100) + 120}px,${Math.round(Math.random() * 560) + 120}px)`;
  const inner = `<div class="clock">${time(now)}</div>
    <div class="saver-wx">${icon(wIcon(w.cond, w.night))}${w.temp != null ? `${Math.round(w.temp)}°` : ""}<span>${esc(longDate(now))}</span></div>`;
  const box = saverEl.querySelector(".saver-box");
  if (box && !S.saverFresh) { box.innerHTML = inner; box.style.transform = at; return; }
  S.saverFresh = false;
  saverEl.innerHTML = `<div class="saver-box" style="transform:${at}">${inner}</div>`;
}

// --- clock, progress, idle (once a second) -----------------------------------------------------------
function tick() {
  const now = new Date();
  for (const el of document.querySelectorAll("[data-clock]")) el.textContent = time(now);
  if (S.config) {
    const h = home(), items = h.mediaItems();
    for (const el of document.querySelectorAll("[data-elapsed]")) { const m = items[el.dataset.elapsed]; if (m) el.textContent = fmtTime(h.mediaPosition(m)); }
    for (const el of document.querySelectorAll("[data-progress]")) {
      const m = items[el.dataset.progress];
      if (m?.duration) el.style.width = `${Math.min(100, (h.mediaPosition(m) / m.duration) * 100).toFixed(1)}%`;
    }
  }
  const idle = Date.now() - S.lastInput, saverMs = minutes("saver"), exitMs = minutes("exit");
  // Halfway to the screensaver (at least half a minute in) the screen dims, a first step that saves the panel.
  document.body.classList.toggle("dimmed", !!(prefs().dim && S.config && !S.saver && saverMs > 0 && idle > Math.max(30000, saverMs / 2)));
  if (now.getSeconds() === 0 && now.getMinutes() % 3 === 0) oledShift(now);
  if (!S.saver && S.config && saverMs > 0 && idle > saverMs) {
    S.saver = true;
    S.saverFresh = true; // the first draw places the clock without a glide
    drawSaver();
    clearTimeout(wake.t);
    saverEl.classList.remove("out");
    saverEl.hidden = false;
    document.body.classList.add("saving");
  } else if (S.saver && now.getSeconds() === 0) drawSaver();
  if (TV_APP && exitMs > 0 && idle > exitMs) closeApp();
  if (now.getSeconds() === 0) schedule();
  if (S.config && !S.saver && now.getSeconds() % 15 === 0) refreshCamStills(home(), schedule);
  for (const [id, p] of Object.entries(S.pending)) if (Date.now() - p.at > 6000) delete S.pending[id];
}

// --- data -----------------------------------------------------------------------------------------
function onStates(states) {
  S.states = states;
  // A battery hidden as "do wymiany" is forgotten once it is no longer low, so a later low battery shows again.
  const limit = Number(S.config?.battery_low ?? 10);
  let dropped = false;
  for (const key of Object.keys(S.hidden)) {
    // A wash marked as taken out is forgotten once the washer has left its finished state.
    if (key.startsWith("done:")) { const st = states[key.split(":")[1]]?.state; if (st && !["finished", "clean"].includes(st)) { delete S.hidden[key]; dropped = true; } continue; }
    if (!key.startsWith("bat:")) continue;
    const v = Number(states[key.slice(4)]?.state);
    if (isFinite(v) && v >= limit) { delete S.hidden[key]; dropped = true; }
  }
  if (dropped) saveHidden();
  let changed = false;
  for (const id of watched) if (seen[id] !== states[id]) { seen[id] = states[id]; changed = true; }
  // A value the user just set is shown until HA reports it back.
  for (const [id, p] of Object.entries(S.pending)) {
    const st = states[id], a = st?.attributes || {};
    const real = id.startsWith("light.") ? (st?.state === "on" ? Math.round(((a.brightness ?? 255) / 255) * 100) : 0)
      : id.startsWith("cover.") ? Number(a.current_position) : id.startsWith("climate.") ? Number(a.temperature) : Math.round((a.volume_level ?? 0) * 100);
    if (Math.abs(real - p.value) < 1.5) delete S.pending[id];
  }
  // The summary lists batteries and updates from any entity, so while it is open every change redraws.
  if (changed || S.panel?.type === "summary") schedule();
}

// A sensor's last 24 h for its detail panel; kept 2 min, so going back and forth does not ask HA again.
async function refreshHistory(p) {
  const key = [p.entity, p.entity2].filter(Boolean).join(",");
  if (S.hist[key] && Date.now() - S.hist[key].at < 120000) return;
  const fresh = !S.hist[key];
  try { S.hist[key] = await loadHistory(conn, key.split(",")); } catch (e) { S.hist[key] = { error: true, at: Date.now() }; }
  // The history replaces "Wczytuję…": fade it in rather than let it jump in.
  if (fresh && S.panel?.entity === p.entity) navAnim = "fade";
  schedule();
}

async function refreshForecast(force) {
  const id = home().weatherId();
  if (!id || (!force && S.forecast && Date.now() - S.forecast.at < 15 * 60000)) return;
  if (S.forecast && Date.now() - S.forecast.at < 5 * 60000) return;
  S.forecast = await loadForecast(conn, [id, ...[].concat(S.config?.weather || []).filter((x) => x !== id && S.states[x])]);
  schedule();
}

async function loadConfig(config) {
  S.config = config;
  watched = home().watched();
  seen = {};
  for (const id of watched) seen[id] = S.states[id];
  render();
  // Every icon the screens can show: the ones the code names and the ones in the Alvuna config.
  preloadIcons([...APP_ICONS, ...JSON.stringify(S.config).match(/mdi:[a-z0-9-]+/g) || []]);
}

// --- camera, full screen -----------------------------------------------------------------------------
function openCamera(i) {
  clearTimeout(outTimer);
  S.camClosing = null;
  S.camera = i;
  S.camUi = { stripHidden: false, live: false };
  // Focus starts on this camera's thumbnail in the strip.
  focus.scopes.set("camera", { line: "cams", items: { cams: `camsel:${i}` }, x: {} });
  stripTimer();
  render();
}

// Moving along the strip switches the big picture at once.
function cameraFollowFocus() {
  const f = document.querySelector(".cam-strip .f");
  S.camUi.stripHidden = false;
  stripTimer();
  if (f && Number(f.dataset.cam) !== S.camera) { S.camera = Number(f.dataset.cam); S.camUi.live = false; }
  render();
}

// The strip goes away after 5 s without the remote; any key brings it back.
function stripTimer() {
  clearTimeout(stripTimer.t);
  stripTimer.t = setTimeout(() => { if (S.camera != null) { S.camUi.stripHidden = true; render(); } }, 5000);
}

// HA's HLS is fMP4 (CMAF), which the webOS player does not play by itself: hls.js feeds it through MSE, like HA's
// own frontend does. It is a separate file, fetched the first time a camera opens.
let hlsLib;
const loadHls = () => (hlsLib ||= new Promise((ok, no) => {
  const s = document.createElement("script");
  s.src = HLS_FILE; // eslint-disable-line no-undef -- set by build.sh
  s.onload = () => ok(window.Hls);
  s.onerror = () => { hlsLib = null; no(new Error("hls.js")); };
  document.head.appendChild(s);
}));

function stopCamera() {
  const stage = camEl.querySelector(".cam-stage");
  if (stage?._hls) { stage._hls.destroy(); stage._hls = null; }
}

// The still shows at once; the live stream replaces it once it plays. If it does not start within 12 s, the stills
// keep refreshing instead.
async function mountCamera(h) {
  const stage = camEl.querySelector(".cam-stage");
  if (!stage || stage.dataset.mounted === stage.dataset.cam) return;
  const id = stage.dataset.cam, mine = (stage._mount = (stage._mount || 0) + 1);
  stopCamera();
  stage.dataset.mounted = id;
  // The tile's picture (same URL, already loaded) shows at once; the sharp full-size still replaces it when it
  // arrives (over Funnel ~3 s for the doorbell), and the live video when it plays.
  stage.innerHTML = `<img class="still" src="${esc(stage.dataset.preview)}" alt="" decoding="async">`;
  const alive = () => stage.isConnected && stage._mount === mine && stage.dataset.mounted === id;
  const sharp = new Image();
  sharp.decoding = "async";
  sharp.onload = () => { const img = stage.querySelector("img.still"); if (alive() && img && !stage.classList.contains("playing")) img.src = sharp.src; };
  sharp.src = stage.dataset.still;
  const stills = () => {
    const img = stage.querySelector("img.still");
    const next = () => {
      if (!alive() || !img.isConnected) return;
      const a = home().st(id)?.attributes || {}, pre = new Image();
      pre.onload = () => { img.src = pre.src; setTimeout(next, 1500); };
      pre.onerror = () => setTimeout(next, 4000);
      pre.src = `/api/camera_proxy/${id}?token=${encodeURIComponent(a.access_token || "")}&width=1920&t=${Date.now()}`;
    };
    next();
  };
  const url = await cameraStream(conn, id);
  if (!alive()) return;
  if (!url) return stills();
  const v = document.createElement("video");
  Object.assign(v, { autoplay: true, muted: true, playsInline: true });
  v.className = "live-video";
  const Hls = await loadHls().catch(() => null);
  if (!alive()) return;
  if (Hls?.isSupported()) {
    // Close to live: start on the newest segment (HA's segments follow the camera's keyframes, ~0.5 MB each over
    // Funnel; waiting for two made the doorbell start after ~4 s) and keep the buffer short (a camera, not a film).
    const hls = new Hls({ lowLatencyMode: true, liveSyncDurationCount: Number(params.get("hlssync") || 1), liveMaxLatencyDurationCount: 4, maxBufferLength: 8,
      backBufferLength: 0, startFragPrefetch: true });
    stage._hls = hls;
    hls.loadSource(url);
    hls.attachMedia(v);
    hls.on(Hls.Events.MANIFEST_PARSED, () => v.play().catch(() => {}));
  } else v.src = url;
  let started = false;
  const shown = () => {
    if (!alive() || started) return;
    started = true;
    stage.classList.add("playing");
    S.camUi.live = true;
    const tag = camEl.querySelector(".live");
    if (tag) { tag.classList.add("on"); tag.lastChild.textContent = t("cameras.live"); }
  };
  // The video takes over from the still on its first frame actually on screen. "playing" comes too early on Android
  // TV's WebView (the Chromecast reported it ~2 s before any picture, showing black meanwhile), so it is only the
  // fallback where requestVideoFrameCallback is missing.
  if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(shown);
  else v.addEventListener("playing", shown, { once: true });
  stage.appendChild(v);
  setTimeout(() => { if (alive() && !started) { stopCamera(); v.remove(); stills(); } }, 12000);
}

function renameHome(id) {
  const input = document.getElementById("addr");
  if (input) input.blur();
  instances = renameInstance(instances, id, input?.value || "");
  saveInstances(instances);
  instance = instances.find((x) => x.id === instance.id) || instance;
  closeLayer();
  render();
}

// --- another home: an address typed with the remote, checked, added to the list and opened (it pairs the TV there)
async function addHome() {
  const input = document.getElementById("addr");
  if (input) { S.addAddr = input.value; input.blur(); }
  const url = normalizeAddress(S.addAddr);
  if (!url) return toast(t("tv.home.bad_address"));
  const to = { id: new URL(url).host, name: new URL(url).hostname, url };
  toast(t("tv.switching", { name: to.name }));
  if (!(await reachable(to))) return toast(t("tv.unreachable", { name: to.name }));
  instances = addInstance(instances, url);
  saveInstances(instances);
  switchTo(instances.find((x) => x.url === url) || to, instances);
}

// --- messages from Home Assistant (alvuna.notify, alvuna.show_camera) ----------------------------------
function tvMessage(ev) {
  if (ev.type === "notify") {
    toast("", (ev.seconds || 10) * 1000,
      `<div class="pill note">${icon("mdi:bell-ring-outline")}<span>${ev.title ? `<b>${esc(ev.title)}</b> ` : ""}${esc(ev.message)}</span></div>`);
    wake();
  } else if (ev.type === "camera") {
    const i = home().cameras().findIndex((c) => c.entity === ev.entity_id);
    if (i < 0) return toast(t("tv.camera_unknown", { entity: ev.entity_id }));
    wake();
    openCamera(i);
    clearTimeout(tvMessage.cam);
    tvMessage.cam = setTimeout(() => { if (S.camera === i) { closeLayer(); schedule(); } }, (ev.seconds || 60) * 1000);
  }
}

// --- pairing --------------------------------------------------------------------------------------
// A TV with no tokens shows a code; an admin approves it in Home Assistant (Discovered: Alvuna TV), then the app starts.
async function pairScreen() {
  const name = WEBOS ? "LG TV" : /Android/i.test(navigator.userAgent) ? "Google TV" : "TV";
  const show = (code, note) => {
    homeEl.innerHTML = `<div class="fatal pair">${LOGO}<h1>${t("tv.pair_title")}</h1>
      ${code ? `<div class="code">${code.split("").map((c) => `<span>${esc(c)}</span>`).join("")}</div>` : ""}
      <p>${note}</p><p class="small">${t("tv.pair_login", { url: `${location.origin}/alvuna/tv/?login=1` })}</p></div>`;
  };
  show("", t("tv.pair_asking"));
  await pair({ name, onCode: (code) => show(code, t("tv.pair_steps")), onBusy: () => show("", t("tv.pair_busy")) });
}

// --- start ----------------------------------------------------------------------------------------
(async () => {
  homeEl.innerHTML = `<div class="fatal">${LOGO}<h1>Alvuna</h1><p>${t("tv.connecting")}</p></div>`;
  try {
    // ?login=1 (or HA's own sign-in coming back) uses a person's account instead of pairing the TV.
    if (!hasTokens() && !params.has("login") && !params.has("auth_callback")) await pairScreen();
    conn = await connect({ onStates, onStatus: (s) => { S.status = s; render(); } });
    S.status = "online";
    // The user's own language and formats, before anything but the splash is drawn (render waits for the config).
    const loc = await userLocale(conn);
    setLocale(loc);
    // This home in the list, under its own name, so other homes can switch back to it.
    instances = withHere(instances, instance, loc.locationName);
    instance = instances[0];
    saveInstances(instances);
    document.documentElement.lang = loc.language || language();
    // The integration's layout, kept current (a change in the panel or in HA's areas reaches the screen by itself).
    let first;
    const ready = new Promise((ok) => { first = ok; });
    await subscribeLayout(conn, (ev) => {
      if (ev.config) loadConfig(ev.config).then(first, first);
      else first();
    }).catch(() => first());
    await Promise.race([ready, new Promise((ok) => setTimeout(ok, 8000))]);
    if (!S.config) throw new Error(t("tv.no_layout"));
    subscribeTv(conn, tvMessage).catch(() => {});
    refreshCamStills(home(), schedule);
    subscribeNotifications(conn, (all) => { S.notifs = all; schedule(); }).catch(() => {});
    entityPlatforms(conn).then((p) => { S.platforms = p; schedule(); });
    refreshForecast();
    setInterval(() => refreshForecast(), 15 * 60000);
    setInterval(tick, 1000);
    window.__hd = { S, focus, render };
  } catch (e) {
    fatal(typeof e === "number" ? t("tv.connect_failed") : e?.message || String(e));
  }
})();
