import React from 'react';
import sahLogo from '../assets/sah.png';

const PremiumLoader = ({
    mainText = 'Fetching records...',
    subText = 'Please wait while we load your data',
    height = 'py-20'
}) => {
    return (
        <div className={`flex flex-col items-center justify-center ${height} gap-5 w-full`}>
            <div className="relative flex items-center justify-center w-20 h-20">
                <div className="absolute inset-0 rounded-full border-[3px] border-slate-100 border-t-indigo-600 animate-spin"></div>

                <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center p-2 shadow-sm">
                    <img
                        src={sahLogo}
                        alt="Loading..."
                        className="w-full h-full object-contain animate-pulse"
                    />
                </div>
            </div>

            <div className="text-center flex flex-col gap-1">
                <p className="text-gray-800 font-extrabold text-[13px] uppercase tracking-widest">{mainText}</p>
                {subText && (
                    <p className="text-gray-400 font-bold text-[11px] tracking-wide">{subText}</p>
                )}
            </div>
        </div>
    );
};

export default PremiumLoader;
