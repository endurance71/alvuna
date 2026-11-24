"""Config and options flows for Alvuna."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.config_entries import ConfigEntry, ConfigFlow, ConfigFlowResult, OptionsFlow
from homeassistant.core import callback
from homeassistant.helpers import selector

from .const import (
    CONF_DASHBOARD,
    CONF_KIND,
    CONF_USER_ID,
    KIND_TV,
    CONF_HIDDEN_AREAS,
    CONF_HIDDEN_ENTITIES,
    CONF_SOURCE,
    CONF_TV_IDLE,
    CONF_TV_SAVER,
    CONF_WEATHER,
    DEFAULT_TV_IDLE,
    DEFAULT_TV_SAVER,
    DOMAIN,
    SOURCE_AUTO,
    SOURCE_DASHBOARD,
)
from .pairing import DATA_PAIRING, Pairing

MAX_CODE_TRIES = 5  # wrong codes before the request is dropped and the TV asks for a new one


class AlvunaConfigFlow(ConfigFlow, domain=DOMAIN):
    """Adds Alvuna once per Home Assistant."""

    VERSION = 1
    _request: dict[str, Any]
    _tries = 0

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        await self.async_set_unique_id(DOMAIN)
        self._abort_if_unique_id_configured()
        if user_input is not None:
            return self.async_create_entry(title="Alvuna", data={}, options={CONF_SOURCE: SOURCE_AUTO})
        return self.async_show_form(step_id="user")

    async def async_step_integration_discovery(self, discovery_info: dict[str, Any]) -> ConfigFlowResult:
        """A TV asked to be paired (pairing.py): show it under Discovered with its code."""
        self._request = discovery_info
        await self.async_set_unique_id(f"tv-{discovery_info['request_id']}")
        self.context["title_placeholders"] = {"name": discovery_info["name"]}
        return await self.async_step_pair()

    async def async_step_pair(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        """The admin types the code shown on the TV: proof that they see that screen, not just a click on a card."""
        pairing: Pairing | None = self.hass.data.get(DATA_PAIRING)
        request_id = self._request["request_id"]
        if pairing is None or pairing.get(request_id) is None:
            return self.async_abort(reason="pairing_expired")
        errors: dict[str, str] = {}
        if user_input is not None:
            typed = "".join(str(user_input.get("code", "")).split()).upper()
            if typed != self._request["code"]:
                self._tries += 1
                if self._tries >= MAX_CODE_TRIES:
                    pairing.async_forget(request_id)
                    return self.async_abort(reason="too_many_tries")
                errors["code"] = "wrong_code"
            else:
                name = user_input["name"].strip() or self._request["name"]
                user = await pairing.async_approve(request_id, name, user_input.get("local_only", True))
                if user is None:
                    return self.async_abort(reason="pairing_expired")
                return self.async_create_entry(title=name, data={CONF_KIND: KIND_TV, CONF_USER_ID: user.id})
        schema = vol.Schema({
            vol.Required("code"): selector.TextSelector(),
            vol.Required("name", default=self._request["name"]): selector.TextSelector(),
            vol.Required("local_only", default=True): selector.BooleanSelector(),
        })
        return self.async_show_form(step_id="pair", data_schema=self.add_suggested_values_to_schema(schema, user_input or {}),
                                    errors=errors)

    @classmethod
    @callback
    def async_supports_options_flow(cls, config_entry: ConfigEntry) -> bool:
        """Only Alvuna itself has options; a paired TV has none."""
        return config_entry.data.get(CONF_KIND) != KIND_TV

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> OptionsFlow:
        return AlvunaOptionsFlow()


def _minutes(maximum: int) -> selector.NumberSelector:
    return selector.NumberSelector(selector.NumberSelectorConfig(min=0, max=maximum, step=1, unit_of_measurement="min",
                                                                 mode=selector.NumberSelectorMode.BOX))


OPTIONS_SCHEMA = vol.Schema(
    {
        vol.Required(CONF_SOURCE, default=SOURCE_AUTO): selector.SelectSelector(
            selector.SelectSelectorConfig(options=[SOURCE_AUTO, SOURCE_DASHBOARD], translation_key=CONF_SOURCE)
        ),
        vol.Optional(CONF_DASHBOARD): selector.TextSelector(),
        vol.Optional(CONF_HIDDEN_AREAS): selector.AreaSelector(selector.AreaSelectorConfig(multiple=True)),
        vol.Optional(CONF_HIDDEN_ENTITIES): selector.EntitySelector(selector.EntitySelectorConfig(multiple=True)),
        vol.Optional(CONF_WEATHER): selector.EntitySelector(selector.EntitySelectorConfig(domain="weather")),
        vol.Required(CONF_TV_SAVER, default=DEFAULT_TV_SAVER): _minutes(120),
        vol.Required(CONF_TV_IDLE, default=DEFAULT_TV_IDLE): _minutes(600),
    }
)


class AlvunaOptionsFlow(OptionsFlow):
    """What the automatic layout hides or picks, and the TV's timers."""

    async def async_step_init(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        errors: dict[str, str] = {}
        if user_input is not None:
            if user_input[CONF_SOURCE] == SOURCE_DASHBOARD and not user_input.get(CONF_DASHBOARD):
                errors[CONF_DASHBOARD] = "dashboard_required"
            else:
                for key in (CONF_TV_SAVER, CONF_TV_IDLE):
                    user_input[key] = int(user_input[key])
                return self.async_create_entry(data=user_input)
        return self.async_show_form(
            step_id="init",
            data_schema=self.add_suggested_values_to_schema(OPTIONS_SCHEMA, user_input or self.config_entry.options),
            errors=errors,
        )
