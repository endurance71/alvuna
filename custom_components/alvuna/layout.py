"""The home's layout for the card and the TV, built from Home Assistant's own areas, floors, devices and entities.

Nobody writes it: Alvuna reads the registries and recognises what it knows (rooms from areas, the room's thermometer,
one player per TV, the washing machine from WashData, waste calendars, air quality, weather warnings...). What the
household wants different (hide this, add that script as a scene, call it "Telewizor", put the kitchen first) is kept
as overrides, edited in the Alvuna panel, and applied on top every time the layout is built.

The result has the shape of the card's config, so the tablet card and the TV app read it like any card config.
"""

from __future__ import annotations

from dataclasses import dataclass, field
import re
from typing import Any

from homeassistant.core import HomeAssistant, State
from homeassistant.helpers import area_registry as ar
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers import floor_registry as fr

from .const import (
    CONF_HIDDEN_AREAS,
    CONF_HIDDEN_ENTITIES,
    CONF_TV_IDLE,
    CONF_TV_SAVER,
    CONF_WEATHER,
    DEFAULT_TV_IDLE,
    DEFAULT_TV_SAVER,
)

# Binary sensors worth a place in the security row: a door left open, smoke, a leak.
SECURITY_CLASSES = {"door", "garage_door", "window", "opening", "smoke", "moisture", "gas", "carbon_monoxide", "safety", "tamper"}
# Integrations whose entities describe phones and browsers, not the home.
SKIP_PLATFORMS = {"mobile_app", "browser_mod"}
# One player per device: a TV often shows up through several integrations at once (its own, Cast, DLNA).
PLAYER_RANK = {"webostv": 0, "androidtv_remote": 0, "androidtv": 1, "apple_tv": 0, "samsungtv": 0, "braviatv": 0,
               "philips_js": 0, "sonos": 0, "heos": 1, "yamaha_musiccast": 1, "cast": 2, "dlna_dmr": 9}
# Thermostats that schedule others rather than heat a room.
CLIMATE_SKIP = {"climate_scheduler", "scheduler"}
CLIMATE_RANK = {"better_thermostat": 0, "generic_thermostat": 2}
# A temperature sensor on a radiator or a valve is not the room's temperature.
NOT_ROOM_TEMP = re.compile(r"grzejn|kaloryf|radiat|heater|trv|valve|zaw[oó]r|boiler|kocio|chip|cpu|board", re.I)
WASTE_WORDS = re.compile(r"odpad|[sś]mie[cć]|gabaryt|szk[lł]o|metal|tworzyw|plasti|bio|odzie[zż]|tekstyl|zmiesz|papier|"
                         r"waste|trash|garbage|recycl|paper|glass|compost|bin\b|rest", re.I)
# Words that only say what kind of sensor it is; dropped when a raw name ("kontaktron-szafa") is made readable.
SENSOR_WORDS = {"kontaktron", "czujnik", "sensor", "contact", "door", "window", "drzwi", "okno", "binary", "zalanie",
                "leak", "dym", "smoke", "switch", "xiaomi", "aqara", "tuya", "zigbee", "status"}
# WashData (a washing machine or dishwasher watched through a smart plug): its entities by translation key.
WASHDATA = {"washer_state": "state", "washer_program": "program", "current_phase": "phase", "time_remaining": "remaining",
            "total_duration": "duration", "cycle_progress": "progress", "current_power": "power", "cycle_count": "cycles",
            "pause_cycle": "pause", "resume_cycle": "resume"}

# Lists the household can reorder, hide items in and add to in the panel.
LIST_SECTIONS = ("rooms", "scenes", "security", "cameras", "media", "persons")


IP_IN_NAME = re.compile(r"\b\d{1,3}([._-])\d{1,3}\1\d{1,3}\1\d{1,3}\b[\s:_-]*")


