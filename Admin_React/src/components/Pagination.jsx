import React from 'react';

const Pagination = ({
    currentPage,
    totalPages,
    totalElements,
    pageSize,
    loading,
    onPageChange,
    isZeroIndexed = true
}) => {
    const fmt = (n) => {
        const num = Number(n);
        return Number.isFinite(num) ? num.toLocaleString('en-US') : n;
    };

    const displayCurrentPage = isZeroIndexed ? currentPage + 1 : currentPage;
    const fromElement = totalElements > 0 ? (isZeroIndexed ? currentPage * pageSize + 1 : (currentPage - 1) * pageSize + 1) : 0;
    const toElement = Math.min(isZeroIndexed ? (currentPage + 1) * pageSize : currentPage * pageSize, totalElements);

    return (
        <div
            className="sticky bottom-0 z-30 shrink-0 border-t border-gray-200 bg-white/95 px-4 py-2.5 backdrop-blur-sm supports-[backdrop-filter]:bg-white/90 shadow-[0_-6px_16px_-4px_rgba(15,23,42,0.08)] flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            role="navigation"
            aria-label="Table pagination"
        >
            <p className="min-w-0 text-center text-sm text-gray-600 sm:text-left">
                <span className="text-gray-500">Showing </span>
                <span className="font-semibold tabular-nums text-gray-900">{fmt(fromElement)}</span>
                <span className="text-gray-500"> to </span>
                <span className="font-semibold tabular-nums text-gray-900">{fmt(toElement)}</span>
                <span className="text-gray-500"> of </span>
                <span className="font-semibold tabular-nums text-gray-900">{fmt(totalElements)}</span>
                <span className="text-gray-500"> entries</span>
            </p>
            <div className="flex items-center justify-center gap-2 sm:justify-end">
                <button
                    disabled={(isZeroIndexed ? currentPage === 0 : currentPage === 1) || loading}
                    onClick={() => onPageChange(currentPage - 1)}
                    className="px-3 py-1.5 text-[11px] font-black uppercase tracking-widest rounded-xl border transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-white hover:bg-gray-50 border-gray-200 text-gray-500 hover:text-gray-900 hover:shadow-sm disabled:hover:shadow-none disabled:hover:bg-white cursor-pointer"
                >
                    Previous
                </button>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-blue-500 text-white rounded-xl shadow-md">
                    <span className="text-[11px] font-black">{fmt(displayCurrentPage)}</span>
                    <span className="text-[10px] opacity-80 font-black">OF</span>
                    <span className="text-[11px] font-black">{fmt(totalPages || 1)}</span>
                </div>
                <button
                    disabled={(isZeroIndexed ? currentPage >= totalPages - 1 : currentPage >= totalPages) || loading}
                    onClick={() => onPageChange(currentPage + 1)}
                    className="px-3 py-1.5 text-[11px] font-black uppercase tracking-widest rounded-xl border transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-white hover:bg-gray-50 border-gray-200 text-gray-500 hover:text-gray-900 hover:shadow-sm disabled:hover:shadow-none disabled:hover:bg-white cursor-pointer"
                >
                    Next
                </button>
            </div>
        </div>
    );
};

export default Pagination;
