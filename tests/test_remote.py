"""The panel's Televisions tab: what TVs report, commands to them and their settings."""

from homeassistant.core import HomeAssistant
from homeassistant.setup import async_setup_component
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.alvuna.const import DOMAIN


async def _setup(hass: HomeAssistant):
    assert await async_setup_component(hass, "http", {})
    entry = MockConfigEntry(domain=DOMAIN, unique_id=DOMAIN, options={"source": "auto", "tv_screensaver_minutes": 5})
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()


async def _pair(hass: HomeAssistant, client, name: str = "Salon"):
    """A TV paired the way the app does it; returns its config entry and access token."""
    req = await (await client.post("/api/alvuna/pair", json={"name": "LG TV"})).json()
    flow = next(f for f in hass.config_entries.flow.async_progress_by_handler(DOMAIN)
                if f["context"].get("unique_id") == f"tv-{req['request_id']}")
    result = await hass.config_entries.flow.async_configure(flow["flow_id"], {"code": req["code"], "name": name})
    await hass.async_block_till_done()
    tokens = (await (await client.get(f"/api/alvuna/pair/{req['request_id']}",
                                      headers={"X-Alvuna-Secret": req["secret"]})).json())["tokens"]
    return result["result"], tokens["access_token"]


async def _tvs(ws) -> dict:
    """The next update of the Televisions tab."""
    msg = await ws.receive_json()
    assert msg["type"] == "event", msg
    return msg["event"]