def readable(name: str | None, fallback: str) -> str:
    """A name a person would write: "kontaktron-szafa" -> "Szafa", "motion_sensor_kitchen" -> "Kitchen",
    "192_168_10_193 Garaż przód" -> "Garaż przód" (cameras often carry their address)."""
    name = IP_IN_NAME.sub("", (name or "").strip()).strip() or fallback
    if " " in name or not re.search(r"[-_]", name):
        return name
    words = [w for w in re.split(r"[-_]+", name) if w and w.lower() not in SENSOR_WORDS and not w.isdigit()]
    text = " ".join(words) or name.replace("_", " ").replace("-", " ")
    return text[:1].upper() + text[1:]


@dataclass
class Home:
    """What the registries say, gathered once per build."""

    hass: HomeAssistant
    hidden: set[str]
    entities: er.EntityRegistry
    devices: dr.DeviceRegistry
    items: list[tuple[State, er.RegistryEntry | None]] = field(default_factory=list)
    by_area: dict[str | None, list[tuple[State, er.RegistryEntry | None]]] = field(default_factory=dict)
    by_device: dict[str, list[tuple[State, er.RegistryEntry | None]]] = field(default_factory=dict)

    def area_of(self, entry: er.RegistryEntry | None) -> str | None:
        if entry is None:
            return None
        if entry.area_id:
            return entry.area_id
        if entry.device_id and (device := self.devices.async_get(entry.device_id)):
            return device.area_id
        return None

    def name(self, entity_id: str) -> str:
        state = self.hass.states.get(entity_id)
        return readable(state.attributes.get("friendly_name") if state else None, entity_id.split(".", 1)[1])


def _usable(entry: er.RegistryEntry | None, hidden: set[str]) -> bool:
    if entry is None:
        return True  # entities without a registry entry (YAML) cannot be hidden or categorised: keep them
    return not (entry.disabled_by or entry.hidden_by or entry.entity_category or entry.platform in SKIP_PLATFORMS
                or entry.entity_id in hidden)


def _device_class(state: State, entry: er.RegistryEntry | None) -> str | None:
    if entry and (entry.device_class or entry.original_device_class):
        return entry.device_class or entry.original_device_class
    return state.attributes.get("device_class")


def _of(items: list[tuple[State, er.RegistryEntry | None]], domain: str, classes: set[str] | None = None) -> list[tuple[State, er.RegistryEntry | None]]:
    return [(s, e) for s, e in items if s.domain == domain and (classes is None or _device_class(s, e) in classes)]


def _gather(hass: HomeAssistant, hidden: set[str]) -> Home:
    home = Home(hass, hidden, er.async_get(hass), dr.async_get(hass))
    for state in sorted(hass.states.async_all(), key=lambda s: s.entity_id):
        entry = home.entities.async_get(state.entity_id)
        if not _usable(entry, hidden):
            continue
        home.items.append((state, entry))
        home.by_area.setdefault(home.area_of(entry), []).append((state, entry))
        if entry and entry.device_id:
            home.by_device.setdefault(entry.device_id, []).append((state, entry))
    return home


def _room_sensor(home: Home, items: list, area: ar.AreaEntry, kind: str) -> str | None:
    """The area's thermometer (or hygrometer): its own choice when it still reports, else the best guess: a device
    measuring both temperature and humidity (a room sensor), never one on a radiator or a valve."""
    chosen = getattr(area, f"{kind}_entity_id")
    if chosen and chosen not in home.hidden and home.hass.states.get(chosen) is not None:
        return chosen
    other = "humidity" if kind == "temperature" else "temperature"

    def score(pair: tuple[State, er.RegistryEntry | None]) -> int:
        state, entry = pair
        points = 0
        siblings = home.by_device.get(entry.device_id, []) if entry and entry.device_id else []
        if any(s.domain == "sensor" and _device_class(s, e) == other for s, e in siblings):
            points += 3
        if any(s.domain == "climate" for s, _ in siblings):
            points -= 3  # a thermostatic valve
        if NOT_ROOM_TEMP.search(f"{state.entity_id} {state.attributes.get('friendly_name', '')}"):
            points -= 4
        return points

    candidates = [p for p in _of(items, "sensor", {kind}) if score(p) > -3]
    return max(candidates, key=score)[0].entity_id if candidates else None


