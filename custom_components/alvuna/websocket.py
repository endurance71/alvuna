"""WebSocket commands for the card and the TV app."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import Event, HomeAssistant, callback
from homeassistant.helpers.area_registry import EVENT_AREA_REGISTRY_UPDATED
from homeassistant.helpers.debounce import Debouncer
from homeassistant.helpers.device_registry import EVENT_DEVICE_REGISTRY_UPDATED
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.entity_registry import EVENT_ENTITY_REGISTRY_UPDATED
from homeassistant.helpers.floor_registry import EVENT_FLOOR_REGISTRY_UPDATED

from .const import CONF_DASHBOARD, CONF_SOURCE, DOMAIN, SIGNAL_LAYOUT, SOURCE_AUTO, SOURCE_DASHBOARD
from .layout import build_layout

REGISTRY_EVENTS = (EVENT_AREA_REGISTRY_UPDATED, EVENT_DEVICE_REGISTRY_UPDATED, EVENT_ENTITY_REGISTRY_UPDATED,
                   EVENT_FLOOR_REGISTRY_UPDATED)


@callback
def async_register_commands(hass: HomeAssistant) -> None:
    websocket_api.async_register_command(hass, ws_subscribe_layout)


def current_layout(hass: HomeAssistant) -> dict[str, Any]:
    """What the frontend should show: the built layout, or which dashboard's card to read instead."""
    entries = hass.config_entries.async_loaded_entries(DOMAIN)
    if not entries:
        return {"source": None}
    options = dict(entries[0].options)
    if options.get(CONF_SOURCE) == SOURCE_DASHBOARD and options.get(CONF_DASHBOARD):
        return {"source": SOURCE_DASHBOARD, "dashboard": options[CONF_DASHBOARD]}
    return {"source": SOURCE_AUTO, "config": build_layout(hass, options)}


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/layout/subscribe"})
@websocket_api.async_response
async def ws_subscribe_layout(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    """Send the layout now and again whenever areas, devices, entities, floors or Alvuna's options change."""
    msg_id = msg["id"]
    last: dict[str, Any] | None = None

    @callback
    def send() -> None:
        nonlocal last
        layout = current_layout(hass)
        if layout != last:  # registry events are frequent (a renamed sensor); most change nothing here
            last = layout
            connection.send_message(websocket_api.event_message(msg_id, layout))

    # A burst of registry changes (an integration adding fifty entities) ends in a single update.
    debouncer = Debouncer(hass, None, cooldown=2, immediate=False, function=send)

    @callback
    def changed(_event: Event | None = None) -> None:
        debouncer.async_schedule_call()

    unsubs = [hass.bus.async_listen(event, changed) for event in REGISTRY_EVENTS]
    unsubs.append(async_dispatcher_connect(hass, SIGNAL_LAYOUT, changed))

    @callback
    def unsubscribe() -> None:
        for unsub in unsubs:
            unsub()
        debouncer.async_cancel()

    connection.subscriptions[msg_id] = unsubscribe
    connection.send_result(msg_id)
    send()