async def test_report_settings_and_commands(hass: HomeAssistant, hass_client_no_auth, hass_ws_client) -> None:
    await _setup(hass)
    client = await hass_client_no_auth()
    tv_entry, token = await _pair(hass, client)

    admin = await hass_ws_client(hass)
    await admin.send_json_auto_id({"type": "alvuna/tvs/subscribe"})
    assert (await admin.receive_json())["success"]
    first = await _tvs(admin)
    [tv] = first["tvs"]
    assert tv["entry_id"] == tv_entry.entry_id and tv["name"] == "Salon" and tv["device_id"]
    assert tv["connected"] is False and tv["last_seen"] is None
    assert first["defaults"] == {"saver": 5, "exit": 10}

    # A command to a TV that is off.
    await admin.send_json_auto_id({"type": "alvuna/tvs/command", "entry_id": tv_entry.entry_id, "command": "reload"})
    assert (await admin.receive_json())["error"]["code"] == "not_connected"

    # Settings changed while it is off wait for it.
    await admin.send_json_auto_id({"type": "alvuna/tvs/settings", "entry_id": tv_entry.entry_id,
                                   "settings": {"accent": "dab", "saver": None}})
    assert (await admin.receive_json())["result"] == {"pending": True}
    tv = (await _tvs(admin))["tvs"][0]
    assert tv["pending"] and tv["settings"] == {"accent": "dab", "saver": None}

    ws = await hass_ws_client(hass, access_token=token)
    await ws.send_json_auto_id({"type": "alvuna/tv/subscribe"})
    assert (await ws.receive_json())["result"] == {"paired": True}
    assert (await ws.receive_json())["event"] == {"type": "settings", "settings": {"accent": "dab", "saver": None}, "rev": 1}
    assert (await _tvs(admin))["tvs"][0]["connected"] is True

    # A report from before it applied them does not overwrite them: it is sent them again.
    await ws.send_json_auto_id({"type": "alvuna/tv/report", "rev": 0, "settings": {"accent": "limonka", "glass": "frost"},
                                "status": {"view": "home", "idle": 30, "platform": "webos", "future": 1}})
    assert (await ws.receive_json())["event"]["type"] == "settings"
    assert (await ws.receive_json())["result"] == {"paired": True, "channel": True}
    tv = (await _tvs(admin))["tvs"][0]
    assert tv["pending"] and tv["settings"]["accent"] == "dab"
    assert tv["status"] == {"view": "home", "idle": 30, "platform": "webos"}
    assert tv["last_seen"]

    # Once applied, what the TV reports is its settings (changed with the remote since).
    await ws.send_json_auto_id({"type": "alvuna/tv/report", "rev": 1, "settings": {"accent": "turkus", "glass": "solid"},
                                "status": {"view": "panel", "detail": "room:Salon"}})
    assert (await ws.receive_json())["result"] == {"paired": True, "channel": True}
    tv = (await _tvs(admin))["tvs"][0]
    assert not tv["pending"] and tv["settings"] == {"accent": "turkus", "glass": "solid"}

    # Commands reach the TV.
    await admin.send_json_auto_id({"type": "alvuna/tvs/command", "entry_id": tv_entry.entry_id, "command": "open",
                                   "target": "room:salon"})
    assert (await admin.receive_json())["success"]
    assert (await ws.receive_json())["event"] == {"type": "command", "command": "open", "target": "room:salon"}
    await admin.send_json_auto_id({"type": "alvuna/tvs/command", "entry_id": tv_entry.entry_id, "command": "notify",
                                   "message": "Obiad!"})
    assert (await admin.receive_json())["success"]
    assert (await ws.receive_json())["event"] == {"type": "notify", "message": "Obiad!", "title": None, "seconds": 10}
    await admin.send_json_auto_id({"type": "alvuna/tvs/command", "entry_id": tv_entry.entry_id, "command": "open",
                                   "target": "nowhere"})
    assert not (await admin.receive_json())["success"]

    # Errors the TV logs.
    await ws.send_json_auto_id({"type": "alvuna/tv/log", "entries": [{"level": "error", "message": "x is undefined"},
                                                                     {"level": "nonsense", "message": "dropped"}]})
    assert (await ws.receive_json())["success"]
    [line] = (await _tvs(admin))["tvs"][0]["log"]
    assert line["message"] == "x is undefined" and line["at"]
    await admin.send_json_auto_id({"type": "alvuna/tvs/clear_log", "entry_id": tv_entry.entry_id})
    assert (await admin.receive_json())["success"]
    assert (await _tvs(admin))["tvs"][0]["log"] == []

    await ws.close()
    await hass.async_block_till_done()
    tv = (await _tvs(admin))["tvs"][0]
    assert tv["connected"] is False and tv["since"] is None

    # A TV that reconnected without its channel (Home Assistant restarting) is told so, and opens it again.
    ws = await hass_ws_client(hass, access_token=token)
    await ws.send_json_auto_id({"type": "alvuna/tv/report", "rev": 1, "status": {"view": "home"}})
    assert (await ws.receive_json())["result"] == {"paired": True, "channel": False}
    await _tvs(admin)
    await ws.close()
    await hass.async_block_till_done()

    # Removing the TV forgets it.
    assert await hass.config_entries.async_remove(tv_entry.entry_id)
    await hass.async_block_till_done()
    while (update := await _tvs(admin))["tvs"]:
        pass
    assert update["tvs"] == []


async def test_only_admins_and_tvs(hass: HomeAssistant, hass_client_no_auth, hass_ws_client) -> None:
    await _setup(hass)
    client = await hass_client_no_auth()
    tv_entry, token = await _pair(hass, client)
    ws = await hass_ws_client(hass, access_token=token)
    # A TV's user is no administrator: it cannot command other TVs or read them.
    await ws.send_json_auto_id({"type": "alvuna/tvs/subscribe"})
    assert (await ws.receive_json())["error"]["code"] == "unauthorized"
    await ws.send_json_auto_id({"type": "alvuna/tvs/command", "entry_id": tv_entry.entry_id, "command": "reload"})
    assert (await ws.receive_json())["error"]["code"] == "unauthorized"
    # A person's browser reporting is not a TV.
    admin = await hass_ws_client(hass)
    await admin.send_json_auto_id({"type": "alvuna/tv/report", "status": {"view": "home"}})
    assert (await admin.receive_json())["result"] == {"paired": False}
    await admin.send_json_auto_id({"type": "alvuna/tvs/settings", "entry_id": "nope", "settings": {}})
    assert (await admin.receive_json())["error"]["code"] == "not_found"
    await admin.send_json_auto_id({"type": "alvuna/tvs/settings", "entry_id": tv_entry.entry_id, "settings": {"glass": "x"}})
    assert (await admin.receive_json())["error"]["code"] == "invalid_format"
