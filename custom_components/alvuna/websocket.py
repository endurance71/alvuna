"""WebSocket commands for the card and the TV app."""

from __future__ import annotations

import time
from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.auth.permissions.const import POLICY_READ
from homeassistant.core import Event, HomeAssistant, callback
from homeassistant.exceptions import HomeAssistantError, Unauthorized
from homeassistant.helpers import config_validation as cv
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


FORECAST_TTL = 900  # seconds; forecasts change hourly at most, and every tablet and TV would otherwise ask on its own
DATA_FORECASTS = f"{DOMAIN}_forecasts"


@callback
def async_register_commands(hass: HomeAssistant) -> None:
    websocket_api.async_register_command(hass, ws_subscribe_layout)
    websocket_api.async_register_command(hass, ws_forecast)


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/forecast",
        vol.Required("entity_id"): cv.entity_domain("weather"),
        vol.Required("forecast_type"): vol.In(["daily", "hourly", "twice_daily"]),
    }
)
@websocket_api.async_response
async def ws_forecast(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    """A weather entity's forecast, shared by every screen for a quarter of an hour. An empty list when the entity
    has no such forecast."""
    entity_id, kind = msg["entity_id"], msg["forecast_type"]
    if not connection.user.permissions.check_entity(entity_id, POLICY_READ):
        raise Unauthorized(entity_id=entity_id)
    cache: dict[tuple[str, str], tuple[float, list[Any]]] = hass.data.setdefault(DATA_FORECASTS, {})
    hit = cache.get((entity_id, kind))
    if hit is None or time.monotonic() - hit[0] > FORECAST_TTL:
        try:
            res = await hass.services.async_call("weather", "get_forecasts", {"type": kind}, target={"entity_id": entity_id},
                                                 blocking=True, return_response=True)
            forecast = (res or {}).get(entity_id, {}).get("forecast") or []
        except HomeAssistantError:
            forecast = []
        hit = (time.monotonic(), forecast)
        cache[(entity_id, kind)] = hit
    connection.send_result(msg["id"], {"forecast": hit[1], "age": int(time.monotonic() - hit[0])})


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
