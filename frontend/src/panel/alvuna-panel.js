// The Alvuna panel in Home Assistant's sidebar (administrators only), in two tabs:
//   Screen (/alvuna)   the layout Alvuna builds by itself, where the household hides items, renames them, changes their
//                      order and adds entities to the lists. Every change is saved on its own (600 ms after the last
//                      edit) through alvuna/editor/save, which updates every open card and TV.
//   TVs (/alvuna/tvs)  each paired TV: what it shows, commands and its settings (tvs.js, alvuna/tvs/subscribe).
// A plain custom element with shadow DOM; Home Assistant sets hass, narrow, route and panel on it.
import {
  ADDABLE, addItem, candidates, cleanOverrides, idsInUse, listItems, move, normalize, removeItem, rooms, setHidden, setName,
} from "./model.js";
import { setLanguage, t, currentLanguage } from "./strings.js";
import { tvsTab, TVS_STYLE, setTvLocale, nextLayout } from "./tvs.js";

const SAVE_DELAY = 600;
const MAX_RESULTS = 150;

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ESC[c]);

// Material Design Icons paths, drawn inline so the panel does not wait for HA's icon loader.
const P = {
  menu: "M3,6H21V8H3V6M3,11H21V13H3V11M3,16H21V18H3V16Z",
  up: "M7.41,15.41L12,10.83L16.59,15.41L18,14L12,8L6,14L7.41,15.41Z",
  down: "M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z",
  next: "M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z",
  plus: "M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z",
  search: "M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z",
  reset: "M12.5,8C9.85,8 7.45,9 5.6,10.6L2,7V16H11L7.38,12.38C8.77,11.22 10.54,10.5 12.5,10.5C16.04,10.5 19.05,12.81 20.1,16L22.47,15.22C21.08,11.03 17.15,8 12.5,8Z",
  remove: "M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M7,13H17V11H7",
  check: "M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z",
  alert: "M11,15H13V17H11V15M11,7H13V13H11V7M12,2C6.47,2 2,6.5 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20Z",
};
const svg = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${d}"/></svg>`;

// Icons when Home Assistant has no state object (or ha-state-icon) to draw from.
const DOMAIN_ICON = {
  light: "mdi:lightbulb-outline", cover: "mdi:window-shutter", humidifier: "mdi:air-humidifier", scene: "mdi:palette-outline",
  script: "mdi:script-text-outline", binary_sensor: "mdi:shield-outline", camera: "mdi:cctv", media_player: "mdi:cast",
  person: "mdi:account-outline", sensor: "mdi:eye-outline", calendar: "mdi:calendar", weather: "mdi:weather-partly-cloudy",
  climate: "mdi:thermostat", vacuum: "mdi:robot-vacuum",
};
const FOUND_ICON = {
  weather: "mdi:weather-partly-cloudy", climate: "mdi:radiator", vacuum: "mdi:robot-vacuum", appliances: "mdi:washing-machine",
  waste: "mdi:trash-can-outline", air_quality: "mdi:weather-dust", weather_alert: "mdi:alert-outline",
};
const FOUND_KEYS = ["weather", "climate", "vacuum", "appliances", "waste", "air_quality", "weather_alert"];

