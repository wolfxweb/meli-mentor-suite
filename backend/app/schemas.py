from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from decimal import Decimal

# Company Schemas
class CompanyBase(BaseModel):
    name: str
    cnpj: str

class CompanyCreate(CompanyBase):
    pass

class Company(CompanyBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# User Schemas
class UserBase(BaseModel):
    name: str
    email: EmailStr

class UserCreate(UserBase):
    password: str
    company_name: str
    company_cnpj: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(UserBase):
    id: int
    is_active: bool
    company_id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class UserWithCompany(User):
    company: Company

# Category Schemas
class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None

class CategoryCreate(CategoryBase):
    pass

class Category(CategoryBase):
    id: int
    company_id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Product Schemas
class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: Decimal
    stock_quantity: int = 0

class ProductCreate(ProductBase):
    category_id: Optional[int] = None

class Product(ProductBase):
    id: int
    category_id: Optional[int]
    company_id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class ProductWithCategory(Product):
    category: Optional[Category]

# Sale Schemas
class SaleBase(BaseModel):
    quantity: int
    unit_price: Decimal
    total_price: Decimal

class SaleCreate(SaleBase):
    product_id: int

class Sale(SaleBase):
    id: int
    product_id: int
    company_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class SaleWithProduct(Sale):
    product: Product

# Mercado Livre Integration Schemas
class MercadoLivreIntegrationBase(BaseModel):
    is_active: bool = True

class MercadoLivreIntegrationCreate(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "Bearer"
    expires_in: int
    scope: Optional[str] = None
    user_id: Optional[str] = None

class MercadoLivreIntegration(MercadoLivreIntegrationBase):
    id: int
    company_id: int
    access_token: str
    refresh_token: Optional[str]
    token_type: str
    expires_in: int
    scope: Optional[str]
    user_id: Optional[str]
    expires_at: datetime
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# OAuth2 Schemas
class OAuth2AuthorizationRequest(BaseModel):
    redirect_uri: str

class OAuth2TokenResponse(BaseModel):
    access_token: str
    token_type: str
    expires_in: int
    scope: str
    user_id: int
    refresh_token: Optional[str] = None

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# Mercado Livre Product Schemas
class MercadoLivreProductPicture(BaseModel):
    id: str
    url: str
    secure_url: str

class MercadoLivreProductAttribute(BaseModel):
    id: str
    name: str
    value_name: str

class ProductResponse(BaseModel):
    id: str
    title: str
    price: float
    currency_id: str
    available_quantity: int
    sold_quantity: int
    condition: str
    permalink: str
    thumbnail: str
    pictures: List[MercadoLivreProductPicture]
    attributes: List[MercadoLivreProductAttribute]
    status: str
    listing_type_id: str
    category_id: str
    date_created: str
    last_updated: str
    tags: Optional[List[str]] = None
    health: Optional[int] = None
    catalog_listing: Optional[bool] = None
    catalog_product_id: Optional[str] = None
    domain_id: Optional[str] = None
    initial_quantity: Optional[int] = None
    base_price: Optional[float] = None
    original_price: Optional[float] = None
    sub_status: Optional[List[str]] = None
    family_name: Optional[str] = None
    user_product_id: Optional[str] = None
    family_id: Optional[str] = None
    inventory_id: Optional[str] = None  # Campo para identificar produtos Full

class ProductCreate(BaseModel):
    title: str
    price: float
    available_quantity: int
    condition: str
    description: str
    category_id: str
    pictures: List[str]
    attributes: List[dict]

class ProductUpdate(BaseModel):
    title: Optional[str] = None
    price: Optional[float] = None
    available_quantity: Optional[int] = None
    condition: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[str] = None
    pictures: Optional[List[str]] = None
    attributes: Optional[List[dict]] = None
