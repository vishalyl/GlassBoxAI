'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getCurrentUser, getDecisions, signOut } from '@/app/lib/api';
import { getDashboardAnalytics } from '@/app/lib/dashboard-logic';
import { getRecentBonusDistributions } from '@/app/lib/bonus-api';
import { getRecentPromotionDecisions } from '@/app/lib/decision-api';
import { getRecentAuditRecords } from '@/app/lib/audit-api';
import type { Decision, DashboardAnalytics } from '@/app/lib/api';

export default function DashboardPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [recentDecisions, setRecentDecisions] = useState<Decision[]>([]);
    const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
    const [userName, setUserName] = useState('');

    useEffect(() => {
        loadDashboardData();
    }, []);

    async function loadDashboardData() {
        try {
            // Get current user
            const user = await getCurrentUser();
            if (!user) {
                router.push('/login');
                return;
            }
            setUserName(user.user_metadata?.full_name || user.email || 'User');

            // Load recent decisions (handle errors gracefully)
            try {
                const [bonuses, promotions, audits] = await Promise.all([
                    getRecentBonusDistributions(3),
                    getRecentPromotionDecisions(3),
                    getRecentAuditRecords(3)
                ]);

                // Map to unified structure matching Decision interface (mostly)
                const unified: any[] = [
                    ...(bonuses || []).map((b: any) => ({
                        id: b.id, name: b.name, decision_type: 'Bonus', created_at: b.created_at, status: b.status, description: `$${b.total_amount_distributed}`
                    })),
                    ...(promotions || []).map((p: any) => ({
                        id: p.id, name: p.name, decision_type: 'Promotion', created_at: p.created_at, status: p.status, description: `${p.total_slots} Slots`
                    })),
                    ...(audits || []).map((a: any) => ({
                        id: a.id, name: a.name, decision_type: 'Audit', created_at: a.created_at, status: a.agreement_score > 80 ? 'completed' : 'review', description: `${a.agreement_score.toFixed(0)}% Agreement`
                    }))
                ];

                unified.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                setRecentDecisions(unified.slice(0, 5));
            } catch (error) {
                console.error('Error loading decisions:', error);
                setRecentDecisions([]);
            }

            // Load analytics (handle errors gracefully)
            try {
                const analyticsData = await getDashboardAnalytics();
                setAnalytics(analyticsData);
            } catch (error) {
                console.error('Error loading analytics:', error);
                // Set default analytics
                setAnalytics({
                    total_decisions: 0,
                    pending_decisions: 0,
                    analyzed_decisions: 0,
                    high_risk_decisions: 0,
                    avg_risk_score: 0,
                    decisions_by_type: {},
                    active_employees: 0,
                    total_projects: 0
                });
            }

            setLoading(false);
        } catch (error) {
            console.error('Error loading dashboard:', error);
            // Only redirect if it's an auth error
            if (error instanceof Error && error.message.includes('Unauthorized')) {
                router.push('/login');
            } else {
                setLoading(false);
            }
        }
    }

    async function handleSignOut() {
        try {
            await signOut();
            router.push('/login');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    }

    function getRiskColor(riskLevel?: string) {
        switch (riskLevel) {
            case 'low': return 'bg-green-100 text-green-700';
            case 'moderate': return 'bg-amber-100 text-amber-700';
            case 'high': return 'bg-red-100 text-red-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    }

    function getStatusColor(status: string) {
        switch (status) {
            case 'finalized': return 'bg-blue-100 text-blue-700';
            case 'analyzed': return 'bg-purple-100 text-purple-700';
            case 'reviewed': return 'bg-indigo-100 text-indigo-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
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
                            <Link href="/dashboard" className="text-gray-700 hover:text-blue-600 font-medium">
                                Dashboard
                            </Link>
                            <Link href="/organization" className="text-gray-700 hover:text-blue-600 font-medium">
                                Organization
                            </Link>
                            <Link href="/projects" className="text-gray-700 hover:text-blue-600 font-medium">
                                Projects
                            </Link>
                            <Link href="/decisions" className="text-gray-700 hover:text-blue-600 font-medium">
                                Decisions
                            </Link>
                            <Link href="/analytics" className="text-gray-700 hover:text-blue-600 font-medium">
                                Analytics
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

            {/* Main Content */}
            <main className="container mx-auto px-4 py-8">
                {/* Welcome Banner */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl p-8 text-white mb-8 shadow-lg">
                    <h2 className="text-3xl font-bold mb-2">Welcome back, {userName}!</h2>
                    <p className="text-blue-100">
                        Make transparent, ethical HR decisions with AI-powered insights
                    </p>
                </div>

                {/* Quick Stats */}
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 text-sm mb-1">Total Decisions</p>
                                <p className="text-3xl font-bold text-gray-900">
                                    {analytics?.total_decisions || 0}
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </div>
                        </div>
                        <Link href="/dashboard/all-decisions" className="text-blue-600 hover:text-blue-700 text-xs font-medium mt-2 inline-block">
                            View all decisions →
                        </Link>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 text-sm mb-1">Audits Run</p>
                                <p className="text-3xl font-bold text-gray-900">
                                    {analytics?.analyzed_decisions || 0}
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 text-sm mb-1">Projects Tracked</p>
                                <p className="text-3xl font-bold text-gray-900">
                                    {analytics?.total_projects || 0}
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 text-sm mb-1">Flagged Decisions</p>
                                <p className="text-3xl font-bold text-red-600">
                                    {analytics?.high_risk_decisions || 0}
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                        </div>
                        <Link href="/dashboard/flagged" className="text-red-600 hover:text-red-700 text-xs font-medium mt-2 inline-block">
                            View all flagged →
                        </Link>
                    </div>
                </div>

                {/* Recent Decisions */}
                <div className="bg-white rounded-lg shadow-md border border-gray-100 p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-gray-900">Recent Decisions</h3>
                        <Link href="/dashboard/all-decisions" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                            View All decisions
                        </Link>
                    </div>

                    {recentDecisions.length > 0 ? (
                        <div className="space-y-4">
                            {recentDecisions.map((decision) => (
                                <div key={decision.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                            <span className="text-blue-600 font-bold">{decision.decision_type[0].toUpperCase()}</span>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-gray-900">
                                                {decision.name}
                                            </h4>
                                            <p className="text-sm text-gray-600 capitalize">{decision.decision_type} Decision</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${getStatusColor(decision.status)}`}>
                                            {decision.status}
                                        </span>
                                        <Link
                                            href={`/decisions/${decision.decision_type?.toLowerCase()}/${decision.id}`}
                                            className="text-blue-600 hover:text-blue-700 font-medium"
                                        >
                                            View →
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">No decisions yet</h3>
                            <p className="text-gray-600 mb-4">Create your first decision to get started with GlassBox AI</p>
                            <Link href="/decisions" className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                                View Decisions
                            </Link>
                        </div>
                    )}
                </div>

                {/* Getting Started Guide */}
                <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Getting Started</h3>
                    <div className="grid md:grid-cols-3 gap-4">
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">1</div>
                            <div>
                                <h4 className="font-semibold text-gray-900">Create a Decision</h4>
                                <p className="text-sm text-gray-600">Upload employee data or enter manually</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">2</div>
                            <div>
                                <h4 className="font-semibold text-gray-900">Analyze for Bias</h4>
                                <p className="text-sm text-gray-600">AI compares to peer cohorts</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">3</div>
                            <div>
                                <h4 className="font-semibold text-gray-900">Review & Finalize</h4>
                                <p className="text-sm text-gray-600">Make informed, transparent decisions</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
