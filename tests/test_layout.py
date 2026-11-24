"""The automatic layout and its subscription."""

from homeassistant.core import HomeAssistant
from homeassistant.helpers import area_registry as ar
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers import floor_registry as fr
from homeassistant.setup import async_setup_component
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.alvuna.const import CONF_HIDDEN_AREAS, CONF_HIDDEN_ENTITIES, CONF_SOURCE, DOMAIN
from custom_components.alvuna.layout import build_layout


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
    assert salon == {"name": "Salon", "area": ids["living"], "lights": ["light.salon"], "temperature": "sensor.salon_temp"}
    assert layout["rooms"][1]["icon"] == "mdi:bed"
    assert layout["rooms"][2]["covers"] == ["cover.garaz"]
    assert layout["media"] == [{"entity": "media_player.tv", "room": "Salon"}]
    assert layout["security"] == ["binary_sensor.drzwi"]
    assert layout["scenes"] == [{"entity": "scene.film"}]
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
    layout = build_layout(hass, {CONF_HIDDEN_AREAS: [ids["garage"]], CONF_HIDDEN_ENTITIES: ["light.lampka"]})
    assert [r["name"] for r in layout["rooms"]] == ["Salon"]


async def test_subscription_follows_changes(hass: HomeAssistant, hass_ws_client) -> None:
    ids = await _home(hass)
    assert await async_setup_component(hass, "http", {})
    entry = MockConfigEntry(domain=DOMAIN, unique_id=DOMAIN, options={CONF_SOURCE: "auto"})
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": "alvuna/layout/subscribe"})
    assert (await client.receive_json())["success"]
    first = (await client.receive_json())["event"]
    assert first["source"] == "auto"
    assert len(first["config"]["rooms"]) == 3

    hass.config_entries.async_update_entry(entry, options={CONF_SOURCE: "auto", CONF_HIDDEN_AREAS: [ids["garage"]]})
    await hass.async_block_till_done()
    from homeassistant.util import dt as dt_util
    from pytest_homeassistant_custom_component.common import async_fire_time_changed
    from datetime import timedelta
    async_fire_time_changed(hass, dt_util.utcnow() + timedelta(seconds=3))
    await hass.async_block_till_done()
    second = (await client.receive_json())["event"]
    assert [r["name"] for r in second["config"]["rooms"]] == ["Salon", "Sypialnia"]

    hass.config_entries.async_update_entry(entry, options={CONF_SOURCE: "dashboard", "dashboard": "dom-test"})
    await hass.async_block_till_done()
    async_fire_time_changed(hass, dt_util.utcnow() + timedelta(seconds=6))
    await hass.async_block_till_done()
    assert (await client.receive_json())["event"] == {"source": "dashboard", "dashboard": "dom-test"}


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
