#!/bin/bash
# Deploys site/ to alvuna.shipapp.pl: the files go to /srv/alvuna-site on the ShipApp VPS, which Caddy serves read-only
# (the alvuna.shipapp.pl block in the ShipApp repo's Caddyfile; see docs/website.md). Same scheme as nix.shipapp.pl.
# The host has no rsync, so the files travel as a tar stream, and the directory is refreshed in place (not swapped):
# Caddy's bind mount follows the directory inode.
# Run: scripts/deploy-site.sh   (needs the `contabo-mtle` SSH host; rebuild the demo first: cd frontend && node build-site.mjs)
set -euo pipefail
cd "$(dirname "$0")/.."
HOST="${ALVUNA_SITE_HOST:-contabo-mtle}"
TARGET=/srv/alvuna-site

# Cloudflare keeps style.css and tour.js for hours: the pages link them with a hash of their content (?v=), so a new
# version is a new URL. Done on a copy, so site/ stays as it is in git.
STAGE=$(mktemp -d)
trap 'rm -rf "$STAGE"' EXIT
COPYFILE_DISABLE=1 tar --no-xattrs --no-mac-metadata -C site --exclude '.DS_Store' --exclude './img/src' --exclude './preview' -cf - . | tar -C "$STAGE" -xf -
for f in style.css tour.js; do
  v=$(shasum "$STAGE/$f" | cut -c1-8)
  sed -i '' -e "s|href=\"$f\"|href=\"$f?v=$v\"|g" -e "s|src=\"$f\"|src=\"$f?v=$v\"|g" "$STAGE"/*.html
done

COPYFILE_DISABLE=1 tar --no-xattrs --no-mac-metadata -C "$STAGE" -czf - . |
  ssh -o BatchMode=yes "$HOST" "set -e; mkdir -p $TARGET; find $TARGET -mindepth 1 -delete; tar --no-same-owner -C $TARGET -xzf -; find $TARGET -type f | wc -l"
echo "Deployed site/ to $HOST:$TARGET"
