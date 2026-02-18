import React, { useEffect } from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import SupportStaffNavbar from './SupportStaffNavbar';

const SupportStaffLayout = () => {
    const token = localStorage.getItem('ssToken');
    const navigate = useNavigate();

    useEffect(() => {
        if (!token) {
            navigate('/support/login');
        }
    }, [token, navigate]);

    if (!token) {
        return <Navigate to="/support/login" replace />;
    }

    return (
        <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
            <SupportStaffNavbar />
            <main className="flex-1 p-4 w-full overflow-hidden">
                <Outlet />
            </main>
        </div>
    );
};

export default SupportStaffLayout;

