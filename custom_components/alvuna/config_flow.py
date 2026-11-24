"""Config and options flows for Alvuna."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.config_entries import ConfigEntry, ConfigFlow, ConfigFlowResult, OptionsFlow
from homeassistant.core import callback
from homeassistant.helpers import selector

from .const import (
    CONF_DASHBOARD,
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


class AlvunaConfigFlow(ConfigFlow, domain=DOMAIN):
    """Adds Alvuna once per Home Assistant."""

    VERSION = 1

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        await self.async_set_unique_id(DOMAIN)
        self._abort_if_unique_id_configured()
        if user_input is not None:
            return self.async_create_entry(title="Alvuna", data={}, options={CONF_SOURCE: SOURCE_AUTO})
        return self.async_show_form(step_id="user")

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
