import { supabase } from './supabase';
import type { Employee, Project, Task, ManagerRating, PeerRating, KPI } from './api';

export interface PromotionCandidate {
    employee_id: string;
    employee_name: string;
    department_name?: string;
    current_role?: string;
    total_score: number;
    rank: number;
    recommended: boolean;
    calculation_details: {
        projects: {
            project_id: string;
            project_name: string;
            performance_score: number;
            contribution_score: number;
            task_ratio: number;
        }[];
    };
}

export interface PromotionDecision {
    id: string;
    name: string;
    total_slots: number;
    status: 'draft' | 'finalized';
    created_at: string;
}

/**
 * Calculate performance score for a single employee (Shared Logic)
 * returns a raw score based on Project Weight * Task Vol * Performance Ratings
 */
async function calculatePerformanceScore(
    employee: Employee,
    projects: Project[],
    allTasks: Task[],
    allRatings: {
        manager: ManagerRating[]
        peer: PeerRating[]
        kpi: KPI[]
    }
): Promise<{
    totalScore: number;
    projectBreakdown: PromotionCandidate['calculation_details']['projects'];
}> {
    let totalScore = 0;
    const projectBreakdown: any[] = [];

    // Normalize project weights
    const totalProjectWeight = projects.reduce((sum, p) => sum + p.weightage, 0);
    if (totalProjectWeight === 0) return { totalScore: 0, projectBreakdown: [] };

    for (const project of projects) {
        const normalizedProjectWeight = (project.weightage / totalProjectWeight) * 100;

        // Get tasks
        const projectTasks = allTasks.filter(t => t.project_id === project.id);
        const employeeTasks = projectTasks.filter(t =>
            t.assigned_to_id === employee.id ||
            t.assignees?.some(a => a.id === employee.id)
        );

        if (employeeTasks.length === 0) continue;

        // Task Ratio
        const projectTaskTotal = projectTasks.reduce((sum, t) => sum + (t.weightage || 1), 0);
        const employeeTaskWeight = employeeTasks.reduce((sum, t) => sum + (t.weightage || 1), 0);
        const taskRatio = projectTaskTotal > 0 ? employeeTaskWeight / projectTaskTotal : 0;

        // Ratings
        const mgr = allRatings.manager.find(r => r.project_id === project.id && r.employee_id === employee.id);
        const peer = allRatings.peer.find(r => r.project_id === project.id && r.employee_id === employee.id);
        const kpis = allRatings.kpi.filter(k => k.project_id === project.id && k.employee_id === employee.id);

        const mgrAvg = mgr ? ((mgr.volume_score + mgr.quality_score + mgr.speed_score) / 3) : 3;
        const peerAvg = peer ? ((peer.volume_score + peer.quality_score + peer.speed_score) / 3) : 3;
        const kpiAvg = kpis.length > 0 ? kpis.reduce((sum, k) => sum + k.metric_value, 0) / kpis.length : 3;

        // Core Formula: Performance (0-10)
        const performanceScore = (mgrAvg * 0.4 + peerAvg * 0.3 + kpiAvg * 0.3) * 2;
        const performanceMultiplier = performanceScore / 10;

        // Contribution Score for this project
        const contribution = normalizedProjectWeight * taskRatio * performanceMultiplier;
        totalScore += contribution;

        projectBreakdown.push({
            project_id: project.id,
            project_name: project.name,
            performance_score: performanceScore,
            contribution_score: contribution,
            task_ratio: taskRatio
        });
    }

    return { totalScore, projectBreakdown };
}

/**
 * Calculate Promotion Rankings
 */
