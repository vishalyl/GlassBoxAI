'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    getProject,
    getProjectTasks,
    getManagerRatings,
    saveManagerRatings,
    getPeerRatings,
    savePeerRatings,
    getKPIs,
    saveKPIs,
    Project,
    Task,
    Employee,
    ManagerRating,
    PeerRating,
    KPI
} from '@/app/lib/api';

interface KpiValue {
    value: number;
    id?: string;
}

export default function RateProjectPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();

    // State
    const [activeTab, setActiveTab] = useState<'manager' | 'peer' | 'kpi'>('manager');
    const [project, setProject] = useState<Project | null>(null);
    const [employees, setEmployees] = useState<Employee[]>([]);

    const [managerRatings, setManagerRatings] = useState<Record<string, Partial<ManagerRating>>>({});
    const [peerRatings, setPeerRatings] = useState<Record<string, Partial<PeerRating>>>({});

    // KPIs: Store structure with ID for upsert support
    const [kpiRatings, setKpiRatings] = useState<Record<string, Record<string, KpiValue>>>({});

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Load Data
    useEffect(() => {
        async function loadData() {
            try {
                const [proj, tasks, mgrRatingsData, peerRatingsData, kpisData] = await Promise.all([
                    getProject(id),
                    getProjectTasks(id),
                    getManagerRatings(id),
                    getPeerRatings(id),
                    getKPIs(id)
                ]);

                setProject(proj);

                // Deduplicate Assignees
                const teamMap = new Map<string, Employee>();
                tasks.forEach(task => {
                    if (task.assignees && task.assignees.length > 0) {
                        task.assignees.forEach(emp => teamMap.set(emp.id, emp));
                    }
                    if (task.assigned_to_employee) {
                        teamMap.set(task.assigned_to_employee.id, task.assigned_to_employee);
                    }
                });
                const teamList = Array.from(teamMap.values());
                setEmployees(teamList);

                // Initialize Manager Ratings
                const mgrMap: Record<string, Partial<ManagerRating>> = {};
                teamList.forEach(emp => {
                    const existing = mgrRatingsData.find(r => r.employee_id === emp.id);
                    mgrMap[emp.id] = existing ? { ...existing } : { volume_score: 3, quality_score: 3, speed_score: 3, complexity_score: 0, comments: '' };
                });
                setManagerRatings(mgrMap);

                // Initialize Peer Ratings
                const peerMap: Record<string, Partial<PeerRating>> = {};
                teamList.forEach(emp => {
                    const existing = peerRatingsData.find(r => r.employee_id === emp.id);
                    peerMap[emp.id] = existing ? { ...existing } : { volume_score: 3, quality_score: 3, speed_score: 3 };
                });
                setPeerRatings(peerMap);

                // Initialize KPIs
                const kpiOuterMap: Record<string, Record<string, KpiValue>> = {};
                teamList.forEach(emp => {
                    const employeeKpis = kpisData.filter(k => k.employee_id === emp.id);
                    const empMap: Record<string, KpiValue> = {
                        Volume: { value: 3 },
                        Quality: { value: 3 },
                        Speed: { value: 3 },
                        Complexity: { value: 3 }
                    };
                    employeeKpis.forEach(k => {
                        if (k.metric_name) {
                            empMap[k.metric_name] = { value: k.metric_value, id: k.id };
                        }
                    });
                    kpiOuterMap[emp.id] = empMap;
                });
                setKpiRatings(kpiOuterMap);

            } catch (err: any) {
                console.error("Error loading data:", err);
                setError(err.message || 'Failed to load project data.');
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [id]);

    const handleManagerChange = (empId: string, field: keyof ManagerRating, value: any) => {
        setManagerRatings(prev => ({ ...prev, [empId]: { ...prev[empId], [field]: value } }));
    };

    const handlePeerChange = (empId: string, field: keyof PeerRating, value: any) => {
        setPeerRatings(prev => ({ ...prev, [empId]: { ...prev[empId], [field]: value } }));
    };

    const handleKpiChange = (empId: string, metric: string, value: number) => {
        setKpiRatings(prev => ({
            ...prev,
            [empId]: {
                ...(prev[empId] || {}),
                [metric]: {
                    ...(prev[empId]?.[metric] || {}),
                    value
                }
            }
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const { createClient } = await import('@supabase/supabase-js');
            const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not logged in");

            const { data: me } = await supabase.from('employees').select('id').eq('user_id', user.id).single();

            let raterId = me?.id;

            // If HR user doesn't have an employee record, create one automatically
            if (!raterId) {
                const { data: newEmployee, error: empError } = await supabase
                    .from('employees')
                    .insert({
                        user_id: user.id,
                        name: user.email?.split('@')[0] || 'Admin',
                        email: user.email,
                        role_title: 'HR Manager',
                        status: 'active'
                    })
                    .select('id')
                    .single();

                if (empError || !newEmployee) {
                    throw new Error("Failed to initialize user profile. Please contact support.");
                }

                raterId = newEmployee.id;
            }

            // 1. Save Manager Ratings
            const mgrPayload: ManagerRating[] = Object.entries(managerRatings).map(([empId, r]) => {
                const payload: any = {
                    project_id: id,
                    employee_id: empId,
                    rated_by_id: raterId,
                    volume_score: Math.min(5, Math.max(0, r.volume_score || 0)),
                    quality_score: Math.min(5, Math.max(0, r.quality_score || 0)),
                    speed_score: Math.min(5, Math.max(0, r.speed_score || 0)),
                    complexity_score: 0,
                    comments: r.comments,
                };
                if (r.id) payload.id = r.id;
                return payload;
            });
            const savedMgr = await saveManagerRatings(mgrPayload);

            // Update local state with new IDs to prevent duplicates on next save
            setManagerRatings(prev => {
                const next = { ...prev };
                savedMgr.forEach(r => {
                    if (next[r.employee_id]) {
                        next[r.employee_id].id = r.id;
                    }
                });
                return next;
            });

            // 2. Save Peer Ratings
            const peerPayload: PeerRating[] = Object.entries(peerRatings).map(([empId, r]) => {
                const payload: any = {
                    project_id: id,
                    employee_id: empId,
                    rated_by_id: raterId,
                    volume_score: Math.min(5, Math.max(0, r.volume_score || 0)),
                    quality_score: Math.min(5, Math.max(0, r.quality_score || 0)),
                    speed_score: Math.min(5, Math.max(0, r.speed_score || 0)),
                    complexity_score: 0,
                };
                if (r.id) payload.id = r.id;
                return payload;
            });
            const savedPeer = await savePeerRatings(peerPayload);

            setPeerRatings(prev => {
                const next = { ...prev };
                savedPeer.forEach(r => {
                    if (next[r.employee_id]) {
                        next[r.employee_id].id = r.id;
                    }
                });
                return next;
            });

            // 3. Save KPIs
            const kpiPayload: KPI[] = [];
            Object.entries(kpiRatings).forEach(([empId, metrics]) => {
                Object.entries(metrics).forEach(([metricName, kpiVal]) => {
                    const payload: any = {
                        project_id: id,
                        employee_id: empId,
                        metric_category: metricName, // Use metric name as category (Volume, Quality, Speed, Complexity)
                        metric_name: metricName,
                        metric_value: Math.min(5, Math.max(0, kpiVal.value)) // Ensure 0-5 range
                    };
                    if (kpiVal.id) payload.id = kpiVal.id;
                    kpiPayload.push(payload);
                });
            });
            const savedKpis = await saveKPIs(kpiPayload);

            // Update KPI IDs in state
            setKpiRatings(prev => {
                const next = { ...prev };
                savedKpis.forEach(k => {
                    if (next[k.employee_id] && next[k.employee_id][k.metric_name]) {
                        next[k.employee_id][k.metric_name].id = k.id;
                    }
                });
                return next;
            });

            setSuccessMessage("All ratings saved!");
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;
    if (!project) return <div className="p-8 text-center text-red-500">Project not found.</div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-8 py-5 flex items-center justify-between sticky top-0 z-10 shadow-sm">
                <div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                        <Link href={`/projects/${id}`} className="hover:text-blue-600">
                            &larr; Back to Project
                        </Link>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Evaluations: {project.name}
                    </h1>
                </div>
                <div className="flex items-center gap-4">
                    {successMessage && <span className="text-green-600 bg-green-50 px-3 py-1 rounded-full text-sm">{successMessage}</span>}
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 shadow-sm"
                    >
                        {saving ? 'Saving All...' : 'Save All Changes'}
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-8 py-8">
                {/* Tabs */}
                <div className="flex gap-4 mb-6 border-b border-gray-200">
                    {['manager', 'peer', 'kpi'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === tab
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {tab === 'manager' && 'Manager Ratings (3 Dims)'}
                            {tab === 'peer' && 'Peer Ratings (3 Dims)'}
                            {tab === 'kpi' && 'Hard KPIs (4 Dims)'}
                        </button>
                    ))}
                </div>

                {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>}

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="px-6 py-4 font-semibold text-gray-700 w-64">Employee</th>

                                    {activeTab === 'kpi' ? (
                                        <>
                                            <th className="px-4 py-4 font-semibold text-gray-700 w-32 text-center">Volume (0-5)</th>
                                            <th className="px-4 py-4 font-semibold text-gray-700 w-32 text-center">Quality (0-5)</th>
                                            <th className="px-4 py-4 font-semibold text-gray-700 w-32 text-center">Speed (0-5)</th>
                                            <th className="px-4 py-4 font-semibold text-gray-700 w-32 text-center">Complexity (0-5)</th>
                                        </>
                                    ) : activeTab === 'manager' ? (
                                        <>
                                            <th className="px-4 py-4 font-semibold text-gray-700 w-32 text-center">Execution (0-5)</th>
                                            <th className="px-4 py-4 font-semibold text-gray-700 w-32 text-center">Strategy (0-5)</th>
                                            <th className="px-4 py-4 font-semibold text-gray-700 w-32 text-center">Impact (0-5)</th>
                                        </>
                                    ) : (
                                        <>
                                            <th className="px-4 py-4 font-semibold text-gray-700 w-32 text-center">Collaboration (0-5)</th>
                                            <th className="px-4 py-4 font-semibold text-gray-700 w-32 text-center">Communication (0-5)</th>
                                            <th className="px-4 py-4 font-semibold text-gray-700 w-32 text-center">Reliability (0-5)</th>
                                        </>
                                    )}

                                    {activeTab === 'manager' && <th className="px-6 py-4 font-semibold text-gray-700">Comments</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {employees.map(emp => {

                                    if (activeTab === 'kpi') {
                                        return (
                                            <tr key={emp.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-gray-900">{emp.name}</div>
                                                </td>
                                                {['Volume', 'Quality', 'Speed', 'Complexity'].map(metric => (
                                                    <td key={metric} className="px-4 py-4 text-center">
                                                        <div className="flex flex-col items-center">
                                                            <span className="text-lg font-bold text-blue-600 mb-1">
                                                                {(kpiRatings[emp.id]?.[metric]?.value) || 0}
                                                            </span>
                                                            <input
                                                                type="range"
                                                                min="0"
                                                                max="5"
                                                                step="0.5"
                                                                value={(kpiRatings[emp.id]?.[metric]?.value) || 0}
                                                                onChange={(e) => handleKpiChange(emp.id, metric, parseFloat(e.target.value))}
                                                                className="w-24 accent-blue-600 cursor-pointer"
                                                            />
                                                        </div>
                                                    </td>
                                                ))}
                                            </tr>
                                        )
                                    }

                                    const data = activeTab === 'manager' ? managerRatings : peerRatings;
                                    const record = data[emp.id] || {};
                                    const handler = activeTab === 'manager' ? handleManagerChange : handlePeerChange;
                                    const fields = activeTab === 'manager'
                                        ? ['volume_score', 'quality_score', 'speed_score'] // Map Execution->Volume, Strategy->Quality, Impact->Speed
                                        : ['volume_score', 'quality_score', 'speed_score']; // Collaboration->Volume, etc.

                                    return (
                                        <tr key={emp.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-900">{emp.name}</div>
                                                <div className="text-xs text-gray-500">{emp.role_title}</div>
                                            </td>
                                            {fields.map(metric => (
                                                <td key={metric} className="px-4 py-4 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-lg font-bold text-blue-600 mb-1">
                                                            {(record as any)[metric] || 0}
                                                        </span>
                                                        <input
                                                            type="range"
                                                            min="0"
                                                            max="5"
                                                            step="0.5"
                                                            value={(record as any)[metric] || 0}
                                                            onChange={(e) => handler(emp.id, metric as any, parseFloat(e.target.value))}
                                                            className="w-24 accent-blue-600 cursor-pointer"
                                                        />
                                                    </div>
                                                </td>
                                            ))}
                                            {activeTab === 'manager' && (
                                                <td className="px-6 py-4">
                                                    <textarea
                                                        value={(record as any).comments || ''}
                                                        onChange={(e) => handler(emp.id, 'comments' as any, e.target.value)}
                                                        className="w-full h-20 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 resize-none"
                                                        placeholder="Notes..."
                                                    />
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
