# Alvuna for Android TV / Google TV

A full-screen WebView app (`app.alvuna.tv`, Kotlin, no libraries). It runs the LG app's shell
(`../webos/app`: search, "Home Assistant not found", enter an address, "Try a sample home"), copied into
`app/src/main/assets/shell` at build time, so both TV apps share one page. When it finds Home Assistant it opens
`http://<home-assistant>/alvuna/tv/`, the TV app the Alvuna integration serves, which pairs itself with a code.

What the app does natively, where the LG app uses webOS:

| | webOS | Android TV |
|---|---|---|
| Search for Home Assistant (mDNS, homeassistant.local, port 8123 on the /24) | JS service, `luna://app.alvuna.tv.service` | `Discovery.kt`, through `window.AlvunaNative.call()` |
| Back key | keyCode 461 | Back reaches the page as keyCode 461; a page that does not take it goes back in history, the first page closes the app |
| Leave the app (Back on the first row, idle timeout) | `webOS.platformBack()` | `AlvunaNative.exit()` closes the activity |
| On-screen keyboard | opens on OK in a field | OK in a field opens it (the page gets the OK only while it is open); its state arrives as `keyboardStateChange` |
| 1920×1080 layout | appinfo `resolution` | the WebView is scaled to 1920 CSS pixels across; text zoom fixed at 100 % |

`AlvunaNative.call` (search, probe) answers only the app's own shell, served at
`https://appassets.androidplatform.net/shell/`; pages from a server can only close the app and open the keyboard.
Cleartext http is allowed for any host, because Home Assistant on a home network is usually `http://<ip>:8123`.

## Build and install

Needs JDK 17 and the Android SDK (platform 36), found through `ANDROID_HOME` or `local.properties` (`sdk.dir=…`).

```sh
./gradlew assembleDebug                       # app/build/outputs/apk/debug/app-debug.apk
adb connect <tv-ip>:<port>                    # Developer options → Wireless debugging on the TV
adb install -r app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n app.alvuna.tv/.MainActivity
```

A debug build lets Chrome DevTools inspect the page: `adb forward tcp:9555 localabstract:webview_devtools_remote_<pid>`
(`adb shell pidof app.alvuna.tv`), then `http://localhost:9555/json`. `adb exec-out screencap -p > shot.png` captures
the whole screen, the system keyboard included.

Release (Google Play takes an App Bundle): create `keystore.properties` next to this file with `storeFile`,
`storePassword`, `keyAlias`, `keyPassword` (never in git), then `./gradlew bundleRelease`
(`app/build/outputs/bundle/release/app-release.aab`). Raise `versionCode` in `app/build.gradle.kts` for every upload.

## Tested

Chromecast with Google TV 4K (Android TV 14, WebView 157), 2026-11-25: the search found Home Assistant, pairing by
code, the home screen, a room panel, Back step by step and out of the app from the first row, the keyboard in
"Add a home", the sample home and Back from it. The device had the system's larger text (130 %) switched on, which is
why the text zoom is fixed.
