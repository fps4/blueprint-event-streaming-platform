#!/bin/sh
set -euo pipefail

DATA_DIR=/tmp/loki
mkdir -p "$DATA_DIR/index" "$DATA_DIR/chunks" "$DATA_DIR/index_cache"
# Adjust ownership when possible so Loki can write even on remote volumes.
chown -R 10001:10001 "$DATA_DIR" 2>/dev/null || true

exec /usr/bin/loki "$@"
