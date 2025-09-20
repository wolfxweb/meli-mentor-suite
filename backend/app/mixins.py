from sqlalchemy import Column, Integer, DateTime
from datetime import datetime

class CompanyMixin:
    """Mixin para adicionar company_id a qualquer modelo."""
    company_id = Column(Integer, nullable=False, index=True)

class TimestampMixin:
    """Mixin para adicionar timestamps automáticos."""
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

