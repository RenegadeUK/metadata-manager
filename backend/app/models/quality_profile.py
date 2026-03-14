from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class QualityProfile(Base):
    __tablename__ = "quality_profiles"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    codec: Mapped[str] = mapped_column(String(100), nullable=False)
    pixel_format: Mapped[str | None] = mapped_column(String(100), nullable=True)
    min_bitrate_kbps: Mapped[int | None] = mapped_column(Integer, nullable=True)
    max_bitrate_kbps: Mapped[int | None] = mapped_column(Integer, nullable=True)
    min_width: Mapped[int | None] = mapped_column(Integer, nullable=True)
    min_height: Mapped[int | None] = mapped_column(Integer, nullable=True)
    required_profile: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
