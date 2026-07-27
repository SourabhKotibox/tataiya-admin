#!/usr/bin/env bash
# Run ON THE SERVER after copying tataiya-admin-dist.tar.gz to ~/
set -euo pipefail
WEB_ROOT="${WEB_ROOT:-/var/www/html}"
TAR="${1:-$HOME/tataiya-admin-dist.tar.gz}"
sudo mkdir -p "$WEB_ROOT"
sudo tar -xzf "$TAR" -C "$WEB_ROOT"
sudo chown -R www-data:www-data "$WEB_ROOT" 2>/dev/null || sudo chown -R ubuntu:ubuntu "$WEB_ROOT"
echo "Deployed admin to $WEB_ROOT"
ls "$WEB_ROOT"/assets/index-*.js | tail -3
