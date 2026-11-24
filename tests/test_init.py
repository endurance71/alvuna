"""Setup, the config flow and the served frontend."""

from homeassistant.config_entries import SOURCE_USER
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResultType
from homeassistant.setup import async_setup_component

from custom_components.alvuna.const import DOMAIN


async def _add(hass: HomeAssistant):
    assert await async_setup_component(hass, "http", {})
    result = await hass.config_entries.flow.async_init(DOMAIN, context={"source": SOURCE_USER})
    assert result["type"] is FlowResultType.FORM
    result = await hass.config_entries.flow.async_configure(result["flow_id"], {})
    assert result["type"] is FlowResultType.CREATE_ENTRY
    await hass.async_block_till_done()
    return result["result"]


async def test_only_once(hass: HomeAssistant) -> None:
    await _add(hass)
    result = await hass.config_entries.flow.async_init(DOMAIN, context={"source": SOURCE_USER})
    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "already_configured"


async def test_serves_card_and_tv(hass: HomeAssistant, hass_client_no_auth) -> None:
    entry = await _add(hass)
    extra = hass.data["frontend_extra_module_url"]
    url = next(u for u in extra.urls if u.startswith("/alvuna/static/alvuna-card.js?v="))
    client = await hass_client_no_auth()

    card = await client.get(url)
    assert card.status == 200
    assert "max-age" in card.headers["Cache-Control"]

    page = await client.get("/alvuna/tv/?dashboard=x")
    assert page.status == 200
    assert page.headers["Cache-Control"] == "no-cache"
    html = await page.text()
    script = html.split('src="')[1].split('"')[0]
    assert (await client.get(f"/alvuna/tv/{script}")).status == 200

    bare = await client.get("/alvuna/tv?dashboard=x", allow_redirects=False)
    assert bare.status == 302
    assert bare.headers["Location"] == "/alvuna/tv/?dashboard=x"

    assert await hass.config_entries.async_unload(entry.entry_id)
    assert url not in extra.urls


async def test_options(hass: HomeAssistant) -> None:
    entry = await _add(hass)
    result = await hass.config_entries.options.async_init(entry.entry_id)
    assert result["type"] is FlowResultType.FORM
    result = await hass.config_entries.options.async_configure(result["flow_id"], {"source": "dashboard"})
    assert result["errors"] == {"dashboard": "dashboard_required"}
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"source": "dashboard", "dashboard": "dom", "tv_screensaver_minutes": 5, "tv_idle_minutes": 0})
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert entry.options == {"source": "dashboard", "dashboard": "dom", "tv_screensaver_minutes": 5, "tv_idle_minutes": 0}
