// Wallpapers: the background behind the whole app, picked per TV in Ustawienia → Tapeta and kept in this TV's
// storage. Gradients and photos: either is painted once and costs nothing while things move.
const glow = (c, x = "28%") => `radial-gradient(70% 55% at ${x} 0%, ${c}, transparent 72%)`;

export const WALLPAPERS = [
  { id: "homedeck", tone: "#114556", name: "Alvuna", sub: "Morski, domyślny",
    bg: `${glow("rgba(44,140,152,.45)")}, radial-gradient(45% 40% at 95% 0%, rgba(56,170,180,.14), transparent 70%), linear-gradient(180deg, #165566 0%, #114556 32%, #0B2633 70%, #081A24 100%)`, base: "#081A24" },
  { id: "glebia", tone: "#13284F", name: "Głębia", sub: "Ciemny błękit",
    bg: `${glow("rgba(64,120,220,.38)")}, linear-gradient(180deg, #1A3566 0%, #13284F 32%, #0A1630 70%, #060D1F 100%)`, base: "#060D1F" },
  { id: "noc", tone: "#1A1640", name: "Noc", sub: "Granat z fioletem",
    bg: `${glow("rgba(130,96,220,.34)", "70%")}, linear-gradient(180deg, #25204F 0%, #1A1640 32%, #0F0D28 70%, #08071A 100%)`, base: "#08071A" },
  { id: "zorza", tone: "#0C1E2E", name: "Zorza", sub: "Zieleń i fiolet na granacie",
    bg: `radial-gradient(60% 50% at 20% 0%, rgba(60,200,150,.34), transparent 70%), radial-gradient(50% 45% at 85% 5%, rgba(150,90,220,.30), transparent 70%), linear-gradient(180deg, #102A3A 0%, #0C1E2E 40%, #08131F 75%, #050C14 100%)`, base: "#050C14" },
  { id: "las", tone: "#173B2A", name: "Las", sub: "Głęboka zieleń",
    bg: `${glow("rgba(90,170,100,.32)")}, linear-gradient(180deg, #1F4A35 0%, #173B2A 32%, #0E241A 70%, #08150F 100%)`, base: "#08150F" },
  { id: "zachod", tone: "#3A1B2B", name: "Zachód", sub: "Ciepły, wieczorny",
    bg: `${glow("rgba(255,140,90,.30)", "35%")}, linear-gradient(180deg, #4E2634 0%, #3A1B2B 32%, #22101C 70%, #12090F 100%)`, base: "#12090F" },
  { id: "grafit", tone: "#23282C", name: "Grafit", sub: "Neutralny szary",
    bg: `${glow("rgba(255,255,255,.10)")}, linear-gradient(180deg, #2D3338 0%, #23282C 32%, #16191C 70%, #0D0F11 100%)`, base: "#0D0F11" },
  { id: "czern", tone: "#101010", name: "Czerń", sub: "Prawdziwa czerń OLED",
    bg: "#000", base: "#000" },
];

// `tone`: the wallpaper's colour (for photos, their average weighted by saturation, measured once), which the side
// panels and the dimming behind them take on (see applyWallpaper).
// Photos (WebP 1920×1080 plus 480×270 thumbs and frost copies). A shade over each keeps the
// tiles and text readable: lighter at the top (the clock and the weather), darker towards the rows below.
const PHOTO_V = 1; // bump when a photo file changes: HA serves /local with a 31-day cache
// Photos are not part of Alvuna's package: a home that wants them puts them in HA's www/alvuna/wallpapers.
const PHOTOS = "/local/alvuna/wallpapers";
const shade = "linear-gradient(180deg, rgba(4,12,18,.30) 0%, rgba(4,12,18,.50) 40%, rgba(4,12,18,.78) 100%)";
const photo = (id, tone, name, sub, base = "#05090D") => ({ id: `foto-${id}`, tone, name, sub, photo: true, base,
  // The blurred copy frosted glass shows (frost.js draws it with a lighter shade, so the photo shows through).
  frostImg: `${PHOTOS}/frost/${id}.webp?v=${PHOTO_V}`,
  bg: `${shade}, url(${PHOTOS}/${id}.webp?v=${PHOTO_V}) center/cover no-repeat`,
  preview: `${shade}, url(${PHOTOS}/thumbs/${id}.webp?v=${PHOTO_V}) center/cover no-repeat` });
WALLPAPERS.push(
  photo("zorza", "#356758", "Zorza polarna", "Zielone światła nad jeziorem"),
  photo("las", "#4e534c", "Mglisty las", "Sosny we mgle"),
  photo("morze", "#1a2a2f", "Księżyc nad morzem", "Nocne morze"),
  photo("gory", "#1a5992", "Góry o zmierzchu", "Niebieskie grzbiety"),
  photo("gwiazdy", "#242135", "Droga Mleczna", "Nocne niebo nad górami"),
  photo("baltyk", "#a0654a", "Zachód nad morzem", "Ciepłe światło nad wodą"),
  photo("miasto", "#4a3514", "Światła miasta", "Rozmyte światła nocą"),
  photo("snieg", "#0e1c25", "Zimowa noc", "Ośnieżony szczyt i gwiazdy"),
  photo("fale", "#0c2624", "Turkusowe fale", "Abstrakcja w kolorach Alvuna"),
  photo("mgla", "#4d5351", "Mgła nad jeziorem", "Brzeg o świcie"),
);

const KEY = "homedeck-wallpaper";
export function currentWallpaper() {
  let id = "";
  try { id = localStorage.getItem(KEY) || ""; } catch (e) { /* storage blocked */ }
  return WALLPAPERS.find((w) => w.id === id) || WALLPAPERS[0];
}
export function setWallpaper(id) {
  try { localStorage.setItem(KEY, id); } catch (e) { /* storage blocked: this session only */ }
  applyWallpaper();
}
export function applyWallpaper() {
  const w = currentWallpaper(), root = document.documentElement;
  document.body.style.background = w.bg;
  root.style.background = w.base;
  // Side panels in the wallpaper's hue: the sheet as dark as Alvuna's own (#0F3341), the dimming behind it darker.
  const [h, sat] = hsl(w.tone || "#114556");
  root.style.setProperty("--sheet-bg", `hsl(${h} ${Math.round(Math.min(sat, .58) * 100)}% 15%)`);
  root.style.setProperty("--dim", `hsl(${h} ${Math.round(Math.min(sat, .6) * 100)}% 5% / .8)`);
}

function hsl(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [Math.round((h * 60 + 360) % 360), s, l];
}
