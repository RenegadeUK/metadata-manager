from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class MediaFileScan(Base):
    __tablename__ = "media_file_scans"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    file_path: Mapped[str] = mapped_column(String(4096), unique=True, nullable=False)
    file_name: Mapped[str] = mapped_column(String(1024), nullable=False)
    extension: Mapped[str] = mapped_column(String(32), nullable=False)
    device_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    inode: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    folder_mapping_id: Mapped[int | None] = mapped_column(
        ForeignKey("folder_mappings.id", ondelete="SET NULL"), nullable=True
    )
    scan_run_id: Mapped[int | None] = mapped_column(
        ForeignKey("scan_runs.id", ondelete="SET NULL"), nullable=True
    )
    size_bytes: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    modified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    codec: Mapped[str | None] = mapped_column(String(100), nullable=True)
    pixel_format: Mapped[str | None] = mapped_column(String(100), nullable=True)
    width: Mapped[int | None] = mapped_column(Integer, nullable=True)
    height: Mapped[int | None] = mapped_column(Integer, nullable=True)
    bitrate_kbps: Mapped[int | None] = mapped_column(Integer, nullable=True)
    video_profile: Mapped[str | None] = mapped_column(String(100), nullable=True)
    tag_key: Mapped[str | None] = mapped_column(String(255), nullable=True)
    tag_value: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    quality_status: Mapped[str] = mapped_column(String(50), nullable=False, default="unknown")
    tag_status: Mapped[str] = mapped_column(String(50), nullable=False, default="unknown")
    probe_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_removed: Mapped[bool] = mapped_column(default=False, nullable=False)
    removed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    inventory_scanned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    interrogated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    scanned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
