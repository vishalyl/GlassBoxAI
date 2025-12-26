import numpy as np
from typing import List, Dict, Any, Optional
from collections import defaultdict


class BiasAnalysisResult:
    """Container for bias analysis results"""
    def __init__(
        self,
        risk_score: float,
        risk_level: str,
        detected_patterns: List[Dict[str, Any]],
        fairness_metrics: Dict[str, Any],
        comparable_outcomes: Dict[str, Any]
    ):
        self.risk_score = risk_score
        self.risk_level = risk_level
        self.detected_patterns = detected_patterns
        self.fairness_metrics = fairness_metrics
        self.comparable_outcomes = comparable_outcomes


class BiasDetectionService:
    """Service for detecting bias in HR decisions"""
    
    def __init__(self):
        self.risk_thresholds = {
            "low": 0.3,
            "moderate": 0.6,
            "high": 1.0
        }
    
    def analyze_bias(
        self,
        decision_data: Dict[str, Any],
        comparable_cohort: List[Dict[str, Any]],
        decision_type: str
    ) -> BiasAnalysisResult:
        """
        Analyze decision for potential bias
        
        Args:
            decision_data: The decision being evaluated
            comparable_cohort: List of comparable employee/candidate profiles
            decision_type: Type of decision (hiring, promotion, etc.)
            
        Returns:
            BiasAnalysisResult with risk score, patterns, and metrics
        """
        # Calculate fairness metrics
        fairness_metrics = self._calculate_fairness_metrics(
            decision_data, comparable_cohort, decision_type
        )
        
        # Detect outcome deviations
        comparable_outcomes = self._analyze_outcome_deviations(
            decision_data, comparable_cohort
        )
        
        # Identify specific patterns
        detected_patterns = self._detect_patterns(
            decision_data, comparable_cohort, fairness_metrics
        )
        
        # Calculate composite risk score
        risk_score = self._calculate_risk_score(fairness_metrics, detected_patterns)
        risk_level = self._determine_risk_level(risk_score)
        
        return BiasAnalysisResult(
            risk_score=risk_score,
            risk_level=risk_level,
            detected_patterns=detected_patterns,
            fairness_metrics=fairness_metrics,
            comparable_outcomes=comparable_outcomes
        )
    
    def _calculate_fairness_metrics(
        self,
        decision_data: Dict[str, Any],
        comparable_cohort: List[Dict[str, Any]],
        decision_type: str
    ) -> Dict[str, Any]:
        """Calculate fairness metrics"""
        metrics = {}
        
        # Get decision outcome (e.g., selected, promoted, rating)
        outcome_key = self._get_outcome_key(decision_type)
        decision_outcome = decision_data.get(outcome_key)
        
        # Calculate cohort statistics
        cohort_outcomes = [emp.get(outcome_key) for emp in comparable_cohort if outcome_key in emp]
        
        if cohort_outcomes:
            # Convert to numeric if possible
            numeric_outcomes = []
            for outcome in cohort_outcomes:
                if isinstance(outcome, (int, float)):
                    numeric_outcomes.append(float(outcome))
                elif isinstance(outcome, bool):
                    numeric_outcomes.append(1.0 if outcome else 0.0)
                elif isinstance(outcome, str) and outcome.lower() in ['yes', 'selected', 'promoted']:
                    numeric_outcomes.append(1.0)
                elif isinstance(outcome, str) and outcome.lower() in ['no', 'rejected', 'not promoted']:
                    numeric_outcomes.append(0.0)
            
            if numeric_outcomes:
                metrics["cohort_mean"] = np.mean(numeric_outcomes)
                metrics["cohort_std"] = np.std(numeric_outcomes)
                metrics["cohort_size"] = len(comparable_cohort)
                
                # Decision deviation from cohort
                if isinstance(decision_outcome, (int, float)):
                    decision_value = float(decision_outcome)
                elif isinstance(decision_outcome, bool):
                    decision_value = 1.0 if decision_outcome else 0.0
                else:
                    decision_value = metrics["cohort_mean"]  # Default to mean
                
                if metrics["cohort_std"] > 0:
                    metrics["z_score"] = (decision_value - metrics["cohort_mean"]) / metrics["cohort_std"]
                else:
                    metrics["z_score"] = 0.0
                
                metrics["decision_value"] = decision_value
        
        # Demographic parity (if protected attributes available)
        metrics["demographic_analysis"] = self._analyze_demographic_parity(
            decision_data, comparable_cohort
        )
        
        return metrics
    
    def _analyze_outcome_deviations(
        self,
        decision_data: Dict[str, Any],
        comparable_cohort: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Analyze how this decision compares to peer outcomes"""
        outcomes = {
            "total_comparable": len(comparable_cohort),
            "similar_attributes": [],
            "deviation_analysis": {}
        }
        
        # Find employees with very similar profiles
        key_attributes = ["experience_years", "tenure_years", "performance_rating", "role_level"]
        
        for attr in key_attributes:
            if attr in decision_data:
                decision_value = decision_data[attr]
                similar_values = [
                    emp.get(attr) for emp in comparable_cohort
                    if attr in emp and abs(emp.get(attr, 0) - decision_value) <= 1
                ]
                
                if similar_values:
                    outcomes["similar_attributes"].append({
                        "attribute": attr,
                        "decision_value": decision_value,
                        "similar_count": len(similar_values),
                        "similar_mean": np.mean(similar_values)
                    })
        
        return outcomes
    
    def _detect_patterns(
        self,
        decision_data: Dict[str, Any],
        comparable_cohort: List[Dict[str, Any]],
        fairness_metrics: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Detect specific bias patterns"""
        patterns = []
        
        # Pattern 1: Significant deviation from cohort mean
        z_score = fairness_metrics.get("z_score", 0)
        if abs(z_score) > 2:
            patterns.append({
                "type": "outcome_deviation",
                "severity": "moderate" if abs(z_score) < 3 else "high",
                "description": f"Decision outcome deviates {abs(z_score):.2f} standard deviations from comparable peers",
                "z_score": z_score
            })
        
        # Pattern 2: Demographic disparity
        demo_analysis = fairness_metrics.get("demographic_analysis", {})
        if demo_analysis.get("disparity_detected"):
            patterns.append({
                "type": "demographic_disparity",
                "severity": demo_analysis.get("severity", "low"),
                "description": demo_analysis.get("description", "Demographic disparity detected"),
                "details": demo_analysis.get("details")
            })
        
        # Pattern 3: Outlier detection
        if fairness_metrics.get("cohort_size", 0) >= 10:
            decision_value = fairness_metrics.get("decision_value")
            if decision_value is not None:
                cohort_mean = fairness_metrics.get("cohort_mean", 0)
                cohort_std = fairness_metrics.get("cohort_std", 1)
                
                if abs(decision_value - cohort_mean) > 3 * cohort_std:
                    patterns.append({
                        "type": "statistical_outlier",
                        "severity": "high",
                        "description": "Decision is a statistical outlier compared to peers"
                    })
        
        return patterns
    
    def _analyze_demographic_parity(
        self,
        decision_data: Dict[str, Any],
        comparable_cohort: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Analyze demographic parity if protected attributes are available"""
        analysis = {"disparity_detected": False}
        
        # Protected attributes (if disclosed)
        protected_attrs = ["gender", "age_group", "ethnicity"]
        
        for attr in protected_attrs:
            if attr in decision_data:
                # Group cohort by this attribute
                groups = defaultdict(list)
                for emp in comparable_cohort:
                    if attr in emp:
                        groups[emp[attr]].append(emp)
                
                # Calculate selection rates per group
                if len(groups) >= 2:
                    group_stats = {}
                    for group_name, members in groups.items():
                        # Count positive outcomes
                        positive = sum(
                            1 for m in members
                            if m.get("outcome") in [True, "selected", "promoted", "yes"]
                        )
                        group_stats[group_name] = {
                            "count": len(members),
                            "positive": positive,
                            "rate": positive / len(members) if len(members) > 0 else 0
                        }
                    
                    # Check for significant disparity (80% rule)
                    rates = [stats["rate"] for stats in group_stats.values()]
                    if rates:
                        min_rate = min(rates)
                        max_rate = max(rates)
                        
                        if max_rate > 0 and (min_rate / max_rate) < 0.8:
                            analysis["disparity_detected"] = True
                            analysis["severity"] = "moderate"
                            analysis["description"] = f"Demographic disparity detected in {attr}"
                            analysis["details"] = group_stats
        
        return analysis
    
    def _calculate_risk_score(
        self,
        fairness_metrics: Dict[str, Any],
        detected_patterns: List[Dict[str, Any]]
    ) -> float:
        """Calculate composite risk score (0-1)"""
        risk_components = []
        
        # Component 1: Z-score deviation
        z_score = abs(fairness_metrics.get("z_score", 0))
        z_risk = min(z_score / 3, 1.0)  # Normalize to 0-1
        risk_components.append(z_risk * 0.4)  # 40% weight
        
        # Component 2: Number and severity of patterns
        pattern_risk = 0
        for pattern in detected_patterns:
            severity = pattern.get("severity", "low")
            if severity == "high":
                pattern_risk += 0.3
            elif severity == "moderate":
                pattern_risk += 0.15
            else:
                pattern_risk += 0.05
        
        pattern_risk = min(pattern_risk, 1.0)
        risk_components.append(pattern_risk * 0.4)  # 40% weight
        
        # Component 3: Demographic disparity
        demo_analysis = fairness_metrics.get("demographic_analysis", {})
        if demo_analysis.get("disparity_detected"):
            risk_components.append(0.2)  # 20% weight
        
        return min(sum(risk_components), 1.0)
    
    def _determine_risk_level(self, risk_score: float) -> str:
        """Determine risk level from score"""
        if risk_score < self.risk_thresholds["low"]:
            return "low"
        elif risk_score < self.risk_thresholds["moderate"]:
            return "moderate"
        else:
            return "high"
    
    def _get_outcome_key(self, decision_type: str) -> str:
        """Get the outcome field name for a decision type"""
        outcome_keys = {
            "hiring": "selected",
            "promotion": "promoted",
            "appraisal": "performance_rating",
            "compensation": "salary_increase",
            "retention": "retained"
        }
        return outcome_keys.get(decision_type, "outcome")
