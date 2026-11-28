// Drag to reorder, for the TVs tab's layout editor: tiles along a row and rows down the screen. Pointer events, so a
// mouse and a finger both work: a mouse drags an item from anywhere on it (or its handle, data-sort-handle), a finger
// only from its grip ([data-grip]), so that swiping a row of tiles still scrolls it.
//
// A list is an element with data-sort-list="x" (horizontal) or "y"; its children are items with data-sort-item="<id>".
// While dragging, the item follows the pointer and the list is reordered live (the others glide to their new places);
// on release onDrop(list, ids) gets the new order. onStart() is called when a drag begins (the panel then holds off
// re-rendering, which would replace the elements being dragged).
export function sortable(root, { onStart, onDrop }) {
  let d = null;

  const items = (list) => [...list.children].filter((x) => x.hasAttribute("data-sort-item"));

  root.addEventListener("pointerdown", (e) => {
    const item = e.target.closest?.("[data-sort-item]");
    if (!item || e.button !== 0 || !item.parentElement?.dataset.sortList) return;
    const grip = e.target.closest("[data-grip]");
    if (!grip && e.target.closest("button, input, select, a, summary")) return;
    if (e.pointerType !== "mouse" && !grip) return;
    if (item.dataset.sortHandle && !grip && !e.target.closest(item.dataset.sortHandle)) return;
    d = { item, list: item.parentElement, pid: e.pointerId, x0: e.clientX, y0: e.clientY, ox: 0, oy: 0, started: false,
      scroll: item.parentElement.scrollLeft };
  });

  root.addEventListener("pointermove", (e) => {
    if (!d || e.pointerId !== d.pid) return;
    const horiz = d.list.dataset.sortList === "x";
    const dx = e.clientX - d.x0, dy = e.clientY - d.y0;
    if (!d.started) {
      if (Math.hypot(dx, dy) < 6) return;
      d.started = true;
      try { d.item.setPointerCapture(e.pointerId); } catch { /* released already */ }
      d.item.classList.add("dragging");
      d.list.classList.add("sorting");
      onStart?.();
    }
    e.preventDefault();
    // A long row scrolls by itself near its ends; the dragged tile stays under the pointer.
    if (horiz) {
      const lr = d.list.getBoundingClientRect();
      if (e.clientX > lr.right - 48) d.list.scrollLeft += 14;
      else if (e.clientX < lr.left + 48) d.list.scrollLeft -= 14;
      d.ox -= d.list.scrollLeft - d.scroll;
      d.scroll = d.list.scrollLeft;
    }
    const place = () => { d.item.style.transform = horiz ? `translate(${dx - d.ox}px, 0)` : `translate(0, ${dy - d.oy}px)`; };
    place();
    // It goes before the first other item whose middle is past the pointer.
    const others = items(d.list).filter((x) => x !== d.item), p = horiz ? e.clientX : e.clientY;
    const before = others.find((s) => { const r = s.getBoundingClientRect(); return p < (horiz ? r.left + r.width / 2 : r.top + r.height / 2); }) || null;
    if (before === d.item.nextElementSibling || (!before && d.item === items(d.list).at(-1))) return;
    const was = new Map(others.map((s) => [s, s.getBoundingClientRect()]));
    const r0 = d.item.getBoundingClientRect();
    d.list.insertBefore(d.item, before);
    const r1 = d.item.getBoundingClientRect();
    d.ox += r1.left - r0.left;
    d.oy += r1.top - r0.top;
    place();
    for (const s of others) {
      const a = was.get(s), b = s.getBoundingClientRect();
      if (a.left !== b.left || a.top !== b.top) {
        s.animate([{ transform: `translate(${a.left - b.left}px, ${a.top - b.top}px)` }, { transform: "none" }],
          { duration: 200, easing: "cubic-bezier(.22, 1, .36, 1)" });
      }
    }
  });

  const end = (e) => {
    if (!d || e.pointerId !== d.pid) return;
    const was = d;
    d = null;
    if (!was.started) return;
    was.item.classList.remove("dragging");
    was.item.style.transform = "";
    was.list.classList.remove("sorting");
    // The click that ends a drag is not a click on what lies under it.
    const swallow = (ev) => { ev.stopPropagation(); ev.preventDefault(); };
    root.addEventListener("click", swallow, { capture: true, once: true });
    setTimeout(() => root.removeEventListener("click", swallow, { capture: true }), 0);
    onDrop(was.list, items(was.list).map((x) => x.dataset.sortItem), e.type === "pointercancel");
  };
  root.addEventListener("pointerup", end);
  root.addEventListener("pointercancel", end);
}
