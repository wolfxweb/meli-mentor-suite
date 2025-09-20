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
