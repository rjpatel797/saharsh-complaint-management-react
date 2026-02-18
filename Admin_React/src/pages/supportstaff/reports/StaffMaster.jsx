import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    FileText,
    Search,
    Download,
    Filter,
    Calendar,
    ChevronLeft,
    ChevronRight,
    X,
    FileSpreadsheet,
    Loader2,
    Info,
    Clock,
    Phone,
    Mail,
    User,
    CheckCircle2,
    MoreVertical
} from 'lucide-react';
import apiClient from '../../../api/apiClient';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';

const StaffMaster = () => {
    const [rawData, setRawData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [totalElements, setTotalElements] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    // Filter State
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    // Modal State
    const [modalData, setModalData] = useState({ open: false, title: '', content: '', isAssignedMembers: false, members: [] });

    const fromDateRef = useRef(null);
    const toDateRef = useRef(null);
    const hasFetchedInitialReportRef = useRef(false);
    const isInitialMountRef = useRef(true);
    const isFetchingRef = useRef(false);

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

    // Fetch report data with server-side pagination
    const fetchReport = useCallback(async (page, size, dateFrom, dateTo) => {
        // Prevent duplicate concurrent calls
        if (isFetchingRef.current) {
            return;
        }
        isFetchingRef.current = true;
        setLoading(true);
        try {
            // API endpoint: /report/staffMasterReport?page={page}&size={size}&fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD
            let url = `/report/staffMasterReport?page=${page}&size=${size}`;
            if (dateFrom && dateTo) {
                url += `&fromDate=${encodeURIComponent(dateFrom)}&toDate=${encodeURIComponent(dateTo)}`;
            }

            const response = await apiClient.get(url);
            if (response.data && response.data.status) {
                // API returns: { status: true, data: [...], currentPage, pageSize, totalPages, totalElements }
                setRawData(response.data.data || []);
                
                // Update pagination metadata from API response
                if (response.data.totalElements !== undefined) {
                    setTotalElements(response.data.totalElements);
                }
                if (response.data.totalPages !== undefined) {
                    setTotalPages(response.data.totalPages);
                }
            } else {
                setRawData([]);
                setTotalElements(0);
                setTotalPages(0);
            }
        } catch (error) {
            console.error('Error fetching staff master report:', error);
            // Don't redirect on error, just show message
            if (error.response?.status !== 401) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: error.response?.data?.message || 'Failed to load report. Please try again.',
                    confirmButtonColor: '#8b5cf6'
                });
            }
        } finally {
            setLoading(false);
            isFetchingRef.current = false;
        }
    }, []);

    // Initial load on mount - only run once
    useEffect(() => {
        if (!hasFetchedInitialReportRef.current) {
            hasFetchedInitialReportRef.current = true;
            fetchReport(0, pageSize, '', '');
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Re-fetch when page, pageSize or applied filters change (but not on initial mount)
    useEffect(() => {
        // Skip if this is the initial mount (handled by the effect above)
        if (!hasFetchedInitialReportRef.current) {
            return;
        }
        // Skip if this is the first run after initial mount
        if (isInitialMountRef.current) {
            isInitialMountRef.current = false;
            return;
        }
        fetchReport(currentPage, pageSize, fromDate, toDate);
    }, [currentPage, pageSize, fromDate, toDate]); // Removed fetchReport from deps - it's stable

    // Apply search filter on current page data
    const filteredData = useMemo(() => {
        const term = searchTerm.toLowerCase().trim();
        if (!term) return rawData;
        return rawData.filter(r => {
            const searchStr = [
                r.ticketId, r.username, r.brandName, r.deviceOrderId,
                r.priority, r.status, r.complaintType, r.assignTo,
                r.remark, r.shortDescription, r.contactNo, r.email,
                r.actionPanel, r.actionBy, r.requestType, r.requestPanel, r.requestPerson
            ].join(' ').toLowerCase();
            return searchStr.includes(term);
        });
    }, [rawData, searchTerm]);

    // For display, use filtered data if search is active, otherwise use rawData
    const displayData = filteredData;
    const displayTotal = searchTerm.trim() ? filteredData.length : totalElements;

    const exportToExcel = async () => {
        if (displayTotal === 0) {
            Swal.fire({
                icon: 'info',
                title: 'No data',
                text: 'There is no data to export matching your filters.',
                timer: 3000,
                showConfirmButton: false
            });
            return;
        }

        // For export, fetch all data without pagination
        try {
            let url = `/report/staffMasterReport?page=0&size=10000`; // Large size to get all data
            if (fromDate && toDate) {
                url += `&fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}`;
            }

            const response = await apiClient.get(url);
            const exportData = response.data?.data || [];

            const header = [
                'SR NO.', 'Ticket ID', 'User Name', 'Server Name', 'Device Name', 'Priority',
                'Status', 'Assigned To', 'Complaint Type', 'Action Panel', 'Action By', 'Request Type', 'Request Panel', 'Request Person', 'Contact No', 'Email',
                'Remark', 'User Description', 'Issue Date', 'Last Update', 'Resolved Date'
            ];

            const rows = exportData.map((r, idx) => [
                idx + 1,
                r.ticketId || '-',
                r.username || r.userName || '-',
                r.brandName || '-',
                r.deviceOrderId || '-',
                r.priority || '-',
                r.status || '-',
                r.assignTo || '-',
                r.complaintType || '-',
                r.actionPanel || '-',
                r.actionBy || '-',
                r.requestType || '-',
                r.requestPanel || '-',
                r.requestPerson || '-',
                r.contactNo || '-',
                r.email || '-',
                r.remark || '-',
                r.shortDescription || '-',
                r.createDate ? new Date(r.createDate).toLocaleString() : '-',
                r.updateDate ? new Date(r.updateDate).toLocaleString() : '-',
                r.resolveDate ? new Date(r.resolveDate).toLocaleString() : '-'
            ]);

            const worksheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Staff Master");
            const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
            const data = new Blob([excelBuffer], { type: 'application/octet-stream' });
            saveAs(data, `Staff_Master_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Export Failed',
                text: 'Failed to export data. Please try again.',
                confirmButtonColor: '#8b5cf6'
            });
        }
    };

    const handleApplyFilter = () => {
        if ((fromDate && !toDate) || (!fromDate && toDate)) {
            Swal.fire({
                icon: 'warning',
                title: 'Incomplete Dates',
                text: 'Please select both From and To dates for filtering.',
                timer: 3000,
                showConfirmButton: false
            });
            return;
        }
        if (fromDate && toDate && new Date(fromDate) > new Date(toDate)) {
            Swal.fire({
                icon: 'error',
                title: 'Invalid Range',
                text: 'From date cannot be after To date.',
                timer: 3000,
                showConfirmButton: false
            });
            return;
        }
        setCurrentPage(0); // Reset to first page when applying filters
        // The useEffect will trigger fetchReport when currentPage changes
    };

    const clearFilters = () => {
        setFromDate('');
        setToDate('');
        setSearchTerm('');
        setCurrentPage(0);
        // The useEffect will trigger fetchReport when filters are cleared
    };

    // Use displayData directly (already paginated by server)
    const currentRecords = displayData;
    
    // Use API's totalPages, or calculate from displayTotal if search is active
    const calculatedTotalPages = searchTerm.trim() 
        ? Math.ceil(displayTotal / pageSize) 
        : totalPages;

    const StatusPill = ({ status }) => {
        const s = status?.toLowerCase();
        const colors = {
            'open': 'bg-blue-50 text-blue-600 border-blue-100',
            'in progress': 'bg-amber-50 text-amber-600 border-amber-100',
            'resolved': 'bg-emerald-50 text-emerald-600 border-emerald-100',
            'closed': 'bg-slate-50 text-slate-500 border-slate-200',
            'verified': 'bg-indigo-50 text-indigo-600 border-indigo-100'
        };
        return (
            <span className={`px-2.5 py-1 rounded-lg border font-bold text-xs uppercase whitespace-nowrap ${colors[s] || 'bg-gray-50 text-gray-500'}`}>
                {status || 'Unknown'}
            </span>
        );
    };

    const PriorityPill = ({ priority }) => {
        const p = priority?.toLowerCase();
        const colors = {
            'urgent': 'bg-rose-100 text-rose-700 font-black',
            'high': 'bg-orange-100 text-orange-700',
            'normal': 'bg-blue-100 text-blue-700',
            'low': 'bg-slate-100 text-slate-600'
        };
        return (
            <span className={`px-2.5 py-1 rounded-lg font-bold text-xs uppercase whitespace-nowrap ${colors[p] || 'bg-gray-100 text-gray-400'}`}>
                {priority || 'Medium'}
            </span>
        );
    };

    const ServerNamePill = ({ serverName }) => {
        if (!serverName) return <span className="text-gray-400">-</span>;
        return (
            <span className="px-2.5 py-1 rounded-lg font-bold text-xs uppercase whitespace-nowrap bg-blue-100 text-blue-700">
                {serverName}
            </span>
        );
    };

    // Helper function to parse assigned members
    const getAssignedMembers = (assignTo) => {
        if (!assignTo || assignTo.trim() === '') return [];
        return assignTo.split(',').map(name => name.trim()).filter(name => name !== '');
    };

    const getAssignedCount = (assignTo) => {
        const members = getAssignedMembers(assignTo);
        return members.length;
    };

    const formatAssignedNames = (assignTo) => {
        const members = getAssignedMembers(assignTo);
        if (members.length === 0) return 'No members assigned';
        return members.join(', ');
    };

    return (
        <div className="space-y-6 animate-fade-in text-gray-800">
            {/* Header & Main Actions */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-600 text-white rounded-lg shadow-xl shadow-blue-100">
                        <FileText size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-800 tracking-tight">Staff Master Report</h2>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-0.5">Ticket Audit & Performance History</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
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
                    <div className="flex-1 min-w-[300px] relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search Ticket ID, User, Server, Device, Contact..."
                            className="w-full px-3 py-1.5 pl-12 text-sm border border-gray-300 rounded-md bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(0); }}
                        />
                    </div>
                    <button
                        onClick={exportToExcel}
                        className="px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center gap-2"
                    >
                        <FileSpreadsheet size={18} />
                        Export Audit
                    </button>
                </div>
            </div>

            {/* Advanced Filters */}
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
                <div className="flex flex-col lg:flex-row gap-4 items-end">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                        <div className="form-control">
                            <label className="label py-0.5">
                                <span className="label-text font-black text-slate-400 uppercase text-[9px] tracking-widest px-1 flex items-center gap-1">
                                    <Calendar size={12} /> Start Date
                                </span>
                            </label>
                            <div className="relative">
                                <input
                                    ref={fromDateRef}
                                    type="date"
                                    className="w-full px-3 py-2 pr-10 h-10 border border-gray-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                                    value={fromDate}
                                    onChange={(e) => setFromDate(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => fromDateRef.current?.showPicker?.() || fromDateRef.current?.click()}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors pointer-events-auto"
                                >
                                    <Calendar size={16} />
                                </button>
                            </div>
                        </div>
                        <div className="form-control">
                            <label className="label py-0.5">
                                <span className="label-text font-black text-slate-400 uppercase text-[9px] tracking-widest px-1 flex items-center gap-1">
                                    <Calendar size={12} /> End Date
                                </span>
                            </label>
                            <div className="relative">
                                <input
                                    ref={toDateRef}
                                    type="date"
                                    className="w-full px-3 py-2 pr-10 h-10 border border-gray-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                                    value={toDate}
                                    onChange={(e) => setToDate(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => toDateRef.current?.showPicker?.() || toDateRef.current?.click()}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors pointer-events-auto"
                                >
                                    <Calendar size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2 w-full lg:w-auto">
                        <button
                            onClick={handleApplyFilter}
                            className="px-5 py-2 h-10 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-colors flex-1 md:flex-none uppercase tracking-widest text-xs font-black"
                        >
                            Apply Filter
                        </button>
                        <button
                            onClick={clearFilters}
                            className="px-5 py-2 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors flex-1 md:flex-none font-medium flex items-center gap-2"
                        >
                            <X size={16} />
                            Reset
                        </button>
                    </div>
                </div>
            </div>

            {/* Report Table */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="table w-full text-center border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-100 font-black text-xs tracking-[0.15em] uppercase text-gray-400 text-center">
                            <tr>
                                <th className="py-4 px-4 whitespace-nowrap">SR NO.</th>
                                <th className="py-4 px-4 whitespace-nowrap">TICKET ID</th>
                                <th className="py-4 px-4 whitespace-nowrap">USER NAME</th>
                                <th className="py-4 px-4 whitespace-nowrap">SERVER NAME</th>
                                <th className="py-4 px-4 whitespace-nowrap">DEVICE NAME</th>
                                <th className="py-4 px-4 whitespace-nowrap">PRIORITY</th>
                                <th className="py-4 px-4 whitespace-nowrap">STATUS</th>
                                <th className="py-4 px-4 whitespace-nowrap">ASSIGNED TO</th>
                                <th className="py-4 px-4 whitespace-nowrap">COMPLAINT TYPE</th>
                                <th className="py-4 px-4 whitespace-nowrap">ACTION PANEL</th>
                                <th className="py-4 px-4 whitespace-nowrap">ACTION BY</th>
                                <th className="py-4 px-4 whitespace-nowrap">REQUEST TYPE</th>
                                <th className="py-4 px-4 whitespace-nowrap">REQUEST PANEL</th>
                                <th className="py-4 px-4 whitespace-nowrap">REQUEST PERSON</th>
                                <th className="py-4 px-4 whitespace-nowrap">CONTACT NO</th>
                                <th className="py-4 px-4 whitespace-nowrap">EMAIL</th>
                                <th className="py-4 px-4 whitespace-nowrap">REMARK</th>
                                <th className="py-4 px-4 whitespace-nowrap">USER DESCRIPTION</th>
                                <th className="py-4 px-4 whitespace-nowrap">ISSUE DATE</th>
                                <th className="py-4 px-4 whitespace-nowrap">LAST UPDATE</th>
                                <th className="py-4 px-4 whitespace-nowrap">RESOLVED DATE</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm text-center">
                            {loading ? (
                                <tr>
                                    <td colSpan="21" className="py-32">
                                        <div className="flex flex-col items-center">
                                            <Loader2 size={48} className="animate-spin text-blue-600" />
                                            <p className="mt-4 text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Querying Master Records...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : currentRecords.length === 0 ? (
                                <tr>
                                    <td colSpan="21" className="py-32">
                                        <div className="flex flex-col items-center opacity-40">
                                            <FileText size={48} className="text-slate-200" />
                                            <p className="mt-4 text-sm font-medium text-slate-900">No Data Found for Your Search Criteria.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                currentRecords.map((r, idx) => {
                                    const formatDate = (dateStr) => {
                                        if (!dateStr) return '-';
                                        const d = new Date(dateStr);
                                        if (isNaN(d.getTime())) return '-';
                                        return d.toLocaleDateString('en-US', { 
                                            year: 'numeric', 
                                            month: 'short', 
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        });
                                    };

                                    // Calculate SR NO based on current page and index
                                    const srNo = searchTerm.trim() 
                                        ? idx + 1 
                                        : (currentPage * pageSize) + idx + 1;

                                    return (
                                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-0">
                                            <td className="text-sm font-bold text-slate-300 text-center whitespace-nowrap py-4 px-4">{srNo}</td>
                                            <td className="text-sm font-bold text-slate-800 text-center whitespace-nowrap py-4 px-4">{r.ticketId || '-'}</td>
                                            <td className="text-sm font-medium text-slate-700 text-center whitespace-nowrap py-4 px-4">{r.username || r.userName || '-'}</td>
                                            <td className="text-center whitespace-nowrap py-4 px-4"><ServerNamePill serverName={r.brandName} /></td>
                                            <td className="text-sm font-medium text-slate-700 text-center whitespace-nowrap py-4 px-4">{r.deviceOrderId || '-'}</td>
                                            <td className="text-center whitespace-nowrap py-4 px-4"><PriorityPill priority={r.priority} /></td>
                                            <td className="text-center whitespace-nowrap py-4 px-4"><StatusPill status={r.status} /></td>
                                            <td className="text-center whitespace-nowrap py-4 px-4">
                                                {r.assignTo && getAssignedCount(r.assignTo) > 0 ? (
                                                    <div className="flex justify-center items-center">
                                                        <button
                                                            onClick={() => {
                                                                const members = getAssignedMembers(r.assignTo);
                                                                setModalData({ 
                                                                    open: true, 
                                                                    title: 'Assigned Members', 
                                                                    content: members.join(', '),
                                                                    isAssignedMembers: true,
                                                                    members: members
                                                                });
                                                            }}
                                                            className="w-8 h-8 rounded-full bg-green-50 border border-green-200 text-green-700 font-bold text-sm hover:bg-green-100 hover:border-green-300 hover:scale-110 transition-all duration-200 cursor-pointer flex items-center justify-center"
                                                            title={formatAssignedNames(r.assignTo)}
                                                        >
                                                            {getAssignedCount(r.assignTo)}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400">-</span>
                                                )}
                                            </td>
                                            <td className="text-sm font-medium text-slate-700 text-center whitespace-nowrap py-4 px-4">{r.complaintType || '-'}</td>
                                            <td className="text-sm font-medium text-slate-700 text-center whitespace-nowrap py-4 px-4">{r.actionPanel || '-'}</td>
                                            <td className="text-sm font-medium text-slate-700 text-center whitespace-nowrap py-4 px-4">{r.actionBy || '-'}</td>
                                            <td className="text-sm font-medium text-slate-700 text-center whitespace-nowrap py-4 px-4">{r.requestType || '-'}</td>
                                            <td className="text-sm font-medium text-slate-700 text-center whitespace-nowrap py-4 px-4">{r.requestPanel || '-'}</td>
                                            <td className="text-sm font-medium text-slate-700 text-center whitespace-nowrap py-4 px-4">{r.requestPerson || '-'}</td>
                                            <td className="text-sm font-medium text-slate-700 text-center whitespace-nowrap py-4 px-4">{r.contactNo || '-'}</td>
                                            <td className="text-sm font-medium text-slate-700 text-center whitespace-nowrap py-4 px-4">{r.email || '-'}</td>
                                            <td className="text-sm font-medium text-slate-700 text-center whitespace-nowrap py-4 px-4">
                                                <button
                                                    onClick={() => setModalData({ 
                                                        open: true, 
                                                        title: 'Remark Details', 
                                                        content: r.remark || 'No remark available' 
                                                    })}
                                                    className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer truncate max-w-[150px] block mx-auto"
                                                    title={r.remark || 'No remark'}
                                                >
                                                    {r.remark ? (r.remark.length > 20 ? r.remark.substring(0, 20) + '...' : r.remark) : '-'}
                                                </button>
                                            </td>
                                            <td className="text-sm font-medium text-slate-700 text-center whitespace-nowrap py-4 px-4">
                                                <button
                                                    onClick={() => setModalData({ 
                                                        open: true, 
                                                        title: 'User Description Details', 
                                                        content: r.shortDescription || 'No description available' 
                                                    })}
                                                    className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer truncate max-w-[150px] block mx-auto"
                                                    title={r.shortDescription || 'No description'}
                                                >
                                                    {r.shortDescription ? (r.shortDescription.length > 20 ? r.shortDescription.substring(0, 20) + '...' : r.shortDescription) : '-'}
                                                </button>
                                            </td>
                                            <td className="text-sm font-medium text-slate-600 text-center whitespace-nowrap py-4 px-4">{formatDate(r.createDate)}</td>
                                            <td className="text-sm font-medium text-slate-600 text-center whitespace-nowrap py-4 px-4">{formatDate(r.updateDate)}</td>
                                            <td className="text-sm font-medium text-slate-600 text-center whitespace-nowrap py-4 px-4">{formatDate(r.resolveDate)}</td>
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
                        Showing <span className="font-semibold">{displayTotal > 0 ? (currentPage * pageSize) + 1 : 0}</span> to <span className="font-semibold">{Math.min((currentPage + 1) * pageSize, displayTotal)}</span> of <span className="font-semibold">{displayTotal}</span> entries
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
                            <span className="text-base text-gray-400">of {calculatedTotalPages || 1}</span>
                        </div>
                        <button
                            disabled={currentPage >= calculatedTotalPages - 1 || loading}
                            onClick={() => setCurrentPage(p => p + 1)}
                            className="px-3 py-2 text-base font-medium rounded-md border transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{
                                backgroundColor: (currentPage >= calculatedTotalPages - 1 || loading) ? '#f8fafc' : 'transparent',
                                borderColor: '#e2e8f0',
                                color: (currentPage >= calculatedTotalPages - 1 || loading) ? '#94a3b8' : '#64748b'
                            }}
                            onMouseEnter={(e) => {
                                if (currentPage < calculatedTotalPages - 1 && !loading) {
                                    e.target.style.backgroundColor = '#f1f5f9';
                                    e.target.style.borderColor = '#cbd5e1';
                                    e.target.style.color = '#475569';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (currentPage < calculatedTotalPages - 1 && !loading) {
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

            {/* Info Modal */}
            {modalData.open && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 animate-fade-in" onClick={() => setModalData({ open: false, title: '', content: '', isAssignedMembers: false, members: [] })}>
                    <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
                        <div className="p-8 pb-4 flex justify-between items-center bg-slate-50 border-b border-slate-100">
                            <div>
                                <h3 className="text-xl font-black text-slate-800 tracking-tight">{modalData.title}</h3>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">Extended Audit Details</p>
                            </div>
                            <button onClick={() => setModalData({ open: false, title: '', content: '', isAssignedMembers: false, members: [] })} className="p-2 hover:bg-white rounded-full transition-colors text-slate-400">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-10 text-slate-600 leading-relaxed font-medium">
                            {modalData.isAssignedMembers && modalData.members && modalData.members.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {modalData.members.map((member, index) => (
                                        <span 
                                            key={index}
                                            className="inline-block px-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-slate-800 font-medium text-sm"
                                        >
                                            {member}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <div className="whitespace-pre-wrap">{modalData.content}</div>
                            )}
                        </div>
                        <div className="p-6 pt-0 flex justify-end">
                            <button onClick={() => setModalData({ open: false, title: '', content: '', isAssignedMembers: false, members: [] })} className="btn bg-slate-800 hover:bg-slate-900 border-none text-white px-8 rounded-2xl uppercase text-[10px] tracking-widest font-black h-12 shadow-xl shadow-slate-100">
                                Acknowledge
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StaffMaster;
