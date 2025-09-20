from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from app.database import get_db
from app.models import User, Company
from app.schemas import UserCreate, UserLogin, Token, UserWithCompany
from app.auth import (
    verify_password, 
    get_password_hash, 
    create_access_token,
    get_current_user,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

router = APIRouter()

@router.post("/register", response_model=UserWithCompany)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user and company."""
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check if company CNPJ already exists
    existing_company = db.query(Company).filter(Company.cnpj == user_data.company_cnpj).first()
    if existing_company:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Company CNPJ already registered"
        )
    
    # Create company
    company = Company(
        name=user_data.company_name,
        cnpj=user_data.company_cnpj
    )
    db.add(company)
    db.commit()
    db.refresh(company)
    
    # Create user
    hashed_password = get_password_hash(user_data.password)
    user = User(
        name=user_data.name,
        email=user_data.email,
        hashed_password=hashed_password,
        company_id=company.id
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return user

@router.post("/login", response_model=Token)
async def login(user_credentials: UserLogin, db: Session = Depends(get_db)):
    """Authenticate user and return access token."""
    user = db.query(User).filter(User.email == user_credentials.email).first()
    
    if not user or not verify_password(user_credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserWithCompany)
async def read_users_me(current_user: User = Depends(get_current_user)):
    """Get current user information."""
    return current_user