def _players(home: Home, items: list) -> list[str]:
    """One media player per device, the one from the device's own integration rather than Cast or DLNA."""
    best: dict[str, tuple[int, str]] = {}
    loose: list[str] = []
    for state, entry in _of(items, "media_player"):
        rank = PLAYER_RANK.get(entry.platform if entry else "", 5)
        if not entry or not entry.device_id:
            loose.append(state.entity_id)
        elif entry.device_id not in best or rank < best[entry.device_id][0]:
            best[entry.device_id] = (rank, state.entity_id)
    return sorted([e for _, e in best.values()] + loose)


def _auto(hass: HomeAssistant, options: dict[str, Any], hidden: set[str]) -> dict[str, Any]:
    """The layout before the household's overrides: lists of ids plus what goes with them."""
    home = _gather(hass, hidden)
    areas, floors = ar.async_get(hass), fr.async_get(hass)
    level = {f.floor_id: f.level for f in floors.async_list_floors()}

    def place(area: ar.AreaEntry) -> tuple[int, int]:
        # Ground floor first, then up; floors without a level after them; areas without a floor last.
        if area.floor_id not in level:
            return (2, 0)
        return (0, level[area.floor_id]) if level[area.floor_id] is not None else (1, 0)

    rooms: list[dict[str, Any]] = []
    media: list[dict[str, Any]] = []
    for area in sorted(areas.async_list_areas(), key=place):
        items = home.by_area.get(area.id, [])
        room: dict[str, Any] = {"id": f"area:{area.id}", "name": area.name, "area": area.id}
        if area.icon:
            room["icon"] = area.icon
        for key, domain in (("lights", "light"), ("covers", "cover"), ("humidifiers", "humidifier")):
            if found := [s.entity_id for s, _ in _of(items, domain)]:
                room[key] = found
        for kind in ("temperature", "humidity"):
            if found := _room_sensor(home, items, area, kind):
                room[kind] = found
        players = _players(home, items)
        media += [{"entity": p, "room": area.name} for p in players]
        # An area with nothing to show or switch (a hallway with only a motion sensor) gets no tile.
        if players or any(k in room for k in ("lights", "covers", "humidifiers", "temperature", "humidity")):
            rooms.append(room)
    placed = {m["entity"] for m in media}
    media += [{"entity": p} for p in _players(home, home.by_area.get(None, [])) if p not in placed]

    auto: dict[str, Any] = {
        "rooms": rooms,
        "scenes": [s.entity_id for s, _ in _of(home.items, "scene")],
        "persons": [s.entity_id for s, _ in _of(home.items, "person")],
        "security": [s.entity_id for s, _ in _of(home.items, "binary_sensor", SECURITY_CLASSES)],
        "cameras": [s.entity_id for s, _ in _of(home.items, "camera")],
        "media": media,
        "_home": home,
    }
    weather = options.get(CONF_WEATHER) or next((s.entity_id for s, _ in _of(home.items, "weather")), None)
    if weather:
        auto["weather"] = weather
    climates = [(s, e) for s, e in _of(home.items, "climate") if not (e and e.platform in CLIMATE_SKIP)]
    if climates:
        auto["climate"] = {"entity": min(climates, key=lambda p: CLIMATE_RANK.get(p[1].platform if p[1] else "", 1))[0].entity_id}
    if vacuums := _of(home.items, "vacuum"):
        state, entry = vacuums[0]
        vacuum: dict[str, Any] = {"entity": state.entity_id}
        siblings = home.by_device.get(entry.device_id, []) if entry and entry.device_id else []
        if battery := next((s.entity_id for s, e in siblings if s.domain == "sensor" and _device_class(s, e) == "battery"), None):
            vacuum["battery"] = battery
        auto["vacuum"] = vacuum
    # Washing machines and dishwashers watched by WashData, one appliance per device.
    appliances = []
    for device_id, siblings in home.by_device.items():
        keys = {WASHDATA[e.translation_key]: s.entity_id for s, e in siblings
                if e and e.platform == "ha_washdata" and e.translation_key in WASHDATA}
        if "state" in keys:
            device = home.devices.async_get(device_id)
            name = (device.name_by_user or device.name) if device else home.name(keys["state"])
            dish = re.search(r"zmyw|dish|spül", name or "", re.I)
            appliances.append({"name": name, "icon": "mdi:dishwasher" if dish else "mdi:washing-machine", **keys})
    if appliances:
        auto["appliances"] = sorted(appliances, key=lambda a: a["name"])
    # Waste collection calendars, recognised by their names (a fraction or "waste").
    if waste := [s.entity_id for s, _ in _of(home.items, "calendar")
                 if WASTE_WORDS.search(f"{s.entity_id} {s.attributes.get('friendly_name', '')}")]:
        auto["waste"] = waste
    # Air quality and weather warnings from the national services Home Assistant integrates.
    air = {}
    for state, entry in home.items:
        if entry and entry.platform in ("gios", "airly", "waqi", "luftdaten", "airvisual", "airvisual_pro"):
            dc = _device_class(state, entry)
            if (entry.translation_key == "aqi" or dc == "aqi") and "index" not in air:
                air["index"] = state.entity_id
            elif dc == "pm10" and "pm10" not in air:
                air["pm10"] = state.entity_id
            elif dc == "pm25" and "pm25" not in air:
                air["pm25"] = state.entity_id
        if entry and entry.translation_key == "weather_alert" and "weather_alert" not in auto:
            auto["weather_alert"] = state.entity_id
    if air:
        auto["air_quality"] = air
    return auto


