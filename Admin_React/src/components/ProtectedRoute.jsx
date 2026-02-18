import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute component for Admin routes
 * Redirects to admin login if not authenticated or if user is not an admin
 */
export const AdminProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    // Show loading state while checking authentication
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    // Check if user is authenticated and has ADMIN role
    if (!user || user.role !== 'ADMIN') {
        // Store the attempted URL for redirect after login
        localStorage.setItem('redirectAfterLogin', location.pathname);

        // If user is logged in but not an admin, show access denied
        if (user && user.role === 'SUPPORTSTAFF') {
            return <Navigate to="/admin/login" replace state={{
                message: 'Access Denied: You do not have permission to access the Admin panel.'
            }} />;
        }

        return <Navigate to="/admin/login" replace />;
    }

    return children;
};

/**
 * ProtectedRoute component for Support Staff routes
 * Redirects to support staff login if not authenticated or if user is not support staff
 */
export const SupportStaffProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    // Show loading state while checking authentication
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            </div>
        );
    }

    // Check if user is authenticated and has SUPPORTSTAFF role
    if (!user || user.role !== 'SUPPORTSTAFF') {
        // Store the attempted URL for redirect after login
        localStorage.setItem('redirectAfterLogin', location.pathname);

        // If user is logged in but not support staff, show access denied
        if (user && user.role === 'ADMIN') {
            return <Navigate to="/support/login" replace state={{
                message: 'Access Denied: You do not have permission to access the Support Staff panel.'
            }} />;
        }

        return <Navigate to="/support/login" replace />;
    }

    return children;
};
