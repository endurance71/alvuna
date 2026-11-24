// Demo mode for the website (alvuna.shipapp.pl): the real TV app, built with this module in place of ha.js
// (frontend/build-site.mjs), so every tile, panel and animation is the app's own. A made-up home answers instead of
// Home Assistant: its states change when the remote switches something, as they would in a real home.
// window.__demo lets the page around it drive a tour: notifications, the doorbell camera, the clock.
import { HOME, layout, forecast } from "./home.js";

// The look of the room the website shows the TV in: the demo's own photo wallpaper (site/img/wallpapers, a generated
// misty fjord in the app's "Mgła" slot) and the oak accent. Frosted glass stays the app's setting; demo.css draws it.
// A visitor's own changes (Settings on the demo TV) are kept until the demo's look changes (LOOK below), then it starts
// from this look again. Only two photos ship with the site (mgla, zorza): any other photo falls back to the fjord.
const LOOK = "2";
const PHOTOS = ["foto-mgla", "foto-zorza"];
try {
  if (localStorage.getItem("alvuna-demo-look") !== LOOK) {
    localStorage.setItem("homedeck-wallpaper", "foto-mgla");
    localStorage.setItem("homedeck-accent", "dab");
    localStorage.setItem("homedeck-prefs", JSON.stringify({ glass: "frost" }));
    localStorage.setItem("alvuna-demo-look", LOOK);
  }
  const w = localStorage.getItem("homedeck-wallpaper") || "";
  if (w.startsWith("foto-") && !PHOTOS.includes(w)) localStorage.setItem("homedeck-wallpaper", "foto-mgla");
} catch (e) { /* storage blocked: the app's defaults */ }

let states = HOME();
let onStatesCb = () => {};
let tvCb = () => {};
const watchers = new Set();
const emit = () => { onStatesCb({ ...states }); for (const fn of watchers) fn(states); };
const now = () => new Date().toISOString();
const set = (id, state, attrs = {}) => {
  const old = states[id];
  if (!old) return;
  states = { ...states, [id]: { ...old, state: String(state), attributes: { ...old.attributes, ...attrs }, last_changed: now(), last_updated: now() } };
};

const conn = {
  addEventListener() {},
  reconnect() {},
  sendMessagePromise: async () => null,
  subscribeMessage: async () => () => {},
};

export const hasTokens = () => true;
export async function pair() {}
export async function signOut() {}
export async function connect({ onStates, onStatus }) {
  onStatesCb = onStates;
  setTimeout(() => { onStatus("online"); emit(); });
  return conn;
}

const ids = (target, data) => [].concat(target?.entity_id || data?.entity_id || []);
export async function call(_conn, domain, service, data = {}, target) {
  const list = ids(target, data);
  for (const id of list) {
    const d = id.split(".")[0], st = states[id];
    if (!st) continue;
    if (d === "light") {
      const on = service === "toggle" ? st.state !== "on" : service === "turn_on";
      const pct = data.brightness_pct ?? (data.brightness != null ? Math.round(data.brightness / 2.55) : null);
      set(id, on ? "on" : "off", on ? { brightness: Math.round(2.55 * (pct ?? (st.attributes.brightness ? st.attributes.brightness / 2.55 : 80))) } : { brightness: null });
    } else if (d === "cover") {
      const pos = service === "open_cover" ? 100 : service === "close_cover" ? 0 : service === "set_cover_position" ? data.position
        : service === "toggle" ? (st.attributes.current_position > 0 ? 0 : 100) : st.attributes.current_position;
      set(id, pos > 0 ? "open" : "closed", { current_position: pos });
    } else if (d === "scene" || d === "script") {
      scene(id);
    } else if (d === "climate" && service === "set_temperature") {
      set(id, st.state, { temperature: data.temperature, hvac_action: data.temperature > st.attributes.current_temperature ? "heating" : "idle" });
    } else if (d === "media_player") {
      if (service === "media_play_pause") set(id, st.state === "playing" ? "paused" : "playing");
      else if (service === "volume_set") set(id, st.state, { volume_level: data.volume_level });
      else if (service === "volume_mute") set(id, st.state, { is_volume_muted: data.is_volume_muted });
      else if (service === "turn_off") set(id, "off");
      else if (service === "turn_on") set(id, "on");
    } else if (d === "vacuum") {
      set(id, service === "start" ? "cleaning" : service === "return_to_base" ? "returning" : service === "pause" ? "paused" : st.state);
    } else if (["switch", "fan", "humidifier", "input_boolean"].includes(d)) {
      set(id, service === "toggle" ? (st.state === "on" ? "off" : "on") : service === "turn_on" ? "on" : "off");
    }
  }
  // "Wyłącz wszystkie" / "Włącz wszystkie" act on every light of the home.
  if (!list.length && domain === "light") for (const id of Object.keys(states).filter((x) => x.startsWith("light."))) set(id, service === "turn_on" ? "on" : "off", service === "turn_on" ? { brightness: 204 } : { brightness: null });
  emit();
}

