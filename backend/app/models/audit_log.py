from sqlalchemy import Column, String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.core.database import Base


class AuditLog(Base):
    """Audit log model"""
    __tablename__ = "audit_logs"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    decision_id = Column(String, ForeignKey("decisions.id"))
    user_id = Column(String, ForeignKey("users.id"))
    action = Column(String(100), nullable=False)
    details = Column(JSON)  # Action-specific metadata
    ip_address = Column(String(45))
    user_agent = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Relationships
    decision = relationship("Decision", back_populates="audit_logs")
    
    def __repr__(self):
        return f"<AuditLog {self.action} at {self.created_at}>"
