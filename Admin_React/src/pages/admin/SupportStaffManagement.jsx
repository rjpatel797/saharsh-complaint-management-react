import React, { useState, useEffect, useCallback } from 'react';
import {
    Users,
    UserPlus,
    Search,
    Edit2,
    Trash2,
    Loader2,
    ChevronLeft,
    ChevronRight,
    Eye,
    EyeOff,
    Mail,
    Phone,
    User,
    Power,
    X,
    FileText,
    CircleDot
} from 'lucide-react';
import apiClient from '../../api/apiClient';
import Swal from 'sweetalert2';

const SupportStaffManagement = () => {
    // State
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [totalElements, setTotalElements] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    // Modal State
    const [modalOpen, setModalOpen] = useState(false);
    const [editId, setEditId] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [modalLoading, setModalLoading] = useState(false);
    
    // Table Password Visibility State
    const [visiblePasswords, setVisiblePasswords] = useState(new Set());

    // Form Data
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        fullname: '',
        email: '',
        contactnumber: ''
    });

    const [formErrors, setFormErrors] = useState({
        username: '',
        password: '',
        fullname: '',
        email: '',
        contactnumber: ''
    });

    const showToast = (message, type = 'success') => {
        Swal.fire({
            title: type === 'success' ? 'Success' : 'Error',
            text: message,
            icon: type,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true
        });
    };

    // Fetch Staff Members
    const fetchStaff = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                page: currentPage,
                size: pageSize,
                searchTerm: searchTerm.trim() || undefined
            };
            const response = await apiClient.get('/admin/getAllSupportStaff', { params });
            if (response.data) {
                setStaff(response.data.data || []);
                setTotalElements(response.data.totalElements || 0);
                setTotalPages(response.data.totalPages || 0);
            }
        } catch (error) {
            console.error('Error fetching staff:', error);
            showToast('Failed to load support staff', 'error');
        } finally {
            setLoading(false);
        }
    }, [currentPage, pageSize, searchTerm]);

    useEffect(() => {
        const timer = setTimeout(fetchStaff, 300);
        return () => clearTimeout(timer);
    }, [fetchStaff]);

    // Handle Open/Edit Modal
    const handleOpenModal = (staffMember = null) => {
        if (staffMember) {
            setEditId(staffMember.id);
            setFormData({
                username: staffMember.username || '',
                password: staffMember.password || '',
                fullname: staffMember.fullname || '',
                email: staffMember.email || '',
                contactnumber: staffMember.contactNumber || ''
            });
        } else {
            setEditId(null);
            setFormData({
                username: '',
                password: '',
                fullname: '',
                email: '',
                contactnumber: ''
            });
        }
        setFormErrors({
            username: '',
            password: '',
            fullname: '',
            email: '',
            contactnumber: ''
        });
        setShowPassword(false);
        setModalOpen(true);
    };

    // Toggle Password Visibility
    const togglePasswordVisibility = (staffId) => {
        setVisiblePasswords(prev => {
            const newSet = new Set(prev);
            if (newSet.has(staffId)) {
                newSet.delete(staffId);
            } else {
                newSet.add(staffId);
            }
            return newSet;
        });
    };

    // Handle Status Toggle
    const handleStatusToggle = async (id, currentStatus) => {
        const newStatus = !currentStatus;
        try {
            const res = await apiClient.put(`/admin/updateSupportStaffStatus/${id}?status=${newStatus}`);
            if (res.data.status) {
                showToast(res.data.message || `Status updated successfully`, 'success');
                fetchStaff();
            } else {
                showToast(res.data.message || 'Failed to update status', 'error');
            }
        } catch (error) {
            showToast('Network error occurred', 'error');
        }
    };

    // Handle Delete
    const handleDelete = async (id, name) => {
        const result = await Swal.fire({
            title: 'Delete Staff?',
            text: `Are you sure you want to delete ${name}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Yes, delete'
        });

        if (result.isConfirmed) {
            try {
                const res = await apiClient.delete(`/admin/deleteSupportStaff/${id}`);
                if (res.data.status) {
                    showToast('Staff member deleted successfully', 'success');
                    fetchStaff();
                } else {
                    showToast(res.data.message || 'Failed to delete staff member', 'error');
                }
            } catch (error) {
                showToast('Failed to delete staff member', 'error');
            }
        }
    };

    // Form Validation
    const validateForm = () => {
        const errors = {};
        let isValid = true;

        if (!formData.username.trim()) {
            errors.username = 'Username is required';
            isValid = false;
        }

        if (!formData.password.trim()) {
            errors.password = 'Password is required';
            isValid = false;
        }

        if (!formData.fullname.trim()) {
            errors.fullname = 'Full Name is required';
            isValid = false;
        }

        if (!formData.email.trim()) {
            errors.email = 'Email is required';
            isValid = false;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            errors.email = 'Invalid email format';
            isValid = false;
        }

        if (!formData.contactnumber.trim()) {
            errors.contactnumber = 'Contact number is required';
            isValid = false;
        } else if (formData.contactnumber.length !== 10) {
            errors.contactnumber = 'Number must be 10 digits';
            isValid = false;
        }

        setFormErrors(errors);
        return isValid;
    };

    // Submit Handler
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        setModalLoading(true);
        try {
            let res;
            if (editId) {
                res = await apiClient.put(`/admin/updateSupportStaff/${editId}`, formData);
            } else {
                const params = new URLSearchParams(formData).toString();
                res = await apiClient.post(`/admin/addSupportStaff?${params}`);
            }

            if (res.data.status) {
                showToast(res.data.message || 'Operation successful', 'success');
                setModalOpen(false);
                fetchStaff();
            } else {
                showToast(res.data.message || 'Operation failed', 'error');
            }
        } catch (error) {
            showToast(error.response?.data?.message || 'Network error occurred', 'error');
        } finally {
            setModalLoading(false);
        }
    };

    return (
        // Root layout - match Dashboard spacing (slight gap below navbar)
        <div className="h-full flex flex-col gap-6 mt-4">
            {/* Main Table Card - auto height (no extra empty vertical space) */}
            <div className="bg-white flex flex-col overflow-hidden">
                {/* Header Section - aligned with Dashboard header */}
                <div className="px-4 md:px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 via-white to-gray-50 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="p-3 bg-purple-600 shadow-xl shadow-purple-100 rounded-2xl text-white">
                            <Users size={22} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 tracking-tight leading-tight">Support Personnel Registry</h2>
                            <p className="text-xs text-gray-500 font-medium">Staff resource management</p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                        <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-200">
                            <label className="text-xs font-semibold text-gray-600 whitespace-nowrap">Show</label>
                            <select
                                value={pageSize}
                                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(0); }}
                                className="px-2 py-1 text-sm border-0 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium cursor-pointer"
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                            </select>
                            <span className="text-xs font-semibold text-gray-600 whitespace-nowrap">entries</span>
                        </div>
                        <div className="relative flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-200">
                            <Search className="text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search staff..."
                                className="px-2 py-1 text-sm border-0 rounded-lg bg-transparent text-gray-700 w-full min-w-[150px] md:w-64 focus:outline-none focus:ring-0 placeholder:text-gray-400 font-medium"
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(0); }}
                            />
                        </div>
                        <button
                            onClick={() => handleOpenModal()}
                            className="bg-gradient-to-r from-purple-600 via-purple-600 to-indigo-600 hover:from-purple-700 hover:via-purple-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-95 group"
                        >
                            <UserPlus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                            <span>Add Staff</span>
                        </button>
                    </div>
                </div>

                {/* Table Content - aligned with Dashboard table structure */}
                <div className="flex-1 overflow-auto custom-scrollbar relative">
                    <table className="w-full border-collapse min-w-full">
                        <thead className="bg-gradient-to-r from-gray-50 to-gray-100 sticky top-0 z-10 shadow-md">
                            <tr>
                                <th className="whitespace-nowrap py-4 px-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">SR NO.</th>
                                <th className="whitespace-nowrap py-4 px-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">STAFF IDENTITY</th>
                                <th className="whitespace-nowrap py-4 px-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">PASSWORD</th>
                                <th className="whitespace-nowrap py-4 px-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">COMMUNICATION EMAIL</th>
                                <th className="whitespace-nowrap py-4 px-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">CONTACT VECTOR</th>
                                <th className="whitespace-nowrap py-4 px-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">LIFECYCLE STATUS</th>
                                <th className="whitespace-nowrap py-4 px-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">OPERATION</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm bg-white divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="text-center py-20">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="relative">
                                                <div className="absolute inset-0 bg-blue-200 rounded-full blur-xl opacity-50 animate-pulse"></div>
                                                <Loader2 className="relative animate-spin mx-auto text-blue-600" size={40} />
                                            </div>
                                            <div>
                                                <p className="text-gray-700 font-semibold text-base">Fetching staff records...</p>
                                                <p className="text-gray-400 text-sm mt-1">Please wait while we load your data</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ) : staff.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="text-center py-20">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="p-4 bg-gray-100 rounded-full">
                                                <FileText className="text-gray-400" size={32} />
                                            </div>
                                            <p className="text-gray-500 font-semibold text-base">No staff records found.</p>
                                            <p className="text-gray-400 text-sm">Try adjusting your search filters</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                staff.map((s, index) => (
                                    <tr key={s.id || index} className="group hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/50 transition-all duration-200 border-b border-gray-100">
                                        <td className="text-gray-700 whitespace-nowrap text-center py-4 px-4 font-medium">
                                            {(currentPage * pageSize) + index + 1}
                                        </td>
                                        <td className="whitespace-nowrap py-4 px-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center font-black text-xs border border-slate-200 group-hover:bg-white group-hover:border-purple-200 group-hover:text-purple-600 transition-all">
                                                    {s.fullname?.[0]?.toUpperCase() || 'A'}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900 leading-none">{s.fullname}</p>
                                                    <p className="text-xs text-gray-400 font-bold mt-1 uppercase tracking-tighter">@{s.username}</p>
                                                </div>
                                            </div>
                                        </td>
                                        {/* Password */}
                                        <td className="whitespace-nowrap py-4 px-4 text-center">
                                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-xs font-mono tracking-widest shadow-sm">
                                                <span className="min-w-[80px] text-center">
                                                    {visiblePasswords.has(s.id) 
                                                        ? (s.password || 'N/A')
                                                        : (s.password ? '•'.repeat(Math.min(s.password.length, 12)) : 'N/A')
                                                    }
                                                </span>
                                                {s.password && (
                                                    <button
                                                        onClick={() => togglePasswordVisibility(s.id)}
                                                        className="text-slate-400 hover:text-purple-600 transition-colors p-1 hover:bg-purple-50 rounded"
                                                        title={visiblePasswords.has(s.id) ? 'Hide password' : 'Show password'}
                                                    >
                                                        {visiblePasswords.has(s.id) ? <EyeOff size={14} /> : <Eye size={14} />}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        {/* Email */}
                                        <td className="whitespace-nowrap py-4 px-4 text-center">
                                            <div className="inline-flex items-center gap-1.5 text-blue-500 font-bold text-sm justify-center">
                                                <Mail size={14} className="opacity-40" />
                                                <span className="tracking-tight">{s.email || 'N/A'}</span>
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap py-4 px-4 text-center">
                                            <div className="inline-flex items-center gap-1.5 text-slate-500 font-bold tabular-nums tracking-wider text-sm justify-center">
                                                <Phone size={14} className="opacity-30" />
                                                {s.contactNumber}
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap py-4 px-4 text-center">
                                            <button
                                                onClick={() => handleStatusToggle(s.id, s.status)}
                                                className={`mx-auto px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider transition-all border-2 flex items-center justify-center gap-1.5 ${s.status
                                                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-600 hover:text-white'
                                                        : 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-600 hover:text-white'
                                                    }`}
                                            >
                                                {s.status ? (
                                                    <>
                                                        <Power size={14} />
                                                        <span>ACTIVE</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Power size={14} className="rotate-180" />
                                                        <span>INACTIVE</span>
                                                    </>
                                                )}
                                            </button>
                                        </td>
                                        <td className="whitespace-nowrap py-4 px-4 text-center">
                                            <div className="flex justify-center gap-2 transition-all">
                                                <button
                                                    onClick={() => handleOpenModal(s)}
                                                    className="p-2 rounded-lg text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md"
                                                    title="Refine Agent"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(s.id, s.fullname)}
                                                    className="p-2 rounded-lg text-red-600 bg-red-50 hover:bg-red-600 hover:text-white hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md"
                                                    title="Purge Agent"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination - aligned with Dashboard pagination structure */}
                <div className="px-4 md:px-6 py-5 border-t border-gray-200 bg-gradient-to-r from-gray-50/50 to-white flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="text-sm text-gray-600 font-medium">
                        Showing{' '}
                        <span className="font-bold text-gray-900">
                            {totalElements > 0 ? (currentPage * pageSize) + 1 : 0}
                        </span>{' '}
                        to{' '}
                        <span className="font-bold text-gray-900">
                            {Math.min((currentPage + 1) * pageSize, totalElements)}
                        </span>{' '}
                        of{' '}
                        <span className="font-bold text-gray-900">
                            {totalElements}
                        </span>{' '}
                        entries
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            disabled={currentPage === 0 || loading}
                            onClick={() => setCurrentPage(p => p - 1)}
                            className="px-4 py-2 text-sm font-semibold rounded-xl border-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-white hover:bg-gray-50 border-gray-300 text-gray-700 hover:border-gray-400 hover:shadow-md disabled:hover:shadow-none disabled:hover:bg-white"
                        >
                            Previous
                        </button>
                        <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl shadow-lg">
                            <span className="text-sm font-bold">{currentPage + 1}</span>
                            <span className="text-xs opacity-80">of</span>
                            <span className="text-sm font-bold">{totalPages || 1}</span>
                        </div>
                        <button
                            disabled={currentPage >= totalPages - 1 || loading}
                            onClick={() => setCurrentPage(p => p + 1)}
                            className="px-4 py-2 text-sm font-semibold rounded-xl border-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-white hover:bg-gray-50 border-gray-300 text-gray-700 hover:border-gray-400 hover:shadow-md disabled:hover:shadow-none disabled:hover:bg-white"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>

            {/* Premium Staff Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 animate-fade-in" onClick={() => setModalOpen(false)}>
                    <div
                        className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-slide-up border border-white/20"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-8 pb-4 flex justify-between items-center bg-slate-50/50 border-b border-slate-100">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-purple-600 rounded-2xl text-white shadow-lg shadow-purple-100">
                                    <UserPlus size={20} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800 tracking-tight">
                                        {editId ? 'Resync Personnel Node' : 'Initialize New Staff'}
                                    </h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Staff Credentials Management</p>
                                </div>
                            </div>
                            <button onClick={() => setModalOpen(false)} className="p-2 hover:bg-white rounded-full transition-all text-slate-400 group">
                                <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-6 bg-white/50">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Username</label>
                                    <input
                                        type="text"
                                        placeholder="agent_sync_01"
                                        className={`w-full bg-slate-50 border-none rounded-2xl px-5 py-3 text-sm font-bold focus:ring-4 focus:ring-purple-500/5 transition-all text-slate-700 placeholder:text-slate-300 ${formErrors.username ? 'ring-2 ring-red-500/50' : ''}`}
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    />
                                    {formErrors.username && <p className="text-red-500 text-[9px] font-black uppercase tracking-wider ml-2">{formErrors.username}</p>}
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="••••••••"
                                            className={`w-full bg-slate-50 border-none rounded-2xl px-5 py-3 text-sm font-bold focus:ring-4 focus:ring-purple-500/5 transition-all text-slate-700 placeholder:text-slate-300 pr-12 ${formErrors.password ? 'ring-2 ring-red-500/50' : ''}`}
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-purple-500 transition-colors"
                                        >
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    {formErrors.password && <p className="text-red-500 text-[9px] font-black uppercase tracking-wider ml-2">{formErrors.password}</p>}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Identity Name</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Enter agent's true name"
                                        className={`w-full bg-slate-50 border-none rounded-2xl px-12 py-3 text-sm font-bold focus:ring-4 focus:ring-purple-500/5 transition-all text-slate-700 placeholder:text-slate-300 ${formErrors.fullname ? 'ring-2 ring-red-500/50' : ''}`}
                                        value={formData.fullname}
                                        onChange={(e) => setFormData({ ...formData, fullname: e.target.value })}
                                    />
                                </div>
                                {formErrors.fullname && <p className="text-red-500 text-[9px] font-black uppercase tracking-wider ml-2">{formErrors.fullname}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                                    <input
                                        type="email"
                                        placeholder="agent@matrix.com"
                                        className={`w-full bg-slate-50 border-none rounded-2xl px-5 py-3 text-sm font-bold focus:ring-4 focus:ring-purple-500/5 transition-all text-slate-700 placeholder:text-slate-300 ${formErrors.email ? 'ring-2 ring-red-500/50' : ''}`}
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                    {formErrors.email && <p className="text-red-500 text-[9px] font-black uppercase tracking-wider ml-2">{formErrors.email}</p>}
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Number</label>
                                    <input
                                        type="text"
                                        maxLength="10"
                                        placeholder="10 digit pulse"
                                        className={`w-full bg-slate-50 border-none rounded-2xl px-5 py-3 text-sm font-bold focus:ring-4 focus:ring-purple-500/5 transition-all text-slate-700 placeholder:text-slate-300 ${formErrors.contactnumber ? 'ring-2 ring-red-500/50' : ''}`}
                                        value={formData.contactnumber}
                                        onChange={(e) => setFormData({ ...formData, contactnumber: e.target.value })}
                                    />
                                    {formErrors.contactnumber && <p className="text-red-500 text-[9px] font-black uppercase tracking-wider ml-2">{formErrors.contactnumber}</p>}
                                </div>
                            </div>

                            <div className="pt-8 border-t border-slate-100 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all"
                                >
                                    Abort
                                </button>
                                <button
                                    type="submit"
                                    disabled={modalLoading}
                                    className="px-10 py-3 bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl disabled:opacity-50 transition-all shadow-xl shadow-slate-100 active:scale-95 flex items-center gap-2"
                                >
                                    {modalLoading && <Loader2 className="animate-spin" size={14} />}
                                    {editId ? 'Commit Sync' : 'Finalize Agent'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SupportStaffManagement;
