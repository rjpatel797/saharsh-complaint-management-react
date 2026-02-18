import React, { useEffect } from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import AdminNavbar from './AdminNavbar';

const AdminLayout = () => {
    const token = localStorage.getItem('adminToken');
    const navigate = useNavigate();

    useEffect(() => {
        if (!token) {
            navigate('/admin/login');
        }
    }, [token, navigate]);

    if (!token) {
        return <Navigate to="/admin/login" replace />;
    }

    return (
        <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
            <AdminNavbar />
            {/* Match navbar horizontal spacing (mx-4) using px-4 here */}
            <main className="flex-1 px-4 pb-4 pt-0 w-full overflow-hidden">
                <Outlet />
            </main>
        </div>
    );
};

export default AdminLayout;
