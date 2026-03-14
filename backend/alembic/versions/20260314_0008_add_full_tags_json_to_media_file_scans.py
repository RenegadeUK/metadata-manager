"""add full tags json to media file scans

Revision ID: 20260314_0008
Revises: 20260314_0007
Create Date: 2026-03-14 23:55:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "20260314_0008"
down_revision = "20260314_0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("media_file_scans", sa.Column("all_tags_json", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("media_file_scans", "all_tags_json")
