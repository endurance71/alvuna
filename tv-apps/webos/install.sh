#!/bin/sh
# Installs the built app on the TV registered in the webOS CLI as $TV (ares-setup-device). It does not open it:
# pass --launch to start it as well.
set -e
cd "$(dirname "$0")"
TV=${TV:-lg-c4}
ARES=${ARES:-$(npm prefix -g)/bin}
"$ARES/ares-install" --device "$TV" dist/app.alvuna.tv_*.ipk
[ "$1" = "--launch" ] && "$ARES/ares-launch" --device "$TV" app.alvuna.tv
exit 0
