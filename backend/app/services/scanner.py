from __future__ import annotations

import fnmatch
import json
import subprocess
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.app_setting import AppSetting
from app.models.folder_mapping import FolderMapping
from app.models.media_file_scan import MediaFileScan
from app.models.metadata_tag_rule import MetadataTagRule
from app.models.quality_profile import QualityProfile
from app.models.scan_run import ScanRun


_scan_thread_lock = threading.Lock()


@dataclass
class InventoryWorkerResult:
    seen_result_ids: set[int]
    processed_files: int
    new_files: int
    updated_files: int
    error_files: int
    last_error_message: str | None


@dataclass
class InterrogationWorkerResult:
    is_success: bool
    is_new: bool
    error_message: str | None


def _get_setting(db: Session, key: str, default: str) -> str:
    row = db.query(AppSetting).filter(AppSetting.key == key).one_or_none()
    return default if row is None else row.value


def _parse_extensions(value: str) -> set[str]:
    extensions: set[str] = set()
    for raw in value.split(","):
        extension = raw.strip().lower()
        if not extension:
            continue
        if extension.startswith("."):
            extension = extension[1:]
        extensions.add(extension)
    return extensions


def _parse_patterns(value: str) -> list[str]:
    return [pattern.strip() for pattern in value.split(",") if pattern.strip()]


def _matches_exclude(path_value: str, patterns: list[str]) -> bool:
    return any(fnmatch.fnmatch(path_value, pattern) for pattern in patterns)


def _parse_interrogation_workers(value: str, default: int = 2) -> int:
    try:
        parsed = int(value)
    except ValueError:
        return default
    return max(1, min(8, parsed))


def _collect_candidate_files(
    mappings: list[FolderMapping], include_extensions: set[str], exclude_patterns: list[str]
) -> list[tuple[FolderMapping, Path]]:
    candidates: list[tuple[FolderMapping, Path]] = []

    for mapping in mappings:
        mapping_path = Path(mapping.source_path)
        if not mapping_path.exists() or not mapping_path.is_dir():
            continue

        if mapping.recursive:
            iterator = mapping_path.rglob("*")
        else:
            iterator = mapping_path.glob("*")

        for file_path in iterator:
            if not file_path.is_file():
                continue

            extension = file_path.suffix.lower().lstrip(".")
            if extension not in include_extensions:
                continue

            path_text = str(file_path)
            if _matches_exclude(path_text, exclude_patterns):
                continue

            candidates.append((mapping, file_path))

    return candidates


def _probe_media(file_path: Path, timeout_seconds: int) -> dict[str, Any]:
    command = [
        "ffprobe",
        "-v",
        "error",
        "-print_format",
        "json",
        "-show_streams",
        "-show_format",
        str(file_path),
    ]

    try:
        completed = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=timeout_seconds,
            check=False,
        )
    except FileNotFoundError:
        return {"probe_error": "ffprobe not available in runtime image"}
    except subprocess.TimeoutExpired:
        return {"probe_error": f"ffprobe timeout after {timeout_seconds}s"}

    if completed.returncode != 0:
        error_message = completed.stderr.strip() or f"ffprobe exited with {completed.returncode}"
        return {"probe_error": error_message}

    try:
        parsed = json.loads(completed.stdout)
    except json.JSONDecodeError:
        return {"probe_error": "Invalid ffprobe JSON output"}

    streams = parsed.get("streams", [])
    video_stream = next((stream for stream in streams if stream.get("codec_type") == "video"), None)
    format_data = parsed.get("format", {})
    tags = format_data.get("tags") or {}

    bitrate_value = None
    bitrate_raw = None
    if video_stream is not None:
        bitrate_raw = video_stream.get("bit_rate")
    if bitrate_raw is None:
        bitrate_raw = format_data.get("bit_rate")

    if bitrate_raw is not None:
        try:
            bitrate_value = int(int(bitrate_raw) / 1000)
        except (TypeError, ValueError):
            bitrate_value = None

    return {
        "codec": None if video_stream is None else video_stream.get("codec_name"),
        "pixel_format": None if video_stream is None else video_stream.get("pix_fmt"),
        "width": None if video_stream is None else video_stream.get("width"),
        "height": None if video_stream is None else video_stream.get("height"),
        "video_profile": None if video_stream is None else video_stream.get("profile"),
        "bitrate_kbps": bitrate_value,
        "tags": tags,
        "probe_error": None,
    }


