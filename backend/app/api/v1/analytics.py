from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import datetime, timedelta

from app.core.database import get_db
from app.models.user import User
from app.models.decision import Decision
from app.models.bias_analysis import BiasAnalysis
from app.api.v1.auth import get_current_user

router = APIRouter()


@router.get("/dashboard")
async def get_dashboard_metrics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get dashboard metrics and statistics"""
    
    # Total decisions
    total_decisions = db.query(Decision).filter(
        Decision.created_by == current_user.id
    ).count()
    
    # Decisions by type
    decisions_by_type = db.query(
        Decision.decision_type,
        func.count(Decision.id)
    ).filter(
        Decision.created_by == current_user.id
    ).group_by(Decision.decision_type).all()
    
    # Decisions by status
    decisions_by_status = db.query(
        Decision.status,
        func.count(Decision.id)
    ).filter(
        Decision.created_by == current_user.id
    ).group_by(Decision.status).all()
    
    # Risk level distribution
    risk_distribution = db.query(
        BiasAnalysis.risk_level,
        func.count(BiasAnalysis.id)
    ).join(Decision).filter(
        Decision.created_by == current_user.id
    ).group_by(BiasAnalysis.risk_level).all()
    
    # Recent decisions (last 7 days)
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    recent_decisions = db.query(Decision).filter(
        Decision.created_by == current_user.id,
        Decision.created_at >= seven_days_ago
    ).count()
    
    # Average risk score
    avg_risk_score = db.query(func.avg(BiasAnalysis.risk_score)).join(Decision).filter(
        Decision.created_by == current_user.id
    ).scalar()
    
    return {
        "total_decisions": total_decisions,
        "recent_decisions": recent_decisions,
        "average_risk_score": float(avg_risk_score) if avg_risk_score else 0,
        "decisions_by_type": {str(dt): count for dt, count in decisions_by_type},
        "decisions_by_status": {str(status): count for status, count in decisions_by_status},
        "risk_distribution": {str(risk): count for risk, count in risk_distribution}
    }


@router.get("/bias-trends")
async def get_bias_trends(
    days: int = 30,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get bias risk trends over time"""
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Query decisions with bias analysis
    results = db.query(
        func.date(Decision.created_at).label('date'),
        func.avg(BiasAnalysis.risk_score).label('avg_risk'),
        func.count(Decision.id).label('decision_count')
    ).join(BiasAnalysis).filter(
        Decision.created_by == current_user.id,
        Decision.created_at >= start_date
    ).group_by(
        func.date(Decision.created_at)
    ).order_by(
        func.date(Decision.created_at)
    ).all()
    
    return {
        "period_days": days,
        "data_points": len(results),
        "trends": [
            {
                "date": str(row.date),
                "average_risk_score": float(row.avg_risk) if row.avg_risk else 0,
                "decision_count": row.decision_count
            }
            for row in results
        ]
    }


@router.get("/fairness-metrics")
async def get_fairness_metrics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get organizational fairness metrics"""
    
    # Get all bias analyses for this user
    analyses = db.query(BiasAnalysis).join(Decision).filter(
        Decision.created_by == current_user.id
    ).all()
    
    if not analyses:
        return {
            "total_analyzed": 0,
            "message": "No decisions analyzed yet"
        }
    
    # Aggregate metrics
    total_analyzed = len(analyses)
    high_risk_count = sum(1 for a in analyses if a.risk_level == "high")
    moderate_risk_count = sum(1 for a in analyses if a.risk_level == "moderate")
    low_risk_count = sum(1 for a in analyses if a.risk_level == "low")
    
    avg_risk = sum(a.risk_score for a in analyses) / total_analyzed
    
    # Pattern summary
    all_patterns = []
    for analysis in analyses:
        if analysis.detected_patterns:
            all_patterns.extend(analysis.detected_patterns)
    
    pattern_types = {}
    for pattern in all_patterns:
        pattern_type = pattern.get("type", "unknown")
        pattern_types[pattern_type] = pattern_types.get(pattern_type, 0) + 1
    
    return {
        "total_analyzed": total_analyzed,
        "average_risk_score": avg_risk,
        "risk_distribution": {
            "high": high_risk_count,
            "moderate": moderate_risk_count,
            "low": low_risk_count
        },
        "pattern_summary": pattern_types,
        "high_risk_percentage": (high_risk_count / total_analyzed * 100) if total_analyzed > 0 else 0
    }


@router.post("/export-audit")
async def export_audit_logs(
    format: str = "json",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export audit logs in JSON format"""
    
    if format not in ["json"]:
        raise HTTPException(
            status_code=400,
            detail="Only JSON format is currently supported"
        )
    
    # Get all decisions for this user
    decisions = db.query(Decision).filter(
        Decision.created_by == current_user.id
    ).all()
    
    export_data = []
    
    for decision in decisions:
        decision_data = {
            "decision_id": str(decision.id),
            "decision_type": decision.decision_type.value,
            "status": decision.status.value,
            "created_at": decision.created_at.isoformat(),
            "finalized_at": decision.finalized_at.isoformat() if decision.finalized_at else None,
            "employee_data": decision.employee_data,
            "audit_logs": [
                {
                    "action": log.action,
                    "details": log.details,
                    "timestamp": log.created_at.isoformat()
                }
                for log in decision.audit_logs
            ]
        }
        
        # Add bias analysis if exists
        if decision.bias_analysis:
            decision_data["bias_analysis"] = {
                "risk_score": decision.bias_analysis.risk_score,
                "risk_level": decision.bias_analysis.risk_level,
                "detected_patterns": decision.bias_analysis.detected_patterns
            }
        
        # Add explanation if exists
        if decision.explanation:
            decision_data["explanation"] = {
                "justification": decision.explanation.justification,
                "key_factors": decision.explanation.key_factors
            }
        
        export_data.append(decision_data)
    
    return {
        "format": format,
        "exported_at": datetime.utcnow().isoformat(),
        "total_decisions": len(export_data),
        "data": export_data
    }
