'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    calculatePromotionRecommendations,
    savePromotionDecision,
    type PromotionCandidate
} from '@/app/lib/decision-api';
import {
    getDepartments,
    getEmployees,
    signOut,
    type Department,
    type Employee
} from '@/app/lib/api';

export default function PromotionCalculatorPage() {
    const router = useRouter();

    const handleSignOut = async () => {
        try {
            await signOut();
            router.push('/login');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    // Form State
    const [totalSlots, setTotalSlots] = useState<string>('');
    const [selectedDepartments, setSelectedDepartments] = useState<Set<string>>(new Set());
    const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());

    // Data State
    const [departments, setDepartments] = useState<Department[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);

    // Results State
    const [candidates, setCandidates] = useState<PromotionCandidate[]>([]);
    const [calculating, setCalculating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Modal State
    const [breakdownCandidate, setBreakdownCandidate] = useState<PromotionCandidate | null>(null);

    useEffect(() => {
        async function loadData() {
            try {
                const [depts, emps] = await Promise.all([
                    getDepartments(),
                    getEmployees()
                ]);
                setDepartments(depts);
                setEmployees(emps);
                setFilteredEmployees(emps);
            } catch (err: any) {
                console.error('Load error:', err);
                setError(err.message);
            }
        }
        loadData();
    }, []);

    useEffect(() => {
        if (selectedDepartments.size === 0) {
            setFilteredEmployees(employees);
        } else {
            setFilteredEmployees(
                employees.filter(e => selectedDepartments.has(e.department_id || ''))
            );
        }
        // Don't reset selectedEmployees here to allow cross-dept selection if needed, 
        // but for now let's clear to avoid confusion
        setSelectedEmployees(new Set());
    }, [selectedDepartments, employees]);

    const toggleDepartment = (deptId: string) => {
        const newSet = new Set(selectedDepartments);
        if (newSet.has(deptId)) newSet.delete(deptId);
        else newSet.add(deptId);
        setSelectedDepartments(newSet);
    };

    const toggleEmployee = (empId: string) => {
        const newSet = new Set(selectedEmployees);
        if (newSet.has(empId)) newSet.delete(empId);
        else newSet.add(empId);
        setSelectedEmployees(newSet);
    };

    const handleCalculate = async () => {
        setError(null);
        setSuccessMessage(null);

        const slots = parseInt(totalSlots);
        if (isNaN(slots) || slots <= 0) {
            setError('Please enter a valid number of promotion slots');
            return;
        }

        setCalculating(true);
        try {
            const results = await calculatePromotionRecommendations({
                totalSlots: slots,
                eligibleDepartments: selectedDepartments.size > 0 ? Array.from(selectedDepartments) : undefined,
                eligibleEmployees: selectedEmployees.size > 0 ? Array.from(selectedEmployees) : undefined
            });

            setCandidates(results);
            if (results.length === 0) {
                setError('No eligible employees found');
            }
        } catch (err: any) {
            console.error('Calculation error:', err);
            setError(err.message || 'Failed to calculate rankings');
        } finally {
            setCalculating(false);
        }
    };

    const handleSave = async () => {
        if (candidates.length === 0) return;

        const name = prompt('Enter a name for this promotion cycle (e.g., "Q4 2024 Promotions"):');
        if (!name) return;

        setSaving(true);
        try {
            await savePromotionDecision(name, parseInt(totalSlots), candidates);
            setSuccessMessage('Promotion decision saved successfully!');
            setTimeout(() => router.push('/decisions'), 1500);
        } catch (err: any) {
            console.error('Save error:', err);
            setError(err.message || 'Failed to save decision');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                                GlassBox AI
                            </h1>
                            <p className="text-sm text-gray-600">Decision Intelligence</p>
                        </div>
                        <nav className="flex gap-6 items-center">
                            <Link href="/dashboard" className="text-gray-700 hover:text-blue-600 font-medium">Dashboard</Link>
                            <Link href="/organization" className="text-gray-700 hover:text-blue-600 font-medium">Organization</Link>
                            <Link href="/projects" className="text-gray-700 hover:text-blue-600 font-medium">Projects</Link>
                            <Link href="/decisions" className="text-blue-600 font-medium">Decisions</Link>
                            <button onClick={handleSignOut} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                                Sign Out
                            </button>
                        </nav>
                    </div>
                </div>
            </header>

            {/* Page Title & Breadcrumb */}
            <div className="bg-white border-b border-gray-200 px-8 py-5">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                    <Link href="/decisions" className="hover:text-blue-600 flex items-center gap-1">
                        ← Back to Decisions
                    </Link>
                </div>
                <h1 className="text-2xl font-bold text-gray-900">📈 Promotion Recommender</h1>
                <p className="text-sm text-gray-600 mt-1">Identify top performers deserving of promotion based on merit</p>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-8 py-8">
                {error && <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">{error}</div>}
                {successMessage && <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-lg border border-green-200">{successMessage}</div>}

                {/* Input Form */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Criteria</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Total Promotion Slots *</label>
                            <input
                                type="number"
                                value={totalSlots}
                                onChange={(e) => setTotalSlots(e.target.value)}
                                placeholder="e.g., 2"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                min="1"
                            />
                            <p className="text-xs text-gray-500 mt-1">Number of employees you can promote this cycle</p>
                        </div>

                        {/* Dept Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Eligible Departments</label>
                            <div className="border border-gray-300 rounded-lg p-3 max-h-32 overflow-y-auto bg-gray-50">
                                {departments.map(dept => (
                                    <label key={dept.id} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-100 px-2 rounded">
                                        <input
                                            type="checkbox"
                                            checked={selectedDepartments.has(dept.id)}
                                            onChange={() => toggleDepartment(dept.id)}
                                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                        />
                                        <span className="text-sm text-gray-700">{dept.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Employee Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Specific Employees</label>
                            <div className="border border-gray-300 rounded-lg p-3 max-h-32 overflow-y-auto bg-gray-50">
                                {filteredEmployees.map(emp => (
                                    <label key={emp.id} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-100 px-2 rounded">
                                        <input
                                            type="checkbox"
                                            checked={selectedEmployees.has(emp.id)}
                                            onChange={() => toggleEmployee(emp.id)}
                                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                        />
                                        <span className="text-sm text-gray-700">{emp.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="mt-6">
                        <button
                            onClick={handleCalculate}
                            disabled={calculating || !totalSlots}
                            className="px-8 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                        >
                            {calculating ? 'Analyzing Candidates...' : '🔎 Find Candidates'}
                        </button>
                    </div>
                </div>

                {/* Results Table */}
                {candidates.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-gray-900">Ranked Candidates</h2>
                            <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors">
                                {saving ? 'Saving...' : '💾 Save Decision'}
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        <th className="px-6 py-4 font-semibold text-gray-700">Rank</th>
                                        <th className="px-6 py-4 font-semibold text-gray-700">Employee</th>
                                        <th className="px-6 py-4 font-semibold text-gray-700">Status</th>
                                        <th className="px-6 py-4 font-semibold text-gray-700 text-right">Performance Score</th>
                                        <th className="px-6 py-4 font-semibold text-gray-700 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {candidates.map((candidate) => (
                                        <tr key={candidate.employee_id} className={`hover:bg-gray-50 ${candidate.recommended ? 'bg-purple-50' : ''}`}>
                                            <td className="px-6 py-4 font-bold text-gray-900">#{candidate.rank}</td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-900">{candidate.employee_name}</div>
                                                <div className="text-xs text-gray-500">{candidate.department_name} • {candidate.current_role}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {candidate.recommended ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                        ✅ Recommended
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                        Waitlist
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-purple-700">
                                                {candidate.total_score}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button onClick={() => setBreakdownCandidate(candidate)} className="text-purple-600 hover:text-purple-800 text-sm font-medium">
                                                    View Details
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Details Modal */}
            {breakdownCandidate && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setBreakdownCandidate(null)}>
                    <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center p-6 border-b border-gray-200 sticky top-0 bg-white">
                            <h3 className="text-xl font-bold text-gray-900">{breakdownCandidate.employee_name} - Performance Detail</h3>
                            <button onClick={() => setBreakdownCandidate(null)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
                        </div>
                        <div className="p-6">
                            <div className="bg-purple-50 p-4 rounded-lg mb-6">
                                <div className="text-sm text-gray-600">Total Performance Score</div>
                                <div className="text-3xl font-bold text-purple-700">{breakdownCandidate.total_score}</div>
                            </div>
                            <h4 className="font-semibold text-gray-900 mb-3">Project Contributions</h4>
                            {breakdownCandidate.calculation_details.projects.map((proj: any, i: number) => (
                                <div key={i} className="mb-3 p-3 border border-gray-200 rounded-lg">
                                    <div className="flex justify-between mb-1">
                                        <div className="font-medium text-gray-900">{proj.project_name}</div>
                                        <div className="text-sm font-bold text-purple-600">Score: {proj.performance_score.toFixed(1)}/10</div>
                                    </div>
                                    <div className="text-xs text-gray-500">Contribution Impact: {proj.contribution_score.toFixed(2)}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
