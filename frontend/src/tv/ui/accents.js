// Accent colour: what lights up (lime by default) — icons of things that are on, focus details, progress, checks.
// Picked per TV in Ustawienia → Kolor akcentu and kept in this TV's storage. Each accent has its ink (text on it) and
// a deep shade for use on the light "on" tiles, where the bright colour itself would not read.
export const ACCENTS = [
  { id: "limonka", name: "Limonka", c: "#B8F03C", rgb: "184,240,60", ink: "#13240A", deep: "#4F7A12", deeper: "#3E6410" },
  { id: "turkus", name: "Turkus", c: "#3EE0D0", rgb: "62,224,208", ink: "#06302C", deep: "#0E7A70", deeper: "#0B6159" },
  { id: "blekit", name: "Błękit", c: "#5AB4FF", rgb: "90,180,255", ink: "#06223D", deep: "#1F6FB8", deeper: "#195A96" },
  { id: "fiolet", name: "Fiolet", c: "#B794FF", rgb: "183,148,255", ink: "#22114A", deep: "#6A3FD0", deeper: "#5631AC" },
  { id: "roz", name: "Róż", c: "#FF7EB6", rgb: "255,126,182", ink: "#3D0B22", deep: "#C23A78", deeper: "#A22E63" },
  { id: "koral", name: "Koral", c: "#FF8A6B", rgb: "255,138,107", ink: "#3D1408", deep: "#C04A2A", deeper: "#9E3C22" },
  { id: "zloto", name: "Złoto", c: "#FFD84A", rgb: "255,216,74", ink: "#3A2E00", deep: "#9A7A00", deeper: "#7D6300" },
  { id: "bialy", name: "Biel", c: "#F2F4F5", rgb: "242,244,245", ink: "#12232C", deep: "#3D5260", deeper: "#2F404B" },
];

const KEY = "homedeck-accent";
export function currentAccent() {
  let id = "";
  try { id = localStorage.getItem(KEY) || ""; } catch (e) { /* storage blocked */ }
  return ACCENTS.find((a) => a.id === id) || ACCENTS[0];
}
export function setAccent(id) {
  try { localStorage.setItem(KEY, id); } catch (e) { /* storage blocked: this session only */ }
  applyAccent();
}
export function applyAccent() {
  const a = currentAccent(), s = document.documentElement.style;
  s.setProperty("--lime", a.c);
  s.setProperty("--lime-rgb", a.rgb);
  s.setProperty("--lime-ink", a.ink);
  s.setProperty("--lime-deep", a.deep);
  s.setProperty("--lime-deeper", a.deeper);
}
