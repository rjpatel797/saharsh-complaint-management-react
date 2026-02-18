import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Server,
    Users,
    LogOut,
    Menu,
    ChevronDown,
    Settings,
    X,
    FileText,
    Package,
    History,
    Truck,
    Bell,
    CheckCircle2
} from 'lucide-react';
import Swal from 'sweetalert2';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../api/apiClient';

const AdminNavbar = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [notificationCount, setNotificationCount] = useState(0);
    const [loadingNotifications, setLoadingNotifications] = useState(false);
    const [bellAnimation, setBellAnimation] = useState(false);
    const [countAnimation, setCountAnimation] = useState(false);
    const prevNotificationCountRef = useRef(0);
    const location = useLocation();
    const navigate = useNavigate();
    const { logout, user } = useAuth();
    const username = user?.username || localStorage.getItem('adminUsername') || 'Admin';
    const notificationRef = useRef(null);
    const notificationsFetchedRef = useRef(false);
    const isFetchingNotificationsRef = useRef(false);
    const isDashboard = location.pathname === '/admin/dashboard' || location.pathname.startsWith('/admin/dashboard/');

    const isActive = (path) => {
        // For exact path matching, check if pathname exactly matches or starts with path followed by / or end of string
        // This prevents /admin/serverallocationtostaff from matching /admin/server
        if (path === '/admin/server') {
            // Only match /admin/server exactly, not /admin/serverallocationtostaff
            return location.pathname === '/admin/server' || location.pathname === '/admin/server/';
        }
        return location.pathname === path || location.pathname.startsWith(path + '/');
    };

    const handleLogout = () => {
        Swal.fire({
            html: `
                <div style="text-align: center; padding: 0;">
                    <svg style="width: 64px; height: 64px; margin: 0 auto 24px; color: #ffffff; display: block;" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                    </svg>
                    <h2 style="color: #ffffff; font-weight: bold; font-size: 24px; margin: 0 0 16px 0;">Logout Confirmation</h2>
                    <p style="color: #9ca3af; font-size: 16px; margin: 0;">Are you sure you want to logout?</p>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Yes, Logout',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#374151',
            background: '#1f2937',
            color: '#ffffff',
            customClass: {
                popup: 'swal2-dark-popup',
                title: 'swal2-title-dark',
                htmlContainer: 'swal2-html-dark',
                confirmButton: 'swal2-confirm-dark',
                cancelButton: 'swal2-cancel-dark',
                backdrop: 'swal2-backdrop-blur',
            },
            buttonsStyling: true,
            reverseButtons: false,
            focusConfirm: false,
            focusCancel: true,
            width: '400px',
            padding: '2rem',
            allowOutsideClick: true,
            allowEscapeKey: true,
        }).then((result) => {
            if (result.isConfirmed) {
                logout(); // Use AuthContext logout
                navigate('/admin/login');
            }
        });
    };

    // Close notification when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (notificationRef.current && !notificationRef.current.contains(event.target)) {
                setIsNotificationOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Close on ESC key
    useEffect(() => {
        const handleEsc = (event) => {
            if (event.key === 'Escape') {
                setIsNotificationOpen(false);
            }
        };
        document.addEventListener('keydown', handleEsc);
        return () => document.removeEventListener('keydown', handleEsc);
    }, []);

    // Fetch notifications (supports silent updates for auto-refresh)
    const fetchNotifications = useCallback(async (isSilent = false) => {
        if (!isDashboard) return;
        
        if (!isSilent) {
            setLoadingNotifications(true);
        }
        try {
            const response = await apiClient.get('/admin/getAdminNotifications');
            if (response.data.status && response.data.data) {
                const notificationsList = response.data.data.notifications || [];
                setNotifications(notificationsList);
                setNotificationCount(response.data.data.count || 0);
            } else {
                setNotifications([]);
                setNotificationCount(0);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
            setNotifications([]);
            setNotificationCount(0);
        } finally {
            if (!isSilent) {
                setLoadingNotifications(false);
            }
        }
    }, [isDashboard]);

    // Mark all notifications as read
    const handleMarkAllAsRead = async () => {
        try {
            const response = await apiClient.post('/admin/notifications/markSeen');
            if (response.data.status) {
                // Refresh notifications after marking as read
                await fetchNotifications();
            }
        } catch (error) {
            console.error('Error marking notifications as read:', error);
            Swal.fire('Error', 'Failed to mark notifications as read', 'error');
        }
    };

    // Fetch notifications when on dashboard and set up interval
    useEffect(() => {
        if (!isDashboard) {
            setNotifications([]);
            setNotificationCount(0);
            notificationsFetchedRef.current = false;
            isFetchingNotificationsRef.current = false;
            return;
        }

        // Initial fetch on mount
        fetchNotifications();

        // Listen for refresh event from Dashboard (silent update)
        const handleRefreshNotifications = () => {
            fetchNotifications(true); // Silent update
        };

        window.addEventListener('refreshNotifications', handleRefreshNotifications);

        return () => {
            window.removeEventListener('refreshNotifications', handleRefreshNotifications);
        };
    }, [isDashboard, fetchNotifications]);

    // Animate bell and count badge when notification count changes
    useEffect(() => {
        // Skip animation on initial mount (when prevNotificationCountRef is 0 and notificationCount is also 0)
        if (prevNotificationCountRef.current === 0 && notificationCount === 0) {
            prevNotificationCountRef.current = notificationCount;
            return;
        }
        
        // Trigger animation when count changes (both increase and decrease)
        if (prevNotificationCountRef.current !== notificationCount) {
            const isIncrease = notificationCount > prevNotificationCountRef.current;
            console.log(`Bell animation triggered: Count changed from ${prevNotificationCountRef.current} to ${notificationCount} (${isIncrease ? 'increase' : 'decrease'})`);
            
            // Always shake bell on any count change
            setBellAnimation(true);
            const bellTimeout = setTimeout(() => {
                setBellAnimation(false);
            }, 600);
            
            // Animate count badge only when count increases
            if (isIncrease && notificationCount > 0) {
                setCountAnimation(true);
                const countTimeout = setTimeout(() => {
                    setCountAnimation(false);
                }, 800);
                
                prevNotificationCountRef.current = notificationCount;
                return () => {
                    clearTimeout(bellTimeout);
                    clearTimeout(countTimeout);
                };
            }
            
            prevNotificationCountRef.current = notificationCount;
            return () => clearTimeout(bellTimeout);
        }
    }, [notificationCount]);

    // Add custom styles for dark logout modal with blurred background
    useEffect(() => {
        const style = document.createElement('style');
        style.textContent = `
            .swal2-backdrop-blur {
                background: rgba(0, 0, 0, 0.5) !important;
                backdrop-filter: blur(6px) !important;
                -webkit-backdrop-filter: blur(6px) !important;
            }
            .swal2-container.swal2-backdrop-show {
                backdrop-filter: blur(6px) !important;
                -webkit-backdrop-filter: blur(6px) !important;
            }
            .swal2-dark-popup {
                background: #1f2937 !important;
                border-radius: 12px !important;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.2) !important;
                border: 1px solid rgba(255, 255, 255, 0.1) !important;
            }
            .swal2-title {
                display: none !important;
            }
            .swal2-html-container {
                padding: 0 !important;
            }
            .swal2-html-dark {
                color: #9ca3af !important;
            }
            .swal2-confirm-dark {
                background: #ef4444 !important;
                border: none !important;
                border-radius: 8px !important;
                color: white !important;
                font-weight: 600 !important;
                padding: 10px 24px !important;
                box-shadow: 0 4px 6px -1px rgba(239, 68, 68, 0.3), 0 2px 4px -1px rgba(239, 68, 68, 0.2) !important;
                transition: all 0.2s ease !important;
            }
            .swal2-confirm-dark:hover {
                background: #dc2626 !important;
                box-shadow: 0 6px 8px -1px rgba(239, 68, 68, 0.4), 0 4px 6px -1px rgba(239, 68, 68, 0.3) !important;
                transform: translateY(-1px) !important;
            }
            .swal2-cancel-dark {
                background: #374151 !important;
                border: none !important;
                border-radius: 8px !important;
                color: white !important;
                font-weight: 600 !important;
                padding: 10px 24px !important;
                transition: all 0.2s ease !important;
            }
            @keyframes bellShake {
                0%, 100% { transform: rotate(0deg); }
                10%, 30%, 50%, 70%, 90% { transform: rotate(-10deg); }
                20%, 40%, 60%, 80% { transform: rotate(10deg); }
            }
            .bell-animate {
                animation: bellShake 0.5s ease-in-out;
            }
            @keyframes countSlideDown {
                0% { 
                    transform: translateY(-20px) scale(0.5);
                    opacity: 0;
                }
                50% { 
                    transform: translateY(2px) scale(1.2);
                    opacity: 1;
                }
                70% { 
                    transform: translateY(-3px) scale(0.95);
                }
                100% { 
                    transform: translateY(0) scale(1);
                    opacity: 1;
                }
            }
            .count-animate {
                animation: countSlideDown 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
            }
            .swal2-cancel-dark:hover {
                background: #4b5563 !important;
                transform: translateY(-1px) !important;
            }
            .swal2-actions {
                gap: 12px !important;
                margin-top: 24px !important;
            }
            #notificationList::-webkit-scrollbar {
                width: 2px;
            }
            #notificationList::-webkit-scrollbar-track {
                background: #f8fafc;
                border-radius: 10px;
            }
            #notificationList::-webkit-scrollbar-thumb {
                background: #cbd5e1;
                border-radius: 10px;
            }
            #notificationList::-webkit-scrollbar-thumb:hover {
                background: #94a3b8;
            }
        `;
        document.head.appendChild(style);
        return () => {
            if (document.head.contains(style)) {
                document.head.removeChild(style);
            }
        };
    }, []);

    const navLinks = [
        { name: 'Dashboard', path: '/admin/dashboard', icon: <LayoutDashboard size={18} /> },
        { name: 'Server', path: '/admin/server', icon: <Server size={18} /> },
    ];

    return (
        <nav className="bg-gradient-to-r from-slate-800 to-slate-900 shadow-xl border-b border-slate-700 rounded-lg mx-4 mt-4 text-white">
            <div className="px-4 py-2">
                <div className="flex items-center justify-between h-14">
                    {/* Logo */}
                    <div className="flex items-center space-x-2 flex-shrink-0">
                        <div className="w-8 h-8 bg-gradient-to-br from-slate-600 to-slate-700 rounded-lg flex items-center justify-center">
                            <div className="w-4 h-4 bg-white rounded-sm"></div>
                        </div>
                        <span className="text-xl font-bold whitespace-nowrap">Admin Panel</span>
                    </div>

                    {/* Desktop Nav */}
                    <div className="hidden md:flex flex-1 items-center justify-center px-8 space-x-2">
                        {navLinks.map((link) => (
                            <Link
                                key={link.name}
                                to={link.path}
                                className={`relative flex items-center px-5 py-2.5 rounded-lg font-semibold transition-all duration-200 ${isActive(link.path) 
                                    ? 'bg-slate-700/80 text-white border border-slate-700' 
                                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                                }`}
                            >
                                {isActive(link.path) && (
                                    <div className="absolute left-0 top-1 bottom-1 w-1.5 bg-cyan-400 rounded-r"></div>
                                )}
                                <span className="mr-2">
                                    {isActive(link.path) ? <Menu size={18} className="text-white" /> : link.icon}
                                </span>
                                <span className={`text-sm ${isActive(link.path) ? 'text-white font-bold' : ''}`}>{link.name}</span>
                            </Link>
                        ))}

                        {/* Staff Management Dropdown */}
                        <div className="relative group">
                            <button
                                className={`relative flex items-center px-5 py-2.5 rounded-lg font-semibold transition-all duration-200 ${
                                    isActive('/admin/supportstaff') || isActive('/admin/serverallocationtostaff') 
                                        ? 'bg-slate-700/80 text-white border border-slate-700' 
                                        : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                                }`}
                            >
                                {(isActive('/admin/supportstaff') || isActive('/admin/serverallocationtostaff')) && (
                                    <div className="absolute left-0 top-1 bottom-1 w-1.5 bg-cyan-400 rounded-r"></div>
                                )}
                                <span className="mr-2">
                                    {(isActive('/admin/supportstaff') || isActive('/admin/serverallocationtostaff')) ? <Menu size={18} className="text-white" /> : <Users size={18} />}
                                </span>
                                <span className={`text-sm ${(isActive('/admin/supportstaff') || isActive('/admin/serverallocationtostaff')) ? 'text-white font-bold' : ''}`}>Staff Management</span>
                                <ChevronDown size={14} className="ml-2 opacity-60" />
                            </button>
                            <div className="absolute top-full left-0 mt-0 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                                <ul className="bg-[#1e293b] rounded-xl shadow-2xl border border-slate-700 w-56 py-2">
                                    <li>
                                        <Link 
                                            to="/admin/supportstaff" 
                                            className={`relative flex items-center py-2.5 px-4 rounded-lg transition-all ${
                                                isActive('/admin/supportstaff')
                                                    ? 'bg-slate-700/80 text-white font-semibold'
                                                    : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                                            }`}
                                        >
                                            {isActive('/admin/supportstaff') && (
                                                <div className="absolute left-0 top-1 bottom-1 w-1.5 bg-cyan-400 rounded-r"></div>
                                            )}
                                            <span className="pl-1">Support Staff</span>
                                        </Link>
                                    </li>
                                    <li>
                                        <Link 
                                            to="/admin/serverallocationtostaff" 
                                            className={`relative flex items-center py-2.5 px-4 rounded-lg transition-all ${
                                                isActive('/admin/serverallocationtostaff')
                                                    ? 'bg-slate-700/80 text-white font-semibold'
                                                    : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                                            }`}
                                        >
                                            {isActive('/admin/serverallocationtostaff') && (
                                                <div className="absolute left-0 top-1 bottom-1 w-1.5 bg-cyan-400 rounded-r"></div>
                                            )}
                                            <span className="pl-1">Server Allocation</span>
                                        </Link>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* Reports Dropdown */}
                        <div className="relative group">
                            <button
                                className={`relative flex items-center px-5 py-2.5 rounded-lg font-semibold transition-all duration-200 ${
                                    isActive('/admin/reports') 
                                        ? 'bg-slate-700/80 text-white border border-slate-700' 
                                        : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                                }`}
                            >
                                {isActive('/admin/reports') && (
                                    <div className="absolute left-0 top-1 bottom-1 w-1.5 bg-cyan-400 rounded-r"></div>
                                )}
                                <span className="mr-2">
                                    {isActive('/admin/reports') ? <Menu size={18} className="text-white" /> : <FileText size={18} />}
                                </span>
                                <span className={`text-sm ${isActive('/admin/reports') ? 'text-white font-bold' : ''}`}>Reports</span>
                                <ChevronDown size={14} className="ml-2 opacity-60" />
                            </button>
                            <div className="absolute top-full left-0 mt-0 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                                <ul className="bg-[#1e293b] rounded-xl shadow-2xl border border-slate-700 w-56 py-2">
                                    <li>
                                        <Link 
                                            to="/admin/reports/serverwise" 
                                            className={`relative flex items-center py-2.5 px-4 rounded-lg transition-all ${
                                                isActive('/admin/reports/serverwise')
                                                    ? 'bg-slate-700/80 text-white font-semibold'
                                                    : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                                            }`}
                                        >
                                            {isActive('/admin/reports/serverwise') && (
                                                <div className="absolute left-0 top-1 bottom-1 w-1.5 bg-cyan-400 rounded-r"></div>
                                            )}
                                            <span className="pl-1">Server-Wise</span>
                                        </Link>
                                    </li>
                                    <li>
                                        <Link 
                                            to="/admin/reports/ticketmaster" 
                                            className={`relative flex items-center py-2.5 px-4 rounded-lg transition-all ${
                                                isActive('/admin/reports/ticketmaster')
                                                    ? 'bg-slate-700/80 text-white font-semibold'
                                                    : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                                            }`}
                                        >
                                            {isActive('/admin/reports/ticketmaster') && (
                                                <div className="absolute left-0 top-1 bottom-1 w-1.5 bg-cyan-400 rounded-r"></div>
                                            )}
                                            <span className="pl-1">Ticket Master</span>
                                        </Link>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* User Menu */}
                    <div className="flex items-center space-x-3 flex-shrink-0">
                        <div className="hidden md:block relative group">
                            <button className="w-10 h-10 bg-slate-700 hover:bg-slate-600 text-blue-200 rounded-lg flex items-center justify-center transition-all duration-200">
                                <Settings size={20} />
                            </button>
                            <div className="absolute top-full right-0 mt-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                                <ul className="bg-slate-800 rounded-lg shadow-xl border border-slate-700 w-52 py-2">
                                    <li className="px-4 py-2 text-xs text-slate-400 uppercase font-bold border-b border-slate-700 mb-1">
                                        Settings
                                    </li>
                                    <li>
                                        <Link 
                                            to="/admin/staffcredential" 
                                            className="block px-4 py-2 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                                        >
                                            Staff Credentials
                                        </Link>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* Notification Bell - Only on Dashboard */}
                        {isDashboard && (
                            <div className="hidden md:block relative" ref={notificationRef}>
                                <button
                                    onClick={() => {
                                        setIsNotificationOpen(!isNotificationOpen);
                                        if (!isNotificationOpen) {
                                            // Refresh when opening dropdown
                                            fetchNotifications();
                                        }
                                    }}
                                    className={`w-10 h-10 bg-slate-700 hover:bg-slate-600 text-blue-200 rounded-lg flex items-center justify-center transition-all duration-200 relative ${bellAnimation ? 'bell-animate' : ''}`}
                                >
                                    <Bell size={20} />
                                    {notificationCount > 0 && (
                                        <span className={`absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold ${countAnimation ? 'count-animate' : ''}`}>
                                            {notificationCount > 99 ? '99+' : notificationCount}
                                        </span>
                                    )}
                                </button>
                                {isNotificationOpen && (
                                    <div className="absolute right-0 mt-1 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                                        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                                            <h3 className="text-lg font-semibold text-gray-800">Notifications</h3>
                                            <button
                                                onClick={() => setIsNotificationOpen(false)}
                                                className="text-gray-500 hover:text-gray-700 transition-colors"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>
                                        <div id="notificationList" className="max-h-96 overflow-y-auto" style={{ maxHeight: '310px' }}>
                                            {loadingNotifications ? (
                                                <div className="p-4 text-center text-gray-500">
                                                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-slate-600"></div>
                                                    <p className="mt-2 text-sm">Loading notifications...</p>
                                                </div>
                                            ) : notifications.length === 0 ? (
                                                <div className="p-4 text-center text-gray-500">No new notifications</div>
                                            ) : (
                                                <div className="divide-y divide-gray-100">
                                                    {notifications.map((notification, index) => {
                                                        const formatNotificationDate = (dateStr) => {
                                                            if (!dateStr) return 'N/A';
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
                                                        };

                                                        return (
                                                            <div
                                                                key={index}
                                                                className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                                                                onClick={() => {
                                                                    navigate('/admin/dashboard');
                                                                    setIsNotificationOpen(false);
                                                                }}
                                                            >
                                                                <div className="flex items-start gap-3">
                                                                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                                                                        <CheckCircle2 className="w-4 h-4 text-blue-600" />
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-sm font-semibold text-gray-900">
                                                                            New Ticket: {notification.ticketId}
                                                                        </p>
                                                                        <p className="text-xs text-gray-500 mt-1">
                                                                            {formatNotificationDate(notification.createDate)}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                        {notifications.length > 0 && (
                                            <div className="p-4 border-t border-gray-200 text-center">
                                                <button
                                                    onClick={handleMarkAllAsRead}
                                                    className="text-sm text-slate-600 hover:text-slate-800 font-medium transition-colors"
                                                >
                                                    Mark All as Read
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        <button
                            onClick={handleLogout}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center shadow-lg hover:shadow-xl"
                        >
                            <LogOut size={16} />
                            <span className="ml-2 hidden sm:block whitespace-nowrap">Logout</span>
                        </button>

                        {/* Mobile toggle */}
                        <button 
                            className="md:hidden text-slate-300 hover:text-white transition-colors p-2" 
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        >
                            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>

                {/* Mobile menu */}
                {isMobileMenuOpen && (
                    <div className="md:hidden bg-slate-800/95 border-t border-slate-700 rounded-b-lg mt-2 pb-4 space-y-1 animate-in slide-in-from-top">
                        <Link 
                            to="/admin/dashboard" 
                            className={`block px-4 py-3 text-sm font-medium transition-colors border-b border-slate-700/50 ${
                                isActive('/admin/dashboard') ? 'text-blue-400 bg-slate-700/50' : 'text-slate-300 hover:text-white hover:bg-slate-700/30'
                            }`}
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            <div className="flex items-center">
                                <LayoutDashboard size={18} className="mr-2" />
                                Dashboard
                            </div>
                        </Link>
                        <Link 
                            to="/admin/server" 
                            className={`block px-4 py-3 text-sm font-medium transition-colors border-b border-slate-700/50 ${
                                isActive('/admin/server') ? 'text-blue-400 bg-slate-700/50' : 'text-slate-300 hover:text-white hover:bg-slate-700/30'
                            }`}
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            <div className="flex items-center">
                                <Server size={18} className="mr-2" />
                                Server
                            </div>
                        </Link>
                        <div className="px-4 py-2 text-xs text-slate-400 uppercase font-bold border-b border-slate-700/50">
                            Staff Management
                        </div>
                        <Link 
                            to="/admin/supportstaff" 
                            className="block px-6 py-3 text-sm text-slate-300 hover:text-white hover:bg-slate-700/30 transition-colors border-b border-slate-700/50"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            Support Staff
                        </Link>
                        <Link 
                            to="/admin/serverallocationtostaff" 
                            className="block px-6 py-3 text-sm text-slate-300 hover:text-white hover:bg-slate-700/30 transition-colors border-b border-slate-700/50"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            Server Allocation
                        </Link>
                        <div className="px-4 py-2 text-xs text-slate-400 uppercase font-bold border-b border-slate-700/50">
                            Reports
                        </div>
                        <Link 
                            to="/admin/reports/serverwise" 
                            className="block px-6 py-3 text-sm text-slate-300 hover:text-white hover:bg-slate-700/30 transition-colors border-b border-slate-700/50"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            Server-Wise
                        </Link>
                        <Link 
                            to="/admin/reports/ticketmaster" 
                            className="block px-6 py-3 text-sm text-slate-300 hover:text-white hover:bg-slate-700/30 transition-colors"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            Ticket Master
                        </Link>
                    </div>
                )}
            </div>
        </nav>
    );
};

export default AdminNavbar;
