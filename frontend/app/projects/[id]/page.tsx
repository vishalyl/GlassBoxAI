'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    getProject,
    updateProject,
    deleteProject,
    getProjectTasks,
    createTask,
    updateTask,
    deleteTask,
    getEmployees,
    getProjectStats,
    getManagerRatings,
    getPeerRatings,
    getKPIs
} from '@/app/lib/api';
import type { Project, Task, Employee, ManagerRating, PeerRating, KPI } from '@/app/lib/api';

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [project, setProject] = useState<Project | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [deptEmployees, setDeptEmployees] = useState<Employee[]>([]);
    const [error, setError] = useState('');

    // Tabs
    const [activeTab, setActiveTab] = useState<'tasks' | 'scoreboard'>('tasks');

    // Scoreboard Data
    const [scoreboardData, setScoreboardData] = useState<{
        manager: ManagerRating[];
        peer: PeerRating[];
        kpi: KPI[];
        team: Employee[];
    } | null>(null);
    const [explainMember, setExplainMember] = useState<string | null>(null); // Employee ID to explain

    // Modal states
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);

    // Filters
    const [statusFilter, setStatusFilter] = useState('all');

    useEffect(() => {
        loadData();
    }, [id]);

    async function loadData() {
        try {
            setLoading(true);
            const [projectData, tasksData, statsData] = await Promise.all([
                getProject(id),
                getProjectTasks(id),
                getProjectStats(id)
            ]);

            setProject(projectData);
            setTasks(tasksData);
            setStats(statsData);

            if (projectData.department_id) {
                const employees = await getEmployees({ department_id: projectData.department_id });
                setDeptEmployees(employees);
            } else {
                const allEmployees = await getEmployees();
                setDeptEmployees(allEmployees);
            }

            // Load Scoreboard Data
            const [mgrRatings, peerRatings, kpis] = await Promise.all([
                getManagerRatings(id),
                getPeerRatings(id),
                getKPIs(id)
            ]);

            // Determine unique assigned employees
            const teamMap = new Map<string, Employee>();
            tasksData.forEach(task => {
                if (task.assignees) task.assignees.forEach(e => teamMap.set(e.id, e));
                if (task.assigned_to_employee) teamMap.set(task.assigned_to_employee.id, task.assigned_to_employee);
            });
            const team = Array.from(teamMap.values());

            setScoreboardData({
                manager: mgrRatings,
                peer: peerRatings,
                kpi: kpis,
                team: team
            });

            setLoading(false);
        } catch (err: any) {
            console.error('Project Load Error:', err);
            setError(err.message || 'Failed to load project');
            setLoading(false);
        }
    }

    async function handleUpdateProjectStatus(newStatus: string) {
        if (!project) return;
        try {
            const updated = await updateProject(project.id, { status: newStatus as any });
            setProject(updated);
        } catch (err: any) {
            alert(err.message);
        }
    }

    async function handleDeleteProject() {
        if (!confirm('Are you sure you want to delete this project? This cannot be undone.')) return;
        try {
            await deleteProject(id);
            router.push('/projects');
        } catch (err: any) {
            alert(err.message);
        }
    }

    async function handleDeleteTask(taskId: string) {
        if (!confirm('Delete this task?')) return;
        try {
            await deleteTask(taskId);
            loadData();
        } catch (err: any) {
            alert(err.message);
        }
    }

    function openCreateTask() {
        setEditingTask(null);
        setShowTaskModal(true);
    }

    function openEditTask(task: Task) {
        setEditingTask(task);
        setShowTaskModal(true);
    }

    // Score Calculation Helper
    function getEmployeeScore(empId: string) {
        if (!scoreboardData) return { total: '0.0', details: null };

        const mgr = scoreboardData.manager.find(r => r.employee_id === empId);
        const peer = scoreboardData.peer.find(r => r.employee_id === empId);
        const kpis = scoreboardData.kpi.filter(k => k.employee_id === empId);

        // Manager Avg
        const mgrSum = (mgr?.volume_score || 0) + (mgr?.quality_score || 0) + (mgr?.speed_score || 0);
        const mgrAvg = mgrSum / 3;

        // Peer Avg
        const peerSum = (peer?.volume_score || 0) + (peer?.quality_score || 0) + (peer?.speed_score || 0);
        const peerAvg = peerSum / 3;

        // KPI Avg
        let kpiSum = 0;
        let kpiCount = 0;
        kpis.forEach(k => {
            kpiSum += k.metric_value;
            kpiCount++;
        });
        const kpiAvg = kpiCount > 0 ? kpiSum / kpiCount : 0;

        // Formula: (Mgr * 0.4 + Peer * 0.3 + KPI * 0.3) -> Scale 0-5
        const weighted = (mgrAvg * 0.4) + (peerAvg * 0.3) + (kpiAvg * 0.3);
        const rawScore = weighted * 2; // Scale to 10

        // Calculate normalization factor (called later with all team scores)
        return {
            total: rawScore.toFixed(1),
            rawScore: rawScore, // Store raw for normalization
            details: {
                mgrAvg: mgrAvg.toFixed(2),
                peerAvg: peerAvg.toFixed(2),
                kpiAvg: kpiAvg.toFixed(2),
                mgrRaw: mgr,
                peerRaw: peer,
                kpiRaw: kpis
            }
        };
    }

    // Normalize scores so they sum to 10
    function getNormalizedScore(empId: string): string {
        if (!scoreboardData || !scoreboardData.team.length) return '0.0';

        // Calculate all raw scores
        const allScores = scoreboardData.team.map(emp => ({
            id: emp.id,
            raw: getEmployeeScore(emp.id).rawScore || 0
        }));

        const totalRaw = allScores.reduce((sum, s) => sum + (s.raw || 0), 0);

        // Avoid division by zero
        if (totalRaw === 0) return '0.0';

        // Normalize to sum to 10
        const normalizationFactor = 10 / totalRaw;
        const myScore = allScores.find(s => s.id === empId);

        if (!myScore) return '0.0';

        const normalized = (myScore.raw || 0) * normalizationFactor;
        return normalized.toFixed(1);
    }

    if (loading) return <div className="text-center p-8">Loading...</div>;
    if (!project) return <div className="text-center p-8 text-red-500">Project not found</div>;

    const explainData = explainMember ? getEmployeeScore(explainMember).details : null;
    const explainEmployee = scoreboardData?.team.find(e => e.id === explainMember);

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 shadow-sm">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                        <Link href="/dashboard" className="hover:text-blue-600">Dashboard</Link>
                        <span>/</span>
                        <Link href="/projects" className="hover:text-blue-600">Projects</Link>
                        <span>/</span>
                        <span className="text-gray-900 font-medium">{project.name}</span>
                    </div>

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
                            <div className="flex gap-4 mt-4">
                                <button
                                    onClick={() => setActiveTab('tasks')}
                                    className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === 'tasks' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}
                                >
                                    Tasks
                                </button>
                                <button
                                    onClick={() => setActiveTab('scoreboard')}
                                    className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === 'scoreboard' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}
                                >
                                    Performance Scoreboard
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Link
                                href={`/projects/${id}/rate`}
                                className="px-4 py-2 border border-blue-600 text-blue-600 bg-white rounded-lg hover:bg-blue-50 text-sm font-medium flex items-center gap-2 shadow-sm"
                            >
                                <span className="text-lg">⭐</span> Rate Team
                            </Link>
                            <select
                                value={project.status || 'planning'}
                                onChange={(e) => handleUpdateProjectStatus(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                            >
                                <option value="planning">Planning</option>
                                <option value="active">Active</option>
                                <option value="completed">Completed</option>
                                <option value="on_hold">On Hold</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* TAB CONTENT */}
            <div className="container mx-auto px-4 py-8">
                {activeTab === 'tasks' ? (
                    <>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-semibold text-gray-900">Tasks ({tasks.length})</h2>
                            <button onClick={openCreateTask} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm transition-colors">
                                + Create Task
                            </button>
                        </div>

                        <div className="grid gap-4">
                            {tasks.length === 0 ? (
                                <div className="text-center py-12 bg-white rounded-xl border border-gray-200 border-dashed">
                                    <p className="text-gray-500">No tasks found.</p>
                                </div>
                            ) : (
                                tasks.map(task => (
                                    <div key={task.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:border-blue-200 transition-colors cursor-pointer group flex items-center justify-between gap-4" onClick={() => openEditTask(task)}>
                                        <div className="flex items-center gap-4">
                                            <div className={`w-1.5 h-12 rounded-full ${task.priority === 'High' ? 'bg-red-500' :
                                                task.priority === 'Medium' ? 'bg-yellow-500' :
                                                    'bg-blue-500'
                                                }`} />
                                            <div>
                                                <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">{task.title}</h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${task.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                        task.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                                                            'bg-gray-100 text-gray-700'
                                                        }`}>
                                                        {task.status === 'completed' ? 'Completed' :
                                                            task.status === 'in_progress' ? 'In Progress' : 'To Do'}
                                                    </span>
                                                    {task.assignees && task.assignees.length > 0 && (
                                                        <div className="flex -space-x-1 pl-2">
                                                            {task.assignees.slice(0, 3).map(a => (
                                                                <div key={a.id} className="w-5 h-5 rounded-full bg-gray-200 border border-white flex items-center justify-center text-[10px] font-bold text-gray-600" title={a.name}>
                                                                    {a.name.charAt(0)}
                                                                </div>
                                                            ))}
                                                            {task.assignees.length > 3 && (
                                                                <div className="w-5 h-5 rounded-full bg-gray-100 border border-white flex items-center justify-center text-[8px] text-gray-500">+{task.assignees.length - 3}</div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }}
                                            className="ml-auto text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-2"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="px-6 py-4 font-semibold text-gray-700">Employee</th>
                                    <th className="px-6 py-4 font-semibold text-gray-700 text-center">Final Score (0-10)</th>
                                    <th className="px-6 py-4 font-semibold text-gray-700 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {scoreboardData?.team.map(emp => {
                                    const normalizedScore = getNormalizedScore(emp.id);
                                    return (
                                        <tr key={emp.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 font-medium text-gray-900">{emp.name}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-block px-3 py-1 rounded-full text-lg font-bold ${parseFloat(normalizedScore) >= 8 ? 'bg-green-100 text-green-700' :
                                                        parseFloat(normalizedScore) >= 5 ? 'bg-blue-100 text-blue-700' :
                                                            'bg-red-100 text-red-700'
                                                    }`}>
                                                    {normalizedScore}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => setExplainMember(emp.id)}
                                                    className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                                                >
                                                    Explain Calculation
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {scoreboardData?.team.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-8 text-center text-gray-500">No team members found for scoreboard.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* EXPLAIN MODAL */}
            {explainMember && explainData && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-900">Score Breakdown: {explainEmployee?.name}</h3>
                            <button onClick={() => setExplainMember(null)} className="text-gray-400 hover:text-gray-600 font-bold text-xl">✕</button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <div className="flex justify-between text-sm text-gray-600 mb-1">
                                    <span>Manager Rating (Avg of 3 dims)</span>
                                    <span className="font-medium text-gray-900">{explainData.mgrAvg} / 5</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2">
                                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${(parseFloat(explainData.mgrAvg) / 5) * 100}%` }}></div>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Weight: 40%</p>
                            </div>

                            <div>
                                <div className="flex justify-between text-sm text-gray-600 mb-1">
                                    <span>Peer Rating (Avg of 3 dims)</span>
                                    <span className="font-medium text-gray-900">{explainData.peerAvg} / 5</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2">
                                    <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${(parseFloat(explainData.peerAvg) / 5) * 100}%` }}></div>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Weight: 30%</p>
                            </div>

                            <div>
                                <div className="flex justify-between text-sm text-gray-600 mb-1">
                                    <span>Hard KPIs (Avg of 4 dims)</span>
                                    <span className="font-medium text-gray-900">{explainData.kpiAvg} / 5</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2">
                                    <div className="bg-green-500 h-2 rounded-full" style={{ width: `${(parseFloat(explainData.kpiAvg) / 5) * 100}%` }}></div>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Weight: 30%</p>
                            </div>

                            <hr />

                            <div className="bg-gray-50 p-4 rounded-lg">
                                <p className="text-sm font-medium text-gray-700 mb-2">Calculation:</p>
                                <p className="font-mono text-xs text-gray-600 mb-2">
                                    Weighted Sum = ({explainData.mgrAvg} × 0.4) + ({explainData.peerAvg} × 0.3) + ({explainData.kpiAvg} × 0.3)
                                </p>
                                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                                    <span className="font-bold text-gray-900">Final Score (x2)</span>
                                    <span className="text-2xl font-bold text-blue-600">
                                        {((parseFloat(explainData.mgrAvg) * 0.4 + parseFloat(explainData.peerAvg) * 0.3 + parseFloat(explainData.kpiAvg) * 0.3) * 2).toFixed(1)} / 10
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TASK MODAL */}
            <TaskModal
                isOpen={showTaskModal}
                onClose={() => setShowTaskModal(false)}
                onSubmit={async (data) => {
                    try {
                        if (editingTask) {
                            await updateTask(editingTask.id, data);
                        } else {
                            await createTask({
                                project_id: id,
                                ...data
                            });
                        }
                        setShowTaskModal(false);
                        loadData();
                    } catch (e: any) {
                        alert(e.message);
                    }
                }}
                initialData={editingTask}
                employees={deptEmployees}
                loading={loading}
            />
        </div>
    );
}

function TaskModal({
    isOpen,
    onClose,
    onSubmit,
    initialData,
    employees,
    loading
}: {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => Promise<void>;
    initialData?: Task | null;
    employees: Employee[];
    loading: boolean;
}) {
    const [formData, setFormData] = useState<{
        title: string;
        description: string;
        priority: string;
        status: string;
        assignees: string[];
        weightage: number;
        complexity: number;
        estimated_hours: number;
    }>({
        title: '',
        description: '',
        priority: 'Medium',
        status: 'todo',
        assignees: [],
        weightage: 1,
        complexity: 3,
        estimated_hours: 0
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                title: initialData.title,
                description: initialData.description || '',
                priority: initialData.priority || 'Medium',
                status: initialData.status,
                assignees: initialData.assignees?.map(e => e.id) || (initialData.assigned_to_id ? [initialData.assigned_to_id] : []),
                weightage: initialData.weightage || 1,
                complexity: initialData.complexity || 3,
                estimated_hours: initialData.estimated_hours || 0
            });
        } else {
            setFormData({
                title: '',
                description: '',
                priority: 'Medium',
                status: 'todo',
                assignees: [],
                weightage: 1,
                complexity: 3,
                estimated_hours: 0
            });
        }
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSubmit(formData);
    };

    const toggleAssignee = (empId: string) => {
        setFormData(prev => {
            const exists = prev.assignees.includes(empId);
            if (exists) return { ...prev, assignees: prev.assignees.filter(id => id !== empId) };
            return { ...prev, assignees: [...prev.assignees, empId] };
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900">
                        {initialData ? 'Edit Task' : 'Create New Task'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto">
                    <div className="space-y-6">
                        {/* Title */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Task Title</label>
                            <input
                                required
                                type="text"
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                                placeholder="e.g., Design Database Schema"
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                rows={3}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow resize-none"
                                placeholder="Add details about the task..."
                            />
                        </div>

                        {/* Row: Status & Priority */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <select
                                    value={formData.status}
                                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="todo">To Do</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="completed">Completed</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                                <select
                                    value={formData.priority}
                                    onChange={e => setFormData({ ...formData, priority: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="High">High</option>
                                    <option value="Medium">Medium</option>
                                    <option value="Low">Low</option>
                                </select>
                            </div>
                        </div>

                        {/* Row: Assignees */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Assignees</label>
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 max-h-40 overflow-y-auto grid grid-cols-2 gap-2">
                                {employees.filter(e => e.role_title !== 'Manager').map(emp => (
                                    <label key={emp.id} className="flex items-center gap-2 cursor-pointer hover:bg-white p-2 rounded transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={formData.assignees.includes(emp.id)}
                                            onChange={() => toggleAssignee(emp.id)}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs text-blue-700 font-bold">
                                            {emp.name.charAt(0)}
                                        </div>
                                        <span className="text-sm text-gray-700">{emp.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Row: Metrics */}
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Weight (1-10)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={formData.weightage}
                                    onChange={e => setFormData({ ...formData, weightage: parseInt(e.target.value) })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Complexity (1-5)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="5"
                                    value={formData.complexity}
                                    onChange={e => setFormData({ ...formData, complexity: parseInt(e.target.value) })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Est. Hours</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    value={formData.estimated_hours}
                                    onChange={e => setFormData({ ...formData, estimated_hours: parseFloat(e.target.value) })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Saving...' : initialData ? 'Save Changes' : 'Create Task'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
