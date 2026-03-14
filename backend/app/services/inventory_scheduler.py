import asyncio
import logging

from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.app_setting import AppSetting
from app.services.scanner import run_inventory_scan

logger = logging.getLogger(__name__)

DEFAULT_INTERVAL_SECONDS = 3600
DISABLED_INTERVAL_SECONDS = 0

_scheduler_task: asyncio.Task | None = None


def _read_interval_seconds(db: Session) -> int:
    row = db.query(AppSetting).filter(AppSetting.key == "scan.inventory_interval_seconds").one_or_none()
    if row is None:
        return DEFAULT_INTERVAL_SECONDS

    try:
        interval = int(row.value)
    except ValueError:
        return DEFAULT_INTERVAL_SECONDS

    return max(DISABLED_INTERVAL_SECONDS, interval)


def _run_inventory_cycle() -> None:
    db = SessionLocal()
    try:
        interval_seconds = _read_interval_seconds(db)
        if interval_seconds == DISABLED_INTERVAL_SECONDS:
            return

        run_inventory_scan(db)
    except Exception:
        logger.exception("Scheduled inventory scan failed")
    finally:
        db.close()


async def _scheduler_loop() -> None:
    while True:
        db = SessionLocal()
        try:
            interval_seconds = _read_interval_seconds(db)
        finally:
            db.close()

        if interval_seconds == DISABLED_INTERVAL_SECONDS:
            await asyncio.sleep(30)
            continue

        await asyncio.to_thread(_run_inventory_cycle)
        await asyncio.sleep(interval_seconds)


def start_inventory_scheduler() -> None:
    global _scheduler_task

    if _scheduler_task is not None and not _scheduler_task.done():
        return

    _scheduler_task = asyncio.create_task(_scheduler_loop())


async def stop_inventory_scheduler() -> None:
    global _scheduler_task

    if _scheduler_task is None:
        return

    _scheduler_task.cancel()
    try:
        await _scheduler_task
    except asyncio.CancelledError:
        pass
    finally:
        _scheduler_task = None
