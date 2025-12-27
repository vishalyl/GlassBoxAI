import { supabase } from './supabase'

// ====================================================================
// TYPE DEFINITIONS
// ====================================================================

export interface Decision {
    id: string
    name?: string
    description?: string
    decision_type: string
    employee_data: any
    comparable_cohort: any[]
    status: string
    created_by?: string
    created_at: string
    finalized_at?: string
    organization_id?: string
}

export interface BiasAnalysis {
    id: string
    decision_id: string
    risk_score: number
    risk_level: 'low' | 'moderate' | 'high'
    detected_patterns: any[]
    fairness_metrics: any
    comparable_outcomes: any
    created_at: string
}

export interface Explanation {
    id: string
    decision_id: string
    justification: string
    key_factors: any[]
    alternatives: string[]
    gemini_prompt?: string
    gemini_response?: string
    created_at: string
}

export interface DashboardAnalytics {
    total_decisions: number
    pending_decisions: number
    analyzed_decisions: number
    high_risk_decisions: number
    avg_risk_score: number
    decisions_by_type: Record<string, number>
    active_employees: number
    total_projects: number
}

// ====================================================================
// PERFORMANCE EVALUATION TYPES
// ====================================================================

export interface Department {
    id: string
    name: string  // Allow any department name
    description?: string
    created_at: string
    updated_at: string
}

export interface Employee {
    id: string
    user_id?: string
    name: string
    email?: string
    role_title: string
    department_id?: string
    reports_to_id?: string
    is_department_manager?: boolean
    status?: 'active' | 'on_leave' | 'terminated'
    hire_date?: string
    terminated_at?: string
    termination_reason?: string
    created_by?: string
    created_at: string
    updated_at: string
}

export interface RoleHistory {
    id: string
    employee_id: string
    change_type: 'hired' | 'promoted' | 'transferred' | 'role_change' | 'terminated' | 'rehired'
    old_role_title?: string
    new_role_title?: string
    old_department_id?: string
    new_department_id?: string
    old_reports_to_id?: string
    new_reports_to_id?: string
    was_manager?: boolean
    is_manager?: boolean
    reason?: string
    effective_date?: string
    created_by?: string
    created_at: string
}

export interface DepartmentMetrics {
    id: string
    name: string
    description?: string
    employee_count: number
    avg_tenure_months: number
    manager?: Employee
}

export interface Project {
    id: string
    name: string
    department_id?: string
    department?: {
        id: string
        name: string
    }
    weightage: number
    start_date: string
    end_date: string
    status: 'planning' | 'active' | 'completed' | 'on_hold'
    description?: string
    created_by: string
    created_at: string
    updated_at: string
}

export interface Task {
    id: string
    project_id: string
    title: string
    description?: string
    priority: 'High' | 'Medium' | 'Low'
    weightage: number
    complexity: number
    estimated_hours?: number
    actual_hours?: number
    assigned_to_id?: string
    assigned_to_employee?: Employee
    assignees?: Employee[]
    status: 'todo' | 'in_progress' | 'completed'
    created_at: string
}

export interface ManagerRating {
    id?: string
    project_id: string
    employee_id: string
    rated_by_id: string
    volume_score: number
    quality_score: number
    speed_score: number
    complexity_score: number
    comments?: string
    created_at?: string
}

export interface PeerRating {
    id?: string
    project_id: string
    employee_id: string
    rated_by_id: string
    volume_score: number
    quality_score: number
    speed_score: number
    complexity_score: number
    created_at?: string
}

export interface KPI {
    id?: string
    project_id: string
    employee_id: string
    metric_category: string // 'Volume', 'Quality', 'Speed', 'Complexity'
    metric_name: string
    metric_value: number
    created_at?: string
}

export interface BonusDistribution {
    id?: string
    name: string
    total_amount: number
    date_range_start?: string
    date_range_end?: string
    eligible_departments?: string[]
    eligible_employees?: string[]
    status: 'draft' | 'calculated' | 'approved' | 'paid'
    created_by?: string
    created_at?: string
    updated_at?: string
}

export interface BonusAllocation {
    id?: string
    distribution_id: string
    employee_id: string
    employee_name?: string
    contribution_percentage: number
    bonus_amount: number
    calculation_details?: {
        projects: {
            project_id: string
            project_name: string
            project_weight: number
            normalized_weight: number
            employee_task_weight: number
            task_ratio: number
            performance_score: number
            project_contribution: number
        }[]
        total_contribution_score: number
    }
    created_at?: string
}

