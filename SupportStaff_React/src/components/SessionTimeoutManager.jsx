import React, { useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import { useAuth } from '../context/AuthContext';

const SessionTimeoutManager = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { logout, user } = useAuth();
    const timeoutRef = useRef(null);
    const warningTimeoutRef = useRef(null);
    const warningShownRef = useRef(false);

    // Session timeout duration: 10 minutes
    const SESSION_TIMEOUT = 10 * 60 * 1000; // 10 minutes
    // Warning before timeout: 10 seconds before
    const WARNING_BEFORE_TIMEOUT = 10 * 1000; // 10 seconds before timeout

    // Check if user is on a protected support staff route (not login page)
    const isProtectedRoute = () => {
        const path = location.pathname;
        return path.includes('/support/') && !path.includes('/support/login');
    };

    // Handle session timeout
    const handleSessionTimeout = useCallback(() => {
        // Clear all timers
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        if (warningTimeoutRef.current) {
            clearTimeout(warningTimeoutRef.current);
        }

        // Only logout if user is still logged in and is support staff
        if (user && isProtectedRoute()) {
            logout();
            navigate('/support/login', { 
                replace: true,
                state: { sessionTimeout: true }
            });
        }
    }, [user, location.pathname, logout, navigate]);

    // Show warning dialog
    const showWarning = useCallback(() => {
        if (warningShownRef.current || !user || !isProtectedRoute()) {
            return;
        }

        warningShownRef.current = true;

        let timerInterval;
        const warningDuration = WARNING_BEFORE_TIMEOUT / 1000; // Convert to seconds
        let timeLeft = warningDuration;

        Swal.fire({
            title: 'Session Timeout Warning',
            html: `
                <div style="text-align: center;">
                    <p style="font-size: 18px; margin-bottom: 20px; color: #333;">
                        Your session will expire in <strong style="color: #dc2626; font-size: 24px;" id="countdown">${warningDuration}</strong> seconds due to inactivity.
                    </p>
                    <p style="font-size: 14px; color: #666;">
                        Would you like to continue your session?
                    </p>
                </div>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Continue Session',
            cancelButtonText: 'Logout',
            confirmButtonColor: '#3b82f6',
            cancelButtonColor: '#dc2626',
            allowOutsideClick: false,
            allowEscapeKey: false,
            timer: WARNING_BEFORE_TIMEOUT, // Match warning duration
            timerProgressBar: true,
            didOpen: () => {
                const countdownElement = document.getElementById('countdown');
                timerInterval = setInterval(() => {
                    timeLeft--;
                    if (countdownElement) {
                        countdownElement.textContent = timeLeft;
                    }
                    if (timeLeft <= 0) {
                        clearInterval(timerInterval);
                    }
                }, 1000);
            },
            willClose: () => {
                if (timerInterval) {
                    clearInterval(timerInterval);
                }
                // Clear the warning flag when dialog closes
                warningShownRef.current = false;
            }
        }).then((result) => {
            if (timerInterval) {
                clearInterval(timerInterval);
            }
            if (result.isConfirmed) {
                // User clicked "Continue Session" - reset timers manually
                warningShownRef.current = false;
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                }
                if (warningTimeoutRef.current) {
                    clearTimeout(warningTimeoutRef.current);
                }
                
                // Reset timers
                if (user && isProtectedRoute()) {
                    warningTimeoutRef.current = setTimeout(() => {
                        showWarning();
                    }, SESSION_TIMEOUT - WARNING_BEFORE_TIMEOUT);
                    timeoutRef.current = setTimeout(() => {
                        handleSessionTimeout();
                    }, SESSION_TIMEOUT);
                }
                
                Swal.fire({
                    title: 'Session Extended',
                    text: 'Your session has been extended. You can continue working.',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });
            } else if (result.dismiss === Swal.DismissReason.timer || result.dismiss === Swal.DismissReason.cancel) {
                // Timer expired or user clicked logout
                handleSessionTimeout();
            }
        });
    }, [user, location.pathname, handleSessionTimeout]);

    // Reset session timer
    const resetSessionTimer = useCallback(() => {
        // Clear existing timers
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        if (warningTimeoutRef.current) {
            clearTimeout(warningTimeoutRef.current);
        }
        warningShownRef.current = false;

        // Only set timer if user is logged in and on protected route
        if (!user || !isProtectedRoute()) {
            return;
        }

        // Set warning timer (10 seconds before timeout)
        warningTimeoutRef.current = setTimeout(() => {
            showWarning();
        }, SESSION_TIMEOUT - WARNING_BEFORE_TIMEOUT);

        // Set main timeout timer
        timeoutRef.current = setTimeout(() => {
            handleSessionTimeout();
        }, SESSION_TIMEOUT);
    }, [user, location.pathname, showWarning, handleSessionTimeout]);

    // Track user activity
    useEffect(() => {
        if (!user || !isProtectedRoute()) {
            return;
        }

        // Activity events to track
        const activityEvents = [
            'mousedown',
            'mousemove',
            'keypress',
            'scroll',
            'touchstart',
            'click'
        ];

        // Activity handler
        const handleActivity = () => {
            // Only reset if warning is not currently shown
            if (!warningShownRef.current) {
                resetSessionTimer();
            }
        };

        // Add event listeners
        activityEvents.forEach(event => {
            window.addEventListener(event, handleActivity, { passive: true });
        });

        // Initialize timer on mount
        resetSessionTimer();

        // Cleanup
        return () => {
            activityEvents.forEach(event => {
                window.removeEventListener(event, handleActivity);
            });
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            if (warningTimeoutRef.current) {
                clearTimeout(warningTimeoutRef.current);
            }
        };
    }, [user, location.pathname, resetSessionTimer]);

    // Reset timer when user changes or route changes
    useEffect(() => {
        if (user && isProtectedRoute()) {
            resetSessionTimer();
        } else {
            // Clear timers if user logs out or goes to login page
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            if (warningTimeoutRef.current) {
                clearTimeout(warningTimeoutRef.current);
            }
            warningShownRef.current = false;
        }
    }, [user, location.pathname, resetSessionTimer]);

    // This component doesn't render anything
    return null;
};

export default SessionTimeoutManager;

