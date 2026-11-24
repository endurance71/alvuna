// Finds Home Assistant on the local network, in this order:
//   1. mDNS: a PTR query for _home-assistant._tcp.local (Home Assistant's zeroconf announces itself there);
//   2. homeassistant.local (an mDNS A query, then the system resolver);
//   3. a TCP scan of port 8123 on the TV's own /24, each open port then checked over HTTP.
// Every candidate is checked over HTTP: /manifest.json must be Home Assistant's, and /alvuna/tv/ tells whether the
// Alvuna integration is installed. Nothing leaves the local network and nothing is stored here.
//
// Plain Node (no dependencies), written for the oldest Node a webOS TV ships (8.12 on webOS 5/6), so no fetch, no
// optional chaining. Also runs on a Mac for testing: node discovery.js [scan|probe <url>]
"use strict";

const dgram = require("dgram");
const dns = require("dns");
const http = require("http");
const https = require("https");
const net = require("net");
const os = require("os");

const MDNS_ADDR = "224.0.0.251";
const MDNS_PORT = 5353;
const SERVICE = "_home-assistant._tcp.local";
const HA_HOST = "homeassistant.local";
const HA_PORT = 8123;
const T_PTR = 12, T_TXT = 16, T_SRV = 33, T_A = 1;

// --- DNS packets ---------------------------------------------------------------------------------
function encodeName(name) {
  const parts = name.split(".").filter(Boolean), bufs = [];
  parts.forEach((p) => { const b = Buffer.from(p, "utf8"); bufs.push(Buffer.from([b.length]), b); });
  bufs.push(Buffer.from([0]));
  return Buffer.concat(bufs);
}

function query(questions) {
  const head = Buffer.alloc(12);
  head.writeUInt16BE(questions.length, 4);
  const qs = questions.map((q) => {
    const tail = Buffer.alloc(4);
    tail.writeUInt16BE(q.type, 0);
    tail.writeUInt16BE(0x8001, 2); // class IN with the "unicast response" bit: answer us directly
    return Buffer.concat([encodeName(q.name), tail]);
  });
  return Buffer.concat([head].concat(qs));
}

function readName(buf, off) {
  const labels = [];
  let jumped = false, end = off, guard = 0;
  while (guard++ < 128) {
    if (off >= buf.length) throw new Error("bad name");
    const len = buf[off];
    if (len === 0) { if (!jumped) end = off + 1; break; }
    if ((len & 0xc0) === 0xc0) {
      if (!jumped) end = off + 2;
      off = ((len & 0x3f) << 8) | buf[off + 1];
      jumped = true;
      continue;
    }
    labels.push(buf.toString("utf8", off + 1, off + 1 + len));
    off += 1 + len;
  }
  return { name: labels.join("."), end: end };
}

// Every record of a response (answers and additionals alike), as { name, type, data }.
function parse(buf) {
  const out = [];
  const qd = buf.readUInt16BE(4), rr = buf.readUInt16BE(6) + buf.readUInt16BE(8) + buf.readUInt16BE(10);
  let off = 12;
  for (let i = 0; i < qd; i++) off = readName(buf, off).end + 4;
  for (let i = 0; i < rr; i++) {
    const n = readName(buf, off);
    off = n.end;
    const type = buf.readUInt16BE(off), len = buf.readUInt16BE(off + 8), at = off + 10;
    off = at + len;
    let data = null;
    if (type === T_A && len === 4) data = buf[at] + "." + buf[at + 1] + "." + buf[at + 2] + "." + buf[at + 3];
    else if (type === T_PTR) data = readName(buf, at).name;
    else if (type === T_SRV) data = { port: buf.readUInt16BE(at + 4), target: readName(buf, at + 6).name };
    else if (type === T_TXT) {
      data = {};
      for (let p = at; p < at + len;) {
        const l = buf[p], s = buf.toString("utf8", p + 1, p + 1 + l), eq = s.indexOf("=");
        if (eq > 0) data[s.slice(0, eq).toLowerCase()] = s.slice(eq + 1);
        p += 1 + l;
      }
    }
    if (data !== null) out.push({ name: n.name.toLowerCase(), type: type, data: data });
  }
  return out;
}

