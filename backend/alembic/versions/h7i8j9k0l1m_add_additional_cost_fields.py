"""add_additional_cost_fields_to_mercado_livre_announcements

Revision ID: h7i8j9k0l1m
Revises: 828bc00ceea9
Create Date: 2024-01-20 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'h7i8j9k0l1m'
down_revision = '828bc00ceea9'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Adicionar colunas de informações adicionais de custos na tabela mercado_livre_announcements
    op.add_column('mercado_livre_announcements', sa.Column('product_cost', sa.Numeric(12, 2), nullable=True))
    op.add_column('mercado_livre_announcements', sa.Column('taxes', sa.Text(), nullable=True))
    op.add_column('mercado_livre_announcements', sa.Column('ads_cost', sa.Text(), nullable=True))
    op.add_column('mercado_livre_announcements', sa.Column('shipping_cost', sa.Numeric(12, 2), nullable=True))
    op.add_column('mercado_livre_announcements', sa.Column('additional_fees', sa.Text(), nullable=True))
    op.add_column('mercado_livre_announcements', sa.Column('additional_notes', sa.Text(), nullable=True))


def downgrade() -> None:
    # Remover colunas de informações adicionais de custos
    op.drop_column('mercado_livre_announcements', 'additional_notes')
    op.drop_column('mercado_livre_announcements', 'additional_fees')
    op.drop_column('mercado_livre_announcements', 'shipping_cost')
    op.drop_column('mercado_livre_announcements', 'ads_cost')
    op.drop_column('mercado_livre_announcements', 'taxes')
    op.drop_column('mercado_livre_announcements', 'product_cost')
