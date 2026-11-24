// Connection to the Home Assistant that serves this page. The Alvuna integration serves the app (/alvuna/tv/), so REST,
// camera stills, icons and fonts are all same-origin.
//
// Sign-in reads the frontend's own token store ("hassTokens"): a paired TV keeps the tokens pairing gave it there (they
// refresh like any browser session); in a browser that is already signed in to HA, its normal session is used.
import { getAuth, createConnection, subscribeEntities, callService as haCall, ERR_INVALID_AUTH } from "home-assistant-js-websocket";
import { t } from "../shared/i18n.js";

const loadTokens = async () => {
  try { return JSON.parse(localStorage.getItem("hassTokens")) || null; } catch (e) { return null; }
};
const saveTokens = (t) => {
  try { localStorage.setItem("hassTokens", JSON.stringify(t)); } catch (e) { /* storage blocked */ }
};

// True when this origin holds tokens: a paired TV, or a browser signed in to this Home Assistant.
export const hasTokens = () => { try { return !!JSON.parse(localStorage.getItem("hassTokens"))?.access_token; } catch (e) { return false; } };

// Pairing (see custom_components/alvuna/pairing.py): asks for a code, then polls until an admin approves it in Home
// Assistant. onCode(code) shows it; resolves once the tokens are stored. A code that expires is replaced by a new one.
export async function pair({ name, onCode, onBusy }) {
  const wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
  for (;;) {
    const start = await fetch("/api/alvuna/pair", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }) }).catch(() => null);
    if (!start || !start.ok) { onBusy(start?.status); await wait(start?.status === 429 ? 60000 : 10000); continue; }
    const req = await start.json();
    onCode(req.code);
    for (;;) {
      await wait(2000);
      const res = await fetch(`/api/alvuna/pair/${req.request_id}`, { headers: { "X-Alvuna-Secret": req.secret }, cache: "no-store" })
        .catch(() => null);
      if (!res || res.status === 202) continue;
      if (res.ok) { saveTokens((await res.json()).tokens); return; }
      break; // expired or rejected: ask for a new code
    }
  }
}

export async function connect({ onStates, onStatus }) {
  // Without any token getAuth sends the browser to HA's login page and comes back here.
  const auth = await getAuth({ hassUrl: location.origin, loadTokens, saveTokens });
  let conn;
  try {
    conn = await createConnection({ auth });
  } catch (e) {
    if (e === ERR_INVALID_AUTH) { saveTokens(null); location.reload(); }
    throw e;
  }
  conn.addEventListener("disconnected", () => onStatus("offline"));
  conn.addEventListener("ready", () => onStatus("online"));
  // Tokens refused on reconnect (the TV was removed in Home Assistant, or its user deleted): forget them and start
  // again, which shows the pairing code (or HA's sign-in with ?login=1).
  conn.addEventListener("reconnect-error", (_conn, err) => {
    if (err === ERR_INVALID_AUTH) { saveTokens(null); location.reload(); } else onStatus("offline");
  });
  subscribeEntities(conn, onStates);
  return conn;
}

export const call = (conn, domain, service, data = {}, target) => haCall(conn, domain, service, data, target);

// The Alvuna card config from a Lovelace dashboard: the first `custom:alvuna-card` (or the older custom:homedeck-card) anywhere in it.
export async function loadDeckConfig(conn, dashboard) {
  const cfg = await conn.sendMessagePromise({ type: "lovelace/config", url_path: dashboard || null });
  const find = (v) => {
    if (Array.isArray(v)) { for (const x of v) { const f = find(x); if (f) return f; } return null; }
    if (!v || typeof v !== "object") return null;
    if (v.type === "custom:alvuna-card" || v.type === "custom:homedeck-card") return v;
    for (const x of Object.values(v)) { const f = find(x); if (f) return f; }
    return null;
  };
  const card = find(cfg);
  if (!card) throw new Error(t("tv.no_card", { dashboard }));
  return card;
}

// The signed-in user's language and number/time formats (what HA's own frontend shows them), with the server's language
// as the fallback, and the server's currency: what setLocale takes.
export async function userLocale(conn) {
  const ask = (msg) => conn.sendMessagePromise(msg).catch(() => null);
  const [user, config] = await Promise.all([ask({ type: "frontend/get_user_data", key: "language" }), ask({ type: "get_config" })]);
  const v = user?.value || {};
  return { language: v.language || config?.language, numberFormat: v.number_format, timeFormat: v.time_format, currency: config?.currency };
}

