"""add file format to quality profiles

Revision ID: 20260314_0009
Revises: 20260314_0008
Create Date: 2026-03-14 23:59:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "20260314_0009"
down_revision = "20260314_0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("quality_profiles", sa.Column("file_format", sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column("quality_profiles", "file_format")
