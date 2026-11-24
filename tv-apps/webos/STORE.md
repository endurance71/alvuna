# LG Content Store submission (Seller Lounge)

Checklist for submitting `app.alvuna.tv` through [LG Seller Lounge](https://seller.lgappstv.com/). Sources are LG's
public developer pages, read 2026-11-24; Seller Lounge itself is behind a login, so items marked **(check in the form)**
could not be confirmed and must be read off the submission form.

## 0. Decide before submitting

- [ ] **How LG QA tests an app that needs Home Assistant.** QA will not have one. Pairing gives the TV a Home Assistant
  user limited to the local network, so a public demo server does not help. Options, best first:
  1. a built-in demo home (sample data, no server), reachable from the "not found" screen; LG QA can then test every
     screen with the remote (needs work in the TV frontend);
  2. a video of the whole flow (search → pairing code → approve in Home Assistant → home screen) plus the reviewer
     notes below.
- [ ] **Privacy policy URL**: publish section 6 (for example as `PRIVACY.md` in the GitHub repository, or a page on
  the project's site) and paste its URL.
- [ ] **Lowest webOS version.** The shell runs anywhere (ES5), but the TV app it opens is built for Chromium 108
  (`frontend/build.mjs`, `target: chrome108`), which is webOS TV 24. Pick **webOS TV 24 and later** unless the frontend
  is tested on 22/23 (Chromium 87/94). Tested so far: OLED55C4 (a 2024 set, firmware 43.21.96, which ships Node 20.12, i.e. the webOS TV 26 platform).
- [ ] **Countries and languages.** The app speaks English and Polish (shell: by the TV's language; TV app: by the Home
  Assistant user's language).

## 1. Package

| | |
|---|---|
| File | `dist/app.alvuna.tv_<version>_all.ipk` from `./build.sh` |
| App ID | `app.alvuna.tv` (cannot change after the first release) |
| Service | `app.alvuna.tv.service` (bundled JS service, Node; its ID starts with the app ID, as LG requires) |
| Version | `appinfo.json` → `version`, three numbers. Raise it for every upload: the same version cannot be uploaded twice |
| Title | `Alvuna` (limit 20 characters) |
| appDescription | `Home Assistant on your TV` (limit 60 characters) |
| Vendor | `Alvuna` |
| requiredACG | `[]`: the app calls only its own service and no platform Luna API. Mandatory from webOS TV 27 |
| Resolution | 1920×1080 |
| Back key | `disableBackHistoryAPI: true`: the app handles Back (keyCode 461) itself |

- [ ] `./build.sh` passes (it also refuses to package anything that looks like a token or a fixed server address).
- [ ] Installed and run on a real TV once more from the exact `.ipk` being uploaded.
- [ ] The service's code stays Node 8.12 compatible (webOS TV 5/6). Node by webOS TV version: 22 → 12.21, 23 → 12.22,
  24 → 16.19, 25 → 16.20, 26 → 20.12.

## 2. Icons and images

All drawn by `swift tools/make_icons.swift` from `art/icon.svg`.

| Use | Size | File | Notes |
|---|---|---|---|
| App icon (`icon`) | 80×80 PNG | `app/icon.png` | transparent glyph; the launcher fills the tile with `iconColor` `#1A6676` |
| Large icon (`largeIcon`) | 130×130 PNG | `app/largeIcon.png` | same design as the small one, only bigger (LG rule) |
| Splash (`splashBackground`) | 1920×1080 PNG | `app/splash.png` | must not be black; it is the app's gradient with the icon |
| Store icon (Seller Lounge) | 400×400 PNG | `store/icon-400.png` | opaque tile, LG resizes it for the store |
| Small store icon, if asked | 130×130 PNG | `store/icon-130.png` | **(check in the form)** |

- [ ] Flat 2D design, the glyph inside the safe area (LG: 115×115 of a 126×126 panel, 5 px padding). The house
  glyph keeps that margin.

## 3. Screenshots

LG's public pages give no count or size for listing screenshots **(check in the form)**; prepare 1920×1080 PNGs. Take
them with no personal data on screen: no real names of people, no camera views of the house, no addresses.

- [ ] Home screen of the TV app (tiles of rooms, scenes, weather).
- [ ] A detail panel (a light or climate).
- [ ] The pairing screen with its six-character code.
- [ ] The shell's search screen ("Looking for Home Assistant on your network…").
- [ ] Optional: the server list, or the screensaver.

How to take them at full size: open `http://<home-assistant>:8123/alvuna/tv/?login=1` in a desktop browser window
whose page area is exactly 1920×1080 (the app is drawn for that size and scales to fit any other), sign in with a demo
user on a demo home, and save each screen. The shell's screens: serve `tv-apps/webos/app/` over HTTP and open
`index.html` (without the webOS service it falls back to `homeassistant.local` and manual entry).

## 4. Listing text

**English**

- Name: Alvuna
- Short description: Your Home Assistant home on the TV, driven by the remote.
- Description:
  > Alvuna puts your Home Assistant on the big screen. Rooms, lights, scenes, climate, weather, media and cameras
  > appear as tiles you move through with the remote or the Magic Remote pointer.
  >
  > Alvuna needs Home Assistant on your local network with the free Alvuna integration installed (Settings →
  > Marketplace → Alvuna). The app finds Home Assistant by itself; nothing is typed on the TV. It shows a short code,
  > you approve the TV in Home Assistant, and the TV gets its own user that works only on your home network. Remove
  > the TV in Home Assistant to revoke it.
  >
  > English and Polish. No account, no cloud, no ads, no tracking.
- Keywords: home assistant, smart home, home automation, dashboard, lights, climate, cameras
- Category: Lifestyle (or Utility) **(check in the form)**
- Age rating: suitable for all ages (no user-generated content, no purchases)

**Polski**

- Krótki opis: Twój dom z Home Assistanta na telewizorze, obsługiwany pilotem.
- Opis:
  > Alvuna pokazuje Home Assistanta na dużym ekranie. Pokoje, światła, sceny, ogrzewanie, pogoda, multimedia i kamery
  > to kafelki, po których poruszasz się pilotem albo wskaźnikiem Magic Remote.
  >
  > Potrzebny jest Home Assistant w sieci domowej z darmową integracją Alvuna (Ustawienia → Marketplace → Alvuna).
  > Aplikacja sama znajduje Home Assistanta, na telewizorze niczego się nie wpisuje. Pokazuje krótki kod, zatwierdzasz
  > telewizor w Home Assistancie, a telewizor dostaje własnego użytkownika działającego tylko w sieci domowej. Usunięcie
  > telewizora w Home Assistancie odbiera mu dostęp.
  >
  > Po polsku i po angielsku. Bez konta, bez chmury, bez reklam i bez śledzenia.

## 5. Reviewer notes (paste into the test-information field)

> Alvuna is a client for Home Assistant (open-source home automation server, https://www.home-assistant.io) running on
> the user's local network with the Alvuna integration installed. There is no account and no login on the TV.
>
> On start the app searches the local network (mDNS `_home-assistant._tcp`, then `homeassistant.local`, then port 8123
> on the TV's subnet) using its bundled JS service. With no Home Assistant on the network it shows "Home Assistant not
> found" with "Search again" and "Enter address" (on-screen keyboard). When found, it opens the Alvuna TV app served by
> that Home Assistant, which shows a six-character pairing code; the administrator approves it in Home Assistant.
>
> Keys: arrows move the focus, OK selects, Back closes the open panel or goes up one level and, on the first screen,
> leaves the app through the platform's back behaviour. The Magic Remote pointer focuses what it rests on, click selects,
> the wheel moves between rows.
>
> [Attach the demo video link / describe the demo home here, see section 0.]

## 6. Privacy statement

> **Alvuna for LG webOS: privacy**
>
> Alvuna connects your TV to your own Home Assistant server on your local network. It has no account, no cloud service,
> no advertising and no analytics, and it sends nothing to Alvuna's authors or to any third party.
>
> - **Finding Home Assistant.** The app looks for Home Assistant on your local network: it listens for Home Assistant's
>   mDNS announcement, asks for `homeassistant.local`, and, if those find nothing, checks port 8123 on the addresses of
>   your TV's own subnet. These requests stay inside your network.
> - **What the TV stores.** The address, name and identifier of the Home Assistant server you picked, so the app can
>   open it next time. After pairing, the Home Assistant sign-in tokens for the TV's own user, stored by your Home
>   Assistant's web page on the TV, as any browser would.
> - **Pairing.** Approving the TV in Home Assistant creates a Home Assistant user for that TV, without administrator
>   rights and limited to the local network. Removing the TV in Home Assistant deletes that user and its tokens.
> - **Your home's data** (devices, states, camera images) travels only between your TV and your Home Assistant.
> - **Removing data.** Uninstalling the app removes what it stored on the TV; removing the TV in Home Assistant revokes
>   its access.
>
> Questions: [contact address or the GitHub issues URL].

## 7. QA rules: remote and Back key

From LG's [App Self-Checklist](https://webostv.developer.lge.com/distribute/app-self-checklist) and
[Back button guide](https://webostv.developer.lge.com/develop/guides/back-button). Fill the self-checklist and attach it:
without it the app may be rejected before QA. LG also asks for a UX scenario document (section 8).

| Rule | Shell (`app/shell.js`) | TV app (`frontend/src/tv`) |
|---|---|---|
| Arrows, OK and Back all work | yes | yes |
| Every selectable item shows a visible focus, no exception | white card with lime border | yes (focus ring/scale) |
| Magic Remote pointer reaches all selectable UI | hover focuses, click selects | `pointermove` focuses, click = OK, wheel = rows |
| Back closes the top layer / goes up a level | manual entry → previous screen | panel → close, row → first row |
| Back on the first screen: Home (webOS 23–25), exit popup or Home per the Back guide (6.0+) | `webOS.platformBack()` / `PalmSystem.platformBack()`, `window.close()` only outside webOS | **calls `window.close()`** |
| No black screen while loading | splash + spinner | its own loading screen |
| Network loss handled | "No connection", retry every 15 s, follows the server to a new address | "Reconnecting" pill, reconnects |
| Text and buttons big enough (20 px text, 75×75 px targets at 1920×1080, recommended) | 32 px text, 88 px buttons | check |
| No credentials or tokens in the package | `build.sh` refuses them | served by Home Assistant, not packaged |

- [ ] **TV app Back on the first screen.** It calls `window.close()` (`frontend/src/tv/main.js`, the `isBack` branch),
  which LG reserves for a custom exit popup. Switch it to the platform's back (`PalmSystem.platformBack()`, which is
  what webOSTV.js `webOS.platformBack()` calls) before submitting, so webOS 23–25 show Home and 6.x/22 show the system
  exit prompt.
- [ ] **TV app closes itself when idle** (`tv_idle_minutes`, `window.close()`). LG has no public rule against it, but QA
  may report the app "disappearing". Mention it in the reviewer notes or turn it off by default.
- [ ] Re-test on the TV: every screen reachable and leavable with arrows, OK and Back only; again with the pointer only.

## 8. UX scenario document (outline)

1. Launch → splash → "Looking for Home Assistant on your network…" (stages: mDNS, homeassistant.local, network scan).
2. a) One server with Alvuna → opens it. b) Several → list, pick one. c) Home Assistant without Alvuna → install
   instructions, Try again / Other server. d) None → Search again / Enter address.
3. The Alvuna TV app shows a pairing code → the admin approves "Alvuna TV" under Discovered in Home Assistant → the
   home screen appears.
4. Home screen: rows of tiles; OK opens a detail panel; Back closes it; Back on the first row leaves the app.
5. Next launch: "Connecting to <home>" with **Change server**; opens the saved home without a new pairing.

## 9. Submit

- [ ] Seller Lounge → new app → upload the `.ipk`, icons, screenshots, texts, privacy URL, reviewer notes, the
  self-checklist and the UX scenario document.
- [ ] After approval, keep the published `.ipk` (and its git tag) so later versions raise the version number.
