#!/usr/bin/env bash
# Deploy admin-panel (website + admin UI) to nginx web root on the server.
# Run ON THE SERVER from ~/tataiya-admin (or set ADMIN_DIR).
set -euo pipefail

ADMIN_DIR="${ADMIN_DIR:-$HOME/tataiya-admin}"
WEB_ROOT="${WEB_ROOT:-/var/www/tataiya/admin-panel/dist}"

cd "$ADMIN_DIR"
echo "==> git pull"
git pull origin main

echo "==> npm run build"
npm run build

echo "==> rsync to $WEB_ROOT"
sudo mkdir -p "$WEB_ROOT"
sudo rsync -a --delete dist/ "$WEB_ROOT/"

echo "==> Verify Message Gateway is in the live bundle"
JS=$(ls "$WEB_ROOT"/assets/index-*.js | head -1)
if grep -q "Message Gateway" "$JS"; then
  echo "OK: Message Gateway found in $(basename "$JS")"
else
  echo "WARN: Message Gateway string NOT found — check build output"
  exit 1
fi

echo "Done. Hard-refresh admin Settings (Cmd+Shift+R)."