// ====================================================================
// AUTHENTICATION
// ====================================================================

export async function signUp(email: string, password: string, fullName: string) {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: fullName,
                role: 'hr_manager'
            }
        }
    })

    if (error) throw error
    return data
}

export async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    })

    if (error) throw error
    return data
}

export async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
}

export async function getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) throw error
    return user
}

// ====================================================================
// DECISIONS API
// ====================================================================

export async function createDecision(
    decisionType: Decision['decision_type'],
    employeeData: any,
    comparableCohort: any[] = []
): Promise<Decision> {
    const user = await getCurrentUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
        .from('decisions')
        .insert({
            decision_type: decisionType,
            employee_data: employeeData,
            comparable_cohort: comparableCohort,
            created_by: user.id
        })
        .select()
        .single()

    if (error) throw error
    return data
}

export async function getDecisions(
    filters?: {
        decision_type?: string
        status?: string
        limit?: number
        offset?: number
    }
): Promise<Decision[]> {
    const user = await getCurrentUser()
    if (!user) throw new Error('Not authenticated')

    let query = supabase
        .from('decisions')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })

    if (filters?.decision_type) {
        query = query.eq('decision_type', filters.decision_type)
    }

    if (filters?.status) {
        query = query.eq('status', filters.status)
    }

    if (filters?.limit) {
        query = query.limit(filters.limit)
    }

    if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1)
    }

    const { data, error } = await query

    if (error) throw error
    return data
}

export async function getDecision(decisionId: string): Promise<{
    decision: Decision
    bias_analysis?: BiasAnalysis
    explanation?: Explanation
}> {
    const { data: decision, error: decisionError } = await supabase
        .from('decisions')
        .select('*')
        .eq('id', decisionId)
        .single()

    if (decisionError) throw decisionError

    const { data: biasAnalysis } = await supabase
        .from('bias_analysis')
        .select('*')
        .eq('decision_id', decisionId)
        .single()

    const { data: explanation } = await supabase
        .from('explanations')
        .select('*')
        .eq('decision_id', decisionId)
        .single()

    return {
        decision,
        bias_analysis: biasAnalysis || undefined,
        explanation: explanation || undefined
    }
}

export async function finalizeDecision(decisionId: string): Promise<Decision> {
    const { data, error } = await supabase
        .from('decisions')
        .update({
            status: 'finalized',
            finalized_at: new Date().toISOString()
        })
        .eq('id', decisionId)
        .select()
        .single()

    if (error) throw error
    return data
}

export async function deleteDecision(decisionId: string): Promise<void> {
    const { error } = await supabase
        .from('decisions')
        .delete()
        .eq('id', decisionId)

    if (error) throw error
}

// ====================================================================
// BIAS ANALYSIS API (Edge Function)
// ====================================================================

export async function analyzeBias(decisionId: string): Promise<BiasAnalysis> {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Not authenticated')

    const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/analyze-bias`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ decision_id: decisionId })
        }
    )

    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to analyze bias')
    }

    return await response.json()
}

// ====================================================================
// EXPLANATION API (Edge Function)
// ====================================================================

export async function generateExplanation(decisionId: string): Promise<Explanation> {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Not authenticated')

    const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-explanation`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ decision_id: decisionId })
        }
    )

    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate explanation')
    }

    return await response.json()
}

// ====================================================================
// ANALYTICS API (Edge Function)
// ====================================================================

