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
            {/* Match navbar horizontal spacing (mx-4) using px-4 here */}
            <main className="flex-1 px-4 pb-4 pt-0 w-full overflow-hidden">
                <Outlet />
            </main>
        </div>
    );
};

export default SupportStaffLayout;

