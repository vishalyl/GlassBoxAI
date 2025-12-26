'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getAuditRecord, deleteAuditRecord, updateAuditEntryFlag } from '@/app/lib/audit-api';

export default function AuditDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        if (params.id) {
            getAuditRecord(params.id as string)
                .then(setData)
                .catch(err => setError(err.message))
                .finally(() => setLoading(false));
        }
    }, [params.id]);

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this audit record? This cannot be undone.')) return;
        setDeleting(true);
        try {
            await deleteAuditRecord(params.id as string);
            router.push('/dashboard');
        } catch (err: any) {
            alert(err.message);
            setDeleting(false);
        }
    };

    const toggleFlag = async (entry: any) => {
        const newValue = !entry.is_flagged;
        const updatedEntries = data.entries.map((e: any) =>
            e.id === entry.id ? { ...e, is_flagged: newValue } : e
        );
        setData((prev: any) => ({ ...prev, entries: updatedEntries }));

        try {
            await updateAuditEntryFlag(entry.id, newValue);
        } catch (err: any) {
            console.error(err);
            alert('Failed to update flag status');
            getAuditRecord(params.id as string).then(setData);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    if (error || !data) return (
        <div className="min-h-screen bg-gray-50 p-8 flex justify-center">
            <div className="bg-white p-6 rounded-lg shadow-md max-w-lg w-full text-center">
                <h2 className="text-xl font-bold text-red-600 mb-2">Error Loading Audit</h2>
                <p className="text-gray-600 mb-4">{error || 'Record not found'}</p>
                <Link href="/dashboard" className="text-blue-600 hover:text-blue-700">← Back to Dashboard</Link>
            </div>
        </div>
    );

    const isBonus = data.decision_type === 'BONUS' || data.audit_type === 'BONUS';
    const totalBonus = data.entries?.reduce((sum: number, e: any) => sum + (e.manager_decision_value || 0), 0);
    const totalAiBonus = data.entries?.reduce((sum: number, e: any) => sum + (e.ai_recommendation_value || 0), 0);

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-8 py-5">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                        <Link href="/dashboard" className="hover:text-blue-600 flex items-center gap-1">
                            ← Back to Dashboard
                        </Link>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">{data.name}</h1>
                            <p className="text-sm text-gray-600 mt-1">
                                {isBonus ? 'Bonus Audit' : 'Promotion Audit'} • {data.department?.name} • {new Date(data.created_at).toLocaleDateString()}
                            </p>
                        </div>
                        <button
                            onClick={handleDelete}
                            disabled={deleting}
                            className="px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 disabled:opacity-50 text-sm font-medium"
                        >
                            {deleting ? 'Deleting...' : 'Delete Record'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-8 py-8">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <p className="text-gray-500 text-sm mb-1">Agreement Score</p>
                        <p className={`text-2xl font-bold ${data.agreement_score >= 80 ? 'text-green-600' : 'text-amber-600'}`}>
                            {data.agreement_score?.toFixed(1)}%
                        </p>
                    </div>
                    {isBonus && (
                        <>
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                                <p className="text-gray-500 text-sm mb-1">Total Manager Bonus</p>
                                <p className="text-2xl font-bold text-gray-900">${totalBonus?.toLocaleString()}</p>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                                <p className="text-gray-500 text-sm mb-1">Total AI Suggestion</p>
                                <p className="text-2xl font-bold text-blue-600">${totalAiBonus?.toLocaleString()}</p>
                            </div>
                        </>
                    )}
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                        <h3 className="font-semibold text-gray-900">Audit Entries</h3>
                    </div>
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-sm font-medium text-gray-500">Employee</th>
                                <th className="px-6 py-3 text-sm font-medium text-gray-500">Manager Decision</th>
                                <th className="px-6 py-3 text-sm font-medium text-gray-500">AI Recommendation</th>
                                <th className="px-6 py-3 text-sm font-medium text-gray-500">Variance</th>
                                <th className="px-6 py-3 text-sm font-medium text-gray-500 min-w-[200px]">Analysis (Toggle)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {data.entries?.map((entry: any) => (
                                <tr key={entry.id} className={entry.is_flagged ? 'bg-red-50/50' : 'hover:bg-gray-50'}>
                                    <td className="px-6 py-4 font-bold text-gray-900">{entry.employee?.name}</td>
                                    <td className="px-6 py-4 font-medium text-gray-900">
                                        {isBonus
                                            ? `$${entry.manager_decision_value?.toLocaleString()}`
                                            : (entry.manager_decision_value ? 'Promoted' : 'No Change')}
                                    </td>
                                    <td className="px-6 py-4 font-bold text-blue-700">
                                        {isBonus
                                            ? `$${entry.ai_recommendation_value?.toLocaleString()}`
                                            : `Rank #${entry.ai_recommendation_value}`}
                                    </td>
                                    <td className={`px-6 py-4 font-mono font-medium ${entry.variance_score > 20 ? 'text-red-700' : 'text-gray-900'}`}>
                                        {isBonus ? `${entry.variance_score?.toFixed(1)}%` : 'N/A'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-2">
                                            <button
                                                onClick={() => toggleFlag(entry)}
                                                className={`px-3 py-1.5 rounded-md text-xs font-semibold border flex items-center gap-2 w-fit transition-colors shadow-sm ${entry.is_flagged
                                                        ? 'bg-red-100 text-red-900 border-red-200 hover:bg-red-200'
                                                        : 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200'
                                                    }`}
                                            >
                                                {entry.is_flagged ? (
                                                    <><span>⚠️</span> Flagged</>
                                                ) : (
                                                    <><span>✅</span> Fair Match</>
                                                )}
                                            </button>

                                            {entry.is_flagged && entry.explanation && (
                                                <div className="text-xs text-red-800 bg-white p-2 rounded border border-red-200 shadow-sm mt-1 font-medium">
                                                    {entry.explanation}
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
        </div>
    );
}
