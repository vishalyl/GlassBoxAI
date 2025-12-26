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
                                <th className="px-6 py-3 text-sm font-medium text-gray-500">Amount</th>
                                <th className="px-6 py-3 text-sm font-medium text-gray-500">% of Pool</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {allocations.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                                        No allocations found.
                                    </td>
                                </tr>
                            ) : (
                                allocations.map((alloc: any) => (
                                    <tr key={alloc.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900">{alloc.employee_name || 'Unknown Employee'}</td>
                                        <td className="px-6 py-4 font-mono text-gray-700">${alloc.bonus_amount?.toLocaleString()}</td>
                                        {/* Use contribution_percentage based on Schema */}
                                        <td className="px-6 py-4 text-gray-500">{alloc.contribution_percentage?.toFixed(1) || '0.0'}%</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
