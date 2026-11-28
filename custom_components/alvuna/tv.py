"""Paired TVs while they run: which are connected, what each one shows, its settings, and messages sent to it.

A TV keeps one channel open (alvuna/tv/subscribe) that carries everything sent to it: notifications, a camera, a
command from the Alvuna panel, settings changed there. It tells Home Assistant how it is doing with alvuna/tv/report
(what is on screen, the minutes since the last key press, its settings) and alvuna/tv/log (its errors). The panel's
Televisions tab follows all of this through alvuna/tvs/subscribe and acts with alvuna/tvs/command and alvuna/tvs/settings.

Settings belong to the TV (they are kept in its storage, and changed with its remote); Home Assistant keeps the copy
the TV last reported. A change in the panel raises the copy's revision; the TV applies it (now, or when it next
connects) and reports that revision back, so a TV still on an older one is sent the newer settings instead of having
its report overwrite them.
"""

from __future__ import annotations

from collections import deque
from collections.abc import Callable
from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.const import ATTR_DEVICE_ID, ATTR_ENTITY_ID
from homeassistant.core import HomeAssistant, ServiceCall, callback
from homeassistant.exceptions import ServiceValidationError
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers.dispatcher import async_dispatcher_connect, async_dispatcher_send
from homeassistant.helpers.storage import Store
from homeassistant.loader import async_get_integration
from homeassistant.util import dt as dt_util

from .const import CONF_KIND, CONF_TV_IDLE, CONF_TV_SAVER, CONF_USER_ID, DOMAIN, KIND_TV, SIGNAL_TV

DATA_TVS = f"{DOMAIN}_tvs"  # entry_id -> {subscription id: send}
DATA_REMOTE = f"{DOMAIN}_remote"  # the TvStore
SIGNAL_TVS = f"{DOMAIN}_tvs_changed"  # anything the Televisions tab shows changed
STORAGE_KEY = f"{DOMAIN}.tvs"
LOG_SIZE = 50  # errors kept per TV, in memory only

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


def _text(n: int) -> vol.All:
    return vol.All(cv.string, vol.Length(max=n))


