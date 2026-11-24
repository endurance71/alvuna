# Alvuna

Home Assistant on the TV. Install it, add the integration, open the app on the TV: your home is there, laid out for
the remote. Rooms from your areas, lights, scenes, weather, media, climate, cameras, the washing machine, waste
collection. Nobody builds a dashboard, and nothing is typed on the TV.

- **A ready layout**: Alvuna builds it from Home Assistant's areas, floors and devices, and keeps it current as they
  change. It picks each room's thermometer, one player per TV, readable names, and recognises WashData appliances,
  waste calendars, air quality and weather warnings.
- **The Alvuna panel** in Home Assistant's sidebar, for administrators: hide what should not show, rename, reorder, add a
  script as a scene. Changes reach every TV at once.
- **On the TV**, hold OK on a tile to hide it.
- **Pairing by code**: the TV shows a code; in Home Assistant, under Discovered, type it. Each TV gets its own user
  (not an administrator; local network only unless you allow a TV in another home), and removing it revokes it.
- **Several homes** on one TV, each paired on its own; **English and Polish**.

## Install

1. In Home Assistant open **Settings → Marketplace** (HACS on 2026.10 and older), add this repository as a custom
   repository (`https://github.com/endurance71/alvuna`, type *Integration*) and install **Alvuna**.
2. Restart Home Assistant, then **Settings → Devices & services → Add integration → Alvuna**.

## TV

Install the Alvuna app (LG webOS; Google TV is coming), or open `http://<your-home-assistant>:8123/alvuna/tv/` in the
TV's browser. The app finds Home Assistant on the network and shows a code: in Home Assistant, **Settings → Devices &
services → Discovered → Alvuna TV**, type the code and name the TV. Settings on the TV (gear in the summary panel): the
look of the tiles, screensaver and OLED care, homes (switch, add, remove) and signing out.

Each paired TV is a device with a **Connected** sensor, and the actions `alvuna.notify` (a message on the TV) and
`alvuna.show_camera` (a camera full screen, e.g. when the doorbell rings) can target it.

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

The built frontend (`custom_components/alvuna/www`) is committed, so an install from any commit works; CI fails when it
does not match the sources, so rebuild and commit it with every frontend change. Releases also attach `alvuna.zip`.

---

## Po polsku

Alvuna to Home Assistant na telewizorze: gotowy układ z obszarów i urządzeń, bez tworzenia dashboardów.

1. Zainstaluj ją z **Ustawienia → Marketplace** (albo z HACS), zrestartuj Home Assistanta i dodaj integrację
   **Alvuna**.
2. Telewizor: uruchom aplikację Alvuna (albo `/alvuna/tv/` w przeglądarce TV). W Home Assistancie, w sekcji
   *Wykryte*, wybierz **Alvuna TV** i wpisz kod z ekranu.

Układ powstaje sam z obszarów i pięter. W panelu **Alvuna** w menu bocznym ukryjesz elementy, zmienisz nazwy
i kolejność albo dodasz skrypt jako scenę; na telewizorze przytrzymanie OK na kaflu też pozwala go ukryć.
