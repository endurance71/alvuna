"""Alvuna: a Home Assistant dashboard for wall tablets and TVs."""

from __future__ import annotations

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers import config_validation as cv

from .const import DOMAIN
from .frontend import async_register_frontend, async_unregister_frontend

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Serve the card and the TV app."""
    await async_register_frontend(hass)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Stop loading the card in the frontend (the static paths stay until Home Assistant restarts)."""
    async_unregister_frontend(hass)
    return True
