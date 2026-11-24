# LG Content Store submission (Seller Lounge)

Checklist for submitting `app.alvuna.tv` through [LG Seller Lounge](https://seller.lgappstv.com/). Sources are LG's
public developer pages, read 2026-11-24; Seller Lounge itself is behind a login, so items marked **(check in the form)**
could not be confirmed and must be read off the submission form.

## 0. Decided (2026-11-24)

- [x] **How LG QA tests without Home Assistant:** "Try a sample home" on the "not found" and "Alvuna is not installed"
  screens opens `https://alvuna.shipapp.pl/app/?tv=1&lang=<pl|en>`: the real TV app (the same build as the website's
  demo) with made-up devices, every screen and panel working with the remote. In TV mode it keeps the app's own canvas
  frost and Back on its first row returns to the search screen (`history.back()`, through `window.webOS.platformBack`).
- [x] **Privacy policy URL:** https://alvuna.shipapp.pl/en/privacy.html (Polish: https://alvuna.shipapp.pl/privacy.html).
- [x] **Support:** https://alvuna.shipapp.pl/en/#pomoc, e-mail kontakt@shipapp.pl, issues https://github.com/endurance71/alvuna/issues.
- [x] **Publisher:** ShipApp, a brand of MT Hub Damian Motyliński (76-200 Słupsk, NIP 8393229228). `vendor`: ShipApp.
- [ ] **Lowest webOS version:** the TV app is built for Chromium 108, which is **webOS TV 24 and later**; pick that
  unless the frontend is tested on 22/23 (Chromium 87/94). Tested: OLED55C4 (webOS TV 26 platform).
- [x] **Countries and languages:** English and Polish (the LG app by the TV's language, the TV app by the Home Assistant
  user's language, the sample home by the TV's language).

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
- [x] Installed and run on a real TV from the exact `.ipk` being uploaded: 1.0.0 on the C4, 2026-11-24 (opens the saved
  home; Try a sample home loads the demo in TV mode with the note; Back on its first row returns to the previous page).
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

Ready in `store/screenshots/en` and `store/screenshots/pl`: 1920×1080 PNG of the sample home (no real person, house or
address), rendered from the demo build (`frontend/build-site.mjs`) and the LG app's own page:

| | |
|---|---|
| `01-home.png` | the home screen: security with cameras, what is running, scenes, rooms |
| `02-room.png` | a room's side panel: lights with brightness, a blind |
| `03-scenes.png` | scenes and rooms, a scene focused |
| `04-doorbell.png` | a camera full screen with a doorbell notification |
| `05-attention.png` | the summary panel: what needs attention |
| `06-settings.png` | settings on the TV: wallpaper, accent, tiles, screensaver |
| `07-sample-home.png` | the LG app: "Home Assistant not found" with Try a sample home |

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
  > No Home Assistant yet? "Try a sample home" shows the app with made-up devices.
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
  > Nie masz jeszcze Home Assistanta? „Wypróbuj przykładowy dom” pokazuje aplikację z przykładowymi urządzeniami.
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
> **To test without Home Assistant:** on the "Home Assistant not found" screen choose **Try a sample home**. It opens
> the full TV app with a made-up home (internet needed): rooms, lights, scenes, cameras, settings, all working with the
> remote and the pointer. Back on its first row returns to the search screen; Back there leaves the app.
>
> In a real home the integration can close the app after a period without remote input (an option in Home Assistant,
> 10 minutes by default) to protect OLED screens; the sample home has it off.

## 6. Privacy statement

Published at https://alvuna.shipapp.pl/en/privacy.html (and in Polish at https://alvuna.shipapp.pl/privacy.html): what
the TV stores, pairing, the local network search (mDNS, homeassistant.local, port 8123 on the TV's subnet), the sample
home, deleting data, the website's cookieless visit statistics, the publisher and the contact. Paste the URL.

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
| Back on the first screen: Home (webOS 23–25), exit popup or Home per the Back guide (6.0+) | `webOS.platformBack()` / `PalmSystem.platformBack()`, `window.close()` only outside webOS | the same (`platformBack()` in `main.js`) |
| No black screen while loading | splash + spinner | its own loading screen |
| Network loss handled | "No connection", retry every 15 s, follows the server to a new address | "Reconnecting" pill, reconnects |
| Text and buttons big enough (20 px text, 75×75 px targets at 1920×1080, recommended) | 32 px text, 88 px buttons | check |
| No credentials or tokens in the package | `build.sh` refuses them | served by Home Assistant, not packaged |

- [x] **TV app Back on the first screen** uses the platform's back (`PalmSystem.platformBack()`, what webOSTV.js
  `webOS.platformBack()` calls), not `window.close()`, which LG reserves for an app's own exit popup. webOS 23–25 go
  Home, 6.x/22 show the system's exit prompt.
- [x] Checked on the C4 (webOS 26 platform), 2026-11-24: Back on the first row brings up the system's exit prompt.
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
