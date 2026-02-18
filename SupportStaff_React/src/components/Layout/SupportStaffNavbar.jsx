import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    LogOut,
    Menu,
    X,
    FileText,
    User,
    Bell,
    BarChart3,
    ChevronDown,
    CheckCircle2
} from 'lucide-react';
import Swal from 'sweetalert2';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../api/apiClient';

const SupportStaffNavbar = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [notificationCount, setNotificationCount] = useState(0);
    const [loadingNotifications, setLoadingNotifications] = useState(false);
    const [bellAnimation, setBellAnimation] = useState(false);
    const [countAnimation, setCountAnimation] = useState(false);
    const [countZoomAnimation, setCountZoomAnimation] = useState(false);
    const prevNotificationCountRef = useRef(0);
    const location = useLocation();
    const navigate = useNavigate();
    const { logout, user } = useAuth();
    const username = user?.username || localStorage.getItem('ssEmployee') || 'Support Staff';
    const notificationRef = useRef(null);
    const notificationsFetchedRef = useRef(false);
    const isFetchingNotificationsRef = useRef(false);
    const isDashboard = location.pathname === '/support/dashboard' || location.pathname.startsWith('/support/dashboard/');

    const isActive = (path) => {
        if (path === '/support/dashboard') {
            return location.pathname === '/support/dashboard' || location.pathname === '/support/dashboard/';
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
                logout();
                navigate('/support/login');
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
            const response = await apiClient.get('/supportstaff/getSupportStaffNotifications');
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
            const response = await apiClient.post('/supportstaff/notifications/markSeen');
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
                
                // Trigger zoom animation for count number
                setCountZoomAnimation(true);
                const zoomTimeout = setTimeout(() => {
                    setCountZoomAnimation(false);
                }, 800);
                
                prevNotificationCountRef.current = notificationCount;
                return () => {
                    clearTimeout(bellTimeout);
                    clearTimeout(countTimeout);
                    clearTimeout(zoomTimeout);
                };
            }
            
            prevNotificationCountRef.current = notificationCount;
            return () => {
                clearTimeout(bellTimeout);
            };
        }
    }, [notificationCount]);

    // Add custom styles
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
                background: #e9d5ff;
                border-radius: 10px;
            }
            #notificationList::-webkit-scrollbar-thumb:hover {
                background: #a855f7;
            }
            @keyframes bell-shake {
                0%, 100% { transform: rotate(0deg); }
                10%, 30%, 50%, 70%, 90% { transform: rotate(-10deg); }
                20%, 40%, 60%, 80% { transform: rotate(10deg); }
            }
            .bell-animate {
                animation: bell-shake 0.6s ease-in-out;
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
            @keyframes countZoom {
                0% { 
                    transform: scale(0.3) rotate(-10deg);
                    opacity: 0;
                    text-shadow: 0 0 0px rgba(255, 255, 255, 0);
                }
                30% { 
                    transform: scale(2.2) rotate(5deg);
                    opacity: 1;
                    text-shadow: 0 0 15px rgba(255, 255, 255, 0.8), 0 0 25px rgba(255, 255, 255, 0.6);
                }
                50% { 
                    transform: scale(1.8) rotate(-3deg);
                    text-shadow: 0 0 10px rgba(255, 255, 255, 0.6);
                }
                70% { 
                    transform: scale(1.3) rotate(2deg);
                    text-shadow: 0 0 5px rgba(255, 255, 255, 0.4);
                }
                85% { 
                    transform: scale(1.1) rotate(-1deg);
                    text-shadow: 0 0 2px rgba(255, 255, 255, 0.2);
                }
                100% { 
                    transform: scale(1) rotate(0deg);
                    opacity: 1;
                    text-shadow: 0 0 0px rgba(255, 255, 255, 0);
                }
            }
            .count-zoom-animate {
                animation: countZoom 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
                display: inline-block;
                transform-origin: center center;
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
        <nav className="bg-gradient-to-r from-purple-800 to-purple-900 shadow-xl border-b border-purple-700 rounded-lg mx-4 mt-4 text-white">
            <div className="px-4 py-1.5">
                <div className="flex items-center justify-between h-12">
                    {/* Logo */}
                    <div className="flex items-center space-x-2 flex-shrink-0">
                        <div className="w-7 h-7 bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg flex items-center justify-center">
                            <div className="w-3 h-3 bg-white rounded-sm"></div>
                        </div>
                        <span className="text-lg font-bold whitespace-nowrap">Support Staff</span>
                    </div>

                    {/* Desktop Nav */}
                    <div className="hidden md:flex flex-1 items-center justify-center px-6 space-x-1.5">
                        {/* Dashboard */}
                        <Link
                            to="/support/dashboard"
                            className={`relative flex items-center px-4 py-1.5 rounded-lg font-semibold transition-all duration-200 ${
                                isActive('/support/dashboard') 
                                    ? 'bg-purple-700/80 text-white border border-purple-700' 
                                    : 'text-purple-200 hover:text-white hover:bg-purple-700/50'
                            }`}
                        >
                            {isActive('/support/dashboard') && (
                                <div className="absolute left-0 top-0.5 bottom-0.5 w-1 bg-cyan-400 rounded-r"></div>
                            )}
                            <span className="mr-1.5">
                                {isActive('/support/dashboard') ? <Menu size={17} className="text-white" /> : <LayoutDashboard size={17} />}
                            </span>
                            <span className={`text-xs ${isActive('/support/dashboard') ? 'text-white font-bold' : ''}`}>Dashboard</span>
                        </Link>

                        {/* Reports Dropdown */}
                        <div className="relative group">
                            <button
                                className={`relative flex items-center px-4 py-1.5 rounded-lg font-semibold transition-all duration-200 ${
                                    isActive('/support/reports') 
                                        ? 'bg-purple-700/80 text-white border border-purple-700' 
                                        : 'text-purple-200 hover:text-white hover:bg-purple-700/50'
                                }`}
                            >
                                {isActive('/support/reports') && (
                                    <div className="absolute left-0 top-0.5 bottom-0.5 w-1 bg-cyan-400 rounded-r"></div>
                                )}
                                <span className="mr-1.5">
                                    {isActive('/support/reports') ? <Menu size={17} className="text-white" /> : <FileText size={17} />}
                                </span>
                                <span className={`text-xs ${isActive('/support/reports') ? 'text-white font-bold' : ''}`}>Reports</span>
                                <ChevronDown size={13} className="ml-1.5 opacity-60" />
                            </button>
                            <div className="absolute top-full left-0 mt-0 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                                <ul className="bg-[#3b0764] rounded-xl shadow-2xl border border-purple-700 w-52 py-1.5">
                                    <li>
                                        <Link 
                                            to="/support/reports/staffmaster" 
                                            className={`relative flex items-center py-2 px-3 rounded-lg transition-all text-sm ${
                                                isActive('/support/reports/staffmaster')
                                                    ? 'bg-purple-700/80 text-white font-semibold'
                                                    : 'text-purple-200 hover:bg-purple-700/50 hover:text-white'
                                            }`}
                                        >
                                            {isActive('/support/reports/staffmaster') && (
                                                <div className="absolute left-0 top-0.5 bottom-0.5 w-1 bg-cyan-400 rounded-r"></div>
                                            )}
                                            <span className="pl-1">Staff Master</span>
                                        </Link>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* Profile */}
                        <Link
                            to="/support/profile"
                            className={`relative flex items-center px-4 py-1.5 rounded-lg font-semibold transition-all duration-200 ${
                                isActive('/support/profile') 
                                    ? 'bg-purple-700/80 text-white border border-purple-700' 
                                    : 'text-purple-200 hover:text-white hover:bg-purple-700/50'
                            }`}
                        >
                            {isActive('/support/profile') && (
                                <div className="absolute left-0 top-0.5 bottom-0.5 w-1 bg-cyan-400 rounded-r"></div>
                            )}
                            <span className="mr-1.5">
                                {isActive('/support/profile') ? <Menu size={17} className="text-white" /> : <User size={17} />}
                            </span>
                            <span className={`text-xs ${isActive('/support/profile') ? 'text-white font-bold' : ''}`}>Profile</span>
                        </Link>
                    </div>

                    {/* User Menu */}
                    <div className="flex items-center space-x-2 flex-shrink-0">
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
                                    className={`w-9 h-9 bg-purple-700 hover:bg-purple-600 text-purple-200 rounded-lg flex items-center justify-center transition-all duration-200 relative ${bellAnimation ? 'bell-animate' : ''}`}
                                >
                                    <Bell size={19} />
                                    {notificationCount > 0 && (
                                        <span className={`absolute -top-0.5 -right-0.5 bg-red-500 text-white rounded-full h-4 w-4 flex items-center justify-center font-semibold text-[10px] ${countAnimation ? 'count-animate' : ''}`}>
                                            <span className={countZoomAnimation ? 'count-zoom-animate' : ''}>
                                                {notificationCount > 99 ? '99+' : notificationCount}
                                            </span>
                                        </span>
                                    )}
                                </button>
                                {isNotificationOpen && (
                                    <div className="absolute right-0 mt-1 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                                        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                                            <h3 className="text-lg font-semibold text-gray-800">Notifications</h3>
                                            <button
                                                onClick={() => setIsNotificationOpen(false)}
                                                className="p-1.5 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-600 hover:text-gray-700 transition-all duration-200"
                                            >
                                                <X className="w-5 h-5 transition-transform duration-300 hover:rotate-90" />
                                            </button>
                                        </div>
                                        <div id="notificationList" className="max-h-96 overflow-y-auto" style={{ maxHeight: '310px' }}>
                                            {loadingNotifications ? (
                                                <div className="p-4 text-center text-gray-500">
                                                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
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
                                                                    navigate('/support/dashboard');
                                                                    setIsNotificationOpen(false);
                                                                }}
                                                            >
                                                                <div className="flex items-start gap-3">
                                                                    <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mt-0.5">
                                                                        <CheckCircle2 className="w-4 h-4 text-purple-600" />
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
                                                    className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
                                                >
                                                    Mark All as Read
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Logout Button */}
                        <button
                            onClick={handleLogout}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center shadow-lg hover:shadow-xl"
                        >
                            <LogOut size={16} />
                            <span className="ml-2 hidden sm:block whitespace-nowrap">Logout</span>
                        </button>

                        {/* Mobile toggle */}
                        <button 
                            className="md:hidden text-purple-200 hover:text-white transition-colors p-1.5" 
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        >
                            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>
                    </div>
                </div>

                {/* Mobile menu */}
                {isMobileMenuOpen && (
                    <div className="md:hidden bg-purple-800/95 border-t border-purple-700 rounded-b-lg mt-2 pb-4 space-y-1 animate-in slide-in-from-top">
                        <Link 
                            to="/support/dashboard" 
                            className={`block px-4 py-3 text-sm font-medium transition-colors border-b border-purple-700/50 ${
                                isActive('/support/dashboard') ? 'text-cyan-400 bg-purple-700/50' : 'text-purple-200 hover:text-white hover:bg-purple-700/30'
                            }`}
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            <div className="flex items-center">
                                <LayoutDashboard size={18} className="mr-2" />
                                Dashboard
                            </div>
                        </Link>
                        <div className="px-4 py-2 text-xs text-purple-300 uppercase font-bold border-b border-purple-700/50">
                            Reports
                        </div>
                        <Link 
                            to="/support/reports/staffmaster" 
                            className="block px-6 py-3 text-sm text-purple-200 hover:text-white hover:bg-purple-700/30 transition-colors border-b border-purple-700/50"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            Staff Master
                        </Link>
                        <Link 
                            to="/support/profile" 
                            className={`block px-4 py-3 text-sm font-medium transition-colors ${
                                isActive('/support/profile') ? 'text-cyan-400 bg-purple-700/50' : 'text-purple-200 hover:text-white hover:bg-purple-700/30'
                            }`}
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            <div className="flex items-center">
                                <User size={18} className="mr-2" />
                                Profile
                            </div>
                        </Link>
                    </div>
                )}
            </div>
        </nav>
    );
};

export default SupportStaffNavbar;
