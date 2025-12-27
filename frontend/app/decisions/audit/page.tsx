'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    getDepartments,
    getEmployees,
    signOut,
    type Department,
    type Employee
} from '@/app/lib/api';
import {
    auditBonusDecision,
    auditPromotionDecision,
    saveAuditRecord,
    type AuditResult,
    type ManagerInput
} from '@/app/lib/audit-api';

export default function AuditPage() {
    const router = useRouter();

    const handleSignOut = async () => {
        try {
            await signOut();
            router.push('/login');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    // State
    const [auditType, setAuditType] = useState<'BONUS' | 'PROMOTION'>('BONUS');
    const [selectedDept, setSelectedDept] = useState<string>('');
    const [totalBonusPool, setTotalBonusPool] = useState<string>('');

    // Data
    const [departments, setDepartments] = useState<Department[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);

    // Inputs
    const [managerInputs, setManagerInputs] = useState<Record<string, number>>({});

    // Results
    const [results, setResults] = useState<AuditResult[]>([]);
    const [auditing, setAuditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Explain Modal
    const [explainEntry, setExplainEntry] = useState<AuditResult | null>(null);

    useEffect(() => {
        getDepartments().then(setDepartments).catch(err => console.error(err));
    }, []);

    useEffect(() => {
        if (!selectedDept) {
            setEmployees([]);
            return;
        }
        getEmployees().then(all => {
            const filtered = all.filter(e => e.department_id === selectedDept);
            setEmployees(filtered);
            const initialInputs: Record<string, number> = {};
            filtered.forEach(e => {
                initialInputs[e.id] = 0;
            });
            setManagerInputs(initialInputs);
            setResults([]);
        });
    }, [selectedDept]);

    const handleInputChange = (empId: string, value: string | boolean) => {
        setManagerInputs(prev => ({
            ...prev,
            [empId]: typeof value === 'boolean' ? (value ? 1 : 0) : parseFloat(value) || 0
        }));
    };

    const flagDecision = (empId: string) => {
        setResults(prev => prev.map(r =>
            r.employee_id === empId
                ? { ...r, is_flagged: true }
                : r
        ));
    };

    const runAudit = async () => {
        if (!selectedDept) {
            setError('Please select a department');
            return;
        }
        if (auditType === 'BONUS') {
            const pool = parseFloat(totalBonusPool);
            if (!pool || pool <= 0) {
                setError('Please enter the total bonus pool distributed by the manager');
                return;
            }
        }

        setAuditing(true);
        setError(null);
        setResults([]);

        try {
            const inputs: ManagerInput[] = employees.map(e => ({
                employee_id: e.id,
                value: managerInputs[e.id] || 0
            }));

            let auditResults: AuditResult[] = [];

            if (auditType === 'BONUS') {
                auditResults = await auditBonusDecision(
                    parseFloat(totalBonusPool),
                    inputs,
                    [selectedDept]
                );
            } else {
                auditResults = await auditPromotionDecision(
                    inputs,
                    [selectedDept]
                );
            }

            setResults(auditResults);
        } catch (err: any) {
            console.error('Audit failed:', err);
            setError(err.message || 'Audit failed');
        } finally {
            setAuditing(false);
        }
    };

    const handleSave = async () => {
        if (results.length === 0) return;
        const name = prompt('Enter a name for this audit record (e.g. "Sales Q3 Bonus Check"):');
        if (!name) return;

        setSaving(true);
        try {
            await saveAuditRecord(name, auditType, selectedDept, results);
            setSuccessMessage('Audit record saved successfully!');
            setTimeout(() => router.push('/decisions'), 1500);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const flaggedCount = results.filter(r => r.is_flagged).length;

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

            {/* Page Title */}
            <div className="bg-white border-b border-gray-200 px-8 py-5">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                    <Link href="/decisions" className="hover:text-blue-600 flex items-center gap-1">
                        ← Back to Decisions
                    </Link>
                </div>
                <h1 className="text-2xl font-bold text-gray-900">🛡️ Decision Audit</h1>
                <p className="text-sm text-gray-600 mt-1">Validate manager decisions against AI recommendations to detect bias</p>
            </div>

            <div className="max-w-7xl mx-auto px-8 py-8">
                {error && <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">{error}</div>}
                {successMessage && <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-lg border border-green-200">{successMessage}</div>}

                {/* Setup Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Audit Type</label>
                            <div className="flex bg-gray-100 p-1 rounded-lg">
                                <button
                                    onClick={() => setAuditType('BONUS')}
                                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${auditType === 'BONUS' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    💰 Bonus
                                </button>
                                <button
                                    onClick={() => setAuditType('PROMOTION')}
                                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${auditType === 'PROMOTION' ? 'bg-white shadow text-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    📈 Promotion
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Select Department</label>
                            <select
                                value={selectedDept}
                                onChange={(e) => setSelectedDept(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">-- Choose Department --</option>
                                {departments.map(d => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                        </div>

                        {auditType === 'BONUS' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Manager's Total Pool ($)</label>
                                <input
                                    type="number"
                                    value={totalBonusPool}
                                    onChange={(e) => setTotalBonusPool(e.target.value)}
                                    placeholder="Total amount distributed"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Input Grid */}
                {selectedDept && results.length === 0 && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
                        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                            <h3 className="font-semibold text-gray-900">Enter Manager's Decisions</h3>
                            <button
                                onClick={runAudit}
                                disabled={auditing}
                                className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                                {auditing ? 'Running Analysis...' : '🔍 Run Audit Analysis'}
                            </button>
                        </div>
                        <div className="p-0">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3 text-sm font-medium text-gray-500">Employee</th>
                                        <th className="px-6 py-3 text-sm font-medium text-gray-500">Role</th>
                                        <th className="px-6 py-3 text-sm font-medium text-gray-500">
                                            {auditType === 'BONUS' ? "Manager's Bonus Amount ($)" : "Manager Promoted?"}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {employees.map(emp => (
                                        <tr key={emp.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 font-medium text-gray-900">{emp.name}</td>
                                            <td className="px-6 py-4 text-gray-500 text-sm">{emp.role_title}</td>
                                            <td className="px-6 py-4">
                                                {auditType === 'BONUS' ? (
                                                    <input
                                                        type="number"
                                                        value={managerInputs[emp.id] || ''}
                                                        onChange={(e) => handleInputChange(emp.id, e.target.value)}
                                                        className="w-48 px-3 py-1 border border-gray-300 rounded focus:ring-blue-500"
                                                        placeholder="0.00"
                                                    />
                                                ) : (
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={!!managerInputs[emp.id]}
                                                            onChange={(e) => handleInputChange(emp.id, e.target.checked)}
                                                            className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                                                        />
                                                        <span className="text-sm text-gray-700">Promoted</span>
                                                    </label>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Audit Results */}
                {results.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Audit Results</h2>
                                <p className="text-sm text-gray-500">
                                    Comparing Human Decision vs AI Recommendation •
                                    <span className="ml-1 text-red-600 font-medium">{flaggedCount} flagged</span>
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setResults([])} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg">
                                    Edit Inputs
                                </button>
                                <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700">
                                    {saving ? 'Saving...' : '💾 Save Audit Record'}
                                </button>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3 text-sm font-medium text-gray-500">Employee</th>
                                        <th className="px-6 py-3 text-sm font-medium text-gray-500">Manager Decision</th>
                                        <th className="px-6 py-3 text-sm font-medium text-gray-500">AI Recommendation</th>
                                        <th className="px-6 py-3 text-sm font-medium text-gray-500">Variance</th>
                                        <th className="px-6 py-3 text-sm font-medium text-gray-500">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {results.map((res) => (
                                        <tr key={res.employee_id} className={res.is_flagged ? 'bg-red-50' : 'hover:bg-gray-50'}>
                                            <td className="px-6 py-4 font-bold text-gray-900">{res.employee_name}</td>
                                            <td className="px-6 py-4">
                                                {auditType === 'BONUS'
                                                    ? <span className="font-mono font-medium text-gray-700">${res.manager_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                    : (res.manager_value ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Promoted</span> : <span className="text-gray-400">No Change</span>)
                                                }
                                            </td>
                                            <td className="px-6 py-4">
                                                {auditType === 'BONUS'
                                                    ? <span className="font-mono font-medium text-blue-700">${res.ai_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                    : (
                                                        <span className="font-medium text-blue-600">Rank #{res.ai_value}</span>
                                                    )
                                                }
                                            </td>
                                            <td className="px-6 py-4">
                                                {auditType === 'BONUS' ? (
                                                    <span className={`font-bold ${res.variance > 20 ? 'text-red-600' : 'text-green-600'}`}>
                                                        {res.variance.toFixed(1)}%
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-gray-400 font-mono">N/A</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-2">
                                                    {/* Flag Button */}
                                                    {res.is_flagged ? (
                                                        <span className="px-3 py-1.5 rounded-md text-xs font-semibold border flex items-center gap-2 w-fit bg-red-100 text-red-900 border-red-200">
                                                            ⚠️ Flagged
                                                        </span>
                                                    ) : (
                                                        <button
                                                            onClick={() => flagDecision(res.employee_id)}
                                                            className="px-3 py-1.5 rounded-md text-xs font-semibold border flex items-center gap-2 w-fit transition-colors shadow-sm bg-amber-100 text-amber-900 border-amber-200 hover:bg-amber-200"
                                                        >
                                                            🚩 Flag
                                                        </button>
                                                    )}

                                                    {/* Explain Calculation Button */}
                                                    <button
                                                        onClick={() => setExplainEntry(res)}
                                                        className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                                                    >
                                                        Explain Calculation
                                                    </button>

                                                    {res.is_flagged && res.reason && (
                                                        <div className="text-xs text-red-800 bg-white p-2 rounded border border-red-200 shadow-sm font-medium">
                                                            {res.reason}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Explain Calculation Modal */}
            {explainEntry && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                    onClick={() => setExplainEntry(null)}
                >
                    <div
                        className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-gray-900">
                                    {explainEntry.employee_name} - AI Calculation
                                </h2>
                                <button
                                    onClick={() => setExplainEntry(null)}
                                    className="text-gray-400 hover:text-gray-600 text-2xl"
                                >
                                    ×
                                </button>
                            </div>
                        </div>

                        <div className="p-6">
                            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="text-sm text-gray-600 mb-1">Manager Decision</div>
                                        <div className="text-2xl font-bold text-gray-900">
                                            {auditType === 'BONUS'
                                                ? `$${explainEntry.manager_value.toLocaleString()}`
                                                : (explainEntry.manager_value ? 'Promoted' : 'Not Promoted')}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-gray-600 mb-1">AI Recommendation</div>
                                        <div className="text-2xl font-bold text-blue-600">
                                            {auditType === 'BONUS'
                                                ? `$${explainEntry.ai_value.toLocaleString()}`
                                                : `Rank #${explainEntry.ai_value}`}
                                        </div>
                                    </div>
                                </div>
                                {auditType === 'BONUS' && (
                                    <div className="mt-4 pt-4 border-t border-blue-200">
                                        <div className="text-sm text-gray-600 mb-1">Variance</div>
                                        <div className={`text-xl font-bold ${explainEntry.variance > 20 ? 'text-red-600' : 'text-green-600'}`}>
                                            {explainEntry.variance.toFixed(1)}%
                                        </div>
                                    </div>
                                )}
                            </div>

                            <h3 className="font-semibold text-gray-900 mb-4">How AI Calculated This:</h3>

                            <div className="space-y-3 text-sm text-gray-700">
                                {auditType === 'BONUS' ? (
                                    <>
                                        <div className="p-3 bg-gray-50 rounded-lg">
                                            <p className="font-medium mb-2">📊 Performance-Based Bonus Formula:</p>
                                            <p className="text-gray-600">
                                                AI calculates bonus based on: Project Weight × Task Contribution × Performance Score
                                            </p>
                                        </div>
                                        <div className="p-3 bg-gray-50 rounded-lg">
                                            <p className="font-medium mb-2">📈 Performance Score Components:</p>
                                            <ul className="list-disc list-inside text-gray-600 space-y-1">
                                                <li>Manager Rating (40% weight)</li>
                                                <li>Peer Rating (30% weight)</li>
                                                <li>KPI Metrics (30% weight)</li>
                                            </ul>
                                        </div>
                                        <div className="p-3 bg-gray-50 rounded-lg">
                                            <p className="font-medium mb-2">🎯 Task Contribution:</p>
                                            <p className="text-gray-600">
                                                Calculated as the ratio of employee's task weights to total project task weights
                                            </p>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="p-3 bg-gray-50 rounded-lg">
                                            <p className="font-medium mb-2">📊 Promotion Ranking Formula:</p>
                                            <p className="text-gray-600">
                                                AI ranks candidates by: Total Performance Score across all projects
                                            </p>
                                        </div>
                                        <div className="p-3 bg-gray-50 rounded-lg">
                                            <p className="font-medium mb-2">📈 Score Components:</p>
                                            <ul className="list-disc list-inside text-gray-600 space-y-1">
                                                <li>Project Weight × Task Volume × Performance Ratings</li>
                                                <li>Manager, Peer, and KPI ratings factored in</li>
                                            </ul>
                                        </div>
                                    </>
                                )}
                            </div>

                            {explainEntry.is_flagged && explainEntry.reason && (
                                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                                    <p className="font-semibold text-red-800 mb-1">⚠️ Flag Reason:</p>
                                    <p className="text-red-700">{explainEntry.reason}</p>
                                </div>
                            )}
                        </div>

                        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
                            <button
                                onClick={() => setExplainEntry(null)}
                                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
