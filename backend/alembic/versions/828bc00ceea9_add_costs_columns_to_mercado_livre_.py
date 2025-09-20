"""add_costs_columns_to_mercado_livre_announcements

Revision ID: 828bc00ceea9
Revises: g2h3i4j5k6l
Create Date: 2025-09-20 20:48:34.373667

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '828bc00ceea9'
down_revision: Union[str, None] = 'g2h3i4j5k6l'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Adicionar colunas de custos na tabela mercado_livre_announcements
    op.add_column('mercado_livre_announcements', sa.Column('listing_type_name', sa.String(100), nullable=True))
    op.add_column('mercado_livre_announcements', sa.Column('listing_exposure', sa.String(50), nullable=True))
    op.add_column('mercado_livre_announcements', sa.Column('listing_fee_amount', sa.Numeric(12, 2), nullable=True))
    op.add_column('mercado_livre_announcements', sa.Column('sale_fee_amount', sa.Numeric(12, 2), nullable=True))
    op.add_column('mercado_livre_announcements', sa.Column('sale_fee_percentage', sa.Numeric(5, 2), nullable=True))
    op.add_column('mercado_livre_announcements', sa.Column('sale_fee_fixed', sa.Numeric(12, 2), nullable=True))
    op.add_column('mercado_livre_announcements', sa.Column('total_cost', sa.Numeric(12, 2), nullable=True))
    op.add_column('mercado_livre_announcements', sa.Column('requires_picture', sa.Boolean(), nullable=True, default=True))
    op.add_column('mercado_livre_announcements', sa.Column('free_relist', sa.Boolean(), nullable=True, default=False))


def downgrade() -> None:
    # Remover colunas de custos da tabela mercado_livre_announcements
    op.drop_column('mercado_livre_announcements', 'free_relist')
    op.drop_column('mercado_livre_announcements', 'requires_picture')
    op.drop_column('mercado_livre_announcements', 'total_cost')
    op.drop_column('mercado_livre_announcements', 'sale_fee_fixed')
    op.drop_column('mercado_livre_announcements', 'sale_fee_percentage')
    op.drop_column('mercado_livre_announcements', 'sale_fee_amount')
    op.drop_column('mercado_livre_announcements', 'listing_fee_amount')
    op.drop_column('mercado_livre_announcements', 'listing_exposure')
    op.drop_column('mercado_livre_announcements', 'listing_type_name')
