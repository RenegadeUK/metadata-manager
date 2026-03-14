import asyncio
import logging
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.app_setting import AppSetting
from app.models.scan_run import ScanRun
from app.services.scanner import (
    get_running_scan,
    has_pending_interrogation_work,
    launch_interrogation_scan,
    run_inventory_scan,
)

logger = logging.getLogger(__name__)

DEFAULT_INVENTORY_INTERVAL_SECONDS = 3600
DEFAULT_INTERROGATION_INTERVAL_SECONDS = 3600
DISABLED_INTERVAL_SECONDS = 0

_scheduler_task: asyncio.Task | None = None


def _read_interval_seconds(db: Session, setting_key: str, default_seconds: int) -> int:
    row = db.query(AppSetting).filter(AppSetting.key == setting_key).one_or_none()
    if row is None:
        return default_seconds

    try:
        interval = int(row.value)
    except ValueError:
        return default_seconds

    return max(DISABLED_INTERVAL_SECONDS, interval)


def _read_inventory_interval_seconds(db: Session) -> int:
    return _read_interval_seconds(
        db,
        setting_key="scan.inventory_interval_seconds",
        default_seconds=DEFAULT_INVENTORY_INTERVAL_SECONDS,
    )


def _read_interrogation_interval_seconds(db: Session) -> int:
    return _read_interval_seconds(
        db,
        setting_key="scan.interrogation_interval_seconds",
        default_seconds=DEFAULT_INTERROGATION_INTERVAL_SECONDS,
    )


def _is_interrogation_due(db: Session, interval_seconds: int) -> bool:
    latest_interrogation = (
        db.query(ScanRun)
        .filter(
            ScanRun.run_type == "interrogation",
            ScanRun.status == "completed",
            ScanRun.ended_at.is_not(None),
        )
        .order_by(ScanRun.ended_at.desc(), ScanRun.id.desc())
        .first()
    )

    if latest_interrogation is None or latest_interrogation.ended_at is None:
        return True

    elapsed_seconds = (
        datetime.now(timezone.utc) - latest_interrogation.ended_at
    ).total_seconds()
    return elapsed_seconds >= interval_seconds


def _run_inventory_cycle() -> None:
    db = SessionLocal()
    try:
        inventory_interval_seconds = _read_inventory_interval_seconds(db)
        if inventory_interval_seconds == DISABLED_INTERVAL_SECONDS:
            return

        inventory_run = run_inventory_scan(db)
        db.refresh(inventory_run)

        if inventory_run.status != "completed":
            logger.info(
                "Scheduled interrogation skipped because inventory run %s is %s",
                inventory_run.id,
                inventory_run.status,
            )
            return

        interrogation_interval_seconds = _read_interrogation_interval_seconds(db)
        if interrogation_interval_seconds == DISABLED_INTERVAL_SECONDS:
            return

        if get_running_scan(db, "interrogation") is not None:
            logger.info("Scheduled interrogation skipped because an interrogation run is active")
            return

        if not has_pending_interrogation_work(db):
            logger.info("Scheduled interrogation skipped because no pending interrogation work was found")
            return

        if not _is_interrogation_due(db, interrogation_interval_seconds):
            logger.info(
                "Scheduled interrogation skipped because cooldown (%ss) has not elapsed",
                interrogation_interval_seconds,
            )
            return

        interrogation_run = launch_interrogation_scan(db)
        logger.info(
            "Scheduled interrogation run %s launched after inventory run %s",
            interrogation_run.id,
            inventory_run.id,
        )
    except Exception:
        logger.exception("Scheduled inventory scan failed")
    finally:
        db.close()


async def _scheduler_loop() -> None:
    while True:
        db = SessionLocal()
        try:
            interval_seconds = _read_inventory_interval_seconds(db)
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
