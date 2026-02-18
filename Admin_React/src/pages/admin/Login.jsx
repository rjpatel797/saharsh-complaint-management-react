import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import apiClient from '../../api/apiClient';
import logo from '../../assets/logo.jpeg';
import { useAuth } from '../../context/AuthContext';

const AdminLogin = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [errors, setErrors] = useState({});
    const [sessionTimeoutMessage, setSessionTimeoutMessage] = useState('');

    const navigate = useNavigate();
    const location = useLocation();
    const { loginAdmin, user } = useAuth();
    const hasNavigatedRef = useRef(false);
    const isInitialMountRef = useRef(true);

    // Reset refs when component mounts (in case of remount)
    useEffect(() => {
        hasNavigatedRef.current = false;
        isInitialMountRef.current = true;
    }, []);

    // Check for session timeout message from location state
    useEffect(() => {
        if (location.state?.sessionTimeout) {
            setSessionTimeoutMessage('Your session has expired due to inactivity. Please login again.');
            // Clear other messages
            setErrorMessage('');
            setSuccessMessage('');
            // Clear the state to prevent showing message on refresh
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state, navigate]);

    // Check if user is already logged in and redirect
    useEffect(() => {
        // Only check once on mount
        if (!isInitialMountRef.current) return;
        if (hasNavigatedRef.current) return;

        const adminToken = localStorage.getItem('adminToken');
        const adminRole = localStorage.getItem('adminRole');
        
        // Only redirect if we have valid token AND user state matches
        if (adminToken && adminRole === 'ADMIN' && user && user.role === 'ADMIN') {
            hasNavigatedRef.current = true;
            isInitialMountRef.current = false;
            navigate('/admin/dashboard', { replace: true });
            return;
        }

        // Mark initial mount as complete
        isInitialMountRef.current = false;
    }, []); // Empty dependency array - only run once on mount

    // Separate effect to handle user state changes after login (only after successful login)
    useEffect(() => {
        // Don't run on initial mount
        if (isInitialMountRef.current) return;
        
        // Only navigate if:
        // 1. User state exists and is ADMIN
        // 2. We have a token in localStorage (user just logged in)
        // 3. We haven't navigated yet
        // 4. We're still on login page
        const adminToken = localStorage.getItem('adminToken');
        if (user && user.role === 'ADMIN' && adminToken && !hasNavigatedRef.current) {
            hasNavigatedRef.current = true;
            // Small delay to ensure state is stable
            const timer = setTimeout(() => {
                navigate('/admin/dashboard', { replace: true });
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [user, navigate]);

    // Auto-hide messages after 5 seconds
    useEffect(() => {
        if (!errorMessage) return;
        const id = setTimeout(() => setErrorMessage(''), 5000);
        return () => clearTimeout(id);
    }, [errorMessage]);

    useEffect(() => {
        if (!successMessage) return;
        const id = setTimeout(() => setSuccessMessage(''), 5000);
        return () => clearTimeout(id);
    }, [successMessage]);

    const validate = () => {
        const newErrors = {};
        if (!username.trim()) newErrors.username = 'Please fill out this field.';
        if (!password.trim()) newErrors.password = 'Please fill out this field.';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setIsLoading(true);
        setErrorMessage('');
        setSuccessMessage('');
        setSessionTimeoutMessage('');

        try {
            const response = await apiClient.post(`/admin/login?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`);
            const data = response.data;

            if (data.status && data.data) {
                loginAdmin(data.data.token, data.data.username, data.data.role);
                setSuccessMessage('Login successful! Redirecting...');
                setTimeout(() => {
                    navigate('/admin/dashboard');
                }, 1200);
            } else {
                setErrorMessage(data.message || 'Access denied. Check your credentials.');
            }
        } catch (error) {
            setErrorMessage(error.response?.data?.message || 'Network error. Please try again later.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-screen flex items-center justify-center bg-[#272a27] px-5 py-12 font-['Plus_Jakarta_Sans',sans-serif] overflow-hidden">
            <div className="w-full max-w-[1050px] bg-white rounded-[40px] overflow-y-auto p-5 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] flex max-h-[calc(100vh-6rem)]">
                <div className="flex w-full gap-8">
                    {/* Visual Section */}
                    <section className="flex-1 bg-black bg-cover bg-center rounded-[32px] p-12 flex flex-col justify-center text-white relative overflow-hidden hidden lg:flex"
                        style={{ backgroundImage: "linear-gradient(to bottom, rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.7)), url('https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&q=80&w=1000')" }}>
                        <div className="absolute bottom-[-10%] left-[-10%] w-[120%] h-[60%] bg-[radial-gradient(circle_at_center,rgba(249,115,22,0.4)_0%,transparent_70%)] blur-[40px] z-10" />
                        <div className="relative z-20">
                            <h1 className="text-[36px] font-bold leading-[1.2] mb-4 tracking-tight">
                                Convert your <br />
                                complaints into <br />
                                successful <br />
                                resolutions.
                            </h1>
                        </div>
                    </section>

                    {/* Form Section */}
                    <section className="flex-1 flex flex-col items-center justify-center p-5 lg:pr-10 lg:pl-0">
                        <div className="w-full max-w-[380px]">
                            <header className="mb-7 flex flex-col items-center">
                                <div className="mb-5 w-full flex justify-center">
                                    <div className="w-[100px] h-[100px] flex items-center justify-center">
                                        <img src={logo} alt="SaHarsh Logo" className="w-[450%] h-[450%] object-contain" />
                                    </div>
                                </div>
                                <div className="w-full text-center">
                                    <h2 className="text-[17px] font-semibold text-[#374151] leading-[1.2]">Welcome to SaHarsh — Admin Portal</h2>
                                </div>
                            </header>

                            <div className="h-[1px] bg-[#e2e8f0] w-full mb-7"></div>

                            <form onSubmit={handleLogin} className="flex flex-col gap-5" noValidate>
                                <div className="flex flex-col gap-2 relative">
                                    <label className="text-[14px] font-semibold text-[#1e293b]">User email or username</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={username}
                                            onChange={(e) => {
                                                setUsername(e.target.value);
                                                if (errors.username) setErrors({ ...errors, username: '' });
                                            }}
                                            placeholder="admin@saharsh.com"
                                            className={`w-full px-4 py-3.5 bg-[#f8fafc] border-[1.5px] rounded-xl text-[15px] transition-all duration-200 text-[#1e293b] focus:border-[#f97316] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#f97316]/10 ${errors.username ? 'border-[#f97316] bg-[#fffaf0]' : 'border-[#e2e8f0]'}`}
                                        />
                                        {errors.username && (
                                            <div className="absolute top-[calc(100%+10px)] left-5 mt-1 bg-white p-3 rounded-xl shadow-lg border border-[#e2e8f0] flex items-center gap-2 z-[100] text-sm font-medium text-[#1e293b] animate-[tooltip-fade-in_0.2s_ease-out]">
                                                <AlertCircle size={18} className="text-[#f97316]" />
                                                <span>{errors.username}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2 relative">
                                    <label className="text-[14px] font-semibold text-[#1e293b]">Enter your password</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => {
                                                setPassword(e.target.value);
                                                if (errors.password) setErrors({ ...errors, password: '' });
                                            }}
                                            placeholder="••••••••••••"
                                            className={`w-full px-4 py-3.5 bg-[#f8fafc] border-[1.5px] rounded-xl text-[15px] transition-all duration-200 text-[#1e293b] focus:border-[#f97316] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#f97316]/10 ${errors.password ? 'border-[#f97316] bg-[#fffaf0]' : 'border-[#e2e8f0]'}`}
                                        />
                                        <button
                                            type="button"
                                            className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none text-[#64748b] cursor-pointer hover:text-[#f97316] p-2 flex items-center justify-center"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                        </button>
                                        {errors.password && (
                                            <div className="absolute top-[calc(100%+10px)] left-5 mt-1 bg-white p-3 rounded-xl shadow-lg border border-[#e2e8f0] flex items-center gap-2 z-[100] text-sm font-medium text-[#1e293b] animate-[tooltip-fade-in_0.2s_ease-out]">
                                                <AlertCircle size={18} className="text-[#f97316]" />
                                                <span>{errors.password}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <button type="submit" className="w-full p-3 bg-[#f97316] text-white border-none rounded-xl text-sm font-semibold cursor-pointer transition-all duration-200 mt-[10px] flex items-center justify-center gap-3 hover:bg-[#ea580c] hover:-translate-y-px active:translate-y-0 shadow-lg shadow-orange-500/10 disabled:opacity-70 disabled:cursor-not-allowed" disabled={isLoading}>
                                    {isLoading ? (
                                        <>
                                            <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="custom-loader">
                                                <circle cx="12" cy="3" r="2" fill="currentColor" opacity="1" />
                                                <circle cx="18.36" cy="5.64" r="2" fill="currentColor" opacity="0.875" />
                                                <circle cx="21" cy="12" r="2" fill="currentColor" opacity="0.75" />
                                                <circle cx="18.36" cy="18.36" r="2" fill="currentColor" opacity="0.625" />
                                                <circle cx="12" cy="21" r="2" fill="currentColor" opacity="0.5" />
                                                <circle cx="5.64" cy="18.36" r="2" fill="currentColor" opacity="0.375" />
                                                <circle cx="3" cy="12" r="2" fill="currentColor" opacity="0.25" />
                                                <circle cx="5.64" cy="5.64" r="2" fill="currentColor" opacity="0.125" />
                                            </svg>
                                            Authenticating...
                                        </>
                                    ) : (
                                        'Access Portal'
                                    )}
                                </button>
                            </form>

                            <p className="mt-8 text-center text-sm text-[#64748b]">
                                Don't have an account? <a href="#" className="text-[#f97316] font-semibold hover:underline">Contact Admin</a>
                            </p>

                            {sessionTimeoutMessage && (
                                <div className="mt-6 p-3 bg-[#fef3c7] border border-[#f59e0b] text-[#92400e] rounded-xl text-[13px] text-center animate-in fade-in slide-in-from-top-1 flex items-center justify-center gap-2">
                                    <AlertCircle size={16} className="text-[#f59e0b] flex-shrink-0" />
                                    <span className="font-medium whitespace-nowrap">{sessionTimeoutMessage}</span>
                                </div>
                            )}
                            {errorMessage && (
                                <div className="mt-6 p-3 bg-[#fee2e2] text-[#ef4444] rounded-xl text-[13px] text-center animate-in fade-in slide-in-from-top-1">
                                    {errorMessage}
                                </div>
                            )}
                            {successMessage && (
                                <div className="mt-6 p-3 bg-[#dcfce7] text-[#22c55e] rounded-xl text-[13px] text-center animate-in fade-in slide-in-from-top-1">
                                    {successMessage}
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};


export default AdminLogin;
