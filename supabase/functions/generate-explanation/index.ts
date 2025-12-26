import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ====================================================================
// GEMINI EXPLANATION EDGE FUNCTION
// ====================================================================
// This replaces the Python explainability.py service
// Generates AI-powered explanations using Google Gemini
// ====================================================================

interface ExplanationRequest {
    decision_id: string;
}

interface ExplanationResult {
    justification: string;
    key_factors: any[];
    alternatives: string[];
    raw_response: string;
    prompt: string;
}

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
const GEMINI_MODEL = 'gemini-1.5-pro-latest'

serve(async (req) => {
    try {
        // CORS headers
        if (req.method === 'OPTIONS') {
            return new Response('ok', {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
                }
            })
        }

        // Get authorization header
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            throw new Error('Missing authorization header')
        }

        // Create Supabase client
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        )

        // Get current user
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
        if (userError || !user) {
            throw new Error('Unauthorized')
        }

        // Parse request body
        const { decision_id }: ExplanationRequest = await req.json()

        if (!decision_id) {
            throw new Error('decision_id is required')
        }

        // Fetch decision data
        const { data: decision, error: decisionError } = await supabaseClient
            .from('decisions')
            .select('*')
            .eq('id', decision_id)
            .single()

        if (decisionError || !decision) {
            throw new Error('Decision not found')
        }

        // Check if explanation already exists
        const { data: existingExplanation } = await supabaseClient
            .from('explanations')
            .select('*')
            .eq('decision_id', decision_id)
            .single()

        if (existingExplanation) {
            return new Response(JSON.stringify(existingExplanation), {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
            })
        }

        // Get bias analysis (run if needed)
        let { data: biasAnalysis } = await supabaseClient
            .from('bias_analysis')
            .select('*')
            .eq('decision_id', decision_id)
            .single()

        if (!biasAnalysis) {
            // Trigger bias analysis first
            const analyzeResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/analyze-bias`, {
                method: 'POST',
                headers: {
                    'Authorization': authHeader,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ decision_id })
            })

            if (analyzeResponse.ok) {
                biasAnalysis = await analyzeResponse.json()
            }
        }

        // Generate explanation
        const explanationResult = await generateExplanation(
            decision.employee_data,
            biasAnalysis,
            decision.comparable_cohort || [],
            decision.decision_type
        )

        // Store explanation using service role client
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { data: explanation, error: insertError } = await supabaseAdmin
            .from('explanations')
            .insert({
                decision_id: decision_id,
                justification: explanationResult.justification,
                key_factors: explanationResult.key_factors,
                alternatives: explanationResult.alternatives,
                gemini_prompt: explanationResult.prompt,
                gemini_response: explanationResult.raw_response
            })
            .select()
            .single()

        if (insertError) {
            throw insertError
        }

        // Log action
        await supabaseAdmin
            .from('audit_logs')
            .insert({
                decision_id: decision_id,
                user_id: user.id,
                action: 'explanation_generated',
                details: {}
            })

        return new Response(JSON.stringify(explanation), {
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
        })
    }
})

// ====================================================================
// EXPLANATION GENERATION FUNCTIONS
// ====================================================================

async function generateExplanation(
    decisionData: any,
    biasAnalysis: any,
    comparableCohort: any[],
    decisionType: string
): Promise<ExplanationResult> {
    if (!GEMINI_API_KEY) {
        return generateFallbackExplanation(decisionData, biasAnalysis, decisionType)
    }

    const prompt = buildExplanationPrompt(decisionData, biasAnalysis, comparableCohort, decisionType)

    try {
        // Call Gemini API
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: prompt }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 2048,
                    }
                })
            }
        )

        if (!response.ok) {
            console.error('Gemini API error:', await response.text())
            return generateFallbackExplanation(decisionData, biasAnalysis, decisionType)
        }

        const data = await response.json()
        const responseText = data.candidates[0]?.content?.parts[0]?.text || ''

        return parseGeminiResponse(responseText, prompt)

    } catch (error) {
        console.error('Gemini API error:', error)
        return generateFallbackExplanation(decisionData, biasAnalysis, decisionType)
    }
}

function buildExplanationPrompt(
    decisionData: any,
    biasAnalysis: any,
    comparableCohort: any[],
    decisionType: string
): string {
    const riskLevel = biasAnalysis?.risk_level || 'unknown'
    const riskScore = biasAnalysis?.risk_score || 0
    const detectedPatterns = biasAnalysis?.detected_patterns || []
    const fairnessMetrics = biasAnalysis?.fairness_metrics || {}

    const prompt = `You are an ethical AI assistant for GlassBox AI, an HR Decision Intelligence platform. Your role is to provide transparent, unbiased, and factual explanations for HR decisions.

DECISION CONTEXT:
- Decision Type: ${decisionType.toUpperCase()}
- Employee/Candidate Profile: ${JSON.stringify(decisionData, null, 2)}
- Number of Comparable Peers: ${comparableCohort.length}

BIAS ANALYSIS RESULTS:
- Risk Level: ${riskLevel.toUpperCase()}
- Risk Score: ${riskScore.toFixed(2)}/1.0
- Detected Patterns: ${detectedPatterns.length}

FAIRNESS METRICS:
- Cohort Size: ${fairnessMetrics.cohort_size || 0}
- Cohort Mean Outcome: ${fairnessMetrics.cohort_mean || 'N/A'}
- Decision Z-Score: ${fairnessMetrics.z_score || 'N/A'}

DETECTED PATTERNS:
${detectedPatterns.length > 0
            ? detectedPatterns.map((p: any, i: number) =>
                `${i + 1}. ${p.description} (Severity: ${p.severity})`
            ).join('\n')
            : 'No significant bias patterns detected.'
        }

TASK:
Generate a comprehensive, transparent explanation for this ${decisionType} decision. Your response MUST include:

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
{
  "justification": "Your 2-3 paragraph explanation here...",
  "key_factors": [
    {"factor": "Factor name", "weight": 8, "description": "Why this matters..."},
    ...
  ],
  "alternatives": [
    "Alternative perspective 1...",
    ...
  ]
}

Generate the explanation now:`

    return prompt
}

function parseGeminiResponse(responseText: string, prompt: string): ExplanationResult {
    try {
        // Try to extract JSON from response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0])

            return {
                justification: parsed.justification || '',
                key_factors: parsed.key_factors || [],
                alternatives: parsed.alternatives || [],
                raw_response: responseText,
                prompt: prompt
            }
        }
    } catch (error) {
        console.error('JSON parse error:', error)
    }

    // Fallback: treat entire response as justification
    return {
        justification: responseText,
        key_factors: [],
        alternatives: [],
        raw_response: responseText,
        prompt: prompt
    }
}

function generateFallbackExplanation(
    decisionData: any,
    biasAnalysis: any,
    decisionType: string
): ExplanationResult {
    const riskLevel = biasAnalysis?.risk_level || 'unknown'

    const justification = `This ${decisionType} decision has been analyzed for bias and consistency with comparable peers.

Based on the analysis, the decision shows a ${riskLevel} level of bias risk. The decision data was compared against similar employee profiles to ensure fairness and consistency.

Key factors considered include the candidate's qualifications, experience, performance history, and how these compare to peers in similar roles. The analysis uses statistical methods to identify any unusual patterns or deviations from expected outcomes.

This explanation is generated as a fallback because the AI explanation service is currently unavailable. For full explainability, please configure the Gemini API key in your environment settings.`

    const keyFactors = [
        {
            factor: 'Qualifications',
            weight: 8,
            description: "Candidate's skills and credentials relevant to the role"
        },
        {
            factor: 'Experience',
            weight: 7,
            description: 'Years of relevant work experience'
        },
        {
            factor: 'Peer Comparison',
            weight: 9,
            description: 'How this decision compares to similar cases'
        }
    ]

    const alternatives = [
        'Consider additional context not captured in structured data',
        'Review qualitative feedback from stakeholders',
        'Examine longer-term performance trends'
    ]

    return {
        justification: justification.trim(),
        key_factors: keyFactors,
        alternatives: alternatives,
        raw_response: 'Fallback explanation generated',
        prompt: 'No prompt - fallback mode'
    }
}
