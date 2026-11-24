# Website: alvuna.shipapp.pl

A static site (`site/`), served by Caddy on the ShipApp VPS from `/srv/alvuna-site`, the same way as nix.shipapp.pl.

- `index.html` and `privacy.html` (Polish), `style.css`, `tour.js`: the page around the TV.
- `app/`: the real TV app in demo mode, built by `cd frontend && node build-site.mjs`. It bundles `src/tv/main.js` with
  `src/tv/demo/ha.js` in place of `ha.js`: a made-up home (`src/tv/demo/home.js`) answers instead of Home Assistant,
  so every tile, panel and animation on the page is the app's own. `demo.css` frosts the tiles with backdrop-filter
  (the app's canvas frost flickered when a browser scaled the whole screen into the photo) and draws the ring that
  stands in for the mouse. `app/mdi/` holds Material Design Icons chunks (Apache 2.0), as Home Assistant serves them.
- `tour.js` drives the demo like a remote (keys into the app's window) through the features; the page shows a bar to
  pause it and pick a step, and pauses it while the mouse is on the TV.
- `img/`: web-sized copies of AI-generated pictures (Gemini): the living room (`livingroom.jpg`, with the lamp and the
  LED strip as separate light layers added on top with plus-lighter), camera stills (`img/cam/camera.<id>.jpg`),
  the household's avatars, two photo wallpapers and `img/feat/`, screenshots of the demo for the feature cards. The
  full-size sources stay out of git (`img/src/`).
- Local preview: `python3 -m http.server 8790 --directory site`.

## Deploy

1. One-time: the `alvuna.shipapp.pl` block in the ShipApp repo's Caddyfile (it allows the page to frame its own
   demo, `X-Frame-Options: SAMEORIGIN`) and the `/srv/alvuna-site` read-only mount in its `compose.yaml`. After
   merging, on the host: `git pull`, then `docker compose up -d --force-recreate caddy`.
2. Every change: `scripts/deploy-site.sh` streams `site/` to `/srv/alvuna-site` over SSH (`contabo-mtle`). Static
   files need no Caddy restart.
