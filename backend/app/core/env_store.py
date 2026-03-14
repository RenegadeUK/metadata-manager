from pathlib import Path
from shlex import quote, split

from app.core.config import get_settings

CONFIG_ENV_PATH = Path('/config/.env')
MANAGED_ENV_KEYS = [
    'APP_NAME',
    'APP_ENV',
    'APP_LOG_LEVEL',
    'CORS_ORIGINS',
    'POSTGRES_DB',
    'POSTGRES_USER',
    'POSTGRES_PASSWORD',
]


def _parse_env_file(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}

    values: dict[str, str] = {}
    for line in path.read_text(encoding='utf-8').splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith('#') or '=' not in stripped:
            continue
        key, value = stripped.split('=', 1)
        parsed_value = split(value.strip(), posix=True)
        values[key.strip()] = parsed_value[0] if parsed_value else ''
    return values


def _default_values() -> dict[str, str]:
    settings = get_settings()
    return {
        'APP_NAME': settings.app_name,
        'APP_ENV': settings.app_env,
        'APP_LOG_LEVEL': settings.app_log_level,
        'CORS_ORIGINS': ','.join(settings.normalized_cors_origins),
        'POSTGRES_DB': settings.postgres_db,
        'POSTGRES_USER': settings.postgres_user,
        'POSTGRES_PASSWORD': settings.postgres_password,
    }


def _build_database_url(values: dict[str, str]) -> str:
    return (
        'postgresql+psycopg://'
        f"{values['POSTGRES_USER']}:{values['POSTGRES_PASSWORD']}"
        f"@127.0.0.1:5432/{values['POSTGRES_DB']}"
    )


def load_managed_settings() -> dict[str, str]:
    values = _default_values()
    values.update({key: value for key, value in _parse_env_file(CONFIG_ENV_PATH).items() if key in MANAGED_ENV_KEYS})
    return values


def save_managed_settings(values: dict[str, str]) -> dict[str, str]:
    merged_values = load_managed_settings()
    merged_values.update(values)

    lines = [
        '# Managed by the Metadata Manager settings UI.',
        '# Restart the container after changes to apply them everywhere.',
    ]
    for key in MANAGED_ENV_KEYS:
        lines.append(f"{key}={quote(merged_values[key])}")
    lines.append(f"DATABASE_URL={quote(_build_database_url(merged_values))}")
    lines.append('CONFIG_DIR=/config')
    lines.append('MEDIA_DIR=/media')

    CONFIG_ENV_PATH.parent.mkdir(parents=True, exist_ok=True)
    CONFIG_ENV_PATH.write_text('\n'.join(lines) + '\n', encoding='utf-8')
    return merged_values