def _evaluate_quality(
    probe_data: dict[str, Any],
    profile: QualityProfile,
    file_extension: str | None = None,
) -> str:
    codec = probe_data.get("codec")
    pixel_format = probe_data.get("pixel_format")
    width = probe_data.get("width")
    height = probe_data.get("height")
    bitrate_kbps = probe_data.get("bitrate_kbps")
    video_profile = probe_data.get("video_profile")

    if codec is None:
        return "unknown"

    if codec != profile.codec:
        return "below_profile"

    if profile.file_format:
        allowed_file_formats = {
            value.strip().lower().lstrip(".")
            for value in profile.file_format.split(",")
            if value.strip()
        }
        normalized_extension = None if file_extension is None else file_extension.strip().lower().lstrip(".")
        if normalized_extension is None or normalized_extension not in allowed_file_formats:
            return "below_profile"

    if profile.pixel_format:
        allowed_pixel_formats = {
            value.strip().lower()
            for value in profile.pixel_format.split(",")
            if value.strip()
        }
        normalized_pixel_format = None if pixel_format is None else str(pixel_format).strip().lower()
        if normalized_pixel_format is None or normalized_pixel_format not in allowed_pixel_formats:
            return "below_profile"

    if profile.min_width is not None and isinstance(width, int) and width < profile.min_width:
        return "below_profile"

    if profile.min_height is not None and isinstance(height, int) and height < profile.min_height:
        return "below_profile"

    if profile.min_bitrate_kbps is not None and isinstance(bitrate_kbps, int):
        if bitrate_kbps < profile.min_bitrate_kbps:
            return "below_profile"

    if profile.max_bitrate_kbps is not None and isinstance(bitrate_kbps, int):
        if bitrate_kbps > profile.max_bitrate_kbps:
            return "below_profile"

    if profile.required_profile and video_profile != profile.required_profile:
        return "below_profile"

    return "meets_profile"


def _evaluate_tag(probe_data: dict[str, Any], rule: MetadataTagRule) -> tuple[str, str | None]:
    tags = probe_data.get("tags") or {}
    value = tags.get(rule.tag_key)
    if value is None:
        return ("missing_tag", None)

    value_str = str(value)
    expected = rule.tag_value
    if rule.match_mode == "contains":
        return ("tag_match" if expected in value_str else "tag_mismatch", value_str)

    return ("tag_match" if value_str == expected else "tag_mismatch", value_str)


def _serialize_tags(tags: dict[str, Any]) -> str | None:
    if not tags:
        return None
    return json.dumps(tags, sort_keys=True)


def _create_run(db: Session, run_type: str) -> ScanRun:
    run = ScanRun(run_type=run_type, status="running")
    db.add(run)
    db.commit()
    db.refresh(run)
    return run


def _complete_run(db: Session, run: ScanRun, message: str) -> ScanRun:
    run.status = "completed"
    run.message = message
    run.ended_at = datetime.now(timezone.utc)
    db.add(run)
    db.commit()
    db.refresh(run)
    return run


def _fail_run(db: Session, run: ScanRun, error_message: str) -> None:
    db.rollback()
    persisted_run = db.get(ScanRun, run.id)
    if persisted_run is None:
        return

    persisted_run.status = "failed"
    persisted_run.message = error_message
    persisted_run.ended_at = datetime.now(timezone.utc)
    db.add(persisted_run)
    db.commit()
    db.refresh(persisted_run)


def _lookup_scan_row(db: Session, file_path: Path, device_id: int | None, inode: int | None) -> MediaFileScan | None:
    if device_id is not None and inode is not None:
        existing = (
            db.query(MediaFileScan)
            .filter(MediaFileScan.device_id == device_id, MediaFileScan.inode == inode)
            .one_or_none()
        )
        if existing is not None:
            return existing

    return db.query(MediaFileScan).filter(MediaFileScan.file_path == str(file_path)).one_or_none()


def get_running_scan(db: Session, run_type: str) -> ScanRun | None:
    return (
        db.query(ScanRun)
        .filter(ScanRun.run_type == run_type, ScanRun.status == "running")
        .order_by(ScanRun.started_at.desc(), ScanRun.id.desc())
        .first()
    )


