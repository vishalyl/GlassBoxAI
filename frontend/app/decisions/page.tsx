'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from '@/app/lib/api';

export default function DecisionsPage() {
    const router = useRouter();

    async function handleSignOut() {
        try {
            await signOut();
            router.push('/login');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    }

    const decisionTypes = [
        {
            id: 'bonus',
            name: '💰 Bonus Distribution',
            description: 'Calculate fair bonus allocation based on project contributions',
            href: '/decisions/bonus',
            color: 'blue',
            available: true
        },
        {
            id: 'promotion',
            name: '📈 Promotion',
            description: 'Evaluate employees for promotion opportunities',
            href: '/decisions/promotion',
            color: 'purple',
            available: true
        },
        {
            id: 'compensation',
            name: '💵 Compensation Review',
            description: 'Analyze salary adjustments and compensation packages',
            href: '/decisions/compensation',
            color: 'green',
            available: false
        },
        {
            id: 'retention',
            name: '🎯 Retention Analysis',
            description: 'Identify flight risks and retention strategies',
            href: '/decisions/retention',
            color: 'red',
            available: false
        },
        {
            id: 'audit',
            name: '🛡️ Audit Decisions',
            description: 'Validate manager decisions against AI recommendations',
            href: '/decisions/audit',
            color: 'orange',
            available: true
        }
    ];

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
                            <p className="text-sm text-gray-600">Decision Intelligence</p>
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
                            <Link href="/decisions" className="text-blue-600 font-medium">
                                Decisions
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

            {/* Decision Types Grid */}
            <div className="max-w-7xl mx-auto px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {decisionTypes.map(decision => {
                        const colorClasses = {
                            blue: 'border-blue-200 hover:border-blue-400 bg-blue-50',
                            purple: 'border-purple-200 hover:border-purple-400 bg-purple-50',
                            green: 'border-green-200 hover:border-green-400 bg-green-50',
                            red: 'border-red-200 hover:border-red-400 bg-red-50',
                            orange: 'border-orange-200 hover:border-orange-400 bg-orange-50'
                        };

                        if (!decision.available) {
                            return (
                                <div
                                    key={decision.id}
                                    className="relative p-6 bg-white border-2 border-gray-200 rounded-xl opacity-60 cursor-not-allowed"
                                >
                                    <div className="absolute top-4 right-4">
                                        <span className="px-3 py-1 bg-gray-200 text-gray-600 text-xs font-semibold rounded-full">
                                            Coming Soon
                                        </span>
                                    </div>
                                    <div className="text-4xl mb-3">{decision.name.split(' ')[0]}</div>
                                    <h3 className="text-xl font-bold text-gray-500 mb-2">
                                        {decision.name.substring(decision.name.indexOf(' ') + 1)}
                                    </h3>
                                    <p className="text-gray-400">{decision.description}</p>
                                </div>
                            );
                        }

                        return (
                            <Link
                                key={decision.id}
                                href={decision.href}
                                className={`relative p-6 border-2 rounded-xl transition-all hover:shadow-lg ${colorClasses[decision.color as keyof typeof colorClasses]
                                    }`}
                            >
                                <div className="absolute top-4 right-4">
                                    <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                                        Available
                                    </span>
                                </div>
                                <div className="text-4xl mb-3">{decision.name.split(' ')[0]}</div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">
                                    {decision.name.substring(decision.name.indexOf(' ') + 1)}
                                </h3>
                                <p className="text-gray-700">{decision.description}</p>
                                <div className="mt-4 text-blue-600 font-medium flex items-center gap-2">
                                    Get Started
                                    <span>→</span>
                                </div>
                            </Link>
                        );
                    })}
                </div>

                {/* Quick Stats */}
                <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <div className="text-3xl font-bold text-blue-600">1</div>
                        <div className="text-gray-600 mt-1">Active Decision Tools</div>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <div className="text-3xl font-bold text-purple-600">3</div>
                        <div className="text-gray-600 mt-1">Tools Coming Soon</div>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <div className="text-3xl font-bold text-green-600">100%</div>
                        <div className="text-gray-600 mt-1">Data-Driven Decisions</div>
                    </div>
                </div>

                {/* Info Banner */}
                <div className="mt-12 bg-blue-50 border border-blue-200 rounded-xl p-6">
                    <h3 className="font-semibold text-blue-900 mb-2">💡 About Decision Intelligence</h3>
                    <p className="text-blue-800">
                        Our AI-powered decision tools help you make fair, transparent, and data-backed HR decisions.
                        Each tool analyzes your organization's specific data to provide personalized recommendations
                        while actively detecting and preventing bias.
                    </p>
                </div>
            </div>
        </div>
    );
}
