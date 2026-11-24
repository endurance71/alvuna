"""The automatic layout and its subscription."""

from homeassistant.core import HomeAssistant
from homeassistant.helpers import area_registry as ar
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers import floor_registry as fr
from homeassistant.setup import async_setup_component
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.alvuna.const import DOMAIN
from custom_components.alvuna.layout import build_editor, build_layout, readable


def _entity(hass, registry, entity_id, area=None, state="on", **attrs):
    domain, obj = entity_id.split(".")
    entry = registry.async_get_or_create(domain, "test", obj, suggested_object_id=obj)
    if area:
        registry.async_update_entity(entry.entity_id, area_id=area)
    hass.states.async_set(entry.entity_id, state, attrs)
    return entry


async def _home(hass: HomeAssistant):
    floors, areas, ents = fr.async_get(hass), ar.async_get(hass), er.async_get(hass)
    up = floors.async_create("Piętro", level=1)
    down = floors.async_create("Parter", level=0)
    bedroom = areas.async_create("Sypialnia", floor_id=up.floor_id, icon="mdi:bed")
    living = areas.async_create("Salon", floor_id=down.floor_id)
    hall = areas.async_create("Korytarz", floor_id=down.floor_id)
    garage = areas.async_create("Garaż")
    _entity(hass, ents, "light.salon", living.id)
    _entity(hass, ents, "light.lampka", bedroom.id)
    _entity(hass, ents, "sensor.salon_temp", living.id, "21.5", device_class="temperature")
    _entity(hass, ents, "binary_sensor.korytarz_ruch", hall.id, device_class="motion")
    _entity(hass, ents, "cover.garaz", garage.id, "closed")
    _entity(hass, ents, "media_player.tv", living.id, "off")
    _entity(hass, ents, "binary_sensor.drzwi", hall.id, "off", device_class="door")
    _entity(hass, ents, "scene.film")
    _entity(hass, ents, "weather.dom", None, "cloudy")
    _entity(hass, ents, "person.ala", None, "home")
    hidden = _entity(hass, ents, "light.ukryte", living.id)
    ents.async_update_entity(hidden.entity_id, hidden_by=er.RegistryEntryHider.USER)
    config = _entity(hass, ents, "light.konfig", living.id)
    ents.async_update_entity(config.entity_id, entity_category=er.EntityCategory.CONFIG)
    return {"living": living.id, "bedroom": bedroom.id, "garage": garage.id}


async def test_layout_from_areas(hass: HomeAssistant) -> None:
    ids = await _home(hass)
    layout = build_layout(hass, {})
    names = [r["name"] for r in layout["rooms"]]
    # Ground floor first, then up, areas without a floor last; a hallway with only a motion sensor gets no tile.
    assert names == ["Salon", "Sypialnia", "Garaż"]
    salon = layout["rooms"][0]
    assert salon["lights"] == [{"entity": "light.salon", "name": "salon"}]
    assert salon["temperature"] == "sensor.salon_temp"
    assert layout["rooms"][1]["icon"] == "mdi:bed"
    assert [c["entity"] for c in layout["rooms"][2]["covers"]] == ["cover.garaz"]
    assert layout["media"] == [{"entity": "media_player.tv", "room": "Salon", "name": "tv"}]
    assert [x["entity"] for x in layout["security"]] == ["binary_sensor.drzwi"]
    assert [x["entity"] for x in layout["scenes"]] == ["scene.film"]
    assert layout["weather"] == "weather.dom"
    assert layout["persons"] == ["person.ala"]


async def test_area_sensor_choice(hass: HomeAssistant) -> None:
    ids = await _home(hass)
    areas, ents = ar.async_get(hass), er.async_get(hass)
    _entity(hass, ents, "sensor.salon_wilg", ids["living"], "50", device_class="humidity")
    # The area names a humidity sensor that no longer reports (renamed or removed) and an existing temperature one.
    _entity(hass, ents, "sensor.stary", ids["living"], "40", device_class="humidity")
    _entity(hass, ents, "sensor.salon_temp2", ids["living"], "22", device_class="temperature")
    areas.async_update(ids["living"], humidity_entity_id="sensor.stary", temperature_entity_id="sensor.salon_temp2")
    hass.states.async_remove("sensor.stary")
    salon = build_layout(hass, {})["rooms"][0]
    assert salon["temperature"] == "sensor.salon_temp2"
    assert salon["humidity"] == "sensor.salon_wilg"


