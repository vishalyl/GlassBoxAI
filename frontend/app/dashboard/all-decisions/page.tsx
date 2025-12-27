'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from '@/app/lib/api';
import { getRecentBonusDistributions } from '@/app/lib/bonus-api';
import { getRecentPromotionDecisions } from '@/app/lib/decision-api';
import { getRecentAuditRecords } from '@/app/lib/audit-api';

export default function AllDecisionsPage() {
    const router = useRouter();
    const [bonusDecisions, setBonusDecisions] = useState<any[]>([]);
    const [promotionDecisions, setPromotionDecisions] = useState<any[]>([]);
    const [auditDecisions, setAuditDecisions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        Promise.all([
            getRecentBonusDistributions(50),
            getRecentPromotionDecisions(50),
            getRecentAuditRecords(50)
        ])
            .then(([bonuses, promotions, audits]) => {
                setBonusDecisions(bonuses || []);
                setPromotionDecisions(promotions || []);
                setAuditDecisions(audits || []);
            })
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

    const totalDecisions = bonusDecisions.length + promotionDecisions.length + auditDecisions.length;

    if (loading) return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
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
                            <h1 className="text-2xl font-bold text-gray-900">📋 All Decisions</h1>
                            <p className="text-sm text-gray-600 mt-1">
                                All decisions grouped by type • {totalDecisions} total decisions
                            </p>
                        </div>
                        <Link
                            href="/decisions"
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                        >
                            + New Decision
                        </Link>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-8 py-8">
                {error && (
                    <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">{error}</div>
                )}

                {totalDecisions === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Decisions Yet</h3>
                        <p className="text-gray-600 mb-4">Create your first decision to get started.</p>
                        <Link href="/decisions" className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                            Create Decision
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* Bonus Decisions */}
                        {bonusDecisions.length > 0 && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-200 bg-blue-50 flex justify-between items-center">
                                    <div>
                                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                            💰 Bonus Distributions
                                        </h3>
                                        <p className="text-sm text-gray-600">
                                            Performance-based bonus allocations
                                        </p>
                                    </div>
                                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                                        {bonusDecisions.length} decisions
                                    </span>
                                </div>
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-6 py-3 text-sm font-medium text-gray-500">Name</th>
                                            <th className="px-6 py-3 text-sm font-medium text-gray-500">Total Amount</th>
                                            <th className="px-6 py-3 text-sm font-medium text-gray-500">Status</th>
                                            <th className="px-6 py-3 text-sm font-medium text-gray-500">Date</th>
                                            <th className="px-6 py-3 text-sm font-medium text-gray-500">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {bonusDecisions.map((decision: any) => (
                                            <tr key={decision.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 font-medium text-gray-900">
                                                    {decision.name}
                                                </td>
                                                <td className="px-6 py-4 font-mono text-blue-600 font-medium">
                                                    ${decision.total_amount_distributed?.toLocaleString() || decision.total_amount?.toLocaleString() || 0}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 capitalize">
                                                        {decision.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500">
                                                    {new Date(decision.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Link
                                                        href={`/decisions/bonus/${decision.id}`}
                                                        className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                                                    >
                                                        View →
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Promotion Decisions */}
                        {promotionDecisions.length > 0 && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-200 bg-purple-50 flex justify-between items-center">
                                    <div>
                                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                            📈 Promotion Decisions
                                        </h3>
                                        <p className="text-sm text-gray-600">
                                            Performance-based promotion recommendations
                                        </p>
                                    </div>
                                    <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                                        {promotionDecisions.length} decisions
                                    </span>
                                </div>
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-6 py-3 text-sm font-medium text-gray-500">Name</th>
                                            <th className="px-6 py-3 text-sm font-medium text-gray-500">Total Slots</th>
                                            <th className="px-6 py-3 text-sm font-medium text-gray-500">Status</th>
                                            <th className="px-6 py-3 text-sm font-medium text-gray-500">Date</th>
                                            <th className="px-6 py-3 text-sm font-medium text-gray-500">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {promotionDecisions.map((decision: any) => (
                                            <tr key={decision.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 font-medium text-gray-900">
                                                    {decision.name}
                                                </td>
                                                <td className="px-6 py-4 font-medium text-purple-600">
                                                    {decision.total_slots} slots
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 capitalize">
                                                        {decision.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500">
                                                    {new Date(decision.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Link
                                                        href={`/decisions/promotion/${decision.id}`}
                                                        className="text-purple-600 hover:text-purple-800 font-medium text-sm"
                                                    >
                                                        View →
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Audit Decisions */}
                        {auditDecisions.length > 0 && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-200 bg-amber-50 flex justify-between items-center">
                                    <div>
                                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                            🛡️ Audit Records
                                        </h3>
                                        <p className="text-sm text-gray-600">
                                            Decision audits comparing manager vs AI recommendations
                                        </p>
                                    </div>
                                    <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-medium">
                                        {auditDecisions.length} audits
                                    </span>
                                </div>
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-6 py-3 text-sm font-medium text-gray-500">Name</th>
                                            <th className="px-6 py-3 text-sm font-medium text-gray-500">Type</th>
                                            <th className="px-6 py-3 text-sm font-medium text-gray-500">Agreement Score</th>
                                            <th className="px-6 py-3 text-sm font-medium text-gray-500">Date</th>
                                            <th className="px-6 py-3 text-sm font-medium text-gray-500">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {auditDecisions.map((decision: any) => (
                                            <tr key={decision.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 font-medium text-gray-900">
                                                    {decision.name}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${decision.decision_type === 'BONUS'
                                                            ? 'bg-blue-100 text-blue-800'
                                                            : 'bg-purple-100 text-purple-800'
                                                        }`}>
                                                        {decision.decision_type}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`font-bold ${decision.agreement_score >= 80 ? 'text-green-600' : 'text-amber-600'
                                                        }`}>
                                                        {decision.agreement_score?.toFixed(0)}%
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500">
                                                    {new Date(decision.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Link
                                                        href={`/decisions/audit/${decision.id}`}
                                                        className="text-amber-600 hover:text-amber-800 font-medium text-sm"
                                                    >
                                                        Review →
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
