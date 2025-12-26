from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import json
import csv
import io

from app.core.database import get_db
from app.models.user import User
from app.models.decision import Decision, DecisionType, DecisionStatus
from app.models.bias_analysis import BiasAnalysis, Explanation
from app.models.audit_log import AuditLog
from app.api.v1.auth import get_current_user
from app.services.bias_detection import BiasDetectionService
from app.services.explainability import ExplainabilityService

router = APIRouter()


# Pydantic schemas
class DecisionCreate(BaseModel):
    decision_type: str
    employee_data: dict
    comparable_cohort: Optional[List[dict]] = None


class DecisionResponse(BaseModel):
    id: str
    decision_type: str
    employee_data: dict
    comparable_cohort: Optional[dict]
    status: str
    created_at: datetime
    finalized_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class BiasAnalysisResponse(BaseModel):
    id: str
    risk_score: float
    risk_level: str
    detected_patterns: dict
    fairness_metrics: dict
    comparable_outcomes: dict
    
    class Config:
        from_attributes = True


class ExplanationResponse(BaseModel):
    id: str
    justification: str
    key_factors: dict
    alternatives: dict
    
    class Config:
        from_attributes = True


class DecisionDetailResponse(BaseModel):
    decision: DecisionResponse
    bias_analysis: Optional[BiasAnalysisResponse]
    explanation: Optional[ExplanationResponse]


# Initialize services
bias_service = BiasDetectionService()
explainability_service = ExplainabilityService()


def log_action(
    db: Session,
    decision_id: str,
    user_id: str,
    action: str,
    details: dict = None
):
    """Helper function to log actions to audit trail"""
    audit_log = AuditLog(
        decision_id=decision_id,
        user_id=user_id,
        action=action,
        details=details or {}
    )
    db.add(audit_log)
    db.commit()


