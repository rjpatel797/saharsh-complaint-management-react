import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check for existing authentication on mount
        checkAuth();
    }, []);

    const checkAuth = () => {
        try {
            // Check for admin authentication
            const adminToken = localStorage.getItem('adminToken');
            const adminUsername = localStorage.getItem('adminUsername');
            const adminRole = localStorage.getItem('adminRole');

            if (adminToken && adminRole === 'ADMIN') {
                setUser({
                    token: adminToken,
                    username: adminUsername,
                    role: 'ADMIN'
                });
                setLoading(false);
                return;
            }

            // Check for support staff authentication
            const ssToken = localStorage.getItem('ssToken');
            const ssUsername = localStorage.getItem('ssEmployee');
            const ssRole = localStorage.getItem('ssRole');

            if (ssToken && ssRole === 'SUPPORTSTAFF') {
                setUser({
                    token: ssToken,
                    username: ssUsername,
                    role: 'SUPPORTSTAFF'
                });
                setLoading(false);
                return;
            }

            // No valid authentication found
            setUser(null);
            setLoading(false);
        } catch (error) {
            console.error('Error checking authentication:', error);
            setUser(null);
            setLoading(false);
        }
    };

    const loginAdmin = (token, username, role) => {
        // Store in localStorage only
        localStorage.setItem('adminToken', token);
        localStorage.setItem('adminUsername', username);
        localStorage.setItem('adminRole', role);

        setUser({
            token,
            username,
            role
        });
    };

    const loginSupportStaff = (token, username, role) => {
        // Store in localStorage only
        localStorage.setItem('ssToken', token);
        localStorage.setItem('ssEmployee', username);
        localStorage.setItem('ssRole', role);

        setUser({
            token,
            username,
            role
        });
    };

    const logout = () => {
        // Clear admin data
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUsername');
        localStorage.removeItem('adminRole');
        localStorage.removeItem('adminRememberMe');

        // Clear support staff data
        localStorage.removeItem('ssToken');
        localStorage.removeItem('ssEmployee');
        localStorage.removeItem('ssRole');
        localStorage.removeItem('ssRememberMe');

        setUser(null);
    };

    const value = {
        user,
        loading,
        loginAdmin,
        loginSupportStaff,
        logout,
        checkAuth
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default AuthContext;