def has_pending_interrogation_work(db: Session) -> bool:
    pending_row = (
        db.query(MediaFileScan.id)
        .filter(
            MediaFileScan.is_removed.is_(False),
            or_(
                MediaFileScan.interrogated_at.is_(None),
                and_(
                    MediaFileScan.modified_at.is_not(None),
                    MediaFileScan.interrogated_at.is_not(None),
                    MediaFileScan.modified_at > MediaFileScan.interrogated_at,
                ),
            ),
        )
        .first()
    )
    return pending_row is not None


def has_never_interrogated_work(db: Session) -> bool:
    pending_row = (
        db.query(MediaFileScan.id)
        .filter(
            MediaFileScan.is_removed.is_(False),
            MediaFileScan.interrogated_at.is_(None),
        )
        .first()
    )
    return pending_row is not None


def fail_abandoned_runs(db: Session) -> None:
    abandoned_runs = db.query(ScanRun).filter(ScanRun.status == "running").all()
    if not abandoned_runs:
        return

    now = datetime.now(timezone.utc)
    for run in abandoned_runs:
        run.status = "failed"
        run.message = "Marked failed after application restart"
        run.ended_at = now
        db.add(run)

    db.commit()


def _inventory_worker(
    run_id: int,
    mapping_id: int,
    file_paths: list[str],
) -> InventoryWorkerResult:
    worker_db = SessionLocal()
    seen_result_ids: set[int] = set()
    processed_files = 0
    new_files = 0
    updated_files = 0
    error_files = 0
    last_error_message: str | None = None

    try:
        for path_text in file_paths:
            try:
                file_path = Path(path_text)
                stat = file_path.stat()
                device_id = None if stat.st_dev is None else int(stat.st_dev)
                inode = None if stat.st_ino is None else int(stat.st_ino)
                existing = _lookup_scan_row(worker_db, file_path, device_id, inode)
                is_new = existing is None
                media_row = existing if existing is not None else MediaFileScan(
                    file_path=str(file_path),
                    file_name=file_path.name,
                    extension=file_path.suffix.lower().lstrip("."),
                )

                now = datetime.now(timezone.utc)
                media_row.file_name = file_path.name
                media_row.file_path = str(file_path)
                media_row.extension = file_path.suffix.lower().lstrip(".")
                media_row.device_id = device_id
                media_row.inode = inode
                media_row.folder_mapping_id = mapping_id
                media_row.scan_run_id = run_id
                media_row.size_bytes = stat.st_size
                media_row.modified_at = datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc)
                media_row.is_removed = False
                media_row.removed_at = None
                media_row.last_seen_at = now
                media_row.inventory_scanned_at = now

                worker_db.add(media_row)
                worker_db.commit()
                worker_db.refresh(media_row)

                processed_files += 1
                if is_new:
                    new_files += 1
                else:
                    updated_files += 1
                seen_result_ids.add(media_row.id)
            except Exception as worker_error:
                worker_db.rollback()
                processed_files += 1
                error_files += 1
                last_error_message = str(worker_error)
    finally:
        worker_db.close()

    return InventoryWorkerResult(
        seen_result_ids=seen_result_ids,
        processed_files=processed_files,
        new_files=new_files,
        updated_files=updated_files,
        error_files=error_files,
        last_error_message=last_error_message,
    )


