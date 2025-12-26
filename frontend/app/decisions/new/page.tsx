'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createDecision } from '@/app/lib/api';
import type { Decision } from '@/app/lib/api';

export default function NewDecisionPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Form state
    const [decisionType, setDecisionType] = useState<Decision['decision_type']>('promotion');
    const [employeeName, setEmployeeName] = useState('');
    const [yearsExperience, setYearsExperience] = useState('');
    const [performanceRating, setPerformanceRating] = useState('');
    const [currentLevel, setCurrentLevel] = useState('');
    const [tenureYears, setTenureYears] = useState('');

    // Comparable cohort
    const [cohortData, setCohortData] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Build employee data
            const employeeData = {
                name: employeeName,
                years_experience: parseFloat(yearsExperience),
                performance_rating: parseFloat(performanceRating),
                current_level: currentLevel,
                tenure_years: parseFloat(tenureYears),
            };

            // Parse cohort data if provided
            let comparableCohort: any[] = [];
            if (cohortData.trim()) {
                try {
                    comparableCohort = JSON.parse(cohortData);
                } catch (err) {
                    setError('Invalid JSON format for comparable cohort. Please check the syntax.');
                    setLoading(false);
                    return;
                }
            }

            // Create decision
            const decision = await createDecision(decisionType, employeeData, comparableCohort);

            // Redirect to decision detail page
            router.push(`/decisions/${decision.id}`);
        } catch (err: any) {
            setError(err.message || 'Failed to create decision');
            setLoading(false);
        }
    };

    const sampleCohort = [
        {
            name: "John Doe",
            years_experience: 5,
            performance_rating: 4.3,
            current_level: "Senior Engineer",
            outcome: "promoted"
        },
        {
            name: "Jane Smith",
            years_experience: 5,
            performance_rating: 4.1,
            current_level: "Senior Engineer",
            outcome: "promoted"
        },
        {
            name: "Bob Williams",
            years_experience: 6,
            performance_rating: 4.0,
            current_level: "Senior Engineer",
            outcome: "not promoted"
        }
    ];

    const insertSampleData = () => {
        setCohortData(JSON.stringify(sampleCohort, null, 2));
    };

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
                            <p className="text-sm text-gray-600">Create New Decision</p>
                        </div>
                        <Link href="/dashboard" className="text-blue-600 hover:text-blue-700 font-medium">
                            ← Back to Dashboard
                        </Link>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-8 max-w-4xl">
                <div className="bg-white rounded-lg shadow-md border border-gray-100 p-8">
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">Create New Decision</h2>
                    <p className="text-gray-600 mb-6">
                        Enter the details for the HR decision you want to analyze
                    </p>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Decision Type */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Decision Type
                            </label>
                            <select
                                value={decisionType}
                                onChange={(e) => setDecisionType(e.target.value as Decision['decision_type'])}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="promotion">Promotion</option>
                                <option value="hiring">Hiring</option>
                                <option value="appraisal">Performance Appraisal</option>
                                <option value="compensation">Compensation</option>
                                <option value="retention">Retention</option>
                            </select>
                        </div>

                        {/* Employee Information */}
                        <div className="border-t pt-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Employee Information</h3>

                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Employee Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={employeeName}
                                        onChange={(e) => setEmployeeName(e.target.value)}
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="John Doe"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Years of Experience *
                                    </label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={yearsExperience}
                                        onChange={(e) => setYearsExperience(e.target.value)}
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="5.0"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Performance Rating *
                                    </label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        max="5"
                                        value={performanceRating}
                                        onChange={(e) => setPerformanceRating(e.target.value)}
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="4.2"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Current Level *
                                    </label>
                                    <input
                                        type="text"
                                        value={currentLevel}
                                        onChange={(e) => setCurrentLevel(e.target.value)}
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Senior Engineer"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Tenure (Years) *
                                    </label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={tenureYears}
                                        onChange={(e) => setTenureYears(e.target.value)}
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="3.0"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Comparable Cohort (Optional) */}
                        <div className="border-t pt-6">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">
                                        Comparable Cohort (Optional)
                                    </h3>
                                    <p className="text-sm text-gray-600">
                                        Provide similar employees for bias comparison (JSON format)
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={insertSampleData}
                                    className="px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition"
                                >
                                    Insert Sample
                                </button>
                            </div>

                            <textarea
                                value={cohortData}
                                onChange={(e) => setCohortData(e.target.value)}
                                rows={8}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                                placeholder='[{"name": "John Doe", "years_experience": 5, "performance_rating": 4.3, "outcome": "promoted"}]'
                            />
                            <p className="mt-2 text-xs text-gray-500">
                                Leave empty to skip bias analysis, or paste JSON array of comparable employees
                            </p>
                        </div>

                        {/* Submit Button */}
                        <div className="border-t pt-6 flex gap-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 py-3 px-6 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Creating Decision...' : 'Create Decision'}
                            </button>
                            <Link
                                href="/dashboard"
                                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors text-center"
                            >
                                Cancel
                            </Link>
                        </div>
                    </form>
                </div>

                {/* Helper Info */}
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h4 className="font-semibold text-gray-900 mb-2">💡 Tips</h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                        <li>• Fill in the employee details accurately for best results</li>
                        <li>• Comparable cohort helps detect bias by comparing similar employees</li>
                        <li>• After creation, you can run bias analysis and generate AI explanations</li>
                        <li>• Click "Insert Sample" to see the correct JSON format</li>
                    </ul>
                </div>
            </main>
        </div>
    );
}
