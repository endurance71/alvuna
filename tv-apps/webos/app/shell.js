// Alvuna for LG webOS: a thin shell. It holds no token and no server list. It finds Home Assistant on the local
// network, remembers the one picked, and opens http://<home-assistant>/alvuna/tv/, the TV app served by the Alvuna
// integration. That page pairs itself (it shows a code, an admin approves it under Discovered in Home Assistant).
//
// The search runs in the app's JS service (luna://app.alvuna.tv.service, ../service): a web app gets no mDNS and
// cannot read answers from another origin. Without the service (a desktop browser) the shell falls back to checking
// homeassistant.local:8123 with an image, and to an address typed with the remote.
//
// ES5 on purpose: this page has to show something sensible on any webOS TV, even one too old for the TV app itself.
(function () {
  "use strict";

  var SERVICE = "luna://app.alvuna.tv.service/";
  var KEY = "alvuna-server"; // { url, name, uuid } of the server picked last
  var RETRY_MS = 15000;
  // A sample home to try Alvuna without Home Assistant: the website's demo (the real TV app with made-up devices), in
  // TV mode, where Back on its first row returns here. Opened from "not found" and "Alvuna is not installed".
  var DEMO = "https://alvuna.shipapp.pl/app/";
  var box = document.getElementById("box");
  var webos = !!window.PalmSystem || /Web0S|webOS/i.test(navigator.userAgent);
  var bridges = []; // a PalmServiceBridge that is garbage-collected cancels its call
  var screen = null, focusIdx = 0, timer = 0, cancelled = false, kbVisible = false;

  // --- text ---------------------------------------------------------------------------------------
  var PL = /^pl/i.test(navigator.language || "");
  var T = PL ? {
    searching: "Szukam Home Assistanta w sieci…",
    stage_mdns: "Nasłuchuję ogłoszeń w sieci (mDNS)",
    stage_local: "Sprawdzam homeassistant.local",
    stage_scan: "Przeszukuję sieć lokalną (port 8123)",
    found_many: "Znalazłem kilka serwerów",
    pick: "Wybierz dom, który ma się otwierać na tym telewizorze.",
    found: "Znalazłem: ",
    none_title: "Nie znalazłem Home Assistanta",
    none_text: "Telewizor i Home Assistant muszą być w tej samej sieci. Możesz też wpisać adres pilotem.",
    again: "Szukaj ponownie",
    manual: "Wpisz adres",
    manual_title: "Adres Home Assistanta",
    manual_text: "Na przykład 192.168.1.20 albo 192.168.1.20:8123",
    connect: "Połącz",
    back: "Wróć",
    checking: "Sprawdzam…",
    not_ha: "Pod tym adresem nie odpowiada Home Assistant.",
    no_alvuna_title: "Brakuje integracji Alvuna",
    no_alvuna_text: "Home Assistant {name} działa, ale nie ma w nim Alvuny. Zainstaluj ją: Ustawienia → Marketplace → Alvuna, potem Ustawienia → Urządzenia i usługi → Dodaj integrację → Alvuna.",
    retry: "Spróbuj ponownie",
    other: "Inny serwer",
    connecting: "Łączę z: ",
    change: "Zmień serwer",
    lost_title: "Brak połączenia",
    lost_text: "{name} nie odpowiada. Ponawiam co 15 s.",
    alvuna_ok: "Alvuna gotowa",
    alvuna_missing: "bez integracji Alvuna",
    offline: "Telewizor nie jest połączony z siecią.",
    demo: "Wypróbuj przykładowy dom",
    demo_hint: "Bez Home Assistanta, z przykładowymi urządzeniami"
  } : {
    searching: "Looking for Home Assistant on your network…",
    stage_mdns: "Listening for network announcements (mDNS)",
    stage_local: "Trying homeassistant.local",
    stage_scan: "Scanning the local network (port 8123)",
    found_many: "Found more than one server",
    pick: "Pick the home this TV should open.",
    found: "Found: ",
    none_title: "Home Assistant not found",
    none_text: "The TV and Home Assistant must be on the same network. You can also enter the address with the remote.",
    again: "Search again",
    manual: "Enter address",
    manual_title: "Home Assistant address",
    manual_text: "For example 192.168.1.20 or 192.168.1.20:8123",
    connect: "Connect",
    back: "Back",
    checking: "Checking…",
    not_ha: "Home Assistant does not answer at this address.",
    no_alvuna_title: "Alvuna is not installed",
    no_alvuna_text: "Home Assistant {name} is running, but without Alvuna. Install it: Settings → Marketplace → Alvuna, then Settings → Devices & services → Add integration → Alvuna.",
    retry: "Try again",
    other: "Other server",
    connecting: "Connecting to ",
    change: "Change server",
    lost_title: "No connection",
    lost_text: "{name} does not answer. Retrying every 15 s.",
    alvuna_ok: "Alvuna ready",
    alvuna_missing: "without Alvuna",
    offline: "The TV is not connected to a network.",
    demo: "Try a sample home",
    demo_hint: "No Home Assistant needed, made-up devices"
  };
  document.documentElement.lang = PL ? "pl" : "en";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function fill(s, name) { return s.replace("{name}", "<b>" + esc(name) + "</b>"); }
  function host(url) { return String(url).replace(/^https?:\/\//, ""); }

  // --- storage ------------------------------------------------------------------------------------
  function saved() {
    try { var s = JSON.parse(localStorage.getItem(KEY)); return s && s.url ? s : null; } catch (e) { return null; }
  }
  function save(server) {
    try { localStorage.setItem(KEY, JSON.stringify({ url: server.url, name: server.name || "", uuid: server.uuid || "" })); } catch (e) { /* storage blocked */ }
  }

  // --- the service --------------------------------------------------------------------------------
  // onMsg gets each response; returns false when there is no service bridge (not on a TV).
  function luna(method, params, onMsg) {
    if (!window.PalmServiceBridge) return false;
    var b = new window.PalmServiceBridge();
    bridges.push(b);
    b.onservicecallback = function (s) {
      var m;
      try { m = JSON.parse(s); } catch (e) { m = { returnValue: false, errorText: "bad response" }; }
      onMsg(m);
    };
    b.call(SERVICE + method, JSON.stringify(params || {}));
    return true;
  }
  function release() { bridges.forEach(function (b) { try { b.cancel(); } catch (e) { /* gone */ } }); bridges = []; }

  // cb({ url, ha, alvuna }); alvuna is null when it could not be checked (no service).
  function probe(url, cb) {
    var done = false, end = function (r) { if (!done) { done = true; cb(r); } };
    var ok = luna("probe", { url: url }, function (m) {
      if (m.returnValue) end({ url: m.url, ha: m.ha, alvuna: m.alvuna });
      else imageProbe(url, end);
    });
    if (!ok) imageProbe(url, end);
  }

  // Without the service: an image only Home Assistant serves. It proves Home Assistant answers, not that Alvuna is there.
  function imageProbe(url, cb) {
    var base = normalize(url), img = new Image(), done = false;
    var end = function (ha) { if (!done) { done = true; img.onload = img.onerror = null; cb({ url: base, ha: ha, alvuna: ha ? null : false }); } };
    if (!base) return end(false);
    img.onload = function () { end(true); };
    img.onerror = function () { end(false); };
    setTimeout(function () { end(false); }, 4000);
    img.src = base + "/static/icons/favicon-192x192.png?t=" + Date.now();
  }

  function normalize(input) {
    var s = String(input || "").replace(/^\s+|\s+$/g, "").replace(/\/+$/, "");
    if (!s) return "";
    if (!/^https?:\/\//i.test(s)) s = "http://" + s;
    var m = /^(https?):\/\/([^\/:?#\s]+)(:\d+)?(\/.*)?$/i.exec(s);
    if (!m) return "";
    var port = m[3] || (m[1].toLowerCase() === "http" ? ":8123" : "");
    return m[1].toLowerCase() + "://" + m[2].toLowerCase() + port + (m[4] || "");
  }

  // onStage(stage) while searching; cb({ servers: [...] }).
  function discover(onStage, cb) {
    var done = false, end = function (r) { if (!done) { done = true; cb(r); } };
    var ok = luna("discover", { subscribe: true }, function (m) {
      if (!m.returnValue) return fallback();
      if (m.stage) onStage(m.stage);
      if (m.done) end({ servers: m.servers || [] });
    });
    if (!ok) fallback();
    function fallback() {
      onStage("local");
      imageProbe("http://homeassistant.local:8123", function (r) {
        end({ servers: r.ha ? [{ name: "homeassistant.local", url: r.url, alvuna: null, uuid: "" }] : [] });
      });
    }
  }

  // --- screens ------------------------------------------------------------------------------------
  // render(html, actions): every .f in html is selectable; actions[i] runs when the i-th .f is chosen.
  function render(html, actions, focus) {
    box.innerHTML = '<img class="logo" src="largeIcon.png" alt="">' + html;
    screen = { actions: actions || [], items: box.querySelectorAll(".f") };
    for (var i = 0; i < screen.items.length; i++) bindItem(screen.items[i], i);
    setFocus(focus || 0);
  }
  function bindItem(el, i) {
    el.addEventListener("mouseover", function () { setFocus(i); }); // Magic Remote pointer
    el.addEventListener("click", function (ev) { ev.preventDefault(); choose(i); });
  }
  function setFocus(i) {
    if (!screen || !screen.items.length) return;
    focusIdx = Math.max(0, Math.min(screen.items.length - 1, i));
    for (var k = 0; k < screen.items.length; k++) screen.items[k].className = screen.items[k].className.replace(/\s*\bon\b/g, "");
    var el = screen.items[focusIdx];
    el.className += " on";
    if (el.tagName === "INPUT") el.focus(); else if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }
  function choose(i) {
    var a = screen && screen.actions[i];
    if (a) a();
  }
  function stop() { clearTimeout(timer); timer = 0; cancelled = true; release(); }

  function searching(stage) {
    var text = { mdns: T.stage_mdns, local: T.stage_local, scan: T.stage_scan }[stage] || "";
    render("<h1>" + T.searching + "</h1>" + (text ? '<div class="stage"><span class="spin"></span>' + text + "</div>" : ""));
  }

  function search() {
    stop();
    cancelled = false;
    if (navigator.onLine === false) return notFound(T.offline);
    searching("mdns");
    discover(function (stage) { if (!cancelled) searching(stage); }, function (r) {
      if (cancelled) return;
      release();
      var list = r.servers, ready = list.filter(function (s) { return s.alvuna !== false; });
      if (!list.length) return notFound();
      if (list.length === 1 && ready.length === 1) {
        render("<h1>" + T.found + esc(list[0].name) + "</h1><p>" + esc(host(list[0].url)) + "</p>");
        timer = setTimeout(function () { open(list[0]); }, 700);
        return;
      }
      if (list.length === 1) return noAlvuna(list[0]);
      pick(list);
    });
  }

  function pick(list) {
    stop();
    var actions = [], rows = list.map(function (s) {
      actions.push(function () { s.alvuna === false ? noAlvuna(s) : open(s); });
      var state = s.alvuna === true ? T.alvuna_ok : s.alvuna === false ? T.alvuna_missing : "";
      return '<button class="f">' + esc(s.name) + "<small>" + esc(host(s.url)) + (state ? " · " + state : "") + "</small></button>";
    });
    actions.push(search, function () { manual(function () { pick(list); }); });
    render("<h1>" + T.found_many + "</h1><p>" + T.pick + '</p><div class="list">' + rows.join("") +
      '<div class="row"><button class="f btn">' + T.again + '</button><button class="f btn">' + T.manual + "</button></div></div>", actions);
    screen.back = exit;
  }

  function notFound(msg) {
    stop();
    render('<h1 class="err">' + T.none_title + "</h1><p>" + (msg || T.none_text) + '</p><div class="list"><div class="row">' +
      '<button class="f btn">' + T.again + '</button><button class="f btn">' + T.manual + "</button></div>" + demoButton() + "</div>",
      [search, function () { manual(notFound); }, demo]);
    screen.name = "none";
    screen.back = exit;
  }

  function noAlvuna(server) {
    stop();
    render('<h1 class="err">' + T.no_alvuna_title + "</h1><p>" + fill(T.no_alvuna_text, server.name || host(server.url)) +
      '</p><div class="list"><div class="row"><button class="f btn">' + T.retry + '</button><button class="f btn">' + T.other +
      "</button></div>" + demoButton() + "</div>", [function () { check(server, true); }, search, demo]);
    screen.back = exit;
  }

  function demoButton() { return '<button class="f">' + T.demo + "<small>" + T.demo_hint + "</small></button>"; }
  function demo() {
    stop();
    location.href = DEMO + "?tv=1&lang=" + (PL ? "pl" : "en");
  }

  function manual(back) {
    stop();
    var last = saved();
    render("<h1>" + T.manual_title + "</h1><p>" + T.manual_text + '</p><div class="list">' +
      '<input class="f" id="addr" type="url" inputmode="url" autocomplete="off" spellcheck="false" value="' +
      esc(last ? host(last.url) : "192.168.1.") + '">' + '<p id="msg" class="small">&nbsp;</p>' +
      '<div class="row"><button class="f btn">' + T.connect + '</button><button class="f btn">' + T.back + "</button></div></div>",
      [null, submit, back]);
    screen.back = back;
    function submit() {
      var input = document.getElementById("addr"), msg = document.getElementById("msg"), url = normalize(input.value);
      if (!url) { msg.className = "small err"; msg.innerHTML = T.not_ha; return; }
      msg.className = "small"; msg.innerHTML = T.checking;
      cancelled = false;
      probe(url, function (r) {
        if (cancelled) return;
        if (!r.ha) { msg.className = "small err"; msg.innerHTML = T.not_ha; return; }
        var server = { url: r.url, name: host(r.url), uuid: "" };
        if (r.alvuna === false) return noAlvuna(server);
        open(server);
      });
    }
    screen.submit = submit;
  }

  // Start with the saved server: open it once it answers, unless "Change server" is chosen meanwhile.
  function check(server, fromRetry) {
    stop();
    cancelled = false;
    var started = Date.now();
    render("<h1>" + T.connecting + esc(server.name || host(server.url)) + '</h1><p>' + esc(host(server.url)) +
      '</p><div class="stage"><span class="spin"></span>' + T.checking + '</div><div class="list"><button class="f btn">' +
      T.change + "</button></div>", [search]);
    screen.back = exit;
    probe(server.url, function (r) {
      if (cancelled) return;
      if (r.ha && r.alvuna !== false) {
        timer = setTimeout(function () { open(server); }, Math.max(0, (fromRetry ? 0 : 900) - (Date.now() - started)));
      } else if (r.ha) {
        noAlvuna(server);
      } else {
        relocate(server);
      }
    });
  }

  // The saved server did not answer: its address may have changed, so look for the same Home Assistant (by uuid).
  function relocate(server) {
    discover(function () {}, function (r) {
      if (cancelled) return;
      release();
      var same = server.uuid && r.servers.filter(function (s) { return s.uuid === server.uuid; })[0];
      if (same) return check(same, true);
      lost(server);
    });
  }

  function lost(server) {
    stop();
    cancelled = false;
    render('<h1 class="err">' + T.lost_title + "</h1><p>" + fill(T.lost_text, server.name || host(server.url)) +
      '</p><div class="list"><div class="row"><button class="f btn">' + T.retry + '</button><button class="f btn">' + T.other +
      "</button></div></div>", [function () { check(server, true); }, search]);
    screen.back = exit;
    timer = setTimeout(function () { check(server, true); }, RETRY_MS);
  }

  function open(server) {
    stop();
    save(server);
    location.href = server.url.replace(/\/+$/, "") + "/alvuna/tv/";
  }

  // Back on the first screen: the platform's own behaviour (home or the exit prompt, depending on the webOS version).
  function exit() {
    stop();
    if (window.webOS && window.webOS.platformBack) window.webOS.platformBack();
    else if (window.PalmSystem && window.PalmSystem.platformBack) window.PalmSystem.platformBack();
    else window.close();
  }

  // --- keys ---------------------------------------------------------------------------------------
  document.addEventListener("keyboardStateChange", function (ev) { kbVisible = !!(ev.detail && ev.detail.visibility); });
  document.addEventListener("keydown", function (ev) {
    if (!screen) return;
    var k = ev.keyCode, el = screen.items[focusIdx], typing = el && el.tagName === "INPUT";
    if (k === 461 || k === 27 || (k === 8 && !typing)) { // Back (webOS 461), Escape and Backspace in a browser
      ev.preventDefault();
      if (screen.back) screen.back();
      return;
    }
    if (k === 13) {
      if (typing) {
        // On the TV, OK first opens the on-screen keyboard; its Enter (keyboard open) connects.
        if (webos && !kbVisible) return;
        ev.preventDefault();
        if (screen.submit) screen.submit();
        return;
      }
      ev.preventDefault();
      choose(focusIdx);
      return;
    }
    if (typing && (k === 37 || k === 39)) return; // left/right move the caret
    if (k === 38 || k === 37) { ev.preventDefault(); setFocus(focusIdx - 1); }
    if (k === 40 || k === 39) { ev.preventDefault(); setFocus(focusIdx + 1); }
  });
  // The app comes back from the background: a search that was running starts over.
  document.addEventListener("webOSRelaunch", function () { start(); });
  window.addEventListener("online", function () { if (screen && screen.name === "none") search(); });

  function start() {
    var s = saved();
    if (s) check(s); else search();
  }
  start();
})();