export async function getDashboardAnalytics(): Promise<DashboardAnalytics> {
    // Try Edge Function first, fallback to local calculation
    try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) throw new Error('Not authenticated')

        const response = await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/analytics?endpoint=dashboard`,
            {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            }
        )

        if (response.ok) {
            return await response.json()
        }
    } catch (error) {
        console.warn('Edge Function analytics failed, using local calculation:', error)
    }

    // Fallback: Calculate analytics locally
    return getDashboardAnalyticsLocal()
}

// Local analytics calculation (fallback)
async function getDashboardAnalyticsLocal(): Promise<DashboardAnalytics> {
    try {
        const user = await getCurrentUser()
        if (!user) throw new Error('Not authenticated')

        // Get all decisions
        const { data: decisions, error } = await supabase
            .from('decisions')
            .select('*, bias_analysis(*)')
            .eq('created_by', user.id)

        if (error) throw error

        const analytics: DashboardAnalytics = {
            total_decisions: decisions?.length || 0,
            pending_decisions: decisions?.filter(d => d.status === 'pending').length || 0,
            analyzed_decisions: decisions?.filter(d => ['analyzed', 'reviewed', 'finalized'].includes(d.status)).length || 0,
            high_risk_decisions: 0,
            avg_risk_score: 0,
            decisions_by_type: {},
            active_employees: 0,
            total_projects: 0
        }

        // Calculate high risk and average score
        let totalRisk = 0
        let riskCount = 0

        decisions?.forEach(decision => {
            // Count by type
            if (!analytics.decisions_by_type[decision.decision_type]) {
                analytics.decisions_by_type[decision.decision_type] = 0
            }
            analytics.decisions_by_type[decision.decision_type]++

            // Calculate risk metrics
            if (decision.bias_analysis && decision.bias_analysis.length > 0) {
                const analysis = decision.bias_analysis[0]
                if (analysis.risk_level === 'high') {
                    analytics.high_risk_decisions++
                }
                if (analysis.risk_score != null) {
                    totalRisk += analysis.risk_score
                    riskCount++
                }
            }
        })

        if (riskCount > 0) {
            analytics.avg_risk_score = totalRisk / riskCount
        }

        return analytics
    } catch (error) {
        console.error('Local analytics calculation failed:', error)
        // Return empty analytics
        return {
            total_decisions: 0,
            pending_decisions: 0,
            analyzed_decisions: 0,
            high_risk_decisions: 0,
            avg_risk_score: 0,
            decisions_by_type: {},
            active_employees: 0,
            total_projects: 0
        }
    }
}

export async function getBiasTrends(days: number = 30): Promise<any[]> {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Not authenticated')

    const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/analytics?endpoint=bias-trends&days=${days}`,
        {
            headers: {
                'Authorization': `Bearer ${session.access_token}`
            }
        }
    )

    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch bias trends')
    }

    return await response.json()
}