export async function calculatePromotionRecommendations(params: {
    totalSlots: number;
    eligibleDepartments?: string[];
    eligibleEmployees?: string[];
}): Promise<PromotionCandidate[]> {
    try {
        // 1. Fetch Projects
        const { data: projects, error: projError } = await supabase.from('projects').select('*');
        if (projError) throw projError;
        if (!projects || projects.length === 0) return [];

        // 2. Fetch Tasks with Assignees (Fixing relationship issue)
        const projectIds = projects.map(p => p.id);
        const [
            { data: tasks, error: tasksError },
            { data: taskAssignments, error: assignError }
        ] = await Promise.all([
            supabase.from('tasks').select('*').in('project_id', projectIds),
            supabase.from('task_assignees').select('task_id, employee_id').in('task_id',
                (await supabase.from('tasks').select('id').in('project_id', projectIds)).data?.map(t => t.id) || []
            )
        ]);
        if (tasksError) throw tasksError;

        const tasksWithAssignees = (tasks || []).map(task => ({
            ...task,
            assignees: taskAssignments?.filter(ta => ta.task_id === task.id).map(ta => ({ id: ta.employee_id })) || []
        }));

        // 3. Fetch Ratings
        const [
            { data: managerRatings },
            { data: peerRatings },
            { data: kpis }
        ] = await Promise.all([
            supabase.from('manager_ratings').select('*').in('project_id', projectIds),
            supabase.from('peer_ratings').select('*').in('project_id', projectIds),
            supabase.from('kpis').select('*').in('project_id', projectIds)
        ]);

        // 4. Fetch Employees
        let employeeQuery = supabase.from('employees').select('*, department:departments(name)');
        if (params.eligibleDepartments?.length) {
            employeeQuery = employeeQuery.in('department_id', params.eligibleDepartments);
        }
        if (params.eligibleEmployees?.length) {
            employeeQuery = employeeQuery.in('id', params.eligibleEmployees);
        }
        const { data: employees, error: empError } = await employeeQuery;
        if (empError) throw empError;
        if (!employees || employees.length === 0) return [];

        // 5. Calculate Scores
        const results = await Promise.all(employees.map(async emp => {
            const { totalScore, projectBreakdown } = await calculatePerformanceScore(
                emp,
                projects,
                tasksWithAssignees,
                {
                    manager: managerRatings || [],
                    peer: peerRatings || [],
                    kpi: kpis || []
                }
            );
            return { emp, totalScore, projectBreakdown };
        }));

        // 6. Rank and Sort
        const sortedResults = results.sort((a, b) => b.totalScore - a.totalScore);

        return sortedResults.map((res, index) => ({
            employee_id: res.emp.id,
            employee_name: res.emp.name,
            department_name: res.emp.department?.name,
            current_role: res.emp.role_title,
            total_score: Number(res.totalScore.toFixed(2)),
            rank: index + 1,
            recommended: index < params.totalSlots,
            calculation_details: {
                projects: res.projectBreakdown
            }
        }));

    } catch (err) {
        console.error('Promotion calculation error:', err);
        throw err;
    }
}

/**
 * Save Promotion Decision
 */
export async function savePromotionDecision(
    name: string,
    totalSlots: number,
    candidates: PromotionCandidate[]
) {
    // 1. Create Decision Record
    const { data: decision, error: decError } = await supabase
        .from('promotion_decisions')
        .insert({
            name,
            total_slots: totalSlots,
            status: 'calculated'
        })
        .select()
        .single();
    if (decError) throw decError;

    // 2. Save Candidates
    const rows = candidates.map(c => ({
        decision_id: decision.id,
        employee_id: c.employee_id,
        score: c.total_score,
        rank: c.rank,
        is_recommended: c.recommended,
        calculation_details: c.calculation_details
    }));

    const { error: candError } = await supabase
        .from('promotion_candidates')
        .insert(rows);
    if (candError) throw candError;

    return decision;
}

export async function getRecentPromotionDecisions(limit = 5) {
    const { data, error } = await supabase
        .from('promotion_decisions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
    if (error) throw error;
    return data;
}

export async function getPromotionDecision(id: string) {
    const { data: decision, error: decError } = await supabase
        .from('promotion_decisions')
        .select('*')
        .eq('id', id)
        .single();
    if (decError) throw decError;

    const { data: candidates, error: candError } = await supabase
        .from('promotion_candidates')
        .select('*, employee:employees(name, role_title, department:departments(name))')
        .eq('decision_id', id)
        .order('rank', { ascending: true });
    if (candError) throw candError;

    return { ...decision, candidates };
}

export async function deletePromotionDecision(id: string) {
    const { error } = await supabase.from('promotion_decisions').delete().eq('id', id);
    if (error) throw error;
}
