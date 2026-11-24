// What the screen shows, worked out from Home Assistant's states and the Alvuna card config. Same rules as the tablet
// card (src/card/alvuna-card.js: _securityItems, _thermo, _climateSensors, _wxNow, _air, _wxAlert, _sceneOn, _who,
// _mediaInfo), written as plain functions over (states, config) so the TV app needs no Lovelace card around them.
import { ids, isNum, AIR_PL, AIR_BAD, IMGW_ALERT_PL, BRANDS, TV_APPS, VAC_STATE_PL, VAC_SUCTION_PL, APP_STATE_PL, APP_ACTIVE, APP_DONE,
  PROGRAM_PL } from "./format.js";

export class Home {
  constructor(states, config) {
    this.states = states || {};
    this.c = config || { rooms: [] };
  }

  st(id) { return id ? this.states[id] : undefined; }
  on(id) { return this.st(id)?.state === "on"; }
  val(id) { const s = this.st(id)?.state; return isNum(s) ? Number(s) : null; }
  name(x) {
    if (typeof x !== "string" && x?.name) return x.name;
    const id = typeof x === "string" ? x : x?.entity;
    return this.st(id)?.attributes.friendly_name || id || "";
  }

  rooms() { return this.c.rooms || []; }
  lights(room) { return ids(room.lights); }
  allLights() { return this.rooms().flatMap((r) => this.lights(r)); }
  lightsOn() { return this.allLights().filter((id) => this.on(id)); }