export async function getFairnessMetrics(): Promise<any> {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Not authenticated')

    const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/analytics?endpoint=fairness-metrics`,
        {
            headers: {
                'Authorization': `Bearer ${session.access_token}`
            }
        }
    )

    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch fairness metrics')
    }

    return await response.json()
}

// ====================================================================
// AUDIT LOGS
// ====================================================================

export async function getAuditLogs(decisionId: string): Promise<any[]> {
    const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('decision_id', decisionId)
        .order('created_at', { ascending: true })

    if (error) throw error
    return data
}

// ====================================================================
// DEPARTMENTS API
// ====================================================================

export async function getDepartments(): Promise<Department[]> {
    const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name')

    if (error) throw error
    return data
}

export async function getDepartment(id: string): Promise<Department> {
    const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('id', id)
        .single()

    if (error) throw error
    return data
}

export async function createDepartment(name: string, description?: string): Promise<Department> {
    const { data, error } = await supabase
        .from('departments')
        .insert({ name, description })
        .select()
        .single()

    if (error) throw error
    return data
}

// ====================================================================
// EMPLOYEES API
// ====================================================================

export async function getEmployees(filters?: {
    department_id?: string
    reports_to_id?: string
}): Promise<Employee[]> {
    let query = supabase
        .from('employees')
        .select('*, department:departments(*)')
        .order('name')

    if (filters?.department_id) {
        query = query.eq('department_id', filters.department_id)
    }

    if (filters?.reports_to_id) {
        query = query.eq('reports_to_id', filters.reports_to_id)
    }

    const { data, error } = await query

    if (error) throw error
    return data
}

export async function getEmployee(id: string): Promise<Employee> {
    const { data, error } = await supabase
        .from('employees')
        .select('*, department:departments(*)')
        .eq('id', id)
        .single()

    if (error) throw error
    return data
}

export async function createEmployee(employeeData: {
    name: string
    email?: string
    role_title: string
    department_id?: string
    reports_to_id?: string
    is_department_manager?: boolean
    status?: 'active' | 'on_leave'
    hire_date?: string
}): Promise<Employee> {
    const user = await getCurrentUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
        .from('employees')
        .insert({
            ...employeeData,
            created_by: user.id
        })
        .select('*, department:departments(*), reports_to:employees!reports_to_id(*)')
        .single()

    if (error) throw error
    return data
}

export async function updateEmployee(id: string, employeeData: Partial<Employee>): Promise<Employee> {
    const { data, error } = await supabase
        .from('employees')
        .update(employeeData)
        .eq('id', id)
        .select('*, department:departments(*), reports_to:employees!reports_to_id(*)')
        .single()

    if (error) throw error
    return data
}

export async function deleteEmployee(id: string): Promise<void> {
    const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id)

    if (error) throw error
}

// Search and filter employees
export async function searchEmployees(params: {
    search?: string
    department_id?: string
    manager_id?: string
    status?: string
    hire_date_from?: string
    hire_date_to?: string
}): Promise<Employee[]> {
    let query = supabase
        .from('employees')
        .select('*, department:departments(*), reports_to:employees!reports_to_id(*)')
        .order('name')

    // Search by name or role
    if (params.search) {
        query = query.or(`name.ilike.%${params.search}%,role_title.ilike.%${params.search}%`)
    }

    // Filter by department
    if (params.department_id) {
        query = query.eq('department_id', params.department_id)
    }

    // Filter by manager
    if (params.manager_id) {
        query = query.eq('reports_to_id', params.manager_id)
    }

    // Filter by status
    if (params.status) {
        query = query.eq('status', params.status)
    }

    // Filter by hire date range
    if (params.hire_date_from) {
        query = query.gte('hire_date', params.hire_date_from)
    }
    if (params.hire_date_to) {
        query = query.lte('hire_date', params.hire_date_to)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
}

// Archive employee (soft delete)
export async function archiveEmployee(id: string, reason: string): Promise<Employee> {
    const { data, error } = await supabase
        .from('employees')
        .update({
            status: 'terminated',
            terminated_at: new Date().toISOString(),
            termination_reason: reason
        })
        .eq('id', id)
        .select()
        .single()

    if (error) throw error
    return data
}

// Rehire employee
export async function rehireEmployee(id: string, newData: {
    role_title?: string
    department_id?: string
    reports_to_id?: string
    hire_date?: string
}): Promise<Employee> {
    const { data, error } = await supabase
        .from('employees')
        .update({
            status: 'active',
            terminated_at: null,
            termination_reason: null,
            ...newData
        })
        .eq('id', id)
        .select()
        .single()

    if (error) throw error
    return data
}

// Transfer employee to different department
export async function transferEmployee(id: string, department_id: string, reports_to_id?: string): Promise<Employee> {
    const { data, error } = await supabase
        .from('employees')
        .update({
            department_id,
            reports_to_id: reports_to_id || null
        })
        .eq('id', id)
        .select()
        .single()

    if (error) throw error
    return data
}

// Get employee role history
export async function getEmployeeHistory(employee_id: string): Promise<RoleHistory[]> {
    const { data, error } = await supabase
        .from('role_history')
        .select('*')
        .eq('employee_id', employee_id)
        .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
}

// Get department with metrics
export async function getDepartmentMetrics(id: string): Promise<DepartmentMetrics> {
    const { data: dept, error: deptError } = await supabase
        .from('departments')
        .select('*')
        .eq('id', id)
        .single()

    if (deptError) throw deptError

    // Get employee count using RPC
    const { data: empCount } = await supabase.rpc('get_department_employee_count', { dept_id: id })

    // Get average tenure using RPC
    const { data: avgTenure } = await supabase.rpc('get_department_avg_tenure', { dept_id: id })

    // Get manager
    const { data: manager } = await supabase
        .from('employees')
        .select('*')
        .eq('department_id', id)
        .eq('is_department_manager', true)
        .eq('status', 'active')
        .single()

    return {
        ...dept,
        employee_count: empCount || 0,
        avg_tenure_months: avgTenure || 0,
        manager: manager || undefined
    }
}

// Get all departments with metrics
export async function getDepartmentsWithMetrics(): Promise<DepartmentMetrics[]> {
    const { data: depts, error } = await supabase
        .from('departments')
        .select('*')
        .order('name')

    if (error) throw error

    // Get metrics for each department
    const metricsPromises = (depts || []).map(dept => getDepartmentMetrics(dept.id))
    return await Promise.all(metricsPromises)
}

// Update department
export async function updateDepartment(id: string, data: { name?: string; description?: string }): Promise<Department> {
    const { data: result, error } = await supabase
        .from('departments')
        .update(data)
        .eq('id', id)
        .select()
        .single()

    if (error) throw error
    return result
}

// Delete department
export async function deleteDepartment(id: string): Promise<void> {
    // Check if department has employees
    const { data: employees } = await supabase
        .from('employees')
        .select('id')
        .eq('department_id', id)
        .eq('status', 'active')
        .limit(1)

    if (employees && employees.length > 0) {
        throw new Error('Cannot delete department with active employees')
    }

    const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', id)

    if (error) throw error
}

// Get organizational hierarchy
export async function getOrgHierarchy(): Promise<Employee[]> {
    const { data, error } = await supabase
        .from('employees')
        .select('*, department:departments(*)')
        .eq('status', 'active')
        .order('name')

    if (error) throw error
    return data || []
}

// Helper to get org chart structure
export async function getOrgChart(): Promise<Employee[]> {
    const { data, error } = await supabase
        .from('employees')
        .select('*, department:departments(*)')
        .order('name')

    if (error) throw error
    return data
}

// ====================================================================
// PROJECTS API
// ====================================================================

export async function getProjects(filters?: {
    department_id?: string
    status?: string
    search?: string
}): Promise<Project[]> {
    let query = supabase
        .from('projects')
        .select('*, department:departments(*)')
        .order('created_at', { ascending: false })

    if (filters?.department_id) {
        query = query.eq('department_id', filters.department_id)
    }

    if (filters?.status) {
        query = query.eq('status', filters.status)
    }

    if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
}

export async function getProject(id: string): Promise<Project> {
    const { data, error } = await supabase
        .from('projects')
        .select('*, department:departments(*)')
        .eq('id', id)
        .single()

    if (error) throw error
    return data
}

export async function createProject(projectData: {
    name: string
    description?: string
    department_id?: string
    start_date?: string
    end_date?: string
    status?: string
    weightage?: number
}): Promise<Project> {
    const user = await getCurrentUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
        .from('projects')
        .insert({
            ...projectData,
            created_by: user.id
        })
        .select('*, department:departments(*)')
        .single()

    if (error) throw error
    return data
}

export async function updateProject(id: string, projectData: Partial<Project>): Promise<Project> {
    const { data, error } = await supabase
        .from('projects')
        .update(projectData)
        .eq('id', id)
        .select('*, department:departments(*)')
        .single()

    if (error) throw error
    return data
}

export async function deleteProject(id: string): Promise<void> {
    const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id)

    if (error) throw error
}

// Get project statistics
export async function getProjectStats(projectId: string): Promise<{
    total_tasks: number
    completed_tasks: number
    in_progress_tasks: number
    todo_tasks: number
    completion_percentage: number
    team_size: number
}> {
    const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('status, assigned_to_id')
        .eq('project_id', projectId)

    if (tasksError) throw tasksError

    const total_tasks = tasks?.length || 0
    const completed_tasks = tasks?.filter(t => t.status === 'completed').length || 0
    const in_progress_tasks = tasks?.filter(t => t.status === 'in_progress').length || 0
    const todo_tasks = tasks?.filter(t => t.status === 'todo').length || 0
    const uniqueAssignees = new Set(tasks?.map(t => t.assigned_to_id).filter(Boolean))

    return {
        total_tasks,
        completed_tasks,
        in_progress_tasks,
        todo_tasks,
        completion_percentage: total_tasks > 0 ? Math.round((completed_tasks / total_tasks) * 100) : 0,
        team_size: uniqueAssignees.size
    }
}

// ====================================================================
// TASKS API
// ====================================================================

export async function getProjectTasks(projectId: string, filters?: {
    status?: string
    assigned_to_id?: string
}): Promise<Task[]> {
    let query = supabase
        .from('tasks')
        // Join task_assignments to get all assignees
        .select(`
            *, 
            assigned_to_employee:employees!assigned_to_id(*), 
            task_assignments(
                employee:employees(*)
            )
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

    if (filters?.status) {
        query = query.eq('status', filters.status)
    }

    if (filters?.assigned_to_id) {
        // Filter by EXISTS in junction table if we want correct filtering, 
        // but for now keeping simple single-assignee filter logic or upgrading it.
        // To properly filter by N-to-M, we need more complex logic or just client-side filtering.
        // For backwards compat:
        query = query.eq('assigned_to_id', filters.assigned_to_id)
    }

    const { data, error } = await query

    if (error) throw error

    // Transform result to populate 'assignees' array
    return (data || []).map((task: any) => ({
        ...task,
        assignees: task.task_assignments?.map((ta: any) => ta.employee) || []
    }))
}

