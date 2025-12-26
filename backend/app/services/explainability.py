import google.generativeai as genai
from typing import Dict, Any, List, Optional
import json
import re

from app.core.config import settings


class ExplanationResult:
    """Container for explainability results"""
    def __init__(
        self,
        justification: str,
        key_factors: List[Dict[str, Any]],
        alternatives: List[str],
        raw_response: str,
        prompt: str
    ):
        self.justification = justification
        self.key_factors = key_factors
        self.alternatives = alternatives
        self.raw_response = raw_response
        self.prompt = prompt


class ExplainabilityService:
    """Service for generating AI-powered explanations using Gemini"""
    
    def __init__(self):
        if settings.GEMINI_API_KEY:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self.model = genai.GenerativeModel(settings.GEMINI_MODEL)
        else:
            self.model = None
    
    async def generate_explanation(
        self,
        decision_data: Dict[str, Any],
        bias_analysis: Any,
        comparable_cohort: List[Dict[str, Any]],
        decision_type: str
    ) -> ExplanationResult:
        """
        Generate plain-language explanation for a decision using Gemini
        
        Args:
            decision_data: The decision being evaluated
            bias_analysis: BiasAnalysisResult object
            comparable_cohort: List of comparable profiles
            decision_type: Type of decision
            
        Returns:
            ExplanationResult with justification and insights
        """
        if not self.model:
            # Fallback for testing without API key
            return self._generate_fallback_explanation(
                decision_data, bias_analysis, decision_type
            )
        
        # Build comprehensive prompt
        prompt = self._build_explanation_prompt(
            decision_data, bias_analysis, comparable_cohort, decision_type
        )
        
        try:
            # Generate content using Gemini
            response = self.model.generate_content(prompt)
            
            # Parse the response
            result = self._parse_gemini_response(response.text, prompt)
            return result
            
        except Exception as e:
            print(f"Gemini API error: {e}")
            return self._generate_fallback_explanation(
                decision_data, bias_analysis, decision_type
            )
    
    def _build_explanation_prompt(
        self,
        decision_data: Dict[str, Any],
        bias_analysis: Any,
        comparable_cohort: List[Dict[str, Any]],
        decision_type: str
    ) -> str:
        """Build a comprehensive prompt for Gemini"""
        
        # Extract key metrics
        risk_level = bias_analysis.risk_level if bias_analysis else "unknown"
        risk_score = bias_analysis.risk_score if bias_analysis else 0
        detected_patterns = bias_analysis.detected_patterns if bias_analysis else []
        fairness_metrics = bias_analysis.fairness_metrics if bias_analysis else {}
        
        prompt = f"""You are an ethical AI assistant for GlassBox AI, an HR Decision Intelligence platform. Your role is to provide transparent, unbiased, and factual explanations for HR decisions.

DECISION CONTEXT:
- Decision Type: {decision_type.upper()}
- Employee/Candidate Profile: {json.dumps(decision_data, indent=2)}
- Number of Comparable Peers: {len(comparable_cohort)}

BIAS ANALYSIS RESULTS:
- Risk Level: {risk_level.upper()}
- Risk Score: {risk_score:.2f}/1.0
- Detected Patterns: {len(detected_patterns)}

FAIRNESS METRICS:
- Cohort Size: {fairness_metrics.get('cohort_size', 0)}
- Cohort Mean Outcome: {fairness_metrics.get('cohort_mean', 'N/A')}
- Decision Z-Score: {fairness_metrics.get('z_score', 'N/A')}

DETECTED PATTERNS:
"""
        
        if detected_patterns:
            for i, pattern in enumerate(detected_patterns, 1):
                prompt += f"{i}. {pattern.get('description', 'Pattern detected')} (Severity: {pattern.get('severity', 'unknown')})\n"
        else:
            prompt += "No significant bias patterns detected.\n"
        
        prompt += f"""

TASK:
Generate a comprehensive, transparent explanation for this {decision_type} decision. Your response MUST include:

1. **JUSTIFICATION** (2-3 paragraphs):
   - Provide a clear, factual explanation of the decision
   - Reference objective criteria and comparable outcomes
   - Acknowledge any uncertainties or limitations
   - Use non-judgmental, professional language
   - If bias risks were detected, acknowledge them factually

2. **KEY FACTORS** (List 3-5 factors):
   - List the most important factors that influenced this decision
   - For each factor, provide: name, weight/importance (1-10), and brief description
   - Be specific and quantifiable where possible

3. **ALTERNATIVE PERSPECTIVES** (2-3 alternatives):
   - Suggest alternative interpretations or approaches
   - Consider what might lead to a different outcome
   - Acknowledge valid reasons for different decisions

ETHICAL GUIDELINES:
- Focus on factors, not people
- Avoid accusatory or judgmental language
- Acknowledge uncertainty where it exists
- Provide balanced, multi-perspective analysis
- Highlight both supporting and concerning signals
- Never claim certainty in subjective matters

FORMAT YOUR RESPONSE AS JSON:
{{
  "justification": "Your 2-3 paragraph explanation here...",
  "key_factors": [
    {{"factor": "Factor name", "weight": 8, "description": "Why this matters..."}},
    ...
  ],
  "alternatives": [
    "Alternative perspective 1...",
    ...
  ]
}}

Generate the explanation now:"""
        
        return prompt
    
    def _parse_gemini_response(self, response_text: str, prompt: str) -> ExplanationResult:
        """Parse Gemini's response into structured format"""
        try:
            # Try to extract JSON from response
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
                parsed = json.loads(json_str)
                
                return ExplanationResult(
                    justification=parsed.get("justification", ""),
                    key_factors=parsed.get("key_factors", []),
                    alternatives=parsed.get("alternatives", []),
                    raw_response=response_text,
                    prompt=prompt
                )
        except json.JSONDecodeError:
            pass
        
        # Fallback: treat entire response as justification
        return ExplanationResult(
            justification=response_text,
            key_factors=[],
            alternatives=[],
            raw_response=response_text,
            prompt=prompt
        )
    
    def _generate_fallback_explanation(
        self,
        decision_data: Dict[str, Any],
        bias_analysis: Any,
        decision_type: str
    ) -> ExplanationResult:
        """Generate a basic explanation when Gemini is unavailable"""
        
        risk_level = bias_analysis.risk_level if bias_analysis else "unknown"
        
        justification = f"""
This {decision_type} decision has been analyzed for bias and consistency with comparable peers.

Based on the analysis, the decision shows a {risk_level} level of bias risk. The decision data was compared against similar employee profiles to ensure fairness and consistency.

Key factors considered include the candidate's qualifications, experience, performance history, and how these compare to peers in similar roles. The analysis uses statistical methods to identify any unusual patterns or deviations from expected outcomes.

This explanation is generated as a fallback because the AI explanation service is currently unavailable. For full explainability, please configure the Gemini API key in your environment settings.
"""
        
        key_factors = [
            {
                "factor": "Qualifications",
                "weight": 8,
                "description": "Candidate's skills and credentials relevant to the role"
            },
            {
                "factor": "Experience",
                "weight": 7,
                "description": "Years of relevant work experience"
            },
            {
                "factor": "Peer Comparison",
                "weight": 9,
                "description": "How this decision compares to similar cases"
            }
        ]
        
        alternatives = [
            "Consider additional context not captured in structured data",
            "Review qualitative feedback from stakeholders",
            "Examine longer-term performance trends"
        ]
        
        return ExplanationResult(
            justification=justification.strip(),
            key_factors=key_factors,
            alternatives=alternatives,
            raw_response="Fallback explanation generated",
            prompt="No prompt - fallback mode"
        )
