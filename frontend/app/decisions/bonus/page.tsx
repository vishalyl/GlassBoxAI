'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    calculateBonusDistribution,
    createBonusDistribution,
    type BonusAllocation
} from '@/app/lib/bonus-api';
import {
    getDepartments,
    getEmployees,
    signOut,
    type Department,
    type Employee
} from '@/app/lib/api';

export default function BonusCalculatorPage() {
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
    const [totalAmount, setTotalAmount] = useState<string>('');
    const [dateStart, setDateStart] = useState<string>('');
    const [dateEnd, setDateEnd] = useState<string>('');
    const [selectedDepartments, setSelectedDepartments] = useState<Set<string>>(new Set());
    const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());

    // Data State
    const [departments, setDepartments] = useState<Department[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);

    // Results State
    const [allocations, setAllocations] = useState<BonusAllocation[]>([]);
    const [calculating, setCalculating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Breakdown Modal
    const [breakdownEmployee, setBreakdownEmployee] = useState<BonusAllocation | null>(null);

    // Load departments and employees
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

    // Filter employees when departments change
    useEffect(() => {
        if (selectedDepartments.size === 0) {
            setFilteredEmployees(employees);
        } else {
            setFilteredEmployees(
                employees.filter(e => selectedDepartments.has(e.department_id || ''))
            );
        }
        setSelectedEmployees(new Set());
    }, [selectedDepartments, employees]);

    const toggleDepartment = (deptId: string) => {
        const newSet = new Set(selectedDepartments);
        if (newSet.has(deptId)) {
            newSet.delete(deptId);
        } else {
            newSet.add(deptId);
        }
        setSelectedDepartments(newSet);
    };

    const toggleEmployee = (empId: string) => {
        const newSet = new Set(selectedEmployees);
        if (newSet.has(empId)) {
            newSet.delete(empId);
        } else {
            newSet.add(empId);
        }
        setSelectedEmployees(newSet);
    };

    const handleCalculate = async () => {
        setError(null);
        setSuccessMessage(null);

        const amount = parseFloat(totalAmount);
        if (isNaN(amount) || amount <= 0) {
            setError('Please enter a valid bonus amount');
            return;
        }

        setCalculating(true);
        try {
            const results = await calculateBonusDistribution({
                totalAmount: amount,
                dateRangeStart: dateStart || undefined,
                dateRangeEnd: dateEnd || undefined,
                eligibleDepartments: selectedDepartments.size > 0 ? Array.from(selectedDepartments) : undefined,
                eligibleEmployees: selectedEmployees.size > 0 ? Array.from(selectedEmployees) : undefined
            });

            setAllocations(results);

            if (results.length === 0) {
                setError('No eligible employees found with the selected criteria');
            }
        } catch (err: any) {
            console.error('Calculation error:', err);
            setError(err.message || 'Failed to calculate bonus distribution');
        } finally {
            setCalculating(false);
        }
    };

    const handleSave = async () => {
        if (allocations.length === 0) {
            setError('Please calculate the distribution first');
            return;
        }

        const distributionName = prompt('Enter a name for this bonus distribution (e.g., "Q4 2024 Performance Bonus"):');
        if (!distributionName) return;

        setSaving(true);
        setError(null);

        try {
            await createBonusDistribution(
                {
                    name: distributionName,
                    total_amount: parseFloat(totalAmount),
                    date_range_start: dateStart || undefined,
                    date_range_end: dateEnd || undefined,
                    eligible_departments: selectedDepartments.size > 0 ? Array.from(selectedDepartments) : undefined,
                    eligible_employees: selectedEmployees.size > 0 ? Array.from(selectedEmployees) : undefined,
                    status: 'calculated'
                },
                allocations
            );

            setSuccessMessage('Bonus distribution saved successfully!');
            setTimeout(() => {
                router.push('/decisions');
            }, 1500);
        } catch (err: any) {
            console.error('Save error:', err);
            setError(err.message || 'Failed to save distribution');
        } finally {
            setSaving(false);
        }
    };

    const exportToCSV = () => {
        if (allocations.length === 0) return;

        const headers = ['Employee', 'Contribution %', 'Bonus Amount'];
        const rows = allocations.map(a => [
            a.employee_name || a.employee_id,
            `${a.contribution_percentage}%`,
            `$${a.bonus_amount.toLocaleString()}`
        ]);

        const csv = [headers, ...rows].map(row => row.join(',')).join('\\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'bonus_distribution.csv';
        link.click();
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
                            <Link href="/dashboard" className="text-gray-700 hover:text-blue-600 font-medium">
                                Dashboard
                            </Link>
                            <Link href="/organization" className="text-gray-700 hover:text-blue-600 font-medium">
                                Organization
                            </Link>
                            <Link href="/projects" className="text-gray-700 hover:text-blue-600 font-medium">
                                Projects
                            </Link>
                            <Link href="/decisions" className="text-blue-600 font-medium">
                                Decisions
                            </Link>
                            <button
                                onClick={handleSignOut}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                            >
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
                <h1 className="text-2xl font-bold text-gray-900">Bonus Distribution Calculator</h1>
                <p className="text-sm text-gray-600 mt-1">Calculate fair bonus allocation based on performance</p>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-8 py-8">
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                        {error}
                    </div>
                )}

                {successMessage && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
                        {successMessage}
                    </div>
                )}

                {/* Input Form */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Distribution Parameters</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Total Bonus Amount */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Total Bonus Pool ($)
                            </label>
                            <input
                                type="number"
                                value={totalAmount}
                                onChange={(e) => setTotalAmount(e.target.value)}
                                placeholder="100000"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                min="0"
                                step="0.01"
                            />
                        </div>

                        {/* Date Range */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Start Date (Optional)
                            </label>
                            <input
                                type="date"
                                value={dateStart}
                                onChange={(e) => setDateStart(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                End Date (Optional)
                            </label>
                            <input
                                type="date"
                                value={dateEnd}
                                onChange={(e) => setDateEnd(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        {/* Department Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Eligible Departments (Optional)
                            </label>
                            <div className="border border-gray-300 rounded-lg p-3 max-h-32 overflow-y-auto bg-gray-50">
                                {departments.map(dept => (
                                    <label key={dept.id} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-100 px-2 rounded">
                                        <input
                                            type="checkbox"
                                            checked={selectedDepartments.has(dept.id)}
                                            onChange={() => toggleDepartment(dept.id)}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-gray-700">{dept.name}</span>
                                    </label>
                                ))}
                                {departments.length === 0 && (
                                    <p className="text-sm text-gray-500 text-center py-2">No departments</p>
                                )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Leave empty for all departments</p>
                        </div>

                        {/* Employee Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Specific Employees (Optional)
                            </label>
                            <div className="border border-gray-300 rounded-lg p-3 max-h-32 overflow-y-auto bg-gray-50">
                                {filteredEmployees.map(emp => (
                                    <label key={emp.id} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-100 px-2 rounded">
                                        <input
                                            type="checkbox"
                                            checked={selectedEmployees.has(emp.id)}
                                            onChange={() => toggleEmployee(emp.id)}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-gray-700">{emp.name}</span>
                                    </label>
                                ))}
                                {filteredEmployees.length === 0 && (
                                    <p className="text-sm text-gray-500 text-center py-2">No employees</p>
                                )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Leave empty for all employees</p>
                        </div>
                    </div>

                    {/* Calculate Button */}
                    <div className="mt-6">
                        <button
                            onClick={handleCalculate}
                            disabled={calculating || !totalAmount}
                            className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
                        >
                            {calculating ? 'Calculating...' : 'Calculate Distribution'}
                        </button>
                    </div>
                </div>

                {/* Results Table */}
                {allocations.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-gray-900">Distribution Results</h2>
                            <div className="flex gap-3">
                                <button
                                    onClick={exportToCSV}
                                    className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                                    Export CSV
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="px-6 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 shadow-sm transition-colors"
                                >
                                    {saving ? 'Saving...' : 'Save Distribution'}
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        <th className="px-6 py-4 font-semibold text-gray-700">Employee</th>
                                        <th className="px-6 py-4 font-semibold text-gray-700 text-center">Contribution</th>
                                        <th className="px-6 py-4 font-semibold text-gray-700 text-right">Bonus Amount</th>
                                        <th className="px-6 py-4 font-semibold text-gray-700 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {allocations.map(allocation => (
                                        <tr key={allocation.employee_id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 font-medium text-gray-900">{allocation.employee_name}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${allocation.contribution_percentage >= 20 ? 'bg-green-100 text-green-700' :
                                                    allocation.contribution_percentage >= 10 ? 'bg-blue-100 text-blue-700' :
                                                        'bg-gray-100 text-gray-700'
                                                    }`}>
                                                    {allocation.contribution_percentage.toFixed(1)}%
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right font-semibold text-gray-900">
                                                ${allocation.bonus_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => setBreakdownEmployee(allocation)}
                                                    className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                                                >
                                                    Explain Calculation
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="border-t-2 border-gray-300 bg-gray-50">
                                    <tr>
                                        <td className="px-6 py-4 font-bold text-gray-900">TOTAL</td>
                                        <td className="px-6 py-4 text-center font-bold text-gray-900">100.0%</td>
                                        <td className="px-6 py-4 text-right font-bold text-gray-900">
                                            ${parseFloat(totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                )}

                {/* Breakdown Modal */}
                {breakdownEmployee && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setBreakdownEmployee(null)}>
                        <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xl font-bold text-gray-900">
                                        {breakdownEmployee.employee_name} - Contribution Breakdown
                                    </h2>
                                    <button onClick={() => setBreakdownEmployee(null)} className="text-gray-400 hover:text-gray-600 text-2xl">
                                        ×
                                    </button>
                                </div>
                            </div>

                            <div className="p-6">
                                <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                                    <div className="text-sm text-gray-600 mb-1">Total Contribution</div>
                                    <div className="text-3xl font-bold text-blue-600">
                                        {breakdownEmployee.contribution_percentage.toFixed(2)}%
                                    </div>
                                    <div className="text-lg font-semibold text-gray-900 mt-1">
                                        = ${breakdownEmployee.bonus_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </div>
                                </div>

                                <h3 className="font-semibold text-gray-900 mb-4">Project Breakdown:</h3>

                                {breakdownEmployee.calculation_details?.projects?.map((project: any, idx: number) => (
                                    <div key={idx} className="mb-4 p-4 border border-gray-200 rounded-lg">
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="font-medium text-gray-900">{project.project_name}</h4>
                                            <span className="text-sm font-semibold text-blue-600">
                                                {project.project_contribution.toFixed(1)}%
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
                                            <div>
                                                <span className="font-medium">Project Weight:</span> {project.normalized_weight.toFixed(1)}%
                                            </div>
                                            <div>
                                                <span className="font-medium">Task Completion:</span> {(project.task_ratio * 100).toFixed(1)}%
                                            </div>
                                            <div>
                                                <span className="font-medium">Performance:</span> {project.performance_score.toFixed(1)}/10
                                            </div>
                                            <div>
                                                <span className="font-medium">Task Weight:</span> {project.employee_task_weight}
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {(!breakdownEmployee.calculation_details?.projects || breakdownEmployee.calculation_details.projects.length === 0) && (
                                    <p className="text-gray-500 text-center py-4">No project data available</p>
                                )}
                            </div>

                            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
                                <button
                                    onClick={() => setBreakdownEmployee(null)}
                                    className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
