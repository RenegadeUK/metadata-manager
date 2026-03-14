# Metadata Manager

Bootstrap monorepo for a Dockerized metadata-management application. This scaffold ships as a single container that runs PostgreSQL, a FastAPI backend, and a built React + Vite frontend, then publishes the image to GHCR from GitHub Actions.

## Stack

- FastAPI + SQLAlchemy + Alembic
- PostgreSQL 15 inside the same production container
- React 19 + Vite + TypeScript
- Docker Buildx + GHCR publishing on `main` and version tags

## Layout

- `backend/`: API, models, migrations, tests
- `frontend/`: React UI and build config
- `docker/`: Dockerfile, entrypoint, supervisor, runtime scripts
- `.github/workflows/publish.yml`: GHCR publishing pipeline

## Local development

### Prerequisites

- Docker Desktop
- Python 3.11+
- Node 22+

### Run the full stack with Docker

```bash
docker compose up --build
```

The app will be available on `http://localhost:<UI_PORT>` using the port defined in the root `.env` file.
The only external variables used by the compose stack are:

- `CONFIG_PATH` for the host folder mapped to `/config`
- `MEDIA_PATH` for the host folder mapped to `/media`
- `UI_PORT` for the host port mapped to container port `8000`

All other application settings are managed from the UI and persisted to `/config/.env`.

### Run backend locally

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e .[dev]
alembic upgrade head
uvicorn app.main:app --reload
```

### Run frontend locally

```bash
cd frontend
npm install
npm run dev
```

Vite proxies API calls to the backend on port `8000`.

## Container behavior

On first boot the container:

1. Initializes a PostgreSQL data directory in `/config/postgres`
2. Creates the configured role and database
3. Starts PostgreSQL under `supervisord`
4. Runs Alembic migrations
5. Starts FastAPI and serves the built frontend from the same process

Persistent paths:

- `/config/.env` can hold container-local persisted settings
- `/config/postgres` stores PostgreSQL data files
- `/media` is mapped to the repository `media/` folder for application-managed media assets

## Settings management

The UI includes a runtime settings panel. Saving that form writes `/config/.env` inside the container. Those values are read on startup and are intended to replace most manual environment variable editing.

Changing settings in the UI requires a container restart before all services pick up the new values.

Recommended restart command:

```bash
docker compose restart app
```

## Onboarding workflow

Operational media-analysis configuration is UI-driven through onboarding endpoints:

- `GET /api/onboarding/status` - readiness + missing requirements
- `GET /api/onboarding/defaults` - editable default values for quality profile and metadata tag rule
- `GET|POST|PUT|DELETE /api/onboarding/folder-mappings`
- `GET|POST|PUT|DELETE /api/onboarding/quality-profiles`
- `GET|POST|PUT|DELETE /api/onboarding/metadata-tag-rules`
- `GET|PUT /api/onboarding/scan-settings`

Minimum onboarding requirements before scans should be allowed:

1. At least one active folder mapping
2. At least one active quality profile
3. At least one active metadata tag rule

Current default seed values are based on your provided settings and remain editable in UI:

- quality profile defaults include `codec=hevc` and `pixel_format=p010le`
- metadata tag rule defaults include `tag_key=encoded_by` and `tag_value=zombie`

## GHCR publishing

The GitHub Actions workflow publishes the container image to:

```text
ghcr.io/<owner>/<repo>
```

Tags produced:

- `latest` for the default branch
- `sha-<short-sha>` for every publish
- `vX.Y.Z` for semantic version tags

## Notes

This topology is intentionally optimized for bootstrap simplicity, not fault isolation. If the app grows past the single-container phase, the clean migration path is to externalize PostgreSQL first while keeping the backend and frontend packaging intact.