export const onDashboardChange = (conn, cb) => conn.subscribeEvents(cb, "lovelace_updated");

// The layout from the integration (alvuna/layout/subscribe), now and after every change; rejects without the integration.
export const subscribeLayout = (conn, cb) => conn.subscribeMessage(cb, { type: "alvuna/layout/subscribe" });

// This TV's channel: notifications and cameras sent by the alvuna.notify / alvuna.show_camera actions.
export const subscribeTv = (conn, cb) => conn.subscribeMessage(cb, { type: "alvuna/tv/subscribe" });

// Hourly and daily forecast (one-shot, like the tablet card's _loadForecast), with twice-daily folded into days.
// `ids`: the weather entity shown, then the others listed in `weather`: when the first gives only a few days (IMGW: 3),
// the longest daily forecast of the others is used for the days.
export async function loadForecast(conn, ids) {
  const [id, ...more] = [].concat(ids);
  const get = async (type, id) => {
    // The integration keeps each forecast for a quarter of an hour for every screen; older setups ask HA directly.
    try {
      const res = await conn.sendMessagePromise({ type: "alvuna/forecast", entity_id: id, forecast_type: type });
      return res?.forecast || [];
    } catch (e) { /* no integration: below */ }
    try {
      const res = await conn.sendMessagePromise({ type: "call_service", domain: "weather", service: "get_forecasts",
        service_data: { type }, target: { entity_id: id }, return_response: true });
      return res?.response?.[id]?.forecast || [];
    } catch (e) { return []; }
  };
  const days = async (id) => { const d = await get("daily", id); return d.length ? d : foldTwiceDaily(await get("twice_daily", id)); };
  const [hourly, own] = await Promise.all([get("hourly", id), days(id)]);
  let daily = own;
  if (daily.length < 5) for (const d of await Promise.all(more.map(days))) if (d.length > daily.length) daily = d;
  return { hourly, daily, at: Date.now() };
}

function foldTwiceDaily(parts) {
  const days = new Map();
  for (const p of parts) {
    const key = new Date(p.datetime).toDateString();
    const d = days.get(key) || { datetime: p.datetime, temperature: -Infinity, templow: Infinity, precipitation: 0 };
    d.temperature = Math.max(d.temperature, p.temperature);
    d.templow = Math.min(d.templow, p.templow ?? p.temperature);
    d.precipitation += p.precipitation || 0;
    if (!d.condition || p.is_daytime) d.condition = p.condition;
    days.set(key, d);
  }
  return [...days.values()];
}

// A live stream URL (HLS) for a camera, or null when the camera has none.
export async function cameraStream(conn, id) {
  try {
    const res = await conn.sendMessagePromise({ type: "camera/stream", entity_id: id, format: "hls" });
    return res?.url || null;
  } catch (e) { return null; }
}

// State history of a few entities over the last `hours` (one-shot, like the tablet card's history loads):
// { start, end, data: { id: [{ s, t }] } } with t in ms.
export async function loadHistory(conn, ids, hours = 24) {
  const end = new Date(), start = new Date(end.getTime() - hours * 3600e3);
  const res = await conn.sendMessagePromise({ type: "history/history_during_period", start_time: start.toISOString(),
    end_time: end.toISOString(), entity_ids: ids, minimal_response: true, no_attributes: true, significant_changes_only: false });
  const data = {};
  for (const id of ids) data[id] = (res?.[id] || []).map((x) => ({ s: x.s, t: (x.lu ?? x.lc) * 1000 }));
  return { at: Date.now(), start: start.getTime(), end: end.getTime(), data };
}

// HA's persistent notifications (the bell in HA's sidebar), kept current: cb receives the whole map each time.
export function subscribeNotifications(conn, cb) {
  let all = {};
  return conn.subscribeMessage((ev) => {
    if (ev.type === "removed") for (const id of Object.keys(ev.notifications)) delete all[id];
    else all = { ...(ev.type === "current" ? {} : all), ...ev.notifications };
    cb(all);
  }, { type: "persistent_notification/subscribe" });
}

// Which integration each entity comes from ({ entity_id: platform }), from the registry list HA's own UI uses.
export async function entityPlatforms(conn) {
  try {
    const res = await conn.sendMessagePromise({ type: "config/entity_registry/list_for_display" });
    const out = {};
    for (const e of res?.entities || []) out[e.ei] = e.pl;
    return out;
  } catch (e) { return {}; }
}
