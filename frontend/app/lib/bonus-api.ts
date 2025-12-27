import { supabase } from './supabase'
import type { Employee, Project, Task, ManagerRating, PeerRating, KPI, BonusDistribution, BonusAllocation } from './api'

// Re-export for convenience
export type { BonusAllocation, BonusDistribution }

// ... (existing code above) ...

// ====================================================================
// BONUS DISTRIBUTION API
// ====================================================================

/**
 * Calculate contribution percentage for a single employee across all projects
 */
async function calculateEmployeeContribution(
    employee: Employee,
    projects: Project[],
    allTasks: Task[],
    allRatings: {
        manager: ManagerRating[]
        peer: PeerRating[]
        kpi: KPI[]
    }
): Promise<{
    totalContribution: number
    projectBreakdown: any[] // Fixed: avoid indexing optional type
}> {
    let totalContribution = 0
    const projectBreakdown: any[] = []

    // Normalize project weights to sum to 100
    const totalProjectWeight = projects.reduce((sum, p) => sum + p.weightage, 0)
    if (totalProjectWeight === 0) return { totalContribution: 0, projectBreakdown: [] }

    for (const project of projects) {
        const normalizedProjectWeight = (project.weightage / totalProjectWeight) * 100

        // Get all tasks for this project
        const projectTasks = allTasks.filter(t => t.project_id === project.id)

        // Get employee's tasks on this project
        const employeeTasks = projectTasks.filter(t =>
            t.assigned_to_id === employee.id ||
            t.assignees?.some(a => a.id === employee.id)
        )

        if (employeeTasks.length === 0) continue // Skip if employee not on project

        // Calculate task-weighted contribution
        const projectTaskTotal = projectTasks.reduce((sum, t) => sum + (t.weightage || 1), 0)
        const employeeTaskWeight = employeeTasks.reduce((sum, t) => sum + (t.weightage || 1), 0)
        const taskRatio = projectTaskTotal > 0 ? employeeTaskWeight / projectTaskTotal : 0

        // Get performance score for this employee on this project
        const mgr = allRatings.manager.find(r =>
            r.project_id === project.id && r.employee_id === employee.id
        )
        const peer = allRatings.peer.find(r =>
            r.project_id === project.id && r.employee_id === employee.id
        )
        const kpis = allRatings.kpi.filter(k =>
            k.project_id === project.id && k.employee_id === employee.id
        )

        // Calculate performance score (0-10 scale)
        const mgrAvg = mgr
            ? ((mgr.volume_score + mgr.quality_score + mgr.speed_score) / 3)
            : 3 // Default to mid-range if no rating
        const peerAvg = peer
            ? ((peer.volume_score + peer.quality_score + peer.speed_score) / 3)
            : 3
        const kpiAvg = kpis.length > 0
            ? kpis.reduce((sum, k) => sum + k.metric_value, 0) / kpis.length
            : 3

        const performanceScore = (mgrAvg * 0.4 + peerAvg * 0.3 + kpiAvg * 0.3) * 2 // Scale to 10
        const performanceMultiplier = performanceScore / 10 // Normalize to 0-1

        // Calculate contribution for this project
        const projectContribution = normalizedProjectWeight * taskRatio * performanceMultiplier
        totalContribution += projectContribution

        projectBreakdown.push({
            project_id: project.id,
            project_name: project.name,
            project_weight: project.weightage,
            normalized_weight: normalizedProjectWeight,
            employee_task_weight: employeeTaskWeight,
            task_ratio: taskRatio,
            performance_score: performanceScore,
            project_contribution: projectContribution
        })
    }

    return { totalContribution, projectBreakdown }
}

/**
 * Calculate bonus distribution for all eligible employees
 */
