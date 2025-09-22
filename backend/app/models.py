from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Numeric, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()

class Company(Base):
    __tablename__ = "companies"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    cnpj = Column(String(18), unique=True, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    users = relationship("User", back_populates="company")
    products = relationship("Product", back_populates="company")
    sales = relationship("Sale", back_populates="company")
    categories = relationship("Category", back_populates="company")

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    company = relationship("Company", back_populates="users")

# Exemplo de outras tabelas que seguirão o padrão multi-tenant
class Category(Base):
    __tablename__ = "categories"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    company = relationship("Company", back_populates="categories")
    products = relationship("Product", back_populates="category")

class Product(Base):
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    price = Column(Numeric(10, 2), nullable=False)
    stock_quantity = Column(Integer, default=0)
    category_id = Column(Integer, ForeignKey("categories.id"))
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    company = relationship("Company", back_populates="products")
    category = relationship("Category", back_populates="products")
    sales = relationship("Sale", back_populates="product")

class Sale(Base):
    __tablename__ = "sales"
    
    id = Column(Integer, primary_key=True, index=True)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)
    total_price = Column(Numeric(10, 2), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    company = relationship("Company", back_populates="sales")
    product = relationship("Product", back_populates="sales")

# Integração Mercado Livre
class MercadoLivreIntegration(Base):
    __tablename__ = "mercado_livre_integrations"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, unique=True)
    access_token = Column(Text, nullable=False)
    refresh_token = Column(Text, nullable=True)
    token_type = Column(String(50), default="Bearer")
    expires_in = Column(Integer, nullable=False)
    scope = Column(Text, nullable=True)
    user_id = Column(String(255), nullable=True)  # ID do usuário no Mercado Livre
    expires_at = Column(DateTime, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    company = relationship("Company")

# Tabela para armazenar anúncios do Mercado Livre
class MercadoLivreAnnouncement(Base):
    __tablename__ = "mercado_livre_announcements"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    
    # Informações básicas do anúncio
    ml_item_id = Column(String(255), nullable=False, unique=True, index=True)  # ID do item no ML
    title = Column(String(500), nullable=False)
    price = Column(Numeric(12, 2), nullable=False)
    currency_id = Column(String(10), nullable=False, default="BRL")
    available_quantity = Column(Integer, default=0)
    sold_quantity = Column(Integer, default=0)
    condition = Column(String(50), nullable=False)  # new, used, etc
    status = Column(String(50), nullable=False)  # active, paused, closed
    permalink = Column(Text, nullable=True)
    thumbnail = Column(Text, nullable=True)
    
    # Informações de listagem
    listing_type_id = Column(String(100), nullable=True)  # gold_special, classic, etc
    listing_type_name = Column(String(100), nullable=True)  # Clássico, Premium, etc
    listing_exposure = Column(String(50), nullable=True)  # highest, high, mid, low, lowest
    category_id = Column(String(100), nullable=True)
    domain_id = Column(String(100), nullable=True)
    
    # Informações de custos
    listing_fee_amount = Column(Numeric(12, 2), nullable=True)  # Custo de listagem
    sale_fee_amount = Column(Numeric(12, 2), nullable=True)  # Custo de venda total
    sale_fee_percentage = Column(Numeric(5, 2), nullable=True)  # Percentual de comissão
    sale_fee_fixed = Column(Numeric(12, 2), nullable=True)  # Taxa fixa de venda
    total_cost = Column(Numeric(12, 2), nullable=True)  # Custo total (listagem + venda)
    requires_picture = Column(Boolean, default=True)  # Se requer imagem
    free_relist = Column(Boolean, default=False)  # Se tem relistagem grátis
    
    # Informações adicionais de custos
    product_cost = Column(Numeric(12, 2), nullable=True)  # Custo do produto
    taxes = Column(Text, nullable=True)  # Impostos (ICMS, PIS, COFINS, etc.)
    ads_cost = Column(Text, nullable=True)  # Anúncios ADS (Google Ads, Facebook Ads, etc.)
    shipping_cost = Column(Numeric(12, 2), nullable=True)  # Valor do frete
    additional_fees = Column(Text, nullable=True)  # Taxas adicionais
    additional_notes = Column(Text, nullable=True)  # Observações adicionais
    
    # Informações de catálogo
    catalog_listing = Column(Boolean, default=False)
    catalog_product_id = Column(String(255), nullable=True)
    family_name = Column(String(500), nullable=True)
    family_id = Column(String(255), nullable=True)
    user_product_id = Column(String(255), nullable=True)
    inventory_id = Column(String(255), nullable=True)  # Para produtos Full
    
    # Preços e promoções
    base_price = Column(Numeric(12, 2), nullable=True)
    original_price = Column(Numeric(12, 2), nullable=True)
    sale_price = Column(Numeric(12, 2), nullable=True)
    
    # Informações de posição no catálogo
    catalog_status = Column(String(50), nullable=True)  # winning, competing, sharing_first_place, listed
    catalog_visit_share = Column(String(50), nullable=True)  # maximum, medium, minimum
    catalog_competitors_sharing = Column(Integer, nullable=True)
    catalog_price_to_win = Column(Numeric(12, 2), nullable=True)
    
    # Dados completos em JSON para flexibilidade
    full_data = Column(JSON, nullable=True)  # Dados completos da API
    sale_price_info = Column(JSON, nullable=True)  # Informações de preços promocionais
    prices_info = Column(JSON, nullable=True)  # Informações de preços
    catalog_position_info = Column(JSON, nullable=True)  # Informações de posição no catálogo
    attributes = Column(JSON, nullable=True)  # Atributos do produto
    pictures = Column(JSON, nullable=True)  # Imagens do produto
    tags = Column(JSON, nullable=True)  # Tags do produto
    
    # Timestamps
    ml_date_created = Column(DateTime, nullable=True)  # Data de criação no ML
    ml_last_updated = Column(DateTime, nullable=True)  # Data de atualização no ML
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    company = relationship("Company")

class CatalogCompetitor(Base):
    __tablename__ = "catalog_competitors"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    catalog_product_id = Column(String(255), nullable=False, index=True)  # Ex: MLB32810672
    
    # Dados do anúncio concorrente
    item_id = Column(String(255), nullable=False, unique=True, index=True)
    title = Column(String(500), nullable=False)
    price = Column(Numeric(12, 2), nullable=False)
    original_price = Column(Numeric(12, 2), nullable=True)
    condition = Column(String(50), nullable=False)
    available_quantity = Column(Integer, default=0)
    sold_quantity = Column(Integer, default=0)
    permalink = Column(Text, nullable=True)
    url = Column(Text, nullable=True)  # URL do anúncio
    manual_url = Column(Text, nullable=True)  # URL manual do anúncio
    
    # Dados do vendedor
    seller_id = Column(String(255), nullable=False)
    seller_nickname = Column(String(255), nullable=True)
    seller_reputation_level = Column(String(50), nullable=True)
    seller_power_status = Column(String(50), nullable=True)
    seller_transactions_total = Column(Integer, default=0)
    
    # Dados de envio
    shipping_mode = Column(String(50), nullable=True)
    shipping_logistic_type = Column(String(50), nullable=True)
    shipping_free = Column(Boolean, default=False)
    shipping_tags = Column(JSON, nullable=True)
    
    # Dados adicionais
    listing_type_id = Column(String(100), nullable=True)
    tags = Column(JSON, nullable=True)
    deal_ids = Column(JSON, nullable=True)
    
    # Timestamps
    ml_date_created = Column(DateTime, nullable=True)
    ml_last_updated = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    company = relationship("Company")

# Tabela para armazenar dados de publicidade (Product Ads)
class ProductAdsData(Base):
    __tablename__ = "product_ads_data"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    
    # Informações básicas do anúncio
    item_id = Column(String(255), nullable=False, index=True)  # ID do item no ML
    campaign_id = Column(Integer, nullable=True)  # ID da campanha
    advertiser_id = Column(Integer, nullable=True)  # ID do anunciante
    
    # Informações do anúncio
    title = Column(String(500), nullable=False)
    price = Column(Numeric(12, 2), nullable=False)
    status = Column(String(50), nullable=False)  # active, paused, hold, idle, delegated, revoked
    has_discount = Column(Boolean, default=False)
    catalog_listing = Column(Boolean, default=False)
    logistic_type = Column(String(50), nullable=True)
    listing_type_id = Column(String(100), nullable=True)
    domain_id = Column(String(100), nullable=True)
    buy_box_winner = Column(Boolean, default=False)
    channel = Column(String(50), nullable=True)  # marketplace, mshops
    official_store_id = Column(Integer, nullable=True)
    brand_value_id = Column(String(100), nullable=True)
    brand_value_name = Column(String(255), nullable=True)
    condition = Column(String(50), nullable=True)
    current_level = Column(String(50), nullable=True)
    deferred_stock = Column(Boolean, default=False)
    picture_id = Column(String(255), nullable=True)
    thumbnail = Column(Text, nullable=True)
    permalink = Column(Text, nullable=True)
    recommended = Column(Boolean, default=False)
    
    # Métricas de publicidade
    clicks = Column(Integer, default=0)
    prints = Column(Integer, default=0)  # Impressões
    ctr = Column(Numeric(8, 4), nullable=True)  # Taxa de cliques
    cost = Column(Numeric(12, 2), default=0)  # Custo total
    cpc = Column(Numeric(8, 4), nullable=True)  # Custo por clique
    acos = Column(Numeric(8, 4), nullable=True)  # Advertising Cost of Sales
    tacos = Column(Numeric(8, 4), nullable=True)  # Total Advertising Cost of Sales
    
    # Vendas orgânicas (sem publicidade)
    organic_units_quantity = Column(Integer, default=0)
    organic_units_amount = Column(Numeric(12, 2), default=0)
    organic_items_quantity = Column(Integer, default=0)
    
    # Vendas diretas (com publicidade)
    direct_items_quantity = Column(Integer, default=0)
    direct_units_quantity = Column(Integer, default=0)
    direct_amount = Column(Numeric(12, 2), default=0)
    
    # Vendas indiretas (assistidas)
    indirect_items_quantity = Column(Integer, default=0)
    indirect_units_quantity = Column(Integer, default=0)
    indirect_amount = Column(Numeric(12, 2), default=0)
    
    # Vendas totais
    advertising_items_quantity = Column(Integer, default=0)
    units_quantity = Column(Integer, default=0)
    total_amount = Column(Numeric(12, 2), default=0)
    
    # Métricas adicionais
    cvr = Column(Numeric(8, 4), nullable=True)  # Taxa de conversão
    roas = Column(Numeric(8, 4), nullable=True)  # Return on Ad Spend
    sov = Column(Numeric(8, 4), nullable=True)  # Share of Voice
    
    # Período de sincronização (mantido para compatibilidade)
    period_days = Column(Integer, default=15)  # Período em dias (7, 15, 30, 60, 90)
    
    # Campos de data para filtro de período
    data_period_start = Column(DateTime, nullable=True)  # Data de início do período dos dados
    data_period_end = Column(DateTime, nullable=True)    # Data de fim do período dos dados
    
    # Métricas de impressão
    impression_share = Column(Numeric(8, 4), nullable=True)
    top_impression_share = Column(Numeric(8, 4), nullable=True)
    lost_impression_share_by_budget = Column(Numeric(8, 4), nullable=True)
    lost_impression_share_by_ad_rank = Column(Numeric(8, 4), nullable=True)
    acos_benchmark = Column(Numeric(8, 4), nullable=True)
    
    # Informações da campanha
    campaign_name = Column(String(255), nullable=True)
    campaign_status = Column(String(50), nullable=True)
    campaign_budget = Column(Numeric(12, 2), nullable=True)
    campaign_acos_target = Column(Numeric(8, 4), nullable=True)
    campaign_strategy = Column(String(50), nullable=True)  # profitability, increase, visibility
    
    # Dados completos em JSON para flexibilidade
    full_data = Column(JSON, nullable=True)  # Dados completos da API
    metrics_data = Column(JSON, nullable=True)  # Métricas detalhadas
    campaign_data = Column(JSON, nullable=True)  # Dados da campanha
    
    # Timestamps
    ml_date_created = Column(DateTime, nullable=True)
    ml_last_updated = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    company = relationship("Company")
