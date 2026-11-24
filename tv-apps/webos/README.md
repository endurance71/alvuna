# Alvuna for LG webOS

The LG TV app (`app.alvuna.tv`). It is a thin shell: it finds Home Assistant on the local network and opens the TV
app that the Alvuna integration serves at `http://<home-assistant>/alvuna/tv/`. That page pairs the TV itself: it shows
a code and an administrator approves it under **Settings → Devices & services → Discovered**. The package carries no
token, no server list and no address.

## How it finds Home Assistant

A web app on webOS gets no mDNS and cannot read answers from other origins (CORS applies to packaged apps), so the
search runs in the app's own JS service, `app.alvuna.tv.service` (`service/`, plain Node, no dependencies):

1. **mDNS**: a query for `_home-assistant._tcp.local` (Home Assistant's zeroconf announcement). The answer gives the
   address, port, the home's name (`location_name`) and its `uuid`.
2. **homeassistant.local**: an mDNS A query, then the system resolver.
3. **Subnet scan**: TCP port 8123 on the TV's own /24, 64 connections at a time (2–8 s).
4. **Manual entry** with the remote (the on-screen keyboard), if all of that finds nothing.

Every candidate is checked over HTTP: `/manifest.json` must be Home Assistant's, and `/alvuna/tv/` answering 200
means the integration is installed. One server with Alvuna opens at once; several give a list; Home Assistant without
Alvuna shows how to install it.

The shell (`app/shell.js`) remembers the server picked (`localStorage`, key `alvuna-server`: URL, name, uuid). On the
next start it opens it as soon as it answers, with a **Change server** button meanwhile. If the saved address stops
answering, the shell searches again and follows the same Home Assistant (same `uuid`) to its new address; otherwise it
shows **No connection** and retries every 15 s.

Without the service (in a desktop browser) the shell falls back to an image request for
`homeassistant.local:8123` and to manual entry.

## Build and install

Needs the webOS CLI (`npm i -g @webos-tools/cli`) and, for installing, a TV in Developer Mode registered with
`ares-setup-device`.

```bash
./build.sh
```

```bash
./install.sh
```

`install.sh` installs on `$TV` (default `lg-c4`) and does not open the app; `./install.sh --launch` opens it too.
`build.sh` refuses to package anything that looks like a token or a fixed server address.

Icons and images: `swift tools/make_icons.swift` draws them from `art/icon.svg` (the house holding the deck tiles).

## Testing the search without the app

```bash
node service/discovery.js
```

`node service/discovery.js scan` runs only the subnet scan; `node service/discovery.js probe 192.168.1.20` checks one
address. On the TV, with the app installed, the service answers over the Luna bus (Developer Mode shell):
`luna-send-pub -i luna://app.alvuna.tv.service/discover '{"subscribe":true}'`.

## Files

- `app/`: `appinfo.json`, `index.html`, `shell.js`, `style.css`, icons and splash.
- `service/`: `discovery.js` (the search), `service.js` (the Luna wrapper), `services.json`, `package.json`.
- `art/icon.svg`: the icon source. `store/`: store icons and screenshots for the LG Content Store.
- `STORE.md`: the Seller Lounge submission checklist.
