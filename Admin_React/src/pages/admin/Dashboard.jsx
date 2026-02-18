import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    FileText,
    CircleDot,
    Clock,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Eye,
    Loader2,
    X,
    ArrowUp,
    ArrowDown,
    Circle,
    User,
    Check,
    Search,
    Plus,
    ChevronDown,
    Server,
    Mail,
    Phone,
    FileEdit,
    RefreshCw
} from 'lucide-react';
import apiClient, { API_BASE_URL } from '../../api/apiClient';
import Swal from 'sweetalert2';
import TicketModal from './TicketModal';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

const Dashboard = () => {
    // Stats State
    const [stats, setStats] = useState({
        total: 0,
        open: 0,
        inProgress: 0,
        resolved: 0,
        closed: 0,
        urgent: 0
    });

    // Table State
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [totalElements, setTotalElements] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [activeFilter, setActiveFilter] = useState({ type: 'all', value: '' });

    // Modal State
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [textModal, setTextModal] = useState({ open: false, title: '', content: '' });
    const [statusModal, setStatusModal] = useState({ open: false, ticketId: null, currentStatus: '', ticketStatus: '' });
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [priorityModal, setPriorityModal] = useState({ open: false, ticketId: null, currentPriority: '', ticketStatus: '' });
    const [updatingPriority, setUpdatingPriority] = useState(false);
    const [remarkModal, setRemarkModal] = useState({ open: false, ticketId: null, currentRemark: '', ticketStatus: '' });
    const [remarkText, setRemarkText] = useState('');
    const [updatingRemark, setUpdatingRemark] = useState(false);
    const [assignModal, setAssignModal] = useState({ open: false, ticketId: null, ticketIdStr: '', assignedStaff: [], ticketStatus: '' });
    const [supportStaffList, setSupportStaffList] = useState([]);
    const [selectedStaffIds, setSelectedStaffIds] = useState([]);
    const [loadingStaff, setLoadingStaff] = useState(false);
    const [assigning, setAssigning] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const [staffSearchTerm, setStaffSearchTerm] = useState('');

    // Add Complaint Modal State
    const [addComplaintModal, setAddComplaintModal] = useState(false);
    const [servers, setServers] = useState([]);
    const [users, setUsers] = useState([]);
    const [devices, setDevices] = useState([]);
    const [complaintTypes, setComplaintTypes] = useState([]);
    const [selectedServer, setSelectedServer] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedDevice, setSelectedDevice] = useState(null);
    const [selectedComplaintType, setSelectedComplaintType] = useState(null);
    const [serverSearch, setServerSearch] = useState('');
    const [userSearch, setUserSearch] = useState('');
    const [deviceSearch, setDeviceSearch] = useState('');
    const [complaintTypeSearch, setComplaintTypeSearch] = useState('');
    const [openDropdown, setOpenDropdown] = useState(null);
    const [loadingServers, setLoadingServers] = useState(false);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [loadingDevices, setLoadingDevices] = useState(false);
    const [loadingComplaintTypes, setLoadingComplaintTypes] = useState(false);
    const [submittingComplaint, setSubmittingComplaint] = useState(false);
    const [userError, setUserError] = useState(null);
    const [deviceError, setDeviceError] = useState(null);
    const [formData, setFormData] = useState({
        email: '',
        contactNo: '',
        shortDescription: ''
    });
    const [fieldErrors, setFieldErrors] = useState({
        server: false,
        user: false,
        device: false,
        complaintType: false,
        email: false,
        contactNo: false,
        shortDescription: false
    });

    // WebSocket and Refresh State
    const [showRefreshToast, setShowRefreshToast] = useState(false);
    const stompClientRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const autoRefreshIntervalRef = useRef(null);
    const isConnectingRef = useRef(false);

    // Ref to track if stats have been fetched (prevents double call in React Strict Mode)
    const statsFetchedRef = useRef(false);

    // Fetch Summary Stats - called only once on mount
    const fetchStats = useCallback(async (isSilent = false) => {
        // Prevent double call in React Strict Mode (only for initial load)
        if (!isSilent && statsFetchedRef.current) {
            return;
        }
        if (!isSilent) {
            statsFetchedRef.current = true;
        }

        try {
            const response = await apiClient.get('/admin/getAdminDashboardCounts');
            if (response.data.status) {
                const d = response.data.data;
                setStats({
                    total: d.totalTickets || d.totalComplaints || 0,
                    open: d.openTickets || d.openComplaints || 0,
                    inProgress: d.inProgress || d.inProgressComplaints || 0,
                    resolved: d.resolvedTickets || d.resolvedComplaints || 0,
                    closed: d.closed || d.closedComplaints || 0,
                    urgent: d.urgent || d.urgentComplaints || 0
                });
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
            if (!isSilent) {
                statsFetchedRef.current = false; // Reset on error so it can retry
            }
        }
    }, []);

    // Fetch Tickets
    const fetchTickets = useCallback(async (isSilent = false) => {
        if (!isSilent) {
            setLoading(true);
        }
        try {
            let endpoint = '/admin/getAdminDashboard';
            
            // Normalize search term (convert date format if applicable)
            const normalizedSearchTerm = normalizeSearchTerm(searchTerm);
            
            const params = {
                page: currentPage,
                size: Math.max(pageSize, 10), // Ensure minimum 10 records per page
                searchTerm: normalizedSearchTerm || undefined
            };

            if (activeFilter.type === 'status') {
                endpoint = '/admin/getAdminComplaintListByStatus';
                params.status = activeFilter.value;
            } else if (activeFilter.type === 'priority') {
                endpoint = '/admin/getAdminComplaintListByStatus';
                params.priority = activeFilter.value;
            }

            console.log('[Dashboard] Fetching tickets with params:', params); // Debug log
            const response = await apiClient.get(endpoint, { params });
            const result = response.data;

            if (result && result.data) {
                console.log('[Dashboard] Received tickets:', result.data.length, 'of', params.size, 'requested'); // Debug log
                setTickets(result.data);
                setTotalElements(result.totalElements || result.data.length);
                setTotalPages(result.totalPages || 1);
            } else {
                setTickets([]);
                setTotalElements(0);
                setTotalPages(0);
            }
        } catch (error) {
            console.error('Error fetching tickets:', error);
            if (!isSilent) {
                Swal.fire('Error', 'Failed to load tickets', 'error');
            }
        } finally {
            if (!isSilent) {
                setLoading(false);
            }
        }
    }, [currentPage, pageSize, searchTerm, activeFilter]);

    // Update Dashboard Summary Counts from WebSocket
    const updateDashboardSummaryCounts = useCallback((payload) => {
        if (!payload) return;
        const data = payload.data || payload;
        
        setStats(prevStats => {
            const newStats = {
                total: Number.isFinite(data.totalTickets) ? data.totalTickets : (prevStats.total || 0),
                open: Number.isFinite(data.openTickets) ? data.openTickets : (prevStats.open || 0),
                inProgress: Number.isFinite(data.inProgress) ? data.inProgress : (prevStats.inProgress || 0),
                resolved: Number.isFinite(data.resolvedTickets) ? data.resolvedTickets : (prevStats.resolved || 0),
                closed: Number.isFinite(data.closed) || Number.isFinite(data.closedTickets) 
                    ? (data.closed || data.closedTickets || 0) 
                    : (prevStats.closed || 0),
                urgent: Number.isFinite(data.urgent) ? data.urgent : (prevStats.urgent || 0)
            };
            console.log('[DashboardWS] Updated stats:', newStats);
            return newStats;
        });
    }, []);

    // WebSocket Connection Function
    const connectWebSocket = useCallback(() => {
        // Prevent multiple simultaneous connection attempts
        if (isConnectingRef.current) {
            console.log('[DashboardWS] Connection already in progress, skipping...');
            return;
        }

        // If already connected, don't reconnect
        if (stompClientRef.current && stompClientRef.current.connected) {
            console.log('[DashboardWS] Already connected, skipping reconnection');
            return;
        }

        // Disconnect existing connection if any (but not connected)
        if (stompClientRef.current) {
            try {
                stompClientRef.current.deactivate();
            } catch (e) {
                console.warn('[DashboardWS] Error disconnecting existing connection:', e);
            }
        }

        // Clear any pending reconnection attempts
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        isConnectingRef.current = true;

        // Build WebSocket URL dynamically from API_BASE_URL
        const baseUrl = API_BASE_URL.replace(/\/$/, ''); // Remove trailing slash
        const sockJsUrl = baseUrl + '/ws-connection';

        const token = localStorage.getItem('adminToken');
        if (!token) {
            console.warn('[DashboardWS] No adminToken found, skipping WebSocket connection');
            return;
        }

        // Create SockJS connection
        const socket = new SockJS(sockJsUrl);
        const client = new Client({
            webSocketFactory: () => socket,
            connectHeaders: {
                Authorization: `Bearer ${token}`
            },
            debug: () => {}, // Disable debug logs
            reconnectDelay: 5000, // Reconnect after 5 seconds (increased from 3)
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
            onConnect: (frame) => {
                console.log('[DashboardWS] Connected to', sockJsUrl, frame);
                isConnectingRef.current = false; // Reset connection flag
                
                // Clear any pending manual reconnection attempts when successfully connected
                if (reconnectTimeoutRef.current) {
                    clearTimeout(reconnectTimeoutRef.current);
                    reconnectTimeoutRef.current = null;
                }

                // Subscribe to dashboard counts
                client.subscribe('/topic/dashboardAdminCounts', (message) => {
                    try {
                        const payload = JSON.parse(message.body || '{}');
                        updateDashboardSummaryCounts(payload);
                    } catch (err) {
                        console.error('[DashboardWS] Failed to process message', err);
                    }
                });
            },
            onStompError: (frame) => {
                console.error('[DashboardWS] STOMP error:', frame);
                isConnectingRef.current = false; // Reset on error so it can retry
                // Reconnect will be handled by the library's reconnectDelay (5 seconds)
            },
            onWebSocketClose: () => {
                console.log('[DashboardWS] Socket closed. Library will auto-reconnect in 5 seconds...');
                isConnectingRef.current = false; // Reset so library can reconnect
                // Let the library handle reconnection automatically
            },
            onDisconnect: () => {
                console.log('[DashboardWS] Disconnected');
                isConnectingRef.current = false; // Reset connection flag
            }
        });

        client.activate();
        stompClientRef.current = client;
    }, [updateDashboardSummaryCounts]);

    // Show Refresh Toast
    const handleShowRefreshToast = useCallback(() => {
        setShowRefreshToast(true);
        setTimeout(() => {
            setShowRefreshToast(false);
        }, 1000);
    }, []);

    // Auto-refresh function (silent update) - calls all three APIs simultaneously
    const autoRefresh = useCallback(() => {
        // Call all three APIs simultaneously using Promise.all
        Promise.all([
            fetchStats(true),
            fetchTickets(true),
            // Trigger notification refresh via custom event
            new Promise((resolve) => {
                window.dispatchEvent(new CustomEvent('refreshNotifications'));
                resolve();
            })
        ]).then(() => {
            // Show refresh toast after all APIs complete
            handleShowRefreshToast();
        }).catch((error) => {
            console.error('Error during auto-refresh:', error);
            // Still show toast even if there's an error
            handleShowRefreshToast();
        });
    }, [fetchStats, fetchTickets, handleShowRefreshToast]);

    // Fetch stats only once on mount
    useEffect(() => {
        fetchStats();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Fetch tickets when filters/search/page changes
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchTickets();
        }, 300);
        return () => clearTimeout(timer);
    }, [fetchTickets]);

    // Load servers when modal opens
    useEffect(() => {
        if (addComplaintModal && servers.length === 0 && !loadingServers) {
            loadServers();
        }
    }, [addComplaintModal]); // eslint-disable-line react-hooks/exhaustive-deps

    // WebSocket Connection on mount
    useEffect(() => {
        connectWebSocket();

        // Cleanup on unmount
        return () => {
            if (stompClientRef.current && stompClientRef.current.connected) {
                try {
                    stompClientRef.current.deactivate();
                } catch (e) {
                    console.warn('[DashboardWS] Error disconnecting on unmount:', e);
                }
            }
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (autoRefreshIntervalRef.current) {
                clearInterval(autoRefreshIntervalRef.current);
            }
        };
    }, [connectWebSocket]);

    // Auto-refresh every 10 seconds
    useEffect(() => {
        autoRefreshIntervalRef.current = setInterval(() => {
            autoRefresh();
        }, 10000); // 10 seconds

        return () => {
            if (autoRefreshIntervalRef.current) {
                clearInterval(autoRefreshIntervalRef.current);
            }
        };
    }, [autoRefresh]);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (openDropdown) {
                const dropdown = event.target.closest('.relative');
                if (!dropdown || !dropdown.querySelector('input')) {
                    setOpenDropdown(null);
                }
            }
        };
        if (openDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [openDropdown]);

    // Handle Status Update - Open Modal
    const handleStatusUpdate = (ticketId, currentStatus) => {
        // Check if status is Closed or Resolved
        if (currentStatus && (currentStatus.toLowerCase() === 'closed' || currentStatus.toLowerCase() === 'resolved')) {
            setToast({ show: true, message: 'Cannot update status for Closed or Resolved tickets', type: 'error' });
            setTimeout(() => {
                setToast({ show: false, message: '', type: 'error' });
            }, 3000);
            return;
        }
        setStatusModal({ open: true, ticketId, currentStatus, ticketStatus: currentStatus });
    };

    // Handle Status Update - Submit
    const handleStatusSubmit = async (newStatus) => {
        if (!statusModal.ticketId || !newStatus) return;

        // Double check if status is Closed or Resolved
        if (statusModal.ticketStatus && (statusModal.ticketStatus.toLowerCase() === 'closed' || statusModal.ticketStatus.toLowerCase() === 'resolved')) {
            setToast({ show: true, message: 'Cannot update status for Closed or Resolved tickets', type: 'error' });
            setTimeout(() => {
                setToast({ show: false, message: '', type: 'error' });
            }, 3000);
            setStatusModal({ open: false, ticketId: null, currentStatus: '', ticketStatus: '' });
            return;
        }

        setUpdatingStatus(true);
        try {
            const res = await apiClient.put(`/admin/statusChangeComplaints/${statusModal.ticketId}?status=${newStatus}`);
            if (res.data.status) {
                setToast({ show: true, message: res.data.message || 'Status updated successfully!', type: 'success' });
                setStatusModal({ open: false, ticketId: null, currentStatus: '', ticketStatus: '' });
                fetchTickets();
                // Refresh stats after status update
                fetchStats();
                // Auto hide toast after 3 seconds
                setTimeout(() => {
                    setToast({ show: false, message: '', type: 'success' });
                }, 3000);
            }
        } catch (error) {
            setToast({ show: true, message: 'Failed to update status', type: 'error' });
            setTimeout(() => {
                setToast({ show: false, message: '', type: 'error' });
            }, 3000);
        } finally {
            setUpdatingStatus(false);
        }
    };

    // Handle View Ticket Details - Auto change status from Open to In Progress
    const handleViewTicketDetails = async (ticket) => {
        // Check if status is "Open" and automatically change to "In Progress"
        if (ticket.status && ticket.status.toLowerCase() === 'open') {
            try {
                const res = await apiClient.put(`/admin/statusChangeComplaints/${ticket.id}?status=In Progress`);
                if (res.data.status) {
                    // Update the ticket object with new status before opening modal
                    const updatedTicket = { ...ticket, status: 'In Progress' };
                    setSelectedTicket(updatedTicket);
                    // Refresh tickets list
                    fetchTickets();
                    fetchStats();
                } else {
                    // If status update fails, still open modal with original ticket
                    setSelectedTicket(ticket);
                }
            } catch (error) {
                console.error('Error updating status to In Progress:', error);
                // If error occurs, still open modal with original ticket
                setSelectedTicket(ticket);
            }
        } else {
            // If status is not "Open", just open the modal
            setSelectedTicket(ticket);
        }
    };

    // Handle Priority Update
    const handlePriorityUpdate = (ticketId, currentPriority, ticketStatus) => {
        // Check if status is Closed or Resolved
        if (ticketStatus && (ticketStatus.toLowerCase() === 'closed' || ticketStatus.toLowerCase() === 'resolved')) {
            setToast({ show: true, message: 'Cannot update priority for Closed or Resolved tickets', type: 'error' });
            setTimeout(() => {
                setToast({ show: false, message: '', type: 'error' });
            }, 3000);
            return;
        }
        setPriorityModal({ open: true, ticketId, currentPriority, ticketStatus });
    };

    // Handle Priority Update - Submit
    const handlePrioritySubmit = async (newPriority) => {
        if (!priorityModal.ticketId || !newPriority) return;

        // Double check if status is Closed or Resolved
        if (priorityModal.ticketStatus && (priorityModal.ticketStatus.toLowerCase() === 'closed' || priorityModal.ticketStatus.toLowerCase() === 'resolved')) {
            setToast({ show: true, message: 'Cannot update priority for Closed or Resolved tickets', type: 'error' });
            setTimeout(() => {
                setToast({ show: false, message: '', type: 'error' });
            }, 3000);
            setPriorityModal({ open: false, ticketId: null, currentPriority: '', ticketStatus: '' });
            return;
        }

        setUpdatingPriority(true);
        try {
            const res = await apiClient.put(`/admin/updatePriority/${priorityModal.ticketId}?priority=${newPriority}`);
            if (res.data.status) {
                setToast({ show: true, message: res.data.message || 'Priority updated successfully!', type: 'success' });
                setPriorityModal({ open: false, ticketId: null, currentPriority: '', ticketStatus: '' });
                fetchTickets();
                // Refresh stats after priority update
                fetchStats();
                // Auto hide toast after 3 seconds
                setTimeout(() => {
                    setToast({ show: false, message: '', type: 'success' });
                }, 3000);
            }
        } catch (error) {
            setToast({ show: true, message: 'Failed to update priority', type: 'error' });
            setTimeout(() => {
                setToast({ show: false, message: '', type: 'error' });
            }, 3000);
        } finally {
            setUpdatingPriority(false);
        }
    };

    // Handle Remark Update
    const handleRemarkUpdate = (ticketId, currentRemark, ticketStatus) => {
        // Check if status is Closed or Resolved
        if (ticketStatus && (ticketStatus.toLowerCase() === 'closed' || ticketStatus.toLowerCase() === 'resolved')) {
            setToast({ show: true, message: 'Cannot add remark for Closed or Resolved tickets', type: 'error' });
            setTimeout(() => {
                setToast({ show: false, message: '', type: 'error' });
            }, 3000);
            return;
        }
        setRemarkModal({ open: true, ticketId, currentRemark: currentRemark || '', ticketStatus });
        setRemarkText(currentRemark || '');
    };

    // Handle Remark Update - Submit
    const handleRemarkSubmit = async () => {
        if (!remarkModal.ticketId) return;

        // Double check if status is Closed or Resolved
        if (remarkModal.ticketStatus && (remarkModal.ticketStatus.toLowerCase() === 'closed' || remarkModal.ticketStatus.toLowerCase() === 'resolved')) {
            setToast({ show: true, message: 'Cannot add remark for Closed or Resolved tickets', type: 'error' });
            setTimeout(() => {
                setToast({ show: false, message: '', type: 'error' });
            }, 3000);
            setRemarkModal({ open: false, ticketId: null, currentRemark: '', ticketStatus: '' });
            setRemarkText('');
            return;
        }

        setUpdatingRemark(true);
        try {
            const encodedRemark = encodeURIComponent(remarkText);
            const res = await apiClient.put(`/admin/updateRemark/${remarkModal.ticketId}?remark=${encodedRemark}`);
            if (res.data.status) {
                setToast({ show: true, message: res.data.message || 'Remark added successfully!', type: 'success' });
                setRemarkModal({ open: false, ticketId: null, currentRemark: '', ticketStatus: '' });
                setRemarkText('');
                fetchTickets();
                // Auto hide toast after 3 seconds
                setTimeout(() => {
                    setToast({ show: false, message: '', type: 'success' });
                }, 3000);
            }
        } catch (error) {
            setToast({ show: true, message: 'Failed to update remark', type: 'error' });
            setTimeout(() => {
                setToast({ show: false, message: '', type: 'error' });
            }, 3000);
        } finally {
            setUpdatingRemark(false);
        }
    };

    // Fetch Support Staff List
    const fetchSupportStaff = useCallback(async () => {
        setLoadingStaff(true);
        try {
            const response = await apiClient.get('/admin/getAllSupportStaffNames');
            if (response.data && response.data.status && response.data.data) {
                setSupportStaffList(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching support staff:', error);
            setToast({ show: true, message: 'Failed to load support staff', type: 'error' });
            setTimeout(() => {
                setToast({ show: false, message: '', type: 'error' });
            }, 3000);
        } finally {
            setLoadingStaff(false);
        }
    }, []);

    // Handle Assign Ticket - Open Modal
    const handleAssignTicket = async (ticketId, ticketIdStr, assignedStaff, ticketStatus) => {
        // Fetch staff list first if not loaded
        let staffList = supportStaffList;
        if (staffList.length === 0) {
            setLoadingStaff(true);
            try {
                const response = await apiClient.get('/admin/getAllSupportStaffNames');
                if (response.data && response.data.status && response.data.data) {
                    staffList = response.data.data;
                    setSupportStaffList(staffList);
                }
            } catch (error) {
                console.error('Error fetching support staff:', error);
            } finally {
                setLoadingStaff(false);
            }
        }
        
        // Parse assigned staff names to IDs
        const assignedIds = [];
        if (assignedStaff && assignedStaff !== 'N/A' && assignedStaff !== 'Unassigned') {
            const staffNames = assignedStaff.split(',').map(s => s.trim());
            staffList.forEach(staff => {
                if (staffNames.includes(staff.staffName)) {
                    assignedIds.push(staff.staffId);
                }
            });
        }
        
        setAssignModal({ open: true, ticketId, ticketIdStr, assignedStaff: assignedIds, ticketStatus: ticketStatus || '' });
        setSelectedStaffIds(assignedIds);
    };

    // Handle Staff Selection Toggle
    const handleStaffToggle = (staffId) => {
        // Check if status is Closed or Resolved
        if (assignModal.ticketStatus && (assignModal.ticketStatus.toLowerCase() === 'closed' || assignModal.ticketStatus.toLowerCase() === 'resolved')) {
            return; // Don't allow selection changes
        }
        
        setSelectedStaffIds(prev => {
            if (prev.includes(staffId)) {
                return prev.filter(id => id !== staffId);
            } else {
                return [...prev, staffId];
            }
        });
    };

    // Handle Assign Submit
    const handleAssignSubmit = async () => {
        if (!assignModal.ticketId || selectedStaffIds.length === 0) {
            setToast({ show: true, message: 'Please select at least one support staff', type: 'error' });
            setTimeout(() => {
                setToast({ show: false, message: '', type: 'error' });
            }, 3000);
            return;
        }

        setAssigning(true);
        try {
            const payload = {
                supportStaffIds: selectedStaffIds,
                complaintIds: [assignModal.ticketId]
            };
            
            const res = await apiClient.post('/admin/ticketAssignToStaff', payload);
            if (res.data.status) {
                setToast({ show: true, message: res.data.message || 'Ticket assigned successfully!', type: 'success' });
                setAssignModal({ open: false, ticketId: null, ticketIdStr: '', assignedStaff: [], ticketStatus: '' });
                setSelectedStaffIds([]);
                fetchTickets();
                // Auto hide toast after 3 seconds
                setTimeout(() => {
                    setToast({ show: false, message: '', type: 'success' });
                }, 3000);
            }
        } catch (error) {
            setToast({ show: true, message: 'Failed to assign ticket', type: 'error' });
            setTimeout(() => {
                setToast({ show: false, message: '', type: 'error' });
            }, 3000);
        } finally {
            setAssigning(false);
        }
    };

    // Helper: Status Display Name
    const getStatusDisplayName = (status) => {
        if (!status) return 'N/A';
        const statusLower = status.toLowerCase();
        if (statusLower === 'resolved') return 'Self Resolved';
        if (statusLower === 'closed') return 'Auto Resolved';
        return status; // Keep original for 'open', 'in progress', etc.
    };

    // Helper: Status Class
    const getStatusClass = (status) => {
        switch (status?.toLowerCase()) {
            case 'open': return 'bg-blue-100 text-blue-700';
            case 'in progress': return 'bg-orange-100 text-orange-700';
            case 'resolved': return 'bg-green-100 text-green-700';
            case 'closed': return 'bg-gray-100 text-gray-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    // Helper: Priority Class
    const getPriorityClass = (priority) => {
        switch (priority?.toLowerCase()) {
            case 'urgent': return 'bg-red-100 text-red-700';
            case 'high': return 'bg-orange-100 text-orange-700';
            case 'normal': return 'bg-gray-100 text-gray-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    // Helper: Action Panel Class
    const getActionPanelClass = (panel) => {
        if (!panel || panel === 'N/A') return 'bg-gray-100 text-gray-700';
        return 'bg-orange-100 text-orange-700';
    };

    // Helper: Action By Class
    const getActionByClass = (actionBy) => {
        if (!actionBy || actionBy === 'N/A') return 'bg-gray-100 text-gray-700';
        return 'bg-green-100 text-green-700';
    };

    // Helper: Assign To Count Badge
    const getAssignToCount = (assignTo) => {
        if (!assignTo || assignTo === 'Unassigned') return 0;
        const count = assignTo.split(',').length;
        return count;
    };

    // Helper: Assign To Badge Color
    const getAssignToBadgeColor = (count) => {
        const colors = [
            'bg-yellow-500', // 1
            'bg-purple-500', // 2
            'bg-blue-500',  // 3
            'bg-green-500', // 4
            'bg-red-500'    // 5+
        ];
        return colors[Math.min(count - 1, 4)] || colors[0];
    };

    // Helper: Format Date
    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        const d = new Date(dateStr.replace(' ', 'T')); // Handle potential space in date string
        if (isNaN(d.getTime())) return 'N/A';

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = months[d.getMonth()];
        const day = d.getDate();
        const year = d.getFullYear();

        let hours = d.getHours();
        const minutes = d.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // 0 should be 12
        const hoursStr = hours.toString().padStart(2, '0');

        return `${month} ${day}, ${year}, ${hoursStr}:${minutes} ${ampm}`;
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

    // Helper: Get Server Base URL (explicit mapping for videocon, torrentgas, server_1, server_2, server_3)
    const getServerBaseUrl = (brandName) => {
        const name = (brandName || '').toString().toLowerCase().trim();

        // Videocon server
        if (name === 'videocon' || name.includes('videocon')) {
            return 'http://vc.saharshsolutions.co.in/complaintmaster.jsp';
        }

        // TorrentGas server
        if (name.includes('torrent')) {
            return 'https://torrentgas.saharshsolutions.co.in/complaintmaster.jsp';
        }

        // server_1 → main GPS server
        if (name === 'server_1') {
            return 'https://gps.saharshsolutions.co.in/complaintmaster.jsp';
        }

        // server_2 / GPS2
        if (name === 'server_2' || name.includes('2')) {
            return 'https://gps2.saharshsolutions.co.in/complaintmaster.jsp';
        }

        // server_3 / GPS3
        if (name === 'server_3' || name.includes('3')) {
            return 'https://gps3.saharshsolutions.co.in/complaintmaster.jsp';
        }

        // Unknown server name → let caller handle as configuration error
        return null;
    };

    // Open Add Complaint Modal
    const openAddComplaintModal = () => {
        setAddComplaintModal(true);
        resetAddComplaintForm();
        // Load servers if not already loaded
        if (servers.length === 0) {
            loadServers();
        }
    };

    // Close Add Complaint Modal
    const closeAddComplaintModal = () => {
        setAddComplaintModal(false);
        resetAddComplaintForm();
    };

    // Reset Add Complaint Form (don't clear servers - they should persist)
    const resetAddComplaintForm = () => {
        setSelectedServer(null);
        setSelectedUser(null);
        setSelectedDevice(null);
        setSelectedComplaintType(null);
        setServerSearch('');
        setUserSearch('');
        setDeviceSearch('');
        setComplaintTypeSearch('');
        setOpenDropdown(null);
        setFormData({ email: '', contactNo: '', shortDescription: '' });
        setUsers([]);
        setDevices([]);
        setComplaintTypes([]);
        setUserError(null);
        setDeviceError(null);
        setFieldErrors({
            server: false,
            user: false,
            device: false,
            complaintType: false,
            email: false,
            contactNo: false,
            shortDescription: false
        });
        // Note: servers are NOT cleared so they persist between modal opens
    };

    // Load Servers
    const loadServers = async () => {
        if (loadingServers) return; // Prevent multiple simultaneous calls
        setLoadingServers(true);
        try {
            const response = await apiClient.get('/admin/getAllBrandWithId');
            console.log('Servers API Response:', response); // Debug log
            console.log('Response data:', response.data); // Debug log
            
            if (response && response.data) {
                if (response.data.status && Array.isArray(response.data.data)) {
                    const serverList = response.data.data;
                    console.log('Setting servers:', serverList); // Debug log
                    setServers(serverList);
                    if (serverList.length === 0) {
                        console.warn('Server list is empty');
                    }
                } else {
                    console.error('Invalid response structure - status or data missing:', response.data);
                    setToast({ show: true, message: response.data.message || 'Invalid response from server', type: 'error' });
                    setTimeout(() => setToast({ show: false, message: '', type: 'error' }), 3000);
                }
            } else {
                console.error('No response data received');
                setToast({ show: true, message: 'No response from server', type: 'error' });
                setTimeout(() => setToast({ show: false, message: '', type: 'error' }), 3000);
            }
        } catch (error) {
            console.error('Error loading servers:', error);
            console.error('Error details:', error.response?.data || error.message);
            setToast({ show: true, message: error.response?.data?.message || 'Failed to load servers', type: 'error' });
            setTimeout(() => setToast({ show: false, message: '', type: 'error' }), 3000);
        } finally {
            setLoadingServers(false);
        }
    };

    // Handle Server Selection - Validate server before loading users/devices
    const handleServerSelect = (server) => {
        const brandName = (server.brandName || '').toLowerCase().trim();
        
        // Check if server is valid (videocon, torrentgas, server_1, server_2, server_3)
        const isValidServer =
            brandName === 'videocon' ||
            brandName.includes('torrent') ||
            brandName === 'server_1' ||
            brandName === 'server_2' ||
            brandName === 'server_3';
        
        if (!isValidServer) {
            // Show error message for invalid server
            setToast({
                show: true,
                message: `"${server.brandName}" is not a valid server. Only videocon, torrentgas, server_1, server_2, and server_3 are supported.`, 
                type: 'error'
            });
            setTimeout(() => setToast({ show: false, message: '', type: 'error' }), 3000);
            setOpenDropdown(null);
            // Clear selection
            setSelectedServer(null);
            setServerSearch('');
            setSelectedUser(null);
            setSelectedDevice(null);
            setUserSearch('');
            setDeviceSearch('');
            setUsers([]);
            setDevices([]);
            return;
        }
        
        // Valid server - proceed with loading
        setSelectedServer(server);
        setServerSearch(server.brandName);
        setOpenDropdown(null);
        setSelectedUser(null);
        setSelectedDevice(null);
        setUserSearch('');
        setDeviceSearch('');
        setUsers([]);
        setDevices([]);
        setFieldErrors(prev => ({ ...prev, server: false }));
        loadUsers(server);
        loadComplaintTypes();
    };

    // Load Users - Only for valid servers (videocon, torrentgas, server_1, server_2, server_3)
    const loadUsers = async (server) => {
        if (!server) return;
        
        // Validate server before loading
        const brandName = (server.brandName || '').toLowerCase().trim();
        const isValidServer =
            brandName === 'videocon' ||
            brandName.includes('torrent') ||
            brandName === 'server_1' ||
            brandName === 'server_2' ||
            brandName === 'server_3';
        
        if (!isValidServer) {
            setUsers([]);
            setUserError(`"${server.brandName}" is not supported. Only videocon, torrentgas, server_1, server_2, and server_3 are available.`);
            return;
        }
        
        setLoadingUsers(true);
        setUsers([]); // Clear previous users
        setUserError(null); // Clear previous error
        try {
            const baseApiUrl = getServerBaseUrl(server.brandName);
            if (!baseApiUrl) {
                setUserError('Invalid server configuration');
                setLoadingUsers(false);
                return;
            }
            const response = await fetch(`${baseApiUrl}?opr=getAllUser`);
            const data = await response.json();
            
            // Check for error messages in response
            if (data && (data.error || data.message)) {
                setUsers([]);
                setUserError(data.error || data.message || 'No users found');
                setLoadingUsers(false);
                return;
            }
            
            const userList = Array.isArray(data) ? data : (data.data && Array.isArray(data.data) ? data.data : []);
            if (userList.length === 0) {
                setUserError('No users found for this server');
            } else {
                setUserError(null);
            }
            setUsers(userList);
        } catch (error) {
            console.error('Error loading users:', error);
            setUsers([]);
            setUserError('Failed to load users. Please try again.');
        } finally {
            setLoadingUsers(false);
        }
    };

    // Handle User Selection
    const handleUserSelect = (user) => {
        setSelectedUser(user);
        setUserSearch(user.username);
        setOpenDropdown(null);
        setSelectedDevice(null);
        setDeviceSearch('');
        setDevices([]);
        setFieldErrors(prev => ({ ...prev, user: false }));
        loadDevices(user);
    };

    // Load Devices - Only for valid servers (videocon, torrentgas, server_1, server_2, server_3)
    const loadDevices = async (user) => {
        if (!selectedServer || !user) return;
        
        // Validate server before loading
        const brandName = (selectedServer.brandName || '').toLowerCase().trim();
        const isValidServer =
            brandName === 'videocon' ||
            brandName.includes('torrent') ||
            brandName === 'server_1' ||
            brandName === 'server_2' ||
            brandName === 'server_3';
        
        if (!isValidServer) {
            setDevices([]);
            setDeviceError(`"${selectedServer.brandName}" is not supported. Only videocon, torrentgas, server_1, server_2, and server_3 are available.`);
            return;
        }
        
        setLoadingDevices(true);
        setDevices([]); // Clear previous devices
        setDeviceError(null); // Clear previous error
        try {
            const baseApiUrl = getServerBaseUrl(selectedServer.brandName);
            const userId = user.userid || user.id;
            if (!baseApiUrl || !userId) {
                setDeviceError('Invalid server configuration or user ID');
                setLoadingDevices(false);
                return;
            }
            const response = await fetch(`${baseApiUrl}?opr=getDeviceListByUserid&userid=${userId}`);
            const data = await response.json();
            
            // Check for error messages in response (like "Device Not Found")
            if (Array.isArray(data) && data.length > 0 && data[0].error) {
                setDevices([]);
                setDeviceError(data[0].error || 'No devices found');
                setLoadingDevices(false);
                return;
            }
            
            // Check if response has error message
            if (data && (data.error || data.message)) {
                setDevices([]);
                setDeviceError(data.error || data.message || 'No devices found');
                setLoadingDevices(false);
                return;
            }
            
            const deviceList = Array.isArray(data) ? data : (data.data && Array.isArray(data.data) ? data.data : []);
            if (deviceList.length === 0) {
                setDeviceError('No devices found for this user');
            } else {
                setDeviceError(null);
            }
            setDevices(deviceList);
        } catch (error) {
            console.error('Error loading devices:', error);
            setDevices([]);
            setDeviceError('Failed to load devices. Please try again.');
        } finally {
            setLoadingDevices(false);
        }
    };

    // Handle Device Selection
    const handleDeviceSelect = (device) => {
        setSelectedDevice(device);
        setDeviceSearch(device.vehicleName || device.deviceName || 'Unknown Device');
        setOpenDropdown(null);
        setFieldErrors(prev => ({ ...prev, device: false }));
    };

    // Load Complaint Types
    const loadComplaintTypes = async () => {
        setLoadingComplaintTypes(true);
        try {
            const typeUrl = 'https://gps.saharshsolutions.co.in/complaintmaster.jsp?opr=getComplaintType';
            const response = await fetch(typeUrl);
            const data = await response.json();
            const typeList = Array.isArray(data) ? data : (data.data && Array.isArray(data.data) ? data.data : []);
            setComplaintTypes(typeList);
        } catch (error) {
            console.error('Error loading complaint types:', error);
            setToast({ show: true, message: 'Failed to load complaint types', type: 'error' });
            setTimeout(() => setToast({ show: false, message: '', type: 'error' }), 3000);
        } finally {
            setLoadingComplaintTypes(false);
        }
    };

    // Handle Complaint Type Selection
    const handleComplaintTypeSelect = (type) => {
        const typeName = typeof type === 'string' ? type : (type.complaintType || type.name);
        setSelectedComplaintType(type);
        setComplaintTypeSearch(typeName);
        setOpenDropdown(null);
        setFieldErrors(prev => ({ ...prev, complaintType: false }));
    };

    // Submit New Complaint
    const handleSubmitComplaint = async () => {
        // Reset all field errors
        setFieldErrors({
            server: false,
            user: false,
            device: false,
            complaintType: false,
            email: false,
            contactNo: false,
            shortDescription: false
        });

        // Validation
        let hasError = false;
        const errors = {
            server: false,
            user: false,
            device: false,
            complaintType: false,
            email: false,
            contactNo: false,
            shortDescription: false
        };

        if (!selectedServer) {
            errors.server = true;
            hasError = true;
            setToast({ show: true, message: 'Please select a server', type: 'error' });
            setTimeout(() => setToast({ show: false, message: '', type: 'error' }), 3000);
        }
        if (!selectedUser) {
            errors.user = true;
            hasError = true;
            setToast({ show: true, message: 'Please select a user', type: 'error' });
            setTimeout(() => setToast({ show: false, message: '', type: 'error' }), 3000);
        }
        if (!selectedDevice) {
            errors.device = true;
            hasError = true;
            setToast({ show: true, message: 'Please select a device', type: 'error' });
            setTimeout(() => setToast({ show: false, message: '', type: 'error' }), 3000);
        }
        if (!selectedComplaintType) {
            errors.complaintType = true;
            hasError = true;
            setToast({ show: true, message: 'Please select a complaint type', type: 'error' });
            setTimeout(() => setToast({ show: false, message: '', type: 'error' }), 3000);
        }

        const { email, contactNo, shortDescription } = formData;
        if (!email) {
            errors.email = true;
            hasError = true;
        }
        if (!contactNo) {
            errors.contactNo = true;
            hasError = true;
        }
        if (!shortDescription) {
            errors.shortDescription = true;
            hasError = true;
        }
        if (!email || !contactNo || !shortDescription) {
            setToast({ show: true, message: 'Please fill all required fields', type: 'error' });
            setTimeout(() => setToast({ show: false, message: '', type: 'error' }), 3000);
            setFieldErrors(errors);
            return;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            errors.email = true;
            hasError = true;
            setToast({ show: true, message: 'Please enter a valid email address', type: 'error' });
            setTimeout(() => setToast({ show: false, message: '', type: 'error' }), 3000);
            setFieldErrors(errors);
            return;
        }

        // Contact validation
        if (contactNo.length !== 10) {
            errors.contactNo = true;
            hasError = true;
            setToast({ show: true, message: 'Contact number must be 10 digits', type: 'error' });
            setTimeout(() => setToast({ show: false, message: '', type: 'error' }), 3000);
            setFieldErrors(errors);
            return;
        }

        // Check for invalid patterns (all same digits like 0000000000, 9999999999, etc.)
        const allSameDigit = /^(\d)\1{9}$/.test(contactNo);
        if (allSameDigit) {
            errors.contactNo = true;
            hasError = true;
            setToast({ show: true, message: 'Please enter a valid contact number. Numbers with all same digits are not accepted.', type: 'error' });
            setTimeout(() => setToast({ show: false, message: '', type: 'error' }), 3000);
            setFieldErrors(errors);
            return;
        }

        if (hasError) {
            setFieldErrors(errors);
            return;
        }

        setSubmittingComplaint(true);
        try {
            const payload = {
                username: selectedUser.username,
                managerId: selectedUser.userid || selectedUser.id,
                serverName: selectedServer.brandName,
                description: shortDescription,
                contactNumber: contactNo,
                email: email,
                requestType: 'WEB',
                requestPanel: 'ADMIN',
                deviceName: selectedDevice.vehicleName || selectedDevice.deviceName || selectedDevice.device_name,
                complaintType: typeof selectedComplaintType === 'string' ? selectedComplaintType : (selectedComplaintType.complaintType || selectedComplaintType.name)
            };

            const response = await apiClient.post('/complaints/addComplaint', payload);
            if (response.data && response.data.status) {
                setToast({ show: true, message: response.data.message || 'Complaint added successfully!', type: 'success' });
                closeAddComplaintModal();
                fetchTickets();
                fetchStats();
                setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
            } else {
                setToast({ show: true, message: response.data.message || 'Failed to add complaint', type: 'error' });
                setTimeout(() => setToast({ show: false, message: '', type: 'error' }), 3000);
            }
        } catch (error) {
            console.error('Error submitting complaint:', error);
            setToast({ show: true, message: 'An error occurred while adding the complaint', type: 'error' });
            setTimeout(() => setToast({ show: false, message: '', type: 'error' }), 3000);
        } finally {
            setSubmittingComplaint(false);
        }
    };

    // Filter options based on search
    const getFilteredServers = () => {
        if (!serverSearch.trim()) return servers;
        const searchLower = serverSearch.toLowerCase().trim();
        return servers.filter(s => {
            if (!s.brandName) return false;
            const brandLower = s.brandName.toLowerCase();
            // Match direct search
            return brandLower.includes(searchLower);
        });
    };

    const getFilteredUsers = () => {
        if (!userSearch) return users;
        return users.filter(u => u.username.toLowerCase().includes(userSearch.toLowerCase()));
    };

    const getFilteredDevices = () => {
        if (!deviceSearch) return devices;
        return devices.filter(d => {
            const name = (d.vehicleName || d.deviceName || '').toLowerCase();
            return name.includes(deviceSearch.toLowerCase());
        });
    };

    const getFilteredComplaintTypes = () => {
        if (!complaintTypeSearch) return complaintTypes;
        return complaintTypes.filter(t => {
            const name = typeof t === 'string' ? t : (t.complaintType || t.name || '');
            return name.toLowerCase().includes(complaintTypeSearch.toLowerCase());
        });
    };

    return (
        // Root content uses full width of AdminLayout main (which already has px-4)
        <div className="h-full overflow-y-auto overflow-x-hidden custom-scrollbar">
            <div className="flex flex-col gap-1 mt-4 pb-6">
            {/* Summary Cards - Colored Status Blocks */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2 md:gap-2">
                {[
                    { label: 'Total Tickets', value: stats.total, icon: <FileText size={18} />, color: 'from-emerald-400 via-emerald-500 to-emerald-600', bg: 'bg-emerald-500', iconBg: 'bg-white/15', iconColor: 'text-white', type: 'all' },
                    { label: 'Open', value: stats.open, icon: <CircleDot size={18} />, color: 'from-blue-400 via-blue-500 to-blue-600', bg: 'bg-blue-500', iconBg: 'bg-white/15', iconColor: 'text-white', type: 'status', key: 'Open' },
                    { label: 'In Progress', value: stats.inProgress, icon: <Clock size={18} />, color: 'from-amber-400 via-amber-500 to-amber-600', bg: 'bg-amber-500', iconBg: 'bg-white/15', iconColor: 'text-white', type: 'status', key: 'In Progress' },
                    { label: 'Self Resolved', value: stats.resolved, icon: <CheckCircle2 size={18} />, color: 'from-orange-400 via-orange-500 to-orange-600', bg: 'bg-orange-500', iconBg: 'bg-white/15', iconColor: 'text-white', type: 'status', key: 'Resolved' },
                    { label: 'Auto Resolved', value: stats.closed, icon: <XCircle size={18} />, color: 'from-slate-500 via-slate-600 to-slate-700', bg: 'bg-slate-600', iconBg: 'bg-white/15', iconColor: 'text-white', type: 'status', key: 'Closed' },
                    { label: 'Urgent', value: stats.urgent, icon: <AlertTriangle size={18} />, color: 'from-red-500 via-rose-500 to-red-600', bg: 'bg-red-500', iconBg: 'bg-white/15', iconColor: 'text-white', type: 'priority', key: 'Urgent' },
                ].map((card, idx) => {
                    const isActive = activeFilter.type === card.type && activeFilter.value === card.key;
                    return (
                        <div
                            key={idx}
                            onClick={() => {
                                // If clicking the same active filter, reset to 'all'
                                if (isActive) {
                                    setActiveFilter({ type: 'all', value: '' });
                                } else {
                                    setActiveFilter({ type: card.type, value: card.key || '' });
                                }
                                // Reset to first page when filter changes
                                setCurrentPage(0);
                            }}
                            className={`group relative overflow-hidden rounded-lg p-2.5 shadow-md cursor-pointer transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl ${card.bg} ${
                                isActive ? 'ring-2 ring-white/60' : ''
                            }`}
                        >
                            {/* Background Gradient Animation */}
                            <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-0 group-hover:opacity-80 transition-opacity duration-500 mix-blend-soft-light`}></div>
                            
                            {/* Content */}
                            <div className="relative flex flex-col gap-1.5 text-white">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className={`p-1.5 ${card.iconBg} rounded-md group-hover:scale-110 transition-transform duration-300`}>
                                            <div className={card.iconColor}>
                                                {card.icon}
                                            </div>
                                        </div>
                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/90">
                                            {card.label}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-lg sm:text-xl font-bold text-white group-hover:scale-110 transition-transform duration-300">
                                            {card.value}
                                        </h3>
                                        {isActive && (
                                            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            {/* Hover Effect Border */}
                            <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${card.color} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300`}></div>
                        </div>
                    );
                })}
            </div>

            {/* Main Table Card - Modern Design */}
            <div className="bg-white flex flex-col">
                {/* Header Section - Enhanced */}
                <div className="px-4 md:px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 via-white to-gray-50 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-xl">
                                <FileText className="text-blue-600" size={20} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Recent Complaints</h2>
                                <p className="text-xs text-gray-500 font-medium">Manage and track all tickets</p>
                            </div>
                        </div>
                        {activeFilter.type !== 'all' && (
                            <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold border border-blue-200">
                                <span>{getStatusDisplayName(activeFilter.value)}</span>
                                <button 
                                    onClick={() => { setActiveFilter({ type: 'all', value: '' }); setCurrentPage(0); }} 
                                    className="w-5 h-5 flex items-center justify-center bg-gray-200 text-gray-600 hover:bg-gray-300 hover:text-gray-800 transition-all duration-200 rounded-full shadow-sm"
                                >
                                    <X size={14} strokeWidth={2.5} className="transition-transform duration-300 hover:rotate-90" />
                                </button>
                            </span>
                        )}
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <button
                            onClick={() => setAddComplaintModal(true)}
                            className="bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 hover:from-blue-700 hover:via-blue-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-95 group"
                        >
                            <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                            <span>Add Complaint</span>
                        </button>
                        <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-200">
                            <label className="text-xs font-semibold text-gray-600 whitespace-nowrap">Show</label>
                            <select
                                value={pageSize}
                                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(0); }}
                                className="px-2 py-1 text-sm border-0 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium cursor-pointer"
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                            <span className="text-xs font-semibold text-gray-600 whitespace-nowrap">entries</span>
                        </div>
                        <div className="relative flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-200">
                            <Search size={16} className="text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search tickets..."
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(0); }}
                                className="px-2 py-1 pr-8 text-sm border-0 rounded-lg bg-transparent text-gray-700 w-full min-w-[150px] md:w-64 focus:outline-none focus:ring-0 placeholder:text-gray-400 font-medium"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => { setSearchTerm(''); setCurrentPage(0); }}
                                    className="absolute right-3 w-6 h-6 flex items-center justify-center bg-gray-200 text-gray-700 hover:bg-gray-300 hover:text-gray-800 transition-all duration-200 rounded-full shadow-md"
                                    title="Clear search"
                                >
                                    <X size={14} strokeWidth={2.5} className="transition-transform duration-300 hover:rotate-90" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto custom-scrollbar relative">
                    <table className="w-full border-collapse min-w-full">
                            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 z-10 shadow-md">
                                <tr>
                                    <th className="whitespace-nowrap py-4 px-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">SR NO.</th>
                                    <th className="whitespace-nowrap py-4 px-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">TICKET ID</th>
                                    <th className="whitespace-nowrap py-4 px-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">CREATED</th>
                                    <th className="whitespace-nowrap py-4 px-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">UPDATED</th>
                                    <th className="whitespace-nowrap py-4 px-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">USERNAME</th>
                                    <th className="whitespace-nowrap py-4 px-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">SERVER NAME</th>
                                    <th className="whitespace-nowrap py-4 px-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">DEVICE NAME</th>
                                    <th className="whitespace-nowrap py-4 px-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">STATUS</th>
                                    <th className="whitespace-nowrap py-4 px-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">ASSIGN TO</th>
                                    <th className="whitespace-nowrap py-4 px-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">CONTACT NO.</th>
                                    <th className="whitespace-nowrap py-4 px-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">PRIORITY</th>
                                    <th className="whitespace-nowrap py-4 px-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">ACTION PANEL</th>
                                    <th className="whitespace-nowrap py-4 px-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">ACTION BY</th>
                                    <th className="whitespace-nowrap py-4 px-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">REQUEST TYPE</th>
                                    <th className="whitespace-nowrap py-4 px-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">REQUEST PANEL</th>
                                    <th className="whitespace-nowrap py-4 px-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">REQUEST PERSON</th>
                                    <th className="whitespace-nowrap py-4 px-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">COMPLAINT TYPE</th>
                                    <th className="whitespace-nowrap py-4 px-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">REMARK</th>
                                    <th className="whitespace-nowrap py-4 px-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">USER DESCRIPTION</th>
                                    <th className="whitespace-nowrap py-4 px-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">RESOLVED</th>
                                    <th className="whitespace-nowrap py-4 px-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">ACTIONS</th>
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
                            ) : tickets.length === 0 ? (
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
                                tickets.map((t, index) => {
                                    const assignCount = getAssignToCount(t.assignTo);
                                    return (
                                        <tr key={t.id} className="group hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/50 transition-all duration-200 border-b border-gray-100">
                                            <td className="text-gray-700 whitespace-nowrap text-center py-3 px-4 font-medium">{(currentPage * pageSize) + index + 1}</td>
                                            <td className="whitespace-nowrap py-3 px-4 text-center">
                                                <button
                                                    onClick={() => handleViewTicketDetails(t)}
                                                    className="font-bold text-gray-900 hover:text-blue-600 hover:underline cursor-pointer transition-colors duration-200 group-hover:scale-105 inline-block"
                                                >
                                                    {t.ticketId || 'N/A'}
                                                </button>
                                            </td>
                                            <td className="text-gray-600 text-sm whitespace-nowrap py-3 px-4 text-center font-medium">{formatDate(t.createDate)}</td>
                                            <td className="text-gray-600 text-sm whitespace-nowrap py-3 px-4 text-center font-medium">{formatDate(t.updateDate)}</td>
                                            <td className="text-gray-800 whitespace-nowrap py-3 px-4 text-center font-medium">{t.username || 'N/A'}</td>
                                            <td className="whitespace-nowrap py-3 px-4 text-center">
                                                <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 border border-blue-200 whitespace-nowrap inline-block shadow-sm">
                                                    {t.brandName || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="text-gray-700 whitespace-nowrap py-3 px-4 text-center font-medium">{t.deviceOrderId || 'N/A'}</td>
                                            <td className="whitespace-nowrap py-3 px-4 text-center">
                                                <span
                                                    onClick={() => handleStatusUpdate(t.id, t.status)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 whitespace-nowrap inline-block shadow-sm ${getStatusClass(t.status)} ${(t.status && (t.status.toLowerCase() === 'closed' || t.status.toLowerCase() === 'resolved')) ? 'opacity-60 cursor-not-allowed hover:scale-100' : 'cursor-pointer hover:scale-105'}`}
                                                    title={(t.status && (t.status.toLowerCase() === 'closed' || t.status.toLowerCase() === 'resolved')) ? 'Cannot update status for Closed or Resolved tickets' : 'Click to update status'}
                                                >
                                                    {getStatusDisplayName(t.status)}
                                                </span>
                                            </td>
                                            <td className="whitespace-nowrap py-3 px-4 text-center">
                                                {assignCount > 0 ? (
                                                    <button
                                                        onClick={() => handleAssignTicket(t.id, t.ticketId, t.assignTo, t.status)}
                                                        className={`w-9 h-9 rounded-full ${getAssignToBadgeColor(assignCount)} text-white flex items-center justify-center text-xs font-bold mx-auto hover:scale-110 transition-all duration-200 cursor-pointer shadow-md hover:shadow-lg`}
                                                        title="Click to assign/update"
                                                    >
                                                        {assignCount}
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleAssignTicket(t.id, t.ticketId, t.assignTo, t.status)}
                                                        className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 w-9 h-9 rounded-full transition-all duration-200 cursor-pointer font-bold text-lg"
                                                        title="Click to assign"
                                                    >
                                                        +
                                                    </button>
                                                )}
                                            </td>
                                            <td className="text-gray-700 whitespace-nowrap py-3 px-4 text-center font-medium">{t.contactNo || 'N/A'}</td>
                                            <td className="whitespace-nowrap py-3 px-4 text-center">
                                                <span
                                                    onClick={() => handlePriorityUpdate(t.id, t.priority, t.status)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 whitespace-nowrap inline-block shadow-sm ${getPriorityClass(t.priority)} ${(t.status && (t.status.toLowerCase() === 'closed' || t.status.toLowerCase() === 'resolved')) ? 'opacity-60 cursor-not-allowed hover:scale-100' : 'cursor-pointer hover:scale-105'}`}
                                                    title={(t.status && (t.status.toLowerCase() === 'closed' || t.status.toLowerCase() === 'resolved')) ? 'Cannot update priority for Closed or Resolved tickets' : ''}
                                                >
                                                    {t.priority || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="whitespace-nowrap py-3 px-4 text-center">
                                                <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap inline-block shadow-sm ${getActionPanelClass(t.actionPanel)}`}>
                                                    {t.actionPanel || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="whitespace-nowrap py-3 px-4 text-center">
                                                <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap inline-block shadow-sm ${getActionByClass(t.actionBy)}`}>
                                                    {t.actionBy || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="whitespace-nowrap py-3 px-4 text-center">
                                                <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border border-blue-200 whitespace-nowrap inline-block uppercase shadow-sm">
                                                    {t.requestType || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="whitespace-nowrap py-3 px-4 text-center">
                                                <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap inline-block shadow-sm ${getActionPanelClass(t.requestPanel)}`}>
                                                    {t.requestPanel || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="whitespace-nowrap py-3 px-4 text-center">
                                                <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border border-green-200 whitespace-nowrap inline-block shadow-sm">
                                                    {t.requestPerson || 'N/A'}
                                                </span>
                                            </td>
                                            <td
                                                className="max-w-[150px] truncate whitespace-nowrap py-3 px-4 text-center cursor-pointer transition-all duration-200 mx-auto group/complaintType"
                                                onClick={() => {
                                                    if (t.complaintType && t.complaintType !== 'N/A') {
                                                        setTextModal({
                                                            open: true,
                                                            title: 'Complaint Type Details',
                                                            content: t.complaintType
                                                        });
                                                    }
                                                }}
                                                title={t.complaintType && t.complaintType !== 'N/A' ? 'Click to view full text' : ''}
                                            >
                                                {t.complaintType && t.complaintType !== 'N/A' ? (
                                                    <span className="text-blue-600 hover:text-blue-700 font-medium underline decoration-2 underline-offset-2 group-hover/complaintType:bg-blue-50 px-2 py-1 rounded transition-all duration-200">
                                                        {t.complaintType.length > 20 ? t.complaintType.substring(0, 20) + '...' : t.complaintType}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">N/A</span>
                                                )}
                                            </td>
                                            <td
                                                className="max-w-[150px] truncate whitespace-nowrap py-3 px-4 text-center cursor-pointer transition-all duration-200 mx-auto group/remark"
                                                onClick={() => {
                                                    if (t.remark && t.remark !== 'N/A') {
                                                        setTextModal({
                                                            open: true,
                                                            title: 'Remark Details',
                                                            content: t.remark
                                                        });
                                                    }
                                                }}
                                                title={t.remark && t.remark !== 'N/A' ? 'Click to view full text' : ''}
                                            >
                                                {t.remark && t.remark !== 'N/A' ? (
                                                    <span className="text-blue-600 hover:text-blue-700 font-medium underline decoration-2 underline-offset-2 group-hover/remark:bg-blue-50 px-2 py-1 rounded transition-all duration-200">
                                                        {t.remark.length > 20 ? t.remark.substring(0, 20) + '...' : t.remark}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">N/A</span>
                                                )}
                                            </td>
                                            <td
                                                className="max-w-[200px] truncate whitespace-nowrap py-3 px-4 text-center cursor-pointer transition-all duration-200 mx-auto group/desc"
                                                onClick={() => {
                                                    if (t.shortDescription && t.shortDescription !== 'N/A') {
                                                        setTextModal({
                                                            open: true,
                                                            title: 'User Description Details',
                                                            content: t.shortDescription
                                                        });
                                                    }
                                                }}
                                                title={t.shortDescription && t.shortDescription !== 'N/A' ? 'Click to view full text' : ''}
                                            >
                                                {t.shortDescription && t.shortDescription !== 'N/A' ? (
                                                    <span className="text-blue-600 hover:text-blue-700 font-medium underline decoration-2 underline-offset-2 group-hover/desc:bg-blue-50 px-2 py-1 rounded transition-all duration-200">
                                                        {t.shortDescription.length > 20 ? t.shortDescription.substring(0, 20) + '...' : t.shortDescription}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">N/A</span>
                                                )}
                                            </td>
                                            <td className="text-gray-600 text-sm whitespace-nowrap py-3 px-4 text-center font-medium">{formatDate(t.resolveDate)}</td>
                                            <td className="whitespace-nowrap py-3 px-4 text-center">
                                                <div className="flex justify-center gap-2">
                                                    <button 
                                                        onClick={() => handleViewTicketDetails(t)} 
                                                        className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md" 
                                                        title="View Details"
                                                    >
                                                        <Eye size={18} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleRemarkUpdate(t.id, t.remark, t.status)} 
                                                        className={`p-2 rounded-lg text-purple-600 hover:bg-purple-50 hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md ${(t.status && (t.status.toLowerCase() === 'closed' || t.status.toLowerCase() === 'resolved')) ? 'opacity-60 cursor-not-allowed hover:scale-100' : ''}`}
                                                        title={(t.status && (t.status.toLowerCase() === 'closed' || t.status.toLowerCase() === 'resolved')) ? 'Cannot add remark for Closed or Resolved tickets' : 'Add Remark'}
                                                    >
                                                        <FileEdit size={18} />
                                                    </button>
                                                </div>
                                            </td>
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
                        Showing <span className="font-bold text-gray-900">{totalElements > 0 ? (currentPage * pageSize) + 1 : 0}</span> to <span className="font-bold text-gray-900">{Math.min((currentPage + 1) * pageSize, totalElements)}</span> of <span className="font-bold text-gray-900">{totalElements}</span> entries
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
                            <span className="text-sm font-bold">{totalPages}</span>
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

            {/* Ticket Modal */}
            {selectedTicket && (
                <TicketModal
                    ticket={selectedTicket}
                    onClose={() => setSelectedTicket(null)}
                    onUpdate={() => {
                        fetchTickets();
                        fetchStats();
                    }}
                />
            )}

            {/* Text View Modal - Remark/Description Details */}
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
                        <div className="p-10 text-slate-600 leading-relaxed font-medium">
                            <div className="whitespace-pre-wrap">{textModal.content}</div>
                        </div>
                        <div className="p-6 pt-0 flex justify-end">
                            <button onClick={() => setTextModal({ open: false, title: '', content: '' })} className="btn bg-slate-800 hover:bg-slate-900 border-none text-white px-8 rounded-2xl uppercase text-[10px] tracking-widest font-black h-12 shadow-xl shadow-slate-100">
                                Acknowledge
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Status Update Modal - Premium Design */}
            {statusModal.open && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-lg p-4 animate-fade-in" onClick={() => setStatusModal({ open: false, ticketId: null, currentStatus: '', ticketStatus: '' })}>
                    <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl shadow-black/30 flex flex-col overflow-hidden animate-slide-up border border-white/10" onClick={e => e.stopPropagation()}>
                        {/* Premium Header */}
                        <div className="relative p-6 pb-5 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 overflow-hidden">
                            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-24 -mt-24 blur-3xl"></div>
                            <div className="absolute bottom-0 left-0 w-36 h-36 bg-indigo-400/20 rounded-full -ml-18 -mb-18 blur-2xl"></div>
                            <div className="relative flex justify-between items-start">
                                <div>
                                    <h3 className="text-xl font-bold text-white tracking-tight mb-1">Update Ticket Status</h3>
                                    <p className="text-xs text-blue-100/90 font-medium">Choose the new status for this ticket</p>
                                </div>
                                <button 
                                    onClick={() => setStatusModal({ open: false, ticketId: null, currentStatus: '', ticketStatus: '' })} 
                                    className="w-8 h-8 flex items-center justify-center bg-gray-200 text-gray-700 hover:bg-gray-300 hover:text-gray-800 transition-all duration-200 rounded-full shadow-sm"
                                >
                                    <X size={18} strokeWidth={2.5} className="transition-transform duration-300 hover:rotate-90" />
                                </button>
                            </div>
                        </div>

                        {/* Premium Content */}
                        <div className="p-6 space-y-5 bg-gradient-to-b from-white to-gray-50/50">
                            <div>
                                <label className="block text-xs font-bold text-gray-800 mb-3 uppercase tracking-wider">Select New Status</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { name: 'Open', displayName: 'Open', icon: <CircleDot size={18} />, color: 'from-blue-500 to-blue-600', hoverColor: 'hover:from-blue-600 hover:to-blue-700', textColor: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
                                        { name: 'In Progress', displayName: 'In Progress', icon: <Clock size={18} />, color: 'from-orange-500 to-orange-600', hoverColor: 'hover:from-orange-600 hover:to-orange-700', textColor: 'text-orange-600', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' },
                                        { name: 'Resolved', displayName: 'Self Resolved', icon: <CheckCircle2 size={18} />, color: 'from-green-500 to-green-600', hoverColor: 'hover:from-green-600 hover:to-green-700', textColor: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200' },
                                        { name: 'Closed', displayName: 'Auto Resolved', icon: <XCircle size={18} />, color: 'from-gray-500 to-gray-600', hoverColor: 'hover:from-gray-600 hover:to-gray-700', textColor: 'text-gray-600', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' }
                                    ].map((status) => {
                                        const isActive = status.name === statusModal.currentStatus;
                                        return (
                                            <button
                                                key={status.name}
                                                onClick={() => handleStatusSubmit(status.name)}
                                                disabled={updatingStatus || isActive}
                                                className={`group relative px-4 py-3 rounded-xl font-bold text-xs transition-all duration-300 transform ${
                                                    isActive
                                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-2 border-gray-200'
                                                        : `bg-white ${status.bgColor} ${status.textColor} border-2 ${status.borderColor} hover:border-transparent hover:shadow-xl hover:scale-105 active:scale-100`
                                                } ${updatingStatus ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                {!isActive && (
                                                    <div className={`absolute inset-0 bg-gradient-to-br ${status.color} opacity-0 group-hover:opacity-100 rounded-xl transition-opacity duration-300`}></div>
                                                )}
                                                <div className="relative flex flex-col items-center gap-1.5">
                                                    <div className={`${isActive ? 'text-gray-400' : status.textColor} group-hover:text-white transition-colors duration-300`}>
                                                        {status.icon}
                                                    </div>
                                                    <span className={`${isActive ? 'text-gray-400' : status.textColor} group-hover:text-white transition-colors duration-300 font-semibold`}>
                                                        {status.displayName}
                                                    </span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            {updatingStatus && (
                                <div className="flex items-center justify-center gap-3 py-3 bg-blue-50 rounded-xl border-2 border-blue-100">
                                    <Loader2 className="animate-spin text-blue-600" size={20} />
                                    <span className="text-xs font-semibold text-blue-700">Updating status...</span>
                                </div>
                            )}
                        </div>

                        {/* Premium Footer */}
                        <div className="p-5 pt-3 flex justify-end gap-3 border-t border-gray-100 bg-white">
                            <button
                                onClick={() => setStatusModal({ open: false, ticketId: null, currentStatus: '', ticketStatus: '' })}
                                disabled={updatingStatus}
                                className="px-6 py-2.5 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all duration-200 disabled:opacity-50 shadow-sm hover:shadow-md"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Priority Update Modal - Premium Design */}
            {priorityModal.open && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-lg p-4 animate-fade-in" onClick={() => setPriorityModal({ open: false, ticketId: null, currentPriority: '', ticketStatus: '' })}>
                    <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl shadow-black/30 flex flex-col overflow-hidden animate-slide-up border border-white/10" onClick={e => e.stopPropagation()}>
                        {/* Premium Header */}
                        <div className="relative p-6 pb-5 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 overflow-hidden">
                            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-24 -mt-24 blur-3xl"></div>
                            <div className="absolute bottom-0 left-0 w-36 h-36 bg-indigo-400/20 rounded-full -ml-18 -mb-18 blur-2xl"></div>
                            <div className="relative flex justify-between items-start">
                                <div>
                                    <h3 className="text-xl font-bold text-white tracking-tight mb-1">Update Priority</h3>
                                    <p className="text-xs text-blue-100/90 font-medium">Choose the new priority for this ticket</p>
                                </div>
                                <button 
                                    onClick={() => setPriorityModal({ open: false, ticketId: null, currentPriority: '', ticketStatus: '' })} 
                                    className="w-8 h-8 flex items-center justify-center bg-gray-200 text-gray-700 hover:bg-gray-300 hover:text-gray-800 transition-all duration-200 rounded-full shadow-sm"
                                >
                                    <X size={18} strokeWidth={2.5} className="transition-transform duration-300 hover:rotate-90" />
                                </button>
                            </div>
                        </div>

                        {/* Premium Content */}
                        <div className="p-6 space-y-5 bg-gradient-to-b from-white to-gray-50/50">
                            <div>
                                <label className="block text-xs font-bold text-gray-800 mb-3 uppercase tracking-wider">Select New Priority</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { name: 'Normal', icon: <Circle size={18} />, color: 'from-gray-500 to-gray-600', hoverColor: 'hover:from-gray-600 hover:to-gray-700', textColor: 'text-gray-600', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' },
                                        { name: 'High', icon: <ArrowUp size={18} />, color: 'from-orange-500 to-orange-600', hoverColor: 'hover:from-orange-600 hover:to-orange-700', textColor: 'text-orange-600', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' },
                                        { name: 'Low', icon: <ArrowDown size={18} />, color: 'from-blue-500 to-blue-600', hoverColor: 'hover:from-blue-600 hover:to-blue-700', textColor: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
                                        { name: 'Urgent', icon: <AlertTriangle size={18} />, color: 'from-red-500 to-red-600', hoverColor: 'hover:from-red-600 hover:to-red-700', textColor: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200' }
                                    ].map((priority) => {
                                        const isActive = priority.name === priorityModal.currentPriority;
                                        return (
                                            <button
                                                key={priority.name}
                                                onClick={() => handlePrioritySubmit(priority.name)}
                                                disabled={updatingPriority || isActive}
                                                className={`group relative px-4 py-3 rounded-xl font-bold text-xs transition-all duration-300 transform ${
                                                    isActive
                                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-2 border-gray-200'
                                                        : `bg-white ${priority.bgColor} ${priority.textColor} border-2 ${priority.borderColor} hover:border-transparent hover:shadow-xl hover:scale-105 active:scale-100`
                                                } ${updatingPriority ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                {!isActive && (
                                                    <div className={`absolute inset-0 bg-gradient-to-br ${priority.color} opacity-0 group-hover:opacity-100 rounded-xl transition-opacity duration-300`}></div>
                                                )}
                                                <div className="relative flex flex-col items-center gap-1.5">
                                                    <div className={`${isActive ? 'text-gray-400' : priority.textColor} group-hover:text-white transition-colors duration-300`}>
                                                        {priority.icon}
                                                    </div>
                                                    <span className={`${isActive ? 'text-gray-400' : priority.textColor} group-hover:text-white transition-colors duration-300 font-semibold`}>
                                                        {priority.name}
                                                    </span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            {updatingPriority && (
                                <div className="flex items-center justify-center gap-3 py-3 bg-blue-50 rounded-xl border-2 border-blue-100">
                                    <Loader2 className="animate-spin text-blue-600" size={20} />
                                    <span className="text-xs font-semibold text-blue-700">Updating priority...</span>
                                </div>
                            )}
                        </div>

                        {/* Premium Footer */}
                        <div className="p-5 pt-3 flex justify-end gap-3 border-t border-gray-100 bg-white">
                            <button
                                onClick={() => setPriorityModal({ open: false, ticketId: null, currentPriority: '', ticketStatus: '' })}
                                disabled={updatingPriority}
                                className="px-6 py-2.5 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all duration-200 disabled:opacity-50 shadow-sm hover:shadow-md"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Remark Update Modal - Premium Design */}
            {remarkModal.open && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-lg p-4 animate-fade-in" onClick={() => setRemarkModal({ open: false, ticketId: null, currentRemark: '', ticketStatus: '' })}>
                    <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl shadow-black/30 flex flex-col overflow-hidden animate-slide-up border border-white/10" onClick={e => e.stopPropagation()}>
                        {/* Premium Header */}
                        <div className="relative p-6 pb-5 bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-700 overflow-hidden">
                            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-24 -mt-24 blur-3xl"></div>
                            <div className="absolute bottom-0 left-0 w-36 h-36 bg-indigo-400/20 rounded-full -ml-18 -mb-18 blur-2xl"></div>
                            <div className="relative flex justify-between items-start">
                                <div>
                                    <h3 className="text-xl font-bold text-white tracking-tight mb-1">Add Remark</h3>
                                    <p className="text-xs text-purple-100/90 font-medium">Enter your remark for this ticket</p>
                                </div>
                                <button 
                                    onClick={() => {
                                        setRemarkModal({ open: false, ticketId: null, currentRemark: '', ticketStatus: '' });
                                        setRemarkText('');
                                    }} 
                                    className="w-8 h-8 flex items-center justify-center bg-gray-200 text-gray-700 hover:bg-gray-300 hover:text-gray-800 transition-all duration-200 rounded-full shadow-sm"
                                >
                                    <X size={18} strokeWidth={2.5} className="transition-transform duration-300 hover:rotate-90" />
                                </button>
                            </div>
                        </div>

                        {/* Premium Content */}
                        <div className="p-6 space-y-5 bg-gradient-to-b from-white to-gray-50/50">
                            <div>
                                <label className="block text-xs font-bold text-gray-800 mb-3 uppercase tracking-wider">Remark</label>
                                <textarea
                                    value={remarkText}
                                    onChange={(e) => setRemarkText(e.target.value)}
                                    placeholder="Enter your remark here..."
                                    disabled={updatingRemark}
                                    rows={5}
                                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all duration-200 resize-none text-sm font-medium text-gray-700 placeholder:text-gray-400 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                            </div>
                            {updatingRemark && (
                                <div className="flex items-center justify-center gap-3 py-3 bg-purple-50 rounded-xl border-2 border-purple-100">
                                    <Loader2 className="animate-spin text-purple-600" size={20} />
                                    <span className="text-xs font-semibold text-purple-700">Adding remark...</span>
                                </div>
                            )}
                        </div>

                        {/* Premium Footer */}
                        <div className="p-5 pt-3 flex justify-end gap-3 border-t border-gray-100 bg-white">
                            <button
                                onClick={() => {
                                    setRemarkModal({ open: false, ticketId: null, currentRemark: '', ticketStatus: '' });
                                    setRemarkText('');
                                }}
                                disabled={updatingRemark}
                                className="px-6 py-2.5 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all duration-200 disabled:opacity-50 shadow-sm hover:shadow-md"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRemarkSubmit}
                                disabled={updatingRemark || !remarkText.trim()}
                                className="px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                            >
                                {updatingRemark ? 'Adding...' : 'Add Remark'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Assign Ticket Modal - Premium Design */}
            {assignModal.open && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-lg p-4 animate-fade-in" onClick={() => {
                    setAssignModal({ open: false, ticketId: null, ticketIdStr: '', assignedStaff: [], ticketStatus: '' });
                    setSelectedStaffIds([]);
                    setStaffSearchTerm('');
                }}>
                    <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl shadow-black/30 flex flex-col overflow-hidden animate-slide-up border border-white/10" onClick={e => e.stopPropagation()}>
                        {/* Premium Header with Gradient */}
                        <div className="relative p-6 pb-4 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                            <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-400/20 rounded-full -ml-24 -mb-24 blur-2xl"></div>
                            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"></div>
                            <div className="relative flex justify-between items-start gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2.5 mb-2">
                                        <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl shadow-lg">
                                            <User size={20} className="text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-white tracking-tight">Assign Ticket</h3>
                                            <p className="text-xs text-white/90 font-medium mt-0.5">Ticket ID: <span className="font-bold">{assignModal.ticketIdStr}</span></p>
                                        </div>
                                        {selectedStaffIds.length > 0 && (
                                            <div className="ml-auto px-3 py-1 bg-white/25 backdrop-blur-md rounded-full text-xs font-black text-white shadow-xl border border-white/30">
                                                {selectedStaffIds.length} {selectedStaffIds.length === 1 ? 'Staff' : 'Staff'}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <button 
                                    onClick={() => {
                                        setAssignModal({ open: false, ticketId: null, ticketIdStr: '', assignedStaff: [], ticketStatus: '' });
                                        setSelectedStaffIds([]);
                                        setStaffSearchTerm('');
                                    }} 
                                    className="w-8 h-8 flex items-center justify-center bg-gray-200 text-gray-700 hover:bg-gray-300 hover:text-gray-800 transition-all duration-200 rounded-full shadow-sm flex-shrink-0"
                                >
                                    <X size={18} strokeWidth={2.5} className="transition-transform duration-300 hover:rotate-90" />
                                </button>
                            </div>
                        </div>

                        {/* Premium Content */}
                        <div className="p-5 space-y-4 bg-gradient-to-b from-white to-gray-50/30">
                            {/* Search Bar */}
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                                    <Search size={16} />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search staff by name..."
                                    value={staffSearchTerm}
                                    onChange={(e) => setStaffSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-3 py-2.5 bg-white border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all duration-200 text-sm font-medium text-gray-700 placeholder:text-gray-400 shadow-sm hover:shadow-md"
                                />
                            </div>

                            {/* Staff Selection Section */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <label className="block text-xs font-black text-gray-800 uppercase tracking-widest">Select Support Staff</label>
                                    {selectedStaffIds.length > 0 && (
                                        <button
                                            onClick={() => {
                                                if (assignModal.ticketStatus && (assignModal.ticketStatus.toLowerCase() === 'closed' || assignModal.ticketStatus.toLowerCase() === 'resolved')) {
                                                    return; // Don't allow clearing
                                                }
                                                setSelectedStaffIds([]);
                                            }}
                                            disabled={assignModal.ticketStatus && (assignModal.ticketStatus.toLowerCase() === 'closed' || assignModal.ticketStatus.toLowerCase() === 'resolved')}
                                            className={`text-xs font-semibold transition-colors ${(assignModal.ticketStatus && (assignModal.ticketStatus.toLowerCase() === 'closed' || assignModal.ticketStatus.toLowerCase() === 'resolved')) ? 'text-gray-400 cursor-not-allowed opacity-50' : 'text-indigo-600 hover:text-indigo-700'}`}
                                        >
                                            Clear All
                                        </button>
                                    )}
                                </div>
                                {loadingStaff ? (
                                    <div className="flex flex-col items-center justify-center gap-3 py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                                        <Loader2 className="animate-spin text-indigo-600" size={28} />
                                        <span className="text-sm font-semibold text-gray-600">Loading staff members...</span>
                                    </div>
                                ) : (
                                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-2 pr-2">
                                        {(() => {
                                            // Filter staff based on search term
                                            const filteredStaff = supportStaffList.filter(staff =>
                                                staff.staffName.toLowerCase().includes(staffSearchTerm.toLowerCase())
                                            );

                                            if (filteredStaff.length === 0) {
                                                return (
                                                    <div className="flex flex-col items-center justify-center gap-2.5 py-10 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                                                        <div className="p-2.5 bg-gray-100 rounded-full">
                                                            <User size={20} className="text-gray-400" />
                                                        </div>
                                                        <p className="text-xs font-semibold text-gray-500">
                                                            {staffSearchTerm ? 'No staff found matching your search' : 'No support staff available'}
                                                        </p>
                                                        {staffSearchTerm && (
                                                            <button
                                                                onClick={() => setStaffSearchTerm('')}
                                                                className="text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                                                            >
                                                                Clear search
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            }

                                            // Create a map of staffId to original index
                                            const indexMap = new Map();
                                            supportStaffList.forEach((staff, index) => {
                                                indexMap.set(staff.staffId, index);
                                            });
                                            
                                            // Separate into: already selected, newly selected, and unselected
                                            const alreadySelected = [];
                                            const newlySelected = [];
                                            const unselected = [];
                                            
                                            filteredStaff.forEach((staff) => {
                                                const isCurrentlySelected = selectedStaffIds.includes(staff.staffId);
                                                const wasAlreadySelected = assignModal.assignedStaff.includes(staff.staffId);
                                                
                                                if (isCurrentlySelected && wasAlreadySelected) {
                                                    alreadySelected.push(staff);
                                                } else if (isCurrentlySelected && !wasAlreadySelected) {
                                                    newlySelected.push(staff);
                                                } else {
                                                    unselected.push(staff);
                                                }
                                            });
                                            
                                            // Sort each group by original index to maintain order
                                            alreadySelected.sort((a, b) => indexMap.get(a.staffId) - indexMap.get(b.staffId));
                                            newlySelected.sort((a, b) => indexMap.get(a.staffId) - indexMap.get(b.staffId));
                                            
                                            // Combine: already selected first, then newly selected, then unselected
                                            return [...alreadySelected, ...newlySelected, ...unselected].map((staff) => {
                                                const isSelected = selectedStaffIds.includes(staff.staffId);
                                                const isDisabled = assignModal.ticketStatus && (assignModal.ticketStatus.toLowerCase() === 'closed' || assignModal.ticketStatus.toLowerCase() === 'resolved');
                                                return (
                                                    <button
                                                        key={staff.staffId}
                                                        onClick={() => handleStaffToggle(staff.staffId)}
                                                        disabled={isDisabled}
                                                        className={`group w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 transform ${
                                                            isDisabled 
                                                                ? 'opacity-60 cursor-not-allowed'
                                                                : ''
                                                        } ${
                                                            isSelected
                                                                ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-400 shadow-lg'
                                                                : 'bg-white border-2 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50 hover:shadow-md hover:scale-[1.01] active:scale-[0.99]'
                                                        } ${isDisabled ? 'hover:scale-100 hover:shadow-none' : ''}`}
                                                        title={isDisabled ? 'Cannot modify assignments for Closed or Resolved tickets' : ''}
                                                    >
                                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300 flex-shrink-0 ${
                                                            isSelected
                                                                ? 'bg-gradient-to-br from-indigo-600 to-purple-600 shadow-md'
                                                                : `border-2 ${isDisabled ? 'border-gray-300 bg-gray-100' : 'border-gray-300 bg-white group-hover:border-indigo-400'}`
                                                        }`}>
                                                            {isSelected && <Check size={12} className="text-white font-bold" strokeWidth={3} />}
                                                        </div>
                                                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                                            <div className={`p-2 rounded-lg flex-shrink-0 transition-all duration-300 ${
                                                                isSelected 
                                                                    ? 'bg-gradient-to-br from-indigo-100 to-purple-100 shadow-sm' 
                                                                    : `bg-gray-100 ${isDisabled ? '' : 'group-hover:bg-indigo-100'}`
                                                            }`}>
                                                                <User size={18} className={isSelected ? 'text-indigo-600' : isDisabled ? 'text-gray-400' : 'text-gray-500 group-hover:text-indigo-600'} />
                                                            </div>
                                                            <span className={`text-sm font-bold truncate transition-colors duration-300 ${
                                                                isSelected ? 'text-indigo-700' : isDisabled ? 'text-gray-400' : 'text-gray-700 group-hover:text-indigo-700'
                                                            }`}>
                                                                {staff.staffName}
                                                            </span>
                                                        </div>
                                                        {isSelected && (
                                                            <div className="flex-shrink-0">
                                                                <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></div>
                                                            </div>
                                                        )}
                                                    </button>
                                                );
                                            });
                                        })()}
                                    </div>
                                )}
                            </div>
                            {assigning && (
                                <div className="flex items-center justify-center gap-2.5 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border-2 border-indigo-200 shadow-sm">
                                    <Loader2 className="animate-spin text-indigo-600" size={18} />
                                    <span className="text-xs font-bold text-indigo-700">Assigning ticket to {selectedStaffIds.length} staff member{selectedStaffIds.length !== 1 ? 's' : ''}...</span>
                                </div>
                            )}
                        </div>

                        {/* Premium Footer */}
                        <div className="p-5 pt-3 flex justify-end gap-2.5 border-t-2 border-gray-100 bg-white">
                            <button
                                onClick={() => {
                                    setAssignModal({ open: false, ticketId: null, ticketIdStr: '', assignedStaff: [], ticketStatus: '' });
                                    setSelectedStaffIds([]);
                                    setStaffSearchTerm('');
                                }}
                                disabled={assigning}
                                className="px-6 py-2.5 text-sm font-bold text-gray-700 bg-white border-2 border-gray-300 hover:bg-gray-50 hover:border-gray-400 rounded-xl transition-all duration-200 disabled:opacity-50 shadow-sm hover:shadow-md active:scale-95"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAssignSubmit}
                                disabled={assigning || selectedStaffIds.length === 0 || (assignModal.ticketStatus && (assignModal.ticketStatus.toLowerCase() === 'closed' || assignModal.ticketStatus.toLowerCase() === 'resolved'))}
                                className="px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl active:scale-95 disabled:active:scale-100"
                                title={(assignModal.ticketStatus && (assignModal.ticketStatus.toLowerCase() === 'closed' || assignModal.ticketStatus.toLowerCase() === 'resolved')) ? 'Cannot assign staff to Closed or Resolved tickets' : ''}
                            >
                                {assigning ? (
                                    <span className="flex items-center gap-2">
                                        <Loader2 className="animate-spin" size={14} />
                                        Assigning...
                                    </span>
                                ) : (
                                    `Assign ${selectedStaffIds.length > 0 ? `(${selectedStaffIds.length})` : ''}`
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Complaint Modal - Premium Design */}
            {addComplaintModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-lg p-4 animate-fade-in" onClick={closeAddComplaintModal}>
                    <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl shadow-black/30 flex flex-col overflow-hidden animate-slide-up border border-white/10 max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        {/* Premium Header */}
                        <div className="relative p-6 pb-4 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                            <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-400/20 rounded-full -ml-24 -mb-24 blur-2xl"></div>
                            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"></div>
                            <div className="relative flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl shadow-lg">
                                        <Plus size={22} className="text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-white tracking-tight">Add New Complaint</h3>
                                        <p className="text-sm text-white/90 font-medium mt-0.5">Fill in the details to create a new complaint</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={closeAddComplaintModal} 
                                    className="w-8 h-8 flex items-center justify-center bg-gray-200 text-gray-700 hover:bg-gray-300 hover:text-gray-800 transition-all duration-200 rounded-full shadow-sm flex-shrink-0"
                                >
                                    <X size={18} strokeWidth={2.5} className="transition-transform duration-300 hover:rotate-90" />
                                </button>
                            </div>
                        </div>

                        {/* Premium Content */}
                        <div className="p-6 space-y-5 bg-gradient-to-b from-white to-gray-50/30 overflow-y-auto custom-scrollbar">
                            {/* Row 1: Server and Username */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Server Select */}
                                <div className="relative">
                                    <label className="block text-xs font-black text-gray-800 mb-2 uppercase tracking-widest">
                                        Select Server <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                                            <Server size={18} />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Select Server"
                                            value={selectedServer ? selectedServer.brandName : serverSearch}
                                            onChange={(e) => {
                                                setServerSearch(e.target.value);
                                                if (selectedServer && e.target.value !== selectedServer.brandName) {
                                                    setSelectedServer(null);
                                                }
                                                if (!openDropdown) setOpenDropdown('server');
                                                setFieldErrors(prev => ({ ...prev, server: false }));
                                            }}
                                            onFocus={() => {
                                                // If selected, clear search but keep selected value visible
                                                if (selectedServer) {
                                                    setServerSearch('');
                                                }
                                                setOpenDropdown('server');
                                                setFieldErrors(prev => ({ ...prev, server: false }));
                                                // Load servers if not loaded when user focuses
                                                if (servers.length === 0 && !loadingServers) {
                                                    loadServers();
                                                }
                                            }}
                                            className={`w-full pl-11 pr-10 py-3 bg-white border-2 rounded-xl focus:ring-2 outline-none transition-all duration-200 text-sm font-medium text-gray-700 placeholder:text-gray-400 shadow-sm hover:shadow-md ${
                                                fieldErrors.server
                                                    ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
                                                    : 'border-gray-200 focus:border-blue-500 focus:ring-blue-200'
                                            }`}
                                        />
                                        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                                        {openDropdown === 'server' && (
                                            <div className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto custom-scrollbar">
                                                {loadingServers ? (
                                                    <div className="p-4 text-center">
                                                        <Loader2 className="animate-spin mx-auto text-blue-600" size={20} />
                                                        <p className="text-xs text-gray-500 mt-2">Loading servers...</p>
                                                    </div>
                                                ) : servers.length === 0 ? (
                                                    <div className="p-4 text-center text-gray-500 text-sm">
                                                        <p>No servers available</p>
                                                        <button
                                                            onClick={loadServers}
                                                            className="mt-2 text-xs text-blue-600 hover:text-blue-700 underline"
                                                        >
                                                            Retry
                                                        </button>
                                                    </div>
                                                ) : getFilteredServers().length === 0 ? (
                                                    <div className="p-4 text-center text-gray-500 text-sm">
                                                        <p>No servers found matching "{serverSearch}"</p>
                                                        <button
                                                            onClick={() => setServerSearch('')}
                                                            className="mt-2 text-xs text-blue-600 hover:text-blue-700 underline"
                                                        >
                                                            Clear search
                                                        </button>
                                                    </div>
                                                ) : (
                                                    getFilteredServers().map((server) => (
                                                        <button
                                                            key={server.brandId}
                                                            onClick={() => handleServerSelect(server)}
                                                            className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors text-sm font-medium text-gray-700 border-b border-gray-100 last:border-b-0"
                                                        >
                                                            {server.brandName}
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Username Select */}
                                <div className="relative">
                                    <label className="block text-xs font-black text-gray-800 mb-2 uppercase tracking-widest">
                                        Search Username <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                                            <User size={18} />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder={selectedServer ? "Search Username..." : "Select server first"}
                                            value={selectedUser ? selectedUser.username : userSearch}
                                            onChange={(e) => {
                                                setUserSearch(e.target.value);
                                                if (selectedUser && e.target.value !== selectedUser.username) {
                                                    setSelectedUser(null);
                                                    setSelectedDevice(null);
                                                    setDeviceSearch('');
                                                    setDevices([]);
                                                }
                                                if (!openDropdown) setOpenDropdown('user');
                                                setFieldErrors(prev => ({ ...prev, user: false }));
                                            }}
                                            onFocus={() => {
                                                if (selectedServer) {
                                                    // If selected, clear search but keep selected value visible
                                                    if (selectedUser) {
                                                        setUserSearch('');
                                                    }
                                                    setOpenDropdown('user');
                                                    setFieldErrors(prev => ({ ...prev, user: false }));
                                                    // Reload users if not loaded
                                                    if (users.length === 0 && !loadingUsers) {
                                                        loadUsers(selectedServer);
                                                    }
                                                }
                                            }}
                                            disabled={!selectedServer}
                                            className={`w-full pl-11 pr-10 py-3 bg-white border-2 rounded-xl focus:ring-2 outline-none transition-all duration-200 text-sm font-medium text-gray-700 placeholder:text-gray-400 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${
                                                fieldErrors.user
                                                    ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
                                                    : 'border-gray-200 focus:border-blue-500 focus:ring-blue-200'
                                            }`}
                                        />
                                        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                                        {openDropdown === 'user' && selectedServer && (
                                            <div className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto custom-scrollbar">
                                                {loadingUsers ? (
                                                    <div className="p-4 text-center">
                                                        <Loader2 className="animate-spin mx-auto text-blue-600" size={20} />
                                                        <p className="text-xs text-gray-500 mt-2">Loading users...</p>
                                                    </div>
                                                ) : users.length === 0 ? (
                                                    <div className="p-4 text-center text-gray-500 text-sm">
                                                        <p className="text-red-600 font-semibold">{userError || 'No users found for this server'}</p>
                                                    </div>
                                                ) : getFilteredUsers().length === 0 ? (
                                                    <div className="p-4 text-center text-gray-500 text-sm">
                                                        <p>No users found matching "{userSearch}"</p>
                                                        <button
                                                            onClick={() => setUserSearch('')}
                                                            className="mt-2 text-xs text-blue-600 hover:text-blue-700 underline"
                                                        >
                                                            Clear search
                                                        </button>
                                                    </div>
                                                ) : (
                                                    getFilteredUsers().map((user, idx) => (
                                                        <button
                                                            key={user.userid || user.id || idx}
                                                            onClick={() => handleUserSelect(user)}
                                                            className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors text-sm font-medium text-gray-700 border-b border-gray-100 last:border-b-0"
                                                        >
                                                            {user.username}
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Row 2: Device and Complaint Type */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Device Select */}
                                <div className="relative">
                                    <label className="block text-xs font-black text-gray-800 mb-2 uppercase tracking-widest">
                                        Select Device Name <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                                            <Server size={18} />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder={selectedUser ? "Select Device" : "Select user first"}
                                            value={selectedDevice ? (selectedDevice.vehicleName || selectedDevice.deviceName || 'Unknown Device') : deviceSearch}
                                            onChange={(e) => {
                                                setDeviceSearch(e.target.value);
                                                if (selectedDevice) {
                                                    const deviceName = selectedDevice.vehicleName || selectedDevice.deviceName || 'Unknown Device';
                                                    if (e.target.value !== deviceName) {
                                                        setSelectedDevice(null);
                                                    }
                                                }
                                                if (!openDropdown) setOpenDropdown('device');
                                                setFieldErrors(prev => ({ ...prev, device: false }));
                                            }}
                                            onFocus={() => {
                                                if (selectedUser) {
                                                    // If selected, clear search but keep selected value visible
                                                    if (selectedDevice) {
                                                        setDeviceSearch('');
                                                    }
                                                    setOpenDropdown('device');
                                                    setFieldErrors(prev => ({ ...prev, device: false }));
                                                    // Reload devices if not loaded
                                                    if (devices.length === 0 && !loadingDevices) {
                                                        loadDevices(selectedUser);
                                                    }
                                                }
                                            }}
                                            disabled={!selectedUser}
                                            className={`w-full pl-11 pr-10 py-3 bg-white border-2 rounded-xl focus:ring-2 outline-none transition-all duration-200 text-sm font-medium text-gray-700 placeholder:text-gray-400 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${
                                                fieldErrors.device
                                                    ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
                                                    : 'border-gray-200 focus:border-blue-500 focus:ring-blue-200'
                                            }`}
                                        />
                                        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                                        {openDropdown === 'device' && selectedUser && (
                                            <div className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto custom-scrollbar">
                                                {loadingDevices ? (
                                                    <div className="p-4 text-center">
                                                        <Loader2 className="animate-spin mx-auto text-blue-600" size={20} />
                                                        <p className="text-xs text-gray-500 mt-2">Loading devices...</p>
                                                    </div>
                                                ) : devices.length === 0 ? (
                                                    <div className="p-4 text-center text-gray-500 text-sm">
                                                        <p className="text-red-600 font-semibold">{deviceError || 'No devices found for this user'}</p>
                                                    </div>
                                                ) : getFilteredDevices().length === 0 ? (
                                                    <div className="p-4 text-center text-gray-500 text-sm">
                                                        <p>No devices found matching "{deviceSearch}"</p>
                                                        <button
                                                            onClick={() => setDeviceSearch('')}
                                                            className="mt-2 text-xs text-blue-600 hover:text-blue-700 underline"
                                                        >
                                                            Clear search
                                                        </button>
                                                    </div>
                                                ) : (
                                                    getFilteredDevices().map((device, idx) => (
                                                        <button
                                                            key={idx}
                                                            onClick={() => handleDeviceSelect(device)}
                                                            className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors text-sm font-medium text-gray-700 border-b border-gray-100 last:border-b-0"
                                                        >
                                                            {device.vehicleName || device.deviceName || 'Unknown Device'}
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Complaint Type Select */}
                                <div className="relative">
                                    <label className="block text-xs font-black text-gray-800 mb-2 uppercase tracking-widest">
                                        Select Complaint Type <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                                            <FileEdit size={18} />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder={selectedServer ? "Select Type" : "Select server first"}
                                            value={complaintTypeSearch}
                                            onChange={(e) => {
                                                setComplaintTypeSearch(e.target.value);
                                                setOpenDropdown(openDropdown === 'complaintType' ? null : 'complaintType');
                                                setFieldErrors(prev => ({ ...prev, complaintType: false }));
                                            }}
                                            onFocus={() => {
                                                if (selectedServer) {
                                                    setOpenDropdown('complaintType');
                                                    setFieldErrors(prev => ({ ...prev, complaintType: false }));
                                                }
                                            }}
                                            disabled={!selectedServer}
                                            className={`w-full pl-11 pr-10 py-3 bg-white border-2 rounded-xl focus:ring-2 outline-none transition-all duration-200 text-sm font-medium text-gray-700 placeholder:text-gray-400 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${
                                                fieldErrors.complaintType
                                                    ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
                                                    : 'border-gray-200 focus:border-blue-500 focus:ring-blue-200'
                                            }`}
                                        />
                                        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                                        {openDropdown === 'complaintType' && selectedServer && (
                                            <div className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto custom-scrollbar">
                                                {loadingComplaintTypes ? (
                                                    <div className="p-4 text-center">
                                                        <Loader2 className="animate-spin mx-auto text-blue-600" size={20} />
                                                    </div>
                                                ) : getFilteredComplaintTypes().length === 0 ? (
                                                    <div className="p-4 text-center text-gray-500 text-sm">No types found</div>
                                                ) : (
                                                    getFilteredComplaintTypes().map((type, idx) => {
                                                        const typeName = typeof type === 'string' ? type : (type.complaintType || type.name);
                                                        return (
                                                            <button
                                                                key={idx}
                                                                onClick={() => handleComplaintTypeSelect(type)}
                                                                className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors text-sm font-medium text-gray-700 border-b border-gray-100 last:border-b-0"
                                                            >
                                                                {typeName}
                                                            </button>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Row 3: Email and Contact */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black text-gray-800 mb-2 uppercase tracking-widest">
                                        Email <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                                            <Mail size={18} />
                                        </div>
                                        <input
                                            type="email"
                                            placeholder="example@gmail.com"
                                            value={formData.email}
                                            onChange={(e) => {
                                                setFormData({ ...formData, email: e.target.value });
                                                setFieldErrors(prev => ({ ...prev, email: false }));
                                            }}
                                            className={`w-full pl-11 pr-4 py-3 bg-white border-2 rounded-xl focus:ring-2 outline-none transition-all duration-200 text-sm font-medium text-gray-700 placeholder:text-gray-400 shadow-sm hover:shadow-md ${
                                                fieldErrors.email
                                                    ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
                                                    : 'border-gray-200 focus:border-blue-500 focus:ring-blue-200'
                                            }`}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-800 mb-2 uppercase tracking-widest">
                                        Contact Number <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                                            <Phone size={18} />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="9123456780"
                                            maxLength={10}
                                            value={formData.contactNo}
                                            onChange={(e) => {
                                                const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                                                setFormData({ ...formData, contactNo: value });
                                                setFieldErrors(prev => ({ ...prev, contactNo: false }));
                                            }}
                                            className={`w-full pl-11 pr-4 py-3 bg-white border-2 rounded-xl focus:ring-2 outline-none transition-all duration-200 text-sm font-medium text-gray-700 placeholder:text-gray-400 shadow-sm hover:shadow-md ${
                                                fieldErrors.contactNo
                                                    ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
                                                    : 'border-gray-200 focus:border-blue-500 focus:ring-blue-200'
                                            }`}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Row 4: Description */}
                            <div>
                                <label className="block text-xs font-black text-gray-800 mb-2 uppercase tracking-widest">
                                    Problem Description (Short) <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    placeholder="Describe the issue briefly..."
                                    value={formData.shortDescription}
                                    onChange={(e) => {
                                        setFormData({ ...formData, shortDescription: e.target.value });
                                        setFieldErrors(prev => ({ ...prev, shortDescription: false }));
                                    }}
                                    rows={4}
                                    className={`w-full px-4 py-3 bg-white border-2 rounded-xl focus:ring-2 outline-none transition-all duration-200 text-sm font-medium text-gray-700 placeholder:text-gray-400 shadow-sm hover:shadow-md resize-none ${
                                        fieldErrors.shortDescription
                                            ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
                                            : 'border-gray-200 focus:border-blue-500 focus:ring-blue-200'
                                    }`}
                                />
                            </div>

                            {submittingComplaint && (
                                <div className="flex items-center justify-center gap-3 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 shadow-sm">
                                    <Loader2 className="animate-spin text-blue-600" size={20} />
                                    <span className="text-sm font-bold text-blue-700">Adding complaint...</span>
                                </div>
                            )}
                        </div>

                        {/* Premium Footer */}
                        <div className="p-6 pt-4 flex justify-end gap-3 border-t-2 border-gray-100 bg-white">
                            <button
                                onClick={closeAddComplaintModal}
                                disabled={submittingComplaint}
                                className="px-6 py-2.5 text-sm font-bold text-gray-700 bg-white border-2 border-gray-300 hover:bg-gray-50 hover:border-gray-400 rounded-xl transition-all duration-200 disabled:opacity-50 shadow-sm hover:shadow-md active:scale-95"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmitComplaint}
                                disabled={submittingComplaint}
                                className="px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl active:scale-95 disabled:active:scale-100"
                            >
                                {submittingComplaint ? (
                                    <span className="flex items-center gap-2">
                                        <Loader2 className="animate-spin" size={14} />
                                        Adding...
                                    </span>
                                ) : (
                                    'Add Complaint'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Premium Toast Notification */}
            {toast.show && (
                <div className={`fixed top-6 right-6 z-[200] animate-slide-in-right ${
                    toast.type === 'success' 
                        ? 'bg-gradient-to-r from-green-500 to-emerald-600' 
                        : 'bg-gradient-to-r from-red-500 to-rose-600'
                } rounded-2xl shadow-2xl shadow-black/30 p-4 min-w-[320px] max-w-md border border-white/20`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl bg-white/20 backdrop-blur-sm ${
                            toast.type === 'success' ? 'text-white' : 'text-white'
                        }`}>
                            {toast.type === 'success' ? (
                                <CheckCircle2 size={24} className="text-white" />
                            ) : (
                                <XCircle size={24} className="text-white" />
                            )}
                        </div>
                        <div className="flex-1">
                            <p className="text-white font-bold text-sm">{toast.message}</p>
                        </div>
                        <button
                            onClick={() => setToast({ show: false, message: '', type: 'success' })}
                            className="w-6 h-6 flex items-center justify-center bg-gray-200 text-gray-700 hover:bg-gray-300 hover:text-gray-800 transition-all duration-200 rounded-full shadow-sm"
                        >
                            <X size={14} strokeWidth={2.5} className="transition-transform duration-300 hover:rotate-90" />
                        </button>
                    </div>
                </div>
            )}

            {/* Premium Refresh Toast (Top Left) */}
            {showRefreshToast && (
                <div className="fixed top-6 left-6 z-[100] pointer-events-none" style={{
                    animation: 'slideDownFade 0.4s ease-out forwards'
                }}>
                    <style>{`
                        @keyframes slideDownFade {
                            0% {
                                opacity: 0;
                                transform: translateY(-20px) scale(0.95);
                            }
                            100% {
                                opacity: 1;
                                transform: translateY(0) scale(1);
                            }
                        }
                    `}</style>
                    <div className="bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 text-white px-6 py-3.5 rounded-2xl shadow-2xl shadow-green-500/50 border-2 border-white/20 backdrop-blur-sm flex items-center gap-3 min-w-[400px] max-w-[500px]">
                        <div className="relative flex-shrink-0">
                            <div className="absolute inset-0 bg-white/30 rounded-full animate-ping opacity-75"></div>
                            <div className="relative bg-white/20 p-2.5 rounded-full backdrop-blur-sm">
                                <RefreshCw className="w-5 h-5 text-white animate-spin" />
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white drop-shadow-lg leading-tight">
                                Fresh Data Served! 🎉
                            </p>
                            <p className="text-xs font-medium text-green-50 opacity-95 mt-0.5">
                                Another update in 10 seconds
                            </p>
                        </div>
                        <div className="w-0.5 h-8 bg-white/30 rounded-full flex-shrink-0"></div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                        </div>
                    </div>
                </div>
            )}
            </div>
        </div>
    );
};

export default Dashboard;
