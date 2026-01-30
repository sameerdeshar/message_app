import { useState } from 'react';
import { useSelector } from 'react-redux';
import {
    useGetUsersQuery,
    useCreateUserMutation,
    useDeleteUserMutation,
    useGetPagesQuery,
    useAddPageMutation,
    useDeletePageMutation,
    useBulkAssignPagesMutation,
    useUnassignPageMutation,
    useGetAssignmentsQuery
} from '../features/admin/adminApi';
import { useLogoutMutation } from '../features/auth/authApi';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Layout, Shield, MessageSquare, Users, Link2, UserPlus, X } from 'lucide-react';
import Toast from '../components/Toast';
import MultiSelect from '../components/MultiSelect';

const AdminDashboard = () => {
    const { user } = useSelector((state) => state.auth);
    const { data: usersData, isLoading: usersLoading } = useGetUsersQuery();
    const { data: pagesData, isLoading: pagesLoading } = useGetPagesQuery();
    const { data: assignmentsData, isLoading: assignmentsLoading } = useGetAssignmentsQuery();

    const [createUser] = useCreateUserMutation();
    const [deleteUser] = useDeleteUserMutation();
    const [addPage] = useAddPageMutation();
    const [deletePage] = useDeletePageMutation();
    const [bulkAssignPages] = useBulkAssignPagesMutation();
    const [unassignPage] = useUnassignPageMutation();
    const [logout] = useLogoutMutation();

    const navigate = useNavigate();

    // UI State
    const [activeTab, setActiveTab] = useState('users');
    const [showUserForm, setShowUserForm] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(null);
    const [toast, setToast] = useState(null);

    // Form State
    const [newUser, setNewUser] = useState({ username: '', password: '', role: 'agent' });
    const [newPage, setNewPage] = useState({ id: '', name: '', access_token: '' });
    const [assignData, setAssignData] = useState({ userId: '', selectedPages: [] });

    const users = usersData?.users || [];
    const pages = pagesData?.pages || [];
    const assignments = assignmentsData?.assignments || [];

    const showToast = (message, type = 'info') => {
        setToast({ message, type });
    };

    // Handlers
    const handleCreateUser = async (e) => {
        e.preventDefault();
        try {
            await createUser(newUser).unwrap();
            setNewUser({ username: '', password: '', role: 'agent' });
            setShowUserForm(false);
            showToast('User created successfully!', 'success');
        } catch (error) {
            console.error('Failed to create user:', error);
            showToast(error?.data?.error || 'Failed to create user', 'error');
        }
    };

    const handleAddPage = async (e) => {
        e.preventDefault();
        try {
            await addPage(newPage).unwrap();
            setNewPage({ id: '', name: '', access_token: '' });
            showToast('Page added successfully!', 'success');
        } catch (error) {
            console.error('Failed to add page:', error);
            showToast(error?.data?.error || 'Failed to add page', 'error');
        }
    };

    const handleBulkAssign = async (e) => {
        e.preventDefault();
        if (assignData.selectedPages.length === 0) {
            showToast('Please select at least one page', 'warning');
            return;
        }

        try {
            await bulkAssignPages({
                userId: assignData.userId,
                pageIds: assignData.selectedPages
            }).unwrap();
            setAssignData({ userId: '', selectedPages: [] });
            showToast(`${assignData.selectedPages.length} page(s) assigned successfully!`, 'success');
        } catch (error) {
            console.error('Failed to assign pages:', error);
            showToast(error?.data?.error || 'Failed to assign pages', 'error');
        }
    };

    const handleUnassign = async (userId, pageId) => {
        try {
            await unassignPage({ userId, pageId }).unwrap();
            showToast('Page unassigned successfully!', 'success');
        } catch (error) {
            console.error('Failed to unassign page:', error);
            showToast(error?.data?.error || 'Failed to unassign page', 'error');
        }
    };

    const handleDeleteUser = async (userId) => {
        try {
            await deleteUser(userId).unwrap();
            setShowDeleteModal(null);
            showToast('User deleted successfully!', 'success');
        } catch (error) {
            console.error('Failed to delete user:', error);
            showToast(error?.data?.error || 'Failed to delete user', 'error');
        }
    };

    const handleDeletePage = async (pageId) => {
        try {
            await deletePage(pageId).unwrap();
            setShowDeleteModal(null);
            showToast('Page deleted successfully!', 'success');
        } catch (error) {
            console.error('Failed to delete page:', error);
            showToast(error?.data?.error || 'Failed to delete page', 'error');
        }
    };

    const handleLogout = async () => {
        await logout().unwrap();
        navigate('/login');
    };

    const agentUsers = users.filter(u => u.role === 'agent');
    const totalUsers = users.length;
    const totalAgents = agentUsers.length;
    const totalAdmins = users.filter(u => u.role === 'admin').length;

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
            {/* Toast Notifications */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6 animate-slideIn">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Confirm Deletion</h3>
                        <p className="text-gray-600 mb-6">
                            Are you sure you want to delete <span className="font-semibold">{showDeleteModal.name}</span>? This action cannot be undone.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setShowDeleteModal(null)}
                                className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    if (showDeleteModal.type === 'user') {
                                        handleDeleteUser(showDeleteModal.id);
                                    } else {
                                        handleDeletePage(showDeleteModal.id);
                                    }
                                }}
                                className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 font-medium transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200/50 sticky top-0 z-40 shadow-sm">
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2 rounded-xl shadow-lg">
                            <Shield className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            Admin Dashboard
                        </h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/admin/inbox')}
                            className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-5 py-2.5 rounded-xl hover:shadow-lg hover:scale-105 transition-all flex items-center gap-2 font-medium"
                        >
                            <MessageSquare className="w-4 h-4" />
                            Master Inbox
                        </button>
                        <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
                            <div className="text-right">
                                <p className="text-xs text-gray-500">Logged in as</p>
                                <p className="text-sm font-semibold text-gray-900">{user?.username}</p>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-lg font-medium transition-all"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Total Users</p>
                                <p className="text-3xl font-bold text-gray-900 mt-1">{totalUsers}</p>
                            </div>
                            <div className="bg-blue-100 p-3 rounded-xl">
                                <Users className="w-6 h-6 text-blue-600" />
                            </div>
                        </div>
                        <div className="mt-4 flex gap-4 text-sm">
                            <span className="text-gray-600">Agents: <span className="font-semibold">{totalAgents}</span></span>
                            <span className="text-gray-600">Admins: <span className="font-semibold">{totalAdmins}</span></span>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Total Pages</p>
                                <p className="text-3xl font-bold text-gray-900 mt-1">{pages.length}</p>
                            </div>
                            <div className="bg-purple-100 p-3 rounded-xl">
                                <Layout className="w-6 h-6 text-purple-600" />
                            </div>
                        </div>
                        <p className="mt-4 text-sm text-gray-600">Integrated Facebook pages</p>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Active Assignments</p>
                                <p className="text-3xl font-bold text-gray-900 mt-1">
                                    {assignments.reduce((acc, a) => acc + a.pages_count, 0)}
                                </p>
                            </div>
                            <div className="bg-green-100 p-3 rounded-xl">
                                <Link2 className="w-6 h-6 text-green-600" />
                            </div>
                        </div>
                        <p className="mt-4 text-sm text-gray-600">Page-agent connections</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex space-x-2 bg-white/80 backdrop-blur-sm p-2 rounded-2xl shadow-sm border border-gray-100 w-fit">
                    {['users', 'pages', 'assignments'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === tab
                                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                }`}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* USERS TAB */}
                    {activeTab === 'users' && (
                        <div className="p-8">
                            <div className="flex justify-between items-center mb-8">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
                                    <p className="text-sm text-gray-500 mt-1">Create and manage system users</p>
                                </div>
                                <button
                                    onClick={() => setShowUserForm(!showUserForm)}
                                    className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold transition-all ${showUserForm
                                            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:shadow-lg hover:scale-105'
                                        }`}
                                >
                                    {showUserForm ? <X className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                                    {showUserForm ? 'Cancel' : 'Create User'}
                                </button>
                            </div>

                            {showUserForm && (
                                <div className="mb-8 p-8 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl border-2 border-blue-100">
                                    <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                                        <UserPlus className="w-5 h-5 text-blue-600" />
                                        Create New User
                                    </h3>
                                    <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-gray-700">Username</label>
                                            <input
                                                type="text"
                                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                                value={newUser.username}
                                                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-gray-700">Password</label>
                                            <input
                                                type="password"
                                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                                value={newUser.password}
                                                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                                placeholder="Min 6 chars"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-gray-700">Role</label>
                                            <select
                                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all"
                                                value={newUser.role}
                                                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                                            >
                                                <option value="agent">Agent</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        </div>
                                        <button
                                            type="submit"
                                            className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-xl hover:shadow-lg hover:scale-105 font-semibold transition-all self-end"
                                        >
                                            Create User
                                        </button>
                                    </form>
                                </div>
                            )}

                            {usersLoading ? (
                                <div className="text-center py-12">
                                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto"></div>
                                    <p className="text-gray-500 mt-4">Loading users...</p>
                                </div>
                            ) : users.length === 0 ? (
                                <div className="text-center py-12">
                                    <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                    <p className="text-gray-500">No users found. Create your first user!</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b-2 border-gray-100">
                                                <th className="pb-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">Username</th>
                                                <th className="pb-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">Role</th>
                                                <th className="pb-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">Created</th>
                                                <th className="pb-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">Assigned Pages</th>
                                                <th className="pb-4 text-right text-sm font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {users.map((u) => (
                                                <tr key={u.id} className="group hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-purple-50/50 transition-all">
                                                    <td className="py-5 font-semibold text-gray-900">{u.username}</td>
                                                    <td className="py-5">
                                                        <span
                                                            className={`px-3 py-1.5 rounded-full text-xs font-bold ${u.role === 'admin'
                                                                    ? 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-700'
                                                                    : 'bg-gradient-to-r from-green-100 to-green-200 text-green-700'
                                                                }`}
                                                        >
                                                            {u.role.toUpperCase()}
                                                        </span>
                                                    </td>
                                                    <td className="py-5 text-sm text-gray-600">
                                                        {new Date(u.created_at || Date.now()).toLocaleDateString('en-US', {
                                                            year: 'numeric',
                                                            month: 'short',
                                                            day: 'numeric'
                                                        })}
                                                    </td>
                                                    <td className="py-5">
                                                        <span className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                                                            {u.assigned_pages_count || 0} {u.assigned_pages_count === 1 ? 'page' : 'pages'}
                                                        </span>
                                                    </td>
                                                    <td className="py-5 text-right">
                                                        <button
                                                            onClick={() => setShowDeleteModal({ type: 'user', id: u.id, name: u.username })}
                                                            className="p-2.5 text-gray-400 hover:text-white hover:bg-red-500 rounded-lg transition-all hover:scale-110 hover:shadow-md"
                                                            title="Delete User"
                                                        >
                                                            <Trash2 className="w-5 h-5" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* PAGES TAB */}
                    {activeTab === 'pages' && (
                        <div className="p-8">
                            <div className="mb-8">
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">Page Management</h2>
                                <p className="text-sm text-gray-500">Integrate and manage Facebook pages</p>
                            </div>

                            <div className="mb-8 p-8 bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl border-2 border-purple-100">
                                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-6">
                                    <Layout className="w-5 h-5 text-purple-600" />
                                    Add New Facebook Page
                                </h3>
                                <form onSubmit={handleAddPage} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-gray-700">Page Name</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                                            value={newPage.name}
                                            onChange={(e) => setNewPage({ ...newPage, name: e.target.value })}
                                            placeholder="My Page"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-gray-700">Page ID</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                                            value={newPage.id}
                                            onChange={(e) => setNewPage({ ...newPage, id: e.target.value })}
                                            placeholder="123456789"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-gray-700">Access Token</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                                            value={newPage.access_token}
                                            onChange={(e) => setNewPage({ ...newPage, access_token: e.target.value })}
                                            placeholder="EAAxxxxxx"
                                            required
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        className="bg-gradient-to-r from-purple-500 to-blue-600 text-white px-6 py-3 rounded-xl hover:shadow-lg hover:scale-105 font-semibold transition-all self-end"
                                    >
                                        <Plus className="w-5 h-5 inline mr-2" />
                                        Add Page
                                    </button>
                                </form>
                            </div>

                            {pagesLoading ? (
                                <div className="text-center py-12">
                                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mx-auto"></div>
                                    <p className="text-gray-500 mt-4">Loading pages...</p>
                                </div>
                            ) : pages.length === 0 ? (
                                <div className="text-center py-12">
                                    <Layout className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                    <p className="text-gray-500">No pages integrated yet. Add your first page above!</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {pages.map((page) => (
                                        <div
                                            key={page.id}
                                            className="group relative bg-white border-2 border-gray-100 rounded-2xl p-6 hover:border-purple-300 hover:shadow-lg transition-all"
                                        >
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="bg-gradient-to-br from-purple-100 to-blue-100 p-3 rounded-xl">
                                                    <Layout className="w-6 h-6 text-purple-600" />
                                                </div>
                                                <button
                                                    onClick={() => setShowDeleteModal({ type: 'page', id: page.id, name: page.name })}
                                                    className="p-2 text-gray-400 hover:text-white hover:bg-red-500 rounded-lg transition-all hover:scale-110"
                                                    title="Delete Page"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <h3 className="font-bold text-lg text-gray-900 mb-1">{page.name}</h3>
                                            <p className="text-xs text-gray-500 mb-4 font-mono">ID: {page.id}</p>
                                            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                                                    Active
                                                </span>
                                                <span className="text-xs text-gray-600">
                                                    {page.assigned_users_count || 0} {page.assigned_users_count === 1 ? 'agent' : 'agents'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ASSIGNMENTS TAB */}
                    {activeTab === 'assignments' && (
                        <div className="p-8">
                            <div className="mb-8">
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">Page Assignments</h2>
                                <p className="text-sm text-gray-500">Assign Facebook pages to agents</p>
                            </div>

                            {/* Assignment Form */}
                            <div className="mb-8 p-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-100">
                                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                                    <Link2 className="w-5 h-5 text-blue-600" />
                                    Assign Pages to Agent
                                </h3>
                                <form onSubmit={handleBulkAssign} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="block text-sm font-semibold text-gray-700">Select Agent</label>
                                            <select
                                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all"
                                                value={assignData.userId}
                                                onChange={(e) => setAssignData({ ...assignData, userId: e.target.value })}
                                                required
                                            >
                                                <option value="">Choose an agent...</option>
                                                {agentUsers.map((u) => (
                                                    <option key={u.id} value={u.id}>
                                                        {u.username} ({u.assigned_pages_count || 0} pages assigned)
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <MultiSelect
                                            label="Select Pages"
                                            options={pages.map((p) => ({ value: p.id, label: p.name }))}
                                            value={assignData.selectedPages}
                                            onChange={(selected) => setAssignData({ ...assignData, selectedPages: selected })}
                                            placeholder="Choose pages to assign..."
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={!assignData.userId || assignData.selectedPages.length === 0}
                                        className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-4 rounded-xl hover:shadow-lg hover:scale-[1.02] font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                                    >
                                        Assign {assignData.selectedPages.length > 0 && `${assignData.selectedPages.length} `}
                                        Page{assignData.selectedPages.length !== 1 ? 's' : ''}
                                    </button>
                                </form>
                            </div>

                            {/* Current Assignments */}
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-4">Current Assignments</h3>
                                {assignmentsLoading ? (
                                    <div className="text-center py-12">
                                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto"></div>
                                        <p className="text-gray-500 mt-4">Loading assignments...</p>
                                    </div>
                                ) : assignments.length === 0 ? (
                                    <div className="text-center py-12 bg-gray-50 rounded-2xl">
                                        <Link2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                        <p className="text-gray-500">No assignments yet. Assign pages to agents above!</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {assignments.map((assignment) => (
                                            <div
                                                key={assignment.user_id}
                                                className="bg-white border-2 border-gray-100 rounded-2xl p-6 hover:border-blue-200 hover:shadow-md transition-all"
                                            >
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="bg-gradient-to-br from-blue-100 to-indigo-100 p-2.5 rounded-xl">
                                                            <Users className="w-5 h-5 text-blue-600" />
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-gray-900">{assignment.username}</h4>
                                                            <p className="text-xs text-gray-500">
                                                                {assignment.pages_count} page{assignment.pages_count !== 1 ? 's' : ''} assigned
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {assignment.pages_count > 0 && (
                                                    <div className="flex flex-wrap gap-2">
                                                        {assignment.pages.map((page) => (
                                                            <div
                                                                key={page.page_id}
                                                                className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg group hover:bg-blue-100 transition-all"
                                                            >
                                                                <span className="text-sm font-medium text-gray-700">{page.page_name}</span>
                                                                <button
                                                                    onClick={() => handleUnassign(assignment.user_id, page.page_id)}
                                                                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                                                                    title="Unassign"
                                                                >
                                                                    <X className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;