@router.post("/upload", status_code=status.HTTP_200_OK)
async def upload_decision_data(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload decision data from CSV/JSON file"""
    try:
        contents = await file.read()
        
        if file.filename.endswith('.json'):
            data = json.loads(contents.decode('utf-8'))
        elif file.filename.endswith('.csv'):
            csv_data = csv.DictReader(io.StringIO(contents.decode('utf-8')))
            data = list(csv_data)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unsupported file format. Please upload CSV or JSON."
            )
        
        return {
            "message": "File uploaded successfully",
            "records": len(data) if isinstance(data, list) else 1,
            "data": data
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error processing file: {str(e)}"
        )


@router.post("/create", response_model=DecisionResponse, status_code=status.HTTP_201_CREATED)
async def create_decision(
    decision_data: DecisionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new decision record"""
    # Create decision
    new_decision = Decision(
        decision_type=DecisionType(decision_data.decision_type),
        employee_data=decision_data.employee_data,
        comparable_cohort=decision_data.comparable_cohort,
        created_by=current_user.id,
        organization_id=current_user.organization_id
    )
    
    db.add(new_decision)
    db.commit()
    db.refresh(new_decision)
    
    # Log action
    log_action(
        db,
        str(new_decision.id),
        str(current_user.id),
        "decision_created",
        {"decision_type": decision_data.decision_type}
    )
    
    return new_decision


@router.get("/{decision_id}", response_model=DecisionDetailResponse)
async def get_decision(
    decision_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get decision details with bias analysis and explanation"""
    decision = db.query(Decision).filter(Decision.id == decision_id).first()
    
    if not decision:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Decision not found"
        )
    
    return {
        "decision": decision,
        "bias_analysis": decision.bias_analysis,
        "explanation": decision.explanation
    }


@router.get("/", response_model=List[DecisionResponse])
async def list_decisions(
    skip: int = 0,
    limit: int = 50,
    decision_type: Optional[str] = None,
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List decisions with optional filters"""
    query = db.query(Decision).filter(Decision.created_by == current_user.id)
    
    if decision_type:
        query = query.filter(Decision.decision_type == DecisionType(decision_type))
    
    if status_filter:
        query = query.filter(Decision.status == DecisionStatus(status_filter))
    
    decisions = query.order_by(Decision.created_at.desc()).offset(skip).limit(limit).all()
    
    return decisions


@router.post("/{decision_id}/analyze", response_model=BiasAnalysisResponse)
async def analyze_decision(
    decision_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Run bias analysis on a decision"""
    decision = db.query(Decision).filter(Decision.id == decision_id).first()
    
    if not decision:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Decision not found"
        )
    
    # Check if analysis already exists
    existing_analysis = db.query(BiasAnalysis).filter(
        BiasAnalysis.decision_id == decision_id
    ).first()
    
    if existing_analysis:
        # Return existing analysis
        return existing_analysis
    
    # Run bias detection
    comparable_cohort = decision.comparable_cohort if decision.comparable_cohort else []
    
    analysis_result = bias_service.analyze_bias(
        decision.employee_data,
        comparable_cohort,
        decision.decision_type.value
    )
    
    # Store analysis results
    bias_analysis = BiasAnalysis(
        decision_id=decision.id,
        risk_score=analysis_result.risk_score,
        risk_level=analysis_result.risk_level,
        detected_patterns=analysis_result.detected_patterns,
        fairness_metrics=analysis_result.fairness_metrics,
        comparable_outcomes=analysis_result.comparable_outcomes
    )
    
    db.add(bias_analysis)
    
    # Update decision status
    decision.status = DecisionStatus.ANALYZED
    
    db.commit()
    db.refresh(bias_analysis)
    
    # Log action
    log_action(
        db,
        str(decision_id),
        str(current_user.id),
        "bias_analyzed",
        {
            "risk_level": analysis_result.risk_level,
            "risk_score": analysis_result.risk_score
        }
    )
    
    return bias_analysis


@router.post("/{decision_id}/explain", response_model=ExplanationResponse)
async def explain_decision(
    decision_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate AI explanation for a decision"""
    decision = db.query(Decision).filter(Decision.id == decision_id).first()
    
    if not decision:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Decision not found"
        )
    
    # Check if explanation already exists
    existing_explanation = db.query(Explanation).filter(
        Explanation.decision_id == decision_id
    ).first()
    
    if existing_explanation:
        return existing_explanation
    
    # Get bias analysis (run if needed)
    bias_analysis = db.query(BiasAnalysis).filter(
        BiasAnalysis.decision_id == decision_id
    ).first()
    
    if not bias_analysis:
        # Run analysis first
        comparable_cohort = decision.comparable_cohort if decision.comparable_cohort else []
        analysis_result = bias_service.analyze_bias(
            decision.employee_data,
            comparable_cohort,
            decision.decision_type.value
        )
        
        bias_analysis = BiasAnalysis(
            decision_id=decision.id,
            risk_score=analysis_result.risk_score,
            risk_level=analysis_result.risk_level,
            detected_patterns=analysis_result.detected_patterns,
            fairness_metrics=analysis_result.fairness_metrics,
            comparable_outcomes=analysis_result.comparable_outcomes
        )
        db.add(bias_analysis)
        db.commit()
        db.refresh(bias_analysis)
    
    # Generate explanation
    comparable_cohort = decision.comparable_cohort if decision.comparable_cohort else []
    
    explanation_result = await explainability_service.generate_explanation(
        decision.employee_data,
        bias_analysis,
        comparable_cohort,
        decision.decision_type.value
    )
    
    # Store explanation
    explanation = Explanation(
        decision_id=decision.id,
        justification=explanation_result.justification,
        key_factors=explanation_result.key_factors,
        alternatives=explanation_result.alternatives,
        gemini_prompt=explanation_result.prompt,
        gemini_response=explanation_result.raw_response
    )
    
    db.add(explanation)
    db.commit()
    db.refresh(explanation)
    
    # Log action
    log_action(
        db,
        str(decision_id),
        str(current_user.id),
        "explanation_generated"
    )
    
    return explanation


@router.put("/{decision_id}/finalize", response_model=DecisionResponse)
async def finalize_decision(
    decision_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Finalize a decision after human review"""
    decision = db.query(Decision).filter(Decision.id == decision_id).first()
    
    if not decision:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Decision not found"
        )
    
    # Update decision status
    decision.status = DecisionStatus.FINALIZED
    decision.finalized_at = datetime.utcnow()
    
    db.commit()
    db.refresh(decision)
    
    # Log action
    log_action(
        db,
        str(decision_id),
        str(current_user.id),
        "decision_finalized"
    )
    
    return decision


@router.get("/{decision_id}/audit-log")
async def get_audit_log(
    decision_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get audit trail for a decision"""
    decision = db.query(Decision).filter(Decision.id == decision_id).first()
    
    if not decision:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Decision not found"
        )
    
    audit_logs = db.query(AuditLog).filter(
        AuditLog.decision_id == decision_id
    ).order_by(AuditLog.created_at).all()
    
    return {
        "decision_id": decision_id,
        "total_logs": len(audit_logs),
        "logs": [
            {
                "action": log.action,
                "details": log.details,
                "created_at": log.created_at
            }
            for log in audit_logs
        ]
    }
