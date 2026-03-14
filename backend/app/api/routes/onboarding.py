from pathlib import Path

from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.models.app_setting import AppSetting
from app.models.folder_mapping import FolderMapping
from app.models.metadata_tag_rule import MetadataTagRule
from app.models.quality_profile import QualityProfile

router = APIRouter(prefix="/api/onboarding", tags=["onboarding"])

DEFAULT_SCAN_SETTINGS = {
    "scan.include_extensions": "mp4,mkv,mov,m4v,avi,webm",
    "scan.exclude_patterns": "",
    "scan.ffprobe_timeout_seconds": "30",
    "scan.hard_delete_after_days": "14",
    "scan.inventory_interval_seconds": "3600",
    "scan.interrogation_interval_seconds": "3600",
    "scan.interrogation_workers": "2",
}


class FolderMappingPayload(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    source_path: str
    recursive: bool = True
    is_active: bool = True
    notes: str | None = None


class FolderMappingRead(FolderMappingPayload):
    id: int

    model_config = {"from_attributes": True}


class QualityProfilePayload(BaseModel):
    name: str
    is_active: bool = True
    codec: str
    pixel_format: str | None = None
    min_bitrate_kbps: int | None = None
    max_bitrate_kbps: int | None = None
    min_width: int | None = None
    min_height: int | None = None
    required_profile: str | None = None


class QualityProfileRead(QualityProfilePayload):
    id: int

    model_config = {"from_attributes": True}


class MetadataTagRulePayload(BaseModel):
    name: str
    is_active: bool = True
    tag_key: str
    tag_value: str
    match_mode: str = "exact"


class MetadataTagRuleRead(MetadataTagRulePayload):
    id: int

    model_config = {"from_attributes": True}


class ScanSettingsPayload(BaseModel):
    include_extensions: str = Field(alias="scan.include_extensions")
    exclude_patterns: str = Field(alias="scan.exclude_patterns")
    ffprobe_timeout_seconds: str = Field(alias="scan.ffprobe_timeout_seconds")
    hard_delete_after_days: str = Field(alias="scan.hard_delete_after_days")
    inventory_interval_seconds: str = Field(alias="scan.inventory_interval_seconds")
    interrogation_interval_seconds: str = Field(alias="scan.interrogation_interval_seconds")
    interrogation_workers: str = Field(alias="scan.interrogation_workers")

    model_config = {"populate_by_name": True}


class OnboardingStatus(BaseModel):
    ready: bool
    missing_requirements: list[str]


class OnboardingDefaults(BaseModel):
    quality_profile: QualityProfilePayload
    metadata_tag_rule: MetadataTagRulePayload


class MediaDirectoryRead(BaseModel):
    name: str
    path: str
    has_children: bool


class MediaDirectoryBrowserResponse(BaseModel):
    current_path: str
    parent_path: str | None
    directories: list[MediaDirectoryRead]


def _upsert_setting(db: Session, key: str, value: str) -> None:
    setting = db.query(AppSetting).filter(AppSetting.key == key).one_or_none()
    if setting is None:
        setting = AppSetting(key=key, value=value)
        db.add(setting)
    else:
        setting.value = value


def _is_within_path(path: Path, root: Path) -> bool:
    try:
        path.relative_to(root)
    except ValueError:
        return False
    return True


def _has_child_directories(path: Path) -> bool:
    try:
        return any(child.is_dir() for child in path.iterdir())
    except OSError:
        return False


@router.get("/status", response_model=OnboardingStatus)
def get_onboarding_status(db: Session = Depends(get_db)) -> OnboardingStatus:
    has_mapping = db.query(FolderMapping).filter(FolderMapping.is_active.is_(True)).first() is not None
    has_profile = db.query(QualityProfile).filter(QualityProfile.is_active.is_(True)).first() is not None
    has_tag_rule = (
        db.query(MetadataTagRule).filter(MetadataTagRule.is_active.is_(True)).first() is not None
    )

    missing: list[str] = []
    if not has_mapping:
        missing.append("active_folder_mapping")
    if not has_profile:
        missing.append("active_quality_profile")
    if not has_tag_rule:
        missing.append("active_metadata_tag_rule")

    return OnboardingStatus(ready=len(missing) == 0, missing_requirements=missing)


@router.get("/defaults", response_model=OnboardingDefaults)
def get_onboarding_defaults() -> OnboardingDefaults:
    return OnboardingDefaults(
        quality_profile=QualityProfilePayload(
            name="Zombie HEVC",
            is_active=True,
            codec="hevc",
            pixel_format="p010le",
            min_bitrate_kbps=None,
            max_bitrate_kbps=None,
            min_width=None,
            min_height=None,
            required_profile=None,
        ),
        metadata_tag_rule=MetadataTagRulePayload(
            name="Zombie Encoded",
            is_active=True,
            tag_key="encoded_by",
            tag_value="zombie",
            match_mode="exact",
        ),
    )


@router.get("/media-directories", response_model=MediaDirectoryBrowserResponse)
def browse_media_directories(path: str | None = Query(default=None)) -> MediaDirectoryBrowserResponse:
    settings = get_settings()
    media_root = settings.media_dir.resolve()
    requested_path = media_root if path is None else Path(path).resolve()

    if not _is_within_path(requested_path, media_root):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Path must be inside media root",
        )

    if not requested_path.exists() or not requested_path.is_dir():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Directory not found",
        )

    directories: list[MediaDirectoryRead] = []
    for child in sorted(requested_path.iterdir(), key=lambda entry: entry.name.lower()):
        if not child.is_dir():
            continue
        directories.append(
            MediaDirectoryRead(
                name=child.name,
                path=str(child),
                has_children=_has_child_directories(child),
            )
        )

    parent_path: str | None = None
    if requested_path != media_root:
        parent = requested_path.parent
        if _is_within_path(parent, media_root):
            parent_path = str(parent)

    return MediaDirectoryBrowserResponse(
        current_path=str(requested_path),
        parent_path=parent_path,
        directories=directories,
    )