export async function createTask(taskData: {
    project_id: string
    assigned_to?: string // Deprecated
    assignees?: string[] // New: List of employee IDs
    title: string
    description?: string
    priority?: string
    complexity?: number
    weightage?: number
    estimated_hours?: number
    status?: string
}): Promise<Task> {
    const { assigned_to, assignees, ...rest } = taskData;

    // Determine primary assignee (assigned_to_id) for backward compat
    // Use first assignee or the deprecated assigned_to
    const primaryAssignee = assignees && assignees.length > 0 ? assignees[0] : assigned_to;

    const dbPayload = {
        ...rest,
        assigned_to_id: primaryAssignee || null,
        weightage: rest.weightage || 1
    };

    // 1. Insert Task
    const { data: task, error } = await supabase
        .from('tasks')
        .insert(dbPayload)
        .select('*, assigned_to_employee:employees!assigned_to_id(*)')
        .single()

    if (error) throw error

    // 2. Insert Assignments
    const finalAssignees = assignees || (assigned_to ? [assigned_to] : []);

    if (finalAssignees.length > 0) {
        const assignmentRows = finalAssignees.map(empId => ({
            task_id: task.id,
            employee_id: empId
        }));

        await supabase
            .from('task_assignments')
            .insert(assignmentRows);
    }

    // Return task (we could fetch fresh to get full assignees list, but let's just mock it for speed)
    return task;
}

