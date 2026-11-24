// Frosted glass that stays put while the tiles move, at no repaint cost.
//
// A live backdrop-filter dropped ~80% of the frames on the LG C4 (every moving tile re-blurs what is behind it, every
// frame). Painting a blurred copy of the wallpaper into each tile's background was cheap at rest but wrong in motion:
// the glass travelled with its tile and jumped into place afterwards, and moving it repainted every tile.
//
// So each glass surface holds one small <canvas> (480×270, the blurred wallpaper; ~0.5 MB of GPU memory) shown at
// screen size and clipped by the tile's rounded corners. The GPU scales that texture; nothing is rasterised. The
// canvas is translated so its origin sits at the screen's origin, and when the page or a row slides, it slides the
// other way with the same curve and duration, started in the same frame: on screen the glass does not move at all.
import { currentWallpaper } from "./wallpapers.js";
import { animOn } from "./prefs.js";

const SEL = "#home .tile:not(.on):not(.cam):not(.alert), #home .td-card, #home .instance, #edge .edge";
const W = 480, H = 270;
let master = null, masterFor = "";

// The blurred wallpaper once, at 480×270, as Apple's glass shows it: the colours behind come through, toned down and
// under a white veil, so the tile reads as a lighter pane of frosted glass over the wallpaper (not a darker hole, and
// not a neon slab either: full brightness and extra saturation made blue wallpapers glow). Done once per wallpaper.
const GLASS = { saturate: 1.0, brightness: .75, veilTop: .20, veilBottom: .14, floor: 0 };
function glaze(x) {
  const v = x.createLinearGradient(0, 0, 0, H);
  v.addColorStop(0, `rgba(255,255,255,${GLASS.veilTop})`); v.addColorStop(1, `rgba(255,255,255,${GLASS.veilBottom})`);
  x.fillStyle = v; x.fillRect(0, 0, W, H);
  // A faint dark floor keeps white text readable where the wallpaper is bright (a sunset, snow).
  x.fillStyle = `rgba(4,12,18,${GLASS.floor})`; x.fillRect(0, 0, W, H);
}
async function buildMaster(w) {
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const x = c.getContext("2d");
  const im = new Image();
  if (w.photo) im.src = w.frostImg;
  else {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><foreignObject width="100%" height="100%">
      <div xmlns="http://www.w3.org/1999/xhtml" style="width:1920px;height:1080px;background:${w.bg.replace(/"/g, "'")}"></div></foreignObject></svg>`;
    im.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }
  await im.decode();
  x.filter = `saturate(${GLASS.saturate}) brightness(${GLASS.brightness})`;
  x.drawImage(im, 0, 0, W, H);
  x.filter = "none";
  glaze(x);
  return c;
}

function paint(canvas) {
  if (!master) return;
  const x = canvas.getContext("2d");
  x.clearRect(0, 0, W, H);
  x.drawImage(master, 0, 0);
  canvas._for = masterFor;
}

// The wallpaper changed (or the app started): a new master, every glass repainted from it.
// GLASS tuning from the console: window.__glass({ brightness: 1.4 }) rebuilds every pane.
window.__glass = (o) => { Object.assign(GLASS, o); masterFor = ""; return refreshFrost(); };
export async function refreshFrost() {
  const w = currentWallpaper();
  if (masterFor === w.id && master) return;
  try { master = await buildMaster(w); masterFor = w.id; } catch (e) { master = null; masterFor = ""; }
  for (const c of document.querySelectorAll(".fzw canvas")) paint(c);
}

const shift = (el) => {
  const m = /translate([XY])\((-?[\d.]+)px\)/.exec(el.style.transform || "");
  return m ? (m[1] === "X" ? [Number(m[2]), 0] : [0, Number(m[2])]) : [0, 0];
};

// Gives every glass surface its canvas and puts each canvas where the screen's origin will be once the moves the
// focus engine has just started are over (layout position plus the transforms' targets). Called right after those
// transforms are set, in the same frame, so the counter-move runs alongside them.
export function alignFrost() {
  const on = document.body.classList.contains("frost");
  if (!on) { for (const z of document.querySelectorAll(".fzw")) z.remove(); return; }
  const body = document.body, els = [...document.querySelectorAll(SEL)], jobs = [];
  for (const el of els) {
    let x = 0, y = 0;
    for (let n = el; n && n !== body; n = n.offsetParent) { x += n.offsetLeft; y += n.offsetTop; }
    for (let n = el.parentElement; n && n !== body; n = n.parentElement) {
      if (n.hasAttribute("data-track") || n.hasAttribute("data-scroll")) { const [dx, dy] = shift(n); x += dx; y += dy; }
    }
    jobs.push([el, Math.round(x), Math.round(y)]);
  }
  const anim = animOn();
  for (const [el, x, y] of jobs) {
    // Only glass on screen (or coming onto it) is kept: each one is a layer the TV composites every frame.
    const near = y > -420 && y < 1500 && x > -500 && x < 2420;
    const old = el.firstElementChild?.classList.contains("fzw") ? el.firstElementChild : null;
    if (!near && !(old && old.firstChild._y > -420 && old.firstChild._y < 1500)) { if (old) old.remove(); continue; }
    let z = el.firstElementChild?.classList.contains("fzw") ? el.firstElementChild : null, fresh = false;
    if (!z) {
      z = document.createElement("i");
      z.className = "fzw";
      z.innerHTML = `<canvas width="${W}" height="${H}"></canvas>`;
      el.prepend(z);
      fresh = true;
    }
    const c = z.firstChild;
    if (c._for !== masterFor) paint(c);
    if (c._x === x && c._y === y) continue;
    // A new canvas starts in place; one that exists slides with the move (its transition is in the CSS).
    if (fresh || !anim) c.style.transition = "none";
    c.style.transform = `translate(${-x}px, ${-y}px)`;
    c._x = x; c._y = y;
    if (fresh || !anim) { c.offsetWidth; c.style.transition = ""; }
  }
}
