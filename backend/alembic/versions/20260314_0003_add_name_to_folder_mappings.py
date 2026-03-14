"""add name to folder mappings

Revision ID: 20260314_0003
Revises: 20260314_0002
Create Date: 2026-03-14 16:30:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "20260314_0003"
down_revision = "20260314_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("folder_mappings", sa.Column("name", sa.String(length=255), nullable=True))
    op.execute("UPDATE folder_mappings SET name = source_path WHERE name IS NULL")
    op.alter_column("folder_mappings", "name", existing_type=sa.String(length=255), nullable=False)


def downgrade() -> None:
    op.drop_column("folder_mappings", "name")
