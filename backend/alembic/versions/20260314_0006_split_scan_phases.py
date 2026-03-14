"""split scan phases

Revision ID: 20260314_0006
Revises: 20260314_0005
Create Date: 2026-03-14 22:15:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "20260314_0006"
down_revision = "20260314_0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "scan_runs",
        sa.Column("run_type", sa.String(length=50), nullable=False, server_default="inventory"),
    )

    op.add_column(
        "media_file_scans",
        sa.Column("inventory_scanned_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "media_file_scans",
        sa.Column("interrogated_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.execute("UPDATE scan_runs SET run_type = 'inventory' WHERE run_type IS NULL")
    op.execute(
        """
        UPDATE media_file_scans
        SET inventory_scanned_at = scanned_at
        WHERE inventory_scanned_at IS NULL
        """
    )


def downgrade() -> None:
    op.drop_column("media_file_scans", "interrogated_at")
    op.drop_column("media_file_scans", "inventory_scanned_at")
    op.drop_column("scan_runs", "run_type")
