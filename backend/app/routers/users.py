from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Company
from app.schemas import UserWithCompany, Company
from app.auth import get_current_user

router = APIRouter()

@router.get("/me", response_model=UserWithCompany)
async def read_user_me(current_user: User = Depends(get_current_user)):
    """Get current user information."""
    return current_user

@router.put("/me", response_model=UserWithCompany)
async def update_user_me(
    name: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user information."""
    if name:
        current_user.name = name
    
    db.commit()
    db.refresh(current_user)
    return current_user

@router.put("/company", response_model=Company)
async def update_user_company(
    company_name: str = None,
    company_cnpj: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user's company information."""
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    
    if company_name:
        company.name = company_name
    
    if company_cnpj:
        # Check if CNPJ already exists for another company
        existing_company = db.query(Company).filter(
            Company.cnpj == company_cnpj,
            Company.id != company.id
        ).first()
        if existing_company:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="CNPJ already registered for another company"
            )
        company.cnpj = company_cnpj
    
    db.commit()
    db.refresh(company)
    return company

