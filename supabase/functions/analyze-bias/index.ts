import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ====================================================================
// BIAS DETECTION EDGE FUNCTION
// ====================================================================
// This replaces the Python bias_detection.py service
// Analyzes HR decisions for potential bias and fairness issues
// ====================================================================

interface BiasAnalysisRequest {
    decision_id: string;
}

interface DecisionData {
    employee_data: any;
    comparable_cohort: any[];
    decision_type: string;
}

interface BiasAnalysisResult {
    risk_score: number;
    risk_level: 'low' | 'moderate' | 'high';
    detected_patterns: any[];
    fairness_metrics: any;
    comparable_outcomes: any;
}

// Risk thresholds
const RISK_THRESHOLDS = {
    low: 0.3,
    moderate: 0.6,
    high: 1.0
};

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
        const { decision_id }: BiasAnalysisRequest = await req.json()

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

        // Check if analysis already exists
        const { data: existingAnalysis } = await supabaseClient
            .from('bias_analysis')
            .select('*')
            .eq('decision_id', decision_id)
            .single()

        if (existingAnalysis) {
            return new Response(JSON.stringify(existingAnalysis), {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
            })
        }

        // Run bias analysis
        const analysisResult = analyzeBias(
            decision.employee_data,
            decision.comparable_cohort || [],
            decision.decision_type
        )

        // Store results using service role client
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { data: biasAnalysis, error: insertError } = await supabaseAdmin
            .from('bias_analysis')
            .insert({
                decision_id: decision_id,
                risk_score: analysisResult.risk_score,
                risk_level: analysisResult.risk_level,
                detected_patterns: analysisResult.detected_patterns,
                fairness_metrics: analysisResult.fairness_metrics,
                comparable_outcomes: analysisResult.comparable_outcomes
            })
            .select()
            .single()

        if (insertError) {
            throw insertError
        }

        // Update decision status
        await supabaseAdmin
            .from('decisions')
            .update({ status: 'analyzed' })
            .eq('id', decision_id)

        // Log action
        await supabaseAdmin
            .from('audit_logs')
            .insert({
                decision_id: decision_id,
                user_id: user.id,
                action: 'bias_analyzed',
                details: {
                    risk_level: analysisResult.risk_level,
                    risk_score: analysisResult.risk_score
                }
            })

        return new Response(JSON.stringify(biasAnalysis), {
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
// BIAS ANALYSIS FUNCTIONS
// ====================================================================

function analyzeBias(
    decisionData: any,
    comparableCohort: any[],
    decisionType: string
): BiasAnalysisResult {
    const fairnessMetrics = calculateFairnessMetrics(decisionData, comparableCohort, decisionType)
    const comparableOutcomes = analyzeOutcomeDeviations(decisionData, comparableCohort)
    const detectedPatterns = detectPatterns(decisionData, comparableCohort, fairnessMetrics)
    const riskScore = calculateRiskScore(fairnessMetrics, detectedPatterns)
    const riskLevel = determineRiskLevel(riskScore)

    return {
        risk_score: riskScore,
        risk_level: riskLevel,
        detected_patterns: detectedPatterns,
        fairness_metrics: fairnessMetrics,
        comparable_outcomes: comparableOutcomes
    }
}

function calculateFairnessMetrics(decisionData: any, comparableCohort: any[], decisionType: string): any {
    const metrics: any = {}

    const outcomeKey = getOutcomeKey(decisionType)
    const decisionOutcome = decisionData[outcomeKey]

    const cohortOutcomes = comparableCohort
        .filter(emp => emp[outcomeKey] !== undefined)
        .map(emp => convertToNumeric(emp[outcomeKey]))
        .filter(val => val !== null)

    if (cohortOutcomes.length > 0) {
        const mean = cohortOutcomes.reduce((a, b) => a + b, 0) / cohortOutcomes.length
        const variance = cohortOutcomes.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / cohortOutcomes.length
        const std = Math.sqrt(variance)

        metrics.cohort_mean = mean
        metrics.cohort_std = std
        metrics.cohort_size = comparableCohort.length

        const decisionValue = convertToNumeric(decisionOutcome) ?? mean
        metrics.decision_value = decisionValue

        if (std > 0) {
            metrics.z_score = (decisionValue - mean) / std
        } else {
            metrics.z_score = 0
        }
    }

    metrics.demographic_analysis = analyzeDemographicParity(decisionData, comparableCohort)

    return metrics
}

function analyzeOutcomeDeviations(decisionData: any, comparableCohort: any[]): any {
    const outcomes: any = {
        total_comparable: comparableCohort.length,
        similar_attributes: [],
        deviation_analysis: {}
    }

    const keyAttributes = ['experience_years', 'tenure_years', 'performance_rating', 'role_level']

    for (const attr of keyAttributes) {
        if (decisionData[attr] !== undefined) {
            const decisionValue = decisionData[attr]
            const similarValues = comparableCohort
                .filter(emp => emp[attr] !== undefined && Math.abs(emp[attr] - decisionValue) <= 1)
                .map(emp => emp[attr])

            if (similarValues.length > 0) {
                const mean = similarValues.reduce((a, b) => a + b, 0) / similarValues.length
                outcomes.similar_attributes.push({
                    attribute: attr,
                    decision_value: decisionValue,
                    similar_count: similarValues.length,
                    similar_mean: mean
                })
            }
        }
    }

    return outcomes
}

function detectPatterns(decisionData: any, comparableCohort: any[], fairnessMetrics: any): any[] {
    const patterns = []

    // Pattern 1: Significant deviation from cohort mean
    const zScore = fairnessMetrics.z_score || 0
    if (Math.abs(zScore) > 2) {
        patterns.push({
            type: 'outcome_deviation',
            severity: Math.abs(zScore) < 3 ? 'moderate' : 'high',
            description: `Decision outcome deviates ${Math.abs(zScore).toFixed(2)} standard deviations from comparable peers`,
            z_score: zScore
        })
    }

    // Pattern 2: Demographic disparity
    const demoAnalysis = fairnessMetrics.demographic_analysis || {}
    if (demoAnalysis.disparity_detected) {
        patterns.push({
            type: 'demographic_disparity',
            severity: demoAnalysis.severity || 'low',
            description: demoAnalysis.description || 'Demographic disparity detected',
            details: demoAnalysis.details
        })
    }

    // Pattern 3: Statistical outlier
    if (fairnessMetrics.cohort_size >= 10) {
        const decisionValue = fairnessMetrics.decision_value
        const cohortMean = fairnessMetrics.cohort_mean || 0
        const cohortStd = fairnessMetrics.cohort_std || 1

        if (decisionValue !== null && Math.abs(decisionValue - cohortMean) > 3 * cohortStd) {
            patterns.push({
                type: 'statistical_outlier',
                severity: 'high',
                description: 'Decision is a statistical outlier compared to peers'
            })
        }
    }

    return patterns
}

function analyzeDemographicParity(decisionData: any, comparableCohort: any[]): any {
    const analysis: any = { disparity_detected: false }

    const protectedAttrs = ['gender', 'age_group', 'ethnicity']

    for (const attr of protectedAttrs) {
        if (decisionData[attr]) {
            const groups: { [key: string]: any[] } = {}

            for (const emp of comparableCohort) {
                if (emp[attr]) {
                    if (!groups[emp[attr]]) groups[emp[attr]] = []
                    groups[emp[attr]].push(emp)
                }
            }

            if (Object.keys(groups).length >= 2) {
                const groupStats: any = {}

                for (const [groupName, members] of Object.entries(groups)) {
                    const positive = members.filter(m =>
                        ['true', 'selected', 'promoted', 'yes'].includes(String(m.outcome).toLowerCase())
                    ).length

                    groupStats[groupName] = {
                        count: members.length,
                        positive: positive,
                        rate: members.length > 0 ? positive / members.length : 0
                    }
                }

                const rates = Object.values(groupStats).map((s: any) => s.rate)
                const minRate = Math.min(...rates)
                const maxRate = Math.max(...rates)

                if (maxRate > 0 && (minRate / maxRate) < 0.8) {
                    analysis.disparity_detected = true
                    analysis.severity = 'moderate'
                    analysis.description = `Demographic disparity detected in ${attr}`
                    analysis.details = groupStats
                }
            }
        }
    }

    return analysis
}

function calculateRiskScore(fairnessMetrics: any, detectedPatterns: any[]): number {
    let riskComponents = []

    // Component 1: Z-score deviation (40% weight)
    const zScore = Math.abs(fairnessMetrics.z_score || 0)
    const zRisk = Math.min(zScore / 3, 1.0)
    riskComponents.push(zRisk * 0.4)

    // Component 2: Pattern severity (40% weight)
    let patternRisk = 0
    for (const pattern of detectedPatterns) {
        const severity = pattern.severity || 'low'
        if (severity === 'high') patternRisk += 0.3
        else if (severity === 'moderate') patternRisk += 0.15
        else patternRisk += 0.05
    }
    patternRisk = Math.min(patternRisk, 1.0)
    riskComponents.push(patternRisk * 0.4)

    // Component 3: Demographic disparity (20% weight)
    const demoAnalysis = fairnessMetrics.demographic_analysis || {}
    if (demoAnalysis.disparity_detected) {
        riskComponents.push(0.2)
    }

    return Math.min(riskComponents.reduce((a, b) => a + b, 0), 1.0)
}

function determineRiskLevel(riskScore: number): 'low' | 'moderate' | 'high' {
    if (riskScore < RISK_THRESHOLDS.low) return 'low'
    if (riskScore < RISK_THRESHOLDS.moderate) return 'moderate'
    return 'high'
}

function getOutcomeKey(decisionType: string): string {
    const outcomeKeys: { [key: string]: string } = {
        'hiring': 'selected',
        'promotion': 'promoted',
        'appraisal': 'performance_rating',
        'compensation': 'salary_increase',
        'retention': 'retained'
    }
    return outcomeKeys[decisionType] || 'outcome'
}

function convertToNumeric(value: any): number | null {
    if (typeof value === 'number') return value
    if (typeof value === 'boolean') return value ? 1.0 : 0.0
    if (typeof value === 'string') {
        const lower = value.toLowerCase()
        if (['yes', 'selected', 'promoted', 'true'].includes(lower)) return 1.0
        if (['no', 'rejected', 'not promoted', 'false'].includes(lower)) return 0.0
    }
    return null
}
