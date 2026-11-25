# Google Play submission (Android TV)

Checklist and texts for publishing `app.alvuna.tv` on Google Play for Android TV / Google TV. The developer account is
a company (organisation) account, so the 12-tester closed test that new personal accounts need does not apply.

## 1. Package and signing

| | |
|---|---|
| Package name | `app.alvuna.tv` (cannot change after the first upload) |
| File | `app/build/outputs/bundle/release/app-release.aab` from `./gradlew bundleRelease` |
| Version | `versionCode` / `versionName` in `app/build.gradle.kts`; raise `versionCode` for every upload |
| SDK | minSdk 26 (Android 8), targetSdk 36 |
| Form factor | Android TV only: `android.software.leanback` required, touchscreen not required, `LEANBACK_LAUNCHER`, banner |
| Signing | Play App Signing: Google keeps the app signing key, we sign uploads with the **upload key** |

The upload key lives outside the repo: `~/.config/alvuna/play-upload.jks` (PKCS12, alias `upload`, RSA 4096, valid
10 000 days, issued to the publisher, ShipApp) and its
password in `~/.config/alvuna/play-upload.env` (`ALVUNA_UPLOAD_PASS`). Back both up; a lost upload key can be reset
through Play support, but it takes days.

```sh
set -a; . ~/.config/alvuna/play-upload.env; set +a
ALVUNA_UPLOAD_KEYSTORE=~/.config/alvuna/play-upload.jks ./gradlew bundleRelease
```

## 2. Graphics (`store/`)

Drawn from the site's icon (`site/icon.svg`) and the LG screenshots.

| Play field | Size | File |
|---|---|---|
| App icon | 512×512 PNG, no alpha, full-bleed (Play rounds it) | `store/icon-512.png` |
| Feature graphic | 1024×500 PNG | `store/feature-1024x500-en.png`, `store/feature-1024x500-pl.png` |
| Android TV banner | 1280×720 PNG | `store/tv-banner-1280x720.png` |
| TV screenshots | 1920×1080 PNG, up to 8 | `../webos/store/screenshots/en/01`–`07`, `../webos/store/screenshots/pl/01`–`07` |
| Phone screenshots, if the form insists | at least 2, 16:9 is allowed | the same TV screenshots |

The screenshots show the sample home (no real person, house or address).

## 3. Store listing

Default language English (United States), plus Polish.

**English**

- App name (30): `Alvuna`
- Short description (80): `Your Home Assistant home on the TV, driven by the remote.`
- Full description (4000):

> Alvuna puts your Home Assistant on the big screen. Rooms, lights, scenes, climate, weather, media and cameras
> appear as tiles you move through with the TV remote.
>
> Alvuna needs Home Assistant on your local network with the free Alvuna integration installed (Settings →
> Marketplace → Alvuna). The app finds Home Assistant by itself; nothing is typed on the TV. It shows a short code,
> you approve the TV in Home Assistant, and the TV gets its own user that works only on your home network. Remove
> the TV in Home Assistant to revoke it.
>
> • Home screen with what needs attention: open windows, running appliances, the doorbell
> • Room panels with lights, brightness and blinds
> • Scenes started with one press
> • Cameras full screen, with doorbell notifications
> • Weather, climate and media at a glance
>
> No Home Assistant yet? "Try a sample home" shows the app with made-up devices.
>
> English and Polish. No account, no cloud, no ads, no tracking. Open source:
> https://github.com/endurance71/alvuna

**Polski**

- Nazwa: `Alvuna`
- Krótki opis: `Twój dom z Home Assistanta na telewizorze, obsługiwany pilotem.`
- Pełny opis:

> Alvuna pokazuje Home Assistanta na dużym ekranie. Pokoje, światła, sceny, ogrzewanie, pogoda, multimedia i kamery
> to kafelki, po których poruszasz się pilotem telewizora.
>
> Potrzebny jest Home Assistant w sieci domowej z darmową integracją Alvuna (Ustawienia → Marketplace → Alvuna).
> Aplikacja sama znajduje Home Assistanta, na telewizorze niczego się nie wpisuje. Pokazuje krótki kod, zatwierdzasz
> telewizor w Home Assistancie, a telewizor dostaje własnego użytkownika działającego tylko w sieci domowej. Usunięcie
> telewizora w Home Assistancie odbiera mu dostęp.
>
> • Ekran główny z tym, co wymaga uwagi: otwarte okna, pracujące urządzenia, dzwonek do drzwi
> • Panele pokoi ze światłami, jasnością i roletami
> • Sceny uruchamiane jednym przyciskiem
> • Kamery na pełnym ekranie, z powiadomieniem o dzwonku
> • Pogoda, ogrzewanie i multimedia w jednym miejscu
>
> Nie masz jeszcze Home Assistanta? „Wypróbuj przykładowy dom” pokazuje aplikację z przykładowymi urządzeniami.
>
> Po polsku i po angielsku. Bez konta, bez chmury, bez reklam i bez śledzenia. Otwarty kod:
> https://github.com/endurance71/alvuna

## 4. Store settings and contact

- App or game: App. Free.
- Category: **House & Home**. Tags: smart home, home automation (pick what the form offers).
- Contact e-mail: the company address (as for LG). Website: https://alvuna.shipapp.pl/en/
- Privacy policy: https://alvuna.shipapp.pl/en/privacy.html
- Countries: all.

## 5. App content (policy forms)

