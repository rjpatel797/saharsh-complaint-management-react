import React, { useState, useEffect, useCallback } from 'react';
import {
    Laptop,
    Plus,
    Search,
    Edit,
    Trash2,
    Loader2,
    ChevronLeft,
    ChevronRight,
    Package,
    Layers,
    Tag
} from 'lucide-react';
import apiClient from '../../api/apiClient';
import Swal from 'sweetalert2';

const DeviceModelManagement = () => {
    const [models, setModels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [totalElements, setTotalElements] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    // Form State
    const [modalOpen, setModalOpen] = useState(false);
    const [editId, setEditId] = useState(null);
    const [formData, setFormData] = useState({
        deviceModel: '',
        productName: '',
        productBrandName: '',
        productCategory: ''
    });

    const fetchModels = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                page: currentPage,
                size: pageSize,
                searchTerm: searchTerm.trim() || undefined
            };
            const response = await apiClient.get('/admin/getAllDeviceModel', { params });
            if (response.data) {
                setModels(response.data.data || []);
                setTotalElements(response.data.totalElements || 0);
                setTotalPages(response.data.totalPages || 0);
            }
        } catch (error) {
            console.error('Error fetching models:', error);
            Swal.fire('Error', 'Failed to load device models', 'error');
        } finally {
            setLoading(false);
        }
    }, [currentPage, pageSize, searchTerm]);

    useEffect(() => {
        const timer = setTimeout(fetchModels, 300);
        return () => clearTimeout(timer);
    }, [fetchModels]);

    const handleOpenModal = (model = null) => {
        if (model) {
            setEditId(model.id);
            setFormData({
                deviceModel: model.deviceModel || '',
                productName: model.productName || '',
                productBrandName: model.productBrandName || '',
                productCategory: model.productCategory || ''
            });
        } else {
            setEditId(null);
            setFormData({
                deviceModel: '',
                productName: '',
                productBrandName: '',
                productCategory: ''
            });
        }
        setModalOpen(true);
    };

    const handleDelete = async (id, name) => {
        const result = await Swal.fire({
            title: 'Delete Model?',
            text: `Are you sure you want to delete ${name}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Yes, delete it!'
        });

        if (result.isConfirmed) {
            try {
                const res = await apiClient.delete(`/admin/deleteDeviceModel/${id}`);
                if (res.data.status) {
                    Swal.fire('Deleted!', res.data.message, 'success');
                    fetchModels();
                }
            } catch (error) {
                Swal.fire('Error', 'Failed to delete model', 'error');
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = editId
                ? await apiClient.put(`/admin/updateDeviceModel/${editId}`, formData)
                : await apiClient.post('/admin/addDeviceModel', formData);

            if (res.data.status) {
                Swal.fire('Success', res.data.message, 'success');
                setModalOpen(false);
                fetchModels();
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
                    <div className="p-3 bg-blue-600 text-white rounded-xl shadow-lg ring-4 ring-blue-50">
                        <Laptop size={28} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Device Model Management</h2>
                        <p className="text-sm text-gray-500 font-medium">Configure hardware catalog and product categories</p>
                    </div>
                </div>
                <button onClick={() => handleOpenModal()} className="btn btn-primary shadow-lg shadow-blue-200 gap-2 px-6">
                    <Plus size={18} />
                    Append Model
                </button>
            </div>

            {/* Main Table Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50/50">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search models, brands, products..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input input-bordered w-full pl-10 focus:ring-2 focus:ring-blue-500 border-gray-200"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500 font-bold uppercase tracking-wider">Entries</span>
                        <select
                            value={pageSize}
                            onChange={(e) => setPageSize(Number(e.target.value))}
                            className="select select-bordered select-sm font-bold"
                        >
                            {[10, 25, 50].map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="table table-zebra w-full text-center">
                        <thead className="bg-gray-50 text-gray-600 font-bold uppercase text-[11px] tracking-wider">
                            <tr>
                                <th>SR.</th>
                                <th>MODEL NUMBER</th>
                                <th>PRODUCT NAME</th>
                                <th>BRAND</th>
                                <th>CATEGORY</th>
                                <th>CREATED</th>
                                <th>ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {loading && !models.length ? (
                                <tr>
                                    <td colSpan="7" className="py-20 text-center">
                                        <Loader2 className="animate-spin mx-auto text-blue-600" size={32} />
                                        <p className="mt-2 text-gray-500 font-medium tracking-wide">Syncing catalog...</p>
                                    </td>
                                </tr>
                            ) : models.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="py-20 text-center text-gray-400 font-medium">No device models found in the system.</td>
                                </tr>
                            ) : (
                                models.map((m, idx) => (
                                    <tr key={m.id} className="hover:bg-gray-50/80 transition-colors">
                                        <td className="text-gray-400 font-medium">{(currentPage * pageSize) + idx + 1}</td>
                                        <td className="font-bold text-gray-800">{m.deviceModel}</td>
                                        <td className="font-medium text-gray-600">{m.productName}</td>
                                        <td>
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold text-[11px] uppercase border border-slate-200">
                                                <Tag size={10} />
                                                {m.productBrandName}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold text-[11px] uppercase border border-blue-100">
                                                <Layers size={10} />
                                                {m.productCategory}
                                            </span>
                                        </td>
                                        <td className="text-gray-500 text-xs font-medium">
                                            {m.createDate ? new Date(m.createDate).toLocaleDateString() : 'N/A'}
                                        </td>
                                        <td>
                                            <div className="flex justify-center gap-1">
                                                <button onClick={() => handleOpenModal(m)} className="btn btn-ghost btn-xs text-blue-600 hover:bg-blue-50 rounded-lg">
                                                    <Edit size={14} />
                                                </button>
                                                <button onClick={() => handleDelete(m.id, m.deviceModel)} className="btn btn-ghost btn-xs text-red-600 hover:bg-red-50 rounded-lg">
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
                    <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">
                        Page {currentPage + 1} of {totalPages || 1} • {totalElements} Models
                    </p>
                    <div className="flex items-center gap-1">
                        <button
                            disabled={currentPage === 0 || loading}
                            onClick={() => setCurrentPage(c => c - 1)}
                            className="btn btn-sm btn-outline border-gray-300"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <button
                            disabled={currentPage >= totalPages - 1 || loading}
                            onClick={() => setCurrentPage(c => c + 1)}
                            className="btn btn-sm btn-outline border-gray-300"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in text-gray-700">
                    <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-up border border-white/20">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
                            <div>
                                <h3 className="text-xl font-bold">{editId ? 'Update Device Model' : 'Register New Model'}</h3>
                                <p className="text-[10px] text-blue-100 font-bold uppercase tracking-widest mt-0.5 opacity-80">Inventory Catalog</p>
                            </div>
                            <button onClick={() => setModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white">
                                <X />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-5 bg-white">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="form-control md:col-span-2">
                                    <label className="label py-1">
                                        <span className="label-text font-bold text-gray-600 uppercase text-[10px] tracking-widest">Model Number</span>
                                    </label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="e.g. LATITUDE-5420"
                                        className="input input-bordered focus:ring-4 focus:ring-blue-100 focus:border-blue-500 font-medium transition-all"
                                        value={formData.deviceModel}
                                        onChange={(e) => setFormData({ ...formData, deviceModel: e.target.value })}
                                    />
                                </div>
                                <div className="form-control md:col-span-2">
                                    <label className="label py-1">
                                        <span className="label-text font-bold text-gray-600 uppercase text-[10px] tracking-widest">Product Name</span>
                                    </label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="e.g. Business Laptop"
                                        className="input input-bordered focus:ring-4 focus:ring-blue-100 focus:border-blue-500 font-medium transition-all"
                                        value={formData.productName}
                                        onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                                    />
                                </div>
                                <div className="form-control">
                                    <label className="label py-1">
                                        <span className="label-text font-bold text-gray-600 uppercase text-[10px] tracking-widest">Brand</span>
                                    </label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="e.g. DELL"
                                        className="input input-bordered focus:ring-4 focus:ring-blue-100 focus:border-blue-500 font-medium transition-all"
                                        value={formData.productBrandName}
                                        onChange={(e) => setFormData({ ...formData, productBrandName: e.target.value })}
                                    />
                                </div>
                                <div className="form-control">
                                    <label className="label py-1">
                                        <span className="label-text font-bold text-gray-600 uppercase text-[10px] tracking-widest">Category</span>
                                    </label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="e.g. Computing"
                                        className="input input-bordered focus:ring-4 focus:ring-blue-100 focus:border-blue-500 font-medium transition-all"
                                        value={formData.productCategory}
                                        onChange={(e) => setFormData({ ...formData, productCategory: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-6">
                                <button type="button" onClick={() => setModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors">Discard</button>
                                <button type="submit" disabled={loading} className="btn btn-primary px-10 shadow-lg shadow-blue-200 rounded-xl">
                                    {loading ? <Loader2 className="animate-spin" size={20} /> : (editId ? 'Commit Changes' : 'Register Model')}
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
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path>
    </svg>
);

export default DeviceModelManagement;