async def test_hiding(hass: HomeAssistant) -> None:
    ids = await _home(hass)
    layout = build_layout(hass, {}, {"hidden": [f"area:{ids['garage']}", "light.lampka"]})
    assert [r["name"] for r in layout["rooms"]] == ["Salon"]


async def test_subscription_follows_changes(hass: HomeAssistant, hass_ws_client) -> None:
    ids = await _home(hass)
    assert await async_setup_component(hass, "http", {})
    entry = MockConfigEntry(domain=DOMAIN, unique_id=DOMAIN)
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": "alvuna/layout/subscribe"})
    assert (await client.receive_json())["success"]
    first = (await client.receive_json())["event"]
    assert first["source"] == "auto"
    assert len(first["config"]["rooms"]) == 3

    await client.send_json_auto_id({"type": "alvuna/layout/hide", "item": f"area:{ids['garage']}"})
    assert (await client.receive_json())["success"]
    from homeassistant.util import dt as dt_util
    from pytest_homeassistant_custom_component.common import async_fire_time_changed
    from datetime import timedelta
    async_fire_time_changed(hass, dt_util.utcnow() + timedelta(seconds=3))
    await hass.async_block_till_done()
    second = (await client.receive_json())["event"]
    assert [r["name"] for r in second["config"]["rooms"]] == ["Salon", "Sypialnia"]


async def test_forecast_is_shared(hass: HomeAssistant, hass_ws_client) -> None:
    from homeassistant.core import SupportsResponse

    assert await async_setup_component(hass, "http", {})
    hass.states.async_set("weather.dom", "cloudy")
    calls = []

    async def get_forecasts(call):
        calls.append(call)
        return {"weather.dom": {"forecast": [{"temperature": 4}]}}

    hass.services.async_register("weather", "get_forecasts", get_forecasts, supports_response=SupportsResponse.ONLY)
    assert await async_setup_component(hass, DOMAIN, {})
    client = await hass_ws_client(hass)
    for _ in range(2):
        await client.send_json_auto_id({"type": "alvuna/forecast", "entity_id": "weather.dom", "forecast_type": "hourly"})
        res = await client.receive_json()
        assert res["result"]["forecast"] == [{"temperature": 4}]
    assert len(calls) == 1


def test_readable_names() -> None:
    assert readable("kontaktron-szafa", "x") == "Szafa"
    assert readable("Drzwi wejściowe", "x") == "Drzwi wejściowe"
    assert readable("motion_sensor_kitchen", "x") == "Motion kitchen"
    assert readable("192_168_10_193 Garaż przód", "x") == "Garaż przód"
    assert readable("192.168.1.20", "kamera") == "kamera"


async def test_overrides_rename_order_add(hass: HomeAssistant) -> None:
    ids = await _home(hass)
    ents = er.async_get(hass)
    _entity(hass, ents, "script.otworz_brame", None, "off", friendly_name="Otwórz bramę")
    ov = {"names": {"area:" + ids["living"]: "Dzienny", "light.salon": "Sufit"},
          "order": {"rooms": ["area:" + ids["garage"]]}, "added": {"scenes": ["script.otworz_brame"]}}
    layout = build_layout(hass, {}, ov)
    assert [r["name"] for r in layout["rooms"]] == ["Garaż", "Dzienny", "Sypialnia"]
    assert layout["rooms"][1]["lights"][0]["name"] == "Sufit"
    assert [x["entity"] for x in layout["scenes"]] == ["scene.film", "script.otworz_brame"]
    editor = build_editor(hass, {}, ov)
    assert editor["sections"]["scenes"][1] == {"id": "script.otworz_brame", "auto_name": "Otwórz bramę", "name": "",
                                                "hidden": False, "added": True}
    assert "script.otworz_brame" not in [c["id"] for c in editor["sections"]["scenes_candidates"]]