| Form | Answer |
|---|---|
| Privacy policy | the URL above |
| Ads | No ads |
| App access | Some functionality is restricted → instructions below, no username or password |
| Content rating (IARC) | Category "All other app types"; no violence, sexuality, language, drugs, gambling; no user interaction or sharing, no location sharing, no purchases, no unrestricted web → Everyone / PEGI 3 |
| Target audience | 18 and over (not designed for children) |
| News app | No |
| Government app | No |
| Financial features | None |
| Health | None |
| Data safety | No data collected, no data shared (below) |
| Advertising ID | Not used (no libraries in the app) |

**Data safety.** The app sends nothing to the developer or to third parties. It talks only to the Home Assistant
server the user picks on their own network, and stores on the TV the server's address and the TV's own Home
Assistant tokens. The local-network search (mDNS, `homeassistant.local`, port 8123 on the TV's subnet) stays on the
LAN. "Try a sample home" loads a static page from alvuna.shipapp.pl, which has no analytics and sets no cookies.
So: *Does your app collect or share any of the required user data types?* → **No**. Encryption in transit: not
claimed (home servers are usually plain `http://<ip>:8123`). Deletion: uninstalling, or removing the TV in Home
Assistant.

**App access instructions** (paste):

> Alvuna is a client for Home Assistant (open-source home automation server, https://www.home-assistant.io) on the
> user's local network with the Alvuna integration installed. There is no account and no login.
>
> On start the app searches the local network for Home Assistant. With none on the network it shows "Home Assistant
> not found". Choose **Try a sample home** there: it opens the full TV app with a made-up home (internet needed) —
> rooms, lights, scenes, cameras, settings — all working with the D-pad. Back closes a panel, then returns to the first
> row, then to the search screen; Back there leaves the app.
>
> With a real Home Assistant, the app shows a six-character code and the administrator approves the TV in Home
> Assistant (Settings → Devices & services → Discovered → Alvuna TV).

## 6. Release

- [ ] Play Console → Create app (name Alvuna, English, App, Free, declarations).
- [ ] Setup → Advanced settings → Form factors → add **Android TV** (opt in to TV review; needs the banner and TV
  screenshots).
- [ ] Internal testing → create release → upload `app-release.aab`, accept Play App Signing, release notes
  "First release." / „Pierwsze wydanie.” → roll out to internal testers (the account's own e-mail).
- [ ] Install from the internal-testing link on the Chromecast and check: start, search, pairing, sample home, Back.
- [ ] Production → create release from the same bundle → **Send for review only with the owner's OK.**
- [ ] TV review checks the TV quality guidelines (D-pad everywhere, banner, no touch requirement, Back behaviour)
  separately from the main review; the app can be approved for phones/tablets and still rejected for TV.

## 7. Submission log

- 2026-11-25: upload key created, 1.0.0 (versionCode 1) bundle built and verified (signer, leanback, targetSdk 36);
  graphics and texts ready.
- 2026-11-25, Play Console, the publisher's organisation developer account:
  - app **Alvuna** created (`app.alvuna.tv`, English default, app, free, both declarations accepted);
  - Advanced settings → Form factors: **Android TV** added (Android XR was on by default and stays; leanback is
    required, so only TVs get the app);
  - Internal testing: release `1 (1.0.0)` with the bundle, notes "First release.", **saved as draft, not rolled out**
    (warnings: no testers yet, no R8 mapping file);
  - default store listing EN + PL: texts from section 3, icon, feature graphic EN/PL, 4 phone screenshots and 6 TV
    screenshots per language (`01, 02, 03, 05, 06, 07`; phone gets `01, 02, 03, 05`), TV banner; assets not AI-labelled;
  - category House & Home ("Dom");
  - App content done: privacy policy, ads (none), app access (sample home, 411-character instructions), target
    audience 18+, data safety (no data collected or shared), advertising ID (no), government (no), financial (none),
    health (none).
  - content rating (IARC, e-mail kontakt@shipapp.pl, "All other app types", online content Yes, everything else
    No): rated for all ages everywhere (ClassInd L, PEGI 3, ESRB Everyone, USK 0);
  - store contact: kontakt@shipapp.pl, website https://alvuna.shipapp.pl/en/;
  - all setup tasks on the dashboard done; nothing sent for review yet.
  - internal testers: one e-mail list (the Google account on the test Chromecast); release `1 (1.0.0)` **rolled
    out to internal testing** 2026-11-25 (not reviewed); the tester accepted the invite.
  - Chromecast: debug build removed, the internal-test build installed from Play (installer com.android.vending,
    Play signature, not debuggable); it found Home Assistant by itself, paired by code with one home (local only) and
    a second home added by address over the internet; homes renamed on the TV, switching works and keeps the names;
    room panel and Back checked. A custom launcher that puts new apps in "All Apps" (not its dock) shows Alvuna in
    the app grid only.
  - stale debug-build TV entries removed from both test Home Assistants; the home-switch bug found in the test is
    https://github.com/endurance71/alvuna/issues/1 (milestone v0.1.0-beta.5).
- **2026-11-25 ~12:45, sent for review** (user's go-ahead): Android TV opted in (TV quality review), production
  release `1 (1.0.0)` from the same bundle, notes EN "First release." / PL "Pierwsze wydanie.", all 177 countries
  plus "rest of the world", full rollout. 13 changes sent; Play first runs quick pre-checks (up to 14 min), then the
  review (usually up to 7 days). Managed publishing is **off**, so the app goes live as soon as it is approved.
  Watch the Publishing overview and the Policy status page for the result; the TV review can be rejected separately.
