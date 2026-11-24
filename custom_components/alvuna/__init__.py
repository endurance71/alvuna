"""Alvuna: a Home Assistant dashboard for wall tablets and TVs."""

from __future__ import annotations

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.typing import ConfigType

from .const import DOMAIN, SIGNAL_LAYOUT
from .frontend import async_register_frontend, async_unregister_frontend
from .websocket import async_register_commands

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Register the WebSocket commands (they answer with nothing until Alvuna is added)."""
    async_register_commands(hass)
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Serve the card and the TV app."""
    await async_register_frontend(hass)
    entry.async_on_unload(entry.add_update_listener(_options_updated))
    return True


async def _options_updated(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """New options change the layout; open cards and TVs get it through their subscription."""
    async_dispatcher_send(hass, SIGNAL_LAYOUT)


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Stop loading the card in the frontend (the static paths stay until Home Assistant restarts)."""
    async_unregister_frontend(hass)
    return True
