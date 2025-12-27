'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getPromotionDecision, deletePromotionDecision } from '@/app/lib/decision-api';

export default function PromotionDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        if (params.id) {
            getPromotionDecision(params.id as string)
                .then(setData)
                .catch(err => setError(err.message))
                .finally(() => setLoading(false));
        }
    }, [params.id]);

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this decision? This cannot be undone.')) return;
        setDeleting(true);
        try {
            await deletePromotionDecision(params.id as string);
            router.push('/dashboard');
        } catch (err: any) {
            alert(err.message);
            setDeleting(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    if (error || !data) return (
        <div className="min-h-screen bg-gray-50 p-8 flex justify-center">
            <div className="bg-white p-6 rounded-lg shadow-md max-w-lg w-full text-center">
                <h2 className="text-xl font-bold text-red-600 mb-2">Error Loading Decision</h2>
                <p className="text-gray-600 mb-4">{error || 'Decision not found'}</p>
                <Link href="/dashboard" className="text-purple-600 hover:text-purple-700">← Back to Dashboard</Link>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-8 py-5">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                        <Link href="/dashboard" className="hover:text-purple-600 flex items-center gap-1">
                            ← Back to Dashboard
                        </Link>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">{data.name}</h1>
                            <p className="text-sm text-gray-600 mt-1">
                                Promotion Decision • {new Date(data.created_at).toLocaleDateString()}
                            </p>
                        </div>
                        <button
                            onClick={handleDelete}
                            disabled={deleting}
                            className="px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 disabled:opacity-50 text-sm font-medium"
                        >
                            {deleting ? 'Deleting...' : 'Delete Decision'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-8 py-8">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <p className="text-gray-500 text-sm mb-1">Total Slots</p>
                        <p className="text-2xl font-bold text-gray-900">{data.total_slots}</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <p className="text-gray-500 text-sm mb-1">Candidates Evaluated</p>
                        <p className="text-2xl font-bold text-gray-900">{data.candidates?.length || 0}</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <p className="text-gray-500 text-sm mb-1">Status</p>
                        <p className="text-2xl font-bold text-green-600 capitalize">{data.status}</p>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                        <h3 className="font-semibold text-gray-900">Candidates & Ranking</h3>
                    </div>
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-sm font-medium text-gray-500">Rank</th>
                                <th className="px-6 py-3 text-sm font-medium text-gray-500">Employee</th>
                                <th className="px-6 py-3 text-sm font-medium text-gray-500">Role</th>
                                <th className="px-6 py-3 text-sm font-medium text-gray-500 text-center">Score</th>
                                <th className="px-6 py-3 text-sm font-medium text-gray-500">Recommendation</th>
                                <th className="px-6 py-3 text-sm font-medium text-gray-500 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {data.candidates?.map((cand: any) => (
                                <CandidateRow key={cand.id} candidate={cand} />
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// Candidate Row Component with Explain Modal
function CandidateRow({ candidate }: { candidate: any }) {
    const [showModal, setShowModal] = useState(false);
    const details = candidate.calculation_details;

    return (
        <>
            <tr className={`hover:bg-gray-50 ${candidate.is_recommended ? 'bg-purple-50' : ''}`}>
                <td className="px-6 py-4 font-bold text-gray-700">#{candidate.rank}</td>
                <td className="px-6 py-4 font-medium text-gray-900">{candidate.employee?.name}</td>
                <td className="px-6 py-4 text-gray-600">{candidate.employee?.role_title}</td>
                <td className="px-6 py-4 text-center">
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${candidate.score >= 20 ? 'bg-green-100 text-green-700' :
                            candidate.score >= 10 ? 'bg-purple-100 text-purple-700' :
                                'bg-gray-100 text-gray-700'
                        }`}>
                        {candidate.score?.toFixed(2)}
                    </span>
                </td>
                <td className="px-6 py-4">
                    {candidate.is_recommended ? (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">✅ Recommended</span>
                    ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">Waitlist</span>
                    )}
                </td>
                <td className="px-6 py-4 text-right">
                    <button
                        onClick={() => setShowModal(true)}
                        className="text-purple-600 hover:text-purple-800 font-medium text-sm"
                    >
                        Explain Calculation
                    </button>
                </td>
            </tr>

            {/* Modal */}
            {showModal && (
                <tr>
                    <td colSpan={6} className="p-0">
                        <div
                            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                            onClick={() => setShowModal(false)}
                        >
                            <div
                                className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-xl font-bold text-gray-900">
                                            {candidate.employee?.name} - Performance Breakdown
                                        </h2>
                                        <button
                                            onClick={() => setShowModal(false)}
                                            className="text-gray-400 hover:text-gray-600 text-2xl"
                                        >
                                            ×
                                        </button>
                                    </div>
                                </div>

                                <div className="p-6">
                                    <div className="mb-6 p-4 bg-purple-50 rounded-lg">
                                        <div className="text-sm text-gray-600 mb-1">Total Performance Score</div>
                                        <div className="text-3xl font-bold text-purple-600">
                                            {candidate.score?.toFixed(2)}
                                        </div>
                                        <div className="text-lg font-semibold text-gray-900 mt-1">
                                            Rank #{candidate.rank} {candidate.is_recommended ? '• ✅ Recommended' : '• Waitlist'}
                                        </div>
                                    </div>

                                    <h3 className="font-semibold text-gray-900 mb-4">Project Contributions:</h3>

                                    {details?.projects?.map((project: any, idx: number) => (
                                        <div key={idx} className="mb-4 p-4 border border-gray-200 rounded-lg">
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="font-medium text-gray-900">{project.project_name}</h4>
                                                <span className="text-sm font-semibold text-purple-600">
                                                    Score: {project.performance_score?.toFixed(1)}/10
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
                                                <div>
                                                    <span className="font-medium">Contribution Impact:</span> {project.contribution_score?.toFixed(2)}
                                                </div>
                                                <div>
                                                    <span className="font-medium">Task Ratio:</span> {((project.task_ratio || 0) * 100).toFixed(1)}%
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {(!details?.projects || details.projects.length === 0) && (
                                        <p className="text-gray-500 text-center py-4">No project data available</p>
                                    )}
                                </div>

                                <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
                                    <button
                                        onClick={() => setShowModal(false)}
                                        className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
}
