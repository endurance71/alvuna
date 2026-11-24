// The homes this TV knows: Home Assistant servers with Alvuna, kept in this origin's storage as "homedeck-instances"
//   [{ id, name, url }]
// Each server signs the TV in on its own (pairing, see ha.js): no token is ever stored in this list or passed along.
// Switching opens the other server's /alvuna/tv/ with the list in the fragment (#instances=…, which the browser never
// sends to a server), so the list follows the TV from home to home; that server pairs the TV if it does not know it yet.
const KEY = "homedeck-instances";

const clean = (x) => ({ id: String(x.id), name: String(x.name || x.id), url: String(x.url).replace(/\/$/, "") });

export function loadInstances() {
  let list = [];
  try { list = JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { list = []; }
  // A list handed over by the switch on another server (an older shell's tokens are dropped here by clean()).
  const handed = new URLSearchParams(location.hash.slice(1)).get("instances");
  if (handed) {
    try { list = JSON.parse(handed); } catch (e) { /* bad fragment: keep ours */ }
    history.replaceState(null, "", location.pathname + location.search);
  }
  list = (Array.isArray(list) ? list : []).filter((x) => x && x.id && x.url).map(clean);
  saveInstances(list);
  return list;
}

export function saveInstances(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list.map(clean))); } catch (e) { /* storage blocked */ }
}

const sameOrigin = (url) => { try { return new URL(url).origin === location.origin; } catch (e) { return false; } };

// This server, from the list or as it is: always "here".
export function currentInstance(list) {
  return list.find((x) => sameOrigin(x.url)) || { id: location.host, name: location.hostname, url: location.origin };
}

// The list with this server first, named after its home, so the TV can come back here from any other home.
export function withHere(list, here, name) {
  return [{ ...here, name: name || here.name }, ...list.filter((x) => !sameOrigin(x.url))];
}

// An address typed with the remote: "192.168.1.20", "ha.local:8123", "https://ha.example.com". Without a scheme it is
// http, and without a port Home Assistant's 8123.
export function normalizeAddress(input) {
  let s = String(input || "").trim().replace(/\/+$/, "");
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = `http://${s}${/:\d+$/.test(s) ? "" : ":8123"}`;
  try { return new URL(s).origin; } catch (e) { return null; }
}

export function addInstance(list, url) {
  if (list.some((x) => x.url === url)) return list;
  const u = new URL(url);
  return [...list, { id: u.host, name: u.hostname, url }];
}

export const removeInstance = (list, id) => list.filter((x) => x.id !== id);

// Resolves false when the server does not answer within 4 s (switching then stays on this one).
export async function reachable(inst) {
  const base = inst.url.replace(/\/$/, "");
  // From an https server the browser blocks any fetch to an http one, so the check would always fail; going there is
  // still allowed, so the switch goes ahead without it.
  if (location.protocol === "https:" && base.startsWith("http:")) return true;
  try {
    await Promise.race([fetch(`${base}/manifest.json`, { mode: "no-cors", cache: "no-store" }),
      new Promise((_, no) => setTimeout(() => no(new Error("timeout")), 4000))]);
    return true;
  } catch (e) { return false; }
}

export function switchTo(inst, list) {
  const base = inst.url.replace(/\/$/, "");
  location.href = `${base}/alvuna/tv/#${new URLSearchParams({ instances: JSON.stringify(list.map(clean)) })}`;
}
