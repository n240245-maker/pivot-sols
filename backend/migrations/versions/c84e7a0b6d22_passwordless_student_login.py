"""Allow ID-based student sessions without removing legacy email records.

Revision ID: c84e7a0b6d22
Revises: b6d3f9a2c741
"""
from alembic import op

revision = 'c84e7a0b6d22'
down_revision = 'b6d3f9a2c741'
branch_labels = None
depends_on = None


def upgrade():
    op.alter_column('student_sessions', 'student_email', nullable=True)
    op.create_index('ix_student_sessions_student_id', 'student_sessions', ['student_id'])


def downgrade():
    raise RuntimeError('Review existing ID-only sessions before requiring student email again.')
