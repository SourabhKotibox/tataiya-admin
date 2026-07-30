#!/usr/bin/env bash
# Run ON THE SERVER to publish admin UI (Message Gateway, etc.)
# Real nginx root for tataiya.in is /var/www/html
set -euo pipefail

ADMIN_DIR="${ADMIN_DIR:-$HOME/tataiya-admin}"
WEB_ROOT="${WEB_ROOT:-/var/www/html}"

cd "$ADMIN_DIR"
echo "==> git pull"
git pull origin main

echo "==> npm run build"
npm run build

echo "==> publish dist -> $WEB_ROOT"
sudo mkdir -p "$WEB_ROOT"
sudo rsync -a --delete dist/ "$WEB_ROOT/"

JS=$(ls "$WEB_ROOT"/assets/index-*.js | head -1)
echo "==> live bundle: $JS"
if grep -q "Message Gateway" "$JS"; then
  echo "OK: Message Gateway is in the live bundle"
else
  echo "FAIL: Message Gateway still missing — wrong WEB_ROOT?"
  grep -R "root " /etc/nginx/sites-enabled /etc/nginx/conf.d 2>/dev/null || true
  exit 1
fi

echo "Done. Hard refresh https://tataiya.in/settings (Cmd+Shift+R)"
