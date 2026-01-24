#!/bin/sh
set -eu

# Small init script for clickhouse-init container.
# Waits for ClickHouse server to be available and runs all .sql files from /sql.

echo "Starting clickhouse init script..."

# Wait until ClickHouse responds
CH_USER="${CLICKHOUSE_USER:-default}"
CH_PASS="${CLICKHOUSE_PASSWORD:-}"
CH_DB="${CLICKHOUSE_DB:-default}"

until clickhouse-client --host clickhouse --user "$CH_USER" --password "$CH_PASS" --query "SELECT 1" >/dev/null 2>&1; do
  echo "Waiting for ClickHouse to be ready..."
  sleep 1
done

echo "ClickHouse is up; running SQL files in /sql"

if [ -d /sql ]; then
  for f in /sql/*.sql; do
    [ -e "$f" ] || continue
  echo "Running $f"
  clickhouse-client --host clickhouse --user "$CH_USER" --password "$CH_PASS" --database "$CH_DB" --multiquery < "$f"
  done
else
  echo "/sql directory not found, nothing to run"
fi

echo "clickhouse init finished"

exit 0