function scene(id) {
  const lights = Object.keys(states).filter((x) => x.startsWith("light."));
  const on = (list, pct) => lights.forEach((l) => set(l, list.includes(l) ? "on" : "off", list.includes(l) ? { brightness: Math.round(pct * 2.55) } : { brightness: null }));
  if (id === "scene.wieczor") on(["light.salon_lampa", "light.salon_led", "light.kuchnia_wyspa"], 70);
  else if (id === "scene.kino") { on(["light.salon_led"], 15); set("cover.salon_roleta", "closed", { current_position: 0 }); }
  else if (id === "scene.dobranoc") on([], 0);
}

export async function userLocale() {
  return { language: "pl", currency: "PLN", locationName: "Dom" };
}
export const subscribeLayout = async (_conn, cb) => { setTimeout(() => cb({ source: "auto", config: layout() })); return () => {}; };
export const hideItem = async () => {};
export const subscribeTv = async (_conn, cb) => { tvCb = cb; return () => {}; };
export async function loadForecast() { return forecast(); }
export async function cameraStream() { return null; }
export async function loadHistory(_conn, list, hours = 24) {
  const end = Date.now(), start = end - hours * 3600e3, data = {};
  for (const id of list) data[id] = [{ s: states[id]?.state || "off", t: start }];
  return { at: end, start, end, data };
}
export async function subscribeNotifications(_conn, cb) { cb({}); return () => {}; }
export async function entityPlatforms() { return {}; }

// The page around the demo: a message as alvuna.notify sends it, a camera as alvuna.show_camera opens it, a state change.
window.__demo = {
  notify: (title, message, seconds = 6) => tvCb({ type: "notify", title, message, seconds }),
  camera: (entity_id, seconds = 8) => tvCb({ type: "camera", entity_id, seconds }),
  set: (id, state, attrs) => { set(id, state, attrs); emit(); },
  reset: () => { states = HOME(); emit(); },
  // The page around the demo follows the room's lights (the lamp and the LED strip in its photo).
  watch: (fn) => { watchers.add(fn); fn(states); return () => watchers.delete(fn); },
};

// The ring that stands in for the mouse pointer over the TV (demo.css): it follows the mouse, presses with it and
// leaves with it. Moved with the translate property, not transform: the press shrinks it with scale, which applies
// to transform as well and pulled the ring towards the corner on every click.
addEventListener("DOMContentLoaded", () => {
  const ring = document.createElement("div");
  ring.id = "demo-cursor";
  // On <html>, not <body>: the app moves the body with a transform, which would carry a fixed child along.
  const root = document.documentElement;
  root.appendChild(ring);
  addEventListener("pointermove", (e) => { if (e.pointerType === "mouse") { root.classList.add("pointing"); ring.style.translate = `${e.clientX}px ${e.clientY}px`; } }, { passive: true });
  addEventListener("pointerdown", () => ring.classList.add("down"), { passive: true });
  addEventListener("pointerup", () => ring.classList.remove("down"), { passive: true });
  document.addEventListener("mouseleave", () => root.classList.remove("pointing"));
});