@router.get("/folder-mappings", response_model=list[FolderMappingRead])
def list_folder_mappings(db: Session = Depends(get_db)) -> list[FolderMapping]:
    return db.query(FolderMapping).order_by(FolderMapping.id.asc()).all()


@router.post("/folder-mappings", response_model=FolderMappingRead, status_code=status.HTTP_201_CREATED)
def create_folder_mapping(payload: FolderMappingPayload, db: Session = Depends(get_db)) -> FolderMapping:
    normalized_name = payload.name.strip()
    if (
        db.query(FolderMapping).filter(FolderMapping.name == normalized_name).first()
        is not None
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Folder mapping name already exists",
        )

    mapping_data = payload.model_dump()
    mapping_data["name"] = normalized_name
    mapping = FolderMapping(**mapping_data)
    db.add(mapping)
    db.commit()
    db.refresh(mapping)
    return mapping


@router.put("/folder-mappings/{mapping_id}", response_model=FolderMappingRead)
def update_folder_mapping(
    mapping_id: int, payload: FolderMappingPayload, db: Session = Depends(get_db)
) -> FolderMapping:
    mapping = db.get(FolderMapping, mapping_id)
    if mapping is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder mapping not found")

    normalized_name = payload.name.strip()
    existing_name = (
        db.query(FolderMapping)
        .filter(FolderMapping.name == normalized_name, FolderMapping.id != mapping_id)
        .first()
    )
    if existing_name is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Folder mapping name already exists",
        )

    payload_data = payload.model_dump()
    payload_data["name"] = normalized_name
    for key, value in payload_data.items():
        setattr(mapping, key, value)

    db.commit()
    db.refresh(mapping)
    return mapping


@router.delete("/folder-mappings/{mapping_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_folder_mapping(mapping_id: int, db: Session = Depends(get_db)) -> None:
    mapping = db.get(FolderMapping, mapping_id)
    if mapping is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder mapping not found")

    db.delete(mapping)
    db.commit()


@router.get("/quality-profiles", response_model=list[QualityProfileRead])
def list_quality_profiles(db: Session = Depends(get_db)) -> list[QualityProfile]:
    return db.query(QualityProfile).order_by(QualityProfile.id.asc()).all()


@router.post("/quality-profiles", response_model=QualityProfileRead, status_code=status.HTTP_201_CREATED)
def create_quality_profile(payload: QualityProfilePayload, db: Session = Depends(get_db)) -> QualityProfile:
    profile = QualityProfile(**payload.model_dump())
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


@router.put("/quality-profiles/{profile_id}", response_model=QualityProfileRead)
def update_quality_profile(
    profile_id: int, payload: QualityProfilePayload, db: Session = Depends(get_db)
) -> QualityProfile:
    profile = db.get(QualityProfile, profile_id)
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quality profile not found")

    for key, value in payload.model_dump().items():
        setattr(profile, key, value)

    db.commit()
    db.refresh(profile)
    return profile


@router.delete("/quality-profiles/{profile_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_quality_profile(profile_id: int, db: Session = Depends(get_db)) -> None:
    profile = db.get(QualityProfile, profile_id)
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quality profile not found")

    db.delete(profile)
    db.commit()


@router.get("/metadata-tag-rules", response_model=list[MetadataTagRuleRead])
def list_metadata_tag_rules(db: Session = Depends(get_db)) -> list[MetadataTagRule]:
    return db.query(MetadataTagRule).order_by(MetadataTagRule.id.asc()).all()


@router.post("/metadata-tag-rules", response_model=MetadataTagRuleRead, status_code=status.HTTP_201_CREATED)
def create_metadata_tag_rule(
    payload: MetadataTagRulePayload, db: Session = Depends(get_db)
) -> MetadataTagRule:
    rule = MetadataTagRule(**payload.model_dump())
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


@router.put("/metadata-tag-rules/{rule_id}", response_model=MetadataTagRuleRead)
def update_metadata_tag_rule(
    rule_id: int, payload: MetadataTagRulePayload, db: Session = Depends(get_db)
) -> MetadataTagRule:
    rule = db.get(MetadataTagRule, rule_id)
    if rule is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Metadata tag rule not found")

    for key, value in payload.model_dump().items():
        setattr(rule, key, value)

    db.commit()
    db.refresh(rule)
    return rule


@router.delete("/metadata-tag-rules/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_metadata_tag_rule(rule_id: int, db: Session = Depends(get_db)) -> None:
    rule = db.get(MetadataTagRule, rule_id)
    if rule is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Metadata tag rule not found")

    db.delete(rule)
    db.commit()


@router.get("/scan-settings", response_model=ScanSettingsPayload)
def get_scan_settings(db: Session = Depends(get_db)) -> dict[str, str]:
    values: dict[str, str] = {}
    for key, default_value in DEFAULT_SCAN_SETTINGS.items():
        setting = db.query(AppSetting).filter(AppSetting.key == key).one_or_none()
        values[key] = default_value if setting is None else setting.value
    return values


@router.put("/scan-settings", response_model=ScanSettingsPayload)
def update_scan_settings(payload: ScanSettingsPayload, db: Session = Depends(get_db)) -> dict[str, str]:
    values = payload.model_dump(by_alias=True)
    for key, value in values.items():
        _upsert_setting(db, key, value)

    db.commit()
    return values
