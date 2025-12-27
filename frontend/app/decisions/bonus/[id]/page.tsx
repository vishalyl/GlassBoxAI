'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getBonusDistribution, deleteBonusDistribution } from '@/app/lib/bonus-api';

export default function BonusDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        if (params.id) {
            getBonusDistribution(params.id as string)
                .then(setData)
                .catch(err => setError(err.message))
                .finally(() => setLoading(false));
        }
    }, [params.id]);

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this decision? This cannot be undone.')) return;
        setDeleting(true);
        try {
            await deleteBonusDistribution(params.id as string);
            router.push('/dashboard');
        } catch (err: any) {
            alert(err.message);
            setDeleting(false);
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
                <h2 className="text-xl font-bold text-red-600 mb-2">Error Loading Decision</h2>
                <p className="text-gray-600 mb-4">{error || 'Decision not found'}</p>
                <Link href="/dashboard" className="text-blue-600 hover:text-blue-700">← Back to Dashboard</Link>
            </div>
        </div>
    );

    const { distribution, allocations } = data;

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
                            <h1 className="text-2xl font-bold text-gray-900">{distribution.name}</h1>
                            <p className="text-sm text-gray-600 mt-1">
                                Bonus Distribution • {new Date(distribution.created_at).toLocaleDateString()}
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
                        <p className="text-gray-500 text-sm mb-1">Total Pool</p>
                        <p className="text-2xl font-bold text-gray-900">${distribution.total_amount?.toLocaleString()}</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <p className="text-gray-500 text-sm mb-1">Employees</p>
                        <p className="text-2xl font-bold text-gray-900">{allocations.length}</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <p className="text-gray-500 text-sm mb-1">Status</p>
                        <p className="text-2xl font-bold text-green-600 capitalize">{distribution.status}</p>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                        <h3 className="font-semibold text-gray-900">Allocations</h3>
                    </div>
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-sm font-medium text-gray-500">Employee</th>
                                <th className="px-6 py-3 text-sm font-medium text-gray-500 text-center">Contribution</th>
                                <th className="px-6 py-3 text-sm font-medium text-gray-500 text-right">Bonus Amount</th>
                                <th className="px-6 py-3 text-sm font-medium text-gray-500 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {allocations.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                        No allocations found.
                                    </td>
                                </tr>
                            ) : (
                                allocations.map((alloc: any) => (
                                    <AllocationRow key={alloc.id} allocation={alloc} />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// Allocation Row Component with Explain Modal
function AllocationRow({ allocation }: { allocation: any }) {
    const [showModal, setShowModal] = useState(false);
    const details = allocation.calculation_details;

    return (
        <>
            <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">
                    {allocation.employee_name || 'Unknown Employee'}
                </td>
                <td className="px-6 py-4 text-center">
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${allocation.contribution_percentage >= 20 ? 'bg-green-100 text-green-700' :
                            allocation.contribution_percentage >= 10 ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-700'
                        }`}>
                        {allocation.contribution_percentage?.toFixed(1) || '0.0'}%
                    </span>
                </td>
                <td className="px-6 py-4 text-right font-semibold text-gray-900">
                    ${allocation.bonus_amount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="px-6 py-4 text-right">
                    <button
                        onClick={() => setShowModal(true)}
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                    >
                        Explain Calculation
                    </button>
                </td>
            </tr>

            {/* Modal */}
            {showModal && (
                <tr>
                    <td colSpan={4} className="p-0">
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
                                            {allocation.employee_name} - Contribution Breakdown
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
                                    <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                                        <div className="text-sm text-gray-600 mb-1">Total Contribution</div>
                                        <div className="text-3xl font-bold text-blue-600">
                                            {allocation.contribution_percentage?.toFixed(2)}%
                                        </div>
                                        <div className="text-lg font-semibold text-gray-900 mt-1">
                                            = ${allocation.bonus_amount?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                        </div>
                                    </div>

                                    <h3 className="font-semibold text-gray-900 mb-4">Project Breakdown:</h3>

                                    {details?.projects?.map((project: any, idx: number) => (
                                        <div key={idx} className="mb-4 p-4 border border-gray-200 rounded-lg">
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="font-medium text-gray-900">{project.project_name}</h4>
                                                <span className="text-sm font-semibold text-blue-600">
                                                    {project.project_contribution?.toFixed(1)}%
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
                                                <div>
                                                    <span className="font-medium">Project Weight:</span> {project.normalized_weight?.toFixed(1)}%
                                                </div>
                                                <div>
                                                    <span className="font-medium">Task Completion:</span> {((project.task_ratio || 0) * 100).toFixed(1)}%
                                                </div>
                                                <div>
                                                    <span className="font-medium">Performance:</span> {project.performance_score?.toFixed(1)}/10
                                                </div>
                                                <div>
                                                    <span className="font-medium">Task Weight:</span> {project.employee_task_weight}
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
                                        className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
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
