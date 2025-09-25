"""add comprehensive fields to mercado_livre_orders table

Revision ID: o6p7q8r9s0t
Revises: n5o6p7q8r9s
Create Date: 2025-01-27 15:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'o6p7q8r9s0t'
down_revision = 'n5o6p7q8r9s'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Adicionar campos básicos do pedido
    op.add_column('mercado_livre_orders', sa.Column('manufacturing_ending_date', sa.DateTime(), nullable=True))
    op.add_column('mercado_livre_orders', sa.Column('comment', sa.Text(), nullable=True))
    op.add_column('mercado_livre_orders', sa.Column('pack_id', sa.String(length=50), nullable=True))
    op.add_column('mercado_livre_orders', sa.Column('pickup_id', sa.String(length=50), nullable=True))
    op.add_column('mercado_livre_orders', sa.Column('fulfilled', sa.Boolean(), nullable=True))
    
    # Adicionar campos do comprador
    op.add_column('mercado_livre_orders', sa.Column('buyer_alternative_phone', sa.String(length=50), nullable=True))
    op.add_column('mercado_livre_orders', sa.Column('buyer_registration_date', sa.DateTime(), nullable=True))
    op.add_column('mercado_livre_orders', sa.Column('buyer_user_type', sa.String(length=50), nullable=True))
    op.add_column('mercado_livre_orders', sa.Column('buyer_country_id', sa.String(length=10), nullable=True))
    op.add_column('mercado_livre_orders', sa.Column('buyer_site_id', sa.String(length=10), nullable=True))
    op.add_column('mercado_livre_orders', sa.Column('buyer_permalink', sa.String(length=500), nullable=True))
    
    # Endereço do comprador
    op.add_column('mercado_livre_orders', sa.Column('buyer_address_state', sa.String(length=100), nullable=True))
    op.add_column('mercado_livre_orders', sa.Column('buyer_address_city', sa.String(length=100), nullable=True))
    op.add_column('mercado_livre_orders', sa.Column('buyer_address_address', sa.String(length=500), nullable=True))
    op.add_column('mercado_livre_orders', sa.Column('buyer_address_zip_code', sa.String(length=20), nullable=True))
    
    # Identificação do comprador
    op.add_column('mercado_livre_orders', sa.Column('buyer_identification_type', sa.String(length=50), nullable=True))
    op.add_column('mercado_livre_orders', sa.Column('buyer_identification_number', sa.String(length=100), nullable=True))
    
    # Adicionar campos do vendedor
    op.add_column('mercado_livre_orders', sa.Column('seller_first_name', sa.String(length=255), nullable=True))
    op.add_column('mercado_livre_orders', sa.Column('seller_last_name', sa.String(length=255), nullable=True))
    op.add_column('mercado_livre_orders', sa.Column('seller_phone', sa.String(length=50), nullable=True))
    op.add_column('mercado_livre_orders', sa.Column('seller_alternative_phone', sa.String(length=50), nullable=True))
    op.add_column('mercado_livre_orders', sa.Column('seller_registration_date', sa.DateTime(), nullable=True))
    op.add_column('mercado_livre_orders', sa.Column('seller_user_type', sa.String(length=50), nullable=True))
    op.add_column('mercado_livre_orders', sa.Column('seller_country_id', sa.String(length=10), nullable=True))
    op.add_column('mercado_livre_orders', sa.Column('seller_site_id', sa.String(length=10), nullable=True))
    op.add_column('mercado_livre_orders', sa.Column('seller_permalink', sa.String(length=500), nullable=True))
    
    # Endereço do vendedor
    op.add_column('mercado_livre_orders', sa.Column('seller_address_state', sa.String(length=100), nullable=True))
    op.add_column('mercado_livre_orders', sa.Column('seller_address_city', sa.String(length=100), nullable=True))
    op.add_column('mercado_livre_orders', sa.Column('seller_address_address', sa.String(length=500), nullable=True))
    op.add_column('mercado_livre_orders', sa.Column('seller_address_zip_code', sa.String(length=20), nullable=True))
    
    # Identificação do vendedor
    op.add_column('mercado_livre_orders', sa.Column('seller_identification_type', sa.String(length=50), nullable=True))
    op.add_column('mercado_livre_orders', sa.Column('seller_identification_number', sa.String(length=100), nullable=True))
    
    # Adicionar campos de envio
    op.add_column('mercado_livre_orders', sa.Column('shipping_tracking_number', sa.String(length=100), nullable=True))
    op.add_column('mercado_livre_orders', sa.Column('shipping_tracking_method', sa.String(length=50), nullable=True))
    op.add_column('mercado_livre_orders', sa.Column('shipping_declared_value', sa.Numeric(precision=12, scale=2), nullable=True))
    
    # Endereço de origem do envio
    op.add_column('mercado_livre_orders', sa.Column('shipping_origin_state', sa.String(length=100), nullable=True))
    op.add_column('mercado_livre_orders', sa.Column('shipping_origin_city', sa.String(length=100), nullable=True))
    op.add_column('mercado_livre_orders', sa.Column('shipping_origin_address', sa.String(length=500), nullable=True))
    op.add_column('mercado_livre_orders', sa.Column('shipping_origin_zip_code', sa.String(length=20), nullable=True))
    
    # Endereço de destino do envio
    op.add_column('mercado_livre_orders', sa.Column('shipping_destination_state', sa.String(length=100), nullable=True))
    op.add_column('mercado_livre_orders', sa.Column('shipping_destination_city', sa.String(length=100), nullable=True))
    op.add_column('mercado_livre_orders', sa.Column('shipping_destination_address', sa.String(length=500), nullable=True))
    op.add_column('mercado_livre_orders', sa.Column('shipping_destination_zip_code', sa.String(length=20), nullable=True))
    op.add_column('mercado_livre_orders', sa.Column('shipping_destination_receiver_name', sa.String(length=255), nullable=True))
    op.add_column('mercado_livre_orders', sa.Column('shipping_destination_receiver_phone', sa.String(length=50), nullable=True))
    
    # Dimensões do envio
    op.add_column('mercado_livre_orders', sa.Column('shipping_dimensions_height', sa.Numeric(precision=8, scale=2), nullable=True))
    op.add_column('mercado_livre_orders', sa.Column('shipping_dimensions_width', sa.Numeric(precision=8, scale=2), nullable=True))
    op.add_column('mercado_livre_orders', sa.Column('shipping_dimensions_length', sa.Numeric(precision=8, scale=2), nullable=True))
    op.add_column('mercado_livre_orders', sa.Column('shipping_dimensions_weight', sa.Numeric(precision=8, scale=2), nullable=True))
    
    # Adicionar campos de pagamento
    op.add_column('mercado_livre_orders', sa.Column('payment_operation_type', sa.String(length=50), nullable=True))
    op.add_column('mercado_livre_orders', sa.Column('payment_status_code', sa.String(length=50), nullable=True))
    op.add_column('mercado_livre_orders', sa.Column('payment_status_detail', sa.String(length=100), nullable=True))
    op.add_column('mercado_livre_orders', sa.Column('payment_transaction_amount', sa.Numeric(precision=12, scale=2), nullable=True))
    op.add_column('mercado_livre_orders', sa.Column('payment_transaction_amount_refunded', sa.Numeric(precision=12, scale=2), nullable=True))
    op.add_column('mercado_livre_orders', sa.Column('payment_taxes_amount', sa.Numeric(precision=12, scale=2), nullable=True))
    op.add_column('mercado_livre_orders', sa.Column('payment_coupon_amount', sa.Numeric(precision=12, scale=2), nullable=True))
    op.add_column('mercado_livre_orders', sa.Column('payment_overpaid_amount', sa.Numeric(precision=12, scale=2), nullable=True))
    op.add_column('mercado_livre_orders', sa.Column('payment_installment_amount', sa.Numeric(precision=12, scale=2), nullable=True))
    op.add_column('mercado_livre_orders', sa.Column('payment_authorization_code', sa.String(length=100), nullable=True))
    op.add_column('mercado_livre_orders', sa.Column('payment_transaction_order_id', sa.String(length=100), nullable=True))
    op.add_column('mercado_livre_orders', sa.Column('payment_date_approved', sa.DateTime(), nullable=True))
    op.add_column('mercado_livre_orders', sa.Column('payment_date_last_modified', sa.DateTime(), nullable=True))
    op.add_column('mercado_livre_orders', sa.Column('payment_collector_id', sa.String(length=50), nullable=True))
    op.add_column('mercado_livre_orders', sa.Column('payment_card_id', sa.String(length=50), nullable=True))
    op.add_column('mercado_livre_orders', sa.Column('payment_issuer_id', sa.String(length=50), nullable=True))
    
    # Adicionar campos de contexto
    op.add_column('mercado_livre_orders', sa.Column('context_channel', sa.String(length=50), nullable=True))
    op.add_column('mercado_livre_orders', sa.Column('context_site', sa.String(length=10), nullable=True))
    op.add_column('mercado_livre_orders', sa.Column('context_flows', postgresql.JSON(astext_type=sa.Text()), nullable=True))
    
    # Adicionar campos de cupom
    op.add_column('mercado_livre_orders', sa.Column('coupon_id', sa.String(length=50), nullable=True))
    op.add_column('mercado_livre_orders', sa.Column('coupon_amount', sa.Numeric(precision=12, scale=2), nullable=True))
    
    # Adicionar campos de impostos
    op.add_column('mercado_livre_orders', sa.Column('taxes_amount', sa.Numeric(precision=12, scale=2), nullable=True))
    op.add_column('mercado_livre_orders', sa.Column('taxes_currency_id', sa.String(length=10), nullable=True))
    op.add_column('mercado_livre_orders', sa.Column('taxes_id', sa.String(length=50), nullable=True))
    
    # Adicionar campos de cancelamento
    op.add_column('mercado_livre_orders', sa.Column('cancel_detail_group', sa.String(length=50), nullable=True))
    op.add_column('mercado_livre_orders', sa.Column('cancel_detail_code', sa.String(length=50), nullable=True))
    op.add_column('mercado_livre_orders', sa.Column('cancel_detail_description', sa.String(length=500), nullable=True))
    op.add_column('mercado_livre_orders', sa.Column('cancel_detail_requested_by', sa.String(length=50), nullable=True))
    op.add_column('mercado_livre_orders', sa.Column('cancel_detail_date', sa.DateTime(), nullable=True))
    op.add_column('mercado_livre_orders', sa.Column('cancel_detail_application_id', sa.String(length=50), nullable=True))
    
    # Adicionar campos de mediação
    op.add_column('mercado_livre_orders', sa.Column('mediations', postgresql.JSON(astext_type=sa.Text()), nullable=True))
    
    # Adicionar campos de solicitação de pedido
    op.add_column('mercado_livre_orders', sa.Column('order_request_return', postgresql.JSON(astext_type=sa.Text()), nullable=True))
    op.add_column('mercado_livre_orders', sa.Column('order_request_change', postgresql.JSON(astext_type=sa.Text()), nullable=True))


def downgrade() -> None:
    # Remover campos de solicitação de pedido
    op.drop_column('mercado_livre_orders', 'order_request_change')
    op.drop_column('mercado_livre_orders', 'order_request_return')
    
    # Remover campos de mediação
    op.drop_column('mercado_livre_orders', 'mediations')
    
    # Remover campos de cancelamento
    op.drop_column('mercado_livre_orders', 'cancel_detail_application_id')
    op.drop_column('mercado_livre_orders', 'cancel_detail_date')
    op.drop_column('mercado_livre_orders', 'cancel_detail_requested_by')
    op.drop_column('mercado_livre_orders', 'cancel_detail_description')
    op.drop_column('mercado_livre_orders', 'cancel_detail_code')
    op.drop_column('mercado_livre_orders', 'cancel_detail_group')
    
    # Remover campos de impostos
    op.drop_column('mercado_livre_orders', 'taxes_id')
    op.drop_column('mercado_livre_orders', 'taxes_currency_id')
    op.drop_column('mercado_livre_orders', 'taxes_amount')
    
    # Remover campos de cupom
    op.drop_column('mercado_livre_orders', 'coupon_amount')
    op.drop_column('mercado_livre_orders', 'coupon_id')
    
    # Remover campos de contexto
    op.drop_column('mercado_livre_orders', 'context_flows')
    op.drop_column('mercado_livre_orders', 'context_site')
    op.drop_column('mercado_livre_orders', 'context_channel')
    
    # Remover campos de pagamento
    op.drop_column('mercado_livre_orders', 'payment_issuer_id')
    op.drop_column('mercado_livre_orders', 'payment_card_id')
    op.drop_column('mercado_livre_orders', 'payment_collector_id')
    op.drop_column('mercado_livre_orders', 'payment_date_last_modified')
    op.drop_column('mercado_livre_orders', 'payment_date_approved')
    op.drop_column('mercado_livre_orders', 'payment_transaction_order_id')
    op.drop_column('mercado_livre_orders', 'payment_authorization_code')
    op.drop_column('mercado_livre_orders', 'payment_installment_amount')
    op.drop_column('mercado_livre_orders', 'payment_overpaid_amount')
    op.drop_column('mercado_livre_orders', 'payment_coupon_amount')
    op.drop_column('mercado_livre_orders', 'payment_taxes_amount')
    op.drop_column('mercado_livre_orders', 'payment_transaction_amount_refunded')
    op.drop_column('mercado_livre_orders', 'payment_transaction_amount')
    op.drop_column('mercado_livre_orders', 'payment_status_detail')
    op.drop_column('mercado_livre_orders', 'payment_status_code')
    op.drop_column('mercado_livre_orders', 'payment_operation_type')
    
    # Remover dimensões do envio
    op.drop_column('mercado_livre_orders', 'shipping_dimensions_weight')
    op.drop_column('mercado_livre_orders', 'shipping_dimensions_length')
    op.drop_column('mercado_livre_orders', 'shipping_dimensions_width')
    op.drop_column('mercado_livre_orders', 'shipping_dimensions_height')
    
    # Remover endereço de destino do envio
    op.drop_column('mercado_livre_orders', 'shipping_destination_receiver_phone')
    op.drop_column('mercado_livre_orders', 'shipping_destination_receiver_name')
    op.drop_column('mercado_livre_orders', 'shipping_destination_zip_code')
    op.drop_column('mercado_livre_orders', 'shipping_destination_address')
    op.drop_column('mercado_livre_orders', 'shipping_destination_city')
    op.drop_column('mercado_livre_orders', 'shipping_destination_state')
    
    # Remover endereço de origem do envio
    op.drop_column('mercado_livre_orders', 'shipping_origin_zip_code')
    op.drop_column('mercado_livre_orders', 'shipping_origin_address')
    op.drop_column('mercado_livre_orders', 'shipping_origin_city')
    op.drop_column('mercado_livre_orders', 'shipping_origin_state')
    
    # Remover campos de envio
    op.drop_column('mercado_livre_orders', 'shipping_declared_value')
    op.drop_column('mercado_livre_orders', 'shipping_tracking_method')
    op.drop_column('mercado_livre_orders', 'shipping_tracking_number')
    
    # Remover identificação do vendedor
    op.drop_column('mercado_livre_orders', 'seller_identification_number')
    op.drop_column('mercado_livre_orders', 'seller_identification_type')
    
    # Remover endereço do vendedor
    op.drop_column('mercado_livre_orders', 'seller_address_zip_code')
    op.drop_column('mercado_livre_orders', 'seller_address_address')
    op.drop_column('mercado_livre_orders', 'seller_address_city')
    op.drop_column('mercado_livre_orders', 'seller_address_state')
    
    # Remover campos do vendedor
    op.drop_column('mercado_livre_orders', 'seller_permalink')
    op.drop_column('mercado_livre_orders', 'seller_site_id')
    op.drop_column('mercado_livre_orders', 'seller_country_id')
    op.drop_column('mercado_livre_orders', 'seller_user_type')
    op.drop_column('mercado_livre_orders', 'seller_registration_date')
    op.drop_column('mercado_livre_orders', 'seller_alternative_phone')
    op.drop_column('mercado_livre_orders', 'seller_phone')
    op.drop_column('mercado_livre_orders', 'seller_last_name')
    op.drop_column('mercado_livre_orders', 'seller_first_name')
    
    # Remover identificação do comprador
    op.drop_column('mercado_livre_orders', 'buyer_identification_number')
    op.drop_column('mercado_livre_orders', 'buyer_identification_type')
    
    # Remover endereço do comprador
    op.drop_column('mercado_livre_orders', 'buyer_address_zip_code')
    op.drop_column('mercado_livre_orders', 'buyer_address_address')
    op.drop_column('mercado_livre_orders', 'buyer_address_city')
    op.drop_column('mercado_livre_orders', 'buyer_address_state')
    
    # Remover campos do comprador
    op.drop_column('mercado_livre_orders', 'buyer_permalink')
    op.drop_column('mercado_livre_orders', 'buyer_site_id')
    op.drop_column('mercado_livre_orders', 'buyer_country_id')
    op.drop_column('mercado_livre_orders', 'buyer_user_type')
    op.drop_column('mercado_livre_orders', 'buyer_registration_date')
    op.drop_column('mercado_livre_orders', 'buyer_alternative_phone')
    
    # Remover campos básicos do pedido
    op.drop_column('mercado_livre_orders', 'fulfilled')
    op.drop_column('mercado_livre_orders', 'pickup_id')
    op.drop_column('mercado_livre_orders', 'pack_id')
    op.drop_column('mercado_livre_orders', 'comment')
    op.drop_column('mercado_livre_orders', 'manufacturing_ending_date')

