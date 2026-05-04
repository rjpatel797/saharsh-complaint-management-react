import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Edit2, Trash2, Loader2, Server, Globe, FileText, Activity, X } from 'lucide-react';
import apiClient from '../../api/apiClient';
import Swal from 'sweetalert2';
import Pagination from '../../components/Pagination';
import PremiumLoader from '../../components/PremiumLoader';
import PageSizeDropdown from '../../components/PageSizeDropdown';

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
        <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col animate-fade-in text-gray-800 pt-2">
            {/* Main Table Card — fills viewport below navbar; table body scrolls inside */}
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="shrink-0 px-4 md:px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 via-white to-gray-50 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="p-3 bg-blue-600 shadow-xl shadow-blue-100 rounded-2xl text-white">
                            <Server size={22} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 tracking-tight leading-tight">Infrastructure Server List</h2>
                            <p className="text-xs text-gray-500 font-medium">Server Management</p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                        <PageSizeDropdown
                            pageSize={pageSize}
                            setPageSize={setPageSize}
                            onPageSizeChange={() => setCurrentPage(0)}
                        />
                        <div className="relative flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-200">
                            <Search className="text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search servers..."
                                className="px-2 py-1 text-sm border-0 rounded-lg bg-transparent text-gray-700 w-full min-w-[150px] md:w-64 focus:outline-none focus:ring-0 placeholder:text-gray-400 font-medium"
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(0); }}
                            />
                        </div>
                        <button
                            onClick={() => openModal()}
                            className="bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 hover:from-blue-700 hover:via-blue-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-95 group"
                        >
                            <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                            <span>Add Server</span>
                        </button>
                    </div>
                </div>

                <div className="relative min-h-0 flex-1 overflow-x-auto overflow-y-auto custom-scrollbar">
                    <table className="w-full border-collapse min-w-full">
                        <thead className="bg-gradient-to-r from-gray-50 to-gray-100 sticky top-0 z-10 shadow-md">
                            <tr>
                                <th className="whitespace-nowrap py-2 px-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">SR NO.</th>
                                <th className="whitespace-nowrap py-2 px-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">SERVER IDENTITY</th>
                                <th className="whitespace-nowrap py-2 px-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">REGISTRATION SYNC</th>
                                <th className="whitespace-nowrap py-2 px-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">LAST PULSE SYNC</th>
                                <th className="whitespace-nowrap py-2 px-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">OPERATION</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm bg-white divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="text-center py-20">
                                        <PremiumLoader />
                                    </td>
                                </tr>
                            ) : servers.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="text-center py-20">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="p-4 bg-gray-100 rounded-full">
                                                <FileText className="text-gray-400" size={32} />
                                            </div>
                                            <p className="text-gray-500 font-semibold text-base">No server records found.</p>
                                            <p className="text-gray-400 text-sm">Try adjusting your search filters</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                servers.map((server, index) => (
                                    <tr key={server.id || index} className="group hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/50 transition-all duration-200 border-b border-gray-100">
                                        <td className="text-gray-700 whitespace-nowrap text-center py-2 px-3 font-medium">
                                            {(currentPage * pageSize) + index + 1}
                                        </td>
                                        <td className="whitespace-nowrap py-2 px-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center font-black text-xs border border-slate-200 group-hover:bg-white group-hover:border-blue-200 group-hover:text-blue-600 transition-all">
                                                    {(server.brandName || server.brandname)?.[0]?.toUpperCase() || 'S'}
                                                </div>
                                                <span className="font-bold text-gray-900 leading-none">
                                                    {server.brandName || server.brandname || 'UNKNOWN_NODE'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="text-gray-600 whitespace-nowrap py-2 px-3 text-center font-medium text-sm">
                                            {formatDate(server.createDate || server.createDatetime)}
                                        </td>
                                        <td className="text-gray-600 whitespace-nowrap py-2 px-3 text-center font-medium text-sm">
                                            {formatDate(server.updateDate || server.updateDatetime)}
                                        </td>
                                        <td className="whitespace-nowrap py-2 px-3 text-center">
                                            <div className="flex justify-center gap-2 transition-all">
                                                <button
                                                    onClick={() => openModal(server)}
                                                    className="p-2 rounded-lg text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md"
                                                    title="Edit Resource"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(server.id, server.brandName || server.brandname)}
                                                    className="p-2 rounded-lg text-red-600 bg-red-50 hover:bg-red-600 hover:text-white hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md"
                                                    title="Purge Resource"
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

                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalElements={totalElements}
                    pageSize={pageSize}
                    loading={loading}
                    onPageChange={setCurrentPage}
                />
            </div>

            {/* Modal - Matching Style */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-md rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                            <h3 className="text-lg font-bold text-gray-800">
                                {editingServer ? 'Edit Server' : 'Add New Server'}
                            </h3>
                            <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition-colors group">
                                <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Server Name <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    placeholder="Enter server identifier"
                                    className={`w-full border rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${formError ? 'border-red-500 focus:ring-red-500/20' : 'border-gray-300'}`}
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
