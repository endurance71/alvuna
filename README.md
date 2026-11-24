# Alvuna

A Home Assistant dashboard for the wall tablet and the TV. Install it, add the integration, and your home is
on screen: rooms from your areas, lights, scenes, weather, media, climate, cameras. No YAML, and nothing to type on the
TV.

- **Tablet card**: one full-screen card (`custom:alvuna-card`) for a wall tablet or a phone.
- **TV app**: a 10-foot interface driven by the remote. It has rows of tiles, detail panels, a screensaver that
  protects OLED screens, and full-screen cameras.
- **Automatic layout**: built from Home Assistant's areas, floors and entities, and kept up to date as they change.
- **TV pairing**: the TV shows a code, Home Assistant shows "Discovered: Alvuna TV", you approve it. Each TV gets its
  own user (not an administrator, local network only), and removing the TV revokes it.
- **English and Polish**, following each user's language and number/time formats.

## Install

1. In Home Assistant open **Settings → Marketplace** (HACS on 2026.10 and older). Add this repository as a custom
   repository (`https://github.com/endurance71/alvuna`, type *Integration*) and install **Alvuna**.
2. Restart Home Assistant.
3. Go to **Settings → Devices & services → Add integration → Alvuna**.

The card is loaded for you; there is no dashboard resource to add.

## Tablet

Edit a dashboard, add a card and pick **Alvuna**. With no options it shows the automatic layout. A panel view, or a
dashboard with a single card, gives it the whole screen.

Every key of the card's config overrides the automatic layout, so you can still hand-write rooms, scenes, media,
cameras and the rest. **Settings → Devices & services → Alvuna → Configure** offers:

- **Layout**:
  - *Automatic* builds the layout from your areas.
  - *From a dashboard* uses the Alvuna card config written on that dashboard. This is for hand-made setups.
- **Hidden areas** and **hidden entities**.
- **Weather**: which weather entity to use.
- **TV screensaver after** and **TV app closes after**, in minutes.

## TV

Open `http://<your-home-assistant>:8123/alvuna/tv/` in the TV's browser, or use the Alvuna TV app (LG webOS and
Google TV apps are coming).

1. The TV shows a six-character code.
2. In Home Assistant, **Settings → Devices & services** lists **Alvuna TV** under *Discovered*. Choose **Add**, check
   that the code matches the screen, and name the TV.
3. The TV opens your home.

Each paired TV is a device with a **Connected** sensor, and it can be targeted by two actions:

- `alvuna.notify` shows a message on the TV.
- `alvuna.show_camera` opens a camera full screen, for example when the doorbell rings.

## Requirements

- Home Assistant 2025.1 or newer.
- The TV must reach Home Assistant on the local network. Paired TV users are local-only.

## Development

```sh
cd frontend && npm ci && node build.mjs        # builds custom_components/alvuna/www
python -m venv .venv && .venv/bin/pip install -r requirements_test.txt
.venv/bin/pytest -q
scripts/dev-deploy.sh <ssh-host>                # copy to a test Home Assistant, then restart it
```

The built frontend is not committed. The release workflow builds it and attaches `alvuna.zip` to each GitHub release.

---

## Po polsku

Alvuna to pulpit Home Assistanta na tablet ścienny i telewizor.

1. Zainstaluj ją z **Ustawienia → Marketplace** (albo z HACS), zrestartuj Home Assistanta i dodaj integrację
   **Alvuna**.
2. Tablet: dodaj kartę **Alvuna** na dowolnym dashboardzie.
3. Telewizor: otwórz `/alvuna/tv/` na telewizorze. W Home Assistancie, w sekcji *Wykryte*, zatwierdź urządzenie
   **Alvuna TV** z kodem widocznym na ekranie.

Układ powstaje sam z obszarów i pięter. W opcjach integracji możesz ukryć obszary i encje albo wskazać dashboard
z ręczną konfiguracją karty.
