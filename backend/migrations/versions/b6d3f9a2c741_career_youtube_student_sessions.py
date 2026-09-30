"""add career videos and durable student sessions

Revision ID: b6d3f9a2c741
Revises: 41f606784098
"""
from alembic import op
import sqlalchemy as sa

revision = 'b6d3f9a2c741'
down_revision = '41f606784098'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('career_resources', sa.Column('youtube_url', sa.Text(), nullable=True))
    op.create_table(
        'student_sessions',
        sa.Column('id', sa.UUID(as_uuid=False), primary_key=True),
        sa.Column('student_email', sa.String(254), nullable=False),
        sa.Column('student_name', sa.String(120), nullable=True),
        sa.Column('student_id', sa.String(40), nullable=True),
        sa.Column('academic_level', sa.String(2), nullable=True),
        sa.Column('token_hash', sa.String(64), nullable=False, unique=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('last_used_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("academic_level IS NULL OR academic_level IN ('P1','E1')", name='ck_student_session_level'),
    )
    op.create_index('ix_student_sessions_student_email', 'student_sessions', ['student_email'])
    op.create_index('ix_student_sessions_expires_at', 'student_sessions', ['expires_at'])


def downgrade():
    raise RuntimeError('Review and approve a data-preserving rollback before downgrading.')