def _inventory_scan_impl(db: Session, run: ScanRun) -> ScanRun:
    active_mappings = (
        db.query(FolderMapping).filter(FolderMapping.is_active.is_(True)).order_by(FolderMapping.id.asc()).all()
    )

    if not active_mappings:
        raise ValueError("No active folder mapping configured")

    include_extensions = _parse_extensions(
        _get_setting(db, "scan.include_extensions", "mp4,mkv,mov,m4v,avi,webm")
    )
    exclude_patterns = _parse_patterns(_get_setting(db, "scan.exclude_patterns", ""))
    retention_raw = _get_setting(db, "scan.hard_delete_after_days", "14")
    try:
        hard_delete_after_days = max(0, int(retention_raw))
    except ValueError:
        hard_delete_after_days = 14

    try:
        candidates = _collect_candidate_files(active_mappings, include_extensions, exclude_patterns)
        active_mapping_ids = [mapping.id for mapping in active_mappings]

        mapping_file_paths: dict[int, list[str]] = {mapping.id: [] for mapping in active_mappings}
        dedupe_paths: set[str] = set()
        for mapping, file_path in candidates:
            file_path_text = str(file_path)
            if file_path_text in dedupe_paths:
                continue
            dedupe_paths.add(file_path_text)
            mapping_file_paths[mapping.id].append(file_path_text)

        run.total_files = len(dedupe_paths)
        db.add(run)
        db.commit()

        seen_result_ids: set[int] = set()
        worker_futures = []
        with ThreadPoolExecutor(max_workers=max(1, len(active_mappings))) as executor:
            for mapping in active_mappings:
                file_paths = mapping_file_paths.get(mapping.id, [])
                if not file_paths:
                    continue
                worker_futures.append(
                    executor.submit(
                        _inventory_worker,
                        run.id,
                        mapping.id,
                        file_paths,
                    )
                )

            for worker_future in as_completed(worker_futures):
                worker_result = worker_future.result()
                run.processed_files += worker_result.processed_files
                run.new_files += worker_result.new_files
                run.updated_files += worker_result.updated_files
                run.error_files += worker_result.error_files
                if worker_result.last_error_message:
                    run.message = worker_result.last_error_message
                seen_result_ids.update(worker_result.seen_result_ids)
                db.add(run)
                db.commit()

        stale_rows = (
            db.query(MediaFileScan)
            .filter(
                MediaFileScan.is_removed.is_(False),
                MediaFileScan.folder_mapping_id.in_(active_mapping_ids),
            )
            .all()
        )
        for stale_row in stale_rows:
            if stale_row.id in seen_result_ids:
                continue

            stale_row.is_removed = True
            stale_row.removed_at = datetime.now(timezone.utc)
            stale_row.scan_run_id = run.id
            db.add(stale_row)
            db.commit()

        hard_delete_cutoff = datetime.now(timezone.utc) - timedelta(days=hard_delete_after_days)
        removable_rows = (
            db.query(MediaFileScan)
            .filter(
                MediaFileScan.is_removed.is_(True),
                MediaFileScan.folder_mapping_id.in_(active_mapping_ids),
                MediaFileScan.removed_at.is_not(None),
                MediaFileScan.removed_at < hard_delete_cutoff,
            )
            .all()
        )
        for removable_row in removable_rows:
            db.delete(removable_row)
            db.commit()

        return _complete_run(db, run, "Inventory scan completed")
    except Exception as scan_error:
        _fail_run(db, run, str(scan_error))
        raise


def _interrogation_worker(
    run_id: int,
    result_id: int,
    timeout_seconds: int,
    profile_id: int,
    tag_rule_id: int,
) -> InterrogationWorkerResult:
    worker_db = SessionLocal()
    try:
        media_row = worker_db.get(MediaFileScan, result_id)
        if media_row is None:
            return InterrogationWorkerResult(is_success=False, is_new=False, error_message="Scan result not found")

        active_profile = worker_db.get(QualityProfile, profile_id)
        active_tag_rule = worker_db.get(MetadataTagRule, tag_rule_id)
        if active_profile is None:
            return InterrogationWorkerResult(
                is_success=False,
                is_new=False,
                error_message="No active quality profile configured",
            )
        if active_tag_rule is None:
            return InterrogationWorkerResult(
                is_success=False,
                is_new=False,
                error_message="No active metadata tag rule configured",
            )

        file_path = Path(media_row.file_path)
        if not file_path.exists() or not file_path.is_file():
            return InterrogationWorkerResult(
                is_success=False,
                is_new=False,
                error_message=f"File missing during interrogation: {media_row.file_path}",
            )

        stat = file_path.stat()
        probe_data = _probe_media(file_path, timeout_seconds)
        quality_status = _evaluate_quality(probe_data, active_profile, media_row.extension)
        tag_status, tag_value = _evaluate_tag(probe_data, active_tag_rule)

        now = datetime.now(timezone.utc)
        is_first_interrogation = media_row.interrogated_at is None

        media_row.file_name = file_path.name
        media_row.extension = file_path.suffix.lower().lstrip(".")
        media_row.size_bytes = stat.st_size
        media_row.modified_at = datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc)
        media_row.scan_run_id = run_id
        media_row.codec = probe_data.get("codec")
        media_row.pixel_format = probe_data.get("pixel_format")
        media_row.width = probe_data.get("width")
        media_row.height = probe_data.get("height")
        media_row.bitrate_kbps = probe_data.get("bitrate_kbps")
        media_row.video_profile = probe_data.get("video_profile")
        media_row.tag_key = active_tag_rule.tag_key
        media_row.tag_value = tag_value
        media_row.all_tags_json = _serialize_tags(probe_data.get("tags") or {})
        media_row.quality_status = quality_status
        media_row.tag_status = tag_status
        media_row.probe_error = probe_data.get("probe_error")
        media_row.interrogated_at = now
        media_row.scanned_at = now

        worker_db.add(media_row)
        worker_db.commit()

        return InterrogationWorkerResult(is_success=True, is_new=is_first_interrogation, error_message=None)
    except Exception as worker_error:
        worker_db.rollback()
        return InterrogationWorkerResult(is_success=False, is_new=False, error_message=str(worker_error))
    finally:
        worker_db.close()


