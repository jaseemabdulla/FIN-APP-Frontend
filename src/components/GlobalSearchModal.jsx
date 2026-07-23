import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { globalSearch } from '../api';

const GlobalSearchModal = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    
    const inputRef = useRef(null);
    const resultsContainerRef = useRef(null);

    // Focus input on open
    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setResults([]);
            setSelectedIndex(-1);
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    }, [isOpen]);

    // Handle escape key to close modal
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // Query debounce / search execution
    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            return;
        }

        setLoading(true);
        const delayDebounce = setTimeout(async () => {
            try {
                const res = await globalSearch(query);
                setResults(res.data);
                setSelectedIndex(res.data.length > 0 ? 0 : -1);
            } catch (err) {
                console.error("Global search error:", err);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(delayDebounce);
    }, [query]);

    // Keep active selection in view
    useEffect(() => {
        if (selectedIndex >= 0 && resultsContainerRef.current) {
            const container = resultsContainerRef.current;
            const selectedElement = container.children[selectedIndex];
            if (selectedElement) {
                const containerTop = container.scrollTop;
                const containerBottom = containerTop + container.clientHeight;
                const elemTop = selectedElement.offsetTop;
                const elemBottom = elemTop + selectedElement.clientHeight;

                if (elemTop < containerTop) {
                    container.scrollTop = elemTop;
                } else if (elemBottom > containerBottom) {
                    container.scrollTop = elemBottom - container.clientHeight;
                }
            }
        }
    }, [selectedIndex]);

    if (!isOpen) return null;

    const handleSelectResult = (result) => {
        if (result.target === 'debt') {
            navigate(`/debts?id=${result.target_id}`);
        } else if (result.target === 'fund') {
            navigate(`/funds?id=${result.target_id}`);
        } else {
            navigate(`/?date=${result.target_date}&txnId=${result.target_id}`);
        }
        onClose();
    };

    const handleKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (results.length > 0 ? (prev + 1) % results.length : -1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (results.length > 0 ? (prev - 1 + results.length) % results.length : -1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedIndex >= 0 && results[selectedIndex]) {
                handleSelectResult(results[selectedIndex]);
            }
        }
    };

    // Helper to format transaction type labels and icons
    const getTypeDetails = (type) => {
        switch (type) {
            case 'INCOME':
                return { label: 'Income', icon: '📥', color: 'bg-green-950/60 text-green-400 border-green-900' };
            case 'EXPENSE':
                return { label: 'Expense', icon: '📤', color: 'bg-red-950/60 text-red-400 border-red-900' };
            case 'DEBT_TAKEN':
            case 'DEBT_TAKEN_RETURN':
                return { label: 'Debt (Taken)', icon: '🤝', color: 'bg-purple-950/60 text-purple-400 border-purple-900' };
            case 'DEBT_GIVEN':
            case 'DEBT_GIVEN_RETURN':
                return { label: 'Debt (Given)', icon: '🤝', color: 'bg-blue-950/60 text-blue-400 border-blue-900' };
            case 'CASH_WITHDRAWAL':
            case 'CASH_DEPOSIT':
                return { label: 'Transfer', icon: '🔄', color: 'bg-yellow-950/60 text-yellow-400 border-yellow-900' };
            case 'INVESTMENT':
                return { label: 'Investment', icon: '📈', color: 'bg-emerald-950/60 text-emerald-400 border-emerald-900' };
            case 'FUND_MANAGEMENT_INC':
            case 'FUND_MANAGEMENT_DEC':
                return { label: 'Fund', icon: '💰', color: 'bg-teal-950/60 text-teal-400 border-teal-900' };
            default:
                if (type.startsWith('DEBT_')) {
                    const sub = type.split('_')[1];
                    return { label: `Debt (${sub})`, icon: '🤝', color: 'bg-purple-950/60 text-purple-400 border-purple-900' };
                }
                return { label: 'Transaction', icon: '📄', color: 'bg-gray-800 text-gray-300 border-gray-700' };
        }
    };

    const isOutflowType = (type) => {
        return ['EXPENSE', 'DEBT_GIVEN', 'INVESTMENT', 'DEBT_TAKEN_RETURN', 'FUND_MANAGEMENT_DEC'].includes(type) || type === 'DEBT_GIVEN';
    };

    return (
        <div 
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[12vh] px-4"
            onClick={onClose}
        >
            <div 
                className="bg-[#1e1e1e] border border-gray-800 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden animate-fade-in flex flex-col max-h-[60vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Search Header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800/80 bg-gray-900/20">
                    <span className="text-gray-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </span>
                    <input 
                        ref={inputRef}
                        type="text" 
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Search person, description, category, notes..."
                        className="flex-1 bg-transparent border-none outline-none text-white text-sm placeholder-gray-500 py-1"
                    />
                    <span className="text-[10px] text-gray-500 font-bold border border-gray-800 bg-gray-950 px-1.5 py-0.5 rounded uppercase select-none">
                        Esc
                    </span>
                </div>

                {/* Search Results Area */}
                <div className="flex-1 overflow-y-auto max-h-[45vh] min-h-[150px] p-2" ref={resultsContainerRef}>
                    {loading && (
                        <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-primary mb-3"></div>
                            <span className="text-xs">Searching database...</span>
                        </div>
                    )}

                    {!loading && !query.trim() && (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-500 text-xs">
                            <span className="text-2xl mb-2">🔍</span>
                            <span>Type to search across all transactions</span>
                        </div>
                    )}

                    {!loading && query.trim() && results.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-500 text-xs">
                            <span className="text-2xl mb-2">🙅</span>
                            <span>No matching transactions or debts found.</span>
                        </div>
                    )}

                    {!loading && results.map((result, idx) => {
                        const typeInfo = getTypeDetails(result.type);
                        const isOutflow = isOutflowType(result.type);
                        const isSelected = idx === selectedIndex;

                        return (
                            <div 
                                key={`${result.model}_${result.id}`}
                                onClick={() => handleSelectResult(result)}
                                onMouseEnter={() => setSelectedIndex(idx)}
                                className={`flex items-center justify-between p-3 rounded-xl transition-all duration-200 cursor-pointer select-none border ${
                                    isSelected 
                                    ? 'bg-white/5 border-gray-700/60 shadow' 
                                    : 'border-transparent hover:bg-white/5'
                                }`}
                            >
                                <div className="flex items-center gap-3 min-w-0 flex-1 mr-4">
                                    {/* Icon */}
                                    <div className="w-9 h-9 rounded-lg bg-gray-800/80 flex items-center justify-center text-lg shrink-0">
                                        {typeInfo.icon}
                                    </div>

                                    {/* Content info */}
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {/* Type tag */}
                                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider border ${typeInfo.color}`}>
                                                {typeInfo.label}
                                            </span>
                                            {result.category && (
                                                <span className="text-[9px] text-gray-400 bg-gray-800 border border-gray-700/40 px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider">
                                                    {result.category}
                                                </span>
                                            )}
                                            {/* Date */}
                                            <span className="text-[10px] text-gray-500 font-semibold font-sans">
                                                {result.date}
                                            </span>
                                        </div>
                                        {/* Description */}
                                        <div className="text-xs text-gray-200 font-medium truncate mt-1">
                                            {result.description}
                                        </div>
                                    </div>
                                </div>

                                {/* Amount */}
                                <div className="text-right shrink-0">
                                    <span className={`font-mono font-bold text-sm ${isOutflow ? 'text-red-400' : 'text-green-400'}`}>
                                        {isOutflow ? '-' : '+'}${parseFloat(result.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
                
                {/* Keyboard Shortcuts Footer */}
                {results.length > 0 && (
                    <div className="border-t border-gray-800/80 px-4 py-2 bg-gray-900/30 flex justify-between items-center text-[10px] text-gray-500 font-semibold select-none">
                        <div className="flex items-center gap-1.5">
                            <span>Use keys</span>
                            <span className="bg-gray-800 border border-gray-700 px-1 py-0.2 rounded font-mono">↑</span>
                            <span className="bg-gray-800 border border-gray-700 px-1 py-0.2 rounded font-mono">↓</span>
                            <span>to navigate</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="bg-gray-800 border border-gray-700 px-1 py-0.2 rounded font-mono">Enter</span>
                            <span>to select</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GlobalSearchModal;
