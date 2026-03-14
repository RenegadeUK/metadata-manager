"""add unmanic path prefix to folder mappings

Revision ID: 20260314_0010
Revises: 20260314_0009
Create Date: 2026-03-14 23:59:30.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "20260314_0010"
down_revision = "20260314_0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("folder_mappings", sa.Column("unmanic_path_prefix", sa.String(length=2048), nullable=True))


def downgrade() -> None:
    op.drop_column("folder_mappings", "unmanic_path_prefix")
