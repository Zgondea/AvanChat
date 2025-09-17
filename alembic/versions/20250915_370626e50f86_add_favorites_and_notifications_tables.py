"""Add favorites and notifications tables

Revision ID: 370626e50f86
Revises: afd8c1ccf0ff
Create Date: 2025-09-15 07:53:49.072630+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '370626e50f86'
down_revision: Union[str, None] = 'afd8c1ccf0ff'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create user_favorite_laws table
    op.create_table(
        'user_favorite_laws',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('uuid_generate_v4()'), nullable=False),
        sa.Column('user_id', sa.String(255), nullable=False),
        sa.Column('law_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.ForeignKeyConstraint(['law_id'], ['laws.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'law_id', name='unique_user_law_favorite')
    )
    op.create_index('idx_user_favorite_laws_user_id', 'user_favorite_laws', ['user_id'])
    op.create_index('idx_user_favorite_laws_law_id', 'user_favorite_laws', ['law_id'])

    # Create law_notifications table
    op.create_table(
        'law_notifications',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('uuid_generate_v4()'), nullable=False),
        sa.Column('user_id', sa.String(255), nullable=False),
        sa.Column('law_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('law_title', sa.String(500), nullable=False),
        sa.Column('notification_type', sa.String(50), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('version_from', sa.Integer(), nullable=True),
        sa.Column('version_to', sa.Integer(), nullable=True),
        sa.Column('change_summary', sa.Text(), nullable=True),
        sa.Column('is_read', sa.Boolean(), server_default=sa.text('false'), nullable=True),
        sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.ForeignKeyConstraint(['law_id'], ['laws.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_law_notifications_user_id', 'law_notifications', ['user_id'])
    op.create_index('idx_law_notifications_law_id', 'law_notifications', ['law_id'])
    op.create_index('idx_law_notifications_is_read', 'law_notifications', ['is_read'])
    op.create_index('idx_law_notifications_created_at', 'law_notifications', ['created_at'])

    # Create law_version_tracking table
    op.create_table(
        'law_version_tracking',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('uuid_generate_v4()'), nullable=False),
        sa.Column('law_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('last_checked_version', sa.Integer(), server_default=sa.text('0'), nullable=True),
        sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.ForeignKeyConstraint(['law_id'], ['laws.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('law_id', name='unique_law_tracking')
    )
    op.create_index('idx_law_version_tracking_law_id', 'law_version_tracking', ['law_id'])


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_table('law_version_tracking')
    op.drop_table('law_notifications')
    op.drop_table('user_favorite_laws')
