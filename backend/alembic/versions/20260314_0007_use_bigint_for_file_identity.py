"""use bigint for file identity

Revision ID: 20260314_0007
Revises: 20260314_0006
Create Date: 2026-03-14 22:55:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "20260314_0007"
down_revision = "20260314_0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "media_file_scans",
        "device_id",
        existing_type=sa.Integer(),
        type_=sa.BigInteger(),
        existing_nullable=True,
        postgresql_using="device_id::bigint",
    )
    op.alter_column(
        "media_file_scans",
        "inode",
        existing_type=sa.Integer(),
        type_=sa.BigInteger(),
        existing_nullable=True,
        postgresql_using="inode::bigint",
    )
    op.alter_column(
        "media_file_scans",
        "size_bytes",
        existing_type=sa.Integer(),
        type_=sa.BigInteger(),
        existing_nullable=True,
        postgresql_using="size_bytes::bigint",
    )


def downgrade() -> None:
    op.alter_column(
        "media_file_scans",
        "size_bytes",
        existing_type=sa.BigInteger(),
        type_=sa.Integer(),
        existing_nullable=True,
        postgresql_using="size_bytes::integer",
    )
    op.alter_column(
        "media_file_scans",
        "inode",
        existing_type=sa.BigInteger(),
        type_=sa.Integer(),
        existing_nullable=True,
        postgresql_using="inode::integer",
    )
    op.alter_column(
        "media_file_scans",
        "device_id",
        existing_type=sa.BigInteger(),
        type_=sa.Integer(),
        existing_nullable=True,
        postgresql_using="device_id::integer",
    )
