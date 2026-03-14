from sqlalchemy import case, func, literal

from app.models.media_file_scan import MediaFileScan
from app.models.quality_profile import QualityProfile


COMPLIANCE_CHECK_COUNT = 4


def build_media_scan_compliant_piece_count(active_profile: QualityProfile | None):
    codec_condition = literal(False)
    pixel_format_condition = literal(False)
    file_format_condition = literal(False)

    if active_profile is not None:
        normalized_codec = active_profile.codec.strip().lower()
        codec_condition = func.lower(func.coalesce(MediaFileScan.codec, "")) == normalized_codec

        if active_profile.pixel_format:
            allowed_pixel_formats = [
                value.strip().lower()
                for value in active_profile.pixel_format.split(",")
                if value.strip()
            ]
            if allowed_pixel_formats:
                pixel_format_condition = func.lower(func.coalesce(MediaFileScan.pixel_format, "")).in_(
                    allowed_pixel_formats
                )

        if active_profile.file_format:
            allowed_file_formats = [
                value.strip().lower().lstrip(".")
                for value in active_profile.file_format.split(",")
                if value.strip()
            ]
            if allowed_file_formats:
                file_format_condition = func.lower(func.coalesce(MediaFileScan.extension, "")).in_(
                    allowed_file_formats
                )

    tag_condition = MediaFileScan.tag_status == "tag_match"

    return (
        case((codec_condition, 1), else_=0)
        + case((pixel_format_condition, 1), else_=0)
        + case((file_format_condition, 1), else_=0)
        + case((tag_condition, 1), else_=0)
    )
