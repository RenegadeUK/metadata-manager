import os
from pathlib import Path
from threading import Lock

from alembic import command
from alembic.config import Config

_migration_lock = Lock()
_migration_ran = False


def run_migrations() -> None:
    global _migration_ran

    if os.getenv("APP_MIGRATIONS_APPLIED") == "1":
        return

    with _migration_lock:
        if _migration_ran:
            return

        backend_dir = Path(__file__).resolve().parents[2]
        alembic_ini_path = backend_dir / "alembic.ini"
        script_location = backend_dir / "alembic"

        config = Config(str(alembic_ini_path))
        config.set_main_option("script_location", str(script_location))

        command.upgrade(config, "head")
        _migration_ran = True
