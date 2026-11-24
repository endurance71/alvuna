"""The home's layout for the card and the TV, built from Home Assistant's own areas, floors and entities.

The result has the shape of the card's YAML config (rooms, scenes, persons, weather, security, cameras, media, climate,
vacuum), so the frontend reads it exactly as it reads a hand-written config. The options flow only hides things and
picks a few entities; everything else follows the registries, so a new light in an area shows up by itself.
"""

from __future__ import annotations

from collections.abc import Iterable
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


def _usable(entry: er.RegistryEntry | None, hidden: set[str]) -> bool:
    if entry is None:
        return True  # entities without a registry entry (YAML) cannot be hidden or categorised: keep them
    return not (entry.disabled_by or entry.hidden_by or entry.entity_category or entry.platform in SKIP_PLATFORMS
                or entry.entity_id in hidden)


def _area_of(entry: er.RegistryEntry | None, devices: dr.DeviceRegistry) -> str | None:
    if entry is None:
        return None
    if entry.area_id:
        return entry.area_id
    if entry.device_id and (device := devices.async_get(entry.device_id)):
        return device.area_id
    return None


def _device_class(state: State, entry: er.RegistryEntry | None) -> str | None:
    if entry and (entry.device_class or entry.original_device_class):
        return entry.device_class or entry.original_device_class
    return state.attributes.get("device_class")


def _first(states: Iterable[State]) -> str | None:
    return next((s.entity_id for s in states), None)


def build_layout(hass: HomeAssistant, options: dict[str, Any]) -> dict[str, Any]:
    """The layout as a card config. Runs in the event loop; reads registries and states only."""
    areas, floors = ar.async_get(hass), fr.async_get(hass)
    devices, entities = dr.async_get(hass), er.async_get(hass)
    hidden_areas = set(options.get(CONF_HIDDEN_AREAS, []))
    hidden = set(options.get(CONF_HIDDEN_ENTITIES, []))

    by_area: dict[str | None, list[tuple[State, er.RegistryEntry | None]]] = {}
    everywhere: list[tuple[State, er.RegistryEntry | None]] = []
    for state in sorted(hass.states.async_all(), key=lambda s: s.entity_id):
        entry = entities.async_get(state.entity_id)
        if not _usable(entry, hidden):
            continue
        everywhere.append((state, entry))
        by_area.setdefault(_area_of(entry, devices), []).append((state, entry))

    def of(items: list[tuple[State, er.RegistryEntry | None]], domain: str, classes: set[str] | None = None) -> list[State]:
        return [s for s, e in items if s.domain == domain and (classes is None or _device_class(s, e) in classes)]

    # Ground floor first, then up (floors without a level after them, areas without a floor last); within a floor the
    # registry's own order.
    level = {f.floor_id: f.level for f in floors.async_list_floors()}

    def place(area: ar.AreaEntry) -> tuple[int, int]:
        if area.floor_id not in level:
            return (2, 0)
        return (0, level[area.floor_id]) if level[area.floor_id] is not None else (1, 0)

    ordered = sorted(areas.async_list_areas(), key=place)

    rooms, media = [], []
    for area in ordered:
        if area.id in hidden_areas:
            continue
        items = by_area.get(area.id, [])
        room: dict[str, Any] = {"name": area.name, "area": area.id}
        if area.icon:
            room["icon"] = area.icon
        for key, domain in (("lights", "light"), ("covers", "cover"), ("humidifiers", "humidifier")):
            if found := [s.entity_id for s in of(items, domain)]:
                room[key] = found
        for key, attr, device_class in (("temperature", "temperature_entity_id", "temperature"),
                                        ("humidity", "humidity_entity_id", "humidity")):
            chosen = getattr(area, attr)
            # The area's own choice, unless hidden or gone (areas keep the old id after an entity is renamed).
            if chosen and (chosen in hidden or hass.states.get(chosen) is None):
                chosen = None
            if found := chosen or _first(of(items, "sensor", {device_class})):
                room[key] = found
        players = [{"entity": s.entity_id, "room": area.name} for s in of(items, "media_player")]
        media += players
        # An area with nothing to show or switch (a hallway with only a motion sensor) gets no tile.
        if players or any(k in room for k in ("lights", "covers", "humidifiers", "temperature", "humidity")):
            rooms.append(room)

    layout: dict[str, Any] = {"rooms": rooms}
    if scenes := [{"entity": s.entity_id} for s in of(everywhere, "scene")]:
        layout["scenes"] = scenes
    if persons := [s.entity_id for s in of(everywhere, "person")]:
        layout["persons"] = persons
    weather = options.get(CONF_WEATHER) or _first(of(everywhere, "weather"))
    if weather:
        layout["weather"] = weather
    if security := [s.entity_id for s in of(everywhere, "binary_sensor", SECURITY_CLASSES)]:
        layout["security"] = security
    if cameras := [{"entity": s.entity_id} for s in of(everywhere, "camera")]:
        layout["cameras"] = cameras
    if media:
        layout["media"] = media
    if climate := _first(of(everywhere, "climate")):
        layout["climate"] = {"entity": climate}
    if vacuum := _first(of(everywhere, "vacuum")):
        layout["vacuum"] = {"entity": vacuum}
    layout["tv_screensaver_minutes"] = options.get(CONF_TV_SAVER, DEFAULT_TV_SAVER)
    layout["tv_idle_minutes"] = options.get(CONF_TV_IDLE, DEFAULT_TV_IDLE)
    return layout
