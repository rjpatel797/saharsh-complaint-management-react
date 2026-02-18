import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Edit2, Trash2, Loader2, Server, Globe, FileText, Activity, X } from 'lucide-react';
import apiClient from '../../api/apiClient';
import Swal from 'sweetalert2';

const ServerManagement = () => {
    // State
    const [servers, setServers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [totalElements, setTotalElements] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalLoading, setModalLoading] = useState(false);
    const [editingServer, setEditingServer] = useState(null);
    const [serverName, setServerName] = useState('');
    const [formError, setFormError] = useState('');

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

    // Fetch Servers
    const fetchServers = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                page: currentPage,
                size: pageSize,
                searchTerm: searchTerm.trim() || undefined
            };
            const response = await apiClient.get('/admin/getAllBrand', { params });
            const result = response.data;

            if (result && result.data && Array.isArray(result.data)) {
                setServers(result.data);
                setTotalElements(result.totalElements || result.data.length);
                setTotalPages(result.totalPages || 1);
            } else {
                setServers([]);
                setTotalElements(0);
                setTotalPages(0);
            }
        } catch (error) {
            console.error('Error fetching servers:', error);
            showToast('Failed to load servers', 'error');
        } finally {
            setLoading(false);
        }
    }, [currentPage, pageSize, searchTerm]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchServers();
        }, 300); // Debounce search
        return () => clearTimeout(timer);
    }, [fetchServers]);

    // Handle Add/Edit
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!serverName.trim()) {
            setFormError('Please enter a valid server name');
            return;
        }

        setModalLoading(true);
        try {
            const payload = { brandname: serverName };
            let response;
            if (editingServer) {
                response = await apiClient.put(`/admin/updateBrand/${editingServer.id}`, payload);
            } else {
                response = await apiClient.post('/admin/addBrand', payload);
            }

            if (response.data.status) {
                showToast(response.data.message || (editingServer ? 'Server updated successfully' : 'Server added successfully'), 'success');
                closeModal();
                fetchServers();
            } else {
                setFormError(response.data.message || 'Operation failed');
            }
        } catch (error) {
            setFormError(error.response?.data?.message || 'Network error occurred');
        } finally {
            setModalLoading(false);
        }
    };

    // Handle Delete
    const handleDelete = async (id, name) => {
        const result = await Swal.fire({
            title: 'Delete server?',
            text: `Are you sure you want to delete "${name}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, delete'
        });

        if (result.isConfirmed) {
            try {
                const response = await apiClient.delete(`/admin/deleteBrand/${id}`);
                if (response.data.status) {
                    showToast(response.data.message || 'Server deleted successfully', 'success');
                    fetchServers();
                } else {
                    showToast(response.data.message || 'Failed to delete server', 'error');
                }
            } catch (error) {
                showToast('Failed to delete server', 'error');
            }
        }
    };

    const openModal = (server = null) => {
        setEditingServer(server);
        setServerName(server ? (server.brandName || server.brandname || '') : '');
        setFormError('');
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingServer(null);
        setServerName('');
        setFormError('');
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        const d = new Date(dateStr.replace(' ', 'T'));
        if (isNaN(d.getTime())) return 'N/A';

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = months[d.getMonth()];
        const day = d.getDate();
        const year = d.getFullYear();

        let hours = d.getHours();
        const minutes = d.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        const hoursStr = hours.toString().padStart(2, '0');

        return `${month} ${day}, ${year}, ${hoursStr}:${minutes} ${ampm}`;
    };

    return (
        <div className="space-y-6 animate-fade-in text-gray-800 h-full flex flex-col">
            {/* Main Table Card */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col flex-1 min-h-0">
                {/* Header Section */}
                <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6 bg-white flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-600 shadow-xl shadow-blue-100 rounded-2xl text-white">
                            <Server size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Infrastructure Server List</h2>
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-0.5">Server Management</p>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-bold text-gray-400 uppercase tracking-widest text-[10px]">Show</label>
                            <select
                                value={pageSize}
                                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(0); }}
                                className="px-3 py-1.5 text-sm border border-gray-200 rounded-xl bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold"
                            >
                                <option value={10}>10 Items</option>
                                <option value={25}>25 Items</option>
                                <option value={50}>50 Items</option>
                            </select>
                        </div>
                        <div className="relative w-full md:w-80">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Filter by server identity..."
                                className="w-full px-5 py-2.5 pl-12 text-sm border border-gray-200 rounded-2xl bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(0); }}
                            />
                        </div>
                        <button
                            onClick={() => openModal()}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 shadow-xl shadow-slate-100"
                        >
                            <Plus size={18} />
                            Add Server
                        </button>
                    </div>
                </div>

                {/* Table Content */}
                <div className="flex-1 overflow-auto custom-scrollbar relative">
                    <table className="w-full border-collapse">
                        <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-100">
                            <tr className="text-gray-400 font-black text-xs tracking-[0.15em] uppercase">
                                <th className="py-5 px-6">No.</th>
                                <th className="text-left py-5 px-4 uppercase tabular-nums">Server Identity</th>
                                <th className="py-5 px-4 text-center">Registration Sync</th>
                                <th className="py-5 px-4 text-center">Last Pulse Sync</th>
                                <th className="py-5 px-4 text-center">Operation</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm font-medium text-slate-600 divide-y divide-slate-50 bg-white">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="py-32 text-center">
                                        <Loader2 size={48} className="animate-spin text-blue-600 mx-auto" />
                                        <p className="mt-4 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Synchronizing Master Assets...</p>
                                    </td>
                                </tr>
                            ) : servers.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="py-32 text-center text-slate-300 italic font-medium">No assets recorded in current registry.</td>
                                </tr>
                            ) : (
                                servers.map((server, index) => (
                                    <tr key={server.id || index} className="hover:bg-slate-50/50 transition-colors group border-b border-slate-50 last:border-0">
                                        <td className="py-5 px-6 text-center text-slate-300 font-bold text-sm tabular-nums">
                                            {(currentPage * pageSize) + index + 1}
                                        </td>
                                        <td className="py-5 px-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center font-black text-sm border border-slate-200 group-hover:bg-white group-hover:border-blue-100 group-hover:text-blue-500 transition-all">
                                                    {(server.brandName || server.brandname)?.[0]?.toUpperCase() || 'S'}
                                                </div>
                                                <span className="font-bold text-slate-800 text-sm tracking-tight">
                                                    {server.brandName || server.brandname || 'UNKNOWN_NODE'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-5 px-4 text-center text-slate-400 font-bold text-[11px] uppercase tracking-wider">
                                            {formatDate(server.createDate || server.createDatetime)}
                                        </td>
                                        <td className="py-5 px-4 text-center text-slate-400 font-bold text-[11px] uppercase tracking-wider">
                                            {formatDate(server.updateDate || server.updateDatetime)}
                                        </td>
                                        <td className="py-5 px-4 text-center">
                                            <div className="flex justify-center gap-2 transition-all">
                                                <button
                                                    onClick={() => openModal(server)}
                                                    className="p-2.5 text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-sm"
                                                    title="Edit Resource"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(server.id, server.brandName || server.brandname)}
                                                    className="p-2.5 text-red-600 bg-red-50 hover:bg-red-600 hover:text-white rounded-xl transition-all shadow-sm"
                                                    title="Purge Resource"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="pt-6 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6 px-10 pb-10 bg-slate-50/50 flex-shrink-0">
                    <div className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        Server Registry Feed: <span className="text-slate-800 font-bold">{totalElements} Records synchronized</span>
                    </div>
                    <div className="flex gap-3">
                        <button
                            disabled={currentPage === 0 || loading}
                            onClick={() => setCurrentPage(p => p - 1)}
                            className="px-6 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl border border-slate-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-white text-slate-600 shadow-sm hover:bg-slate-50"
                        >
                            Back
                        </button>
                        <div className="flex items-center gap-2">
                            <span className="w-10 h-10 flex items-center justify-center bg-blue-600 text-white rounded-[1.25rem] text-[11px] font-black shadow-xl shadow-blue-100">
                                {currentPage + 1}
                            </span>
                            <span className="text-[10px] font-black text-slate-300 uppercase px-2 tracking-widest">of {totalPages}</span>
                        </div>
                        <button
                            disabled={currentPage >= totalPages - 1 || loading}
                            onClick={() => setCurrentPage(p => p + 1)}
                            className="px-6 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl border border-slate-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-white text-slate-600 shadow-sm hover:bg-slate-50"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>

            {/* Modal - Matching Style */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-md rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                            <h3 className="text-lg font-bold text-gray-800">
                                {editingServer ? 'Edit Server' : 'Add New Server'}
                            </h3>
                            <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Server Name <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    placeholder="Enter server identifier"
                                    className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${formError ? 'border-red-500 focus:ring-red-500/20' : 'border-gray-300'}`}
                                    value={serverName}
                                    onChange={(e) => { setServerName(e.target.value); setFormError(''); }}
                                    autoFocus
                                />
                                {formError && (
                                    <p className="text-red-500 text-xs mt-1.5 font-medium">{formError}</p>
                                )}
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-4 py-2 text-sm font-semibold text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={modalLoading}
                                    className="px-6 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-blue-200 flex items-center gap-2"
                                >
                                    {modalLoading && <Loader2 className="animate-spin" size={16} />}
                                    {editingServer ? 'Update Server' : 'Save Server'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ServerManagement;