_MINUTES = vol.Any(None, vol.All(vol.Coerce(int), vol.Range(min=0, max=1440)))
# The rows of the TV's home screen (frontend/src/tv/ui/home.js ROWS) and a tile's id in them.
ROWS = ["working", "scenes", "rooms", "media", "climate", "security"]
_TILE = _text(255)
# This TV's own layout: rows in its order, rows and tiles it hides, tiles in its order per row.
LAYOUT_SCHEMA = vol.Schema(
    {
        vol.Optional("rows"): vol.All([vol.In(ROWS)], vol.Length(max=len(ROWS))),
        vol.Optional("hidden_rows"): vol.All([vol.In(ROWS)], vol.Length(max=len(ROWS))),
        vol.Optional("hidden"): vol.All([_TILE], vol.Length(max=500)),
        vol.Optional("order"): {vol.In(ROWS): vol.All([_TILE], vol.Length(max=500))},
    }
)
# What the TV can show, as it reports it for the panel's layout editor.
CATALOG_SCHEMA = vol.All(
    [vol.Schema({vol.Required("key"): vol.In(ROWS), vol.Required("title"): _text(80),
                 vol.Required("items"): vol.All([vol.Schema({vol.Required("id"): _TILE, vol.Optional("name", default=""): _text(80),
                                                             vol.Optional("icon", default=""): _text(80)})], vol.Length(max=300))})],
    vol.Length(max=len(ROWS)),
)
# A TV's settings (frontend/src/tv/ui/prefs.js, wallpapers.js, accents.js). Wallpaper and accent are ids the TV knows;
# one it does not know leaves its own.
SETTINGS_SCHEMA = vol.Schema(
    {
        vol.Optional("wallpaper"): _text(40),
        vol.Optional("accent"): _text(40),
        vol.Optional("glass"): vol.In(["frost", "solid", "clear"]),
        vol.Optional("ring"): cv.boolean,
        vol.Optional("anim"): cv.boolean,
        vol.Optional("dim"): cv.boolean,
        vol.Optional("shift"): cv.boolean,
        vol.Optional("saver"): _MINUTES,  # None: Alvuna's option in Home Assistant
        vol.Optional("exit"): _MINUTES,
        vol.Optional("layout"): LAYOUT_SCHEMA,
    }
)
# What a TV says about itself. Unknown keys (from a newer TV app) are dropped.
STATUS_SCHEMA = vol.Schema(
    {
        vol.Optional("platform"): vol.In(["webos", "androidtv", "browser"]),
        vol.Optional("ua"): _text(400),
        vol.Optional("screen"): _text(24),
        vol.Optional("view"): vol.In(["home", "panel", "camera", "saver", "pairing", "error"]),
        vol.Optional("detail"): _text(120),  # the panel's kind and name, or the camera's name
        vol.Optional("dimmed"): cv.boolean,
        vol.Optional("idle"): vol.All(vol.Coerce(int), vol.Range(min=0)),  # seconds since the last key press
        vol.Optional("uptime"): vol.All(vol.Coerce(int), vol.Range(min=0)),  # seconds since the app started
        vol.Optional("home"): _text(80),
        vol.Optional("homes"): vol.All(vol.Coerce(int), vol.Range(min=0, max=99)),
        vol.Optional("language"): _text(16),
    },
    extra=vol.REMOVE_EXTRA,
)
LOG_ENTRY = vol.Schema(
    {vol.Required("level"): vol.In(["error", "warning"]), vol.Required("message"): _text(1000),
     vol.Optional("source"): _text(200), vol.Optional("at"): vol.All(vol.Coerce(int), vol.Range(min=0))},
    extra=vol.REMOVE_EXTRA,
)
# What the panel can ask of a TV that is on.
COMMANDS = ["reload", "home", "saver_on", "saver_off", "open", "notify", "camera", "exit"]
OPEN_TARGET = vol.Any(vol.In(["summary", "weather", "climate", "settings"]), vol.Match(r"^room:[^\s]{1,255}$"))


class TvStore:
    """What Home Assistant remembers of each TV across restarts: its settings (with their revision and the revision
    the TV last applied), when it was last seen and what it said then. Errors stay in memory."""

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass
        self.store: Store[dict[str, Any]] = Store(hass, 1, STORAGE_KEY)
        self.tvs: dict[str, dict[str, Any]] = {}
        self.logs: dict[str, deque[dict[str, Any]]] = {}
        self.since: dict[str, str] = {}  # entry_id -> when the TV's channel opened, while it is open

    async def async_load(self) -> None:
        self.tvs = ((await self.store.async_load()) or {}).get("tvs", {})

    def tv(self, entry_id: str) -> dict[str, Any]:
        return self.tvs.setdefault(entry_id, {"settings": {}, "rev": 0, "applied": 0, "last_seen": None, "status": {}})

    @callback
    def changed(self, *, save: bool = True) -> None:
        if save:
            self.store.async_delay_save(lambda: {"tvs": self.tvs}, 5)
        async_dispatcher_send(self.hass, SIGNAL_TVS)

    @callback
    def forget(self, entry_id: str) -> None:
        self.tvs.pop(entry_id, None)
        self.logs.pop(entry_id, None)
        self.since.pop(entry_id, None)
        self.changed()


def _remote(hass: HomeAssistant) -> TvStore:
    return hass.data[DATA_REMOTE]


def connected(hass: HomeAssistant, entry_id: str) -> bool:
    return bool(hass.data.get(DATA_TVS, {}).get(entry_id))


@callback
def _tv_entries(hass: HomeAssistant) -> list:
    return [e for e in hass.config_entries.async_entries(DOMAIN) if e.data.get(CONF_KIND) == KIND_TV]


