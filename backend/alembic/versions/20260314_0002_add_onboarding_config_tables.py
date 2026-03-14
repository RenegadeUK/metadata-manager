"""add onboarding config tables

Revision ID: 20260314_0002
Revises: 20260314_0001
Create Date: 2026-03-14 16:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "20260314_0002"
down_revision = "20260314_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "folder_mappings",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("source_path", sa.String(length=2048), nullable=False, unique=True),
        sa.Column("recursive", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "quality_profiles",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(length=255), nullable=False, unique=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("codec", sa.String(length=100), nullable=False),
        sa.Column("pixel_format", sa.String(length=100), nullable=True),
        sa.Column("min_bitrate_kbps", sa.Integer(), nullable=True),
        sa.Column("max_bitrate_kbps", sa.Integer(), nullable=True),
        sa.Column("min_width", sa.Integer(), nullable=True),
        sa.Column("min_height", sa.Integer(), nullable=True),
        sa.Column("required_profile", sa.String(length=100), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "metadata_tag_rules",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(length=255), nullable=False, unique=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("tag_key", sa.String(length=255), nullable=False),
        sa.Column("tag_value", sa.String(length=255), nullable=False),
        sa.Column("match_mode", sa.String(length=50), nullable=False, server_default="exact"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "app_settings",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("key", sa.String(length=255), nullable=False, unique=True),
        sa.Column("value", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("app_settings")
    op.drop_table("metadata_tag_rules")
    op.drop_table("quality_profiles")
    op.drop_table("folder_mappings")
