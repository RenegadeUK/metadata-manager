from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import and_, case, func, literal
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.media_file_scan import MediaFileScan
from app.models.quality_profile import QualityProfile
from app.models.scan_run import ScanRun
from app.services.scanner import interrogate_scan_result, launch_interrogation_scan, launch_inventory_scan

router = APIRouter(prefix="/api/scan", tags=["scan"])


class ScanRunRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    run_type: str
    status: str
    total_files: int
    processed_files: int
    new_files: int
    updated_files: int
    error_files: int
    message: str | None
    started_at: datetime
    ended_at: datetime | None


class MediaFileScanRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    file_path: str
    file_name: str
    extension: str
    device_id: int | None
    inode: int | None
    folder_mapping_id: int | None
    scan_run_id: int | None
    size_bytes: int | None
    modified_at: datetime | None
    codec: str | None
    pixel_format: str | None
    width: int | None
    height: int | None
    bitrate_kbps: int | None
    video_profile: str | None
    tag_key: str | None
    tag_value: str | None
    all_tags_json: str | None
    quality_status: str
    tag_status: str
    probe_error: str | None
    is_removed: bool
    removed_at: datetime | None
    last_seen_at: datetime | None
    inventory_scanned_at: datetime | None
    interrogated_at: datetime | None
    scanned_at: datetime


class FolderScanSummaryRead(BaseModel):
    folder_mapping_id: int | None
    file_count: int
    compliant_count: int


class ScanFilterOptionsRead(BaseModel):
    extensions: list[str]
    codecs: list[str]
    pixel_formats: list[str]


class ScanResultsPageRead(BaseModel):
    items: list[MediaFileScanRead]
    total_count: int
    limit: int
    offset: int


@router.post("/run", response_model=ScanRunRead, status_code=status.HTTP_202_ACCEPTED)
def start_scan(db: Session = Depends(get_db)) -> ScanRun:
    try:
        return launch_inventory_scan(db)
    except ValueError as config_error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(config_error)) from config_error


@router.post("/run/inventory", response_model=ScanRunRead, status_code=status.HTTP_202_ACCEPTED)
def start_inventory_scan(db: Session = Depends(get_db)) -> ScanRun:
    try:
        return launch_inventory_scan(db)
    except ValueError as config_error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(config_error)) from config_error


@router.post("/run/interrogation", response_model=ScanRunRead, status_code=status.HTTP_202_ACCEPTED)
def start_interrogation_scan(db: Session = Depends(get_db)) -> ScanRun:
    try:
        return launch_interrogation_scan(db)
    except ValueError as config_error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(config_error)) from config_error


@router.get("/runs", response_model=list[ScanRunRead])
def list_scan_runs(
    run_type: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[ScanRun]:
    query = db.query(ScanRun)
    if run_type:
        query = query.filter(ScanRun.run_type == run_type)
    return query.order_by(ScanRun.id.desc()).limit(100).all()


@router.get("/results", response_model=ScanResultsPageRead)
def list_scan_results(
    path_query: str | None = Query(default=None),
    folder_mapping_id: int | None = Query(default=None),
    extension: str | None = Query(default=None),
    codec: str | None = Query(default=None),
    pixel_format: str | None = Query(default=None),
    tag_status: str | None = Query(default=None),
    removed: bool | None = Query(default=None),
    limit: int = Query(default=200, ge=1, le=2000),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> ScanResultsPageRead:
    query = db.query(MediaFileScan).order_by(MediaFileScan.scanned_at.desc())

    if path_query:
        query = query.filter(MediaFileScan.file_path.ilike(f"%{path_query}%"))
    if folder_mapping_id is not None:
        query = query.filter(MediaFileScan.folder_mapping_id == folder_mapping_id)
    if extension:
        query = query.filter(MediaFileScan.extension == extension.lower().lstrip("."))
    if codec:
        query = query.filter(MediaFileScan.codec.ilike(codec.strip()))
    if pixel_format:
        query = query.filter(MediaFileScan.pixel_format.ilike(pixel_format.strip()))
    if tag_status:
        query = query.filter(MediaFileScan.tag_status == tag_status)
    if removed is not None:
        query = query.filter(MediaFileScan.is_removed.is_(removed))

    total_count = query.count()
    items = query.offset(offset).limit(limit).all()

    return ScanResultsPageRead(
        items=items,
        total_count=total_count,
        limit=limit,
        offset=offset,
    )


@router.get("/folder-summary", response_model=list[FolderScanSummaryRead])
def list_folder_summary(db: Session = Depends(get_db)) -> list[FolderScanSummaryRead]:
    active_profile = (
        db.query(QualityProfile)
        .filter(QualityProfile.is_active.is_(True))
        .order_by(QualityProfile.id.asc())
        .first()
    )

    compliant_condition = literal(False)
    if active_profile is not None:
        compliant_condition = MediaFileScan.codec == active_profile.codec
        if active_profile.pixel_format:
            allowed_pixel_formats = [
                value.strip()
                for value in active_profile.pixel_format.split(",")
                if value.strip()
            ]
            compliant_condition = and_(
                compliant_condition,
                MediaFileScan.pixel_format.in_(allowed_pixel_formats),
            )

    rows = (
        db.query(
            MediaFileScan.folder_mapping_id.label("folder_mapping_id"),
            func.count(MediaFileScan.id).label("file_count"),
            func.sum(case((compliant_condition, 1), else_=0)).label("compliant_count"),
        )
        .filter(MediaFileScan.is_removed.is_(False))
        .group_by(MediaFileScan.folder_mapping_id)
        .all()
    )

    return [
        FolderScanSummaryRead(
            folder_mapping_id=row.folder_mapping_id,
            file_count=row.file_count,
            compliant_count=int(row.compliant_count or 0),
        )
        for row in rows
    ]


@router.get("/filter-options", response_model=ScanFilterOptionsRead)
def get_scan_filter_options(db: Session = Depends(get_db)) -> ScanFilterOptionsRead:
    extensions = [
        row[0]
        for row in db.query(MediaFileScan.extension)
        .filter(MediaFileScan.extension.is_not(None), MediaFileScan.extension != "")
        .distinct()
        .order_by(MediaFileScan.extension.asc())
        .all()
    ]
    codecs = [
        row[0]
        for row in db.query(MediaFileScan.codec)
        .filter(MediaFileScan.codec.is_not(None), MediaFileScan.codec != "")
        .distinct()
        .order_by(MediaFileScan.codec.asc())
        .all()
    ]
    pixel_formats = [
        row[0]
        for row in db.query(MediaFileScan.pixel_format)
        .filter(MediaFileScan.pixel_format.is_not(None), MediaFileScan.pixel_format != "")
        .distinct()
        .order_by(MediaFileScan.pixel_format.asc())
        .all()
    ]

    return ScanFilterOptionsRead(
        extensions=extensions,
        codecs=codecs,
        pixel_formats=pixel_formats,
    )


@router.get("/results/{result_id}", response_model=MediaFileScanRead)
def get_scan_result(result_id: int, db: Session = Depends(get_db)) -> MediaFileScan:
    row = db.get(MediaFileScan, result_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scan result not found")
    return row


@router.post("/results/{result_id}/interrogate", response_model=MediaFileScanRead)
def interrogate_result(result_id: int, db: Session = Depends(get_db)) -> MediaFileScan:
    try:
        return interrogate_scan_result(db, result_id)
    except LookupError as not_found_error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(not_found_error)) from not_found_error
    except RuntimeError as conflict_error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(conflict_error)) from conflict_error
    except ValueError as validation_error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(validation_error)) from validation_error
