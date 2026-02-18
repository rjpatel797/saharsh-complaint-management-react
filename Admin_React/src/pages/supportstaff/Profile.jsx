import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Edit2, RefreshCw, X, Mail, Phone, Calendar, User, Shield, CheckCircle, XCircle, Clock } from 'lucide-react';
import apiClient from '../../api/apiClient';
import Swal from 'sweetalert2';

const Profile = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [profile, setProfile] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        fullname: '',
        email: '',
        contactnumber: ''
    });
    const [formErrors, setFormErrors] = useState({});
    const [formMessage, setFormMessage] = useState({ show: false, text: '', type: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Load profile data
    const loadProfile = async (isRefresh = false) => {
        // Only show full page loading on initial load, not on refresh
        if (!isRefresh) {
            setLoading(true);
        } else {
            setRefreshing(true);
        }
        
        try {
            const token = localStorage.getItem('ssToken');
            if (!token) {
                navigate('/support/login');
                return;
            }

            const response = await apiClient.get('/supportstaff/getStaffDetails');

            if (response.data.status && response.data.data) {
                setProfile(response.data.data);
                if (response.data.data.username) {
                    localStorage.setItem('ssEmployee', response.data.data.username);
                }
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: response.data.message || 'Failed to load profile',
                    confirmButtonColor: '#8b5cf6'
                });
            }
        } catch (error) {
            console.error('Error loading profile:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.response?.data?.message || 'Failed to load profile. Please try again.',
                confirmButtonColor: '#8b5cf6'
            });
        } finally {
            if (!isRefresh) {
                setLoading(false);
            } else {
                setRefreshing(false);
            }
        }
    };

    useEffect(() => {
        loadProfile();
    }, []);

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    // Get initials
    const getInitials = (username) => {
        if (!username) return 'S';
        return username.charAt(0).toUpperCase();
    };

    // Open edit modal
    const openEditModal = () => {
        if (!profile) {
            Swal.fire({
                icon: 'warning',
                title: 'Warning',
                text: 'Profile data not loaded. Please refresh and try again.',
                confirmButtonColor: '#8b5cf6'
            });
            return;
        }

        setFormData({
            username: profile.username || '',
            password: profile.password || '',
            fullname: profile.fullname || '',
            email: profile.email || '',
            contactnumber: profile.contactNumber || ''
        });
        setFormErrors({});
        setFormMessage({ show: false, text: '', type: '' });
        setIsEditModalOpen(true);
        document.body.style.overflow = 'hidden';
    };

    // Close edit modal
    const closeEditModal = () => {
        setIsEditModalOpen(false);
        setFormErrors({});
        setFormMessage({ show: false, text: '', type: '' });
        setIsSubmitting(false);
        document.body.style.overflow = '';
    };

    // Handle input change
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name === 'contactnumber') {
            const digitsOnly = value.replace(/\D/g, '');
            if (digitsOnly.length <= 15) {
                setFormData(prev => ({ ...prev, [name]: digitsOnly }));
            }
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
        if (formErrors[name]) {
            setFormErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    // Validate form
    const validateForm = () => {
        const errors = {};

        if (!formData.username.trim()) {
            errors.username = 'Please enter a valid username';
        }

        if (!formData.password.trim()) {
            errors.password = 'Please enter a valid password';
        } else if (formData.password.length < 4) {
            errors.password = 'Password must be at least 4 characters';
        }

        if (!formData.fullname.trim()) {
            errors.fullname = 'Please enter a valid name';
        }

        const contactDigits = formData.contactnumber.replace(/\D/g, '');
        if (!contactDigits) {
            errors.contactnumber = 'Please enter a valid contact number';
        } else if (contactDigits.length < 10 || contactDigits.length > 15) {
            errors.contactnumber = 'Please enter a valid contact number (10-15 digits)';
        }

        if (!formData.email.trim()) {
            errors.email = 'Please enter a valid email address';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            errors.email = 'Please enter a valid email address';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);
        setFormMessage({ show: false, text: '', type: '' });

        try {
            const token = localStorage.getItem('ssToken');
            if (!token) {
                navigate('/support/login');
                return;
            }

            const contactDigits = formData.contactnumber.replace(/\D/g, '');
            const updateData = {
                username: formData.username.trim(),
                password: formData.password.trim(),
                fullname: formData.fullname.trim(),
                email: formData.email.trim(),
                contactnumber: contactDigits
            };

            const response = await apiClient.put(
                `/supportstaff/updateSupportStaff/${profile.supportStaffId}`,
                updateData
            );

            if (response.data.status) {
                setFormMessage({
                    show: true,
                    text: response.data.message || 'Profile updated successfully! Redirecting to login...',
                    type: 'success'
                });

                setTimeout(() => {
                    // Clear all support staff data
                    localStorage.removeItem('ssToken');
                    localStorage.removeItem('ssEmployee');
                    localStorage.removeItem('ssRole');
                    localStorage.removeItem('ssRememberMe');
                    // Navigate with replace to prevent back navigation
                    navigate('/support/login', { replace: true });
                }, 2000);
            } else {
                setFormMessage({
                    show: true,
                    text: response.data.message || 'Failed to update profile',
                    type: 'error'
                });
                setIsSubmitting(false);
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            setFormMessage({
                show: true,
                text: error.response?.data?.message || 'Error updating profile. Please try again.',
                type: 'error'
            });
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 font-medium">Loading your profile...</p>
                </div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center p-4">
                <div className="text-center bg-white rounded-xl shadow-lg p-6 max-w-md">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <XCircle className="w-6 h-6 text-red-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 mb-2">Failed to Load Profile</h3>
                    <p className="text-gray-600 mb-4 text-sm">We couldn't load your profile information. Please try again.</p>
                    <button
                        onClick={loadProfile}
                        className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-all shadow-md hover:shadow-lg"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    const isActive = profile.status === true || profile.status === 'true';

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Header Section */}
                <div className="mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-1 flex items-center">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center mr-3 shadow-md">
                                    <User className="w-5 h-5 text-white" />
                                </div>
                                My Profile
                            </h1>
                            <p className="text-gray-600 text-sm ml-13">Manage your account information and settings</p>
                        </div>
                        <div className="mt-3 sm:mt-0 flex space-x-2">
                            <button
                                onClick={() => loadProfile(true)}
                                disabled={refreshing || loading}
                                className="px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-all flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                                <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
                            </button>
                            <button
                                onClick={openEditModal}
                                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg text-sm font-semibold hover:from-blue-600 hover:to-indigo-600 transition-all flex items-center space-x-2 shadow-md hover:shadow-lg"
                            >
                                <Edit2 className="w-4 h-4" />
                                <span>Edit Profile</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Profile Hero Card */}
                <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6 border border-gray-200">
                    <div className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 p-6">
                        <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
                            {/* Avatar */}
                            <div className="relative">
                                <div className="w-24 h-24 bg-white rounded-xl flex items-center justify-center shadow-lg">
                                    <span className="text-4xl font-bold bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent">
                                        {getInitials(profile.username)}
                                    </span>
                                </div>
                                <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center ${
                                    isActive ? 'bg-green-500' : 'bg-red-500'
                                }`}>
                                    {isActive ? (
                                        <CheckCircle className="w-4 h-4 text-white" />
                                    ) : (
                                        <XCircle className="w-4 h-4 text-white" />
                                    )}
                                </div>
                            </div>

                            {/* User Info */}
                            <div className="flex-1 text-center md:text-left">
                                <h2 className="text-2xl font-bold text-white mb-1">{profile.fullname || profile.username || 'N/A'}</h2>
                                <p className="text-blue-50 text-sm mb-3">@{profile.username || 'N/A'}</p>
                                
                                {/* Status Badge */}
                                <div className="inline-flex items-center px-3 py-1.5 bg-cyan-100/30 backdrop-blur-sm rounded-full border border-cyan-200/40">
                                    <div className={`w-2.5 h-2.5 rounded-full mr-2 ${isActive ? 'bg-teal-400 animate-pulse' : 'bg-red-400'}`}></div>
                                    <span className="text-white font-semibold text-xs">
                                        {isActive ? 'Active Staff' : 'Inactive Staff'}
                                    </span>
                                </div>
                            </div>

                            {/* Quick Stats */}
                            <div className="grid grid-cols-2 gap-3 md:grid-cols-1">
                                <div className="bg-blue-400/20 backdrop-blur-sm rounded-lg p-3 border border-blue-300/30">
                                    <p className="text-blue-50 text-xs mb-1">Staff ID</p>
                                    <p className="text-white text-lg font-bold">{profile.supportStaffId || 'N/A'}</p>
                                </div>
                                <div className="bg-blue-400/20 backdrop-blur-sm rounded-lg p-3 border border-blue-300/30">
                                    <p className="text-blue-50 text-xs mb-1">Role</p>
                                    <p className="text-white text-lg font-bold">{profile.role || 'N/A'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Information Cards Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                    {/* Contact Information */}
                    <div className="bg-white rounded-xl shadow-md p-5 border border-gray-200 hover:shadow-lg transition-shadow">
                        <div className="flex items-center mb-4">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center mr-3">
                                <Phone className="w-5 h-5 text-white" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-800">Contact Information</h3>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                <Phone className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Phone Number</p>
                                    <p className="text-gray-900 font-medium text-sm">{profile.contactNumber || 'N/A'}</p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                <Mail className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Email Address</p>
                                    <p className="text-gray-900 font-medium text-sm break-all">{profile.email || 'N/A'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Account Details */}
                    <div className="bg-white rounded-xl shadow-md p-5 border border-gray-200 hover:shadow-lg transition-shadow">
                        <div className="flex items-center mb-4">
                            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-lg flex items-center justify-center mr-3">
                                <Shield className="w-5 h-5 text-white" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-800">Account Details</h3>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                <User className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Username</p>
                                    <p className="text-gray-900 font-medium text-sm">{profile.username || 'N/A'}</p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                <div className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isActive ? 'text-green-600' : 'text-red-600'}`}>
                                    {isActive ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Account Status</p>
                                    <p className={`font-semibold text-sm ${isActive ? 'text-green-600' : 'text-red-600'}`}>
                                        {isActive ? 'Active' : 'Inactive'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Timeline Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="bg-white rounded-xl shadow-md p-5 border border-gray-200">
                        <div className="flex items-center mb-4">
                            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center mr-3">
                                <Calendar className="w-5 h-5 text-white" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-800">Registration</h3>
                        </div>
                        <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-100">
                            <Clock className="w-5 h-5 text-green-600" />
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Registration Date</p>
                                <p className="text-gray-900 font-medium text-sm">{formatDate(profile.createDate)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-md p-5 border border-gray-200">
                        <div className="flex items-center mb-4">
                            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center mr-3">
                                <Clock className="w-5 h-5 text-white" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-800">Last Updated</h3>
                        </div>
                        <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-100">
                            <Clock className="w-5 h-5 text-orange-600" />
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Last Update</p>
                                <p className="text-gray-900 font-medium text-sm">{formatDate(profile.updateDate) || 'Never updated'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Profile Modal */}
            {isEditModalOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={(e) => {
                        if (e.target.className.includes('fixed')) {
                            closeEditModal();
                        }
                    }}
                >
                    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-gray-200 transform transition-all">
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 px-5 py-4 rounded-t-xl flex-shrink-0">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-bold text-white flex items-center">
                                    <Edit2 className="w-5 h-5 mr-2" />
                                    Edit Profile
                                </h3>
                                <button
                                    onClick={closeEditModal}
                                    className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="overflow-y-auto flex-1 px-6 py-6">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Username */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Username <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="username"
                                        value={formData.username}
                                        onChange={handleInputChange}
                                        className={`w-full px-4 py-3 bg-gray-50 border-2 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all ${
                                            formErrors.username ? 'border-red-500 bg-red-50' : 'border-gray-200'
                                        }`}
                                        placeholder="Enter username"
                                    />
                                    {formErrors.username && (
                                        <p className="text-red-500 text-sm mt-1">{formErrors.username}</p>
                                    )}
                                </div>

                                {/* Password */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Password <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            name="password"
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            className={`w-full px-4 py-3 pr-12 bg-gray-50 border-2 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all ${
                                                formErrors.password ? 'border-red-500 bg-red-50' : 'border-gray-200'
                                            }`}
                                            placeholder="Enter password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                    {formErrors.password && (
                                        <p className="text-red-500 text-sm mt-1">{formErrors.password}</p>
                                    )}
                                </div>

                                {/* Full Name */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Full Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="fullname"
                                        value={formData.fullname}
                                        onChange={handleInputChange}
                                        className={`w-full px-4 py-3 bg-gray-50 border-2 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all ${
                                            formErrors.fullname ? 'border-red-500 bg-red-50' : 'border-gray-200'
                                        }`}
                                        placeholder="Enter your full name"
                                    />
                                    {formErrors.fullname && (
                                        <p className="text-red-500 text-sm mt-1">{formErrors.fullname}</p>
                                    )}
                                </div>

                                {/* Contact Number */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Contact Number <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="tel"
                                        name="contactnumber"
                                        value={formData.contactnumber}
                                        onChange={handleInputChange}
                                        maxLength={15}
                                        className={`w-full px-4 py-3 bg-gray-50 border-2 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all ${
                                            formErrors.contactnumber ? 'border-red-500 bg-red-50' : 'border-gray-200'
                                        }`}
                                        placeholder="Enter your contact number"
                                    />
                                    {formErrors.contactnumber && (
                                        <p className="text-red-500 text-sm mt-1">{formErrors.contactnumber}</p>
                                    )}
                                </div>

                                {/* Email */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Email <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        className={`w-full px-4 py-3 bg-gray-50 border-2 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all ${
                                            formErrors.email ? 'border-red-500 bg-red-50' : 'border-gray-200'
                                        }`}
                                        placeholder="Enter your email address"
                                    />
                                    {formErrors.email && (
                                        <p className="text-red-500 text-sm mt-1">{formErrors.email}</p>
                                    )}
                                </div>

                                {/* Messages */}
                                {formMessage.show && (
                                    <div className={`p-4 rounded-xl border-2 ${
                                        formMessage.type === 'success'
                                            ? 'bg-green-50 border-green-200 text-green-800'
                                            : 'bg-red-50 border-red-200 text-red-800'
                                    }`}>
                                        <p className="font-medium">{formMessage.text}</p>
                                    </div>
                                )}

                                {/* Modal Footer */}
                                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                                    <button
                                        type="button"
                                        onClick={closeEditModal}
                                        className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg text-sm font-semibold hover:from-blue-600 hover:to-indigo-600 transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                <span>Updating...</span>
                                            </>
                                        ) : (
                                            <span>Update Profile</span>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Profile;