class AlvunaPanel extends HTMLElement {
  constructor() {
    super();
    this._hass = null;
    this._narrow = false;
    this._data = null;
    this._ov = normalize({});
    this._state = "loading"; // loading | ready | not_set_up | error
    this._loadError = "";
    this._expanded = new Set();
    this._picker = null; // { key, query }
    this._version = 0; // local edits made
    this._savedVersion = 0; // local edits the server has
    this._saving = false;
    this._save = "idle"; // idle | pending | saving | saved | error
    this._saveError = "";
    this._timer = null;
    this._built = false;
    this._tvs = null; // alvuna/tvs/subscribe's last update, or "unavailable"
    this._tvUnsub = null;
    this._tvSel = null; // the TV picked on the TVs tab (entry id); the first connected one until then
    this._tvSection = "control"; // control | settings | log
    this._drafts = {}; // entry -> message being typed
    this._flash = {}; // entry -> { text, error }: the last command's outcome
    this._ticker = null;
    this.attachShadow({ mode: "open" });
    // HA loads its components lazily: once its switch and state icon exist, they replace the stand-ins.
    for (const tag of ["ha-switch", "ha-state-icon"]) {
      if (!customElements.get(tag)) customElements.whenDefined(tag).then(() => this._built && this._render());
    }
    this._onBeforeUnload = (e) => {
      if (this._version === this._savedVersion) return;
      this._flush();
      e.preventDefault();
      e.returnValue = t("unsaved_leave");
    };
  }

  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
    const langChanged = setLanguage(hass?.locale?.language || hass?.language);
    const tvLangChanged = setTvLocale({ language: hass?.locale?.language || hass?.language });
    this._syncMenu();
    if (first) {
      this._render();
      this._load();
      this._subscribeTvs();
    } else if (langChanged || tvLangChanged) {
      this._render();
      this._renderStatus();
    }
  }

  get hass() { return this._hass; }

  set narrow(value) {
    this._narrow = !!value;
    this._syncMenu();
  }

  get narrow() { return this._narrow; }

  set route(value) {
    const before = this._tab;
    this._route = value;
    // Newer Home Assistant scrolls the document, older ones the panel itself: both go back to the top.
    if (this._built && this._tab !== before) { this._render(); this.scrollTop = 0; window.scrollTo(0, 0); }
  }

  get _tab() { return /^\/tvs/.test(this._route?.path || "") ? "tvs" : "layout"; }
  get route() { return this._route; }
  set panel(value) { this._panel = value; }
  get panel() { return this._panel; }

  connectedCallback() {
    window.addEventListener("beforeunload", this._onBeforeUnload);
    if (!this._built) this._render();
    if (this._hass && this._state === "error") this._load();
    if (this._hass && !this._tvUnsub) this._subscribeTvs();
    // "5 min ago" stays true.
    this._ticker = setInterval(() => { if (this._tab === "tvs") this._render(); }, 30000);
  }

  disconnectedCallback() {
    window.removeEventListener("beforeunload", this._onBeforeUnload);
    // Leaving the panel never loses an edit: whatever waits for the debounce goes now.
    if (this._version !== this._savedVersion) this._flush();
    clearInterval(this._ticker);
    const unsub = this._tvUnsub;
    this._tvUnsub = null;
    if (typeof unsub?.then === "function") unsub.then((u) => u?.()).catch(() => {});
  }

  // ---- TVs ----

  _subscribeTvs() {
    if (!this._hass?.connection) return;
    this._tvUnsub = this._hass.connection.subscribeMessage((data) => {
      this._tvs = data;
      this._render();
    }, { type: "alvuna/tvs/subscribe" });
    this._tvUnsub.catch(() => {
      this._tvUnsub = null;
      this._tvs = "unavailable";
      this._render();
    });
  }

  _tv(id) { return this._tvs?.tvs?.find((x) => x.entry_id === id); }

  _selectedTv() {
    const list = this._tvs?.tvs || [];
    if (this._tvSel && list.some((x) => x.entry_id === this._tvSel)) return this._tvSel;
    return (list.find((x) => x.connected) || list[0])?.entry_id || null;
  }

  _flashFor(id, text, error = false) {
    this._flash[id] = { text, error };
    clearTimeout(this._flash[`${id}:t`]);
    this._flash[`${id}:t`] = setTimeout(() => { delete this._flash[id]; this._render(); }, error ? 6000 : 2500);
    this._render();
  }

  async _tvCommand(id, command, extra = {}) {
    try {
      await this._hass.callWS({ type: "alvuna/tvs/command", entry_id: id, command, ...extra });
      this._flashFor(id, t("tvs.sent"));
      return true;
    } catch (err) {
      this._flashFor(id, t("tvs.failed", { msg: err?.message || String(err || "") }), true);
      return false;
    }
  }

  // Shown at once; the TV's next report (or the server's copy) confirms it.
  async _tvSettings(id, change) {
    const sent = this._hass.callWS({ type: "alvuna/tvs/settings", entry_id: id, settings: change });
    const tv = this._tv(id);
    if (tv) { tv.settings = { ...(tv.settings || {}), ...change }; tv.pending = true; this._render(); }
    try {
      await sent;
    } catch (err) {
      this._flashFor(id, t("tvs.failed", { msg: err?.message || String(err || "") }), true);
    }
  }

  _tvsContent() {
    const visible = (id) => !this._ov.hidden.includes(id);
    const roomList = this._data ? rooms(this._data, this._ov).filter((r) => visible(r.id))
      .map((r) => ({ area: r.id.replace(/^area:/, ""), name: this._ov.names[r.id] || r.auto_name })) : [];
    const cameras = this._data ? listItems(this._data, this._ov, "cameras", this._nameOf).filter((c) => visible(c.id) && !c.missing)
      .map((c) => ({ id: c.id, name: this._ov.names[c.id] || c.auto_name })) : [];
    return tvsTab({
      data: this._tvs, lang: this._hass?.locale?.language || currentLanguage(), rooms: roomList, cameras,
      hasClimate: !!this._data?.found?.climate, selected: this._selectedTv(), section: this._tvSection, drafts: this._drafts, flash: this._flash,
      svg, P, switch: (focus, on, label, attrs) => this._tvSwitch(focus, on, label, attrs),
    });
  }

  _tvSwitch(focus, on, label, attrs) {
    const common = `data-action="tv-pref" data-focus="${esc(focus)}" data-on="${on ? 1 : 0}" aria-label="${esc(label)}" title="${esc(label)}" ${attrs}`;
    if (customElements.get("ha-switch")) return `<ha-switch ${common}></ha-switch>`;
    return `<input type="checkbox" role="switch" class="switch" ${common} ${on ? "checked" : ""}>`;
  }

  _tabs() {
    const n = Array.isArray(this._tvs?.tvs) ? this._tvs.tvs.length : null;
    const tab = (key, label, count) => `<button class="tab" role="tab" data-action="tab" data-key="${key}" data-focus="tab|${key}"
      aria-selected="${this._tab === key}">${esc(label)}${count != null ? `<span class="count">${count}</span>` : ""}</button>`;
    return `<div class="tabs" role="tablist">${tab("layout", t("tabs.layout"))}${tab("tvs", t("tabs.tvs"), n)}</div>`;
  }

  // ---- Data ----

  async _load({ quiet = false } = {}) {
    if (!this._hass) return;
    if (!quiet && !this._data) {
      this._state = "loading";
      this._render();
    }
    try {
      const data = await this._hass.callWS({ type: "alvuna/editor/get" });
      this._data = data;
      // The server's overrides replace the local copy only when no edit is waiting to be saved.
      if (this._version === this._savedVersion && !this._saving) this._ov = normalize(data.overrides);
      this._state = "ready";
    } catch (err) {
      if (quiet && this._data) return;
      this._state = err?.code === "not_set_up" ? "not_set_up" : "error";
      this._loadError = err?.message || String(err || "");
    }
    this._render();
  }

  _change(mutate, { render = true, focus } = {}) {
    mutate(this._ov);
    this._version += 1;
    this._setSave("pending");
    clearTimeout(this._timer);
    this._timer = setTimeout(() => {
      this._timer = null;
      this._flush();
    }, SAVE_DELAY);
    if (render) this._render(focus);
  }

  async _flush() {
    clearTimeout(this._timer);
    this._timer = null;
    if (this._saving || !this._hass || this._version === this._savedVersion) return;
    const version = this._version;
    this._saving = true;
    this._setSave("saving");
    try {
      await this._hass.callWS({ type: "alvuna/editor/save", overrides: cleanOverrides(this._ov) });
      this._savedVersion = version;
    } catch (err) {
      this._saving = false;
      this._saveError = err?.message || String(err || "");
      this._setSave("error");
      return;
    }
    this._saving = false;
    if (this._version !== this._savedVersion) {
      // Edited while saving: save again (now, unless the debounce is still waiting for more typing).
      if (!this._timer) this._flush();
      return;
    }
    this._setSave("saved");
    this._load({ quiet: true });
  }

  _setSave(state) {
    this._save = state;
    this._renderStatus();
  }

  _nameOf = (id) => this._hass?.states?.[id]?.attributes?.friendly_name || id;

  // ---- Rendering ----

  _build() {
    this.shadowRoot.innerHTML = `<style>${STYLE}</style>
      <header class="toolbar">
        <button class="menu ib" data-action="menu" hidden>${svg(P.menu)}</button>
        <h1 class="title">Alvuna</h1>
        <div class="status" role="status" aria-live="polite"></div>
      </header>
      <main class="content"></main>`;
    this.shadowRoot.querySelector("style").textContent += TVS_STYLE;
    const root = this.shadowRoot;
    root.addEventListener("click", (e) => this._onClick(e));
    root.addEventListener("input", (e) => this._onInput(e));
    root.addEventListener("keydown", (e) => this._onKey(e));
    root.addEventListener("focusout", (e) => this._onFocusOut(e));
    root.addEventListener("change", (e) => this._onChange(e));
    root.addEventListener("submit", (e) => this._onSubmit(e));
    root.addEventListener("focusin", (e) => {
      if (e.target.dataset?.action === "rename") e.target.dataset.before = e.target.value;
    });
    this._built = true;
    this._syncMenu();
  }

  _syncMenu() {
    const btn = this.shadowRoot.querySelector(".menu");
    if (!btn) return;
    btn.hidden = !(this._narrow || this._hass?.dockedSidebar === "always_hidden");
    btn.setAttribute("aria-label", t("menu"));
  }

  _renderStatus() {
    const el = this.shadowRoot.querySelector(".status");
    if (!el) return;
    const s = this._save;
    el.className = `status ${s}`;
    if (s === "pending" || s === "saving") el.innerHTML = `<span class="dot"></span>${esc(t("saving"))}`;
    else if (s === "saved") el.innerHTML = `${svg(P.check)}${esc(t("saved"))}`;
    else if (s === "error") {
      el.innerHTML = `<span title="${esc(this._saveError)}">${svg(P.alert)}${esc(t("save_error"))}</span>
        <button class="retry" data-action="retry-save">${esc(t("retry"))}</button>`;
    } else el.textContent = "";
  }

  // Re-renders the content; the focused control (or `focusKey`) keeps focus and its caret.
  _render(focusKey) {
    if (!this._built) this._build();
    const root = this.shadowRoot;
    const active = root.activeElement;
    const key = focusKey || active?.dataset?.focus;
    const sel = active && "selectionStart" in active && active.selectionStart != null ? [active.selectionStart, active.selectionEnd] : null;
    const html = this._content();
    const main = root.querySelector(".content");
    // A list being picked from would close under the user's mouse: the update waits until it is left.
    if (html !== this._lastHtml && active?.tagName === "SELECT" && !focusKey) { this._deferred = true; return; }
    this._deferred = false;
    if (html !== this._lastHtml) {
      main.innerHTML = html;
      this._lastHtml = html;
      this._hydrate(main);
    }
    if (key) this._refocus(main, key, focusKey ? null : sel);
  }

  _refocus(main, key, sel) {
    const find = (k) => [...main.querySelectorAll("[data-focus]")].find((e) => e.dataset.focus === k && !e.disabled);
    let el = find(key);
    // A row moved to the top or bottom: its other arrow takes the focus.
    if (!el && /^move-(up|down)\|/.test(key)) el = find(key.replace(/^move-(up|down)/, (m, d) => `move-${d === "up" ? "down" : "up"}`));
    if (!el || el === this.shadowRoot.activeElement) return;
    // HA's own controls (ha-switch) throw on focus() until they have rendered, just after innerHTML made them.
    try { el.focus({ preventScroll: true }); } catch { requestAnimationFrame(() => { try { el.focus({ preventScroll: true }); } catch { /* gone */ } }); }
    if (sel && typeof el.setSelectionRange === "function") {
      try { el.setSelectionRange(sel[0], sel[1]); } catch { /* not a text field */ }
    }
  }

  // Properties the HTML string cannot carry: switch states, state objects for icons.
  _hydrate(main) {
    for (const sw of main.querySelectorAll("[data-action=visible]")) {
      sw.checked = sw.dataset.on === "1";
      sw.addEventListener("change", () => {
        const id = sw.dataset.id;
        this._change((ov) => setHidden(ov, id, !sw.checked), { focus: `visible|${id}` });
      });
    }
    for (const sw of main.querySelectorAll("[data-action=tv-pref]")) {
      sw.checked = sw.dataset.on === "1";
      sw.addEventListener("change", () => {
        this._tvSettings(sw.dataset.tvId, { [sw.dataset.tvKey]: !!sw.checked });
      });
    }
    for (const icon of main.querySelectorAll("ha-state-icon[data-entity]")) {
      icon.hass = this._hass;
      icon.stateObj = this._hass?.states?.[icon.dataset.entity];
    }
  }

  _content() {
    return this._tabs() + (this._tab === "tvs" ? this._tvsContent() : this._layoutContent());
  }

  _layoutContent() {
    if (this._state === "loading") return `<div class="state"><span class="dot"></span>${esc(t("loading"))}</div>`;
    if (this._state === "not_set_up") {
      return `<div class="state card">
        <p class="state-title">${esc(t("not_set_up"))}</p>
        <p>${esc(t("not_set_up_hint"))}</p>
        <a class="button" href="/config/integrations/integration/alvuna" data-nav>${esc(t("open_integrations"))}</a>
      </div>`;
    }
    if (this._state === "error") {
      return `<div class="state card">
        <p class="state-title">${esc(t("load_error"))}</p>
        ${this._loadError ? `<p class="mono">${esc(this._loadError)}</p>` : ""}
        <button class="button" data-action="retry-load" data-focus="retry-load">${esc(t("try_again"))}</button>
      </div>`;
    }
    return `<div class="intro">
        <p>${esc(t("intro"))}</p>
        <p class="intro-save">${esc(t("intro_save"))}</p>
      </div>
      ${this._roomsSection()}
      ${ADDABLE.map((key) => this._listSection(key)).join("")}
      ${this._foundSection()}`;
  }

  _icon(id, fallback) {
    const domain = String(id).split(".")[0];
    if (this._hass?.states?.[id] && customElements.get("ha-state-icon")) return `<ha-state-icon data-entity="${esc(id)}"></ha-state-icon>`;
    return `<ha-icon icon="${esc(fallback || DOMAIN_ICON[domain] || "mdi:circle-outline")}"></ha-icon>`;
  }

  _switch(id, visible, name) {
    const label = esc(t("visible", { name }));
    const common = `data-action="visible" data-id="${esc(id)}" data-focus="visible|${esc(id)}" data-on="${visible ? 1 : 0}" aria-label="${label}" title="${label}"`;
    if (customElements.get("ha-switch")) return `<ha-switch ${common}></ha-switch>`;
    return `<input type="checkbox" role="switch" class="switch" ${common} ${visible ? "checked" : ""}>`;
  }

  // The name field: shows the name in use; emptying it (or typing the automatic one) brings the automatic name back.
  _nameField(id, autoName) {
    const own = this._ov.names[id];
    return `<div class="name-wrap">
      <input class="name" type="text" maxlength="80" spellcheck="false" autocomplete="off" data-action="rename" data-id="${esc(id)}"
        data-auto="${esc(autoName)}" data-focus="rename|${esc(id)}" value="${esc(own || autoName)}" placeholder="${esc(autoName)}"
        aria-label="${esc(t("rename", { name: autoName }))}" title="${esc(t("rename_hint"))}">
      <button class="ib small reset" data-action="reset" data-id="${esc(id)}" data-focus="reset|${esc(id)}"
        aria-label="${esc(t("reset_name"))}" title="${esc(t("reset_name"))}">${svg(P.reset)}</button>
    </div>`;
  }

  _moveButtons(key, id, index, count, name) {
    return `<button class="ib" data-action="move-up" data-key="${key}" data-id="${esc(id)}" data-focus="move-up|${esc(id)}"
        aria-label="${esc(t("move_up", { name }))}" title="${esc(t("move_up", { name }))}" ${index === 0 ? "disabled" : ""}>${svg(P.up)}</button>
      <button class="ib" data-action="move-down" data-key="${key}" data-id="${esc(id)}" data-focus="move-down|${esc(id)}"
        aria-label="${esc(t("move_down", { name }))}" title="${esc(t("move_down", { name }))}" ${index === count - 1 ? "disabled" : ""}>${svg(P.down)}</button>`;
  }

  _rowClass(id, extra = "") {
    const hidden = this._ov.hidden.includes(id);
    return `row ${extra} ${hidden ? "is-hidden" : ""} ${this._ov.names[id] ? "renamed" : ""}`;
  }

  _badges(id, { added = false, missing = false } = {}) {
    return `${added ? `<span class="badge">${esc(t("badge_added"))}</span>` : ""}
      ${missing ? `<span class="badge warn">${esc(t("badge_missing"))}</span>` : ""}
      <span class="badge muted hidden-badge">${esc(t("badge_hidden"))}</span>`;
  }

  _sectionHead(key, count, action = "") {
    return `<div class="section-head">
      <h2 id="h-${key}">${esc(t(`sections.${key}`))}${count != null ? `<span class="count">${count}</span>` : ""}</h2>
      ${action}
    </div>`;
  }

  _roomsSection() {
    const list = rooms(this._data, this._ov);
    const body = list.length ? list.map((room, i) => this._room(room, i, list.length)).join("")
      : `<div class="empty">${esc(t("empty_rooms"))}</div>`;
    return `<section aria-labelledby="h-rooms">
      ${this._sectionHead("rooms", list.length)}
      <div class="card">${body}</div>
      <p class="note">${esc(t("notes.rooms"))}</p>
    </section>`;
  }

  _room(room, index, count) {
    const id = room.id, areaId = id.replace(/^area:/, "");
    const name = this._ov.names[id] || room.auto_name;
    const open = this._expanded.has(id);
    const items = room.items || [];
    const label = t(open ? "collapse" : "expand", { name });
    const row = `<div class="${this._rowClass(id, "room")}">
      <div class="icon"><ha-icon icon="${esc(room.icon || "mdi:texture-box")}"></ha-icon></div>
      <div class="main">
        ${this._nameField(id, room.auto_name)}
        <div class="sub">
          <button class="disclose ${open ? "open" : ""}" data-action="expand" data-id="${esc(id)}" data-focus="expand|${esc(id)}"
            aria-expanded="${open}" aria-controls="body-${esc(areaId)}" aria-label="${esc(label)}">
            ${esc(t("devices", { n: items.length }))}${svg(P.down)}
          </button>
          <span class="id">${esc(t("area", { id: areaId }))}</span>
          <span class="auto">${esc(t("auto_name", { name: room.auto_name }))}</span>
          ${this._badges(id)}
        </div>
      </div>
      <div class="controls">${this._moveButtons("rooms", id, index, count, name)}${this._switch(id, !this._ov.hidden.includes(id), name)}</div>
    </div>`;
    if (!open) return row;
    const devices = items.length ? items.map((item) => {
      const n = this._ov.names[item.id] || item.auto_name;
      return `<div class="${this._rowClass(item.id, "device")}">
        <div class="icon">${this._icon(item.id)}</div>
        <div class="main">
          ${this._nameField(item.id, item.auto_name)}
          <div class="sub"><span class="kind">${esc(t(`kinds.${item.kind}`))}</span><span class="id">${esc(item.id)}</span>
            <span class="auto">${esc(t("auto_name", { name: item.auto_name }))}</span>${this._badges(item.id)}</div>
        </div>
        <div class="controls">${this._switch(item.id, !this._ov.hidden.includes(item.id), n)}</div>
      </div>`;
    }).join("") : `<div class="empty small">${esc(t("no_devices"))}</div>`;
    const area = this._hass?.areas?.[areaId];
    const sensor = (kind) => {
      const sid = room.sensors?.[kind];
      const value = sid
        ? `<span class="sensor-name">${esc(this._nameOf(sid))}</span> <span class="id">${esc(sid)}</span>
           ${area ? `<span class="origin">${esc(t(area[`${kind}_entity_id`] === sid ? "sensor_area" : "sensor_auto"))}</span>` : ""}`
        : `<span class="muted-text">${esc(t("sensor_none"))}</span>`;
      return `<div class="sensor"><span class="sensor-label">${esc(t(kind))}</span><span class="sensor-value">${value}</span></div>`;
    };
    return `${row}<div class="room-body" id="body-${esc(areaId)}" role="group" aria-label="${esc(name)}">
      ${devices}
      <div class="sensors">
        ${sensor("temperature")}${sensor("humidity")}
        <p class="hint">${esc(t("sensor_hint"))}
          <a href="/config/areas/area/${encodeURIComponent(areaId)}" data-nav>${esc(t("area_settings"))}${svg(P.next)}</a></p>
      </div>
    </div>`;
  }

  _listSection(key) {
    const items = listItems(this._data, this._ov, key, this._nameOf);
    const picking = this._picker?.key === key;
    const add = `<button class="add" data-action="open-picker" data-key="${key}" data-focus="open-picker|${key}"
      aria-expanded="${picking}">${svg(P.plus)}${esc(t("add"))}</button>`;
    const rows = items.map((item, i) => {
      const name = this._ov.names[item.id] || item.auto_name;
      const remove = item.added ? `<button class="ib" data-action="remove" data-key="${key}" data-id="${esc(item.id)}"
        data-focus="remove|${esc(item.id)}" aria-label="${esc(t("remove", { name }))}" title="${esc(t("remove", { name }))}">${svg(P.remove)}</button>` : "";
      return `<div class="${this._rowClass(item.id, item.missing ? "missing" : "")}">
        <div class="icon">${this._icon(item.id)}</div>
        <div class="main">
          ${this._nameField(item.id, item.auto_name)}
          <div class="sub"><span class="id">${esc(item.id)}</span>
            <span class="auto">${esc(t("auto_name", { name: item.auto_name }))}</span>${this._badges(item.id, item)}</div>
        </div>
        <div class="controls">${remove}${this._moveButtons(key, item.id, i, items.length, name)}${this._switch(item.id, !this._ov.hidden.includes(item.id), name)}</div>
      </div>`;
    }).join("");
    return `<section aria-labelledby="h-${key}">
      ${this._sectionHead(key, items.length, add)}
      <div class="card">
        ${picking ? this._pickerHtml(key) : ""}
        ${rows || (picking ? "" : `<div class="empty">${esc(t("empty"))}</div>`)}
      </div>
      <p class="note">${esc(t(`notes.${key}`))}</p>
    </section>`;
  }

  _pickerHtml(key) {
    const query = this._picker.query;
    const all = candidates(this._data, this._ov, key, query);
    const anything = candidates(this._data, this._ov, key, "").length > 0;
    const shown = all.slice(0, MAX_RESULTS);
    const results = shown.map((c) => `<li><button class="result" data-action="pick" data-key="${key}" data-id="${esc(c.id)}"
        data-focus="pick|${esc(c.id)}" aria-label="${esc(t("add_item", { name: c.auto_name }))}">
        <span class="icon small">${this._icon(c.id)}</span>
        <span class="result-text"><span class="result-name">${esc(c.auto_name)}</span><span class="id">${esc(c.id)}</span></span>
        <span class="plus">${svg(P.plus)}</span>
      </button></li>`).join("");
    const empty = !anything ? t("no_candidates") : !all.length ? t("no_results") : "";
    return `<div class="picker">
      <div class="picker-bar">
        <label class="search">${svg(P.search)}
          <input type="search" data-action="search" data-key="${key}" data-focus="search|${key}" value="${esc(query)}"
            placeholder="${esc(t("search_short"))}" aria-label="${esc(t("search"))}" title="${esc(t("search"))}" autocomplete="off" spellcheck="false">
        </label>
        <button class="text-button" data-action="close-picker" data-key="${key}" data-focus="close-picker|${key}">${esc(t("done"))}</button>
      </div>
      ${empty ? `<p class="picker-empty">${esc(empty)}</p>` : `<ul class="results">${results}</ul>`}
      ${all.length > shown.length ? `<p class="picker-empty">${esc(t("more_results", { n: all.length - shown.length }))}</p>` : ""}
    </div>`;
  }

  _foundSection() {
    const f = this._data?.found || {};
    const ent = (id) => `<span class="found-item"><span>${esc(this._nameOf(id))}</span> <span class="id">${esc(id)}</span></span>`;
    const rows = FOUND_KEYS.filter((k) => f[k] != null && !(Array.isArray(f[k]) && !f[k].length)).map((k) => {
      const v = f[k];
      let value;
      if (k === "appliances") value = v.map((a) => `<span class="found-item">${esc(a.name)}${a.state ? ` <span class="id">${esc(a.state)}</span>` : ""}</span>`).join("");
      else if (k === "air_quality") {
        value = Object.entries(v).map(([part, id]) => `<span class="found-item"><span class="found-part">${esc(t(`air.${part}`))}</span> ${esc(this._nameOf(id))} <span class="id">${esc(id)}</span></span>`).join("");
      } else if (k === "vacuum") {
        value = `${ent(v.entity)}${v.battery ? `<span class="found-item"><span class="found-part">${esc(t("battery"))}</span> <span class="id">${esc(v.battery)}</span></span>` : ""}`;
      } else if (Array.isArray(v)) value = v.map((id) => (typeof id === "string" ? ent(id) : esc(JSON.stringify(id)))).join("");
      else if (typeof v === "string") value = ent(v);
      else if (v && typeof v === "object" && v.entity) value = ent(v.entity);
      else value = `<span class="id">${esc(JSON.stringify(v))}</span>`;
      return `<div class="row found">
        <div class="icon"><ha-icon icon="${FOUND_ICON[k]}"></ha-icon></div>
        <div class="main"><div class="found-label">${esc(t(`found.${k}`))}</div><div class="found-values">${value}</div></div>
      </div>`;
    }).join("");
    return `<section aria-labelledby="h-found">
      ${this._sectionHead("found", null)}
      <div class="card">${rows || `<div class="empty">${esc(t("nothing_found"))}</div>`}</div>
      <p class="note">${esc(t("notes.found"))}</p>
    </section>`;
  }

  // ---- Events ----

  _onClick(e) {
    const nav = e.target.closest("a[data-nav]");
    if (nav) {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      history.pushState(null, "", nav.getAttribute("href"));
      window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: false } }));
      return;
    }
    const el = e.target.closest("[data-action]");
    if (!el || el.disabled) return;
    const { action, id, key } = el.dataset;
    switch (action) {
      case "menu":
        this.dispatchEvent(new CustomEvent("hass-toggle-menu", { bubbles: true, composed: true }));
        break;
      case "move-up":
      case "move-down": {
        const ids = key === "rooms" ? rooms(this._data, this._ov).map((r) => r.id) : listItems(this._data, this._ov, key).map((i) => i.id);
        this._change((ov) => move(ov, key, ids, id, action === "move-up" ? -1 : 1), { focus: `${action}|${id}` });
        break;
      }
      case "expand":
        if (this._expanded.has(id)) this._expanded.delete(id);
        else this._expanded.add(id);
        this._render(`expand|${id}`);
        break;
      case "reset": {
        this._change((ov) => setName(ov, id, ""), { focus: `rename|${id}` });
        break;
      }
      case "open-picker":
        this._picker = this._picker?.key === key ? null : { key, query: "" };
        this._render(this._picker ? `search|${key}` : `open-picker|${key}`);
        break;
      case "close-picker":
        this._picker = null;
        this._render(`open-picker|${key}`);
        break;
      case "pick":
        this._change((ov) => addItem(ov, key, id), { focus: `search|${key}` });
        break;
      case "remove": {
        const used = idsInUse(this._data, this._ov, key).has(id);
        this._change((ov) => removeItem(ov, key, id, used), { focus: `open-picker|${key}` });
        break;
      }
      case "retry-load":
        this._load();
        break;
      case "tab": {
        if (key === this._tab) break;
        const base = `/${this._panel?.url_path || "alvuna"}`;
        history.pushState(null, "", key === "tvs" ? `${base}/tvs` : base);
        window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: false } }));
        break;
      }
      case "tv-cmd":
        this._tvCommand(id, el.dataset.command);
        break;
      case "tv-set":
        this._tvSettings(id, { [key]: el.dataset.value });
        break;
      case "tv-layout": {
        const tv = this._tv(id);
        if (!tv) break;
        const d = el.dataset;
        const layout = nextLayout(tv.settings?.layout, tv.catalog || [], { kind: d.op, row: d.row, id: d.tile, step: Number(d.step || 0) });
        this._tvSettings(id, { layout });
        break;
      }
      case "tv-pick":
        this._tvSel = id;
        this._render(`tv-pick|${id}`);
        break;
      case "tv-section":
        this._tvSection = key;
        this._render(`tv-section|${key}`);
        break;
      case "tv-clear-log":
        this._hass.callWS({ type: "alvuna/tvs/clear_log", entry_id: id }).catch(() => {});
        break;
      case "retry-save":
        this._flush();
        break;
      default:
    }
  }

  _onInput(e) {
    const el = e.target;
    if (el.dataset?.action === "rename") {
      const { id, auto } = el.dataset;
      // No re-render while typing: the row only learns whether it now has its own name.
      this._change((ov) => setName(ov, id, el.value, auto), { render: false });
      el.closest(".row")?.classList.toggle("renamed", !!this._ov.names[id]);
    } else if (el.dataset?.action === "tv-draft") {
      this._drafts[el.dataset.id] = el.value;
      const send = el.closest("form")?.querySelector("button[type=submit]");
      if (send) send.disabled = !el.value.trim();
    } else if (el.dataset?.action === "search" && this._picker) {
      this._picker.query = el.value;
      this._render();
    }
  }

  _onKey(e) {
    const el = e.target;
    if (e.key === "Escape" && this._picker && el.closest?.(".picker")) {
      e.preventDefault();
      const key = this._picker.key;
      this._picker = null;
      this._render(`open-picker|${key}`);
    } else if (e.key === "Enter" && el.dataset?.action === "rename") {
      el.blur();
    } else if (e.key === "Escape" && el.dataset?.action === "rename") {
      // Escape drops what was typed since the field got focus.
      if (el.dataset.before != null) {
        el.value = el.dataset.before;
        el.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
      }
      el.blur();
    }
  }

  _onChange(e) {
    const el = e.target, { action, id, key } = el.dataset || {};
    if (action === "tv-open" && el.value) {
      const target = el.value;
      el.value = "";
      this._tvCommand(id, "open", { target });
    } else if (action === "tv-camera" && el.value) {
      const entity = el.value;
      el.value = "";
      this._tvCommand(id, "camera", { entity_id: entity });
    } else if (action === "tv-minutes") {
      this._tvSettings(id, { [key]: el.value === "" ? null : Number(el.value) });
    }
    if (this._deferred) setTimeout(() => this._render(), 0);
  }

  async _onSubmit(e) {
    const form = e.target;
    if (form.dataset?.action !== "tv-notify") return;
    e.preventDefault();
    const id = form.dataset.id, message = (this._drafts[id] || "").trim();
    if (!message) return;
    if (await this._tvCommand(id, "notify", { message })) {
      this._drafts[id] = "";
      this._lastHtml = null;
      this._render(`tv-draft|${id}`);
    }
  }

  _onFocusOut(e) {
    const el = e.target;
    if (el.tagName === "SELECT" && this._deferred) setTimeout(() => this._render(), 0);
    if (el.dataset?.action === "rename" && !el.value.trim()) el.value = el.dataset.auto;
  }
}