async def test_room_thermometer_and_one_player_per_device(hass: HomeAssistant) -> None:
    from homeassistant.helpers import device_registry as dr
    from pytest_homeassistant_custom_component.common import MockConfigEntry as Entry
    areas, ents, devs = ar.async_get(hass), er.async_get(hass), dr.async_get(hass)
    room = areas.async_create("Dzienny")
    cfg = Entry(domain="test"); cfg.add_to_hass(hass)

    def dev(name):
        d = devs.async_get_or_create(config_entry_id=cfg.entry_id, identifiers={("test", name)}, name=name)
        devs.async_update_device(d.id, area_id=room.id)
        return d.id

    def ent(entity_id, device_id, platform="test", state="1", **attrs):
        domain, obj = entity_id.split(".")
        e = ents.async_get_or_create(domain, platform, obj, suggested_object_id=obj, device_id=device_id)
        hass.states.async_set(e.entity_id, state, attrs)
        return e.entity_id

    radiator, sensor, tv = dev("grzejnik"), dev("czujnik"), dev("tv")
    ent("sensor.czujnik_grzejnik_temperature", radiator, state="36.9", device_class="temperature")
    ent("sensor.pokoj_temperature", sensor, state="21.5", device_class="temperature")
    ent("sensor.pokoj_humidity", sensor, state="50", device_class="humidity")
    ent("media_player.tv_cast", tv, platform="cast")
    ent("media_player.tv_dlna", tv, platform="dlna_dmr")
    ent("media_player.tv_android", tv, platform="androidtv_remote")
    layout = build_layout(hass, {})
    r = layout["rooms"][0]
    assert r["temperature"] == "sensor.pokoj_temperature" and r["humidity"] == "sensor.pokoj_humidity"
    assert [m["entity"] for m in layout["media"]] == ["media_player.tv_android"]


async def test_washdata_and_waste(hass: HomeAssistant) -> None:
    from homeassistant.helpers import device_registry as dr
    from pytest_homeassistant_custom_component.common import MockConfigEntry as Entry
    ents, devs = er.async_get(hass), dr.async_get(hass)
    cfg = Entry(domain="ha_washdata"); cfg.add_to_hass(hass)
    d = devs.async_get_or_create(config_entry_id=cfg.entry_id, identifiers={("w", "1")}, name="Zmywarka")
    for obj, key in (("zmywarka_stan", "washer_state"), ("zmywarka_postep", "cycle_progress")):
        e = ents.async_get_or_create("sensor", "ha_washdata", obj, suggested_object_id=obj, device_id=d.id, translation_key=key)
        hass.states.async_set(e.entity_id, "off")
    hass.states.async_set("calendar.papier", "off", {"friendly_name": "Papier"})
    hass.states.async_set("calendar.urodziny", "off", {"friendly_name": "Urodziny"})
    layout = build_layout(hass, {})
    assert layout["appliances"] == [{"name": "Zmywarka", "icon": "mdi:dishwasher", "state": "sensor.zmywarka_stan",
                                     "progress": "sensor.zmywarka_postep"}]
    assert layout["waste"] == ["calendar.papier"]


async def test_editor_needs_admin(hass: HomeAssistant, hass_ws_client, hass_read_only_access_token) -> None:
    assert await async_setup_component(hass, "http", {})
    entry = MockConfigEntry(domain=DOMAIN, unique_id=DOMAIN)
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    admin = await hass_ws_client(hass)
    await admin.send_json_auto_id({"type": "alvuna/editor/save", "overrides": {"hidden": ["light.x"], "names": {"light.y": "Lampa"}}})
    assert (await admin.receive_json())["success"]
    await admin.send_json_auto_id({"type": "alvuna/editor/get"})
    got = (await admin.receive_json())["result"]
    assert got["overrides"]["names"] == {"light.y": "Lampa"} and got["overrides"]["hidden"] == ["light.x"]
    user = await hass_ws_client(hass, hass_read_only_access_token)
    await user.send_json_auto_id({"type": "alvuna/editor/get"})
    assert not (await user.receive_json())["success"]


async def test_removing_alvuna_forgets_the_panel_changes(hass: HomeAssistant, hass_ws_client, hass_storage) -> None:
    assert await async_setup_component(hass, "http", {})
    entry = MockConfigEntry(domain=DOMAIN, unique_id=DOMAIN)
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": "alvuna/layout/hide", "item": "light.x"})
    assert (await client.receive_json())["success"]
    await hass.async_block_till_done()
    assert "alvuna.layout" in hass_storage
    assert await hass.config_entries.async_remove(entry.entry_id)
    await hass.async_block_till_done()
    assert "alvuna.layout" not in hass_storage
