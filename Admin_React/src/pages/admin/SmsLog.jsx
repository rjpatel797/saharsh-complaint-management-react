import React, { useState, useEffect, useCallback } from 'react';
import {
    MessageSquare,
    Search,
    Loader2,
    FileText,
    Phone,
    User,
    Calendar,
    CheckCircle2,
    XCircle,
    X
} from 'lucide-react';
import apiClient from '../../api/apiClient';
import Swal from 'sweetalert2';

const SmsLog = () => {
    // State
    const [smsLogs, setSmsLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [totalElements, setTotalElements] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [textModal, setTextModal] = useState({ open: false, title: '', content: '' });

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

    // Normalize search term: if user types a date in UI format (e.g. "Jan 7, 2026, 11:23 AM"),
    // convert it to an API-friendly format (YYYY-MM-DD) before sending to backend.
    const normalizeSearchTerm = (raw) => {
        if (!raw) return '';
        const trimmed = raw.trim();
        if (!trimmed) return '';

        // Try to parse as date string shown in UI
        const parsed = new Date(trimmed);
        if (!isNaN(parsed.getTime())) {
            const year = parsed.getFullYear();
            const month = String(parsed.getMonth() + 1).padStart(2, '0');
            const day = String(parsed.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

        // Fallback: send original text
        return trimmed;
    };

    // Fetch SMS Logs
    const fetchSmsLogs = useCallback(async () => {
        setLoading(true);
        try {
            // Normalize search term (convert date format if applicable)
            const normalizedSearchTerm = normalizeSearchTerm(searchTerm);
            
            const params = {
                page: currentPage,
                size: pageSize,
                searchTerm: normalizedSearchTerm || undefined
            };
            const response = await apiClient.get('/admin/getAllSmsLog', { params });
            const result = response.data;

            if (result && result.data && Array.isArray(result.data)) {
                setSmsLogs(result.data);
                setTotalElements(result.totalElements || result.data.length);
                setTotalPages(result.totalPages || 1);
            } else {
                setSmsLogs([]);
                setTotalElements(0);
                setTotalPages(0);
            }
        } catch (error) {
            console.error('Error fetching SMS logs:', error);
            showToast('Failed to load SMS logs', 'error');
            setSmsLogs([]);
            setTotalElements(0);
            setTotalPages(0);
        } finally {
            setLoading(false);
        }
    }, [currentPage, pageSize, searchTerm]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchSmsLogs();
        }, 300); // Debounce search
        return () => clearTimeout(timer);
    }, [fetchSmsLogs]);


    // Format date
    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        try {
            const date = new Date(dateStr.replace(' ', 'T'));
            if (isNaN(date.getTime())) return dateStr;
            
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const month = months[date.getMonth()];
            const day = date.getDate();
            const year = date.getFullYear();
            
            let hours = date.getHours();
            const minutes = date.getMinutes().toString().padStart(2, '0');
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12;
            const hoursStr = hours.toString().padStart(2, '0');
            
            return `${month} ${day}, ${year}, ${hoursStr}:${minutes} ${ampm}`;
        } catch (error) {
            return dateStr;
        }
    };

    return (
        <div className="h-full flex flex-col gap-6">
            {/* Main Table Card */}
            <div className="bg-white flex flex-col overflow-hidden">
                {/* Header Section */}
                <div className="px-4 md:px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 via-white to-gray-50 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="p-3 bg-purple-600 shadow-xl shadow-purple-100 rounded-2xl text-white">
                            <MessageSquare size={22} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 tracking-tight leading-tight">SMS Log</h2>
                            <p className="text-xs text-gray-500 font-medium">View SMS notification history</p>
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
                                <option value={100}>100</option>
                            </select>
                            <span className="text-xs font-semibold text-gray-600 whitespace-nowrap">entries</span>
                        </div>
                        <div className="relative flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-200">
                            <Search className="text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search logs..."
                                className="px-2 py-1 text-sm border-0 rounded-lg bg-transparent text-gray-700 w-full min-w-[150px] md:w-64 focus:outline-none focus:ring-0 placeholder:text-gray-400 font-medium"
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(0); }}
                            />
                        </div>
                    </div>
                </div>

                {/* Table Content */}
                <div className="flex-1 overflow-auto custom-scrollbar relative" style={{ maxHeight: '410px' }}>
                    <table className="w-full border-collapse min-w-full">
                        <thead className="bg-gradient-to-r from-gray-50 to-gray-100 sticky top-0 z-10 shadow-md">
                            <tr>
                                <th className="whitespace-nowrap py-4 px-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">SR NO.</th>
                                <th className="whitespace-nowrap py-4 px-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">SMS TYPE</th>
                                <th className="whitespace-nowrap py-4 px-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">TICKET ID</th>
                                <th className="whitespace-nowrap py-4 px-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">USER NAME</th>
                                <th className="whitespace-nowrap py-4 px-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">CONTACT</th>
                                <th className="whitespace-nowrap py-4 px-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">STATUS</th>
                                <th className="whitespace-nowrap py-4 px-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">FULL MSG</th>
                                <th className="whitespace-nowrap py-4 px-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">CREATE DATE</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm bg-white divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="8" className="text-center py-20">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="relative">
                                                <div className="absolute inset-0 bg-blue-200 rounded-full blur-xl opacity-50 animate-pulse"></div>
                                                <Loader2 className="relative animate-spin mx-auto text-blue-600" size={40} />
                                            </div>
                                            <div>
                                                <p className="text-gray-700 font-semibold text-base">Fetching SMS logs...</p>
                                                <p className="text-gray-400 text-sm mt-1">Please wait while we load your data</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ) : smsLogs.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="text-center py-20">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="p-4 bg-gray-100 rounded-full">
                                                <FileText className="text-gray-400" size={32} />
                                            </div>
                                            <p className="text-gray-500 font-semibold text-base">No SMS logs found.</p>
                                            <p className="text-gray-400 text-sm">Try adjusting your search filters</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                smsLogs.map((log, index) => (
                                    <tr key={log.id || index} className="group hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/50 transition-all duration-200 border-b border-gray-100">
                                        <td className="text-gray-700 whitespace-nowrap text-center py-4 px-4 font-medium">
                                            {(currentPage * pageSize) + index + 1}
                                        </td>
                                        <td className="whitespace-nowrap py-4 px-4 text-center">
                                            <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-200">
                                                {log.smsType || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap py-4 px-4 text-center">
                                            <span className="font-bold text-gray-900">{log.ticketId || 'N/A'}</span>
                                        </td>
                                        <td className="whitespace-nowrap py-4 px-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <User size={14} className="text-gray-400" />
                                                <span className="font-medium text-gray-700">{log.username || 'N/A'}</span>
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap py-4 px-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <Phone size={14} className="text-gray-400" />
                                                <span className="font-medium text-gray-700">{log.contact || 'N/A'}</span>
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap py-4 px-4 text-center">
                                            <div className={`mx-auto px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 ${
                                                log.status === 'SUCCESS'
                                                    ? 'bg-emerald-50 text-emerald-600 border-2 border-emerald-100'
                                                    : 'bg-rose-50 text-rose-600 border-2 border-rose-100'
                                            }`}>
                                                {log.status === 'SUCCESS' ? (
                                                    <>
                                                        <CheckCircle2 size={14} />
                                                        <span>SUCCESS</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <XCircle size={14} />
                                                        <span>FAILED</span>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                        <td
                                            className="max-w-[200px] truncate whitespace-nowrap py-4 px-4 text-center cursor-pointer transition-all duration-200 mx-auto group/fullmsg"
                                            onClick={() => {
                                                if (log.fullMsg) {
                                                    let formattedContent = '';
                                                    try {
                                                        const parsed = typeof log.fullMsg === 'string' ? JSON.parse(log.fullMsg) : log.fullMsg;
                                                        formattedContent = JSON.stringify(parsed, null, 2);
                                                    } catch (e) {
                                                        formattedContent = log.fullMsg;
                                                    }
                                                    setTextModal({
                                                        open: true,
                                                        title: 'Full Message Details',
                                                        content: formattedContent
                                                    });
                                                }
                                            }}
                                            title={log.fullMsg ? 'Click to view full message' : ''}
                                        >
                                            {log.fullMsg ? (
                                                <span className="text-blue-600 hover:text-blue-700 font-medium underline decoration-2 underline-offset-2 group-hover/fullmsg:bg-blue-50 px-2 py-1 rounded transition-all duration-200 font-mono text-xs">
                                                    {(() => {
                                                        try {
                                                            const parsed = typeof log.fullMsg === 'string' ? JSON.parse(log.fullMsg) : log.fullMsg;
                                                            const jsonStr = JSON.stringify(parsed, null, 2);
                                                            return jsonStr.length > 30 ? jsonStr.substring(0, 30) + '...' : jsonStr;
                                                        } catch (e) {
                                                            return log.fullMsg.length > 30 ? log.fullMsg.substring(0, 30) + '...' : log.fullMsg;
                                                        }
                                                    })()}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">N/A</span>
                                            )}
                                        </td>
                                        <td className="whitespace-nowrap py-4 px-4 text-center">
                                            <span className="text-sm text-gray-700 font-medium">{formatDate(log.createDate)}</span>
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

            {/* Full Message Modal */}
            {textModal.open && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 animate-fade-in" onClick={() => setTextModal({ open: false, title: '', content: '' })}>
                    <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
                        <div className="p-8 pb-4 flex justify-between items-center bg-slate-50 border-b border-slate-100">
                            <div>
                                <h3 className="text-xl font-black text-slate-800 tracking-tight">{textModal.title}</h3>
                            </div>
                            <button onClick={() => setTextModal({ open: false, title: '', content: '' })} className="w-8 h-8 flex items-center justify-center bg-gray-200 text-gray-700 hover:bg-gray-300 hover:text-gray-800 rounded-full transition-all duration-200 shadow-md">
                                <X size={18} strokeWidth={2.5} className="transition-transform duration-300 hover:rotate-90" />
                            </button>
                        </div>
                        <div className="p-6 text-slate-600 leading-relaxed font-medium max-h-96 overflow-y-auto">
                            <pre className="whitespace-pre-wrap break-words overflow-x-auto font-mono text-xs bg-gray-50 p-4 rounded-lg border border-gray-200 max-w-full">{textModal.content}</pre>
                        </div>
                        <div className="p-6 pt-0 flex justify-end">
                            <button onClick={() => setTextModal({ open: false, title: '', content: '' })} className="btn bg-slate-800 hover:bg-slate-900 border-none text-white px-8 rounded-2xl uppercase text-[10px] tracking-widest font-black h-12 shadow-xl shadow-slate-100">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SmsLog;

