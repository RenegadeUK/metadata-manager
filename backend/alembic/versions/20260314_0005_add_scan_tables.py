"""add scan tables

Revision ID: 20260314_0005
Revises: 20260314_0004
Create Date: 2026-03-14 18:30:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "20260314_0005"
down_revision = "20260314_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "scan_runs",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("status", sa.String(length=50), nullable=False, server_default="running"),
        sa.Column("total_files", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("processed_files", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("new_files", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("updated_files", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("error_files", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "media_file_scans",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("file_path", sa.String(length=4096), nullable=False, unique=True),
        sa.Column("file_name", sa.String(length=1024), nullable=False),
        sa.Column("extension", sa.String(length=32), nullable=False),
        sa.Column("device_id", sa.BigInteger(), nullable=True),
        sa.Column("inode", sa.BigInteger(), nullable=True),
        sa.Column("folder_mapping_id", sa.Integer(), sa.ForeignKey("folder_mappings.id", ondelete="SET NULL"), nullable=True),
        sa.Column("scan_run_id", sa.Integer(), sa.ForeignKey("scan_runs.id", ondelete="SET NULL"), nullable=True),
        sa.Column("size_bytes", sa.BigInteger(), nullable=True),
        sa.Column("modified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("codec", sa.String(length=100), nullable=True),
        sa.Column("pixel_format", sa.String(length=100), nullable=True),
        sa.Column("width", sa.Integer(), nullable=True),
        sa.Column("height", sa.Integer(), nullable=True),
        sa.Column("bitrate_kbps", sa.Integer(), nullable=True),
        sa.Column("video_profile", sa.String(length=100), nullable=True),
        sa.Column("tag_key", sa.String(length=255), nullable=True),
        sa.Column("tag_value", sa.String(length=1024), nullable=True),
        sa.Column("quality_status", sa.String(length=50), nullable=False, server_default="unknown"),
        sa.Column("tag_status", sa.String(length=50), nullable=False, server_default="unknown"),
        sa.Column("probe_error", sa.Text(), nullable=True),
        sa.Column("is_removed", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("removed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("scanned_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_index("ix_media_file_scans_extension", "media_file_scans", ["extension"])
    op.create_index("ix_media_file_scans_identity", "media_file_scans", ["device_id", "inode"])
    op.create_index("ix_media_file_scans_quality_status", "media_file_scans", ["quality_status"])
    op.create_index("ix_media_file_scans_tag_status", "media_file_scans", ["tag_status"])


def downgrade() -> None:
    op.drop_index("ix_media_file_scans_tag_status", table_name="media_file_scans")
    op.drop_index("ix_media_file_scans_quality_status", table_name="media_file_scans")
    op.drop_index("ix_media_file_scans_identity", table_name="media_file_scans")
    op.drop_index("ix_media_file_scans_extension", table_name="media_file_scans")
    op.drop_table("media_file_scans")
    op.drop_table("scan_runs")
