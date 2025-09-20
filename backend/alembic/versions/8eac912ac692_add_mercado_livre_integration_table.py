"""Add Mercado Livre integration table

Revision ID: 8eac912ac692
Revises: b5c1bdc6ba2c
Create Date: 2025-09-19 12:23:19.419025

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8eac912ac692'
down_revision: Union[str, None] = 'b5c1bdc6ba2c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create mercado_livre_integrations table
    op.create_table('mercado_livre_integrations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('company_id', sa.Integer(), nullable=False),
        sa.Column('access_token', sa.Text(), nullable=False),
        sa.Column('refresh_token', sa.Text(), nullable=True),
        sa.Column('token_type', sa.String(length=50), nullable=True),
        sa.Column('expires_in', sa.Integer(), nullable=False),
        sa.Column('scope', sa.Text(), nullable=True),
        sa.Column('user_id', sa.String(length=255), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('company_id')
    )


def downgrade() -> None:
    op.drop_table('mercado_livre_integrations')
