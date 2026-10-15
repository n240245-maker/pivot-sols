"""Add repeatable experiment videos and optional career-resource parents.

Existing experiment video columns and branch-wide career resources remain intact.

Revision ID: d6e0a4f91b72
Revises: c84e7a0b6d22
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = 'd6e0a4f91b72'
down_revision = 'c84e7a0b6d22'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('experiment_videos',
        sa.Column('id', UUID(as_uuid=False), primary_key=True),
        sa.Column('experiment_id', UUID(as_uuid=False), sa.ForeignKey('experiments.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('title', sa.String(300), nullable=False),
        sa.Column('video_type', sa.String(16), nullable=False),
        sa.Column('video_url', sa.Text(), nullable=False),
        sa.Column('duration', sa.String(50), nullable=False),
        sa.Column('status', sa.String(16), server_default='draft', nullable=False),
        sa.Column('sort_order', sa.Integer(), server_default='0', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint("status IN ('draft','published','archived')", name='ck_experiment_videos_status'),
        sa.CheckConstraint("video_type IN ('youtube','mp4','external')", name='ck_experiment_videos_type'))
    op.create_index('ix_experiment_videos_experiment_id', 'experiment_videos', ['experiment_id'])
    op.create_index('ix_experiment_videos_status', 'experiment_videos', ['status'])
    op.add_column('career_resources', sa.Column('domain_id', UUID(as_uuid=False), nullable=True))
    op.add_column('career_resources', sa.Column('role_id', UUID(as_uuid=False), nullable=True))
    op.create_foreign_key('fk_career_resources_domain_id', 'career_resources', 'career_domains', ['domain_id'], ['id'], ondelete='RESTRICT')
    op.create_foreign_key('fk_career_resources_role_id', 'career_resources', 'career_roles', ['role_id'], ['id'], ondelete='RESTRICT')
    op.create_index('ix_career_resources_domain_id', 'career_resources', ['domain_id'])
    op.create_index('ix_career_resources_role_id', 'career_resources', ['role_id'])
    op.create_check_constraint('ck_career_resource_parent_type', 'career_resources',
        "(resource_type='domain' AND role_id IS NULL) OR (resource_type='job' AND domain_id IS NULL)")


def downgrade():
    raise RuntimeError('Review linked career resources and experiment videos before a data-preserving rollback.')
