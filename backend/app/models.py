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
    category_id = Column(String(100), nullable=True)
    domain_id = Column(String(100), nullable=True)
    
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
