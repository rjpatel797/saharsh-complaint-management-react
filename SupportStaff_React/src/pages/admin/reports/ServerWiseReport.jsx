import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    BarChart3,
    Search,
    Download,
    RefreshCcw,
    ChevronLeft,
    ChevronRight,
    TrendingUp,
    AlertCircle,
    CheckCircle2,
    Clock,
    Layers,
    FileSpreadsheet,
    Loader2
} from 'lucide-react';
import apiClient from '../../../api/apiClient';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';

const ServerWiseReport = () => {
    const [rawData, setRawData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const hasFetchedRef = useRef(false);

    const fetchReport = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const response = await apiClient.get('/report/brandWiseReport');
            if (response.data && response.data.status && Array.isArray(response.data.data)) {
                setRawData(response.data.data);
            } else {
                setRawData([]);
            }
        } catch (error) {
            console.error('Error fetching server-wise report:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        if (!hasFetchedRef.current) {
            hasFetchedRef.current = true;
            fetchReport();
        }
    }, [fetchReport]);

    const filteredData = useMemo(() => {
        const term = searchTerm.toLowerCase().trim();
        if (!term) return rawData;
        return rawData.filter(r =>
            String(r.brandName || '').toLowerCase().includes(term)
        );
    }, [rawData, searchTerm]);

    const totals = useMemo(() => {
        const t = {
            total: 0, open: 0, inProgress: 0, resolved: 0, closed: 0,
            normal: 0, high: 0, low: 0, urgent: 0
        };

        filteredData.forEach(b => {
            const s = b.statusCounts || {};
            const p = b.priorityCounts || {};

            // Use totalTickets from response instead of calculating
            t.total += s.totalTickets || 0;
            t.open += s.Open || 0;
            t.inProgress += s['In Progress'] || 0;
            t.resolved += s.Resolved || 0;
            t.closed += s.Closed || 0;

            t.normal += p.Normal || 0;
            t.high += p.High || 0;
            t.low += p.Low || 0;
            t.urgent += p.Urgent || 0;
        });
        return t;
    }, [filteredData]);

    const exportToExcel = () => {
        const header = ['Server', 'Total Tickets', 'Open', 'In Progress', 'Resolved', 'Closed', 'Normal', 'High', 'Low', 'Urgent'];
        const rows = filteredData.map(b => {
            const s = b.statusCounts || {};
            const p = b.priorityCounts || {};
            // Use totalTickets from response instead of calculating
            const total = s.totalTickets || 0;
            return [
                b.brandName,
                total,
                s.Open || 0,
                s['In Progress'] || 0,
                s.Resolved || 0,
                s.Closed || 0,
                p.Normal || 0,
                p.High || 0,
                p.Low || 0,
                p.Urgent || 0
            ];
        });

        const worksheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Server Report");
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const data = new Blob([excelBuffer], { type: 'application/octet-stream' });
        saveAs(data, `Server_Wise_Report_${new Date().toLocaleDateString()}.xlsx`);
    };

    const currentModels = filteredData.slice(
        currentPage * pageSize,
        (currentPage + 1) * pageSize
    );

    const totalPages = Math.ceil(filteredData.length / pageSize);

    return (
        <div className="space-y-6 animate-fade-in text-gray-800">
            {/* Analytics Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between group hover:border-blue-200 transition-colors">
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Impact</p>
                        <h3 className="text-3xl font-black text-slate-800">{totals.total}</h3>
                        <p className="text-xs text-blue-500 font-bold mt-1">Across all filtered servers</p>
                    </div>
                    <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl group-hover:scale-110 transition-transform">
                        <Layers size={24} />
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between group hover:border-amber-200 transition-colors">
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Active Backlog</p>
                        <h3 className="text-3xl font-black text-amber-600">{totals.open + totals.inProgress}</h3>
                        <p className="text-xs text-amber-500 font-bold mt-1">Pending resolution</p>
                    </div>
                    <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl group-hover:scale-110 transition-transform">
                        <Clock size={24} />
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between group hover:border-red-200 transition-colors">
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Critical Priority</p>
                        <h3 className="text-3xl font-black text-red-600">{totals.urgent}</h3>
                        <p className="text-xs text-red-500 font-bold mt-1">Requiring immediate action</p>
                    </div>
                    <div className="p-4 bg-red-50 text-red-600 rounded-2xl group-hover:scale-110 transition-transform">
                        <AlertCircle size={24} />
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between group hover:border-emerald-200 transition-colors">
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Success Rate</p>
                        <h3 className="text-3xl font-black text-emerald-600">{totals.resolved + totals.closed}</h3>
                        <p className="text-xs text-emerald-500 font-bold mt-1">Completed tickets</p>
                    </div>
                    <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:scale-110 transition-transform">
                        <CheckCircle2 size={24} />
                    </div>
                </div>
            </div>

            {/* Main Table Card */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-600 shadow-xl shadow-blue-100 rounded-2xl text-white">
                            <BarChart3 size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Server Status Matrix</h2>
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-0.5">Performance Reporting</p>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
                        <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-600">Show</label>
                            <select
                                value={pageSize}
                                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(0); }}
                                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                            </select>
                            <span className="text-sm text-gray-600">entries</span>
                        </div>
                        <div className="relative w-full md:w-80">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Filter by server brand name..."
                                className="w-full px-3 py-1.5 pl-12 text-sm border border-gray-300 rounded-md bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(0); }}
                            />
                        </div>
                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <button
                                onClick={() => fetchReport(true)}
                                disabled={refreshing}
                                className="px-4 py-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <RefreshCcw size={18} className={refreshing ? "animate-spin" : ""} />
                            </button>
                            <button
                                onClick={exportToExcel}
                                className="px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center gap-2"
                            >
                                <FileSpreadsheet size={18} />
                                Export XLS
                            </button>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="table w-full text-center border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr className="text-gray-400 font-black text-xs tracking-[0.15em] uppercase">
                                <th className="py-5">No.</th>
                                <th className="text-left">Server Identity</th>
                                <th>
                                    <div className="flex items-center justify-center gap-2">
                                        <span>Total</span>
                                        <span className="inline-flex px-2.5 py-1 rounded-full bg-green-100 text-green-700 font-bold text-xs">
                                            {totals.total}
                                        </span>
                                    </div>
                                </th>
                                <th>
                                    <div className="flex items-center justify-center gap-2">
                                        <span>Open</span>
                                        <span className="inline-flex px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 font-bold text-xs">
                                            {totals.open}
                                        </span>
                                    </div>
                                </th>
                                <th>
                                    <div className="flex items-center justify-center gap-2">
                                        <span>Progress</span>
                                        <span className="inline-flex px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 font-bold text-xs">
                                            {totals.inProgress}
                                        </span>
                                    </div>
                                </th>
                                <th>
                                    <div className="flex items-center justify-center gap-2">
                                        <span>Resolved</span>
                                        <span className="inline-flex px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs">
                                            {totals.resolved}
                                        </span>
                                    </div>
                                </th>
                                <th>
                                    <div className="flex items-center justify-center gap-2">
                                        <span>Closed</span>
                                        <span className="inline-flex px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 font-bold text-xs">
                                            {totals.closed}
                                        </span>
                                    </div>
                                </th>
                                <th className="border-l border-slate-100">
                                    <div className="flex items-center justify-center gap-2">
                                        <span>Urgent</span>
                                        <span className="inline-flex px-2.5 py-1 rounded-full bg-red-100 text-red-700 font-bold text-xs">
                                            {totals.urgent}
                                        </span>
                                    </div>
                                </th>
                                <th>
                                    <div className="flex items-center justify-center gap-2">
                                        <span>High</span>
                                        <span className="inline-flex px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 font-bold text-xs">
                                            {totals.high}
                                        </span>
                                    </div>
                                </th>
                                <th>
                                    <div className="flex items-center justify-center gap-2">
                                        <span>Normal</span>
                                        <span className="inline-flex px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 font-bold text-xs">
                                            {totals.normal}
                                        </span>
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="text-sm font-medium text-slate-600">
                            {loading ? (
                                <tr>
                                    <td colSpan="10" className="py-24">
                                        <Loader2 size={40} className="animate-spin text-blue-600 mx-auto" />
                                        <p className="mt-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Compiling Analytics Data...</p>
                                    </td>
                                </tr>
                            ) : currentModels.length === 0 ? (
                                <tr>
                                    <td colSpan="10" className="py-24 text-slate-300 italic">No recording found matching your current filter.</td>
                                </tr>
                            ) : (
                                currentModels.map((item, idx) => {
                                    const s = item.statusCounts || {};
                                    const p = item.priorityCounts || {};
                                    // Use totalTickets from response instead of calculating
                                    const rowTotal = s.totalTickets || 0;

                                    return (
                                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-0">
                                            <td className="text-slate-300 font-bold text-sm">{(currentPage * pageSize) + idx + 1}</td>
                                            <td className="text-left py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center font-black text-sm">
                                                        {item.brandName?.[0]}
                                                    </div>
                                                    <span className="font-bold text-slate-800 text-sm">{item.brandName}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="inline-flex px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-black text-sm">
                                                    {rowTotal}
                                                </span>
                                            </td>
                                            <td><span className="text-blue-600 font-bold text-sm">{s.Open || 0}</span></td>
                                            <td><span className="text-amber-600 font-bold text-sm">{s['In Progress'] || 0}</span></td>
                                            <td><span className="text-emerald-600 font-bold text-sm">{s.Resolved || 0}</span></td>
                                            <td><span className="text-purple-600 font-bold text-sm">{s.Closed || 0}</span></td>
                                            <td className="border-l border-slate-50"><span className="text-red-600 font-bold bg-red-50 px-3 py-1.5 rounded-lg text-sm">{p.Urgent || 0}</span></td>
                                            <td><span className="text-orange-600 font-bold text-sm">{p.High || 0}</span></td>
                                            <td><span className="text-blue-500 font-bold text-sm">{p.Normal || 0}</span></td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="mt-6 pt-4 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4 p-6">
                    <div className="text-base text-gray-500">
                        Showing <span className="font-semibold">{filteredData.length > 0 ? (currentPage * pageSize) + 1 : 0}</span> to <span className="font-semibold">{Math.min((currentPage + 1) * pageSize, filteredData.length)}</span> of <span className="font-semibold">{filteredData.length}</span> entries
                    </div>
                    <div className="flex gap-2">
                        <button
                            disabled={currentPage === 0 || loading}
                            onClick={() => setCurrentPage(p => p - 1)}
                            className="px-3 py-2 text-base font-medium rounded-md border transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{
                                backgroundColor: currentPage === 0 || loading ? '#f8fafc' : 'transparent',
                                borderColor: '#e2e8f0',
                                color: currentPage === 0 || loading ? '#94a3b8' : '#64748b'
                            }}
                            onMouseEnter={(e) => {
                                if (currentPage !== 0 && !loading) {
                                    e.target.style.backgroundColor = '#f1f5f9';
                                    e.target.style.borderColor = '#cbd5e1';
                                    e.target.style.color = '#475569';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (currentPage !== 0 && !loading) {
                                    e.target.style.backgroundColor = 'transparent';
                                    e.target.style.borderColor = '#e2e8f0';
                                    e.target.style.color = '#64748b';
                                }
                            }}
                        >
                            Previous
                        </button>
                        <div className="flex items-center gap-1">
                            <span className="text-base font-medium px-3 py-1 bg-blue-100 text-blue-700 rounded-md">
                                {currentPage + 1}
                            </span>
                            <span className="text-base text-gray-400">of {totalPages || 1}</span>
                        </div>
                        <button
                            disabled={currentPage >= totalPages - 1 || loading}
                            onClick={() => setCurrentPage(p => p + 1)}
                            className="px-3 py-2 text-base font-medium rounded-md border transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{
                                backgroundColor: (currentPage >= totalPages - 1 || loading) ? '#f8fafc' : 'transparent',
                                borderColor: '#e2e8f0',
                                color: (currentPage >= totalPages - 1 || loading) ? '#94a3b8' : '#64748b'
                            }}
                            onMouseEnter={(e) => {
                                if (currentPage < totalPages - 1 && !loading) {
                                    e.target.style.backgroundColor = '#f1f5f9';
                                    e.target.style.borderColor = '#cbd5e1';
                                    e.target.style.color = '#475569';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (currentPage < totalPages - 1 && !loading) {
                                    e.target.style.backgroundColor = 'transparent';
                                    e.target.style.borderColor = '#e2e8f0';
                                    e.target.style.color = '#64748b';
                                }
                            }}
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ServerWiseReport;
