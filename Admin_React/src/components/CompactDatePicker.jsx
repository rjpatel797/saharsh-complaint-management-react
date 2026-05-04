import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

const WEEK_DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const MONTHS_LONG = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

function pad2(n) {
    return String(n).padStart(2, '0');
}

function toYmdLocal(d) {
    if (!d || Number.isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseYmdLocal(ymd) {
    if (!ymd || typeof ymd !== 'string') return null;
    const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const day = Number(m[3]);
    const d = new Date(y, mo, day);
    if (d.getFullYear() !== y || d.getMonth() !== mo || d.getDate() !== day) return null;
    return d;
}

function formatDdMmYyyy(ymd) {
    const d = parseYmdLocal(ymd);
    if (!d) return '';
    return `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()}`;
}

function startOfDay(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
}

/**
 * Report-friendly date picker (YYYY-MM-DD). UI aligned with modern white/indigo popover pattern.
 */
const CompactDatePicker = ({
    id,
    value,
    onChange,
    label,
    placeholder = 'dd-mm-yyyy',
    className = '',
    popoverClassName = '',
}) => {
    const [open, setOpen] = useState(false);
    const [selectionType, setSelectionType] = useState('day');
    const rootRef = useRef(null);

    const [viewDate, setViewDate] = useState(() => {
        const d = parseYmdLocal(value) || new Date();
        return new Date(d.getFullYear(), d.getMonth(), 1);
    });

    useEffect(() => {
        if (!value) return;
        const d = parseYmdLocal(value);
        if (d) setViewDate(new Date(d.getFullYear(), d.getMonth(), 1));
    }, [value]);

    useEffect(() => {
        const onDoc = (e) => {
            if (rootRef.current && !rootRef.current.contains(e.target)) {
                setOpen(false);
                setSelectionType('day');
            }
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, []);

    const toggleOpen = () => {
        setOpen((was) => {
            if (!was) {
                setSelectionType('day');
                const d = parseYmdLocal(value);
                if (d) setViewDate(new Date(d.getFullYear(), d.getMonth(), 1));
                else setViewDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
            }
            return !was;
        });
    };

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    const cells = useMemo(() => {
        const first = new Date(year, month, 1);
        const startPad = first.getDay();
        const start = new Date(year, month, 1 - startPad);
        const list = [];
        for (let i = 0; i < 42; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            list.push(d);
        }
        return list;
    }, [year, month]);

    const selected = parseYmdLocal(value);

    const yearOptions = useMemo(() => {
        const cy = new Date().getFullYear();
        const from = Math.min(cy - 80, year - 10);
        const to = Math.max(cy + 15, year + 10);
        const list = [];
        for (let y = from; y <= to; y += 1) list.push(y);
        return list;
    }, [year]);

    const goMonth = useCallback((delta) => {
        setViewDate((v) => new Date(v.getFullYear(), v.getMonth() + delta, 1));
    }, []);

    const cycleHeader = () => {
        setSelectionType((t) => (t === 'month' ? 'year' : 'month'));
    };

    const pickDay = (d) => {
        onChange(toYmdLocal(d));
        setOpen(false);
        setSelectionType('day');
    };

    const pickMonth = (monthIndex) => {
        setViewDate(new Date(year, monthIndex, 1));
        setSelectionType('day');
    };

    const pickYear = (y) => {
        setViewDate(new Date(y, month, 1));
        setSelectionType('month');
    };

    const clear = () => {
        onChange('');
        setOpen(false);
        setSelectionType('day');
    };

    const today = () => {
        onChange(toYmdLocal(new Date()));
        setOpen(false);
        setSelectionType('day');
    };

    const display = formatDdMmYyyy(value);
    const todayStart = startOfDay(new Date());

    return (
        <div ref={rootRef} className={`relative w-full ${className}`}>
            {label ? (
                <label htmlFor={id} className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {label}
                </label>
            ) : null}
            <button
                type="button"
                id={id}
                onClick={toggleOpen}
                className={`flex h-8 w-full cursor-pointer items-center gap-2 rounded-md border bg-white px-2 text-left text-xs font-semibold transition-all ${
                    open
                        ? 'border-indigo-500 text-slate-700 ring-2 ring-indigo-100'
                        : 'border-gray-300 text-slate-700 hover:border-gray-400'
                }`}
                aria-haspopup="dialog"
                aria-expanded={open}
            >
                <CalendarIcon size={14} className={open ? 'shrink-0 text-indigo-500' : 'shrink-0 text-gray-400'} />
                <span className={`min-w-0 flex-1 truncate ${display ? 'text-slate-800' : 'font-medium text-gray-400'}`}>
                    {display || placeholder}
                </span>
                <ChevronDown
                    size={14}
                    className={`shrink-0 text-gray-400 transition-transform duration-300 ${open ? 'rotate-180 text-indigo-500' : ''}`}
                />
            </button>

            {open && (
                <div
                    className={`absolute left-0 top-[calc(100%+6px)] z-[150] w-[min(280px,calc(100vw-2rem))] origin-top overflow-hidden rounded-2xl border border-gray-100 bg-white p-3 shadow-2xl ${popoverClassName}`}
                    role="dialog"
                    aria-label="Choose date"
                >
                    <div className="mb-3 flex items-center justify-between gap-1 px-0.5">
                        <button
                            type="button"
                            onClick={cycleHeader}
                            className="flex max-w-[70%] items-center gap-1 truncate text-left text-[12px] font-black uppercase tracking-tight text-slate-800 hover:text-indigo-600"
                        >
                            <span className="truncate">
                                {MONTHS_LONG[month]} {year}
                            </span>
                            <ChevronDown size={12} className="shrink-0 opacity-50" />
                        </button>
                        {selectionType === 'day' ? (
                            <div className="flex shrink-0 items-center gap-0.5">
                                <button
                                    type="button"
                                    onClick={() => goMonth(-1)}
                                    className="rounded-lg p-1 text-gray-400 transition-all hover:bg-gray-100 hover:text-indigo-600"
                                    aria-label="Previous month"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => goMonth(1)}
                                    className="rounded-lg p-1 text-gray-400 transition-all hover:bg-gray-100 hover:text-indigo-600"
                                    aria-label="Next month"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        ) : (
                            <span className="w-16 shrink-0" />
                        )}
                    </div>

                    {selectionType === 'day' && (
                        <>
                            <div className="mb-2 grid grid-cols-7">
                                {WEEK_DAYS.map((d) => (
                                    <div key={d} className="text-center text-[10px] font-black uppercase text-slate-400">
                                        {d}
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7 gap-1">
                                {cells.map((d, idx) => {
                                    const inMonth = d.getMonth() === month;
                                    const isSel =
                                        selected &&
                                        d.getFullYear() === selected.getFullYear() &&
                                        d.getMonth() === selected.getMonth() &&
                                        d.getDate() === selected.getDate();
                                    const isToday =
                                        d.getFullYear() === todayStart.getFullYear() &&
                                        d.getMonth() === todayStart.getMonth() &&
                                        d.getDate() === todayStart.getDate() &&
                                        inMonth;

                                    return (
                                        <button
                                            key={`${d.getTime()}-${idx}`}
                                            type="button"
                                            disabled={!inMonth}
                                            onClick={() => inMonth && pickDay(d)}
                                            className={`flex aspect-square items-center justify-center rounded-xl text-[11px] font-bold transition-all ${
                                                !inMonth
                                                    ? 'cursor-default text-slate-200'
                                                    : 'cursor-pointer text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'
                                            } ${isSel ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100 hover:bg-indigo-700 hover:text-white' : ''} ${
                                                isToday && !isSel ? 'border border-indigo-100 text-indigo-600' : ''
                                            }`}
                                        >
                                            {d.getDate()}
                                        </button>
                                    );
                                })}
                            </div>
                        </>
                    )}

                    {selectionType === 'month' && (
                        <div className="grid max-h-[220px] grid-cols-3 gap-2 overflow-y-auto py-1">
                            {MONTHS_LONG.map((mName, i) => {
                                const isSelected = month === i;
                                return (
                                    <button
                                        key={mName}
                                        type="button"
                                        onClick={() => pickMonth(i)}
                                        className={`rounded-xl px-2 py-2.5 text-[10px] font-black uppercase tracking-tight transition-all ${
                                            isSelected
                                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                                                : 'text-slate-600 hover:bg-slate-50 hover:text-indigo-600'
                                        }`}
                                    >
                                        {mName.slice(0, 3)}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {selectionType === 'year' && (
                        <div className="grid max-h-[220px] grid-cols-3 gap-2 overflow-y-auto py-1 custom-scrollbar">
                            {yearOptions.map((y) => {
                                const isSelected = year === y;
                                return (
                                    <button
                                        key={y}
                                        type="button"
                                        onClick={() => pickYear(y)}
                                        className={`rounded-xl px-2 py-2.5 text-[11px] font-black transition-all ${
                                            isSelected
                                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                                                : 'text-slate-600 hover:bg-slate-50 hover:text-indigo-600'
                                        }`}
                                    >
                                        {y}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-2">
                        <button
                            type="button"
                            onClick={clear}
                            className="cursor-pointer rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-widest text-rose-500 transition-all hover:bg-rose-50 hover:text-rose-600"
                        >
                            Clear
                        </button>
                        <button
                            type="button"
                            onClick={today}
                            className="cursor-pointer rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-widest text-indigo-600 transition-all hover:bg-indigo-50 hover:text-indigo-700"
                        >
                            Today
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CompactDatePicker;
