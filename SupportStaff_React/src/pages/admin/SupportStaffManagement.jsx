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
        <div className="h-full flex flex-col min-h-0 bg-[#f8fafc]">
            {/* Main Table Card - Premium Registry Style */}
            <div className="flex-1 min-h-0 bg-white shadow-2xl shadow-slate-200/50 flex flex-col overflow-hidden border border-slate-100 rounded-[2.5rem] m-2">
                {/* Header Section - Compact */}
                <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-white flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-600 shadow-xl shadow-purple-100 rounded-2xl text-white">
                            <Users size={22} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 tracking-tight leading-tight">Support Personnel Registry</h2>
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-0.5">Staff Resource Management</p>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
                        <div className="flex items-center gap-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Show</label>
                            <select
                                value={pageSize}
                                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(0); }}
                                className="px-3 py-1.5 text-xs border border-slate-100 rounded-xl bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all font-bold"
                            >
                                <option value={10}>10 Items</option>
                                <option value={25}>25 Items</option>
                                <option value={50}>50 Items</option>
                            </select>
                        </div>
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                            <input
                                type="text"
                                placeholder="Sync by identity..."
                                className="w-full px-5 py-2 pl-10 text-xs border border-slate-100 rounded-2xl bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all font-medium placeholder:text-slate-300"
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(0); }}
                            />
                        </div>
                        <button
                            onClick={() => handleOpenModal()}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 shadow-xl shadow-slate-100"
                        >
                            <UserPlus size={16} />
                            Add Staff
                        </button>
                    </div>
                </div>

                {/* Compact Table Content */}
                <div className="flex-1 overflow-auto custom-scrollbar relative">
                    <table className="w-full border-collapse">
                        <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-100">
                            <tr className="text-slate-400 font-black text-xs tracking-[0.15em] uppercase">
                                <th className="py-3 px-6 text-center">NO.</th>
                                <th className="text-left py-3 px-4 uppercase tabular-nums">STAFF IDENTITY</th>
                                <th className="py-3 px-4 text-center">COMMUNICATION FEED</th>
                                <th className="py-3 px-4 text-center">CONTACT VECTOR</th>
                                <th className="py-3 px-4 text-center">LIFECYCLE STATUS</th>
                                <th className="py-3 px-4 text-center">OPERATION</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm font-semibold text-slate-600 divide-y divide-slate-50 bg-white">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="py-20 text-center">
                                        <Loader2 size={40} className="animate-spin text-purple-600 mx-auto" />
                                        <p className="mt-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Synchronizing Personnel Data...</p>
                                    </td>
                                </tr>
                            ) : staff.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="py-20 text-center text-slate-300 italic font-medium">No personnel records detected in the current pulse.</td>
                                </tr>
                            ) : (
                                staff.map((s, index) => (
                                    <tr key={s.id || index} className="hover:bg-slate-50/50 transition-colors group border-b border-slate-50 last:border-0">
                                        <td className="py-2.5 px-6 text-center text-slate-300 font-bold tabular-nums text-sm">
                                            {(currentPage * pageSize) + index + 1}
                                        </td>
                                        <td className="py-2.5 px-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center font-black text-xs border border-slate-200 group-hover:bg-white group-hover:border-purple-200 group-hover:text-purple-600 transition-all">
                                                    {s.fullname?.[0]?.toUpperCase() || 'A'}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 leading-none">{s.fullname}</p>
                                                    <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-tighter">@{s.username}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-2.5 px-4 text-center">
                                            <div className="inline-flex items-center gap-1.5 text-blue-500 font-bold text-sm">
                                                <Mail size={14} className="opacity-40" />
                                                <span className="tracking-tight">{s.email || 'N/A'}</span>
                                            </div>
                                        </td>
                                        <td className="py-2.5 px-4 text-center">
                                            <div className="inline-flex items-center gap-1.5 text-slate-500 font-bold tabular-nums tracking-wider text-sm">
                                                <Phone size={14} className="opacity-30" />
                                                {s.contactNumber}
                                            </div>
                                        </td>
                                        <td className="py-2.5 px-4 text-center">
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
                                                        <span>INACTIVE</span>
                                                        <Power size={14} />
                                                    </>
                                                )}
                                            </button>
                                        </td>
                                        <td className="py-2.5 px-4 text-center">
                                            <div className="flex justify-center gap-2 transition-all">
                                                <button
                                                    onClick={() => handleOpenModal(s)}
                                                    className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-sm"
                                                    title="Refine Agent"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(s.id, s.fullname)}
                                                    className="p-2 text-red-600 bg-red-50 hover:bg-red-600 hover:text-white rounded-xl transition-all shadow-sm"
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

                {/* Compact Pagination */}
                <div className="p-6 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/50 flex-shrink-0">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                        Personnel Cluster: <span className="text-slate-800 font-bold">{totalElements} Records synchronized</span>
                    </div>
                    <div className="flex gap-2">
                        <button
                            disabled={currentPage === 0 || loading}
                            onClick={() => setCurrentPage(p => p - 1)}
                            className="px-5 py-2 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl border border-slate-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-white text-slate-600 shadow-sm hover:bg-slate-50"
                        >
                            Back
                        </button>
                        <div className="flex items-center gap-2">
                            <span className="w-8 h-8 flex items-center justify-center bg-purple-600 text-white rounded-[0.75rem] text-[10px] font-black shadow-lg shadow-purple-100">
                                {currentPage + 1}
                            </span>
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">of {totalPages || 1}</span>
                        </div>
                        <button
                            disabled={currentPage >= totalPages - 1 || loading}
                            onClick={() => setCurrentPage(p => p + 1)}
                            className="px-5 py-2 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl border border-slate-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-white text-slate-600 shadow-sm hover:bg-slate-50"
                        >
                            Step
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
                            <button onClick={() => setModalOpen(false)} className="p-2 hover:bg-white rounded-full transition-all text-slate-400">
                                <X size={24} />
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