// Asks once (and again after 400 ms, multicast is lossy) and collects every record heard for `ms`. Answers come back
// to our own port (the unicast bit, and "legacy unicast" for a query not sent from 5353); a second socket on 5353 also
// hears multicast answers, when the TV lets an app share that port.
function mdnsAsk(questions, ms) {
  return new Promise((resolve) => {
    const records = [], sockets = [], packet = query(questions);
    const take = (msg) => { try { Array.prototype.push.apply(records, parse(msg)); } catch (e) { /* not ours */ } };
    const open = (port) => {
      const s = dgram.createSocket({ type: "udp4", reuseAddr: true });
      s.on("error", () => { try { s.close(); } catch (e) { /* closed */ } });
      s.on("message", take);
      s.bind(port, () => {
        try { s.addMembership(MDNS_ADDR); } catch (e) { /* not on this socket */ }
        if (port === 0) {
          const send = () => s.send(packet, 0, packet.length, MDNS_PORT, MDNS_ADDR, () => {});
          send();
          setTimeout(send, 400);
        }
      });
      sockets.push(s);
    };
    try { open(0); } catch (e) { /* no UDP */ }
    try { open(MDNS_PORT); } catch (e) { /* port taken */ }
    setTimeout(() => {
      sockets.forEach((s) => { try { s.close(); } catch (e) { /* closed */ } });
      resolve(records);
    }, ms);
  });
}

