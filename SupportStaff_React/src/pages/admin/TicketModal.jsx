import React from 'react';
import {
    X,
    User,
    Shield,
    Server,
    AlertCircle,
    FileText
} from 'lucide-react';

const TicketModal = ({ ticket, onClose, onUpdate }) => {

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
        });
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in text-gray-800">
            <div className="bg-white w-full max-w-6xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slide-up">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-gradient-to-r from-slate-50 to-white">
                    <div className="flex gap-4">
                        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                            <FileText size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-900 leading-none">Ticket #{ticket.ticketId}</h3>
                            <p className="text-sm text-gray-500 mt-1">{ticket.brandName} • {ticket.complaintType}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-all duration-200 text-gray-600 hover:text-gray-700">
                        <X size={22} className="transition-transform duration-300 hover:rotate-90" />
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-grow overflow-y-auto min-h-0 bg-gray-50/30">
                    <div className="p-6 space-y-6">
                        {/* Quick Info Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { label: 'Status', value: ticket.status, icon: <AlertCircle size={20} />, color: 'bg-blue-100 text-blue-700' },
                                { label: 'Priority', value: ticket.priority, icon: <Shield size={20} />, color: 'bg-orange-100 text-orange-700' },
                                { label: 'Username', value: ticket.username || 'N/A', icon: <User size={20} />, color: 'bg-purple-100 text-purple-700' },
                                { label: 'Server', value: ticket.brandName, icon: <Server size={20} />, color: 'bg-slate-100 text-slate-700' },
                            ].map((item, i) => (
                                <div key={i} className="p-6 bg-white rounded-xl border border-gray-100 shadow-sm">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">{item.label}</p>
                                    <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-bold ${item.color}`}>
                                        {item.icon}
                                        {item.value}
                                    </div>
                                </div>
                            ))}
                        </div>

                            {/* Complaint Information Section */}
                            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                                <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                                    <h3 className="text-base font-bold text-gray-800">Complaint Information</h3>
                                </div>
                                <div className="p-6">
                                    <div className="grid grid-cols-3 gap-6">
                                        <div>
                                            <p className="text-xs font-medium text-gray-500 mb-1">TICKET ID</p>
                                            <p className="text-sm font-bold text-gray-800">{ticket.ticketId || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-gray-500 mb-1">DEVICE NAME</p>
                                            <p className="text-sm font-bold text-gray-800">{ticket.brandName || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-gray-500 mb-1">COMPLAINT TYPE</p>
                                            <p className="text-sm font-bold text-gray-800">{ticket.complaintType || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-gray-500 mb-1">CREATED DATE</p>
                                            <p className="text-sm font-bold text-gray-800">{formatDate(ticket.createDate)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-gray-500 mb-1">LAST UPDATED</p>
                                            <p className="text-sm font-bold text-gray-800">{formatDate(ticket.updateDate)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-gray-500 mb-1">RESOLVED DATE</p>
                                            <p className="text-sm font-bold text-gray-800">{formatDate(ticket.resolveDate)}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* User Information Section */}
                            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                                <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                                    <h3 className="text-base font-bold text-gray-800">User Information</h3>
                                </div>
                                <div className="p-6">
                                    <div className="grid grid-cols-3 gap-6">
                                        <div>
                                            <p className="text-xs font-medium text-gray-500 mb-1">USERNAME</p>
                                            <p className="text-sm font-bold text-gray-800">{ticket.username || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-gray-500 mb-1">CONTACT NO</p>
                                            <p className="text-sm font-bold text-gray-800">{ticket.contactNo || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-gray-500 mb-1">EMAIL</p>
                                            <p className="text-sm font-bold text-gray-800">{ticket.email || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Assigned To Section */}
                            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                                <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                                    <h3 className="text-base font-bold text-gray-800">Assigned To</h3>
                                </div>
                                <div className="p-6">
                                    {ticket.assignTo && ticket.assignTo !== 'N/A' ? (
                                        <span className="inline-block px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                                            {ticket.assignTo}
                                        </span>
                                    ) : (
                                        <span className="text-sm text-gray-500">Not assigned</span>
                                    )}
                                </div>
                            </div>

                            {/* User Description Section */}
                            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                                <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                                    <h3 className="text-base font-bold text-gray-800">User Description</h3>
                                </div>
                                <div className="p-6">
                                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                        {ticket.shortDescription || 'No description provided.'}
                                    </p>
                                </div>
                            </div>

                            {/* Remark Section */}
                            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                                <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                                    <h3 className="text-base font-bold text-gray-800">Remark</h3>
                                </div>
                                <div className="p-6">
                                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                        {ticket.remark || 'No remark added yet.'}
                                    </p>
                                </div>
                            </div>

                            {/* Action Details Section */}
                            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                                <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                                    <h3 className="text-base font-bold text-gray-800">Action Details</h3>
                                </div>
                                <div className="p-6">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <p className="text-xs font-medium text-gray-500 mb-2">ACTION PANEL</p>
                                            <span className="inline-block px-4 py-2 bg-orange-100 text-orange-700 rounded-full text-sm font-medium uppercase">
                                                {ticket.actionPanel || 'N/A'}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-gray-500 mb-2">ACTION BY</p>
                                            <span className="inline-block px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                                                {ticket.actionBy || 'N/A'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Request Details Section */}
                            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                                <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                                    <h3 className="text-base font-bold text-gray-800">Request Details</h3>
                                </div>
                                <div className="p-6">
                                    <div className="grid grid-cols-3 gap-6">
                                        <div>
                                            <p className="text-xs font-medium text-gray-500 mb-2">REQUEST PERSON</p>
                                            <span className="inline-block px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                                                {ticket.requestPerson || 'N/A'}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-gray-500 mb-2">REQUEST TYPE</p>
                                            <span className="inline-block px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium uppercase">
                                                {ticket.requestType || 'N/A'}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-gray-500 mb-2">REQUEST PANEL</p>
                                            <span className="inline-block px-4 py-2 bg-orange-100 text-orange-700 rounded-full text-sm font-medium uppercase">
                                                {ticket.requestPanel || 'N/A'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Status History Section */}
                            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                                <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                                    <h3 className="text-base font-bold text-gray-800">Status History</h3>
                                </div>
                                <div className="p-6">
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                            <div>
                                                <p className="text-xs font-medium text-gray-500">Created</p>
                                                <p className="text-sm font-medium text-gray-700">{formatDate(ticket.createDate)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                            <div>
                                                <p className="text-xs font-medium text-gray-500">Last Updated</p>
                                                <p className="text-sm font-medium text-gray-700">{formatDate(ticket.updateDate)}</p>
                                            </div>
                                        </div>
                                        {ticket.resolveDate && (
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                                <div>
                                                    <p className="text-xs font-medium text-gray-500">Resolved</p>
                                                    <p className="text-sm font-medium text-gray-700">{formatDate(ticket.resolveDate)}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                </div>
            </div>
        </div>
    );
};

export default TicketModal;