export async function calculateBonusDistribution(params: {
    totalAmount: number
    dateRangeStart?: string
    dateRangeEnd?: string
    eligibleDepartments?: string[]
    eligibleEmployees?: string[]
}): Promise<BonusAllocation[]> {
    try {
        // 1. Fetch all projects (filtered by date if provided)
        let projectQuery = supabase.from('projects').select('*')

        if (params.dateRangeStart) {
            projectQuery = projectQuery.gte('start_date', params.dateRangeStart)
        }
        if (params.dateRangeEnd) {
            projectQuery = projectQuery.lte('end_date', params.dateRangeEnd)
        }

        const { data: projects, error: projError } = await projectQuery
        if (projError) throw projError
        if (!projects || projects.length === 0) {
            return []
        }

        // 2. Fetch all tasks for these projects (with assignees)
        const projectIds = projects.map(p => p.id)
        const [
            { data: tasks, error: tasksError },
            { data: taskAssignments, error: assignError }
        ] = await Promise.all([
            supabase.from('tasks').select('*').in('project_id', projectIds),
            supabase.from('task_assignees').select('task_id, employee_id').in('task_id',
                (await supabase.from('tasks').select('id').in('project_id', projectIds)).data?.map(t => t.id) || []
            )
        ])

        if (tasksError) throw tasksError

        // Enrich tasks with assignees
        const tasksWithAssignees = (tasks || []).map(task => ({
            ...task,
            assignees: taskAssignments?.filter(ta => ta.task_id === task.id).map(ta => ({ id: ta.employee_id })) || []
        }))

        // 3. Fetch all ratings for these projects
        const [
            { data: managerRatings },
            { data: peerRatings },
            { data: kpis }
        ] = await Promise.all([
            supabase.from('manager_ratings').select('*').in('project_id', projectIds),
            supabase.from('peer_ratings').select('*').in('project_id', projectIds),
            supabase.from('kpis').select('*').in('project_id', projectIds)
        ])

        // 4. Get all employees (filtered if specified)
        let employeeQuery = supabase.from('employees').select('*').eq('status', 'active')

        if (params.eligibleDepartments && params.eligibleDepartments.length > 0) {
            employeeQuery = employeeQuery.in('department_id', params.eligibleDepartments)
        }
        if (params.eligibleEmployees && params.eligibleEmployees.length > 0) {
            employeeQuery = employeeQuery.in('id', params.eligibleEmployees)
        }

        const { data: employees, error: empError } = await employeeQuery
        if (empError) throw empError
        if (!employees || employees.length === 0) {
            return []
        }

        // 5. Calculate contribution for each employee
        const contributionResults = await Promise.all(
            employees.map(async emp => {
                const { totalContribution, projectBreakdown } = await calculateEmployeeContribution(
                    emp,
                    projects,
                    tasksWithAssignees || [],
                    {
                        manager: managerRatings || [],
                        peer: peerRatings || [],
                        kpi: kpis || []
                    }
                )

                return {
                    employee: emp,
                    totalContribution,
                    projectBreakdown
                }
            })
        )

        // 6. Normalize contributions to sum to 100%
        const totalRawContribution = contributionResults.reduce((sum, r) => sum + r.totalContribution, 0)

        if (totalRawContribution === 0) {
            // No contributions - equal distribution
            const equalShare = 100 / employees.length
            const equalAmount = params.totalAmount / employees.length

            return employees.map(emp => ({
                distribution_id: '', // Will be set when saving
                employee_id: emp.id,
                employee_name: emp.name,
                contribution_percentage: equalShare,
                bonus_amount: equalAmount,
                calculation_details: {
                    projects: [],
                    total_contribution_score: 0
                }
            }))
        }

        // 7. Create allocations
        const allocations: BonusAllocation[] = contributionResults.map(result => {
            const normalizedPercentage = (result.totalContribution / totalRawContribution) * 100
            const bonusAmount = (normalizedPercentage / 100) * params.totalAmount

            return {
                distribution_id: '', // Will be set when saving
                employee_id: result.employee.id,
                employee_name: result.employee.name,
                contribution_percentage: Number(normalizedPercentage.toFixed(2)),
                bonus_amount: Number(bonusAmount.toFixed(2)),
                calculation_details: {
                    projects: result.projectBreakdown,
                    total_contribution_score: result.totalContribution
                }
            }
        })

        return allocations.sort((a, b) => b.contribution_percentage - a.contribution_percentage)

    } catch (error) {
        console.error('Bonus calculation error:', error)
        throw error
    }
}

/**
 * Create a new bonus distribution
 */
export async function createBonusDistribution(
    distribution: Omit<BonusDistribution, 'id' | 'created_at' | 'updated_at'>,
    allocations: BonusAllocation[]
): Promise<{ distribution: BonusDistribution; allocations: BonusAllocation[] }> {
    // Get the current authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
        throw new Error('Not authenticated - please sign in to save bonus distributions')
    }

    // 1. Create distribution with created_by field
    const { data: distData, error: distError } = await supabase
        .from('bonus_distributions')
        .insert({
            ...distribution,
            created_by: user.id
        })
        .select()
        .single()

    if (distError) throw distError

    // 2. Create allocations with distribution_id
    // properties unrelated to schema (like employee_name) must be excluded
    const allocationsPayload = allocations.map(a => ({
        distribution_id: distData.id,
        employee_id: a.employee_id,
        contribution_percentage: a.contribution_percentage,
        bonus_amount: a.bonus_amount,
        calculation_details: a.calculation_details
    }))

    const { data: allocData, error: allocError } = await supabase
        .from('bonus_allocations')
        .insert(allocationsPayload)
        .select()

    if (allocError) throw allocError

    return {
        distribution: distData,
        allocations: allocData || []
    }
}

/**
 * Get all bonus distributions
 */
export async function getBonusDistributions(): Promise<BonusDistribution[]> {
    const { data, error } = await supabase
        .from('bonus_distributions')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
}

/**
 * Get a single bonus distribution with allocations
 */
export async function getBonusDistribution(id: string): Promise<{
    distribution: BonusDistribution
    allocations: BonusAllocation[]
}> {
    const [
        { data: distribution, error: distError },
        { data: allocationsData, error: allocError }
    ] = await Promise.all([
        supabase
            .from('bonus_distributions')
            .select('*')
            .eq('id', id)
            .single(),
        supabase
            .from('bonus_allocations')
            .select('*, employees(name)')
            .eq('distribution_id', id)
    ])

    if (distError) throw distError
    if (allocError) throw allocError
    if (!distribution) throw new Error('Distribution not found')

    // Map allocations to include employee_name from relation
    const allocations: BonusAllocation[] = (allocationsData || []).map((a: any) => ({
        ...a,
        employee_name: a.employees?.name || 'Unknown',
        employees: undefined
    }))

    return {
        distribution,
        allocations
    }
}

/**
 * Update bonus distribution status
 */
export async function updateBonusDistributionStatus(
    id: string,
    status: BonusDistribution['status']
): Promise<void> {
    const { error } = await supabase
        .from('bonus_distributions')
        .update({ status })
        .eq('id', id)

    if (error) throw error
}

export async function getRecentBonusDistributions(limit = 5) {
    const { data, error } = await supabase
        .from('bonus_distributions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)
    if (error) throw error
    return data || []
}

export async function deleteBonusDistribution(id: string) {
    const { error } = await supabase.from('bonus_distributions').delete().eq('id', id);
    if (error) throw error;
}
