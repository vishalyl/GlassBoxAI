'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    getProjects, getDepartments, createProject, updateProject, deleteProject, getProjectStats, signOut
} from '@/app/lib/api';
import type { Project, Department } from '@/app/lib/api';

export default function ProjectsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [projects, setProjects] = useState<any[]>([]);
    const [filteredProjects, setFilteredProjects] = useState<any[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingProject, setEditingProject] = useState<any | null>(null);
    const [error, setError] = useState('');

    // Filter state
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDepartment, setFilterDepartment] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    // Project stats cache
    const [projectStats, setProjectStats] = useState<Record<string, any>>({});

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [projects, searchTerm, filterDepartment, filterStatus]);

    async function loadData() {
        try {
            setLoading(true);
            const [projectsData, deptsData] = await Promise.all([
                getProjects(),
                getDepartments()
            ]);

            setProjects(projectsData);
            setDepartments(deptsData);

            // Load stats for all projects
            const stats: Record<string, any> = {};
            await Promise.all(
                projectsData.map(async (project) => {
                    try {
                        stats[project.id] = await getProjectStats(project.id);
                    } catch (err) {
                        stats[project.id] = {
                            total_tasks: 0,
                            completed_tasks: 0,
                            completion_percentage: 0,
                            team_size: 0
                        };
                    }
                })
            );
            setProjectStats(stats);

            setLoading(false);
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    }

    function applyFilters() {
        let filtered = [...projects];

        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            filtered = filtered.filter(p =>
                p.name.toLowerCase().includes(search) ||
                p.description?.toLowerCase().includes(search)
            );
        }

        if (filterDepartment) {
            filtered = filtered.filter(p => p.department_id === filterDepartment);
        }

        if (filterStatus) {
            filtered = filtered.filter(p => p.status === filterStatus);
        }

        setFilteredProjects(filtered);
    }

    function clearFilters() {
        setSearchTerm('');
        setFilterDepartment('');
        setFilterStatus('');
    }

    async function handleSignOut() {
        try {
            await signOut();
            router.push('/login');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    }

    async function handleDelete(id: string, name: string) {
        if (!confirm(`Delete project "${name}"? This will also delete all associated tasks.`)) return;
        try {
            await deleteProject(id);
            loadData();
        } catch (err: any) {
            alert(err.message);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading projects...</p>
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
                            <p className="text-sm text-gray-600">Project Management</p>
                        </div>
                        <nav className="flex gap-6 items-center">
                            <Link href="/dashboard" className="text-gray-700 hover:text-blue-600 font-medium">
                                Dashboard
                            </Link>
                            <Link href="/organization" className="text-gray-700 hover:text-blue-600 font-medium">
                                Organization
                            </Link>
                            <Link href="/projects" className="text-blue-600 font-medium">
                                Projects
                            </Link>
                            <Link href="/decisions" className="text-gray-700 hover:text-blue-600 font-medium">
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

            {/* Main Content */}
            <main className="container mx-auto px-4 py-8">
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                        {error}
                    </div>
                )}

                <div className="bg-white rounded-lg shadow-md border border-gray-100">
                    <div className="p-6 border-b border-gray-200">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Projects</h2>
                                <p className="text-gray-600 mt-1">{filteredProjects.length} projects found</p>
                            </div>
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Create Project
                            </button>
                        </div>

                        {/* Filters */}
                        <div className="space-y-4">
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <input
                                        type="text"
                                        placeholder="Search projects..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                                <select
                                    value={filterDepartment}
                                    onChange={(e) => setFilterDepartment(e.target.value)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">All Departments</option>
                                    {departments.map((dept) => (
                                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                                    ))}
                                </select>
                                <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">All Statuses</option>
                                    <option value="planning">Planning</option>
                                    <option value="active">Active</option>
                                    <option value="completed">Completed</option>
                                    <option value="on_hold">On Hold</option>
                                </select>
                                {(searchTerm || filterDepartment || filterStatus) && (
                                    <button
                                        onClick={clearFilters}
                                        className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Projects Grid */}
                    <div className="p-6">
                        {filteredProjects.length === 0 ? (
                            <div className="text-center py-12">
                                <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <p className="text-gray-600 text-lg">No projects found</p>
                                <button
                                    onClick={() => setShowCreateModal(true)}
                                    className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
                                >
                                    Create your first project
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredProjects.map((project) => (
                                    <ProjectCard
                                        key={project.id}
                                        project={project}
                                        stats={projectStats[project.id]}
                                        onEdit={() => setEditingProject(project)}
                                        onDelete={() => handleDelete(project.id, project.name)}
                                        onClick={() => router.push(`/projects/${project.id}`)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Create/Edit Modal */}
            {(showCreateModal || editingProject) && (
                <ProjectModal
                    departments={departments}
                    editingProject={editingProject}
                    onClose={() => {
                        setShowCreateModal(false);
                        setEditingProject(null);
                    }}
                    onSuccess={() => {
                        setShowCreateModal(false);
                        setEditingProject(null);
                        loadData();
                    }}
                />
            )}
        </div>
    );
}

// Status Badge Component
function StatusBadge({ status }: { status: string }) {
    const colors = {
        planning: 'bg-gray-100 text-gray-800 border-gray-200',
        active: 'bg-green-100 text-green-800 border-green-200',
        completed: 'bg-blue-100 text-blue-800 border-blue-200',
        on_hold: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    };

    const labels = {
        planning: 'Planning',
        active: 'Active',
        completed: 'Completed',
        on_hold: 'On Hold'
    };

    return (
        <span className={`px-3 py-1 text-xs font-medium rounded-full border ${colors[status as keyof typeof colors] || colors.planning}`}>
            {labels[status as keyof typeof labels] || status}
        </span>
    );
}

// Project Card Component
function ProjectCard({ project, stats, onEdit, onDelete, onClick }: any) {
    const completion = stats?.completion_percentage || 0;

    return (
        <div className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-all cursor-pointer group">
            <div onClick={onClick}>
                <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-lg text-gray-900 group-hover:text-blue-600 transition-colors">
                        {project.name}
                    </h3>
                    <StatusBadge status={project.status || 'planning'} />
                </div>

                {project.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{project.description}</p>
                )}

                <div className="space-y-3 mb-4">
                    {project.department && (
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            <span>{project.department.name}</span>
                        </div>
                    )}

                    {(project.start_date || project.end_date) && (
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>
                                {project.start_date && new Date(project.start_date).toLocaleDateString()}
                                {project.start_date && project.end_date && ' - '}
                                {project.end_date && new Date(project.end_date).toLocaleDateString()}
                            </span>
                        </div>
                    )}

                    <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1 text-gray-700">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            <span>{stats?.total_tasks || 0} tasks</span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-700">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <span>{stats?.team_size || 0} members</span>
                        </div>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600 font-medium">Progress</span>
                        <span className="text-gray-900 font-semibold">{completion}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${completion}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
                <button
                    onClick={onEdit}
                    className="flex-1 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 text-sm font-medium"
                >
                    Edit
                </button>
                <button
                    onClick={onDelete}
                    className="flex-1 px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 text-sm font-medium"
                >
                    Delete
                </button>
            </div>
        </div>
    );
}

// Project Modal (Create/Edit)
function ProjectModal({ departments, editingProject, onClose, onSuccess }: any) {
    const [formData, setFormData] = useState({
        name: editingProject?.name || '',
        description: editingProject?.description || '',
        department_id: editingProject?.department_id || '',
        start_date: editingProject?.start_date || '',
        end_date: editingProject?.end_date || '',
        status: editingProject?.status || 'planning',
        weightage: editingProject?.weightage || 1
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const submitData = {
                ...formData,
                department_id: formData.department_id || null
            };

            if (editingProject) {
                await updateProject(editingProject.id, {
                    ...submitData,
                    weightage: parseInt(formData.weightage.toString())
                });
            } else {
                await createProject({
                    ...submitData,
                    weightage: parseInt(formData.weightage.toString())
                });
            }
            onSuccess();
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">
                        {editingProject ? 'Edit Project' : 'Create Project'}
                    </h2>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Project Name *
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Department
                            </label>
                            <select
                                value={formData.department_id}
                                onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">No Department</option>
                                {departments.map((dept: Department) => (
                                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Status
                            </label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="planning">Planning</option>
                                <option value="active">Active</option>
                                <option value="completed">Completed</option>
                                <option value="on_hold">On Hold</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Start Date
                            </label>
                            <input
                                type="date"
                                value={formData.start_date}
                                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                End Date
                            </label>
                            <input
                                type="date"
                                value={formData.end_date}
                                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Project Importance / Weightage (1-10)
                        </label>
                        <select
                            value={formData.weightage}
                            onChange={(e) => setFormData({ ...formData, weightage: parseInt(e.target.value) })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                                <option key={num} value={num}>
                                    {num} - {num <= 3 ? 'Low' : num <= 7 ? 'Medium' : 'High/Critical'}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                            Used for calculating employee performance scores. Higher weightage = more impact on KPIs.
                        </p>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                            {loading ? 'Saving...' : editingProject ? 'Update Project' : 'Create Project'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