@callback
def _tv_entry_for_user(hass: HomeAssistant, user_id: str | None) -> str | None:
    for entry in _tv_entries(hass):
        if entry.data.get(CONF_USER_ID) == user_id:
            return entry.entry_id
    return None


@callback
def _settings_event(tv: dict[str, Any]) -> dict[str, Any]:
    return {"type": "settings", "settings": tv["settings"], "rev": tv["rev"]}


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/tv/subscribe"})
@callback
def ws_subscribe_tv(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    """A TV app's channel: marks the TV connected while open and carries the messages sent to it.

    A browser signed in with a person's account gets an open channel that never carries anything."""
    msg_id = msg["id"]
    entry_id = _tv_entry_for_user(hass, connection.user.id if connection.user else None)
    tvs: dict[str, dict[tuple[int, int], Callable[[dict[str, Any]], None]]] = hass.data.setdefault(DATA_TVS, {})
    remote = _remote(hass)

    @callback
    def send(event: dict[str, Any]) -> None:
        connection.send_message(websocket_api.event_message(msg_id, event))

    @callback
    def unsubscribe() -> None:
        if entry_id and tvs.get(entry_id, {}).pop((id(connection), msg_id), None):
            if not tvs.get(entry_id):
                remote.since.pop(entry_id, None)
                remote.tv(entry_id)["last_seen"] = dt_util.utcnow().isoformat()
                remote.changed()
            async_dispatcher_send(hass, SIGNAL_TV.format(entry_id))

    if entry_id:
        tvs.setdefault(entry_id, {})[(id(connection), msg_id)] = send
        remote.since.setdefault(entry_id, dt_util.utcnow().isoformat())
        remote.changed(save=False)
        async_dispatcher_send(hass, SIGNAL_TV.format(entry_id))
    connection.subscriptions[msg_id] = unsubscribe
    connection.send_result(msg_id, {"paired": entry_id is not None})
    # Settings changed in the panel while the TV was off.
    if entry_id and (tv := remote.tv(entry_id))["rev"] > tv["applied"]:
        send(_settings_event(tv))


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/tv/report",
        vol.Optional("status", default=dict): dict,
        vol.Optional("settings"): dict,
        vol.Optional("rev", default=0): vol.All(vol.Coerce(int), vol.Range(min=0)),
        vol.Optional("catalog"): list,
    }
)
@callback
def ws_report(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    """A TV says what it shows and which settings it has (as of the revision it last applied)."""
    entry_id = _tv_entry_for_user(hass, connection.user.id if connection.user else None)
    if entry_id is None:
        connection.send_result(msg["id"], {"paired": False})
        return
    try:
        status = STATUS_SCHEMA(msg["status"])
        settings = SETTINGS_SCHEMA(msg["settings"]) if "settings" in msg else None
        catalog = CATALOG_SCHEMA(msg["catalog"]) if "catalog" in msg else None
    except vol.Invalid as err:
        connection.send_error(msg["id"], "invalid_format", str(err))
        return
    remote = _remote(hass)
    tv = remote.tv(entry_id)
    tv["status"] = status
    tv["last_seen"] = dt_util.utcnow().isoformat()
    if catalog is not None:
        tv["catalog"] = catalog
    if settings is not None:
        if msg["rev"] >= tv["rev"]:
            # Up to date with the panel: what the TV has is what it chose since, with its remote.
            tv["settings"], tv["applied"] = settings, tv["rev"]
        else:
            # Behind (it missed a change, or reported before applying it): it gets the newer settings again.
            _send(hass, [entry_id], _settings_event(tv))
    remote.changed()
    # "channel": whether this TV's channel is open. After Home Assistant restarts, a TV can reconnect before Alvuna's
    # commands exist, and its channel's resubscription fails; this tells it to open the channel again.
    connection.send_result(msg["id"], {"paired": True, "channel": connected(hass, entry_id)})


@websocket_api.websocket_command(
    {vol.Required("type"): f"{DOMAIN}/tv/log", vol.Required("entries"): vol.All(list, vol.Length(max=20))}
)
@callback
def ws_log(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    """A TV's errors, for the panel (debugging on a TV is otherwise hard)."""
    entry_id = _tv_entry_for_user(hass, connection.user.id if connection.user else None)
    if entry_id is None:
        connection.send_result(msg["id"], {"paired": False})
        return
    remote = _remote(hass)
    log = remote.logs.setdefault(entry_id, deque(maxlen=LOG_SIZE))
    now = int(dt_util.utcnow().timestamp() * 1000)
    for raw in msg["entries"]:
        try:
            entry = LOG_ENTRY(raw)
        except vol.Invalid:
            continue
        entry.setdefault("at", now)
        log.append(entry)
    remote.changed(save=False)
    connection.send_result(msg["id"], {"paired": True})


@callback
def _tvs_payload(hass: HomeAssistant) -> dict[str, Any]:
    remote = _remote(hass)
    devices = dr.async_get(hass)
    options: dict[str, Any] = {}
    for entry in hass.config_entries.async_entries(DOMAIN):
        if not entry.data.get(CONF_KIND):
            options = dict(entry.options)
    out = []
    for entry in _tv_entries(hass):
        tv = remote.tvs.get(entry.entry_id) or {"settings": {}, "rev": 0, "applied": 0, "last_seen": None, "status": {}}
        device = next(iter(dr.async_entries_for_config_entry(devices, entry.entry_id)), None)
        out.append({
            "entry_id": entry.entry_id,
            "device_id": device.id if device else None,
            "name": entry.title,
            "connected": connected(hass, entry.entry_id),
            "since": remote.since.get(entry.entry_id),
            "last_seen": tv["last_seen"],
            "status": tv["status"],
            "settings": tv["settings"],
            "catalog": tv.get("catalog", []),
            "pending": tv["rev"] > tv["applied"],
            "log": list(remote.logs.get(entry.entry_id, ())),
        })
    return {
        "tvs": out,
        "version": hass.data.get(f"{DOMAIN}_version"),
        "defaults": {"saver": options.get(CONF_TV_SAVER, 2), "exit": options.get(CONF_TV_IDLE, 10)},
    }


@websocket_api.require_admin
@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/tvs/subscribe"})
@callback
def ws_subscribe_tvs(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    """The Televisions tab: every paired TV now and whenever one connects, reports, logs or is changed."""
    msg_id = msg["id"]

    @callback
    def send() -> None:
        connection.send_message(websocket_api.event_message(msg_id, _tvs_payload(hass)))

    # Also sent when a TV is paired, renamed or removed (__init__.py).
    connection.subscriptions[msg_id] = async_dispatcher_connect(hass, SIGNAL_TVS, send)
    connection.send_result(msg_id)
    send()


@callback
def _tv_entry(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> str | None:
    entry_id = msg["entry_id"]
    if not any(e.entry_id == entry_id for e in _tv_entries(hass)):
        connection.send_error(msg["id"], "not_found", "No such TV")
        return None
    return entry_id


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/tvs/command",
        vol.Required("entry_id"): cv.string,
        vol.Required("command"): vol.In(COMMANDS),
        vol.Optional("target"): OPEN_TARGET,
        vol.Optional("message"): vol.All(cv.string, vol.Length(min=1, max=500)),
        vol.Optional("title"): vol.All(cv.string, vol.Length(max=120)),
        vol.Optional("seconds"): vol.All(vol.Coerce(int), vol.Range(min=2, max=3600)),
        vol.Optional(ATTR_ENTITY_ID): cv.entity_domain("camera"),
    }
)
@callback
def ws_command(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    """Something the panel asks of a TV that has Alvuna open."""
    if (entry_id := _tv_entry(hass, connection, msg)) is None:
        return
    if not connected(hass, entry_id):
        connection.send_error(msg["id"], "not_connected", "The TV does not have Alvuna open")
        return
    command = msg["command"]
    if command == "notify":
        if "message" not in msg:
            connection.send_error(msg["id"], "invalid_format", "message required")
            return
        event = {"type": "notify", "message": msg["message"], "title": msg.get("title"), "seconds": msg.get("seconds", 10)}
    elif command == "camera":
        if ATTR_ENTITY_ID not in msg:
            connection.send_error(msg["id"], "invalid_format", "entity_id required")
            return
        event = {"type": "camera", "entity_id": msg[ATTR_ENTITY_ID], "seconds": msg.get("seconds", 60)}
    elif command == "open":
        if "target" not in msg:
            connection.send_error(msg["id"], "invalid_format", "target required")
            return
        event = {"type": "command", "command": "open", "target": msg["target"]}
    else:
        event = {"type": "command", "command": command}
    _send(hass, [entry_id], event)
    connection.send_result(msg["id"])


@websocket_api.require_admin
@websocket_api.websocket_command(
    {vol.Required("type"): f"{DOMAIN}/tvs/settings", vol.Required("entry_id"): cv.string, vol.Required("settings"): dict}
)
@callback
def ws_settings(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    """Settings changed in the panel: kept, and sent to the TV now (or when it next connects)."""
    if (entry_id := _tv_entry(hass, connection, msg)) is None:
        return
    try:
        change = SETTINGS_SCHEMA(msg["settings"])
    except vol.Invalid as err:
        connection.send_error(msg["id"], "invalid_format", str(err))
        return
    remote = _remote(hass)
    tv = remote.tv(entry_id)
    tv["settings"] = {**tv["settings"], **change}
    tv["rev"] += 1
    _send(hass, [entry_id], _settings_event(tv))
    connection.send_result(msg["id"], {"pending": tv["rev"] > tv["applied"]})
    remote.changed()


@websocket_api.require_admin
@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/tvs/clear_log", vol.Required("entry_id"): cv.string})
@callback
def ws_clear_log(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    if (entry_id := _tv_entry(hass, connection, msg)) is None:
        return
    remote = _remote(hass)
    remote.logs.pop(entry_id, None)
    connection.send_result(msg["id"])
    remote.changed(save=False)


@callback
def _targets(hass: HomeAssistant, call: ServiceCall) -> list[str]:
    """TV entries named by device_id, or every paired TV."""
    tv_entries = {e.entry_id for e in _tv_entries(hass)}
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
def async_forget(hass: HomeAssistant, entry_id: str) -> None:
    """A removed TV: nothing of it is kept."""
    if remote := hass.data.get(DATA_REMOTE):
        remote.forget(entry_id)


async def async_register(hass: HomeAssistant) -> None:
    """The TV channel, the Televisions tab's commands and the services, once per run."""
    remote = TvStore(hass)
    await remote.async_load()
    hass.data[DATA_REMOTE] = remote
    hass.data[f"{DOMAIN}_version"] = str((await async_get_integration(hass, DOMAIN)).version or "")
    for command in (ws_subscribe_tv, ws_report, ws_log, ws_subscribe_tvs, ws_command, ws_settings, ws_clear_log):
        websocket_api.async_register_command(hass, command)

    async def notify(call: ServiceCall) -> None:
        _send(hass, _targets(hass, call), {"type": "notify", "message": call.data["message"],
                                           "title": call.data.get("title"), "seconds": call.data["seconds"]})

    async def show_camera(call: ServiceCall) -> None:
        _send(hass, _targets(hass, call), {"type": "camera", "entity_id": call.data[ATTR_ENTITY_ID],
                                           "seconds": call.data["seconds"]})

    hass.services.async_register(DOMAIN, SERVICE_NOTIFY, notify, schema=NOTIFY_SCHEMA)
    hass.services.async_register(DOMAIN, SERVICE_SHOW_CAMERA, show_camera, schema=CAMERA_SCHEMA)
