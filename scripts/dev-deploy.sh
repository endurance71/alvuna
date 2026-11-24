#!/bin/sh
# Builds the frontend and copies custom_components/alvuna to a Home Assistant over ssh, for testing before a release.
#   scripts/dev-deploy.sh <ssh-target> [sudo]
# <ssh-target> is anything ssh accepts (a host alias from ~/.ssh/config, user@host). Pass "sudo" when that user cannot
# write to /homeassistant itself; extra ssh options (a key) go in $SSH_OPTS. Home Assistant must be restarted afterwards to load new Python code; a frontend-only
# change is picked up on the next page load.
set -e
[ -n "$1" ] || { echo "usage: $0 <ssh-target> [sudo]" >&2; exit 1; }
cd "$(dirname "$0")/.."
(cd frontend && { [ -d node_modules ] || npm ci --no-audit --no-fund; } && node build.mjs > /dev/null)
SUDO=""; [ "$2" = sudo ] && SUDO="sudo"
COPYFILE_DISABLE=1 tar cf - --exclude __pycache__ -C custom_components alvuna | ssh $SSH_OPTS "$1" \
  "$SUDO rm -rf /homeassistant/custom_components/alvuna && $SUDO mkdir -p /homeassistant/custom_components && $SUDO tar xf - -o -C /homeassistant/custom_components"
echo "Copied to $1. Restart Home Assistant if Python files changed."
