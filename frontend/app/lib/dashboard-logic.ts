import { supabase } from './supabase';
import { DashboardAnalytics } from './api';

export async function getDashboardAnalytics(): Promise<DashboardAnalytics> {
    // 1. Fetch Counts
    const { count: bonusCount } = await supabase.from('bonus_distributions').select('*', { count: 'exact', head: true });
    const { count: promoCount } = await supabase.from('promotion_decisions').select('*', { count: 'exact', head: true });
    const { count: auditCount } = await supabase.from('audit_records').select('*', { count: 'exact', head: true });

    const totalDecisions = (bonusCount || 0) + (promoCount || 0) + (auditCount || 0);

    // 2. Fetch Audit Stats for Risk
    // We calculate risk based on average variance in audit entries
    const { data: entries } = await supabase
        .from('audit_entries')
        .select('variance, is_flagged');

    let highRiskCount = 0;
    let totalRisk = 0;
    let count = 0;

    if (entries) {
        highRiskCount = entries.filter(e => e.is_flagged).length;
        totalRisk = entries.reduce((sum, e) => sum + (e.variance || 0), 0);
        count = entries.length;
    }

    const avgRiskScore = count > 0 ? (totalRisk / count) : 0;

    return {
        total_decisions: totalDecisions,
        pending_decisions: count, // We'll display this as "Total Employees Audited"
        analyzed_decisions: auditCount || 0,
        high_risk_decisions: highRiskCount, // Flagged allocations
        avg_risk_score: Number(avgRiskScore.toFixed(2)), // Avg Variance
        decisions_by_type: {
            'Bonus': bonusCount || 0,
            'Promotion': promoCount || 0,
            'Audit': auditCount || 0
        }
    };
}
