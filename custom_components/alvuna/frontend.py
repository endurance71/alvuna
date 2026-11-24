"""Serves Alvuna's frontend: the TV app and the Alvuna panel in Home Assistant's sidebar."""

from __future__ import annotations

import hashlib
import logging
from pathlib import Path

from aiohttp import web

from homeassistant.components import panel_custom
from homeassistant.components.frontend import async_remove_panel
from homeassistant.components.http import HomeAssistantView, StaticPathConfig
from homeassistant.core import HomeAssistant, callback

from .const import DOMAIN, PANEL_FILE, URL_STATIC, URL_TV

_LOGGER = logging.getLogger(__name__)

WWW = Path(__file__).parent / "www"
DATA_PATHS = f"{DOMAIN}_static_paths"
DATA_PANEL = f"{DOMAIN}_panel"


def _file_hash(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()[:10]


async def async_register_frontend(hass: HomeAssistant) -> None:
    """Register the static paths (once per run) and the sidebar panel."""
    if not (WWW / "tv" / "index.html").is_file():
        _LOGGER.error("Alvuna's frontend is missing (%s); reinstall the integration", WWW)
        return
    if not hass.data.get(DATA_PATHS):
        # The view goes in before the static path, so /alvuna/tv/ is the app's page and not the folder.
        hass.http.register_view(TvIndexView(WWW / "tv" / "index.html"))
        # Every file under these paths changes only with its name (content hash) or ?v=, so a long cache is safe.
        await hass.http.async_register_static_paths(
            [
                StaticPathConfig(URL_STATIC, str(WWW / "static"), True),
                StaticPathConfig(URL_TV, str(WWW / "tv"), True),
            ]
        )
        hass.data[DATA_PATHS] = True
    # The Alvuna panel in the sidebar (administrators only): the automatic layout, with hiding, names, order, additions.
    panel = WWW / "static" / PANEL_FILE
    if panel.is_file():
        panel_version = await hass.async_add_executor_job(_file_hash, panel)
        await panel_custom.async_register_panel(
            hass,
            webcomponent_name="alvuna-panel",
            frontend_url_path=DOMAIN,
            module_url=f"{URL_STATIC}/{PANEL_FILE}?v={panel_version}",
            sidebar_title="Alvuna",
            sidebar_icon="mdi:view-dashboard-variant-outline",
            require_admin=True,
        )
        hass.data[DATA_PANEL] = True


@callback
def async_unregister_frontend(hass: HomeAssistant) -> None:
    """Take the panel out of the sidebar."""
    if hass.data.pop(DATA_PANEL, None):
        async_remove_panel(hass, DOMAIN)


class TvIndexView(HomeAssistantView):
    """The TV app's page. Never cached: it names the current content-hashed scripts. Open to all: the app signs in
    itself, the page holds no data."""

    url = f"{URL_TV}/"
    extra_urls = [URL_TV]
    name = "alvuna:tv"
    requires_auth = False

    def __init__(self, index: Path) -> None:
        self._index = index

    async def get(self, request: web.Request) -> web.StreamResponse:
        if not request.path.endswith("/"):
            # The page loads its scripts by relative paths, so it must be served from the folder.
            query = f"?{request.query_string}" if request.query_string else ""
            raise web.HTTPFound(f"{URL_TV}/{query}")
        return web.FileResponse(self._index, headers={"Cache-Control": "no-cache"})