export async function updateTask(id: string, taskData: Partial<any>): Promise<Task> {
    const payload = { ...taskData };
    let newAssignees: string[] | undefined = undefined;

    // Handle mapping logic
    if ('assignees' in payload) {
        newAssignees = payload.assignees;
        delete payload.assignees;

        // Update primary assignee for compat
        if (newAssignees && newAssignees.length > 0) {
            payload.assigned_to_id = newAssignees[0];
        } else if (newAssignees && newAssignees.length === 0) {
            payload.assigned_to_id = null;
        }
    } else if ('assigned_to' in payload) {
        // Fallback or single edit mode
        payload.assigned_to_id = payload.assigned_to;
        delete payload.assigned_to;
        if (payload.assigned_to_id) {
            newAssignees = [payload.assigned_to_id];
        } else {
            newAssignees = [];
        }
    }

    // Update Task Table
    const { data: task, error } = await supabase
        .from('tasks')
        .update(payload)
        .eq('id', id)
        .select('*, assigned_to_employee:employees!assigned_to_id(*)')
        .single()

    if (error) throw error

    // Update Assignments (Replace all)
    if (newAssignees !== undefined) {
        // 1. Delete existing
        await supabase.from('task_assignments').delete().eq('task_id', id);

        // 2. Insert new
        if (newAssignees.length > 0) {
            const assignmentRows = newAssignees.map(empId => ({
                task_id: id,
                employee_id: empId
            }));
            await supabase.from('task_assignments').insert(assignmentRows);
        }
    }

    return task;
}

export async function deleteTask(id: string): Promise<void> {
    const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id)

    if (error) throw error
}

// ====================================================================
// RATINGS API
// ====================================================================

export async function getManagerRatings(projectId: string): Promise<ManagerRating[]> {
    const { data, error } = await supabase
        .from('manager_ratings')
        .select('*')
        .eq('project_id', projectId)

    if (error) throw error
    return data || []
}

export async function saveManagerRatings(ratings: ManagerRating[]): Promise<ManagerRating[]> {
    if (!ratings.length) return [];

    // Use upsert on Primary Key (id) to avoid onConflict constraint issues
    const { data, error } = await supabase
        .from('manager_ratings')
        .upsert(ratings)
        .select()

    if (error) throw error
    return data || []
}

export async function getPeerRatings(projectId: string): Promise<PeerRating[]> {
    const { data, error } = await supabase
        .from('peer_ratings')
        .select('*')
        .eq('project_id', projectId)

    if (error) throw error
    return data || []
}

export async function savePeerRatings(ratings: PeerRating[]): Promise<PeerRating[]> {
    if (!ratings.length) return [];
    const { data, error } = await supabase
        .from('peer_ratings')
        .upsert(ratings)
        .select()

    if (error) throw error
    return data || []
}

export async function getKPIs(projectId: string): Promise<KPI[]> {
    const { data, error } = await supabase
        .from('kpis')
        .select('*')
        .eq('project_id', projectId)

    if (error) throw error
    return data || []
}

export async function saveKPIs(kpis: KPI[]): Promise<KPI[]> {
    if (!kpis.length) return [];
    const { data, error } = await supabase
        .from('kpis')
        .upsert(kpis)
        .select()

    if (error) throw error
    return data || []
}
