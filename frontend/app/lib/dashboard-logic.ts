import { supabase } from './supabase';
import { DashboardAnalytics } from './api';

export async function getDashboardAnalytics(): Promise<DashboardAnalytics> {
    // 1. Fetch Decision Counts
    const { count: bonusCount } = await supabase.from('bonus_distributions').select('*', { count: 'exact', head: true });
    const { count: promoCount } = await supabase.from('promotion_decisions').select('*', { count: 'exact', head: true });
    const { count: auditCount } = await supabase.from('audit_records').select('*', { count: 'exact', head: true });

    const totalDecisions = (bonusCount || 0) + (promoCount || 0) + (auditCount || 0);

    // 2. Fetch Employee and Project Counts
    const { count: employeeCount } = await supabase.from('employees').select('*', { count: 'exact', head: true });
    const { count: projectCount } = await supabase.from('projects').select('*', { count: 'exact', head: true });

    // 3. Fetch Audit Stats for Risk
    const { data: entries } = await supabase
        .from('audit_entries')
        .select('variance_score, is_flagged');

    let highRiskCount = 0;
    let totalRisk = 0;
    let count = 0;

    if (entries) {
        highRiskCount = entries.filter(e => e.is_flagged).length;
        totalRisk = entries.reduce((sum, e) => sum + (e.variance_score || 0), 0);
        count = entries.length;
    }

    const avgRiskScore = count > 0 ? (totalRisk / count) : 0;

    return {
        total_decisions: totalDecisions,
        pending_decisions: count, // Total Employees Audited
        analyzed_decisions: auditCount || 0,
        high_risk_decisions: highRiskCount, // Flagged allocations
        avg_risk_score: Number(avgRiskScore.toFixed(2)),
        decisions_by_type: {
            'Bonus': bonusCount || 0,
            'Promotion': promoCount || 0,
            'Audit': auditCount || 0
        },
        active_employees: employeeCount || 0,
        total_projects: projectCount || 0
    };
}

// Get all flagged decisions grouped by audit
export async function getFlaggedDecisionsByAudit(): Promise<any[]> {
    const { data: audits, error } = await supabase
        .from('audit_records')
        .select(`
            id,
            name,
            decision_type,
            created_at,
            department:departments(name),
            entries:audit_entries(
                id,
                employee_id,
                manager_decision_value,
                ai_recommendation_value,
                variance_score,
                is_flagged,
                explanation,
                employee:employees(name)
            )
        `)
        .order('created_at', { ascending: false });

    if (error) throw error;

    // Filter to only include audits with flagged entries
    return (audits || [])
        .map(audit => ({
            ...audit,
            entries: (audit.entries || []).filter((e: any) => e.is_flagged)
        }))
        .filter(audit => audit.entries.length > 0);
}
