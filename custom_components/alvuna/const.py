"""Constants for Alvuna."""

DOMAIN = "alvuna"

# Where Home Assistant serves the built frontend (custom_components/alvuna/www, made by frontend/build.mjs).
URL_STATIC = "/alvuna/static"  # the sidebar panel and the fonts
URL_TV = "/alvuna/tv"  # the TV app
PANEL_FILE = "alvuna-panel.js"

# Options (Settings → Integrations → Alvuna → Configure).
CONF_SOURCE = "source"  # where the layout comes from
SOURCE_AUTO = "auto"  # built from areas and entities (layout.py)
SOURCE_DASHBOARD = "dashboard"  # the first Alvuna card on a Lovelace dashboard, as written there
CONF_DASHBOARD = "dashboard"
CONF_HIDDEN_AREAS = "hidden_areas"
CONF_HIDDEN_ENTITIES = "hidden_entities"
CONF_WEATHER = "weather"
CONF_TV_SAVER = "tv_screensaver_minutes"
CONF_TV_IDLE = "tv_idle_minutes"
DEFAULT_TV_SAVER = 2
DEFAULT_TV_IDLE = 10

SIGNAL_LAYOUT = f"{DOMAIN}_layout_changed"

# Config entries: Alvuna itself (no kind) and one per paired TV.
CONF_KIND = "kind"
KIND_TV = "tv"
CONF_USER_ID = "user_id"
SIGNAL_TV = f"{DOMAIN}_tv_{{}}"  # .format(entry_id): the TV connected or left
