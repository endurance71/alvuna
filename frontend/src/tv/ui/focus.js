// Remote-control focus, built on lines instead of geometry (like Google TV): a scope (the home page or an open panel)
// is a stack of lines ([data-line="key"]), each holding items ([data-f="key"]). Up and down change the line and land on
// the item that line had last time; left and right move within the line, or adjust the item when it has
// [data-adjust] (brightness, volume, temperature). Focus is a class (.f), not DOM focus, so nothing scrolls by itself:
// the page and each row's track are moved with transforms only, which the TV's compositor animates cheaply.
const PAD_X = 96; // safe area at the sides of a 1920 px wide TV screen
const TOP_Y = 24; // where the row above the focused one sits once the header has scrolled away

export class Focus {
  constructor({ onActivate, onAdjust }) {
    this.onActivate = onActivate;
    this.onAdjust = onAdjust;
    this.scopes = new Map(); // name -> { line, items: { line: item }, x: { line: px } }
    this.name = null;
    this.root = null;
  }

  // Focus moves to the scope rooted at `el` (home page or a panel); its own last position is kept for when it returns.
  use(name, el) {
    this.name = name;
    this.root = el;
    if (!this.scopes.has(name)) this.scopes.set(name, { line: null, items: {}, x: {} });
    this.apply();
  }
  forget(name) { this.scopes.delete(name); }
  state() { return this.scopes.get(this.name); }

  lines() { return this.root ? [...this.root.querySelectorAll("[data-line]")].filter((l) => l.querySelector("[data-f]")) : []; }
  itemsOf(line) { return [...line.querySelectorAll("[data-f]")]; }
  current() {
    const s = this.state(), lines = this.lines();
    if (!s || !lines.length) return {};
    // A fresh scope starts on the first real row, not on the header's switcher above it.
    let li = lines.findIndex((l) => l.dataset.line === s.line);
    if (li < 0) li = Math.max(0, lines.findIndex((l) => l.dataset.line !== "top"));
    const line = lines[li], items = this.itemsOf(line);
    let ii = items.findIndex((i) => i.dataset.f === s.items[line.dataset.line]);
    if (ii < 0) ii = 0;
    return { lines, li, line, items, ii, item: items[ii] };
  }

  // Re-marks the focused item after every render and moves the page and track so it is in view.
  apply() {
    const s = this.state(), cur = this.current();
    if (!s || !cur.item) return;
    s.line = cur.line.dataset.line;
    s.items[s.line] = cur.item.dataset.f;
    // All geometry is read before anything is written: a read after a class or transform change forces the TV to
    // recompute style and layout right there, inside the key press (~20 ms on the C4), and the move then starts a
    // frame late. Under the Magic Remote pointer nothing moves: the page must not slide away under the cursor.
    const plan = s.pointer ? null : this._measure(cur);
    for (const el of this.root.ownerDocument.querySelectorAll(".f")) if (el !== cur.item) el.classList.remove("f");
    cur.item.classList.add("f");
    if (plan) this._commit(plan);
  }

  move(dir) {
    const cur = this.current();
    if (!cur.item) return false;
    const s = this.state();
    s.pointer = false;
    if (dir === "left" || dir === "right") {
      const step = dir === "left" ? -1 : 1;
      if (cur.item.hasAttribute("data-adjust")) { this.onAdjust(cur.item, step); return true; }
      const next = cur.items[cur.ii + step];
      if (!next) return false;
      s.items[s.line] = next.dataset.f;
    } else {
      const next = cur.lines[cur.li + (dir === "up" ? -1 : 1)];
      if (!next) return false;
      s.line = next.dataset.line;
      // A line seen for the first time starts at the item closest under the current one, not at its far left.
      if (!s.items[s.line]) {
        const x = cur.item.getBoundingClientRect().left;
        const pick = this.itemsOf(next).reduce((b, i) => (Math.abs(i.getBoundingClientRect().left - x) < Math.abs(b.getBoundingClientRect().left - x) ? i : b));
        s.items[s.line] = pick.dataset.f;
      }
    }
    this.apply();
    return true;
  }