def _ordered(ids: list[str], order: list[str]) -> list[str]:
    """ids in the household's order: the ones it placed first, in its order, then the rest as they come."""
    rank = {i: n for n, i in enumerate(order)}
    return sorted(ids, key=lambda i: (rank.get(i, len(rank)), ids.index(i)))


def build_layout(hass: HomeAssistant, options: dict[str, Any], overrides: dict[str, Any] | None = None) -> dict[str, Any]:
    """The layout as a card config, with the household's overrides applied. Reads registries and states only."""
    ov = overrides or {}
    hidden = set(ov.get("hidden", [])) | set(options.get(CONF_HIDDEN_ENTITIES, []))
    hidden |= {f"area:{a}" for a in options.get(CONF_HIDDEN_AREAS, [])}
    names: dict[str, str] = ov.get("names", {})
    order: dict[str, list[str]] = ov.get("order", {})
    added: dict[str, list[str]] = ov.get("added", {})
    auto = _auto(hass, options, hidden)
    home: Home = auto.pop("_home")

    def item(entity_id: str, **extra: Any) -> dict[str, Any]:
        out = {"entity": entity_id, **extra}
        out["name"] = names.get(entity_id) or home.name(entity_id)
        return out

    def section(key: str, ids: list[str]) -> list[str]:
        extra = [i for i in added.get(key, []) if i not in ids and i not in hidden and hass.states.get(i) is not None]
        return _ordered([i for i in ids if i not in hidden] + extra, order.get(key, []))

    rooms = []
    by_id = {r["id"]: r for r in auto["rooms"]}
    for rid in _ordered([r["id"] for r in auto["rooms"]], order.get("rooms", [])):
        if rid in hidden:
            continue
        room = dict(by_id[rid])
        room["name"] = names.get(rid) or room["name"]
        for key in ("lights", "covers", "humidifiers"):
            if key in room:
                kept = [item(e) for e in room[key] if e not in hidden]
                if kept:
                    room[key] = kept
                else:
                    del room[key]
        rooms.append({k: v for k, v in room.items() if k != "id"})

    layout: dict[str, Any] = {"rooms": rooms}
    for key in ("scenes", "security", "cameras", "persons"):
        if ids := section(key, auto[key]):
            layout[key] = [item(i) for i in ids] if key != "persons" else ids
    rooms_of = {m["entity"]: m.get("room") for m in auto["media"]}
    if ids := section("media", list(rooms_of)):
        layout["media"] = [item(i, **({"room": rooms_of[i]} if rooms_of.get(i) else {})) for i in ids]
    for key in ("weather", "climate", "vacuum", "appliances", "waste", "air_quality", "weather_alert"):
        if key in auto:
            layout[key] = auto[key]
    layout["tv_screensaver_minutes"] = options.get(CONF_TV_SAVER, DEFAULT_TV_SAVER)
    layout["tv_idle_minutes"] = options.get(CONF_TV_IDLE, DEFAULT_TV_IDLE)
    return layout


