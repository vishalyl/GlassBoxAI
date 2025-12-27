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
    const [explainEntry, setExplainEntry] = useState<any>(null);

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

    const flagDecision = async (entry: any) => {
        // Only allow flagging (one-way)
        if (entry.is_flagged) return;

        const updatedEntries = data.entries.map((e: any) =>
            e.id === entry.id ? { ...e, is_flagged: true } : e
        );
        setData((prev: any) => ({ ...prev, entries: updatedEntries }));

        try {
            await updateAuditEntryFlag(entry.id, true);
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
    const flaggedCount = data.entries?.filter((e: any) => e.is_flagged).length || 0;

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
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <p className="text-gray-500 text-sm mb-1">Agreement Score</p>
                        <p className={`text-2xl font-bold ${data.agreement_score >= 80 ? 'text-green-600' : 'text-amber-600'}`}>
                            {data.agreement_score?.toFixed(1)}%
                        </p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <p className="text-gray-500 text-sm mb-1">Flagged Decisions</p>
                        <p className={`text-2xl font-bold ${flaggedCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {flaggedCount}
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
                                <th className="px-6 py-3 text-sm font-medium text-gray-500 min-w-[250px]">Actions</th>
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
                                            {/* Flag Button */}
                                            {entry.is_flagged ? (
                                                <span className="px-3 py-1.5 rounded-md text-xs font-semibold border flex items-center gap-2 w-fit bg-red-100 text-red-900 border-red-200">
                                                    ⚠️ Flagged
                                                </span>
                                            ) : (
                                                <button
                                                    onClick={() => flagDecision(entry)}
                                                    className="px-3 py-1.5 rounded-md text-xs font-semibold border flex items-center gap-2 w-fit transition-colors shadow-sm bg-amber-100 text-amber-900 border-amber-200 hover:bg-amber-200"
                                                >
                                                    🚩 Flag
                                                </button>
                                            )}

                                            {/* Explain Calculation Button */}
                                            <button
                                                onClick={() => setExplainEntry(entry)}
                                                className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                                            >
                                                Explain Calculation
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
                                    {explainEntry.employee?.name} - AI Calculation
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
                                            {isBonus
                                                ? `$${explainEntry.manager_decision_value?.toLocaleString()}`
                                                : (explainEntry.manager_decision_value ? 'Promoted' : 'Not Promoted')}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-gray-600 mb-1">AI Recommendation</div>
                                        <div className="text-2xl font-bold text-blue-600">
                                            {isBonus
                                                ? `$${explainEntry.ai_recommendation_value?.toLocaleString()}`
                                                : `Rank #${explainEntry.ai_recommendation_value}`}
                                        </div>
                                    </div>
                                </div>
                                {isBonus && (
                                    <div className="mt-4 pt-4 border-t border-blue-200">
                                        <div className="text-sm text-gray-600 mb-1">Variance</div>
                                        <div className={`text-xl font-bold ${explainEntry.variance_score > 20 ? 'text-red-600' : 'text-green-600'}`}>
                                            {explainEntry.variance_score?.toFixed(1)}%
                                        </div>
                                    </div>
                                )}
                            </div>

                            <h3 className="font-semibold text-gray-900 mb-4">How AI Calculated This:</h3>

                            <div className="space-y-3 text-sm text-gray-700">
                                {isBonus ? (
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

                            {explainEntry.is_flagged && explainEntry.explanation && (
                                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                                    <p className="font-semibold text-red-800 mb-1">⚠️ Flag Reason:</p>
                                    <p className="text-red-700">{explainEntry.explanation}</p>
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
