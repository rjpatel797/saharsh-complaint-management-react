import React, { useState, useEffect, useCallback } from 'react';
import {
    Key,
    Plus,
    Search,
    Edit,
    Trash2,
    Loader2,
    ChevronLeft,
    ChevronRight,
    Mail,
    Server,
    Hash,
    Clock,
    Eye,
    EyeOff,
    CheckCircle2,
    XCircle,
    MoreVertical
} from 'lucide-react';
import apiClient from '../../api/apiClient';
import Swal from 'sweetalert2';

const StaffCredentials = () => {
    const [credentials, setCredentials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [totalElements, setTotalElements] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    // Form State
    const [modalOpen, setModalOpen] = useState(false);
    const [editId, setEditId] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        apppassword: '',
        host: '',
        port: '',
        time: ''
    });

    // Time Selection (HH:MM)
    const [hour, setHour] = useState('');
    const [minute, setMinute] = useState('');

    const fetchCredentials = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                page: currentPage,
                size: pageSize,
                searchTerm: searchTerm.trim() || undefined
            };
            const response = await apiClient.get('/admin/getAllStaffEmailCredentials', { params });
            if (response.data) {
                setCredentials(response.data.data || []);
                setTotalElements(response.data.totalElements || 0);
                setTotalPages(response.data.totalPages || 0);
            }
        } catch (error) {
            console.error('Error fetching credentials:', error);
        } finally {
            setLoading(false);
        }
    }, [currentPage, pageSize, searchTerm]);

    useEffect(() => {
        const timer = setTimeout(fetchCredentials, 300);
        return () => clearTimeout(timer);
    }, [fetchCredentials]);

    const handleOpenModal = (cred = null) => {
        if (cred) {
            setEditId(cred.id);
            setFormData({
                email: cred.email || '',
                apppassword: cred.appPassword || cred.apppassword || '',
                host: cred.host || '',
                port: cred.port || '',
                time: cred.time || ''
            });
            const [h, m] = (cred.time || '').split(':');
            setHour(h || '');
            setMinute(m || '');
        } else {
            setEditId(null);
            setFormData({
                email: '',
                apppassword: '',
                host: 'smtp.gmail.com',
                port: '587',
                time: ''
            });
            setHour('');
            setMinute('');
        }
        setShowPassword(false);
        setModalOpen(true);
    };

    const handleDelete = async (id, email) => {
        const result = await Swal.fire({
            title: 'Delete Credential?',
            text: `Are you sure you want to remove credentials for ${email}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Yes, delete it!'
        });

        if (result.isConfirmed) {
            try {
                const res = await apiClient.delete(`/admin/deleteStaffEmailCredential/${id}`);
                if (res.data.status) {
                    Swal.fire('Deleted!', res.data.message, 'success');
                    fetchCredentials();
                }
            } catch (error) {
                Swal.fire('Error', 'Failed to delete credential', 'error');
            }
        }
    };

    const handleToggleStatus = async (id, currentStatus) => {
        const newStatus = !currentStatus;
        try {
            const res = await apiClient.patch(`/admin/changeStaffEmailCredentialStatus/${id}?status=${newStatus}`);
            if (res.data.status) {
                Swal.fire('Updated!', res.data.message, 'success');
                fetchCredentials();
            }
        } catch (error) {
            Swal.fire('Error', 'Failed to update status', 'error');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!hour || !minute) {
            Swal.fire('Wait', 'Please select a valid time (HH:MM)', 'info');
            return;
        }

        const timeString = `${hour}:${minute}`;
        const payload = { ...formData, time: timeString };

        setLoading(true);
        try {
            const res = editId
                ? await apiClient.put(`/admin/updateStaffEmailCredential/${editId}`, payload)
                : await apiClient.post('/admin/addStaffEmailcredential', payload);

            if (res.data.status) {
                Swal.fire('Success', res.data.message, 'success');
                setModalOpen(false);
                fetchCredentials();
            } else {
                Swal.fire('Failed', res.data.message, 'error');
            }
        } catch (error) {
            Swal.fire('Error', 'An error occurred while saving', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-800 text-white rounded-xl shadow-lg ring-4 ring-slate-50">
                        <Key size={28} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Staff Email Credentials</h2>
                        <p className="text-sm text-gray-500 font-medium">Manage SMTP settings and application authentication</p>
                    </div>
                </div>
                <button onClick={() => handleOpenModal()} className="btn bg-slate-800 hover:bg-slate-900 border-none text-white shadow-lg shadow-slate-200 gap-2 px-6">
                    <Plus size={18} />
                    Register Credential
                </button>
            </div>

            {/* Main Table Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50/50">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by email, host or port..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input input-bordered w-full pl-10 focus:ring-2 focus:ring-slate-500 border-gray-200"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-400 font-bold uppercase tracking-wider">Show</span>
                        <select
                            value={pageSize}
                            onChange={(e) => setPageSize(Number(e.target.value))}
                            className="select select-bordered select-sm font-bold text-slate-700"
                        >
                            {[10, 25, 50].map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="table table-zebra w-full text-center">
                        <thead className="bg-gray-50 text-gray-400 font-bold uppercase text-[10px] tracking-widest border-b border-gray-100">
                            <tr>
                                <th>No.</th>
                                <th>EMAIL ADDRESS</th>
                                <th>APP PASSWORD</th>
                                <th>SERVER HOST</th>
                                <th>PORT</th>
                                <th>SYNC TIME</th>
                                <th>STATUS</th>
                                <th>ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {loading && !credentials.length ? (
                                <tr>
                                    <td colSpan="8" className="py-20 text-center">
                                        <Loader2 className="animate-spin mx-auto text-slate-800" size={32} />
                                        <p className="mt-2 text-gray-400 font-bold uppercase text-[10px] tracking-widest">Loading...</p>
                                    </td>
                                </tr>
                            ) : credentials.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="py-20 text-center text-gray-400 font-medium">No email credentials found.</td>
                                </tr>
                            ) : (
                                credentials.map((c, idx) => (
                                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="text-gray-400 font-bold">{(currentPage * pageSize) + idx + 1}</td>
                                        <td className="font-bold text-slate-800">
                                            <div className="flex items-center justify-center gap-2">
                                                <Mail size={14} className="text-slate-400" />
                                                {c.email}
                                            </div>
                                        </td>
                                        <td className="font-mono text-xs text-gray-500 tracking-tighter">
                                            {"•".repeat(12)}
                                        </td>
                                        <td className="text-gray-600 font-medium">{c.host}</td>
                                        <td>
                                            <span className="px-2 py-0.5 rounded-lg bg-gray-100 text-gray-600 font-bold text-[10px] uppercase">
                                                {c.port}
                                            </span>
                                        </td>
                                        <td className="font-bold text-slate-700">{c.time}</td>
                                        <td>
                                            <button
                                                onClick={() => handleToggleStatus(c.id, c.status)}
                                                className={`badge badge-sm gap-1.5 font-bold uppercase text-[9px] py-2 px-3 border-0 transition-all hover:scale-105 active:scale-95 ${c.status ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                                                    }`}
                                            >
                                                {c.status ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                                                {c.status ? 'Active' : 'Inactive'}
                                            </button>
                                        </td>
                                        <td>
                                            <div className="flex justify-center gap-1">
                                                <button onClick={() => handleOpenModal(c)} className="btn btn-ghost btn-xs text-slate-600 hover:bg-slate-100 rounded-lg">
                                                    <Edit size={14} />
                                                </button>
                                                <button onClick={() => handleDelete(c.id, c.email)} className="btn btn-ghost btn-xs text-rose-600 hover:bg-rose-100 rounded-lg">
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

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50/50">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">
                        Credential Store • {totalElements} Entries
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            disabled={currentPage === 0 || loading}
                            onClick={() => setCurrentPage(c => c - 1)}
                            className="btn btn-sm btn-outline border-gray-200 text-slate-600 hover:bg-slate-800 hover:text-white"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <div className="flex gap-1 text-[11px] font-bold text-slate-500">
                            {currentPage + 1} / {totalPages || 1}
                        </div>
                        <button
                            disabled={currentPage >= totalPages - 1 || loading}
                            onClick={() => setCurrentPage(c => c + 1)}
                            className="btn btn-sm btn-outline border-gray-200 text-slate-600 hover:bg-slate-800 hover:text-white"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 animate-fade-in">
                    <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-slide-up border border-white/20">
                        <div className="p-8 pb-4 flex justify-between items-start">
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 tracking-tight">
                                    {editId ? 'Modify Credentials' : 'New Configuration'}
                                </h3>
                                <p className="text-slate-400 text-sm mt-1 font-medium">Define outgoing mail server parameters</p>
                            </div>
                            <button onClick={() => setModalOpen(false)} className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400">
                                <X />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 pt-4 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="form-control md:col-span-2">
                                    <label className="label">
                                        <span className="label-text font-bold text-slate-400 uppercase text-[10px] tracking-widest pl-1">Email Address</span>
                                    </label>
                                    <div className="relative group">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-hover:text-slate-500 transition-colors" size={20} />
                                        <input
                                            required
                                            type="email"
                                            placeholder="admin@example.com"
                                            className="input input-bordered w-full pl-12 h-14 bg-slate-50/50 border-gray-200 focus:bg-white focus:ring-4 focus:ring-slate-100 transition-all font-medium rounded-2xl"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-bold text-slate-400 uppercase text-[10px] tracking-widest pl-1">App Password</span>
                                    </label>
                                    <div className="relative group">
                                        <input
                                            required
                                            type={showPassword ? "text" : "password"}
                                            placeholder="••••••••••••"
                                            className="input input-bordered w-full h-14 pr-12 bg-slate-50/50 border-gray-200 focus:bg-white focus:ring-4 focus:ring-slate-100 transition-all font-mono rounded-2xl"
                                            value={formData.apppassword}
                                            onChange={(e) => setFormData({ ...formData, apppassword: e.target.value })}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 transition-colors"
                                        >
                                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-bold text-slate-400 uppercase text-[10px] tracking-widest pl-1">SMTP Host</span>
                                    </label>
                                    <div className="relative group">
                                        <Server className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 transition-colors" size={20} />
                                        <input
                                            required
                                            type="text"
                                            placeholder="smtp.gmail.com"
                                            className="input input-bordered w-full pl-12 h-14 bg-slate-50/50 border-gray-200 focus:bg-white focus:ring-4 focus:ring-slate-100 transition-all font-medium rounded-2xl"
                                            value={formData.host}
                                            onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-bold text-slate-400 uppercase text-[10px] tracking-widest pl-1">Port</span>
                                    </label>
                                    <div className="relative group">
                                        <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 transition-colors" size={20} />
                                        <input
                                            required
                                            type="text"
                                            placeholder="587"
                                            className="input input-bordered w-full pl-12 h-14 bg-slate-50/50 border-gray-200 focus:bg-white focus:ring-4 focus:ring-slate-100 transition-all font-medium rounded-2xl"
                                            value={formData.port}
                                            onChange={(e) => setFormData({ ...formData, port: e.target.value.replace(/\D/g, '') })}
                                        />
                                    </div>
                                </div>

                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-bold text-slate-400 uppercase text-[10px] tracking-widest pl-1">Daily Sync Time</span>
                                    </label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <select
                                                required
                                                className="select select-bordered w-full h-14 bg-slate-50/50 border-gray-200 focus:bg-white rounded-2xl font-bold appearance-none pl-4"
                                                value={hour}
                                                onChange={(e) => setHour(e.target.value)}
                                            >
                                                <option value="" disabled>HH</option>
                                                {[...Array(24)].map((_, i) => (
                                                    <option key={i} value={String(i).padStart(2, '0')}>{String(i).padStart(2, '0')}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <span className="self-center font-black text-slate-300">:</span>
                                        <div className="relative flex-1">
                                            <select
                                                required
                                                className="select select-bordered w-full h-14 bg-slate-50/50 border-gray-200 focus:bg-white rounded-2xl font-bold appearance-none pl-4"
                                                value={minute}
                                                onChange={(e) => setMinute(e.target.value)}
                                            >
                                                <option value="" disabled>MM</option>
                                                {[...Array(60)].map((_, i) => (
                                                    <option key={i} value={String(i).padStart(2, '0')}>{String(i).padStart(2, '0')}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-4 pt-8">
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="btn btn-ghost px-8 text-slate-400 hover:text-slate-600 transition-colors capitalize tracking-wide font-bold"
                                >
                                    Discard Changes
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="btn bg-slate-800 hover:bg-slate-900 border-none text-white px-10 shadow-xl shadow-slate-200 rounded-2xl capitalize tracking-wide"
                                >
                                    {loading ? <Loader2 className="animate-spin" size={20} /> : (editId ? 'Commit Updates' : 'Confirm Setup')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const X = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path>
    </svg>
);

export default StaffCredentials;
