import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    FileText,
    Search,
    Download,
    Filter,
    Calendar,
    Users,
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
import TicketModal from '../TicketModal';

const TicketMasterReport = () => {
    const [rawData, setRawData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [staffLoading, setStaffLoading] = useState(false);
    const [exportLoading, setExportLoading] = useState(false);
    const [supportStaff, setSupportStaff] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [totalElements, setTotalElements] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    // Filters actually applied to the API (only change when user clicks "Compute Filter")
    const [appliedFromDate, setAppliedFromDate] = useState('');
    const [appliedToDate, setAppliedToDate] = useState('');
    const [appliedStaffId, setAppliedStaffId] = useState('');

    // Filter State
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [selectedStaffId, setSelectedStaffId] = useState('');
    const [staffSearchText, setStaffSearchText] = useState('');
    const [showStaffDropdown, setShowStaffDropdown] = useState(false);

    // Modal State
    const [modalData, setModalData] = useState({ open: false, title: '', content: '', isAssignedMembers: false, members: [] });
    const [selectedTicket, setSelectedTicket] = useState(null);

    const staffDropdownRef = useRef(null);
    const fromDateRef = useRef(null);
    const toDateRef = useRef(null);
    const hasFetchedStaffRef = useRef(false);
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

    const fetchStaff = useCallback(async () => {
        setStaffLoading(true);
        try {
            const response = await apiClient.get('/admin/getAllSupportStaffNames');
            if (response.data && response.data.status) {
                setSupportStaff(response.data.data || []);
            }
        } catch (error) {
            console.error('Error fetching staff names:', error);
        } finally {
            setStaffLoading(false);
        }
    }, []);

    // Fetch report data with server-side pagination
    const fetchReport = useCallback(async (page, size, dateFrom, dateTo, staffId) => {
        // Prevent duplicate concurrent calls
        if (isFetchingRef.current) {
            return;
        }
        isFetchingRef.current = true;
        setLoading(true);
        try {
            // API endpoint: /report/adminMasterReport?page={page}&size={size}&fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD
            let url = `/report/adminMasterReport?page=${page}&size=${size}`;
            if (dateFrom && dateTo) {
                url += `&fromDate=${dateFrom}&toDate=${dateTo}`;
            }
            if (staffId) {
                url += `&supportStaffId=${encodeURIComponent(staffId)}`;
            }

            const response = await apiClient.get(url);
            if (response.data && response.data.status) {
                setRawData(response.data.data || []);
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
            console.error('Error fetching ticket master report:', error);
        } finally {
            setLoading(false);
            isFetchingRef.current = false;
        }
    }, []);

    // Fetch staff on mount
    useEffect(() => {
        if (!hasFetchedStaffRef.current) {
            hasFetchedStaffRef.current = true;
            fetchStaff();
        }
    }, [fetchStaff]);

    // Initial load on mount - only run once
    useEffect(() => {
        if (!hasFetchedInitialReportRef.current) {
            hasFetchedInitialReportRef.current = true;
            fetchReport(0, pageSize, '', '', '');
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
        fetchReport(currentPage, pageSize, appliedFromDate, appliedToDate, appliedStaffId);
    }, [currentPage, pageSize, appliedFromDate, appliedToDate, appliedStaffId]); // Removed fetchReport from deps - it's stable

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (staffDropdownRef.current && !staffDropdownRef.current.contains(event.target)) {
                setShowStaffDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredData = useMemo(() => {
        const term = searchTerm.toLowerCase().trim();
        if (!term) return rawData;
        return rawData.filter(r => {
            const searchStr = [
                r.ticketId, r.username, r.brandName, r.deviceOrderId,
                r.priority, r.status, r.complaintType, r.assignTo,
                r.remark, r.shortDescription, r.contactNo, r.email,
                r.requestType, r.requestPanel, r.requestPerson
            ].join(' ').toLowerCase();
            return searchStr.includes(term);
        });
    }, [rawData, searchTerm]);

    // For display, use filtered data if search is active, otherwise use API total
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

        setExportLoading(true);
        try {
            // For export, fetch all matching data in one go
            let url = `/report/adminMasterReport?page=0&size=10000`;
            if (appliedFromDate && appliedToDate) {
                url += `&fromDate=${appliedFromDate}&toDate=${appliedToDate}`;
            }
            if (appliedStaffId) {
                url += `&supportStaffId=${encodeURIComponent(appliedStaffId)}`;
            }

            const response = await apiClient.get(url);
            let exportData = response.data?.data || [];

            // Apply the same search filter as the table to maintain sequence and match displayed data
            if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase().trim();
                exportData = exportData.filter(r => {
                    const searchStr = [
                        r.ticketId, r.username, r.userName, r.brandName, r.deviceOrderId,
                        r.priority, r.status, r.complaintType, r.assignTo,
                        r.remark, r.shortDescription, r.contactNo, r.email,
                        r.requestType, r.requestPanel, r.requestPerson
                    ].join(' ').toLowerCase();
                    return searchStr.includes(term);
                });
            }

            // Use the exact sequence as specified: SR NO. | TICKET ID | USER NAME | SERVER NAME | DEVICE NAME | PRIORITY | STATUS | ASSIGNED TO | COMPLAINT TYPE | ACTION PANEL | ACTION BY | REQUEST TYPE | REQUEST PANEL | REQUEST PERSON | CONTACT NO | EMAIL | REMARK | USER DESCRIPTION | ISSUE DATE | LAST UPDATE | RESOLVED DATE
            const header = [
                'SR NO.', 'TICKET ID', 'USER NAME', 'SERVER NAME', 'DEVICE NAME', 'PRIORITY',
                'STATUS', 'ASSIGNED TO', 'COMPLAINT TYPE', 'ACTION PANEL', 'ACTION BY', 'REQUEST TYPE', 'REQUEST PANEL', 'REQUEST PERSON', 'CONTACT NO', 'EMAIL',
                'REMARK', 'USER DESCRIPTION', 'ISSUE DATE', 'LAST UPDATE', 'RESOLVED DATE'
            ];

            const rows = exportData.map((r, idx) => [
                idx + 1,                                    // SR NO.
                r.ticketId || '-',                         // TICKET ID
                r.username || r.userName || '-',           // USER NAME
                r.brandName || '-',                        // SERVER NAME
                r.deviceOrderId || '-',                    // DEVICE NAME
                r.priority || '-',                         // PRIORITY
                r.status || '-',                           // STATUS
                r.assignTo || '-',                         // ASSIGNED TO
                r.complaintType || '-',                    // COMPLAINT TYPE
                r.actionPanel || '-',                      // ACTION PANEL
                r.actionBy || '-',                         // ACTION BY
                r.requestType || '-',                      // REQUEST TYPE
                r.requestPanel || '-',                     // REQUEST PANEL
                r.requestPerson || '-',                    // REQUEST PERSON
                r.contactNo || '-',                        // CONTACT NO
                r.email || '-',                            // EMAIL
                r.remark || '-',                           // REMARK
                r.shortDescription || '-',                 // USER DESCRIPTION
                r.createDate ? new Date(r.createDate).toLocaleString() : '-',  // ISSUE DATE
                r.updateDate ? new Date(r.updateDate).toLocaleString() : '-',   // LAST UPDATE
                r.resolveDate ? new Date(r.resolveDate).toLocaleString() : '-' // RESOLVED DATE
            ]);

            const worksheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Ticket Audit");
            const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
            const data = new Blob([excelBuffer], { type: 'application/octet-stream' });
            saveAs(data, `Ticket_Master_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
            
            Swal.fire({
                icon: 'success',
                title: 'Export Successful',
                text: `Successfully exported ${exportData.length} records.`,
                timer: 2000,
                showConfirmButton: false
            });
        } catch (error) {
            console.error('Export error:', error);
            Swal.fire({
                icon: 'error',
                title: 'Export Failed',
                text: 'Failed to export data. Please try again.',
                confirmButtonColor: '#8b5cf6'
            });
        } finally {
            setExportLoading(false);
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

        // Apply filters and reset to first page.
        setAppliedFromDate(fromDate);
        setAppliedToDate(toDate);
        setAppliedStaffId(selectedStaffId);
        setCurrentPage(0);
    };

    const clearFilters = () => {
        setFromDate('');
        setToDate('');
        setSelectedStaffId('');
        setStaffSearchText('');
        setSearchTerm('');
        setCurrentPage(0);
        // Clear applied filters so effect reloads unfiltered data
        setAppliedFromDate('');
        setAppliedToDate('');
        setAppliedStaffId('');
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
            <span className={`px-2 py-0.5 rounded-md border font-bold text-xs uppercase whitespace-nowrap ${colors[s] || 'bg-gray-50 text-gray-500'}`}>
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
            <span className={`px-2 py-0.5 rounded-md font-bold text-xs uppercase whitespace-nowrap ${colors[p] || 'bg-gray-100 text-gray-400'}`}>
                {priority || 'Medium'}
            </span>
        );
    };

    const ServerNamePill = ({ serverName }) => {
        if (!serverName) return <span className="text-gray-400 text-sm">-</span>;
        return (
            <span className="px-2 py-1 rounded-md text-xs font-semibold bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 border border-blue-200 whitespace-nowrap inline-block">
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

    // Handle View Ticket Details
    const handleViewTicketDetails = (ticket) => {
        setSelectedTicket(ticket);
    };

    return (
        <div className="space-y-3 animate-fade-in text-gray-800 pt-2 pb-4">
            {/* Header & Main Actions */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-2 bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-600 text-white rounded-lg shadow-xl shadow-blue-100">
                        <FileText size={18} />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-slate-800 tracking-tight">Ticket Master Report</h2>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Audit Trail & Performance History</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 w-full xl:w-auto">
                    <div className="flex items-center gap-1.5">
                        <label className="text-xs text-gray-600">Show</label>
                        <select
                            value={pageSize}
                            onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(0); }}
                            className="px-2 py-1 text-xs border border-gray-300 rounded-md bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                        </select>
                        <span className="text-xs text-gray-600">entries</span>
                    </div>
                    <div className="flex-1 min-w-[250px] relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                        <input
                            type="text"
                            placeholder="Audit ID, User, Server, Device, Contact..."
                            className="w-full px-2 py-1 pl-10 text-xs border border-gray-300 rounded-md bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(0); }}
                        />
                    </div>
                    <button
                        onClick={exportToExcel}
                        disabled={exportLoading}
                        className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center gap-1.5 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer text-xs"
                    >
                        {exportLoading ? (
                            <>
                                <Loader2 className="animate-spin" size={14} />
                                <span>Exporting...</span>
                            </>
                        ) : (
                            <>
                                <FileSpreadsheet size={14} />
                                Export Audit
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Advanced Filters */}
            <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex flex-col lg:flex-row gap-2 items-end">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 w-full">
                        <div className="form-control">
                            <label className="label py-0">
                                <span className="label-text font-black text-slate-400 uppercase text-[8px] tracking-widest px-1 flex items-center gap-1">
                                    <Calendar size={10} /> Start Date
                                </span>
                            </label>
                            <div className="relative">
                                <input
                                    ref={fromDateRef}
                                    type="date"
                                    className="w-full px-2 py-1 pr-8 h-8 border border-gray-300 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-xs"
                                    value={fromDate}
                                    onChange={(e) => setFromDate(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => fromDateRef.current?.showPicker?.() || fromDateRef.current?.click()}
                                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 transition-colors pointer-events-auto"
                                >
                                    <Calendar size={12} />
                                </button>
                            </div>
                        </div>
                        <div className="form-control">
                            <label className="label py-0">
                                <span className="label-text font-black text-slate-400 uppercase text-[8px] tracking-widest px-1 flex items-center gap-1">
                                    <Calendar size={10} /> End Date
                                </span>
                            </label>
                            <div className="relative">
                                <input
                                    ref={toDateRef}
                                    type="date"
                                    className="w-full px-2 py-1 pr-8 h-8 border border-gray-300 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-xs"
                                    value={toDate}
                                    onChange={(e) => setToDate(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => toDateRef.current?.showPicker?.() || toDateRef.current?.click()}
                                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 transition-colors pointer-events-auto"
                                >
                                    <Calendar size={12} />
                                </button>
                            </div>
                        </div>
                        <div className="form-control relative" ref={staffDropdownRef}>
                            <label className="label py-0">
                                <span className="label-text font-black text-slate-400 uppercase text-[8px] tracking-widest px-1 flex items-center gap-1">
                                    <Users size={10} /> Filter by Staff
                                </span>
                            </label>
                            <input
                                type="text"
                                placeholder="Search support staff..."
                                className="w-full px-2 py-1 h-8 border border-gray-300 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-xs"
                                value={staffSearchText}
                                onFocus={() => setShowStaffDropdown(true)}
                                onChange={(e) => {
                                    setStaffSearchText(e.target.value);
                                    if (selectedStaffId) setSelectedStaffId('');
                                }}
                            />
                            {showStaffDropdown && (
                                <div className="absolute top-[calc(100%+4px)] left-0 right-0 max-h-48 overflow-y-auto bg-white border border-gray-100 shadow-2xl rounded-xl z-[50] py-1 animate-fade-in">
                                    {staffLoading ? (
                                        <div className="p-2 text-center text-[9px] font-bold text-gray-400 uppercase tracking-widest">Waking Up Roster...</div>
                                    ) : supportStaff.length === 0 ? (
                                        <div className="p-2 text-center text-gray-400 italic text-xs">No staff records found.</div>
                                    ) : (
                                        supportStaff
                                            .filter(s => (s.staffName || '').toLowerCase().includes(staffSearchText.toLowerCase()))
                                            .map((s) => (
                                                <button
                                                    key={s.staffId}
                                                    onClick={() => {
                                                        setSelectedStaffId(s.staffId);
                                                        setStaffSearchText(s.staffName);
                                                        setShowStaffDropdown(false);
                                                    }}
                                                    className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-xs font-bold text-slate-600 transition-colors"
                                                >
                                                    {s.staffName}
                                                </button>
                                            ))
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-1.5 w-full lg:w-auto">
                        <button
                            onClick={handleApplyFilter}
                            className="px-4 py-1.5 h-8 rounded-md bg-purple-600 hover:bg-purple-700 text-white transition-colors flex-1 md:flex-none uppercase tracking-widest text-[10px] font-black cursor-pointer"
                        >
                            Compute Filter
                        </button>
                        <button
                            onClick={clearFilters}
                            className="px-4 py-1.5 h-8 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors flex-1 md:flex-none font-medium flex items-center gap-1.5 cursor-pointer text-xs"
                        >
                            <X size={12} />
                            Reset
                        </button>
                    </div>
                </div>
            </div>

            {/* Report Table */}
            <div className="flex-1 min-h-0 bg-white flex flex-col overflow-hidden">
                <div className="overflow-x-auto overflow-y-auto custom-scrollbar relative" style={{height: '430px' }}>
                    <table className="w-full border-collapse min-w-full">
                        <thead className="bg-gradient-to-r from-gray-50 to-gray-100 sticky top-0 z-10 shadow-md">
                            <tr>
                                <th className="whitespace-nowrap py-2 px-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">SR NO.</th>
                                <th className="whitespace-nowrap py-2 px-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">TICKET ID</th>
                                <th className="whitespace-nowrap py-2 px-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">USER NAME</th>
                                <th className="whitespace-nowrap py-2 px-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">SERVER NAME</th>
                                <th className="whitespace-nowrap py-2 px-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">DEVICE NAME</th>
                                <th className="whitespace-nowrap py-2 px-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">PRIORITY</th>
                                <th className="whitespace-nowrap py-2 px-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">STATUS</th>
                                <th className="whitespace-nowrap py-2 px-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">ASSIGNED TO</th>
                                <th className="whitespace-nowrap py-2 px-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">COMPLAINT TYPE</th>
                                <th className="whitespace-nowrap py-2 px-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">ACTION PANEL</th>
                                <th className="whitespace-nowrap py-2 px-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">ACTION BY</th>
                                <th className="whitespace-nowrap py-2 px-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">REQUEST TYPE</th>
                                <th className="whitespace-nowrap py-2 px-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">REQUEST PANEL</th>
                                <th className="whitespace-nowrap py-2 px-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">REQUEST PERSON</th>
                                <th className="whitespace-nowrap py-2 px-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">CONTACT NO</th>
                                <th className="whitespace-nowrap py-2 px-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">EMAIL</th>
                                <th className="whitespace-nowrap py-2 px-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">REMARK</th>
                                <th className="whitespace-nowrap py-2 px-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">USER DESCRIPTION</th>
                                <th className="whitespace-nowrap py-2 px-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">ISSUE DATE</th>
                                <th className="whitespace-nowrap py-2 px-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">LAST UPDATE</th>
                                <th className="whitespace-nowrap py-2 px-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">RESOLVED DATE</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm bg-white divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="21" className="text-center py-20">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="relative">
                                                <div className="absolute inset-0 bg-blue-200 rounded-full blur-xl opacity-50 animate-pulse"></div>
                                                <Loader2 className="relative animate-spin mx-auto text-blue-600" size={40} />
                                            </div>
                                            <div>
                                                <p className="text-gray-700 font-semibold text-base">Fetching tickets...</p>
                                                <p className="text-gray-400 text-sm mt-1">Please wait while we load your data</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ) : currentRecords.length === 0 ? (
                                <tr>
                                    <td colSpan="21" className="text-center py-20">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="p-4 bg-gray-100 rounded-full">
                                                <FileText className="text-gray-400" size={32} />
                                            </div>
                                            <p className="text-gray-500 font-semibold text-base">No tickets found matching your criteria.</p>
                                            <p className="text-gray-400 text-sm">Try adjusting your search or filters</p>
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

                                    return (
                                        <tr key={idx} className="group hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/50 transition-all duration-200 border-b border-gray-100">
                                            <td className="text-gray-700 whitespace-nowrap text-center py-2 px-3 font-medium text-sm">{(currentPage * pageSize) + idx + 1}</td>
                                            <td className="whitespace-nowrap py-2 px-3 text-center text-sm">
                                                <button
                                                    onClick={() => handleViewTicketDetails(r)}
                                                    className="font-bold text-gray-900 hover:text-blue-600 hover:underline cursor-pointer transition-colors duration-200 group-hover:scale-105 inline-block text-sm"
                                                >
                                                    {r.ticketId || '-'}
                                                </button>
                                            </td>
                                            <td className="text-gray-800 whitespace-nowrap py-2 px-3 text-center font-medium text-sm">{r.username || r.userName || '-'}</td>
                                            <td className="whitespace-nowrap py-2 px-3 text-center text-sm"><ServerNamePill serverName={r.brandName} /></td>
                                            <td className="text-gray-700 whitespace-nowrap py-4 px-4 text-center font-medium">{r.deviceOrderId || '-'}</td>
                                            <td className="whitespace-nowrap py-2 px-3 text-center text-sm"><PriorityPill priority={r.priority} /></td>
                                            <td className="whitespace-nowrap py-2 px-3 text-center text-sm"><StatusPill status={r.status} /></td>
                                            <td className="whitespace-nowrap py-2 px-3 text-center text-sm">
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
                                                            className="w-7 h-7 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold mx-auto hover:scale-110 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md"
                                                            title={formatAssignedNames(r.assignTo)}
                                                        >
                                                            {getAssignedCount(r.assignTo)}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400">-</span>
                                                )}
                                            </td>
                                            <td className="max-w-[150px] truncate font-semibold text-gray-800 whitespace-nowrap py-2 px-3 text-center mx-auto text-sm">{r.complaintType || '-'}</td>
                                            <td className="whitespace-nowrap py-2 px-3 text-center text-sm">
                                                <span className="px-2 py-0.5 rounded-md text-xs font-semibold whitespace-nowrap inline-block bg-orange-100 text-orange-700">
                                                    {r.actionPanel || '-'}
                                                </span>
                                            </td>
                                            <td className="whitespace-nowrap py-2 px-3 text-center text-sm">
                                                <span className="px-2 py-0.5 rounded-md text-xs font-semibold whitespace-nowrap inline-block bg-green-100 text-green-700">
                                                    {r.actionBy || '-'}
                                                </span>
                                            </td>
                                            <td className="whitespace-nowrap py-2 px-3 text-center text-sm">
                                                <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border border-blue-200 whitespace-nowrap inline-block uppercase">
                                                    {r.requestType || '-'}
                                                </span>
                                            </td>
                                            <td className="whitespace-nowrap py-2 px-3 text-center text-sm">
                                                <span className="px-2 py-0.5 rounded-md text-xs font-semibold whitespace-nowrap inline-block bg-orange-100 text-orange-700">
                                                    {r.requestPanel || '-'}
                                                </span>
                                            </td>
                                            <td className="whitespace-nowrap py-2 px-3 text-center text-sm">
                                                <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border border-green-200 whitespace-nowrap inline-block">
                                                    {r.requestPerson || '-'}
                                                </span>
                                            </td>
                                            <td className="text-gray-700 whitespace-nowrap py-2 px-3 text-center font-medium text-sm">{r.contactNo || '-'}</td>
                                            <td className="text-gray-700 whitespace-nowrap py-2 px-3 text-center font-medium text-sm">{r.email || '-'}</td>
                                            <td
                                                className="max-w-[150px] truncate whitespace-nowrap py-2 px-3 text-center cursor-pointer transition-all duration-200 mx-auto group/remark text-sm"
                                                onClick={() => {
                                                    if (r.remark && r.remark !== '-') {
                                                        setModalData({ 
                                                            open: true, 
                                                            title: 'Remark Details', 
                                                            content: r.remark || 'No remark available' 
                                                        });
                                                    }
                                                }}
                                                title={r.remark && r.remark !== '-' ? 'Click to view full text' : ''}
                                            >
                                                {r.remark && r.remark !== '-' ? (
                                                    <span className="text-blue-600 hover:text-blue-700 font-medium underline decoration-1 underline-offset-1 group-hover/remark:bg-blue-50 px-1.5 py-0.5 rounded transition-all duration-200 text-sm">
                                                        {r.remark.length > 20 ? r.remark.substring(0, 20) + '...' : r.remark}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 text-sm">-</span>
                                                )}
                                            </td>
                                            <td
                                                className="max-w-[200px] truncate whitespace-nowrap py-2 px-3 text-center cursor-pointer transition-all duration-200 mx-auto group/desc text-sm"
                                                onClick={() => {
                                                    if (r.shortDescription && r.shortDescription !== '-') {
                                                        setModalData({ 
                                                            open: true, 
                                                            title: 'User Description Details', 
                                                            content: r.shortDescription || 'No description available' 
                                                        });
                                                    }
                                                }}
                                                title={r.shortDescription && r.shortDescription !== '-' ? 'Click to view full text' : ''}
                                            >
                                                {r.shortDescription && r.shortDescription !== '-' ? (
                                                    <span className="text-blue-600 hover:text-blue-700 font-medium underline decoration-1 underline-offset-1 group-hover/desc:bg-blue-50 px-1.5 py-0.5 rounded transition-all duration-200 text-sm">
                                                        {r.shortDescription.length > 20 ? r.shortDescription.substring(0, 20) + '...' : r.shortDescription}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 text-sm">-</span>
                                                )}
                                            </td>
                                            <td className="text-gray-600 text-sm whitespace-nowrap py-2 px-3 text-center font-medium">{formatDate(r.createDate)}</td>
                                            <td className="text-gray-600 text-sm whitespace-nowrap py-2 px-3 text-center font-medium">{formatDate(r.updateDate)}</td>
                                            <td className="text-gray-600 text-sm whitespace-nowrap py-2 px-3 text-center font-medium">{formatDate(r.resolveDate)}</td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination - Modern Design */}
                <div className="px-2 md:px-3 py-1.5 border-t border-gray-200 bg-gradient-to-r from-gray-50/50 to-white flex flex-col md:flex-row justify-between items-center gap-2">
                    <div className="text-sm text-gray-600 font-medium">
                        Showing <span className="font-bold text-gray-900">{displayTotal > 0 ? (currentPage * pageSize) + 1 : 0}</span> to <span className="font-bold text-gray-900">{Math.min((currentPage + 1) * pageSize, displayTotal)}</span> of <span className="font-bold text-gray-900">{displayTotal}</span> entries
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            disabled={currentPage === 0 || loading}
                            onClick={() => setCurrentPage(p => p - 1)}
                            className="px-3 py-1.5 text-sm font-semibold rounded-lg border transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-white hover:bg-gray-50 border-gray-300 text-gray-700 hover:border-gray-400 disabled:hover:shadow-none disabled:hover:bg-white"
                        >
                            Previous
                        </button>
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg shadow-md">
                            <span className="text-sm font-bold">{currentPage + 1}</span>
                            <span className="text-xs opacity-80">of</span>
                            <span className="text-sm font-bold">{calculatedTotalPages || 1}</span>
                        </div>
                        <button
                            disabled={currentPage >= calculatedTotalPages - 1 || loading}
                            onClick={() => setCurrentPage(p => p + 1)}
                            className="px-3 py-1.5 text-sm font-semibold rounded-lg border transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-white hover:bg-gray-50 border-gray-300 text-gray-700 hover:border-gray-400 disabled:hover:shadow-none disabled:hover:bg-white"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>

            {/* Ticket Modal */}
            {selectedTicket && (
                <TicketModal
                    ticket={selectedTicket}
                    onClose={() => setSelectedTicket(null)}
                    onUpdate={() => {
                        fetchReport(currentPage, pageSize, appliedFromDate, appliedToDate, appliedStaffId);
                    }}
                />
            )}

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

// End of component

export default TicketMasterReport;
