// The app's JS service (luna://app.alvuna.tv.service). The web app cannot reach mDNS or read answers from other
// origins, so the search for Home Assistant (discovery.js) runs here, in Node.
//   discover  {subscribe: true}  → {stage: "mdns"|"local"|"scan"} while searching, then {done: true, method, servers}
//   probe     {url}              → {url, ha, alvuna} for an address typed with the remote
"use strict";

const Service = require("webos-service");
const discovery = require("./discovery");

const service = new Service("app.alvuna.tv.service");

// Keeps the service alive while a search runs (the system stops an idle service after a few seconds).
function keepAlive(name, work) {
  const am = service.activityManager;
  if (!am || !am.create) return work();
  let activity = null;
  am.create(name, (a) => { activity = a; });
  return work().then((v) => { if (activity) am.complete(activity, () => {}); return v; },
    (e) => { if (activity) am.complete(activity, () => {}); throw e; });
}

service.register("discover", (message) => {
  const sub = !!message.isSubscription;
  keepAlive("alvuna-discover", () => discovery.discover((stage) => {
    if (sub) message.respond({ returnValue: true, stage: stage });
  })).then((res) => {
    message.respond({ returnValue: true, done: true, method: res.method, servers: res.servers });
    if (sub) message.cancel && message.cancel({});
  }, (e) => {
    message.respond({ returnValue: false, errorText: String((e && e.message) || e) });
  });
});

service.register("probe", (message) => {
  const url = (message.payload && message.payload.url) || "";
  keepAlive("alvuna-probe", () => discovery.probe(url, 4000)).then((r) => {
    message.respond({ returnValue: true, url: r.url, ha: r.ha, alvuna: r.alvuna });
  }, (e) => {
    message.respond({ returnValue: false, errorText: String((e && e.message) || e) });
  });
});
