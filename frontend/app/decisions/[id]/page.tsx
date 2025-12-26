'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getDecision, analyzeBias, generateExplanation, finalizeDecision } from '@/app/lib/api';
import type { Decision, BiasAnalysis, Explanation } from '@/app/lib/api';

export default function DecisionDetailPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [analyzing, setAnalyzing] = useState(false);
    const [explaining, setExplaining] = useState(false);
    const [finalizing, setFinalizing] = useState(false);
    const [error, setError] = useState('');

    const [decision, setDecision] = useState<Decision | null>(null);
    const [biasAnalysis, setBiasAnalysis] = useState<BiasAnalysis | null>(null);
    const [explanation, setExplanation] = useState<Explanation | null>(null);

    useEffect(() => {
        loadDecision();
    }, [params.id]);

    async function loadDecision() {
        try {
            const data = await getDecision(params.id);
            setDecision(data.decision);
            setBiasAnalysis(data.bias_analysis || null);
            setExplanation(data.explanation || null);
            setLoading(false);
        } catch (err: any) {
            setError(err.message || 'Failed to load decision');
            setLoading(false);
        }
    }

    async function handleAnalyzeBias() {
        setAnalyzing(true);
        setError('');
        try {
            const analysis = await analyzeBias(params.id);
            setBiasAnalysis(analysis);
            await loadDecision(); // Reload to update status
        } catch (err: any) {
            setError(err.message || 'Failed to analyze bias');
        }
        setAnalyzing(false);
    }

    async function handleGenerateExplanation() {
        setExplaining(true);
        setError('');
        try {
            const exp = await generateExplanation(params.id);
            setExplanation(exp);
        } catch (err: any) {
            setError(err.message || 'Failed to generate explanation');
        }
        setExplaining(false);
    }

    async function handleFinalize() {
        if (!confirm('Are you sure you want to finalize this decision? This action cannot be undone.')) {
            return;
        }

        setFinalizing(true);
        setError('');
        try {
            const updated = await finalizeDecision(params.id);
            setDecision(updated);
        } catch (err: any) {
            setError(err.message || 'Failed to finalize decision');
        }
        setFinalizing(false);
    }

    function getRiskColor(level?: string) {
        switch (level) {
            case 'low': return 'bg-green-100 text-green-700 border-green-300';
            case 'moderate': return 'bg-amber-100 text-amber-700 border-amber-300';
            case 'high': return 'bg-red-100 text-red-700 border-red-300';
            default: return 'bg-gray-100 text-gray-700 border-gray-300';
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading decision...</p>
                </div>
            </div>
        );
    }

    if (!decision) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-600 text-lg mb-4">Decision not found</p>
                    <Link href="/dashboard" className="text-blue-600 hover:text-blue-700">
                        ← Back to Dashboard
                    </Link>
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
                            <p className="text-sm text-gray-600 capitalize">{decision.decision_type} Decision</p>
                        </div>
                        <Link href="/dashboard" className="text-blue-600 hover:text-blue-700 font-medium">
                            ← Back to Dashboard
                        </Link>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-8 max-w-6xl">
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                        {error}
                    </div>
                )}

                {/* Decision Info */}
                <div className="bg-white rounded-lg shadow-md border border-gray-100 p-6 mb-6">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                {decision.employee_data?.name || 'Unnamed Decision'}
                            </h2>
                            <div className="flex gap-3">
                                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium capitalize">
                                    {decision.decision_type}
                                </span>
                                <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium capitalize">
                                    {decision.status}
                                </span>
                            </div>
                        </div>
                        {decision.status !== 'finalized' && (
                            <button
                                onClick={handleFinalize}
                                disabled={finalizing}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-blue-400"
                            >
                                {finalizing ? 'Finalizing...' : 'Finalize Decision'}
                            </button>
                        )}
                    </div>

                    {/* Employee Data */}
                    <div className="grid md:grid-cols-2 gap-4">
                        {Object.entries(decision.employee_data).map(([key, value]) => (
                            <div key={key} className="p-3 bg-gray-50 rounded-lg">
                                <p className="text-sm text-gray-600 capitalize">{key.replace(/_/g, ' ')}</p>
                                <p className="text-lg font-semibold text-gray-900">{String(value)}</p>
                            </div>
                        ))}
                    </div>

                    {decision.comparable_cohort && decision.comparable_cohort.length > 0 && (
                        <div className="mt-4 pt-4 border-t">
                            <p className="text-sm text-gray-600">
                                <strong>Comparable Cohort:</strong> {decision.comparable_cohort.length} employees
                            </p>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                    <button
                        onClick={handleAnalyzeBias}
                        disabled={analyzing || !!biasAnalysis}
                        className="p-6 bg-white rounded-lg shadow-md border border-gray-100 hover:border-blue-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900">
                                    {biasAnalysis ? '✅ Bias Analysis Complete' : analyzing ? 'Analyzing...' : 'Analyze for Bias'}
                                </h3>
                                <p className="text-sm text-gray-600">
                                    {biasAnalysis ? 'View results below' : 'Run statistical bias detection'}
                                </p>
                            </div>
                        </div>
                    </button>

                    <button
                        onClick={handleGenerateExplanation}
                        disabled={explaining || !!explanation}
                        className="p-6 bg-white rounded-lg shadow-md border border-gray-100 hover:border-blue-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900">
                                    {explanation ? '✅ Explanation Generated' : explaining ? 'Generating...' : 'Generate AI Explanation'}
                                </h3>
                                <p className="text-sm text-gray-600">
                                    {explanation ? 'View explanation below' : 'Get Gemini-powered insights'}
                                </p>
                            </div>
                        </div>
                    </button>
                </div>

                {/* Bias Analysis Results */}
                {biasAnalysis && (
                    <div className="bg-white rounded-lg shadow-md border border-gray-100 p-6 mb-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">📊 Bias Analysis Results</h3>

                        <div className={`p-4 rounded-lg border-2 mb-4 ${getRiskColor(biasAnalysis.risk_level)}`}>
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-sm font-medium">Risk Level</p>
                                    <p className="text-2xl font-bold capitalize">{biasAnalysis.risk_level}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-medium">Risk Score</p>
                                    <p className="text-2xl font-bold">{biasAnalysis.risk_score.toFixed(2)}</p>
                                </div>
                            </div>
                        </div>

                        {biasAnalysis.detected_patterns && biasAnalysis.detected_patterns.length > 0 && (
                            <div className="mb-4">
                                <h4 className="font-semibold text-gray-900 mb-2">Detected Patterns</h4>
                                <div className="space-y-2">
                                    {biasAnalysis.detected_patterns.map((pattern: any, idx: number) => (
                                        <div key={idx} className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                            <p className="font-medium text-amber-900">{pattern.type}</p>
                                            <p className="text-sm text-amber-700">{pattern.description}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {biasAnalysis.fairness_metrics && (
                            <div>
                                <h4 className="font-semibold text-gray-900 mb-2">Fairness Metrics</h4>
                                <div className="grid md:grid-cols-3 gap-4">
                                    {Object.entries(biasAnalysis.fairness_metrics).map(([key, value]) => (
                                        <div key={key} className="p-3 bg-gray-50 rounded-lg">
                                            <p className="text-sm text-gray-600 capitalize">{key.replace(/_/g, ' ')}</p>
                                            <p className="text-lg font-semibold text-gray-900">
                                                {typeof value === 'number' ? value.toFixed(2) : String(value)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* AI Explanation */}
                {explanation && (
                    <div className="bg-white rounded-lg shadow-md border border-gray-100 p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">💡 AI-Generated Explanation</h3>

                        <div className="prose max-w-none mb-6">
                            <p className="text-gray-700 whitespace-pre-wrap">{explanation.justification}</p>
                        </div>

                        {explanation.key_factors && explanation.key_factors.length > 0 && (
                            <div className="mb-6">
                                <h4 className="font-semibold text-gray-900 mb-3">Key Factors</h4>
                                <div className="space-y-3">
                                    {explanation.key_factors.map((factor: any, idx: number) => (
                                        <div key={idx} className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                            <div className="flex justify-between items-start mb-2">
                                                <p className="font-semibold text-blue-900">{factor.factor}</p>
                                                <span className="px-2 py-1 bg-blue-200 text-blue-800 rounded text-sm font-medium">
                                                    Weight: {factor.weight}/10
                                                </span>
                                            </div>
                                            <p className="text-sm text-blue-700">{factor.description}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {explanation.alternatives && explanation.alternatives.length > 0 && (
                            <div>
                                <h4 className="font-semibold text-gray-900 mb-3">Alternative Perspectives</h4>
                                <ul className="space-y-2">
                                    {explanation.alternatives.map((alt: string, idx: number) => (
                                        <li key={idx} className="flex items-start gap-2">
                                            <span className="text-purple-600 mt-1">•</span>
                                            <span className="text-gray-700">{alt}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
