// Several Home Assistant servers ("instances") on one TV. The TV shell hands its list to
// a sign-in page on each server, which keeps it in this origin's storage as "homedeck-instances":
//   [{ id, name, url, dashboard, token? }]
// Switching goes to the other server's homedeck-tv.html with that server's token, so nothing is typed on the TV.
// Without a token (a browser already signed in there) the server keeps its own session.
const KEY = "homedeck-instances", LAST = "homedeck-last";

export function loadInstances() {
  try { const list = JSON.parse(localStorage.getItem(KEY)); return Array.isArray(list) ? list : []; } catch (e) { return []; }
}

export function currentInstance(list, dashboard) {
  return list.find((x) => sameOrigin(x.url)) || { id: "here", name: location.hostname, url: location.origin, dashboard };
}

const sameOrigin = (url) => { try { return new URL(url).origin === location.origin; } catch (e) { return false; } };

export function appPath(inst) {
  return `/alvuna/tv/?${new URLSearchParams({ dashboard: inst.dashboard || "", t: Date.now() })}`;
}

// Resolves false when the server does not answer within 4 s (switching then stays on this one).
export async function reachable(inst) {
  const base = inst.url.replace(/\/$/, "");
  // From an https server (Funnel) the browser blocks any fetch to an http one, so the check would always fail; going
  // there is still allowed, so the switch goes ahead without it.
  if (location.protocol === "https:" && base.startsWith("http:")) return true;
  try {
    await Promise.race([fetch(`${base}/manifest.json`, { mode: "no-cors", cache: "no-store" }),
      new Promise((_, no) => setTimeout(() => no(new Error("timeout")), 4000))]);
    return true;
  } catch (e) { return false; }
}

export function switchTo(inst, list) {
  // The shell always starts at the first server; that server's sign-in page forwards to the one picked last.
  try { localStorage.setItem(LAST, inst.id); } catch (e) { /* storage blocked */ }
  const base = inst.url.replace(/\/$/, "");
  // Through the sign-in page even without a token: it also hands the list over, so the switcher is there too.
  location.href = `${base}/local/homedeck-tv.html?t=${Date.now()}#${new URLSearchParams({ token: inst.token || "",
    instances: JSON.stringify(list), go: appPath(inst) })}`;
}
