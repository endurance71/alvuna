// Updates `from` in place to match `to` (from the tablet card, src/card/alvuna-card.js), so unchanged nodes keep
// their images, icons and running transitions. `data-keep` elements are driven from script: only their data-* follow.
// Classes set by the focus engine (focused item, rows above the focus); the markup never carries them.
const KEEP_CLASS = ["f", "above"];

// A frosted-glass layer (.fzw, added by frost.js) is not part of the markup: it is left where it is.
const own = (n) => n.nodeType === 1 && n.classList.contains("fzw");

export function morph(from, to) {
  const a = [...from.childNodes].filter((n) => !own(n)), b = [...to.childNodes];
  b.forEach((nb, i) => {
    const na = a[i];
    if (!na) { from.appendChild(nb); return; }
    if (na.nodeType !== nb.nodeType || na.nodeName !== nb.nodeName) { from.replaceChild(nb, na); return; }
    if (na.nodeType !== 1) { if (na.nodeValue !== nb.nodeValue) na.nodeValue = nb.nodeValue; return; }
    if (nb.hasAttribute("data-keep")) {
      for (const { name, value } of [...nb.attributes]) if (name.startsWith("data-") && na.getAttribute(name) !== value) na.setAttribute(name, value);
      return;
    }
    // State the focus engine keeps on the page survives a redraw: where a scrolled page, panel list or row track
    // stands (its inline transform) and the focus classes. Without this, a state change while a panel is open
    // (a light toggled from it) reset the home page under the panel to the top.
    const scrolls = na.hasAttribute("data-scroll") || na.hasAttribute("data-track");
    for (const { name } of [...na.attributes]) if (!nb.hasAttribute(name) && !(name === "style" && scrolls) && name !== "class") na.removeAttribute(name);
    for (const { name, value } of [...nb.attributes]) {
      let v = value;
      if (name === "class") { const keep = KEEP_CLASS.filter((c) => na.classList.contains(c)); if (keep.length) v = `${value} ${keep.join(" ")}`; }
      if (na.getAttribute(name) !== v) na.setAttribute(name, v);
    }
    if (!nb.hasAttribute("class") && na.hasAttribute("class")) {
      const keep = KEEP_CLASS.filter((c) => na.classList.contains(c));
      if (keep.length) na.setAttribute("class", keep.join(" ")); else na.removeAttribute("class");
    }
    // An icon draws its own SVG inside; the markup never has children for it.
    if (na.tagName !== "HD-ICON") morph(na, nb);
  });
  for (let i = a.length - 1; i >= b.length; i--) from.removeChild(a[i]);
}

export function patch(host, html) {
  if (host._html === html) return false;
  host._html = html;
  const tpl = document.createElement("template");
  tpl.innerHTML = html;
  morph(host, tpl.content);
  return true;
}
