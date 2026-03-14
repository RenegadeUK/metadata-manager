"""add unique name constraint to folder mappings

Revision ID: 20260314_0004
Revises: 20260314_0003
Create Date: 2026-03-14 16:45:00.000000
"""

from alembic import op


revision = "20260314_0004"
down_revision = "20260314_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_unique_constraint(
        "uq_folder_mappings_name",
        "folder_mappings",
        ["name"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_folder_mappings_name", "folder_mappings", type_="unique")
