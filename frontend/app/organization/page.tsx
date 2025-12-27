'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    getDepartments, getEmployees, createEmployee, updateEmployee, deleteEmployee,
    createDepartment, updateDepartment, deleteDepartment, archiveEmployee, rehireEmployee,
    getDepartmentsWithMetrics, signOut
} from '@/app/lib/api';
import type { Department, Employee, DepartmentMetrics } from '@/app/lib/api';

export default function OrganizationPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'employees' | 'departments'>('employees');
    const [loading, setLoading] = useState(true);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [departmentMetrics, setDepartmentMetrics] = useState<DepartmentMetrics[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [filteredEmployees, setFilteredEmployees] = useState<any[]>([]);
    const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
    const [showAddDepartmentModal, setShowAddDepartmentModal] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<any | null>(null);
    const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
    const [archivingEmployee, setArchivingEmployee] = useState<any | null>(null);
    const [error, setError] = useState('');

    // Search & Filter state
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDepartment, setFilterDepartment] = useState('');
    const [filterStatus, setFilterStatus] = useState('active');

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [employees, searchTerm, filterDepartment, filterStatus]);

    async function loadData() {
        try {
            setLoading(true);
            const [depts, emps, metrics] = await Promise.all([
                getDepartments(),
                getEmployees(),
                getDepartmentsWithMetrics()
            ]);
            setDepartments(depts);
            setEmployees(emps);
            setDepartmentMetrics(metrics);
            setLoading(false);
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    }

    function applyFilters() {
        let filtered = [...employees];

        // Apply search
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            filtered = filtered.filter(emp =>
                emp.name.toLowerCase().includes(search) ||
                emp.role_title?.toLowerCase().includes(search) ||
                emp.email?.toLowerCase().includes(search)
            );
        }

        // Apply department filter
        if (filterDepartment) {
            filtered = filtered.filter(emp => emp.department_id === filterDepartment);
        }

        // Apply status filter
        if (filterStatus) {
            filtered = filtered.filter(emp => (emp.status || 'active') === filterStatus);
        }

        setFilteredEmployees(filtered);
    }

    function clearFilters() {
        setSearchTerm('');
        setFilterDepartment('');
        setFilterStatus('active');
    }

    async function handleSignOut() {
        try {
            await signOut();
            router.push('/login');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading organization...</p>
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
                            <p className="text-sm text-gray-600">Organization Management</p>
                        </div>
                        <nav className="flex gap-6 items-center">
                            <Link href="/dashboard" className="text-gray-700 hover:text-blue-600 font-medium">
                                Dashboard
                            </Link>
                            <Link href="/organization" className="text-blue-600 font-medium">
                                Organization
                            </Link>
                            <Link href="/projects" className="text-gray-700 hover:text-blue-600 font-medium">
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

                {/* Tabs */}
                <div className="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden">
                    <div className="border-b border-gray-200">
                        <div className="flex">
                            <button
                                onClick={() => setActiveTab('employees')}
                                className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'employees'
                                    ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                    }`}
                            >
                                Employees ({filteredEmployees.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('departments')}
                                className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'departments'
                                    ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                    }`}
                            >
                                Departments ({departments.length})
                            </button>
                        </div>
                    </div>

                    {/* Tab Content */}
                    <div className="p-6">
                        {activeTab === 'employees' && (
                            <EmployeesTab
                                employees={filteredEmployees}
                                allEmployees={employees}
                                departments={departments}
                                searchTerm={searchTerm}
                                setSearchTerm={setSearchTerm}
                                filterDepartment={filterDepartment}
                                setFilterDepartment={setFilterDepartment}
                                filterStatus={filterStatus}
                                setFilterStatus={setFilterStatus}
                                clearFilters={clearFilters}
                                onShowAdd={() => setShowAddEmployeeModal(true)}
                                onEdit={(emp: any) => setEditingEmployee(emp)}
                                onArchive={(emp: any) => setArchivingEmployee(emp)}
                                onReload={loadData}
                            />
                        )}
                        {activeTab === 'departments' && (
                            <DepartmentsTab
                                departmentMetrics={departmentMetrics}
                                onShowAdd={() => setShowAddDepartmentModal(true)}
                                onEdit={(dept: any) => setEditingDepartment(dept)}
                                onReload={loadData}
                            />
                        )}
                    </div>
                </div>
            </main>

            {/* Modals */}
            {(showAddEmployeeModal || editingEmployee) && (
                <EmployeeModal
                    departments={departments}
                    employees={employees}
                    editingEmployee={editingEmployee}
                    onClose={() => {
                        setShowAddEmployeeModal(false);
                        setEditingEmployee(null);
                    }}
                    onSuccess={() => {
                        setShowAddEmployeeModal(false);
                        setEditingEmployee(null);
                        loadData();
                    }}
                />
            )}

            {(showAddDepartmentModal || editingDepartment) && (
                <DepartmentModal
                    editingDepartment={editingDepartment}
                    onClose={() => {
                        setShowAddDepartmentModal(false);
                        setEditingDepartment(null);
                    }}
                    onSuccess={() => {
                        setShowAddDepartmentModal(false);
                        setEditingDepartment(null);
                        loadData();
                    }}
                />
            )}

            {archivingEmployee && (
                <ArchiveModal
                    employee={archivingEmployee}
                    onClose={() => setArchivingEmployee(null)}
                    onSuccess={() => {
                        setArchivingEmployee(null);
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
        active: 'bg-green-100 text-green-800 border-green-200',
        on_leave: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        terminated: 'bg-red-100 text-red-800 border-red-200'
    };

    const labels = {
        active: 'Active',
        on_leave: 'On Leave',
        terminated: 'Terminated'
    };

    return (
        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${colors[status as keyof typeof colors] || colors.active}`}>
            {labels[status as keyof typeof labels] || status}
        </span>
    );
}

// Employees Tab
function EmployeesTab({
    employees,
    allEmployees,
    departments,
    searchTerm,
    setSearchTerm,
    filterDepartment,
    setFilterDepartment,
    filterStatus,
    setFilterStatus,
    clearFilters,
    onShowAdd,
    onEdit,
    onArchive,
    onReload
}: any) {
    // Helper function to get manager name from reports_to_id
    // Department managers always report to CEO
    function getManagerName(emp: any): string {
        if (emp.is_department_manager) return 'CEO';
        if (!emp.reports_to_id) return 'CEO';
        const manager = allEmployees.find((e: any) => e.id === emp.reports_to_id);
        return manager?.name || 'CEO';
    }
    async function handleDelete(id: string) {
        if (!confirm('Are you sure you want to permanently delete this employee?')) return;
        try {
            await deleteEmployee(id);
            onReload();
        } catch (err: any) {
            alert(err.message);
        }
    }

    async function handleRehire(employee: any) {
        if (!confirm(`Rehire ${employee.name}?`)) return;
        try {
            await rehireEmployee(employee.id, {});
            onReload();
        } catch (err: any) {
            alert(err.message);
        }
    }

    return (
        <div>
            {/* Search & Filters */}
            <div className="mb-6 space-y-4">
                <div className="flex gap-4">
                    <div className="flex-1">
                        <input
                            type="text"
                            placeholder="Search by name, role, or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    <button
                        onClick={onShowAdd}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                    >
                        + Add Employee
                    </button>
                </div>

                <div className="flex gap-4 items-center">
                    <select
                        value={filterDepartment}
                        onChange={(e) => setFilterDepartment(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">All Departments</option>
                        {departments.map((dept: Department) => (
                            <option key={dept.id} value={dept.id}>{dept.name}</option>
                        ))}
                    </select>

                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">All Statuses</option>
                        <option value="active">Active</option>
                        <option value="on_leave">On Leave</option>
                        <option value="terminated">Terminated</option>
                    </select>

                    {(searchTerm || filterDepartment || filterStatus) && (
                        <button
                            onClick={clearFilters}
                            className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                        >
                            Clear Filters
                        </button>
                    )}
                </div>
            </div>

            {/* Employee Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Name</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Role</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Department</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Manager</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {employees.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                    No employees found
                                </td>
                            </tr>
                        ) : (
                            employees.map((emp: any) => (
                                <tr key={emp.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3">
                                        <div>
                                            <div className="font-medium text-gray-900">{emp.name}</div>
                                            {emp.email && <div className="text-sm text-gray-500">{emp.email}</div>}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-gray-700">
                                        {emp.role_title}
                                        {emp.is_department_manager && (
                                            <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                                Manager
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-gray-700">
                                        {emp.department?.name || '-'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <StatusBadge status={emp.status || 'active'} />
                                    </td>
                                    <td className="px-4 py-3 text-gray-700">
                                        {getManagerName(emp)}
                                    </td>
                                    <td className="px-4 py-3 text-right space-x-2">
                                        {emp.status === 'terminated' ? (
                                            <button
                                                onClick={() => handleRehire(emp)}
                                                className="text-green-600 hover:text-green-800 font-medium text-sm"
                                            >
                                                Rehire
                                            </button>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => onEdit(emp)}
                                                    className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => onArchive(emp)}
                                                    className="text-orange-600 hover:text-orange-800 font-medium text-sm"
                                                >
                                                    Archive
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(emp.id)}
                                                    className="text-red-600 hover:text-red-800 font-medium text-sm"
                                                >
                                                    Delete
                                                </button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// Departments Tab
function DepartmentsTab({ departmentMetrics, onShowAdd, onEdit, onReload }: any) {
    async function handleDelete(id: string, name: string) {
        if (!confirm(`Delete department "${name}"? This will fail if there are active employees.`)) return;
        try {
            await deleteDepartment(id);
            onReload();
        } catch (err: any) {
            alert(err.message);
        }
    }

    return (
        <div>
            <div className="mb-6 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">Departments</h2>
                <button
                    onClick={onShowAdd}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                    + Add Department
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {departmentMetrics.map((dept: DepartmentMetrics) => (
                    <div key={dept.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-semibold text-lg text-gray-900">{dept.name}</h3>
                                {dept.description && (
                                    <p className="text-sm text-gray-600 mt-1">{dept.description}</p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2 mb-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-700 font-medium">Employees:</span>
                                <span className="font-semibold text-gray-900">{dept.employee_count}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-700 font-medium">Avg Tenure:</span>
                                <span className="font-semibold text-gray-900">{dept.avg_tenure_months} months</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-700 font-medium">Manager:</span>
                                <span className="font-semibold text-gray-900">{dept.manager?.name || 'None'}</span>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => onEdit(dept)}
                                className="flex-1 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 text-sm font-medium"
                            >
                                Edit
                            </button>
                            <button
                                onClick={() => handleDelete(dept.id, dept.name)}
                                className="flex-1 px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 text-sm font-medium"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Employee Modal (Add/Edit)
function EmployeeModal({ departments, employees, editingEmployee, onClose, onSuccess }: any) {
    const [formData, setFormData] = useState({
        name: editingEmployee?.name || '',
        email: editingEmployee?.email || '',
        role_title: editingEmployee?.role_title || '',
        department_id: editingEmployee?.department_id || '',
        reports_to_id: editingEmployee?.reports_to_id || '',
        is_department_manager: editingEmployee?.is_department_manager || false,
        status: editingEmployee?.status || 'active',
        hire_date: editingEmployee?.hire_date || ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Convert empty strings to null for UUIDs
            const submitData = {
                ...formData,
                department_id: formData.department_id || null,
                reports_to_id: formData.reports_to_id || null
            };

            if (editingEmployee) {
                await updateEmployee(editingEmployee.id, submitData);
            } else {
                await createEmployee(submitData);
            }

            // Wait a moment for database triggers to complete
            await new Promise(resolve => setTimeout(resolve, 500));

            onSuccess();
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    }

    // Get all managers from all departments (excluding the current employee being edited)
    const allManagers = employees.filter((e: any) =>
        e.is_department_manager && e.status === 'active' && e.id !== editingEmployee?.id
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">
                        {editingEmployee ? 'Edit Employee' : 'Add Employee'}
                    </h2>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Name *
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
                                Email
                            </label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Role Title *
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.role_title}
                                onChange={(e) => setFormData({ ...formData, role_title: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Department
                            </label>
                            <select
                                value={formData.department_id}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    department_id: e.target.value,
                                    reports_to_id: '' // Reset manager when department changes
                                })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">No Department</option>
                                {departments.map((dept: Department) => (
                                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Reports To
                            </label>
                            <select
                                value={formData.reports_to_id}
                                onChange={(e) => setFormData({ ...formData, reports_to_id: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">CEO / Founder</option>
                                {allManagers.map((mgr: any) => (
                                    <option key={mgr.id} value={mgr.id}>
                                        {mgr.name} ({mgr.department?.name || 'No Dept'})
                                    </option>
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
                                <option value="active">Active</option>
                                <option value="on_leave">On Leave</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Hire Date
                            </label>
                            <input
                                type="date"
                                value={formData.hire_date}
                                onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="flex items-end">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.is_department_manager}
                                    onChange={(e) => setFormData({ ...formData, is_department_manager: e.target.checked })}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm font-medium text-gray-700">
                                    Is Department Manager
                                </span>
                            </label>
                        </div>
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
                            {loading ? 'Saving...' : editingEmployee ? 'Update Employee' : 'Add Employee'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Department Modal
function DepartmentModal({ editingDepartment, onClose, onSuccess }: any) {
    const [formData, setFormData] = useState({
        name: editingDepartment?.name || '',
        description: editingDepartment?.description || ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (editingDepartment) {
                await updateDepartment(editingDepartment.id, formData);
            } else {
                await createDepartment(formData.name, formData.description);
            }
            onSuccess();
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">
                        {editingDepartment ? 'Edit Department' : 'Add Department'}
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
                            Department Name *
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
                            {loading ? 'Saving...' : editingDepartment ? 'Update' : 'Create'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Archive Modal
function ArchiveModal({ employee, onClose, onSuccess }: any) {
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleArchive() {
        if (!reason.trim()) {
            alert('Please provide a reason');
            return;
        }

        setLoading(true);
        try {
            await archiveEmployee(employee.id, reason);
            onSuccess();
        } catch (err: any) {
            alert(err.message);
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">
                        Archive Employee
                    </h2>
                </div>

                <div className="p-6 space-y-4">
                    <p className="text-gray-700">
                        Are you sure you want to archive <strong>{employee.name}</strong>?
                    </p>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Reason for Termination *
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter reason..."
                        />
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
                            onClick={handleArchive}
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                        >
                            {loading ? 'Archiving...' : 'Archive Employee'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
