// <hd-icon name="mdi:sofa-outline">: Material Design Icons straight from Home Assistant's own icon store
// (/static/mdi/iconMetadata.json plus chunk files, the same files HA's frontend uses), so the app ships no icon font.
// Chunks are cached in memory and in localStorage under the MDI version, so a TV start needs no icon requests at all.
const chunks = new Map();
// Paths already loaded, by icon name: icon() then writes the SVG straight into the markup, so a new panel is laid
// out and painted once, with its icons, instead of again for each icon a moment later.
const known = new Map();
const svg = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
let meta = null;

const getMeta = () => (meta ||= fetch("/static/mdi/iconMetadata.json").then((r) => r.json()));

async function pathFor(icon) {
  const name = icon.replace(/^mdi:/, "");
  const m = await getMeta();
  // Parts are sorted by their first icon name; the icon lives in the last part that starts at or before it.
  let file = m.parts[0].file;
  for (const p of m.parts) if (p.start && p.start <= name) file = p.file;
  if (!chunks.has(file)) {
    const key = `hd-mdi-${m.version}-${file}`;
    chunks.set(file, (async () => {
      try { const hit = localStorage.getItem(key); if (hit) return JSON.parse(hit); } catch (e) { /* storage blocked */ }
      const data = await (await fetch(`/static/mdi/${file}.json`)).json();
      try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) { /* full or blocked: memory only */ }
      return data;
    })());
  }
  const d = (await chunks.get(file))[name] || "";
  known.set(icon, d);
  return d;
}

class HdIcon extends HTMLElement {
  static get observedAttributes() { return ["name"]; }
  connectedCallback() { this._draw(); }
  attributeChangedCallback() { if (this.isConnected) this._draw(); }
  async _draw() {
    const name = this.getAttribute("name") || "";
    if (name === this._drawn) return;
    this._drawn = name;
    // Came with its SVG from icon(): nothing to do.
    if (known.has(name) && this.getAttribute("data-d") === name) return;
    const d = known.has(name) ? known.get(name) : name ? await pathFor(name).catch(() => "") : "";
    if (this._drawn !== name) return;
    this.innerHTML = d ? svg(d) : "";
  }
}
customElements.define("hd-icon", HdIcon);

// Warms the chunks for these icons at start (panels open later would otherwise wait for a chunk over the network).
export function preloadIcons(names) {
  for (const n of new Set(names)) if (/^mdi:[a-z0-9-]+$/.test(n)) pathFor(n).catch(() => {});
}

export const icon = (name, cls = "", attrs = "") => {
  const d = known.get(name);
  return `<hd-icon name="${name}"${d ? ` data-d="${name}"` : ""}${cls ? ` class="${cls}"` : ""}${attrs ? ` ${attrs}` : ""}>${d ? svg(d) : ""}</hd-icon>`;
};
