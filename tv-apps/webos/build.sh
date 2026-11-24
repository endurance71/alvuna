#!/bin/sh
# Builds the Alvuna webOS app: dist/app.alvuna.tv_<version>_all.ipk, the web shell (app/) and its discovery service
# (service/) in one package. Nothing server- or user-specific goes in: no address, no token.
# Needs the webOS CLI: npm i -g @webos-tools/cli (ares-package). Icons: swift tools/make_icons.swift
set -e
cd "$(dirname "$0")"
ARES=${ARES:-$(npm prefix -g)/bin}
node --check service/discovery.js
node --check service/service.js
node --check app/shell.js
# A store build must never carry a token or a fixed server: fail if something like one slipped in (a JWT, an
# assigned token, a server URL with an IP, a .ts.net name). Example addresses in UI text have no scheme.
if grep -rEn 'eyJ[A-Za-z0-9_-]{20,}|(access|refresh)_token"?[[:space:]]*[:=][[:space:]]*"[^"]|https?://[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+|\.ts\.net' app service; then
  echo "build.sh: found what looks like a token or a fixed server (above); refusing to package" >&2
  exit 1
fi
rm -rf dist && mkdir dist
"$ARES/ares-package" --no-minify app service -o dist
ls dist
