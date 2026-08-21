import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
    getInvestments, 
    createInvestment, 
    updateInvestment, 
    deleteInvestment,
    getInvestmentDetails
} from '../api';
import TransactionForm from './TransactionForm';

const INVESTMENT_TYPES = [
    { value: 'GOLD', label: 'Gold 🪙' },
    { value: 'STOCK', label: 'Stock 📈' },
    { value: 'MUTUAL_FUND', label: 'Mutual Fund 📊' },
    { value: 'BUSINESS', label: 'Business 🏢' },
    { value: 'OTHER', label: 'Other / Custom 🛠️' }
];

const INITIAL_FORM_STATE = {
    name: '',
    investment_type: 'STOCK',
    custom_type: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
};

const InvestmentList = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    const [investments, setInvestments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedInvest, setSelectedInvest] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showTxnModal, setShowTxnModal] = useState(false);
    const [txnPrefill, setTxnPrefill] = useState(null);
    
    // Form States
    const [formData, setFormData] = useState(INITIAL_FORM_STATE);
    const [editingInvestId, setEditingInvestId] = useState(null);
    const [saving, setSaving] = useState(false);

    // Parse URL for specific investment details
    const queryParams = new URLSearchParams(location.search);
    const urlInvestId = queryParams.get('id') ? parseInt(queryParams.get('id')) : null;

    const fetchInvestmentsList = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getInvestments();
            setInvestments(res.data);
            
            // If there's an ID in URL, select that investment
            if (urlInvestId) {
                const found = res.data.find(inv => inv.id === urlInvestId);
                if (found) {
                    setSelectedInvest(found);
                }
            } else if (selectedInvest) {
                // Refresh currently selected investment data
                const updated = res.data.find(inv => inv.id === selectedInvest.id);
                if (updated) {
                    setSelectedInvest(updated);
                }
            }
        } catch (err) {
            console.error("Failed to load investments", err);
        } finally {
            setLoading(false);
        }
    }, [urlInvestId, selectedInvest?.id]);

    useEffect(() => {
        fetchInvestmentsList();
    }, [urlInvestId]);

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editingInvestId) {
                await updateInvestment(editingInvestId, formData);
            } else {
                await createInvestment(formData);
            }
            setShowCreateModal(false);
            setFormData(INITIAL_FORM_STATE);
            setEditingInvestId(null);
            fetchInvestmentsList();
        } catch (err) {
            console.error("Failed to save investment", err);
            alert("Error: " + (err.response?.data?.detail || "Failed to save investment. Please check inputs."));
        } finally {
            setSaving(false);
        }
    };

    const handleEditStart = (inv) => {
        setFormData({
            name: inv.name,
            investment_type: inv.investment_type,
            custom_type: inv.custom_type || '',
            description: inv.description || '',
            date: inv.date
        });
        setEditingInvestId(inv.id);
        setShowCreateModal(true);
    };

    const handleDeleteInvest = async (id) => {
        if (window.confirm("Are you sure you want to delete this investment profile? All associated transactions will be deleted and your cash/account balances will be recalculated automatically.")) {
            try {
                await deleteInvestment(id);
                if (selectedInvest?.id === id) {
                    setSelectedInvest(null);
                    navigate('/investments');
                }
                fetchInvestmentsList();
            } catch (err) {
                console.error("Failed to delete investment", err);
                alert("Failed to delete investment profile.");
            }
        }
    };

    const handleAddTxnClick = (type) => {
        setTxnPrefill({
            investmentId: selectedInvest.id,
            transaction_type: type,
            amount: '',
            description: type === 'INVESTMENT' ? `Added capital to ${selectedInvest.name}` : `Withdrew capital from ${selectedInvest.name}`
        });
        setShowTxnModal(true);
    };

    // Calculations
    const totalInvestedOverall = investments.reduce((sum, inv) => sum + parseFloat(inv.total_invested || 0), 0);
    const totalWithdrawnOverall = investments.reduce((sum, inv) => sum + parseFloat(inv.total_withdrawn || 0), 0);
    const totalActiveBalance = totalInvestedOverall - totalWithdrawnOverall;
    const activeCount = investments.filter(inv => inv.status === 'ACTIVE').length;

    const getInvestTypeLabel = (type, custom) => {
        if (type === 'OTHER') return custom || 'Custom';
        const found = INVESTMENT_TYPES.find(t => t.value === type);
        return found ? found.label.split(' ')[0] : type;
    };

    const getInvestTypeEmoji = (type) => {
        const found = INVESTMENT_TYPES.find(t => t.value === type);
        return found ? found.label.split(' ')[1] || '📈' : '📈';
    };

    return (
        <div className="max-w-4xl mx-auto px-4 text-text-main">
            {/* Header Block */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4 animate-fade-in">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">Investments</h2>
                    <p className="text-xs sm:text-sm text-text-muted mt-0.5">Redesign and track your investments, portfolios, and capital returns.</p>
                </div>
                
                <button 
                    onClick={() => { setFormData(INITIAL_FORM_STATE); setEditingInvestId(null); setShowCreateModal(true); }}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-secondary text-black font-bold px-4 py-2.5 rounded-xl shadow-lg transition-transform active:scale-95 cursor-pointer text-sm"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>New Investment Profile</span>
                </button>
            </div>

            {loading && investments.length === 0 ? (
                <div className="text-center py-20 flex flex-col justify-center items-center gap-3">
                    <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                    <p className="text-text-muted text-sm font-medium">Fetching details...</p>
                </div>
            ) : (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 animate-fade-in">
                        <div className="p-4 rounded-2xl border border-slate-500/20 bg-slate-500/5 flex flex-col justify-between">
                            <h4 className="text-text-muted text-[10px] sm:text-xs uppercase font-extrabold tracking-widest mb-1">Total Assets Valuation</h4>
                            <div className="text-lg sm:text-2xl font-black text-text-main truncate">
                                ₹{totalActiveBalance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </div>
                        </div>
                        <div className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 flex flex-col justify-between">
                            <h4 className="text-text-muted text-[10px] sm:text-xs uppercase font-extrabold tracking-widest mb-1">Total Invested</h4>
                            <div className="text-lg sm:text-2xl font-black text-emerald-500 truncate">
                                ₹{totalInvestedOverall.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </div>
                        </div>
                        <div className="p-4 rounded-2xl border border-rose-500/20 bg-rose-500/5 flex flex-col justify-between">
                            <h4 className="text-text-muted text-[10px] sm:text-xs uppercase font-extrabold tracking-widest mb-1">Total Taken Back</h4>
                            <div className="text-lg sm:text-2xl font-black text-rose-400 truncate">
                                ₹{totalWithdrawnOverall.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </div>
                        </div>
                        <div className="p-4 rounded-2xl border border-primary/20 bg-primary/5 flex flex-col justify-between">
                            <h4 className="text-text-muted text-[10px] sm:text-xs uppercase font-extrabold tracking-widest mb-1">Active Accounts</h4>
                            <div className="text-lg sm:text-2xl font-black text-primary truncate">
                                {activeCount} / {investments.length}
                            </div>
                        </div>
                    </div>

                    {/* Investments Grid List */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
                        {investments.length === 0 ? (
                            <div className="col-span-full bg-card-dark border border-border-main p-10 rounded-2xl text-center">
                                <span className="text-4xl block mb-3">💼</span>
                                <h3 className="text-base font-bold text-text-main mb-1">No Investment Profiles found</h3>
                                <p className="text-xs text-text-muted max-w-sm mx-auto">Create a profile to start tracking your capital, additions, and returns.</p>
                            </div>
                        ) : (
                            investments.map(inv => {
                                const invested = parseFloat(inv.total_invested || 0);
                                const returned = parseFloat(inv.total_withdrawn || 0);
                                const balance = invested - returned;
                                const returnPct = invested > 0 ? (returned / invested) * 100 : 0;
                                
                                return (
                                    <div 
                                        key={inv.id}
                                        onClick={() => { setSelectedInvest(inv); navigate(`/investments?id=${inv.id}`); }}
                                        className="bg-card-dark border border-border-main hover:border-primary/45 p-5 rounded-2xl shadow-md transition-all cursor-pointer hover:shadow-lg flex flex-col justify-between relative group overflow-hidden"
                                    >
                                        {/* Corner icon effect */}
                                        <div className="absolute right-4 top-4 text-2xl opacity-15 group-hover:scale-110 transition-transform">
                                            {getInvestTypeEmoji(inv.investment_type)}
                                        </div>

                                        <div className="mb-4">
                                            <div className="flex gap-2 items-center mb-1">
                                                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border uppercase tracking-wider ${
                                                    inv.status === 'ACTIVE'
                                                    ? 'bg-emerald-950/60 text-emerald-400 border-emerald-900/40'
                                                    : 'bg-slate-900/60 text-slate-400 border-slate-800/40'
                                                }`}>
                                                    {inv.status}
                                                </span>
                                                <span className="text-[10px] text-text-muted font-bold tracking-wider uppercase">
                                                    {getInvestTypeLabel(inv.investment_type, inv.custom_type)}
                                                </span>
                                            </div>
                                            
                                            <h3 className="text-base font-bold text-text-main group-hover:text-primary transition-colors truncate pr-8">
                                                {inv.name}
                                            </h3>
                                            
                                            {inv.description && (
                                                <p className="text-xs text-text-muted line-clamp-1 mt-1 pr-6 italic">
                                                    {inv.description}
                                                </p>
                                            )}
                                        </div>

                                        <div>
                                            <div className="grid grid-cols-3 gap-2 border-t border-border-main/40 pt-3 mt-1 text-center">
                                                <div>
                                                    <span className="text-[9px] text-text-muted font-semibold block uppercase">Invested</span>
                                                    <span className="text-xs font-bold text-text-main">₹{invested.toLocaleString()}</span>
                                                </div>
                                                <div>
                                                    <span className="text-[9px] text-text-muted font-semibold block uppercase">Returned</span>
                                                    <span className="text-xs font-bold text-rose-400">₹{returned.toLocaleString()}</span>
                                                </div>
                                                <div>
                                                    <span className="text-[9px] text-text-muted font-semibold block uppercase">Balance</span>
                                                    <span className="text-xs font-black text-secondary">₹{balance.toLocaleString()}</span>
                                                </div>
                                            </div>

                                            {/* Progress Bar showing return portion */}
                                            {invested > 0 && (
                                                <div className="w-full h-1 bg-border-main/50 rounded-full mt-3 overflow-hidden">
                                                    <div 
                                                        className="h-full bg-secondary"
                                                        style={{ width: `${Math.min(100, Math.max(0, 100 - returnPct))}%` }}
                                                    ></div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </>
            )}

            {/* View Details Drawer Panel (Overlay) */}
            {selectedInvest && (
                <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
                    {/* Backdrop */}
                    <div 
                        className="fixed inset-0 bg-black/60 backdrop-blur-xs" 
                        onClick={() => { setSelectedInvest(null); navigate('/investments'); }}
                    ></div>
                    
                    {/* Panel */}
                    <div className="relative w-full max-w-md bg-card-dark border-l border-border-main h-full flex flex-col shadow-2xl p-5 sm:p-6 z-10 animate-slide-up sm:animate-fade-in">
                        {/* Header */}
                        <div className="flex justify-between items-center mb-6 pb-4 border-b border-border-main">
                            <div className="min-w-0 pr-4">
                                <div className="flex gap-2 items-center mb-1">
                                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border uppercase tracking-wider ${
                                        selectedInvest.status === 'ACTIVE'
                                        ? 'bg-emerald-950/60 text-emerald-400 border-emerald-900/40'
                                        : 'bg-slate-900/60 text-slate-400 border-slate-800/40'
                                    }`}>
                                        {selectedInvest.status}
                                    </span>
                                    <span className="text-[10px] text-text-muted font-bold tracking-wider uppercase">
                                        {getInvestTypeLabel(selectedInvest.investment_type, selectedInvest.custom_type)}
                                    </span>
                                </div>
                                <h3 className="text-lg font-black text-text-main truncate">{selectedInvest.name}</h3>
                            </div>
                            
                            <button 
                                onClick={() => { setSelectedInvest(null); navigate('/investments'); }}
                                className="p-1.5 rounded-lg bg-bg-dark border border-border-main text-text-muted hover:text-text-main cursor-pointer"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Description & Date */}
                        <div className="mb-5 bg-bg-dark/40 border border-border-main/50 p-3.5 rounded-xl text-xs space-y-1">
                            <div className="text-text-muted">
                                <span className="font-bold">Date Initiated:</span> {selectedInvest.date}
                            </div>
                            {selectedInvest.description && (
                                <div className="text-text-main italic leading-relaxed">
                                    "{selectedInvest.description}"
                                </div>
                            )}
                        </div>

                        {/* Detailed Stats */}
                        <div className="grid grid-cols-3 gap-3 mb-6">
                            <div className="bg-bg-dark border border-border-main p-3 rounded-xl text-center">
                                <span className="text-[9px] text-text-muted uppercase font-bold block mb-1">Invested</span>
                                <span className="text-sm font-extrabold text-text-main">₹{parseFloat(selectedInvest.total_invested || 0).toLocaleString()}</span>
                            </div>
                            <div className="bg-bg-dark border border-border-main p-3 rounded-xl text-center">
                                <span className="text-[9px] text-text-muted uppercase font-bold block mb-1">Withdrawn</span>
                                <span className="text-sm font-extrabold text-rose-400">₹{parseFloat(selectedInvest.total_withdrawn || 0).toLocaleString()}</span>
                            </div>
                            <div className="bg-bg-dark border border-border-main p-3 rounded-xl text-center">
                                <span className="text-[9px] text-text-muted uppercase font-bold block mb-1">Remaining</span>
                                <span className="text-sm font-extrabold text-secondary">₹{parseFloat(selectedInvest.remaining_balance || 0).toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <button
                                onClick={() => handleAddTxnClick('INVESTMENT')}
                                className="bg-primary hover:bg-primary-hover text-black font-extrabold py-2.5 px-4 rounded-xl text-xs sm:text-sm text-center cursor-pointer transition-colors shadow-md active:scale-95"
                            >
                                💸 Add Capital
                            </button>
                            <button
                                onClick={() => handleAddTxnClick('INVESTMENT_RETURN')}
                                disabled={parseFloat(selectedInvest.remaining_balance || 0) <= 0}
                                className="bg-secondary hover:bg-secondary-hover disabled:bg-slate-800 disabled:text-text-muted disabled:border-slate-800 disabled:scale-100 disabled:cursor-not-allowed border border-secondary text-black font-extrabold py-2.5 px-4 rounded-xl text-xs sm:text-sm text-center cursor-pointer transition-colors shadow-md active:scale-95"
                            >
                                💰 Withdraw Funds
                            </button>
                        </div>

                        {/* Transaction History Timeline */}
                        <div className="flex-1 flex flex-col min-h-0">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3">Timeline & History</h4>
                            
                            <div className="flex-1 overflow-y-auto divide-y divide-border-main/40 pr-1">
                                {selectedInvest.transactions && selectedInvest.transactions.length === 0 ? (
                                    <div className="text-center py-10 text-text-muted text-xs italic">
                                        No ledger transactions registered yet.
                                    </div>
                                ) : (
                                    selectedInvest.transactions?.map(txn => (
                                        <div key={txn.id} className="py-3 flex items-center justify-between text-xs hover:bg-bg-dark/10 transition-all rounded px-1">
                                            <div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`w-1.5 h-1.5 rounded-full ${txn.transaction_type === 'INVESTMENT' ? 'bg-primary' : 'bg-secondary'}`}></span>
                                                    <span className="font-bold text-text-main">
                                                        {txn.transaction_type === 'INVESTMENT' ? 'Capital Added' : 'Capital Withdrawn'}
                                                    </span>
                                                    <span className={`px-1.5 py-0.1 text-[8px] font-bold rounded ${txn.payment_mode === 'CASH' ? 'bg-yellow-950/60 text-yellow-400' : 'bg-blue-950/60 text-blue-400'}`}>
                                                        {txn.payment_mode}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-text-muted mt-0.5">{txn.date} • {txn.description || 'No notes'}</p>
                                            </div>
                                            <span className={`font-mono font-bold text-sm ${txn.transaction_type === 'INVESTMENT' ? 'text-primary' : 'text-secondary'}`}>
                                                {txn.transaction_type === 'INVESTMENT' ? '-' : '+'}${(parseFloat(txn.amount)).toLocaleString()}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Edit & Delete Profile */}
                        <div className="mt-4 pt-4 border-t border-border-main flex gap-3">
                            <button
                                onClick={() => handleEditStart(selectedInvest)}
                                className="flex-1 bg-bg-dark hover:bg-border-main text-text-main border border-border-main font-bold py-2 rounded-xl text-xs text-center cursor-pointer transition-colors"
                            >
                                ✏️ Edit Profile
                            </button>
                            <button
                                onClick={() => handleDeleteInvest(selectedInvest.id)}
                                className="flex-1 bg-error/10 hover:bg-error/20 text-error font-bold py-2 rounded-xl text-xs text-center cursor-pointer transition-colors"
                            >
                                🗑️ Delete Profile
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create/Edit Investment Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
                    {/* Backdrop */}
                    <div 
                        className="fixed inset-0 bg-black/60 backdrop-blur-xs" 
                        onClick={() => { setShowCreateModal(false); setEditingInvestId(null); }}
                    ></div>
                    
                    {/* Modal Content */}
                    <form onSubmit={handleFormSubmit} className="relative w-full sm:max-w-md bg-card-dark border-t sm:border border-border-main rounded-t-2xl sm:rounded-2xl shadow-2xl p-5 sm:p-6 z-10 animate-slide-up sm:animate-fade-in">
                        <div className="flex justify-between items-center mb-4 pb-2 border-b border-border-main">
                            <h3 className="text-base sm:text-lg font-bold text-text-main">
                                {editingInvestId ? 'Edit Investment Profile' : 'New Investment Profile'}
                            </h3>
                            <button 
                                type="button"
                                onClick={() => { setShowCreateModal(false); setEditingInvestId(null); }}
                                className="p-1.5 rounded-lg bg-bg-dark border border-border-main text-text-muted hover:text-text-main cursor-pointer"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-4 text-xs sm:text-sm">
                            {/* Name */}
                            <div>
                                <label className="block text-xs text-text-muted mb-1 font-semibold uppercase tracking-wider">Investment Name</label>
                                <input 
                                    type="text" 
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="e.g. Gold SIP, Nifty 50 Index"
                                    className="w-full bg-bg-dark border border-border-main rounded-xl px-3 py-2.5 focus:border-primary outline-none text-text-main text-sm"
                                />
                            </div>

                            {/* Date */}
                            <div>
                                <label className="block text-xs text-text-muted mb-1 font-semibold uppercase tracking-wider">Initiation Date</label>
                                <input 
                                    type="date" 
                                    required
                                    value={formData.date}
                                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                                    className="w-full bg-bg-dark border border-border-main rounded-xl px-3 py-2.5 focus:border-primary outline-none text-text-main text-sm cursor-pointer"
                                />
                            </div>

                            {/* Investment Type */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-text-muted mb-1 font-semibold uppercase tracking-wider">Investment Type</label>
                                    <select
                                        value={formData.investment_type}
                                        onChange={(e) => setFormData(prev => ({ ...prev, investment_type: e.target.value, custom_type: '' }))}
                                        className="w-full bg-bg-dark border border-border-main rounded-xl px-3 py-2.5 focus:border-primary outline-none text-text-main text-sm cursor-pointer"
                                    >
                                        {INVESTMENT_TYPES.map(type => (
                                            <option key={type.value} value={type.value}>{type.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {formData.investment_type === 'OTHER' && (
                                    <div>
                                        <label className="block text-xs text-text-muted mb-1 font-semibold uppercase tracking-wider">Custom Type Name</label>
                                        <input 
                                            type="text" 
                                            required
                                            value={formData.custom_type}
                                            onChange={(e) => setFormData(prev => ({ ...prev, custom_type: e.target.value }))}
                                            placeholder="e.g. Real Estate, Crypto"
                                            className="w-full bg-bg-dark border border-border-main rounded-xl px-3 py-2.5 focus:border-primary outline-none text-text-main text-sm"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-xs text-text-muted mb-1 font-semibold uppercase tracking-wider">Description / Notes</label>
                                <textarea 
                                    rows="3"
                                    value={formData.description}
                                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Add goals, details, or notes about this portfolio..."
                                    className="w-full bg-bg-dark border border-border-main rounded-xl px-3 py-2 focus:border-primary outline-none text-text-main text-sm"
                                ></textarea>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-3 border-t border-border-main/50 pt-4">
                            <button
                                type="button"
                                onClick={() => { setShowCreateModal(false); setEditingInvestId(null); }}
                                className="bg-bg-dark border border-border-main text-text-muted px-4 py-2 rounded-xl text-sm font-bold transition-all hover:bg-border-main cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="bg-primary hover:bg-primary-hover text-black px-5 py-2 rounded-xl text-sm font-extrabold transition-all cursor-pointer active:scale-95"
                            >
                                {saving ? 'Saving...' : editingInvestId ? 'Save Changes' : 'Create Profile'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Quick Add Transaction pre-filled modal */}
            {showTxnModal && txnPrefill && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
                    {/* Backdrop */}
                    <div 
                        className="fixed inset-0 bg-black/60 backdrop-blur-xs" 
                        onClick={() => { setShowTxnModal(false); setTxnPrefill(null); }}
                    ></div>
                    
                    {/* Modal Content */}
                    <div className="relative w-full sm:max-w-xl bg-card-dark border-t sm:border border-border-main rounded-t-2xl sm:rounded-2xl shadow-2xl p-5 sm:p-6 max-h-[85vh] sm:max-h-[90vh] overflow-y-auto z-10 animate-slide-up sm:animate-fade-in pb-10 sm:pb-6">
                        <div className="flex justify-between items-center mb-4 pb-2 border-b border-border-main">
                            <h3 className="text-base sm:text-lg font-bold text-text-main">
                                {txnPrefill.transaction_type === 'INVESTMENT' ? 'Add Capital to Investment' : 'Withdraw Capital from Investment'}
                            </h3>
                            <button 
                                onClick={() => { setShowTxnModal(false); setTxnPrefill(null); }}
                                className="p-1.5 rounded-lg bg-bg-dark border border-border-main text-text-muted hover:text-text-main cursor-pointer"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <TransactionForm 
                            onTransactionAdded={() => { fetchInvestmentsList(); setShowTxnModal(false); setTxnPrefill(null); }} 
                            onCancelInvestment={() => { setShowTxnModal(false); setTxnPrefill(null); }}
                            prefillInvestment={txnPrefill}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default InvestmentList;