const STYLE = `
:host {
  display: block; height: 100%; overflow-y: auto; -webkit-overflow-scrolling: touch;
  scroll-padding-top: calc(var(--header-height, 56px) + var(--safe-area-inset-top, 0px) + 16px);
  background: var(--primary-background-color);
  color: var(--primary-text-color);
  font-family: var(--ha-font-family-body, Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
  -webkit-font-smoothing: antialiased;
  --alv-radius: var(--ha-card-border-radius, 12px);
  --alv-card: var(--card-background-color, var(--ha-card-background, #fff));
  --alv-sub: var(--secondary-text-color);
  --alv-div: var(--divider-color, rgba(0, 0, 0, .12));
  --alv-accent: var(--primary-color);
  --alv-tint: rgba(var(--rgb-primary-color, 3, 169, 244), .12);
  --alv-hover: rgba(var(--rgb-primary-text-color, 33, 33, 33), .06);
  --alv-wash: rgba(var(--rgb-primary-text-color, 33, 33, 33), .03);
  --alv-mono: var(--ha-font-family-code, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);
}
* { box-sizing: border-box; }
[hidden] { display: none !important; }
svg { width: 24px; height: 24px; fill: currentColor; flex: none; }
button { font: inherit; color: inherit; }
:focus-visible { outline: 2px solid var(--alv-accent); outline-offset: 2px; }

.toolbar {
  position: sticky; top: 0; z-index: 4; display: flex; align-items: center; gap: 4px;
  height: calc(var(--header-height, 56px) + var(--safe-area-inset-top, 0px));
  padding: var(--safe-area-inset-top, 0px) 12px 0;
  background: var(--app-header-background-color, var(--primary-color));
  color: var(--app-header-text-color, var(--text-primary-color, #fff));
  border-bottom: var(--app-header-border-bottom, none);
}
.toolbar .menu { color: inherit; }
.title { flex: 1; margin: 0 0 0 12px; font-size: var(--ha-font-size-xl, 20px); font-weight: 400; line-height: 1; white-space: nowrap; }
.menu:not([hidden]) + .title { margin-left: 8px; }
.status { display: flex; align-items: center; gap: 6px; font-size: 14px; opacity: .92; min-height: 24px; }
.status svg { width: 18px; height: 18px; vertical-align: -4px; margin-right: 4px; }
.status.saved svg { opacity: .9; }
.status .retry { border: 1px solid currentColor; background: transparent; border-radius: 999px; padding: 3px 12px; cursor: pointer; font-size: 13px; }
.dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; display: inline-block; margin-right: 6px; animation: pulse 1s ease-in-out infinite alternate; }
@keyframes pulse { from { opacity: .35; } to { opacity: 1; } }

.content { max-width: 880px; margin: 0 auto; padding: 28px 16px calc(72px + var(--safe-area-inset-bottom, 0px)); }
.intro { margin: 0 4px 8px; max-width: 680px; }
.intro p { margin: 0; font-size: 16px; line-height: 1.5; }
.intro .intro-save { margin-top: 8px; font-size: 14px; color: var(--alv-sub); }

section { margin-top: 36px; }
.section-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 0 4px 10px; min-height: 36px; }
h2 { margin: 0; font-size: 20px; font-weight: 600; letter-spacing: -.01em; display: flex; align-items: baseline; gap: 8px; }
.count { font-size: 15px; font-weight: 400; color: var(--alv-sub); }
.note { margin: 10px 4px 0; font-size: 13px; line-height: 1.45; color: var(--alv-sub); }

.card {
  background: var(--alv-card); border-radius: var(--alv-radius); overflow: hidden;
  border: var(--ha-card-border-width, 1px) solid var(--ha-card-border-color, var(--alv-div));
  box-shadow: var(--ha-card-box-shadow, none);
}
.card > * { position: relative; }
.card > * + *::before { content: ""; position: absolute; top: 0; left: 64px; right: 0; border-top: 1px solid var(--alv-div); pointer-events: none; }
.card > .room-body::before, .card > .room-body + *::before { left: 0; }

.row { display: grid; grid-template-columns: 36px minmax(0, 1fr) auto; align-items: center; gap: 12px; min-height: 64px; padding: 10px 10px 10px 16px; }
.icon { width: 36px; height: 36px; border-radius: 10px; display: grid; place-items: center; background: var(--alv-tint); color: var(--alv-accent); --mdc-icon-size: 22px; transition: background .2s, color .2s; }
.icon.small { width: 30px; height: 30px; border-radius: 8px; --mdc-icon-size: 18px; }
.main { min-width: 0; }
.controls { display: flex; align-items: center; gap: 2px; }
.controls ha-switch, .controls .switch { margin-left: 8px; }

.name-wrap { position: relative; display: flex; align-items: center; }
.name {
  width: 100%; min-width: 0; font: inherit; font-size: 16px; font-weight: 500; color: var(--primary-text-color);
  background: transparent; border: 0; border-radius: 8px; padding: 5px 34px 5px 8px; margin: -5px 0 -5px -8px; text-overflow: ellipsis;
}
.name::placeholder { color: var(--alv-sub); font-weight: 400; }
.name:hover { background: var(--alv-hover); }
.name:focus { outline: 2px solid var(--alv-accent); outline-offset: 0; background: var(--alv-card); }
.name-wrap .reset { position: absolute; right: 0; display: none; }
.renamed .name-wrap .reset { display: grid; }
.sub { display: flex; flex-wrap: wrap; align-items: center; gap: 3px 10px; margin-top: 4px; font-size: 13px; color: var(--alv-sub); min-width: 0; }
.id { font-family: var(--alv-mono); font-size: 12px; color: var(--alv-sub); overflow-wrap: anywhere; }
.auto { display: none; }
.renamed .auto { display: inline; }
.kind { color: var(--primary-text-color); opacity: .75; }

.badge { font-size: 11px; font-weight: 600; line-height: 1; padding: 4px 8px; border-radius: 999px; background: var(--alv-tint); color: var(--alv-accent); white-space: nowrap; }
.badge.muted { background: var(--alv-hover); color: var(--alv-sub); }
.badge.warn { background: rgba(var(--rgb-warning-color, 255, 166, 0), .16); color: var(--warning-color, #b26a00); }
.hidden-badge { display: none; }
.is-hidden .hidden-badge { display: inline; }
.is-hidden .icon { background: var(--alv-hover); color: var(--alv-sub); }
.is-hidden .name, .is-hidden .sub > :not(.hidden-badge):not(.disclose) { opacity: .5; }
.missing .icon { background: rgba(var(--rgb-warning-color, 255, 166, 0), .14); color: var(--warning-color, #b26a00); }

.ib { width: 36px; height: 36px; border: 0; border-radius: 50%; background: transparent; color: var(--alv-sub); display: grid; place-items: center; cursor: pointer; padding: 0; transition: background .15s, color .15s; }
.ib.small { width: 28px; height: 28px; }
.ib.small svg { width: 18px; height: 18px; }
.ib:hover:not(:disabled) { background: var(--alv-hover); color: var(--primary-text-color); }
.ib:disabled { opacity: .25; cursor: default; }
.toolbar .ib:hover { background: rgba(255, 255, 255, .12); color: inherit; }

.disclose { display: inline-flex; align-items: center; gap: 2px; border: 0; background: transparent; padding: 2px 6px 2px 0; margin: 0; color: var(--alv-accent); font-size: 13px; font-weight: 500; cursor: pointer; border-radius: 6px; }
.disclose svg { width: 18px; height: 18px; transition: transform .25s cubic-bezier(.22, 1, .36, 1); }
.disclose.open svg { transform: rotate(180deg); }

.room-body { background: var(--alv-wash); padding: 2px 0 6px; }
.room-body > * { position: relative; }
.room-body > .row + .row::before { content: ""; position: absolute; top: 0; left: 88px; right: 0; border-top: 1px solid var(--alv-div); }
.row.device { padding-left: 40px; min-height: 58px; }
.row.device .icon { width: 32px; height: 32px; border-radius: 9px; --mdc-icon-size: 20px; }
.row.device { grid-template-columns: 32px minmax(0, 1fr) auto; }
.sensors { padding: 12px 16px 8px 40px; border-top: 1px solid var(--alv-div); font-size: 14px; }
.sensor { display: grid; grid-template-columns: 112px minmax(0, 1fr); gap: 12px; padding: 4px 0; align-items: baseline; }
.sensor-label { color: var(--alv-sub); }
.sensor-value { display: flex; flex-wrap: wrap; gap: 2px 8px; align-items: baseline; min-width: 0; }
.origin { font-size: 12px; color: var(--alv-sub); }
.muted-text { color: var(--alv-sub); }
.hint { margin: 8px 0 4px; font-size: 13px; line-height: 1.45; color: var(--alv-sub); }
.hint a { display: inline-flex; align-items: center; color: var(--alv-accent); text-decoration: none; font-weight: 500; white-space: nowrap; }
.hint a:hover { text-decoration: underline; }
.hint a svg { width: 16px; height: 16px; }

.add { display: inline-flex; align-items: center; gap: 4px; border: 0; background: transparent; color: var(--alv-accent); font-size: 15px; font-weight: 500; padding: 6px 14px 6px 8px; border-radius: 999px; cursor: pointer; }
.add svg { width: 20px; height: 20px; }
.add:hover, .add[aria-expanded="true"] { background: var(--alv-tint); }

.picker { padding: 12px; background: var(--alv-wash); }
.picker-bar { display: flex; align-items: center; gap: 8px; }
.search { position: relative; flex: 1; display: flex; align-items: center; }
.search svg { position: absolute; left: 10px; width: 20px; height: 20px; color: var(--alv-sub); pointer-events: none; }
.search input {
  width: 100%; height: 42px; border-radius: 10px; border: 1px solid var(--alv-div); background: var(--alv-card);
  color: var(--primary-text-color); font: inherit; font-size: 15px; padding: 0 12px 0 38px;
}
.search input:focus { outline: 2px solid var(--alv-accent); outline-offset: -1px; border-color: transparent; }
.text-button { border: 0; background: transparent; color: var(--alv-accent); font-weight: 500; font-size: 15px; padding: 8px 12px; border-radius: 8px; cursor: pointer; }
.text-button:hover { background: var(--alv-tint); }
.results { list-style: none; margin: 8px 0 0; padding: 0; max-height: min(50vh, 380px); overflow-y: auto; }
.result { width: 100%; display: grid; grid-template-columns: 30px minmax(0, 1fr) 28px; gap: 12px; align-items: center; text-align: left; border: 0; background: transparent; padding: 8px; border-radius: 10px; cursor: pointer; }
.result:hover { background: var(--alv-hover); }
.result-text { display: flex; flex-direction: column; min-width: 0; gap: 2px; }
.result-name { font-size: 15px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.plus { color: var(--alv-accent); display: grid; place-items: center; }
.plus svg { width: 22px; height: 22px; }
.picker-empty { margin: 12px 4px 4px; font-size: 14px; color: var(--alv-sub); }

.row.found { grid-template-columns: 36px minmax(0, 1fr); }
.found-label { font-size: 16px; font-weight: 500; }
.found-values { display: flex; flex-direction: column; gap: 3px; margin-top: 4px; font-size: 14px; }
.found-item { display: flex; flex-wrap: wrap; gap: 2px 8px; align-items: baseline; }
.found-part { color: var(--alv-sub); min-width: 56px; }

.empty { padding: 20px 16px; color: var(--alv-sub); font-size: 15px; }
.empty.small { padding: 14px 16px 14px 40px; font-size: 14px; }
.state { padding: 32px 24px; margin-top: 8px; font-size: 15px; line-height: 1.5; color: var(--alv-sub); display: flex; flex-direction: column; align-items: flex-start; gap: 4px; }
.state:not(.card) { flex-direction: row; align-items: center; }
.state p { margin: 0; }
.state-title { color: var(--primary-text-color); font-size: 18px; font-weight: 600; }
.mono { font-family: var(--alv-mono); font-size: 13px; }
.button { margin-top: 16px; display: inline-flex; align-items: center; border: 0; border-radius: 999px; padding: 10px 20px; background: var(--alv-accent); color: var(--text-primary-color, #fff); font-size: 15px; font-weight: 500; text-decoration: none; cursor: pointer; }

.switch {
  -webkit-appearance: none; appearance: none; flex: none; width: 46px; height: 28px; border-radius: 14px; margin: 0;
  background: rgba(var(--rgb-primary-text-color, 33, 33, 33), .2); position: relative; cursor: pointer; transition: background .2s;
}
.switch::after { content: ""; position: absolute; top: 3px; left: 3px; width: 22px; height: 22px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0, 0, 0, .3); transition: transform .25s cubic-bezier(.22, 1, .36, 1); }
.switch:checked { background: var(--switch-checked-color, var(--alv-accent)); }
.switch:checked::after { transform: translateX(18px); }

@media (max-width: 600px) {
  .content { padding: 20px 12px calc(56px + var(--safe-area-inset-bottom, 0px)); }
  section { margin-top: 28px; }
  .row { gap: 10px; padding: 10px 6px 10px 12px; }
  .card > * + *::before { left: 58px; }
  .ib { width: 32px; height: 32px; }
  .row.device { padding-left: 24px; }
  .room-body > .row + .row::before { left: 66px; }
  .sensors { padding-left: 24px; }
  .sensor { grid-template-columns: 96px minmax(0, 1fr); }
  .controls ha-switch, .controls .switch { margin-left: 4px; }
}
@media (prefers-reduced-motion: reduce) {
  .dot { animation: none; }
  .disclose svg, .switch, .switch::after, .icon { transition: none; }
}
`;

if (!customElements.get("alvuna-panel")) customElements.define("alvuna-panel", AlvunaPanel);
