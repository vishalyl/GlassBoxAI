import { supabase } from './supabase';
import { calculateBonusDistribution, type BonusAllocation } from './bonus-api';
import { calculatePromotionRecommendations, type PromotionCandidate } from './decision-api';

export interface AuditResult {
    employee_id: string;
    employee_name: string;
    department_name?: string;

    // Comparison
    manager_value: number; // Amount or 1/0
    ai_value: number; // Amount or Score/Rank

    variance: number; // % difference
    is_flagged: boolean;
    reason?: string;
}

export interface ManagerInput {
    employee_id: string;
    value: number; // Bonus Amount or 1 (Promoted)/0 (Not)
}

/**
 * Audit a Bonus Decision
 */
export async function auditBonusDecision(
    totalPool: number,
    managerInputs: ManagerInput[],
    departmentIds?: string[]
): Promise<AuditResult[]> {
    // 1. Run AI Calculation (Standard Merit Model)
    // We assume the pool is what the manager distributed (or specified)
    const aiAllocations = await calculateBonusDistribution({
        totalAmount: totalPool,
        eligibleDepartments: departmentIds,
        // We perform the calc for ALL eligible employees in these depts to get specific ai amounts
    });

    // 2. Compare
    const results: AuditResult[] = [];

    // Map AI results for easy lookup
    const aiMap = new Map<string, BonusAllocation>();
    aiAllocations.forEach(a => aiMap.set(a.employee_id, a));

    for (const input of managerInputs) {
        const aiRec = aiMap.get(input.employee_id);
        const aiAmount = aiRec ? aiRec.bonus_amount : 0;
        const managerAmount = input.value;

        let variance = 0;
        let isFlagged = false;
        let reason = '';

        if (aiAmount === 0 && managerAmount === 0) {
            variance = 0;
        } else if (aiAmount === 0) {
            variance = 100; // Manager gave money to someone AI gave 0
            isFlagged = true;
            reason = 'AI recommended $0, Manager gave bonus';
        } else {
            variance = Math.abs(managerAmount - aiAmount) / aiAmount * 100;
            if (variance > 20) { // 20% threshold
                isFlagged = true;
                reason = `Significant deviation (${variance.toFixed(0)}%)`;
            }
        }

        results.push({
            employee_id: input.employee_id,
            employee_name: aiRec?.employee_name || 'Unknown',
            department_name: undefined, // BonusAllocation missing dept name
            manager_value: managerAmount,
            ai_value: aiAmount,
            variance: Number(variance.toFixed(1)),
            is_flagged: isFlagged,
            reason
        });
    }

    return results.sort((a, b) => b.variance - a.variance);
}

/**
 * Audit a Promotion Decision
 */
export async function auditPromotionDecision(
    managerInputs: ManagerInput[], // value 1 = promoted, 0 = not
    departmentIds?: string[]
): Promise<AuditResult[]> {
    // 1. Determine implied slots (how many people did manager promote?)
    const promotedCount = managerInputs.filter(i => i.value === 1).length;
    if (promotedCount === 0) return [];

    // 2. Run AI Calculation
    const aiCandidates = await calculatePromotionRecommendations({
        totalSlots: promotedCount,
        eligibleDepartments: departmentIds
    });

    // 3. Compare
    // AI thinks top N are recommended.
    const results: AuditResult[] = [];

    // Create a map of AI Ranks
    const aiRankMap = new Map<string, PromotionCandidate>();
    aiCandidates.forEach(c => aiRankMap.set(c.employee_id, c));

    for (const input of managerInputs) {
        const aiRec = aiRankMap.get(input.employee_id);
        if (!aiRec) continue; // Should not happen if inputs match eligibility

        const wasPromotedByManager = input.value === 1;
        const wasRecommendedByAI = aiRec.recommended;
        // Note: aiRec.recommended is based on the logic we passed (totalSlots = promotedCount)

        let isFlagged = false;
        let reason = '';
        let variance = 0;

        if (wasPromotedByManager && !wasRecommendedByAI) {
            isFlagged = true;
            reason = `Manager promoted, but AI ranked #${aiRec.rank}`;
            variance = 100; // high severity
        } else if (!wasPromotedByManager && wasRecommendedByAI) {
            isFlagged = true;
            reason = `AI recommended (Rank #${aiRec.rank}) but Manager ignored`;
            variance = 50; // medium severity
        }

        results.push({
            employee_id: input.employee_id,
            employee_name: aiRec.employee_name,
            department_name: aiRec.department_name,
            manager_value: wasPromotedByManager ? 1 : 0,
            ai_value: aiRec.rank, // We display Rank as the AI value context
            variance: variance,
            is_flagged: isFlagged,
            reason
        });
    }

    // Sort by flag severity
    return results.sort((a, b) => (b.is_flagged ? 1 : 0) - (a.is_flagged ? 1 : 0));
}

export async function saveAuditRecord(
    name: string,
    type: 'BONUS' | 'PROMOTION',
    deptId: string | undefined, // single dept context or null
    results: AuditResult[]
) {
    const totalAudited = results.length;
    const flaggedCount = results.filter(r => r.is_flagged).length;
    const agreementScore = totalAudited > 0 ? ((totalAudited - flaggedCount) / totalAudited) * 100 : 0;

    const { data: record, error: recError } = await supabase
        .from('audit_records')
        .insert({
            name,
            decision_type: type,
            department_id: deptId || null,
            total_employees_audited: totalAudited,
            agreement_score: agreementScore,
            status: 'completed'
        })
        .select()
        .single();

    if (recError) throw recError;

    const entries = results.map(r => ({
        audit_id: record.id,
        employee_id: r.employee_id,
        manager_decision_value: r.manager_value,
        // manager_decision_text: r.reason, // REMOVED: Don't overwrite decision text with reason
        ai_recommendation_value: r.ai_value,
        variance_score: r.variance,
        is_flagged: r.is_flagged,
        explanation: r.reason
    }));

    const { error: entryError } = await supabase.from('audit_entries').insert(entries);
    if (entryError) throw entryError;

    return record;
}

export async function getRecentAuditRecords(limit = 5) {
    const { data, error } = await supabase
        .from('audit_records')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
    if (error) throw error;
    return data;
}

export async function getAuditRecord(id: string) {
    const { data: record, error: recError } = await supabase
        .from('audit_records')
        .select('*, department:departments(name)')
        .eq('id', id)
        .single();
    if (recError) throw recError;

    const { data: entries, error: entError } = await supabase
        .from('audit_entries')
        .select('*, employee:employees(name)')
        .eq('audit_id', id);
    if (entError) throw entError;

    return { ...record, entries };
}

export async function deleteAuditRecord(id: string) {
    const { error } = await supabase.from('audit_records').delete().eq('id', id);
    if (error) throw error;
}

export async function updateAuditEntryFlag(id: string, isFlagged: boolean) {
    const { error } = await supabase
        .from('audit_entries')
        .update({ is_flagged: isFlagged })
        .eq('id', id);
    if (error) throw error;
}