def _interrogation_scan_impl(db: Session, run: ScanRun) -> ScanRun:
    active_profile = (
        db.query(QualityProfile)
        .filter(QualityProfile.is_active.is_(True))
        .order_by(QualityProfile.id.asc())
        .first()
    )
    active_tag_rule = (
        db.query(MetadataTagRule)
        .filter(MetadataTagRule.is_active.is_(True))
        .order_by(MetadataTagRule.id.asc())
        .first()
    )

    if active_profile is None:
        raise ValueError("No active quality profile configured")
    if active_tag_rule is None:
        raise ValueError("No active metadata tag rule configured")

    timeout_raw = _get_setting(db, "scan.ffprobe_timeout_seconds", "30")
    try:
        timeout_seconds = int(timeout_raw)
    except ValueError:
        timeout_seconds = 30

    workers_raw = _get_setting(db, "scan.interrogation_workers", "2")
    interrogation_workers = _parse_interrogation_workers(workers_raw, default=2)

    try:
        target_ids = [
            row.id
            for row in db.query(MediaFileScan.id)
            .filter(MediaFileScan.is_removed.is_(False))
            .order_by(MediaFileScan.id.asc())
            .all()
        ]

        run.total_files = len(target_ids)
        db.add(run)
        db.commit()

        worker_futures = []
        with ThreadPoolExecutor(max_workers=interrogation_workers) as executor:
            for result_id in target_ids:
                worker_futures.append(
                    executor.submit(
                        _interrogation_worker,
                        run.id,
                        result_id,
                        timeout_seconds,
                        active_profile.id,
                        active_tag_rule.id,
                    )
                )

            for worker_future in as_completed(worker_futures):
                worker_result = worker_future.result()
                run.processed_files += 1
                if worker_result.is_success:
                    if worker_result.is_new:
                        run.new_files += 1
                    else:
                        run.updated_files += 1
                else:
                    run.error_files += 1
                    run.message = worker_result.error_message
                db.add(run)
                db.commit()

        return _complete_run(db, run, "Interrogation scan completed")
    except Exception as scan_error:
        _fail_run(db, run, str(scan_error))
        raise


def _run_inventory_scan_in_thread(run_id: int) -> None:
    db = SessionLocal()
    try:
        run = db.get(ScanRun, run_id)
        if run is None:
            return
        _inventory_scan_impl(db, run)
    finally:
        db.close()


def _run_interrogation_scan_in_thread(run_id: int) -> None:
    db = SessionLocal()
    try:
        run = db.get(ScanRun, run_id)
        if run is None:
            return
        _interrogation_scan_impl(db, run)
    finally:
        db.close()


def launch_inventory_scan(db: Session) -> ScanRun:
    with _scan_thread_lock:
        existing_run = get_running_scan(db, "inventory")
        if existing_run is not None:
            db.refresh(existing_run)
            return existing_run

        run = _create_run(db, "inventory")
        threading.Thread(target=_run_inventory_scan_in_thread, args=(run.id,), daemon=True).start()
        db.refresh(run)
        return run


