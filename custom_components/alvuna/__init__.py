"""Alvuna: Home Assistant on the TV, a dashboard built for the remote."""

from __future__ import annotations

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.typing import ConfigType

from .const import CONF_KIND, CONF_USER_ID, DOMAIN, KIND_TV, SIGNAL_LAYOUT
from .frontend import async_register_frontend, async_unregister_frontend
from .overrides import DATA_OVERRIDES, Overrides
from .pairing import async_setup_pairing, async_unload_pairing
from .tv import SIGNAL_TVS, async_forget as async_forget_tv, async_register as async_register_tv
from .websocket import async_register_commands

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)
TV_PLATFORMS = [Platform.BINARY_SENSOR]


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """The WebSocket commands and the TV services (they reach nothing until Alvuna and a TV are added)."""
    async_register_commands(hass)
    await async_register_tv(hass)
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Alvuna itself serves the TV app, its panel and pairing; a paired TV gets its device and sensor."""
    if entry.data.get(CONF_KIND) == KIND_TV:
        await hass.config_entries.async_forward_entry_setups(entry, TV_PLATFORMS)
        # The panel's Televisions tab lists it (and its new name, after a rename).
        entry.async_on_unload(entry.add_update_listener(_tv_updated))
        async_dispatcher_send(hass, SIGNAL_TVS)
        return True
    store = Overrides(hass)
    await store.async_load()
    hass.data[DATA_OVERRIDES] = store
    await async_register_frontend(hass)
    async_setup_pairing(hass)
    entry.async_on_unload(entry.add_update_listener(_options_updated))
    return True


async def _options_updated(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """New options change the layout; open cards and TVs get it through their subscription."""
    async_dispatcher_send(hass, SIGNAL_LAYOUT)


async def _tv_updated(hass: HomeAssistant, entry: ConfigEntry) -> None:
    async_dispatcher_send(hass, SIGNAL_TVS)


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    if entry.data.get(CONF_KIND) == KIND_TV:
        unloaded = await hass.config_entries.async_unload_platforms(entry, TV_PLATFORMS)
        async_dispatcher_send(hass, SIGNAL_TVS)
        return unloaded
    # The static paths stay until Home Assistant restarts; the panel leaves the sidebar.
    async_unregister_frontend(hass)
    async_unload_pairing(hass)
    hass.data.pop(DATA_OVERRIDES, None)
    return True


async def async_remove_entry(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """A removed TV loses its user, and with it every token it held. Removing Alvuna itself forgets the panel's
    changes too, so installing it again starts from the automatic layout."""
    if entry.data.get(CONF_KIND) == KIND_TV:
        async_forget_tv(hass, entry.entry_id)
        if user := await hass.auth.async_get_user(entry.data[CONF_USER_ID]):
            await hass.auth.async_remove_user(user)
        return
    await Overrides(hass).store.async_remove()