  // Every entity the screen depends on: a change to any other entity does not redraw anything.
  watched() {
    const c = this.c, out = new Set(["sun.sun"]);
    const add = (v) => { if (typeof v === "string" && v.includes(".")) out.add(v); };
    const walk = (v) => { if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === "object") Object.values(v).forEach(walk); else add(v); };
    for (const key of ["rooms", "persons", "scenes", "security", "climate", "media", "cameras", "weather", "outdoor_temperature",
      "weather_alert", "air_quality", "vacuum", "appliances"]) walk(c[key]);
    return out;
  }

  // --- scenes -----------------------------------------------------------------------------------
  scenes() { return (this.c.scenes || []).map((s) => (typeof s === "string" ? { entity: s } : s)); }
  sceneOn(s) {
    const st = this.st(s.active);
    if (!st || !["on", "active", "playing", "heat", "open"].includes(st.state)) return null;
    const end = st.attributes.finishes_at;
    return { left: end ? Math.max(1, Math.round((new Date(end) - Date.now()) / 60000)) : null };
  }

  // --- rooms ------------------------------------------------------------------------------------
  roomSummary(r) {
    const lights = this.lights(r), on = lights.filter((id) => this.on(id)).length;
    const t = this.val(r.temperature), h = this.val(r.humidity);
    const sub = !lights.length ? (h != null ? `Wilgotność ${Math.round(h)}%` : "Brak świateł")
      : on === 0 ? "Wszystko wyłączone" : on === lights.length ? (on > 1 ? "Wszystkie włączone" : "Włączone") : `Włączone ${on} z ${lights.length}`;
    return { lights, on, t, h, sub };
  }

  // --- security ---------------------------------------------------------------------------------
  securityItems() {
    return (this.c.security || []).map((x) => {
      const id = typeof x === "string" ? x : x.entity, st = this.st(id);
      return { id, name: this.name(x), st, dc: st?.attributes.device_class, alert: st?.state === "on",
        off: !st || ["unavailable", "unknown"].includes(st.state) };
    });
  }
  cameras() { return (this.c.cameras || []).map((x) => (typeof x === "string" ? { entity: x } : x)).filter((x) => this.st(x.entity)); }

  // --- climate and weather ----------------------------------------------------------------------
  thermo() {
    const cl = this.c.climate || {}, st = this.st(cl.entity);
    if (!st || st.state === "unavailable") return null;
    const a = st.attributes, target = Number(a.temperature), on = st.state !== "off";
    return { id: cl.entity, a, on, heating: on && a.hvac_action === "heating", target, current: Number(a.current_temperature),
      min: Number(a.min_temp ?? 7), max: Number(a.max_temp ?? 30), step: Number(a.target_temp_step || .5),
      status: !on ? "Ogrzewanie wyłączone" : `${a.hvac_action === "heating" ? "Grzeje do" : "Utrzymuje"}` };
  }
  climateSensors() {
    const c = this.c, cl = c.climate || {};
    const list = cl.sensors || this.rooms().filter((r) => r.temperature || r.humidity)
      .map((r) => ({ name: r.name, icon: r.icon, temperature: r.temperature, humidity: r.humidity }));
    const out = list.map((x) => ({ ...x, t: this.val(x.temperature), h: this.val(x.humidity) }));
    if (!cl.sensors && c.outdoor_temperature) out.push({ name: "Na zewnątrz", icon: "mdi:tree-outline", outdoor: true,
      temperature: c.outdoor_temperature, humidity: cl.outdoor_humidity, t: this.val(c.outdoor_temperature), h: this.val(cl.outdoor_humidity) });
    return out;
  }
  indoorAverage() {
    const inside = this.climateSensors().filter((x) => !x.outdoor && x.t != null);
    return inside.length ? inside.reduce((a, x) => a + x.t, 0) / inside.length : null;
  }
  // `weather` may list fallbacks: the first entity with a known condition wins.
  weatherId() {
    const list = [].concat(this.c.weather || []);
    return list.find((id) => this.st(id) && !["unavailable", "unknown"].includes(this.st(id).state)) || list.find((id) => this.st(id));
  }
  night() { return this.st("sun.sun")?.state === "below_horizon"; }
  weatherNow() {
    const w = this.st(this.weatherId());
    const out = this.val(this.c.outdoor_temperature);
    return { w, cond: w?.state, night: this.night(), temp: out ?? (isNum(w?.attributes.temperature) ? Number(w.attributes.temperature) : null),
      humidity: w?.attributes.humidity, wind: w?.attributes.wind_speed, windUnit: w?.attributes.wind_speed_unit || "km/h" };
  }
  air() {
    const c = this.c.air_quality, st = c && this.st(c.index);
    if (!st || !AIR_PL[st.state]) return null;
    const pm = (id) => { const v = this.val(id); return v != null ? Math.round(v) : null; };
    return { level: st.state, label: AIR_PL[st.state], bad: AIR_BAD.includes(st.state), pm10: pm(c.pm10), pm25: pm(c.pm25) };
  }
  weatherAlert() {
    const st = this.st(this.c.weather_alert)?.state;
    return st && !["no_alert", "unknown", "unavailable"].includes(st) ? IMGW_ALERT_PL[st] || st : "";
  }

  // --- people -----------------------------------------------------------------------------------
  persons() {
    return (this.c.persons || []).map((x) => (typeof x === "string" ? { entity: x } : x)).map((p) => {
      const st = this.st(p.entity), a = st?.attributes || {};
      const pic = (p.picture || a.entity_picture || "").replace(/(\/api\/image\/serve\/[^/]+\/)512x512$/, "$1256x256");
      return { id: p.entity, name: p.name || a.friendly_name || p.entity, pic, home: st?.state === "home" };
    });
  }

  // --- needs attention (the left summary panel) ------------------------------------------------------
  // Battery sensors under `battery_low` % (default 10), skipping phones and browsers (people's devices, not the
  // home's) when the entity registry says so, and anything listed in `battery_ignore` — the tablet card's rule.
  lowBatteries(platforms = {}) {
    const limit = Number(this.c.battery_low ?? 10), skip = new Set(ids(this.c.battery_ignore));
    return Object.values(this.states).filter((st) => st.attributes.device_class === "battery" && st.entity_id.startsWith("sensor.")
      && isNum(st.state) && Number(st.state) < limit && !skip.has(st.entity_id) && !["mobile_app", "browser_mod"].includes(platforms[st.entity_id]))
      .map((st) => ({ id: st.entity_id, name: st.attributes.friendly_name || st.entity_id, value: Math.round(Number(st.state)) }))
      .sort((a, b) => a.value - b.value);
  }
  updates() {
    return Object.values(this.states).filter((st) => st.entity_id.startsWith("update.") && st.state === "on")
      .map((st) => ({ id: st.entity_id, name: st.attributes.title || st.attributes.friendly_name || st.entity_id, version: st.attributes.latest_version || "" }));
  }
  // `waste` calendars: what goes out today (until noon) or tomorrow, from each calendar's next all-day event.
  wasteDue() {
    const day = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const now = new Date(), today = day(now), tomorrow = day(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
    const due = (when) => ids(this.c.waste).map((id) => this.st(id)).filter((st) => st && String(st.attributes.start_time || "").startsWith(when))
      .map((st) => st.attributes.message || st.attributes.friendly_name);
    if (now.getHours() < 12 && due(today).length) return { when: "Dziś", list: due(today) };
    return due(tomorrow).length ? { when: "Jutro", list: due(tomorrow) } : null;
  }
  roomsLit() { return this.rooms().filter((r) => this.lights(r).some((id) => this.on(id))).map((r) => r.name); }

  // --- vacuum and appliances (washer, dishwasher) ----------------------------------------------------
  vacuum() {
    const v = this.c.vacuum, st = this.st(v?.entity);
    if (!st) return null;
    const a = st.attributes, raw = v.battery ? this.st(v.battery)?.state : a.battery_level ?? a.battery;
    const room = this.st(v.room)?.state, suction = this.st(v.suction)?.state ?? a.fan_speed;
    const shown = (x) => x != null && !["unknown", "unavailable", ""].includes(String(x));
    return { id: v.entity, name: v.name || a.friendly_name || "Odkurzacz", st, state: st.state, label: VAC_STATE_PL[st.state] || st.state,
      active: ["cleaning", "returning", "paused"].includes(st.state), cleaning: st.state === "cleaning", charging: !!a.charging,
      battery: isNum(raw) ? Number(raw) : null, room: shown(room) ? room : "", time: this.val(v.time), timeUnit: this.st(v.time)?.attributes.unit_of_measurement || "min",
      area: this.val(v.area), suction: shown(suction) ? VAC_SUCTION_PL[String(suction).toLowerCase()] || suction : "" };
  }
  appliances() {
    return (this.c.appliances || []).map((ap, i) => {
      const stx = this.st(ap.state), s = stx?.state || "unknown", prog = this.st(ap.program)?.state, phase = this.st(ap.phase)?.state;
      const shown = (x) => x && !["off", "none", "unknown", "unavailable"].includes(x);
      const usable = (id) => { const st = this.st(id); return st && st.state !== "unavailable" ? id : ""; };
      return { i, name: ap.name || this.name(ap.state), icon: ap.icon || "mdi:washing-machine", room: ap.room || "", state: s,
        label: APP_STATE_PL[s] || s, active: APP_ACTIVE.includes(s), done: APP_DONE.includes(s), paused: /paused/.test(s),
        pct: this.val(ap.progress), left: this.val(ap.remaining), total: this.val(ap.duration), power: this.val(ap.power), cycles: this.val(ap.cycles),
        program: shown(prog) ? PROGRAM_PL[prog] || prog : "", phase: shown(phase) ? phase : "",
        pause: usable(ap.pause), resume: usable(ap.resume), unloaded: usable(ap.unloaded),
        // This finished cycle, for "Wyjęte" on a TV where HA's own button is not available (WashData offers it only
        // in some states): hidden here until the next cycle.
        doneKey: `done:${ap.state}:${stx?.last_changed || ""}` };
    });
  }
  // What runs now: the home screen's "Teraz pracuje" row and its header note. With `done`, also the appliances
  // that finished and wait to be emptied (only the left summary lists those).
  working(done = false, hidden = {}) {
    const v = this.vacuum();
    return [...(v?.active ? [{ kind: "vac", v }] : []),
      ...this.appliances().filter((x) => x.active || (done && x.done && !hidden[x.doneKey])).map((ap) => ({ kind: "app", ap }))];
  }

  // --- media ------------------------------------------------------------------------------------
  mediaItems() { return (this.c.media || []).map((x) => this.mediaInfo(x)).filter(Boolean); }
  mediaInfo(x) {
    const id = typeof x === "string" ? x : x?.entity, st = this.st(id);
    if (!st) return null;
    const live = (s) => s && ["playing", "paused", "buffering"].includes(s.state);
    const on = !["off", "unavailable", "unknown", "standby"].includes(st.state);
    const appOpen = (p) => !p?.app || new RegExp(p.app, "i").test([st.attributes.app_id, st.attributes.app_name].join(" "));
    // `now_playing`: a companion player (Cast) that knows what the TV shows, counted only while it plays.
    const extra = on && typeof x === "object" && [].concat(x.now_playing || []).filter(appOpen)
      .map((p) => this.st(typeof p === "string" ? p : p.entity)).find(live);
    const src = extra || st, tv = { ...st.attributes, ...(x?.name && { friendly_name: x.name }) };
    const a = extra ? { ...extra.attributes, friendly_name: tv.friendly_name, device_class: tv.device_class,
      volume_level: tv.volume_level, is_volume_muted: tv.is_volume_muted, supported_features: tv.supported_features } : tv;
    const active = live(src);
    const names = (typeof x === "object" && x.sources) || {};
    const srcName = (v) => v && (names[v] || String(v).replace(/^HDMI\s*(\d)$/i, "HDMI $1"));
    const pic = a.entity_picture_local || a.entity_picture || "";
    const hay = [a.app_id, a.app_name, a.source, tv.app_id, tv.source].join(" ").toLowerCase();
    const app = [a.app_name, srcName(a.source), tv.app_name, srcName(tv.source)].filter(Boolean)
      .map((v) => (/^[a-z][\w]*(\.[\w]+)+$/i.test(v) ? (TV_APPS.find(([re]) => re.test(v)) || [])[1] || "" : v)).find(Boolean) || "";
    return {
      id: src.entity_id, tv: id, name: tv.friendly_name, on, active, playing: src.state === "playing", st, src, a,
      isTv: tv.device_class === "tv", volume: tv.volume_level, muted: !!tv.is_volume_muted, features: tv.supported_features || 0,
      title: a.media_title || (active ? app : "") || "", artist: a.media_artist || a.media_album_name || a.media_series_title || "",
      input: on && !active ? srcName(tv.source) || app : "", app, pic, logoOnly: !a.media_title,
      duration: Number(a.media_duration) || 0, position: Number(a.media_position) || 0, positionAt: a.media_position_updated_at,
      brand: BRANDS.find(([re]) => re.test(hay)),
    };
  }
  // Playback position now, extrapolated from the last report while playing.
  mediaPosition(m) {
    let p = m.position;
    if (m.playing && m.positionAt) p += (Date.now() - Date.parse(m.positionAt)) / 1000;
    return m.duration ? Math.min(p, m.duration) : p;
  }
}
