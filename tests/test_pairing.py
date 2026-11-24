"""Pairing a TV, its channel and its removal."""

from http import HTTPStatus
from unittest.mock import patch

from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResultType
from homeassistant.helpers import device_registry as dr
from homeassistant.setup import async_setup_component
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.alvuna.const import DOMAIN


async def _setup(hass: HomeAssistant):
    assert await async_setup_component(hass, "http", {})
    entry = MockConfigEntry(domain=DOMAIN, unique_id=DOMAIN, options={"source": "auto"})
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


def _flow(hass, request_id):
    return next(f for f in hass.config_entries.flow.async_progress_by_handler(DOMAIN)
                if f["context"].get("unique_id") == f"tv-{request_id}")


async def test_pair_approve_and_remove(hass: HomeAssistant, hass_client_no_auth, hass_ws_client) -> None:
    await _setup(hass)
    client = await hass_client_no_auth()
    start = await client.post("/api/alvuna/pair", json={"name": "Salon"})
    assert start.status == HTTPStatus.OK
    req = await start.json()
    assert len(req["code"]) == 6
    status_url = f"/api/alvuna/pair/{req['request_id']}"

    assert (await client.get(status_url)).status == HTTPStatus.NOT_FOUND  # no secret
    waiting = await client.get(status_url, headers={"X-Alvuna-Secret": req["secret"]})
    assert waiting.status == HTTPStatus.ACCEPTED

    flow = _flow(hass, req["request_id"])
    assert flow["context"]["source"] == "integration_discovery"
    result = await hass.config_entries.flow.async_configure(flow["flow_id"], {"name": "TV w salonie"})
    assert result["type"] is FlowResultType.CREATE_ENTRY
    await hass.async_block_till_done()
    tv_entry = result["result"]
    user = await hass.auth.async_get_user(tv_entry.data["user_id"])
    assert user.name == "Alvuna TV · TV w salonie"
    assert not user.is_admin and user.local_only

    paired = await client.get(status_url, headers={"X-Alvuna-Secret": req["secret"]})
    assert paired.status == HTTPStatus.OK
    tokens = (await paired.json())["tokens"]
    assert tokens["refresh_token"] and tokens["clientId"].endswith("/alvuna/tv/")
    # Collected once only.
    assert (await client.get(status_url, headers={"X-Alvuna-Secret": req["secret"]})).status == HTTPStatus.NOT_FOUND

    # The TV refreshes like a browser.
    refreshed = await client.post("/auth/token", data={"grant_type": "refresh_token", "client_id": tokens["clientId"],
                                                       "refresh_token": tokens["refresh_token"]})
    assert refreshed.status == HTTPStatus.OK

    sensor = "binary_sensor.tv_w_salonie_connected"
    assert hass.states.get(sensor).state == "off"
    ws = await hass_ws_client(hass, access_token=tokens["access_token"])
    await ws.send_json_auto_id({"type": "alvuna/tv/subscribe"})
    assert (await ws.receive_json())["result"] == {"paired": True}
    await hass.async_block_till_done()
    assert hass.states.get(sensor).state == "on"

    [device] = dr.async_entries_for_config_entry(dr.async_get(hass), tv_entry.entry_id)
    await hass.services.async_call(DOMAIN, "notify", {"message": "Ktoś dzwoni", "device_id": [device.id]}, blocking=True)
    event = (await ws.receive_json())["event"]
    assert event == {"type": "notify", "message": "Ktoś dzwoni", "title": None, "seconds": 10}

    await ws.close()
    await hass.async_block_till_done()
    assert hass.states.get(sensor).state == "off"

    assert await hass.config_entries.async_remove(tv_entry.entry_id)
    assert await hass.auth.async_get_user(user.id) is None


async def test_limits_and_expiry(hass: HomeAssistant, hass_client_no_auth) -> None:
    await _setup(hass)
    client = await hass_client_no_auth()
    codes = [await client.post("/api/alvuna/pair", json={}) for _ in range(4)]
    assert [c.status for c in codes] == [200, 200, 200, HTTPStatus.TOO_MANY_REQUESTS]
    first = await codes[0].json()
    with patch("custom_components.alvuna.pairing.time.monotonic", return_value=10**9):
        gone = await client.get(f"/api/alvuna/pair/{first['request_id']}", headers={"X-Alvuna-Secret": first["secret"]})
        assert gone.status == HTTPStatus.NOT_FOUND
        await hass.async_block_till_done()
        assert not hass.config_entries.flow.async_progress_by_handler(DOMAIN)


async def test_person_browser_gets_empty_channel(hass: HomeAssistant, hass_ws_client) -> None:
    await _setup(hass)
    ws = await hass_ws_client(hass)
    await ws.send_json_auto_id({"type": "alvuna/tv/subscribe"})
    assert (await ws.receive_json())["result"] == {"paired": False}
