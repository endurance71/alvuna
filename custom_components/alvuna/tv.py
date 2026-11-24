"""Paired TVs while they run: which are connected, and messages sent to them (notifications, a camera)."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.const import ATTR_DEVICE_ID, ATTR_ENTITY_ID
from homeassistant.core import HomeAssistant, ServiceCall, callback
from homeassistant.exceptions import ServiceValidationError
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers.dispatcher import async_dispatcher_send

from .const import CONF_KIND, CONF_USER_ID, DOMAIN, KIND_TV, SIGNAL_TV

DATA_TVS = f"{DOMAIN}_tvs"  # entry_id -> {subscription id: send}

SERVICE_NOTIFY = "notify"
SERVICE_SHOW_CAMERA = "show_camera"
NOTIFY_SCHEMA = vol.Schema(
    {
        vol.Required("message"): cv.string,
        vol.Optional("title"): cv.string,
        vol.Optional("seconds", default=10): vol.All(vol.Coerce(int), vol.Range(min=2, max=600)),
        vol.Optional(ATTR_DEVICE_ID): vol.All(cv.ensure_list, [cv.string]),
    }
)
CAMERA_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_ENTITY_ID): cv.entity_domain("camera"),
        vol.Optional("seconds", default=60): vol.All(vol.Coerce(int), vol.Range(min=5, max=3600)),
        vol.Optional(ATTR_DEVICE_ID): vol.All(cv.ensure_list, [cv.string]),
    }
)


def connected(hass: HomeAssistant, entry_id: str) -> bool:
    return bool(hass.data.get(DATA_TVS, {}).get(entry_id))


@callback
def _tv_entry_for_user(hass: HomeAssistant, user_id: str | None) -> str | None:
    for entry in hass.config_entries.async_entries(DOMAIN):
        if entry.data.get(CONF_KIND) == KIND_TV and entry.data.get(CONF_USER_ID) == user_id:
            return entry.entry_id
    return None


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/tv/subscribe"})
@callback
def ws_subscribe_tv(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    """A TV app's channel: marks the TV connected while open and carries the messages sent to it.

    A browser signed in with a person's account gets an open channel that never carries anything."""
    msg_id = msg["id"]
    entry_id = _tv_entry_for_user(hass, connection.user.id if connection.user else None)
    tvs: dict[str, dict[tuple[int, int], Callable[[dict[str, Any]], None]]] = hass.data.setdefault(DATA_TVS, {})

    @callback
    def send(event: dict[str, Any]) -> None:
        connection.send_message(websocket_api.event_message(msg_id, event))

    @callback
    def unsubscribe() -> None:
        if entry_id and tvs.get(entry_id, {}).pop((id(connection), msg_id), None):
            async_dispatcher_send(hass, SIGNAL_TV.format(entry_id))

    if entry_id:
        tvs.setdefault(entry_id, {})[(id(connection), msg_id)] = send
        async_dispatcher_send(hass, SIGNAL_TV.format(entry_id))
    connection.subscriptions[msg_id] = unsubscribe
    connection.send_result(msg_id, {"paired": entry_id is not None})


@callback
def _targets(hass: HomeAssistant, call: ServiceCall) -> list[str]:
    """TV entries named by device_id, or every paired TV."""
    tv_entries = {e.entry_id for e in hass.config_entries.async_entries(DOMAIN) if e.data.get(CONF_KIND) == KIND_TV}
    if not (device_ids := call.data.get(ATTR_DEVICE_ID)):
        return list(tv_entries)
    devices = dr.async_get(hass)
    out = []
    for device_id in device_ids:
        device = devices.async_get(device_id)
        found = [e for e in (device.config_entries if device else ()) if e in tv_entries]
        if not found:
            raise ServiceValidationError(translation_domain=DOMAIN, translation_key="not_a_tv",
                                         translation_placeholders={"device_id": device_id})
        out += found
    return out


@callback
def _send(hass: HomeAssistant, entry_ids: list[str], event: dict[str, Any]) -> None:
    for entry_id in entry_ids:
        for send in list(hass.data.get(DATA_TVS, {}).get(entry_id, {}).values()):
            send(event)


@callback
def async_register(hass: HomeAssistant) -> None:
    """The TV channel and the services, once per run."""
    websocket_api.async_register_command(hass, ws_subscribe_tv)

    async def notify(call: ServiceCall) -> None:
        _send(hass, _targets(hass, call), {"type": "notify", "message": call.data["message"],
                                           "title": call.data.get("title"), "seconds": call.data["seconds"]})

    async def show_camera(call: ServiceCall) -> None:
        _send(hass, _targets(hass, call), {"type": "camera", "entity_id": call.data[ATTR_ENTITY_ID],
                                           "seconds": call.data["seconds"]})

    hass.services.async_register(DOMAIN, SERVICE_NOTIFY, notify, schema=NOTIFY_SCHEMA)
    hass.services.async_register(DOMAIN, SERVICE_SHOW_CAMERA, show_camera, schema=CAMERA_SCHEMA)
