"""The household's changes to the automatic layout: hidden items, names, order, additions. Kept in .storage."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.storage import Store

from .const import DOMAIN, SIGNAL_LAYOUT
from .layout import LIST_SECTIONS

DATA_OVERRIDES = f"{DOMAIN}_overrides"
STORAGE_KEY = f"{DOMAIN}.layout"
EMPTY: dict[str, Any] = {"hidden": [], "names": {}, "order": {}, "added": {}}

# An id is an entity id, or "area:<area id>" for a room.
_ID = vol.All(cv.string, vol.Length(min=1, max=255))
SCHEMA = vol.Schema(
    {
        vol.Optional("hidden", default=list): [_ID],
        vol.Optional("names", default=dict): {_ID: vol.All(cv.string, vol.Length(max=80))},
        vol.Optional("order", default=dict): {vol.In(LIST_SECTIONS): [_ID]},
        vol.Optional("added", default=dict): {vol.In(LIST_SECTIONS): [cv.entity_id]},
    }
)


class Overrides:
    """Loaded once at setup; every change is saved and the open screens get the new layout."""

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass
        self.store: Store[dict[str, Any]] = Store(hass, 1, STORAGE_KEY)
        self.data: dict[str, Any] = dict(EMPTY)

    async def async_load(self) -> None:
        self.data = SCHEMA((await self.store.async_load()) or {})

    async def async_save(self, data: dict[str, Any]) -> None:
        self.data = SCHEMA(data)
        # Names left empty mean "Alvuna's own name": they are not kept.
        self.data["names"] = {k: v.strip() for k, v in self.data["names"].items() if v.strip()}
        await self.store.async_save(self.data)
        async_dispatcher_send(self.hass, SIGNAL_LAYOUT)

    async def async_set_hidden(self, item_id: str, hidden: bool) -> None:
        ids = [i for i in self.data["hidden"] if i != item_id] + ([item_id] if hidden else [])
        await self.async_save({**self.data, "hidden": ids})


@callback
def overrides(hass: HomeAssistant) -> dict[str, Any]:
    data: Overrides | None = hass.data.get(DATA_OVERRIDES)
    return data.data if data else dict(EMPTY)
