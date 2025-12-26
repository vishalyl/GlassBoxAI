from sqlalchemy import Column, String, DateTime, Enum, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum

from app.core.database import Base


class DecisionType(str, enum.Enum):
    """Decision type enumeration"""
    HIRING = "hiring"
    PROMOTION = "promotion"
    APPRAISAL = "appraisal"
    COMPENSATION = "compensation"
    RETENTION = "retention"


class DecisionStatus(str, enum.Enum):
    """Decision status enumeration"""
    PENDING = "pending"
    ANALYZED = "analyzed"
    REVIEWED = "reviewed"
    FINALIZED = "finalized"


class Decision(Base):
    """Decision model"""
    __tablename__ = "decisions"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    decision_type = Column(Enum(DecisionType), nullable=False)
    employee_data = Column(JSON, nullable=False)
    comparable_cohort = Column(JSON)
    status = Column(Enum(DecisionStatus), default=DecisionStatus.PENDING)
    created_by = Column(String, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    finalized_at = Column(DateTime)
    organization_id = Column(String)
    
    # Relationships
    bias_analysis = relationship("BiasAnalysis", back_populates="decision", uselist=False)
    explanation = relationship("Explanation", back_populates="decision", uselist=False)
    audit_logs = relationship("AuditLog", back_populates="decision")
    
    def __repr__(self):
        return f"<Decision {self.id} - {self.decision_type.value}>"
