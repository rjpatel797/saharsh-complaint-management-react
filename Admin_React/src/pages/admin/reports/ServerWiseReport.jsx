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
    const [exportLoading, setExportLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const hasFetchedRef = useRef(false);

    // Add custom thin scrollbar styles
    useEffect(() => {
        const style = document.createElement('style');
        style.textContent = `
            .custom-scrollbar::-webkit-scrollbar {
                height: 6px;
                width: 6px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
                background: #f1f5f9;
                border-radius: 10px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
                background: #94a3b8;
                border-radius: 10px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                background: #64748b;
            }
            .custom-scrollbar {
                scrollbar-width: thin;
                scrollbar-color: #94a3b8 #f1f5f9;
            }
        `;
        document.head.appendChild(style);
        return () => {
            if (document.head.contains(style)) {
                document.head.removeChild(style);
            }
        };
    }, []);

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

    const exportToExcel = async () => {
        if (filteredData.length === 0) {
            return;
        }

        setExportLoading(true);
        try {
            // Small delay to show spinner (helps with user feedback)
            await new Promise(resolve => setTimeout(resolve, 100));

            const header = ['Server', 'Total Tickets', 'Open', 'In Progress', 'Self Resolved', 'Auto Resolved', 'Normal', 'High', 'Low', 'Urgent'];
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
        } catch (error) {
            console.error('Export error:', error);
        } finally {
            setExportLoading(false);
        }
    };

    const currentModels = filteredData.slice(
        currentPage * pageSize,
        (currentPage + 1) * pageSize
    );

    const totalPages = Math.ceil(filteredData.length / pageSize);

    return (
        <div className="space-y-6 animate-fade-in text-gray-800 pt-4 pb-6">
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
            <div className="flex-1 min-h-0 bg-white flex flex-col overflow-hidden">
                <div className="px-4 md:px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 via-white to-gray-50 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-xl">
                                <BarChart3 className="text-blue-600" size={20} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Server Status Matrix</h2>
                                <p className="text-xs text-gray-500 font-medium">Performance Reporting</p>
                            </div>
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
                                disabled={exportLoading}
                                className="px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                            >
                                {exportLoading ? (
                                    <>
                                        <Loader2 className="animate-spin" size={18} />
                                        <span>Exporting...</span>
                                    </>
                                ) : (
                                    <>
                                        <FileSpreadsheet size={18} />
                                        Export XLS
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto overflow-y-auto custom-scrollbar relative" style={{ maxHeight: '320px', height: '320px' }}>
                    <table className="w-full border-collapse min-w-full">
                        <thead className="bg-gradient-to-r from-gray-50 to-gray-100 sticky top-0 z-10 shadow-md">
                            <tr>
                                <th className="whitespace-nowrap py-4 px-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">No.</th>
                                <th className="whitespace-nowrap py-4 px-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">Server Identity</th>
                                <th className="whitespace-nowrap py-4 px-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
                                    <div className="flex items-center justify-center gap-2">
                                        <span>Total</span>
                                        <span className="inline-flex px-2.5 py-1 rounded-full bg-green-100 text-green-700 font-bold text-xs">
                                            {totals.total}
                                        </span>
                                    </div>
                                </th>
                                <th className="whitespace-nowrap py-4 px-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
                                    <div className="flex items-center justify-center gap-2">
                                        <span>Open</span>
                                        <span className="inline-flex px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 font-bold text-xs">
                                            {totals.open}
                                        </span>
                                    </div>
                                </th>
                                <th className="whitespace-nowrap py-4 px-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
                                    <div className="flex items-center justify-center gap-2">
                                        <span>Progress</span>
                                        <span className="inline-flex px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 font-bold text-xs">
                                            {totals.inProgress}
                                        </span>
                                    </div>
                                </th>
                                <th className="whitespace-nowrap py-4 px-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
                                    <div className="flex items-center justify-center gap-2">
                                        <span>Self Resolved</span>
                                        <span className="inline-flex px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs">
                                            {totals.resolved}
                                        </span>
                                    </div>
                                </th>
                                <th className="whitespace-nowrap py-4 px-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
                                    <div className="flex items-center justify-center gap-2">
                                        <span>Auto Resolved</span>
                                        <span className="inline-flex px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 font-bold text-xs">
                                            {totals.closed}
                                        </span>
                                    </div>
                                </th>
                                <th className="whitespace-nowrap py-4 px-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200 border-l border-gray-200">
                                    <div className="flex items-center justify-center gap-2">
                                        <span>Urgent</span>
                                        <span className="inline-flex px-2.5 py-1 rounded-full bg-red-100 text-red-700 font-bold text-xs">
                                            {totals.urgent}
                                        </span>
                                    </div>
                                </th>
                                <th className="whitespace-nowrap py-4 px-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
                                    <div className="flex items-center justify-center gap-2">
                                        <span>High</span>
                                        <span className="inline-flex px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 font-bold text-xs">
                                            {totals.high}
                                        </span>
                                    </div>
                                </th>
                                <th className="whitespace-nowrap py-4 px-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
                                    <div className="flex items-center justify-center gap-2">
                                        <span>Normal</span>
                                        <span className="inline-flex px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 font-bold text-xs">
                                            {totals.normal}
                                        </span>
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="text-sm bg-white divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="10" className="text-center py-20">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="relative">
                                                <div className="absolute inset-0 bg-blue-200 rounded-full blur-xl opacity-50 animate-pulse"></div>
                                                <Loader2 className="relative animate-spin mx-auto text-blue-600" size={40} />
                                            </div>
                                            <div>
                                                <p className="text-gray-700 font-semibold text-base">Fetching data...</p>
                                                <p className="text-gray-400 text-sm mt-1">Please wait while we load your data</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ) : currentModels.length === 0 ? (
                                <tr>
                                    <td colSpan="10" className="text-center py-20">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="p-4 bg-gray-100 rounded-full">
                                                <BarChart3 className="text-gray-400" size={32} />
                                            </div>
                                            <p className="text-gray-500 font-semibold text-base">No data found matching your criteria.</p>
                                            <p className="text-gray-400 text-sm">Try adjusting your search or filters</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                currentModels.map((item, idx) => {
                                    const s = item.statusCounts || {};
                                    const p = item.priorityCounts || {};
                                    // Use totalTickets from response instead of calculating
                                    const rowTotal = s.totalTickets || 0;

                                    return (
                                        <tr key={idx} className="group hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/50 transition-all duration-200 border-b border-gray-100">
                                            <td className="text-gray-700 whitespace-nowrap text-center py-4 px-4 font-medium">{(currentPage * pageSize) + idx + 1}</td>
                                            <td className="text-left whitespace-nowrap py-4 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center font-black text-sm">
                                                        {item.brandName?.[0]}
                                                    </div>
                                                    <span className="font-bold text-gray-800 text-sm">{item.brandName}</span>
                                                </div>
                                            </td>
                                            <td className="whitespace-nowrap py-4 px-4 text-center">
                                                <span className="inline-flex px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-black text-sm shadow-sm">
                                                    {rowTotal}
                                                </span>
                                            </td>
                                            <td className="text-gray-800 whitespace-nowrap py-4 px-4 text-center font-medium"><span className="text-blue-600 font-bold text-sm">{s.Open || 0}</span></td>
                                            <td className="text-gray-800 whitespace-nowrap py-4 px-4 text-center font-medium"><span className="text-amber-600 font-bold text-sm">{s['In Progress'] || 0}</span></td>
                                            <td className="text-gray-800 whitespace-nowrap py-4 px-4 text-center font-medium"><span className="text-emerald-600 font-bold text-sm">{s.Resolved || 0}</span></td>
                                            <td className="text-gray-800 whitespace-nowrap py-4 px-4 text-center font-medium"><span className="text-purple-600 font-bold text-sm">{s.Closed || 0}</span></td>
                                            <td className="border-l border-gray-200 whitespace-nowrap py-4 px-4 text-center"><span className="text-red-600 font-bold bg-red-50 px-3 py-1.5 rounded-lg text-sm shadow-sm">{p.Urgent || 0}</span></td>
                                            <td className="text-gray-800 whitespace-nowrap py-4 px-4 text-center font-medium"><span className="text-orange-600 font-bold text-sm">{p.High || 0}</span></td>
                                            <td className="text-gray-800 whitespace-nowrap py-4 px-4 text-center font-medium"><span className="text-blue-500 font-bold text-sm">{p.Normal || 0}</span></td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination - Modern Design */}
                <div className="px-4 md:px-6 py-5 border-t border-gray-200 bg-gradient-to-r from-gray-50/50 to-white flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="text-sm text-gray-600 font-medium">
                        Showing <span className="font-bold text-gray-900">{filteredData.length > 0 ? (currentPage * pageSize) + 1 : 0}</span> to <span className="font-bold text-gray-900">{Math.min((currentPage + 1) * pageSize, filteredData.length)}</span> of <span className="font-bold text-gray-900">{filteredData.length}</span> entries
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
        </div>
    );
};

export default ServerWiseReport;
