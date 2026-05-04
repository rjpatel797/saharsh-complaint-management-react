import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

const PageSizeDropdown = ({ pageSize, setPageSize, onPageSizeChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const options = [10, 20, 50, 100, 200];

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (size) => {
        setPageSize(size);
        if (onPageSizeChange) {
            onPageSizeChange();
        }
        setIsOpen(false);
    };

    return (
        <div className="flex items-center gap-2 bg-gray-50/80 rounded-xl px-2 py-1 border border-gray-200 shadow-sm" ref={dropdownRef}>
            <label className="text-[10px] font-black text-slate-500 whitespace-nowrap uppercase tracking-widest">Show</label>
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setIsOpen((prev) => !prev)}
                    className="group flex items-center justify-between gap-1 px-1.5 py-0 min-w-[50px] text-[10px] font-black text-indigo-600 bg-white border border-slate-100 rounded-lg hover:border-indigo-200 hover:shadow-md transition-all duration-300 cursor-pointer active:scale-95 h-6"
                >
                    <span className="tracking-wider">{pageSize}</span>
                    <ChevronDown
                        size={10}
                        className={`text-slate-400 group-hover:text-indigo-500 transition-all duration-300 ${isOpen ? 'rotate-180 text-indigo-600' : ''}`}
                    />
                </button>

                {isOpen && (
                    <div className="absolute top-full left-0 mt-1 w-full min-w-[55px] bg-white border border-slate-100 rounded-xl shadow-2xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-1 duration-300">
                        <div className="py-0.5">
                            {options.map((option) => (
                                <button
                                    type="button"
                                    key={option}
                                    onClick={() => handleSelect(option)}
                                    className={`w-full px-2 py-1 text-[10px] font-black text-center transition-all duration-200 cursor-pointer ${
                                        pageSize === option
                                            ? 'bg-indigo-600 text-white shadow-inner'
                                            : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'
                                    }`}
                                >
                                    {option}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            <span className="text-[10px] font-black text-slate-500 whitespace-nowrap uppercase tracking-widest">entries</span>
        </div>
    );
};

export default PageSizeDropdown;
