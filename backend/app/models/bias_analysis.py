from sqlalchemy import Column, String, DateTime, Float, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum

from app.core.database import Base


class RiskLevel(str, enum.Enum):
    """Risk level enumeration"""
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"


class BiasAnalysis(Base):
    """Bias analysis results model"""
    __tablename__ = "bias_analysis"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    decision_id = Column(String, ForeignKey("decisions.id", ondelete="CASCADE"), unique=True)
    risk_score = Column(Float)  # 0-1 scale
    risk_level = Column(String(20))  # low, moderate, high
    detected_patterns = Column(JSON)  # Specific bias patterns found
    fairness_metrics = Column(JSON)  # Demographic parity, equal opportunity, etc.
    comparable_outcomes = Column(JSON)  # How this decision compares to peers
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    decision = relationship("Decision", back_populates="bias_analysis")
    
    def __repr__(self):
        return f"<BiasAnalysis {self.id} - Risk: {self.risk_level}>"


class Explanation(Base):
    """AI-generated explanation model"""
    __tablename__ = "explanations"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    decision_id = Column(String, ForeignKey("decisions.id", ondelete="CASCADE"), unique=True)
    justification = Column(String, nullable=False)  # Plain-language explanation
    key_factors = Column(JSON)  # Important decision factors
    alternatives = Column(JSON)  # Alternative options considered
    gemini_prompt = Column(String)  # Original prompt sent to Gemini
    gemini_response = Column(String)  # Raw Gemini response
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    decision = relationship("Decision", back_populates="explanation")
    
    def __repr__(self):
        return f"<Explanation {self.id}>"