  activate() {
    const { item } = this.current();
    if (item) this.onActivate(item);
  }

  // The Magic Remote pointer: whatever it rests on takes the focus, without scrolling (the wheel scrolls).
  pointAt(el) {
    const item = el.closest?.("[data-f]");
    if (!item || !this.root?.contains(item) || item.classList.contains("f")) return;
    const line = item.closest("[data-line]"), s = this.state();
    s.pointer = true;
    s.line = line.dataset.line;
    s.items[s.line] = item.dataset.f;
    this.apply();
  }

  isFirstLine() { const c = this.current(); return !c.line || c.li === 0 || (c.li === 1 && c.lines[0].dataset.line === "top"); }
  toFirstLine() {
    const lines = this.lines(), first = lines.find((l) => l.dataset.line !== "top");
    if (first) { const s = this.state(); s.line = first.dataset.line; s.pointer = false; this.apply(); }
  }

  // Where the row track and the page (or panel list) go so the focused item is in view: reads only.
  _measure({ line, item }) {
    const s = this.state(), plan = { s };
    // Row track: keep the item inside the safe area, moving only as far as needed.
    const track = line.querySelector("[data-track]");
    if (track) {
      const key = line.dataset.line, vw = this.root.clientWidth || 1920;
      let x = s.x[key] || 0;
      const left = item.offsetLeft, w = item.offsetWidth;
      if (left + x < PAD_X) x = PAD_X - left;
      if (left + w + x > vw - PAD_X) x = vw - PAD_X - w - left;
      x = Math.min(0, Math.max(x, Math.min(0, vw - PAD_X - track.scrollWidth)));
      Object.assign(plan, { track, key, x });
    }
    // Page or panel body.
    // A line outside the scrolled list (the gear in a panel's header) leaves the list where it is.
    const body = this.root.querySelector("[data-scroll]");
    if (body && body.contains(line)) {
      const lines = [...body.querySelectorAll("[data-line]")], first = lines.find((l) => l.dataset.line !== "top") || lines[0];
      const view = body.parentElement.clientHeight, fit = body.dataset.scroll === "fit";
      // Home page: on the first row the header shows. Further down, the row above the focused one sits at the top
      // edge, so there is always one row of context above and the rest below. The clamp at the end stops the page
      // once its last row reaches the bottom edge, so the screen never runs empty.
      const at = lines.indexOf(line), prev = line !== first && line.dataset.line !== "top" ? lines[at - 1] : null;
      let y = prev && prev.dataset.line !== "top" ? -(prev.offsetTop - TOP_Y) : 0;
      if (fit) {
        // Panels scroll only when the focused line would leave the panel.
        y = s.y || 0;
        const top = line.offsetTop + y, bottom = top + line.offsetHeight;
        if (bottom > view - 48) y -= bottom - (view - 48);
        if (top < 24) y = 24 - line.offsetTop;
        y = Math.min(0, y);
      }
      y = Math.max(y, Math.min(0, view - body.scrollHeight - (fit ? 48 : 0)));
      Object.assign(plan, { body, lines, at, fit, y });
    }
    return plan;
  }

  // Writes only: transforms (the compositor animates them) and the dimmed rows above the focus.
  _commit({ s, track, key, x, body, lines, at, fit, y }) {
    if (track) { s.x[key] = x; track.style.transform = `translateX(${x}px)`; }
    if (body) {
      // Rows above the focused one stay on screen, dimmed; the header fades out (it would be cut in half).
      if (!fit) lines.forEach((l, i) => l.classList.toggle("above", i < at && (l.dataset.line !== "top" || y < 0)));
      s.y = y;
      body.style.transform = `translateY(${y}px)`;
    }
  }
}
