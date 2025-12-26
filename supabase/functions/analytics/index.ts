import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ====================================================================
// ANALYTICS EDGE FUNCTION
// ====================================================================
// Provides dashboard analytics and reporting
// ====================================================================

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

        const url = new URL(req.url)
        const endpoint = url.searchParams.get('endpoint') || 'dashboard'

        let result

        switch (endpoint) {
            case 'dashboard':
                result = await getDashboardAnalytics(supabaseClient, user.id)
                break
            case 'bias-trends':
                const days = parseInt(url.searchParams.get('days') || '30')
                result = await getBiasTrends(supabaseClient, user.id, days)
                break
            case 'fairness-metrics':
                result = await getFairnessMetrics(supabaseClient, user.id)
                break
            default:
                throw new Error('Invalid endpoint')
        }

        return new Response(JSON.stringify(result), {
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

async function getDashboardAnalytics(supabase: any, userId: string) {
    const { data, error } = await supabase
        .rpc('get_dashboard_analytics', { user_uuid: userId })

    if (error) throw error

    return data
}

async function getBiasTrends(supabase: any, userId: string, days: number) {
    const { data, error } = await supabase
        .rpc('get_bias_trends', { user_uuid: userId, days_back: days })

    if (error) throw error

    return data
}

async function getFairnessMetrics(supabase: any, userId: string) {
    // Get all decisions with bias analysis
    const { data: decisions, error } = await supabase
        .from('decisions')
        .select(`
      id,
      decision_type,
      created_at,
      bias_analysis (
        risk_score,
        risk_level,
        fairness_metrics
      )
    `)
        .eq('created_by', userId)
        .not('bias_analysis', 'is', null)

    if (error) throw error

    // Calculate aggregate fairness metrics
    const metrics = {
        total_analyzed: decisions.length,
        avg_risk_score: 0,
        risk_distribution: {
            low: 0,
            moderate: 0,
            high: 0
        },
        by_decision_type: {} as any
    }

    if (decisions.length > 0) {
        metrics.avg_risk_score = decisions.reduce((sum: number, d: any) =>
            sum + (d.bias_analysis?.risk_score || 0), 0
        ) / decisions.length

        decisions.forEach((d: any) => {
            const riskLevel = d.bias_analysis?.risk_level || 'unknown'
            if (riskLevel in metrics.risk_distribution) {
                metrics.risk_distribution[riskLevel as keyof typeof metrics.risk_distribution]++
            }

            const type = d.decision_type
            if (!metrics.by_decision_type[type]) {
                metrics.by_decision_type[type] = {
                    count: 0,
                    avg_risk: 0,
                    total_risk: 0
                }
            }
            metrics.by_decision_type[type].count++
            metrics.by_decision_type[type].total_risk += d.bias_analysis?.risk_score || 0
        })

        // Calculate averages by type
        for (const type in metrics.by_decision_type) {
            const typeData = metrics.by_decision_type[type]
            typeData.avg_risk = typeData.count > 0 ? typeData.total_risk / typeData.count : 0
            delete typeData.total_risk
        }
    }

    return metrics
}
