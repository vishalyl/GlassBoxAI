'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from '@/app/lib/api';
import { getFlaggedDecisionsByAudit } from '@/app/lib/dashboard-logic';

export default function FlaggedDecisionsPage() {
    const router = useRouter();
    const [audits, setAudits] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        getFlaggedDecisionsByAudit()
            .then(setAudits)
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    const handleSignOut = async () => {
        try {
            await signOut();
            router.push('/login');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    const totalFlagged = audits.reduce((sum, a) => sum + a.entries.length, 0);

    if (loading) return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 shadow-sm">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                                GlassBox AI
                            </h1>
                            <p className="text-sm text-gray-600">HR Decision Intelligence</p>
                        </div>
                        <nav className="flex gap-6 items-center">
                            <Link href="/dashboard" className="text-blue-600 font-medium">Dashboard</Link>
                            <Link href="/organization" className="text-gray-700 hover:text-blue-600 font-medium">Organization</Link>
                            <Link href="/projects" className="text-gray-700 hover:text-blue-600 font-medium">Projects</Link>
                            <Link href="/decisions" className="text-gray-700 hover:text-blue-600 font-medium">Decisions</Link>
                            <button onClick={handleSignOut} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                                Sign Out
                            </button>
                        </nav>
                    </div>
                </div>
            </header>

            {/* Page Title */}
            <div className="bg-white border-b border-gray-200 px-8 py-5">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                        <Link href="/dashboard" className="hover:text-blue-600 flex items-center gap-1">
                            ← Back to Dashboard
                        </Link>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">⚠️ Flagged Decisions</h1>
                            <p className="text-sm text-gray-600 mt-1">
                                All flagged audit decisions requiring review • {totalFlagged} total flags
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-8 py-8">
                {error && (
                    <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">{error}</div>
                )}

                {audits.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Flagged Decisions</h3>
                        <p className="text-gray-600">All audit decisions are within acceptable variance ranges.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {audits.map((audit) => (
                            <div key={audit.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-200 bg-red-50 flex justify-between items-center">
                                    <div>
                                        <h3 className="font-semibold text-gray-900">{audit.name}</h3>
                                        <p className="text-sm text-gray-600">
                                            {audit.decision_type} Audit • {audit.department?.name} • {new Date(audit.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                                            {audit.entries.length} flagged
                                        </span>
                                        <Link
                                            href={`/decisions/audit/${audit.id}`}
                                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                                        >
                                            Review Audit →
                                        </Link>
                                    </div>
                                </div>
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-6 py-3 text-sm font-medium text-gray-500">Employee</th>
                                            <th className="px-6 py-3 text-sm font-medium text-gray-500">Manager Decision</th>
                                            <th className="px-6 py-3 text-sm font-medium text-gray-500">AI Recommendation</th>
                                            <th className="px-6 py-3 text-sm font-medium text-gray-500">Variance</th>
                                            <th className="px-6 py-3 text-sm font-medium text-gray-500">Reason</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {audit.entries.map((entry: any) => (
                                            <tr key={entry.id} className="bg-red-50/30">
                                                <td className="px-6 py-4 font-medium text-gray-900">
                                                    {entry.employee?.name || 'Unknown'}
                                                </td>
                                                <td className="px-6 py-4 text-gray-700">
                                                    {audit.decision_type === 'BONUS'
                                                        ? `$${entry.manager_decision_value?.toLocaleString()}`
                                                        : (entry.manager_decision_value ? 'Promoted' : 'No Change')}
                                                </td>
                                                <td className="px-6 py-4 font-medium text-blue-600">
                                                    {audit.decision_type === 'BONUS'
                                                        ? `$${entry.ai_recommendation_value?.toLocaleString()}`
                                                        : `Rank #${entry.ai_recommendation_value}`}
                                                </td>
                                                <td className="px-6 py-4 font-mono font-bold text-red-600">
                                                    {audit.decision_type === 'BONUS'
                                                        ? `${entry.variance_score?.toFixed(1)}%`
                                                        : 'N/A'}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-red-700">
                                                    {entry.explanation || 'Flagged for review'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
