#!/usr/bin/env bash
set -euo pipefail

export PYTHONPATH=/app/backend
export APP_ENV=${APP_ENV:-production}

for attempt in $(seq 1 60); do
  if pg_isready -h 127.0.0.1 -p "${POSTGRES_PORT:-5432}" -U "${POSTGRES_USER:-metadata_manager}" >/dev/null 2>&1; then
    break
  fi
  echo "Waiting for PostgreSQL (${attempt}/60)..."
  sleep 1
done

cd /app/backend
alembic upgrade head
exec uvicorn app.main:app --host "${APP_HOST:-0.0.0.0}" --port "${APP_PORT:-8000}"
