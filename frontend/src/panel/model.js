// The Alvuna panel's data: the automatic layout (alvuna/editor/get) and the household's overrides, edited locally.
// Pure functions, no DOM, so they can be checked in Node. The overrides object mirrors overrides.py:
//   { hidden: [id], names: {id: name}, order: {section: [id]}, added: {section: [entity_id]} }
// An id is an entity id, or "area:<area id>" for a room.

export const LIST_SECTIONS = ["rooms", "scenes", "security", "cameras", "media", "persons"];
export const ADDABLE = ["scenes", "security", "cameras", "media", "persons"];
const MAX_ID = 255, MAX_NAME = 80;
// Home Assistant's own entity id check (cv.entity_id / valid_entity_id).
const ENTITY_ID = /^(?!.+__)(?!_)[\da-z_]+(?<!_)\.(?!_)[\da-z_]+(?<!_)$/;

const isId = (v) => typeof v === "string" && v.length > 0 && v.length <= MAX_ID;
const uniq = (list) => [...new Set(list)];

// A tolerant deep copy: anything the server sends becomes the four parts, each of the right type.
export function normalize(ov) {
  const src = ov && typeof ov === "object" ? ov : {};
  const out = { hidden: [], names: {}, order: {}, added: {} };
  if (Array.isArray(src.hidden)) out.hidden = uniq(src.hidden.filter(isId));
  if (src.names && typeof src.names === "object") {
    for (const [k, v] of Object.entries(src.names)) if (isId(k) && typeof v === "string") out.names[k] = v;
  }
  for (const part of ["order", "added"]) {
    const m = src[part];
    if (!m || typeof m !== "object") continue;
    for (const [k, v] of Object.entries(m)) if (LIST_SECTIONS.includes(k) && Array.isArray(v)) out[part][k] = uniq(v.filter(isId));
  }
  return out;
}

// What is sent to alvuna/editor/save: exactly what overrides.SCHEMA accepts, nothing empty.
export function cleanOverrides(ov) {
  const n = normalize(ov);
  const names = {};
  for (const [k, v] of Object.entries(n.names)) {
    const name = v.trim().slice(0, MAX_NAME).trim();
    if (name) names[k] = name;
  }
  const order = {}, added = {};
  for (const key of LIST_SECTIONS) {
    if (n.order[key]?.length) order[key] = n.order[key];
    const ids = (n.added[key] || []).filter((i) => ENTITY_ID.test(i));
    if (ids.length) added[key] = ids;
  }
  return { hidden: n.hidden, names, order, added };
}

// ids in the household's order: the ones it placed first, in its order, then the rest as they come (layout._ordered).
export function ordered(ids, order = []) {
  const rank = new Map(order.map((id, n) => [id, n]));
  return ids.map((id, n) => [id, n]).sort((a, b) => (rank.get(a[0]) ?? rank.size) - (rank.get(b[0]) ?? rank.size) || a[1] - b[1])
    .map(([id]) => id);
}

// The rooms in the current order (the room objects from editor/get).
export function rooms(data, ov) {
  const list = data?.sections?.rooms || [];
  const by = new Map(list.map((r) => [r.id, r]));
  return ordered(list.map((r) => r.id), ov.order.rooms).map((id) => by.get(id));
}

// One list section in the current order: what Alvuna found plus what the household added (here or earlier).
// Each item: { id, auto_name, added, missing } (missing: added earlier, but the entity is gone from Home Assistant).
export function listItems(data, ov, key, nameOf = (id) => id) {
  const base = data?.sections?.[key] || [];
  const cands = data?.sections?.[`${key}_candidates`] || [];
  const found = base.filter((i) => !i.added);
  const foundIds = new Set(found.map((i) => i.id));
  const extras = (ov.added[key] || []).filter((id) => !foundIds.has(id)).map((id) => {
    const known = base.find((i) => i.id === id) || cands.find((c) => c.id === id);
    return { id, auto_name: known?.auto_name || nameOf(id), added: true, missing: !known };
  });
  const by = new Map([...found.map((i) => [i.id, { id: i.id, auto_name: i.auto_name, added: false }]), ...extras.map((i) => [i.id, i])]);
  return ordered([...by.keys()], ov.order[key]).map((id) => by.get(id));
}

const fold = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ł/g, "l").replace(/Ł/g, "L").toLowerCase();

// What can still be added to a list, filtered by every word of the query (id and automatic name, accents ignored).
export function candidates(data, ov, key, query = "") {
  const listed = new Set(listItems(data, ov, key).map((i) => i.id));
  const pool = new Map();
  for (const c of data?.sections?.[`${key}_candidates`] || []) pool.set(c.id, { id: c.id, auto_name: c.auto_name });
  // Added earlier and taken out here: it can be added back.
  for (const i of data?.sections?.[key] || []) if (i.added && !pool.has(i.id)) pool.set(i.id, { id: i.id, auto_name: i.auto_name });
  const words = fold(query).split(/\s+/).filter(Boolean);
  return [...pool.values()].filter((c) => !listed.has(c.id))
    .filter((c) => { const hay = fold(`${c.id} ${c.auto_name}`); return words.every((w) => hay.includes(w)); })
    .sort((a, b) => String(a.auto_name).localeCompare(String(b.auto_name)));
}

// ---- Changes (each mutates ov) ----

export function setHidden(ov, id, hidden) {
  ov.hidden = ov.hidden.filter((i) => i !== id);
  if (hidden) ov.hidden.push(id);
}

// An empty name, or the automatic one, means "use Alvuna's own name".
export function setName(ov, id, name, autoName) {
  const v = String(name || "").slice(0, MAX_NAME);
  if (!v.trim() || v.trim() === String(autoName || "").trim()) delete ov.names[id];
  else ov.names[id] = v;
}

// Moves id by delta places within the list shown (ids in their current order); the whole order is kept.
export function move(ov, key, ids, id, delta) {
  const from = ids.indexOf(id), to = from + delta;
  if (from < 0 || to < 0 || to >= ids.length) return false;
  const next = [...ids];
  next.splice(from, 1);
  next.splice(to, 0, id);
  ov.order[key] = next;
  return true;
}

export function addItem(ov, key, id) {
  const list = ov.added[key] || [];
  if (!list.includes(id)) ov.added[key] = [...list, id];
  // A freshly added item goes to the end of a list that has its own order.
  if (ov.order[key]?.length && !ov.order[key].includes(id)) ov.order[key] = [...ov.order[key], id];
}

// Takes an added item out of `added` (and of the order). Its name and visibility are forgotten too, unless the same
// id still shows elsewhere.
export function removeItem(ov, key, id, stillUsed = false) {
  const list = (ov.added[key] || []).filter((i) => i !== id);
  if (list.length) ov.added[key] = list;
  else delete ov.added[key];
  if (ov.order[key]) ov.order[key] = ov.order[key].filter((i) => i !== id);
  if (!stillUsed) {
    delete ov.names[id];
    ov.hidden = ov.hidden.filter((i) => i !== id);
  }
}

// Every id the panel lists (rooms, their devices, every list), so a removal knows whether the id is used elsewhere.
export function idsInUse(data, ov, except) {
  const out = new Set();
  for (const r of data?.sections?.rooms || []) {
    out.add(r.id);
    for (const i of r.items || []) out.add(i.id);
  }
  for (const key of ADDABLE) {
    if (key === except) continue;
    for (const i of listItems(data, ov, key)) out.add(i.id);
  }
  return out;
}
