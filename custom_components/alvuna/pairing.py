"""Pairing a TV without typing anything on it.

1. The TV app, holding no token, asks POST /api/alvuna/pair and shows the six-character code it gets back.
2. That starts a discovered config flow: Home Assistant shows "Discovered: Alvuna TV" to its admins, who type the code
   they see on the TV (five wrong tries drop the request) and name it.
3. Approving creates a Home Assistant user for that TV alone (not an admin, local network only) and a refresh token.
4. The TV polls GET /api/alvuna/pair/<id> with the secret it got in step 1, receives the tokens once and keeps them as
   the frontend does ("hassTokens"), so they refresh like any browser session. Removing the TV's entry deletes the user.

The endpoints need no login (the TV has none yet), so they are tight: few requests per address, few open requests,
ten minutes to approve, and the tokens only go to the holder of the secret, once.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass, field
from http import HTTPStatus
import secrets
import time
from typing import Any

from aiohttp import web

from homeassistant.auth.const import GROUP_ID_USER
from homeassistant.auth.models import User
from homeassistant.components.http import KEY_HASS, HomeAssistantView
from homeassistant.config_entries import SOURCE_INTEGRATION_DISCOVERY
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.event import async_call_later

from .const import DOMAIN, URL_TV

DATA_PAIRING = f"{DOMAIN}_pairing"
EXPIRES = 600  # seconds to approve a code
MAX_OPEN = 3  # open requests at a time, for the whole Home Assistant
MAX_PER_ADDRESS = 6  # new requests per address per EXPIRES
CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # no 0/O, 1/I: read off a TV across the room


@dataclass
class Request:
    """One TV waiting to be approved."""

    request_id: str
    secret: str
    code: str
    name: str
    origin: str
    created: float = field(default_factory=time.monotonic)
    flow_id: str | None = None
    tokens: dict[str, Any] | None = None

    @property
    def expired(self) -> bool:
        return time.monotonic() - self.created > EXPIRES


class Pairing:
    """Open pairing requests, kept in memory only: a restart simply makes the TV ask again."""

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass
        self.requests: dict[str, Request] = {}
        self.by_address: dict[str, list[float]] = {}
        self._timers: list[Callable[[], None]] = []

    @callback
    def _prune(self) -> None:
        for req in [r for r in self.requests.values() if r.expired]:
            self.requests.pop(req.request_id, None)
            if req.flow_id and req.tokens is None:
                self.hass.config_entries.flow.async_abort(req.flow_id)
        now = time.monotonic()
        for addr in list(self.by_address):
            self.by_address[addr] = [t for t in self.by_address[addr] if now - t < EXPIRES]
            if not self.by_address[addr]:
                del self.by_address[addr]

    async def async_start(self, address: str, name: str, origin: str) -> Request | None:
        """A new request, or None when there are too many."""
        self._prune()
        recent = self.by_address.setdefault(address, [])
        if len(recent) >= MAX_PER_ADDRESS or sum(r.tokens is None for r in self.requests.values()) >= MAX_OPEN:
            return None
        recent.append(time.monotonic())
        req = Request(
            request_id=secrets.token_urlsafe(16),
            secret=secrets.token_urlsafe(32),
            code="".join(secrets.choice(CODE_CHARS) for _ in range(6)),
            name=name,
            origin=origin,
        )
        self.requests[req.request_id] = req
        result = await self.hass.config_entries.flow.async_init(
            DOMAIN,
            context={"source": SOURCE_INTEGRATION_DISCOVERY},
            data={"request_id": req.request_id, "code": req.code, "name": name},
        )
        req.flow_id = result.get("flow_id")
        # The "Discovered" card goes away by itself when the code expires, even if nothing asks again.
        self._timers.append(async_call_later(self.hass, EXPIRES + 1, self._expire))
        return req

    @callback
    def _expire(self, _now: Any) -> None:
        self._timers = self._timers[1:]
        self._prune()

    @callback
    def async_stop(self) -> None:
        for cancel in self._timers:
            cancel()
        self._timers = []

    @callback
    def async_forget(self, request_id: str) -> None:
        """Drop a request (too many wrong codes): the TV gets 404 and asks for a new code."""
        self.requests.pop(request_id, None)

    @callback
    def get(self, request_id: str) -> Request | None:
        self._prune()
        return self.requests.get(request_id)

    async def async_approve(self, request_id: str, name: str, local_only: bool = True) -> User | None:
        """Create the TV's user and tokens; None when the request has expired meanwhile.

        local_only: the user may sign in from the local network only. Off for a TV that reaches this Home Assistant
        over the internet (a remote home through Nabu Casa, Tailscale Funnel or a reverse proxy)."""
        req = self.get(request_id)
        if req is None or req.tokens is not None:
            return None
        auth = self.hass.auth
        user = await auth.async_create_user(f"Alvuna TV · {name}", group_ids=[GROUP_ID_USER], local_only=local_only)
        client_id = f"{req.origin}{URL_TV}/"
        refresh = await auth.async_create_refresh_token(user, client_id=client_id)
        access = auth.async_create_access_token(refresh)
        expires_in = int(refresh.access_token_expiration.total_seconds())
        # The frontend's own token format (home-assistant-js-websocket), so the TV refreshes them like any browser.
        req.tokens = {
            "access_token": access,
            "token_type": "Bearer",
            "expires_in": expires_in,
            "refresh_token": refresh.token,
            "hassUrl": req.origin,
            "clientId": client_id,
            "expires": int(time.time() * 1000) + expires_in * 1000,
        }
        req.created = time.monotonic()  # the TV gets a fresh ten minutes to collect them
        return user


def _address(request: web.Request) -> str:
    return request.remote or "?"


class PairStartView(HomeAssistantView):
    """POST /api/alvuna/pair: a TV asks to be paired."""

    url = "/api/alvuna/pair"
    name = "api:alvuna:pair"
    requires_auth = False

    async def post(self, request: web.Request) -> web.Response:
        hass = request.app[KEY_HASS]
        pairing: Pairing | None = hass.data.get(DATA_PAIRING)
        if pairing is None:
            return self.json_message("Alvuna is not set up", HTTPStatus.NOT_FOUND)
        try:
            body = await request.json()
        except ValueError:
            body = {}
        name = str(body.get("name") or "TV")[:40].strip() or "TV"
        # As the browser writes it (no :443 or :80): the frontend's token store compares it with location.origin.
        origin = str(request.url.origin())
        req = await pairing.async_start(_address(request), name, origin)
        if req is None:
            return self.json_message("Too many pairing requests, try again later", HTTPStatus.TOO_MANY_REQUESTS)
        return self.json({"request_id": req.request_id, "secret": req.secret, "code": req.code, "expires_in": EXPIRES})


class PairStatusView(HomeAssistantView):
    """GET /api/alvuna/pair/<id> (header X-Alvuna-Secret): 202 while waiting, 200 with the tokens once, 404 after."""

    url = "/api/alvuna/pair/{request_id}"
    name = "api:alvuna:pair:status"
    requires_auth = False

    async def get(self, request: web.Request, request_id: str) -> web.Response:
        hass = request.app[KEY_HASS]
        pairing: Pairing | None = hass.data.get(DATA_PAIRING)
        req = pairing.get(request_id) if pairing else None
        if req is None or not secrets.compare_digest(req.secret, request.headers.get("X-Alvuna-Secret", "")):
            return self.json_message("Unknown or expired pairing request", HTTPStatus.NOT_FOUND)
        if req.tokens is None:
            return self.json({"status": "waiting"}, HTTPStatus.ACCEPTED)
        pairing.requests.pop(request_id, None)
        return self.json({"status": "paired", "tokens": req.tokens})


@callback
def async_setup_pairing(hass: HomeAssistant) -> None:
    """Views go in once per run; the manager exists only while Alvuna is set up."""
    if DATA_PAIRING not in hass.data:
        hass.http.register_view(PairStartView())
        hass.http.register_view(PairStatusView())
    hass.data[DATA_PAIRING] = Pairing(hass)


@callback
def async_unload_pairing(hass: HomeAssistant) -> None:
    if pairing := hass.data.get(DATA_PAIRING):
        pairing.async_stop()
    hass.data[DATA_PAIRING] = None
