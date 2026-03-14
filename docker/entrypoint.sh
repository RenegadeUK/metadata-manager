#!/usr/bin/env bash
set -euo pipefail

export CONFIG_DIR=${CONFIG_DIR:-/config}
export MEDIA_DIR=${MEDIA_DIR:-/media}

if [[ -f "$CONFIG_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$CONFIG_DIR/.env"
  set +a
fi

export PGDATA=${PGDATA:-${CONFIG_DIR}/postgres}
export POSTGRES_DB=${POSTGRES_DB:-metadata_manager}
export POSTGRES_USER=${POSTGRES_USER:-metadata_manager}
export POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-metadata_manager}
export POSTGRES_PORT=${POSTGRES_PORT:-5432}

mkdir -p "$CONFIG_DIR" "$MEDIA_DIR" "$PGDATA" /var/run/postgresql
chown -R postgres:postgres "$CONFIG_DIR" /var/run/postgresql
chmod 700 "$PGDATA"

if [[ ! -s "$PGDATA/PG_VERSION" ]]; then
  echo "Initializing PostgreSQL data directory..."
  gosu postgres /usr/lib/postgresql/15/bin/initdb -D "$PGDATA"
  {
    echo "listen_addresses = '127.0.0.1'"
    echo "port = ${POSTGRES_PORT}"
  } >> "$PGDATA/postgresql.conf"

  cat > "$PGDATA/pg_hba.conf" <<EOF
local   all             all                                     trust
host    all             all             127.0.0.1/32            scram-sha-256
host    all             all             ::1/128                 scram-sha-256
EOF

  gosu postgres /usr/lib/postgresql/15/bin/pg_ctl -D "$PGDATA" -o "-p ${POSTGRES_PORT}" -w start
  psql -v ON_ERROR_STOP=1 --username postgres --dbname postgres <<SQL
DO
\$\$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${POSTGRES_USER}') THEN
      CREATE ROLE ${POSTGRES_USER} LOGIN PASSWORD '${POSTGRES_PASSWORD}';
   ELSE
      ALTER ROLE ${POSTGRES_USER} WITH LOGIN PASSWORD '${POSTGRES_PASSWORD}';
   END IF;
END
\$\$;
SQL
  psql -v ON_ERROR_STOP=1 --username postgres --dbname postgres <<SQL
SELECT 'CREATE DATABASE ${POSTGRES_DB} OWNER ${POSTGRES_USER}'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${POSTGRES_DB}')\gexec
SQL
  gosu postgres /usr/lib/postgresql/15/bin/pg_ctl -D "$PGDATA" -m fast -w stop
fi

exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