def build_editor(hass: HomeAssistant, options: dict[str, Any], overrides: dict[str, Any] | None = None) -> dict[str, Any]:
    """What the Alvuna panel shows: every section with every item Alvuna found (hidden ones too, marked), the names
    it would use on its own, and what could be added to each list."""
    ov = overrides or {}
    hidden = set(ov.get("hidden", []))
    names: dict[str, str] = ov.get("names", {})
    order: dict[str, list[str]] = ov.get("order", {})
    added: dict[str, list[str]] = ov.get("added", {})
    auto = _auto(hass, options, set())
    home: Home = auto.pop("_home")

    def entry(i: str, auto_name: str | None = None, **extra: Any) -> dict[str, Any]:
        return {"id": i, "auto_name": auto_name or home.name(i), "name": names.get(i, ""), "hidden": i in hidden, **extra}

    rooms = []
    by_id = {r["id"]: r for r in auto["rooms"]}
    for rid in _ordered(list(by_id), order.get("rooms", [])):
        r = by_id[rid]
        parts = [entry(e, kind=k) for k in ("lights", "covers", "humidifiers") for e in r.get(k, [])]
        sensors = {k: r[k] for k in ("temperature", "humidity") if k in r}
        rooms.append({**entry(rid, r["name"]), "icon": r.get("icon"), "items": parts, "sensors": sensors})

    sections: dict[str, Any] = {"rooms": rooms}
    candidates_by = {
        "scenes": [s.entity_id for s in hass.states.async_all(("scene", "script"))],
        "security": [s.entity_id for s in hass.states.async_all("binary_sensor")],
        "cameras": [s.entity_id for s in hass.states.async_all("camera")],
        "media": [s.entity_id for s in hass.states.async_all("media_player")],
        "persons": [s.entity_id for s in hass.states.async_all("person")],
    }
    for key in ("scenes", "security", "cameras", "media", "persons"):
        found = auto[key] if key != "media" else [m["entity"] for m in auto["media"]]
        extra = [i for i in added.get(key, []) if i not in found and hass.states.get(i) is not None]
        ids = _ordered(found + extra, order.get(key, []))
        sections[key] = [entry(i, added=i in extra) for i in ids]
        taken = set(ids)
        sections[f"{key}_candidates"] = sorted(
            ({"id": c, "auto_name": home.name(c)} for c in candidates_by[key] if c not in taken), key=lambda c: c["auto_name"].lower())
    found_extras = {k: auto[k] for k in ("weather", "climate", "vacuum", "appliances", "waste", "air_quality", "weather_alert") if k in auto}
    return {"sections": sections, "found": found_extras, "overrides": {"hidden": sorted(hidden), "names": names,
                                                                       "order": order, "added": added}}
