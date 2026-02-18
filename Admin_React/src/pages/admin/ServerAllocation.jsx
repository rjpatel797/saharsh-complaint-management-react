import React, { useState, useEffect, useCallback,  } from 'react';
import {
    Users,
    Search,
    Save,
    ArrowLeftRight,
    Server,
    Loader2,
    ChevronDown,
       
} from 'lucide-react';
import apiClient from '../../api/apiClient';
import Swal from 'sweetalert2';

const ServerAllocation = () => {
    const [staffList, setStaffList] = useState([]);
    const [selectedStaff, setSelectedStaff] = useState(null);
    const [allocated, setAllocated] = useState([]);
    const [unallocated, setUnallocated] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [staffSearch, setStaffSearch] = useState('');

    const [filterAllocated, setFilterAllocated] = useState('');
    const [filterUnallocated, setFilterUnallocated] = useState('');

    const [originalAllocatedIds, setOriginalAllocatedIds] = useState([]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showDropdown && !event.target.closest('.dropdown-container')) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showDropdown]);

    // Fetch all support staff
    useEffect(() => {
        const fetchStaff = async () => {
            try {
                const response = await apiClient.get('/admin/getAllSupportStaffWithId');
                if (response.data.data) {
                    setStaffList(response.data.data);
                }
            } catch (error) {
                console.error('Error fetching staff list:', error);
            }
        };
        fetchStaff();
    }, []);

    // Fetch allocations for selected staff
    const fetchAllocations = useCallback(async (staffId) => {
        setLoading(true);
        try {
            const response = await apiClient.get(`/admin/getAllocatedBrandListByStaffId?supportStaffId=${staffId}`);
            if (response.data.data) {
                const data = Array.isArray(response.data.data) ? response.data.data[0] : response.data.data;
                setAllocated(data.allocated || []);
                setUnallocated(data.unallocated || []);

                const ids = (data.allocated || []).map(b => String(b.brandId || b.id)).sort();
                setOriginalAllocatedIds(ids);
            }
        } catch (error) {
            console.error('Error fetching allocations:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to load allocations',
                timer: 3000,
                showConfirmButton: false,
                toast: true,
                position: 'top-end'
            });
        } finally {
            setLoading(false);
        }
    }, []);

    const handleStaffSelect = (staff) => {
        setSelectedStaff(staff);
        setStaffSearch(staff.fullname || staff.StaffName || staff.staffName);
        setShowDropdown(false);
        fetchAllocations(staff.id || staff.staffId);
    };

    const handleDrop = (e, targetList) => {
        e.preventDefault();
        const id = e.dataTransfer.getData('text/plain');

        if (targetList === 'allocated') {
            const item = unallocated.find(x => String(x.brandId || x.id) === id);
            if (item) {
                setUnallocated(unallocated.filter(x => String(x.brandId || x.id) !== id));
                setAllocated([...allocated, item]);
            }
        } else {
            const item = allocated.find(x => String(x.brandId || x.id) === id);
            if (item) {
                setAllocated(allocated.filter(x => String(x.brandId || x.id) !== id));
                setUnallocated([...unallocated, item]);
            }
        }
    };

    const handleDragStart = (e, id) => {
        e.dataTransfer.setData('text/plain', id);
        e.currentTarget.classList.add('opacity-50');
    };

    const handleDragEnd = (e) => {
        e.currentTarget.classList.remove('opacity-50');
    };

    const isDirty = () => {
        const currentIds = allocated.map(b => String(b.brandId || b.id)).sort();
        return JSON.stringify(currentIds) !== JSON.stringify(originalAllocatedIds);
    };

    const handleSave = async () => {
        if (!selectedStaff) return;

        setLoading(true);
        try {
            const brandIds = allocated.map(b => String(b.brandId || b.id)).join(',');
            const res = await apiClient.put(`/admin/updateBrandAllocation?brandIds=${brandIds}&supportStaffId=${selectedStaff.id || selectedStaff.staffId}`);

            if (res.data.status) {
                Swal.fire({
                    icon: 'success',
                    title: 'Success',
                    text: res.data.message || 'Allocation updated successfully',
                    timer: 3000,
                    showConfirmButton: false,
                    toast: true,
                    position: 'top-end'
                });
                fetchAllocations(selectedStaff.id || selectedStaff.staffId);
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Failed',
                    text: res.data.message || 'Failed to update',
                    timer: 3000,
                    showConfirmButton: false,
                    toast: true,
                    position: 'top-end'
                });
                fetchAllocations(selectedStaff.id || selectedStaff.staffId);
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Network error occurred',
                timer: 3000,
                showConfirmButton: false,
                toast: true,
                position: 'top-end'
            });
        } finally {
            setLoading(false);
        }
    };

    const filteredAllocated = allocated.filter(b =>
        (b.brandName || b.brandname).toLowerCase().includes(filterAllocated.toLowerCase())
    );

    const filteredUnallocated = unallocated.filter(b =>
        (b.brandName || b.brandname).toLowerCase().includes(filterUnallocated.toLowerCase())
    );

    return (
        <div className="h-full flex flex-col gap-6 mt-4">
            {/* Standard Header-Integrated Container */}
            <div className="bg-white flex flex-col overflow-hidden">
                {/* Standard Header Strip */}
                <div className="px-4 py-4 border-b border-gray-200 flex flex-col items-center gap-3 md:flex-row md:justify-between bg-gray-50">
                    <div className="flex items-center gap-3">
                        <ArrowLeftRight className="text-gray-600" size={20} />
                        <h2 className="text-lg font-bold text-gray-800">Server Allocation</h2>
                    </div>

                    <div className="flex flex-col md:flex-row items-center gap-4">
                        {/* Support Staff Selector */}
                        <div className="relative w-64 dropdown-container">
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Select Support Staff..."
                                    className="w-full pl-9 pr-10 py-1.5 text-sm border border-gray-300 rounded-md bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                                    value={staffSearch}
                                    onChange={(e) => {
                                        setStaffSearch(e.target.value);
                                        setShowDropdown(true);
                                    }}
                                    onFocus={() => setShowDropdown(true)}
                                />
                                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            </div>

                            {showDropdown && (
                                <div className="absolute top-full left-0 right-0 z-[100] mt-2 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto custom-scrollbar">
                                    <div className="p-1">
                                        {staffList
                                            .filter(s => (s.fullname || s.StaffName || s.staffName || '').toLowerCase().includes(staffSearch.toLowerCase()))
                                            .map((s, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => handleStaffSelect(s)}
                                                    className="w-full text-left px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center gap-2 font-medium"
                                                >
                                                    <Users size={14} className="opacity-50" />
                                                    {s.fullname || s.StaffName || s.staffName}
                                                </button>
                                            ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <button
                            disabled={!isDirty() || loading}
                            onClick={handleSave}
                            className={`px-4 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all active:scale-95 shadow-md ${isDirty() && !loading
                                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                                }`}
                        >
                            {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                            Save Changes
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="p-6 bg-white">
                    {!selectedStaff ? (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <Users size={40} className="text-gray-400" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800">Member Search Required</h3>
                            <p className="text-sm text-gray-600 max-w-xs mt-2 font-medium">Please select a support staff member from the dropdown above to manage server allocations.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Allocated Panel */}
                            <div
                                className="flex flex-col border border-gray-100 rounded-xl bg-gray-50/30 overflow-hidden"
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => handleDrop(e, 'allocated')}
                            >
                                <div className="px-4 py-3 border-b border-gray-100 bg-white flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-gray-800 uppercase tracking-wider">Allocated Servers</span>
                                        <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{allocated.length}</span>
                                    </div>
                                    <div className="relative w-48">
                                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
                                        <input
                                            type="text"
                                            placeholder="Search allocated..."
                                            className="w-full pl-8 pr-3 py-1 text-xs border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium placeholder:text-gray-400"
                                            value={filterAllocated}
                                            onChange={(e) => setFilterAllocated(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="p-4 space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                                    {loading ? (
                                        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-500" /></div>
                                    ) : filteredAllocated.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center opacity-30 italic py-10">
                                            <Server size={32} className="mb-2" />
                                            <p className="text-xs font-bold uppercase">No servers linked</p>
                                        </div>
                                    ) : (
                                        filteredAllocated.map(b => (
                                            <div
                                                key={b.brandId || b.id}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, String(b.brandId || b.id))}
                                                onDragEnd={handleDragEnd}
                                                className="p-3 bg-white border border-gray-100 rounded-lg shadow-sm hover:border-blue-300 hover:scale-[1.01] transition-all cursor-grab active:cursor-grabbing flex items-center justify-between group"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                        <Server size={14} />
                                                    </div>
                                                    <span className="font-bold text-sm text-gray-700">{b.brandName || b.brandname}</span>
                                                </div>
                                                <div className="opacity-0 group-hover:opacity-40 transition-opacity">
                                                    <ArrowLeftRight size={14} />
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Unallocated Panel */}
                            <div
                                className="flex flex-col border border-gray-100 rounded-xl bg-gray-50/30 overflow-hidden"
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => handleDrop(e, 'unallocated')}
                            >
                                <div className="px-4 py-3 border-b border-gray-100 bg-white flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-gray-800 uppercase tracking-wider">Un-Allocated Servers</span>
                                        <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{unallocated.length}</span>
                                    </div>
                                    <div className="relative w-48">
                                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
                                        <input
                                            type="text"
                                            placeholder="Search unallocated..."
                                            className="w-full pl-8 pr-3 py-1 text-xs border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium placeholder:text-gray-400"
                                            value={filterUnallocated}
                                            onChange={(e) => setFilterUnallocated(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="p-4 space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                                    {loading ? (
                                        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gray-400" /></div>
                                    ) : filteredUnallocated.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center opacity-30 italic py-10">
                                            <Server size={32} className="mb-2" />
                                            <p className="text-xs font-bold uppercase">No unallocated servers</p>
                                        </div>
                                    ) : (
                                        filteredUnallocated.map(b => (
                                            <div
                                                key={b.brandId || b.id}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, String(b.brandId || b.id))}
                                                onDragEnd={handleDragEnd}
                                                className="p-3 bg-white border border-gray-100 rounded-lg shadow-sm hover:border-gray-300 hover:scale-[1.01] transition-all cursor-grab active:cursor-grabbing flex items-center justify-between group"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="p-1.5 bg-gray-50 text-gray-400 rounded-lg group-hover:bg-gray-800 group-hover:text-white transition-colors">
                                                        <Server size={14} />
                                                    </div>
                                                    <span className="font-bold text-sm text-gray-700">{b.brandName || b.brandname}</span>
                                                </div>
                                                <div className="opacity-0 group-hover:opacity-40 transition-opacity">
                                                    <ArrowLeftRight size={14} />
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ServerAllocation;