// Home Assistant instances announced over mDNS: [{ name, uuid, version, url }], url built from the A record and SRV
// port (an IP works on any TV; internal_url may name a host the TV cannot resolve).
function mdnsServers(records) {
  const byName = (name, type) => records.filter((r) => r.name === name && r.type === type);
  const instances = {};
  records.filter((r) => r.type === T_PTR && r.name === SERVICE).forEach((r) => { instances[r.data.toLowerCase()] = true; });
  const out = [];
  Object.keys(instances).forEach((inst) => {
    const srv = byName(inst, T_SRV)[0], txt = (byName(inst, T_TXT)[0] || {}).data || {};
    const urls = [];
    if (srv) {
      byName(srv.data.target.toLowerCase(), T_A).forEach((a) => urls.push("http://" + a.data + ":" + srv.data.port));
    }
    [txt.internal_url, txt.base_url].forEach((u) => { if (u && /^https?:\/\//.test(u)) urls.push(u.replace(/\/+$/, "")); });
    if (urls.length) {
      out.push({ name: txt.location_name || inst.replace("." + SERVICE, ""), uuid: txt.uuid || "", version: txt.version || "", urls: urls });
    }
  });
  return out;
}

// --- HTTP checks ---------------------------------------------------------------------------------
function get(url, ms) {
  return new Promise((resolve) => {
    let done = false;
    const end = (v) => { if (!done) { done = true; resolve(v); } };
    let req;
    try {
      req = (url.indexOf("https:") === 0 ? https : http).get(url, { headers: { Accept: "*/*" } }, (res) => {
        const chunks = [];
        let size = 0;
        res.on("data", (c) => { size += c.length; if (size < 65536) chunks.push(c); });
        res.on("end", () => end({ status: res.statusCode, body: Buffer.concat(chunks).toString("utf8") }));
        res.on("error", () => end(null));
      });
    } catch (e) { return end(null); }
    req.on("error", () => end(null));
    req.setTimeout(ms, () => { req.abort(); end(null); });
  });
}

// { url, ha, alvuna } for one base URL; ha is false when nothing answers or it is not Home Assistant.
function probe(base, ms) {
  base = normalize(base);
  if (!base) return Promise.resolve({ url: "", ha: false, alvuna: false });
  ms = ms || 3000;
  return get(base + "/manifest.json", ms).then((res) => {
    let ha = false;
    if (res && res.status === 200) {
      try { ha = /home assistant/i.test(JSON.parse(res.body).name || ""); } catch (e) { ha = false; }
    }
    if (!ha) return { url: base, ha: false, alvuna: false };
    return get(base + "/alvuna/tv/", ms).then((tv) => ({ url: base, ha: true, alvuna: !!tv && tv.status === 200 }));
  });
}

// "192.168.1.5" becomes that host over http on port 8123; a scheme or port the user gave is kept.
function normalize(input) {
  let s = String(input || "").trim().replace(/\/+$/, "");
  if (!s) return "";
  if (!/^https?:\/\//i.test(s)) s = "http://" + s;
  const m = /^(https?):\/\/([^/:?#]+)(:\d+)?(\/.*)?$/i.exec(s);
  if (!m) return "";
  const port = m[3] || (m[1].toLowerCase() === "http" ? ":" + HA_PORT : "");
  return m[1].toLowerCase() + "://" + m[2].toLowerCase() + port + (m[4] || "");
}

// --- subnet scan ---------------------------------------------------------------------------------
function localNets() {
  const out = [], ifs = os.networkInterfaces();
  Object.keys(ifs).forEach((k) => (ifs[k] || []).forEach((a) => {
    if ((a.family === "IPv4" || a.family === 4) && !a.internal && !/^169\.254\./.test(a.address)) {
      out.push({ address: a.address, prefix: a.address.split(".").slice(0, 3).join(".") });
    }
  }));
  return out;
}

function portOpen(host, port, ms) {
  return new Promise((resolve) => {
    const s = net.connect({ host: host, port: port });
    let done = false;
    const end = (v) => { if (!done) { done = true; s.destroy(); resolve(v); } };
    s.setTimeout(ms, () => end(false));
    s.on("connect", () => end(true));
    s.on("error", () => end(false));
  });
}

// The /24 around each of the TV's own addresses (a bigger subnet would take minutes), 64 connections at a time.
function scan(ms) {
  const hosts = [];
  localNets().forEach((n) => { for (let i = 1; i < 255; i++) { const h = n.prefix + "." + i; if (h !== n.address) hosts.push(h); } });
  const open = [];
  let next = 0;
  const worker = () => {
    if (next >= hosts.length) return Promise.resolve();
    const h = hosts[next++];
    return portOpen(h, HA_PORT, ms || 700).then((ok) => { if (ok) open.push(h); return worker(); });
  };
  const workers = [];
  for (let i = 0; i < 64; i++) workers.push(worker());
  return Promise.all(workers).then(() => open.sort((a, b) => num(a) - num(b)));
}
const num = (ip) => ip.split(".").reduce((n, x) => n * 256 + Number(x), 0);

function lookup(host, ms) {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(null), ms);
    dns.lookup(host, { family: 4 }, (err, addr) => { clearTimeout(t); resolve(err ? null : addr); });
  });
}

// --- the whole search ----------------------------------------------------------------------------
// progress(stage) is called with "mdns", "local" and "scan" as each step starts. Resolves
// { method, servers: [{ name, uuid, version, url, alvuna }] }, method naming the step that found them ("" if none).
function discover(progress) {
  const note = (s) => { try { if (progress) progress(s); } catch (e) { /* listener gone */ } };
  const check = (cands) => Promise.all(cands.map((c) => firstHa(c.urls).then((r) => (r ? {
    name: c.name, uuid: c.uuid || "", version: c.version || "", url: r.url, alvuna: r.alvuna } : null))))
    .then((list) => dedupe(list.filter(Boolean)));

  note("mdns");
  return mdnsAsk([{ name: SERVICE, type: T_PTR }, { name: HA_HOST, type: T_A }], 1600).then((records) => {
    return check(mdnsServers(records)).then((servers) => {
      if (servers.length) return { method: "mdns", servers: servers };
      note("local");
      const a = records.filter((r) => r.type === T_A && r.name === HA_HOST).map((r) => r.data)[0];
      return (a ? Promise.resolve(a) : lookup(HA_HOST, 2500)).then((ip) => {
        const urls = (ip ? ["http://" + ip + ":" + HA_PORT] : []).concat(["http://" + HA_HOST + ":" + HA_PORT]);
        return check([{ name: HA_HOST, urls: urls }]);
      }).then((found) => {
        if (found.length) return { method: "local", servers: found };
        note("scan");
        return scan(600).then((ips) => check(ips.map((ip) => ({ name: ip, urls: ["http://" + ip + ":" + HA_PORT] }))))
          .then((list) => ({ method: list.length ? "scan" : "", servers: list }));
      });
    });
  });
}

// The first of urls that is Home Assistant, preferring one where Alvuna answers.
function firstHa(urls) {
  return Promise.all(urls.map((u) => probe(u, 3000))).then((rs) => {
    const ha = rs.filter((r) => r.ha);
    return ha.filter((r) => r.alvuna)[0] || ha[0] || null;
  });
}

function dedupe(list) {
  const seen = {};
  return list.filter((s) => { const k = s.uuid || s.url; if (seen[k]) return false; seen[k] = true; return true; });
}

module.exports = { discover: discover, probe: probe, normalize: normalize, scan: scan, mdnsAsk: mdnsAsk, parse: parse,
  mdnsServers: mdnsServers };

if (require.main === module) {
  const cmd = process.argv[2] || "discover", t0 = Date.now();
  const show = (x) => console.log(JSON.stringify(x, null, 2), "\n" + (Date.now() - t0) + " ms");
  if (cmd === "probe") probe(process.argv[3]).then(show);
  else if (cmd === "scan") scan(600).then(show);
  else discover((s) => console.log("stage:", s)).then(show);
}
