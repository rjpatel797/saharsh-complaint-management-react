import React, { useState, useEffect, useCallback } from 'react';
import {
    Settings,
    Search,
    Loader2,
    Power,
    FileText,
    Bell,
    MessageSquare
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import apiClient from '../../api/apiClient';
import Swal from 'sweetalert2';
import SmsLog from './SmsLog';

const NotificationSettingContent = () => {
    // State
    const [settings, setSettings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);

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

    // Fetch Settings
    const fetchSettings = useCallback(async () => {
        setLoading(true);
        try {
            const response = await apiClient.get('/admin/getAllSetting');
            if (response.data.status && response.data.data) {
                const whatsAppSettings = response.data.data.whatsApp || [];
                setSettings(whatsAppSettings);
            } else {
                setSettings([]);
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
            showToast('Failed to load notification settings', 'error');
            setSettings([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    // Handle Status Toggle
    const handleStatusToggle = async (id, currentStatus) => {
        const newStatus = !currentStatus;
        try {
            const res = await apiClient.put(`/admin/updateWhatsAppStatus/${id}?status=${newStatus}`);
            if (res.data.status) {
                showToast(res.data.message || `Status updated successfully`, 'success');
                fetchSettings();
            } else {
                showToast(res.data.message || 'Failed to update status', 'error');
            }
        } catch (error) {
            console.error('Error updating status:', error);
            showToast(error.response?.data?.message || 'Network error occurred', 'error');
        }
    };

    // Filter settings based on search term
    const filteredSettings = settings.filter(setting =>
        setting.smstype?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Calculate pagination
    const totalElements = filteredSettings.length;
    const totalPages = Math.ceil(totalElements / pageSize);
    const startIndex = currentPage * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedSettings = filteredSettings.slice(startIndex, endIndex);

    // Reset to first page when search term changes
    useEffect(() => {
        setCurrentPage(0);
    }, [searchTerm]);

    // Add blinking animation styles
    useEffect(() => {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes blinkGreen {
                0%, 100% { 
                    opacity: 1;
                    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
                }
                50% { 
                    opacity: 0.7;
                    box-shadow: 0 0 0 8px rgba(16, 185, 129, 0);
                }
            }
            @keyframes blinkRed {
                0%, 100% { 
                    opacity: 1;
                    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
                }
                50% { 
                    opacity: 0.7;
                    box-shadow: 0 0 0 8px rgba(239, 68, 68, 0);
                }
            }
            .blink-green {
                animation: blinkGreen 1.5s ease-in-out infinite;
            }
            .blink-red {
                animation: blinkRed 1.5s ease-in-out infinite;
            }
        `;
        document.head.appendChild(style);
        return () => {
            if (document.head.contains(style)) {
                document.head.removeChild(style);
            }
        };
    }, []);

    return (
        <div className="h-full flex flex-col gap-6">
            {/* Main Table Card */}
            <div className="bg-white flex flex-col overflow-hidden">
                {/* Header Section */}
                <div className="px-4 md:px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 via-white to-gray-50 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="p-3 bg-purple-600 shadow-xl shadow-purple-100 rounded-2xl text-white">
                            <Settings size={22} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 tracking-tight leading-tight">Notification Settings</h2>
                            <p className="text-xs text-gray-500 font-medium">Manage notification preferences</p>
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
                                placeholder="Search settings..."
                                className="px-2 py-1 text-sm border-0 rounded-lg bg-transparent text-gray-700 w-full min-w-[150px] md:w-64 focus:outline-none focus:ring-0 placeholder:text-gray-400 font-medium"
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(0); }}
                            />
                        </div>
                    </div>
                </div>

                {/* Table Content */}
                <div className="flex-1 overflow-auto custom-scrollbar relative">
                    <table className="w-full border-collapse min-w-full">
                        <thead className="bg-gradient-to-r from-gray-50 to-gray-100 sticky top-0 z-10 shadow-md">
                            <tr>
                                <th className="whitespace-nowrap py-4 px-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">SR NO.</th>
                                <th className="whitespace-nowrap py-4 px-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">SMS TYPE</th>
                                <th className="whitespace-nowrap py-4 px-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">STATUS</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm bg-white divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="3" className="text-center py-20">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="relative">
                                                <div className="absolute inset-0 bg-blue-200 rounded-full blur-xl opacity-50 animate-pulse"></div>
                                                <Loader2 className="relative animate-spin mx-auto text-blue-600" size={40} />
                                            </div>
                                            <div>
                                                <p className="text-gray-700 font-semibold text-base">Fetching notification settings...</p>
                                                <p className="text-gray-400 text-sm mt-1">Please wait while we load your data</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredSettings.length === 0 ? (
                                <tr>
                                    <td colSpan="3" className="text-center py-20">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="p-4 bg-gray-100 rounded-full">
                                                <FileText className="text-gray-400" size={32} />
                                            </div>
                                            <p className="text-gray-500 font-semibold text-base">No notification settings found.</p>
                                            <p className="text-gray-400 text-sm">Try adjusting your search filters</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginatedSettings.map((setting, index) => (
                                    <tr key={setting.id || index} className="group hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/50 transition-all duration-200 border-b border-gray-100">
                                        <td className="text-gray-700 whitespace-nowrap text-center py-4 px-4 font-medium">
                                            {startIndex + index + 1}
                                        </td>
                                        <td className="whitespace-nowrap py-4 px-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center font-black text-xs border border-slate-200 group-hover:bg-white group-hover:border-purple-200 group-hover:text-purple-600 transition-all">
                                                    <Bell size={16} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900 leading-none">{setting.smstype || 'N/A'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap py-4 px-4 text-center">
                                            <button
                                                onClick={() => handleStatusToggle(setting.id, setting.status)}
                                                className={`mx-auto px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider transition-all border-2 flex items-center justify-center gap-1.5 ${setting.status
                                                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-600 hover:text-white'
                                                        : 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-600 hover:text-white'
                                                    }`}
                                            >
                                                {setting.status ? (
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
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination - aligned with Dashboard pagination structure */}
                {!loading && filteredSettings.length > 0 && (
                    <div className="px-4 md:px-6 py-5 border-t border-gray-200 bg-gradient-to-r from-gray-50/50 to-white flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="text-sm text-gray-600 font-medium">
                            Showing{' '}
                            <span className="font-bold text-gray-900">
                                {totalElements > 0 ? startIndex + 1 : 0}
                            </span>{' '}
                            to{' '}
                            <span className="font-bold text-gray-900">
                                {Math.min(endIndex, totalElements)}
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
                )}
            </div>
        </div>
    );
};

const NotificationSetting = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const isSmsLogPage = location.pathname === '/admin/settings/smslog';

    return (
        <div className="h-full flex flex-col gap-6 mt-4">
            {/* Navigation Tabs - modern segmented control */}
            <div className="flex justify-start">
                <div className="inline-flex items-center gap-2 bg-slate-100 rounded-2xl p-1 shadow-sm border border-slate-200">
                    <button
                        onClick={() => navigate('/admin/settings')}
                        className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                            !isSmsLogPage
                                ? 'bg-white text-slate-900 shadow-md ring-2 ring-purple-500 ring-offset-1'
                                : 'bg-transparent text-slate-600 hover:bg-white/70 hover:text-slate-900'
                        }`}
                    >
                        <Settings size={18} className={!isSmsLogPage ? 'text-purple-600' : 'text-slate-500'} />
                        <span>Notification Settings</span>
                    </button>
                    <button
                        onClick={() => navigate('/admin/settings/smslog')}
                        className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                            isSmsLogPage
                                ? 'bg-white text-slate-900 shadow-md ring-2 ring-purple-500 ring-offset-1'
                                : 'bg-transparent text-slate-600 hover:bg-white/70 hover:text-slate-900'
                        }`}
                    >
                        <MessageSquare size={18} className={isSmsLogPage ? 'text-purple-600' : 'text-slate-500'} />
                        <span>SMS Log</span>
                    </button>
                </div>
            </div>

            {isSmsLogPage ? <SmsLog /> : <NotificationSettingContent />}
        </div>
    );
};

export default NotificationSetting;