def launch_interrogation_scan(db: Session) -> ScanRun:
    with _scan_thread_lock:
        existing_run = get_running_scan(db, "interrogation")
        if existing_run is not None:
            db.refresh(existing_run)
            return existing_run

        run = _create_run(db, "interrogation")
        threading.Thread(target=_run_interrogation_scan_in_thread, args=(run.id,), daemon=True).start()
        db.refresh(run)
        return run


def interrogate_scan_result(db: Session, result_id: int) -> MediaFileScan:
    existing_run = get_running_scan(db, "interrogation")
    if existing_run is not None:
        raise RuntimeError("An interrogation scan is already running")

    media_row = db.get(MediaFileScan, result_id)
    if media_row is None:
        raise LookupError("Scan result not found")
    if media_row.is_removed:
        raise ValueError("Removed files cannot be interrogated")

    active_profile = (
        db.query(QualityProfile)
        .filter(QualityProfile.is_active.is_(True))
        .order_by(QualityProfile.id.asc())
        .first()
    )
    active_tag_rule = (
        db.query(MetadataTagRule)
        .filter(MetadataTagRule.is_active.is_(True))
        .order_by(MetadataTagRule.id.asc())
        .first()
    )

    if active_profile is None:
        raise ValueError("No active quality profile configured")
    if active_tag_rule is None:
        raise ValueError("No active metadata tag rule configured")

    timeout_raw = _get_setting(db, "scan.ffprobe_timeout_seconds", "30")
    try:
        timeout_seconds = int(timeout_raw)
    except ValueError:
        timeout_seconds = 30

    run = _create_run(db, "interrogation")
    run.total_files = 1
    db.add(run)
    db.commit()

    try:
        file_path = Path(media_row.file_path)
        if not file_path.exists() or not file_path.is_file():
            raise FileNotFoundError(f"File missing during interrogation: {media_row.file_path}")

        stat = file_path.stat()
        probe_data = _probe_media(file_path, timeout_seconds)
        quality_status = _evaluate_quality(probe_data, active_profile, media_row.extension)
        tag_status, tag_value = _evaluate_tag(probe_data, active_tag_rule)

        now = datetime.now(timezone.utc)
        is_first_interrogation = media_row.interrogated_at is None

        media_row.file_name = file_path.name
        media_row.extension = file_path.suffix.lower().lstrip(".")
        media_row.size_bytes = stat.st_size
        media_row.modified_at = datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc)
        media_row.scan_run_id = run.id
        media_row.codec = probe_data.get("codec")
        media_row.pixel_format = probe_data.get("pixel_format")
        media_row.width = probe_data.get("width")
        media_row.height = probe_data.get("height")
        media_row.bitrate_kbps = probe_data.get("bitrate_kbps")
        media_row.video_profile = probe_data.get("video_profile")
        media_row.tag_key = active_tag_rule.tag_key
        media_row.tag_value = tag_value
        media_row.all_tags_json = _serialize_tags(probe_data.get("tags") or {})
        media_row.quality_status = quality_status
        media_row.tag_status = tag_status
        media_row.probe_error = probe_data.get("probe_error")
        media_row.interrogated_at = now
        media_row.scanned_at = now

        run.processed_files = 1
        run.new_files = 1 if is_first_interrogation else 0
        run.updated_files = 0 if is_first_interrogation else 1

        db.add(media_row)
        db.add(run)
        db.commit()
        db.refresh(media_row)

        _complete_run(db, run, f"Interrogated result {media_row.id}")
        return media_row
    except Exception as interrogation_error:
        _fail_run(db, run, str(interrogation_error))
        raise


def run_inventory_scan(db: Session) -> ScanRun:
    existing_run = get_running_scan(db, "inventory")
    if existing_run is not None:
        return existing_run

    run = _create_run(db, "inventory")
    return _inventory_scan_impl(db, run)


def run_interrogation_scan(db: Session) -> ScanRun:
    existing_run = get_running_scan(db, "interrogation")
    if existing_run is not None:
        return existing_run

    run = _create_run(db, "interrogation")
    return _interrogation_scan_impl(db, run)


def run_scan(db: Session) -> ScanRun:
    return run_inventory_scan(db)
