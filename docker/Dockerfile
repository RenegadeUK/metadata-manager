FROM node:22-bookworm-slim AS frontend-builder
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM python:3.11-slim-bookworm
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    CONFIG_DIR=/config \
    MEDIA_DIR=/media \
    PGDATA=/config/postgres

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        bash \
        curl \
        ffmpeg \
        gosu \
        postgresql-15 \
        postgresql-client-15 \
        postgresql-contrib-15 \
        supervisor \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY backend/pyproject.toml ./backend/pyproject.toml
COPY backend/app ./backend/app
COPY backend/alembic.ini ./backend/alembic.ini
COPY backend/alembic ./backend/alembic
RUN pip install ./backend

COPY --from=frontend-builder /frontend/dist ./frontend_dist
COPY docker ./docker

RUN chmod +x /app/docker/entrypoint.sh /app/docker/run-backend.sh \
    && mkdir -p /config/postgres /media /var/run/postgresql /etc/supervisor/conf.d \
    && chown -R postgres:postgres /config /var/run/postgresql \
    && cp /app/docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

EXPOSE 8000
VOLUME ["/config", "/media"]
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=10 CMD curl -fsS http://127.0.0.1:8000/health || exit 1
ENTRYPOINT ["/app/docker/entrypoint.sh"]
