import React, { useState, useEffect } from 'react';
import { getLedgers, createLedger, updateLedger, deleteLedger, getTransactions } from '../api';

const LedgerManager = () => {
    const [ledgers, setLedgers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Form state for creating a new Ledger
    const [showAddForm, setShowAddForm] = useState(false);
    const [newName, setNewName] = useState('');
    const [newPhone, setNewPhone] = useState('');
    const [newEmail, setNewEmail] = useState('');
    
    // State for editing a Ledger
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [editEmail, setEditEmail] = useState('');
    
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    // Ledger History view states
    const [selectedLedger, setSelectedLedger] = useState(null);
    const [ledgerTransactions, setLedgerTransactions] = useState([]);
    const [transactionsLoading, setTransactionsLoading] = useState(false);
    const [historySearchQuery, setHistorySearchQuery] = useState('');

    const fetchLedgerHistory = async (ledgerId) => {
        setTransactionsLoading(true);
        try {
            const res = await getTransactions({ ledger: ledgerId });
            setLedgerTransactions(res.data);
        } catch (err) {
            console.error("Failed to fetch ledger transactions", err);
            setErrorMsg("Failed to load ledger history.");
        } finally {
            setTransactionsLoading(false);
        }
    };

    useEffect(() => {
        if (selectedLedger) {
            fetchLedgerHistory(selectedLedger.id);
            setShowAddForm(false);
        } else {
            setLedgerTransactions([]);
        }
    }, [selectedLedger]);

    useEffect(() => {
        fetchLedgers();
    }, []);

    const fetchLedgers = async () => {
        setLoading(true);
        try {
            const res = await getLedgers();
            setLedgers(res.data);
        } catch (err) {
            console.error("Failed to fetch ledgers", err);
            setErrorMsg("Failed to load ledgers from backend.");
        } finally {
            setLoading(false);
        }
    };

    const clearMessages = () => {
        setErrorMsg('');
        setSuccessMsg('');
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        clearMessages();
        if (!newName.trim()) {
            setErrorMsg("Name is required.");
            return;
        }

        try {
            const payload = {
                name: newName.trim(),
                phone: newPhone.trim(),
                email: newEmail.trim()
            };
            const res = await createLedger(payload);
            setSuccessMsg(`Ledger "${res.data.name}" created successfully!`);
            
            // Reset form
            setNewName('');
            setNewPhone('');
            setNewEmail('');
            setShowAddForm(false);
            
            // Refresh list
            fetchLedgers();
        } catch (err) {
            console.error(err);
            const detail = err.response?.data?.name?.[0] || err.response?.data?.detail || "Failed to create ledger.";
            setErrorMsg(detail);
        }
    };

    const handleStartEdit = (ledger) => {
        clearMessages();
        setEditingId(ledger.id);
        setEditName(ledger.name);
        setEditPhone(ledger.phone || '');
        setEditEmail(ledger.email || '');
    };

    const handleSaveEdit = async (id) => {
        clearMessages();
        if (!editName.trim()) {
            setErrorMsg("Name is required.");
            return;
        }

        try {
            const payload = {
                name: editName.trim(),
                phone: editPhone.trim(),
                email: editEmail.trim()
            };
            const res = await updateLedger(id, payload);
            setSuccessMsg(`Ledger "${res.data.name}" updated successfully!`);
            setEditingId(null);
            fetchLedgers();
        } catch (err) {
            console.error(err);
            const detail = err.response?.data?.name?.[0] || err.response?.data?.detail || "Failed to update ledger.";
            setErrorMsg(detail);
        }
    };

    const handleDelete = async (ledger) => {
        clearMessages();
        if (ledger.debt_count > 0) {
            setErrorMsg(`Cannot delete ledger "${ledger.name}" because it is linked to ${ledger.debt_count} debt record(s).`);
            return;
        }

        if (!window.confirm(`Are you sure you want to delete ledger "${ledger.name}"?`)) {
            return;
        }

        try {
            await deleteLedger(ledger.id);
            setSuccessMsg(`Ledger "${ledger.name}" deleted successfully!`);
            fetchLedgers();
        } catch (err) {
            console.error(err);
            const detail = err.response?.data?.detail || "Failed to delete ledger. It might be linked to existing debts.";
            setErrorMsg(detail);
        }
    };

    const filteredLedgers = ledgers.filter(ledger => 
        ledger.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ledger.phone && ledger.phone.includes(searchQuery)) ||
        (ledger.email && ledger.email.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="max-w-4xl mx-auto px-4 text-text-main animate-fade-in space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">Ledger Registry</h2>
                    <p className="text-xs sm:text-sm text-text-muted mt-0.5">Manage contacts, profiles, and associated debt networks.</p>
                </div>
                <button
                    onClick={() => {
                        clearMessages();
                        setShowAddForm(!showAddForm);
                    }}
                    className="w-full sm:w-auto bg-gradient-to-r from-primary to-secondary text-black font-extrabold py-2.5 px-5 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer text-sm"
                >
                    {showAddForm ? (
                        <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                            Cancel
                        </>
                    ) : (
                        <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                            New Ledger
                        </>
                    )}
                </button>
            </div>

            {/* Error and Success Alerts */}
            {errorMsg && (
                <div className="bg-error/15 border border-error/25 text-error px-4 py-3 rounded-xl flex justify-between items-center animate-fade-in text-xs font-semibold">
                    <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span>{errorMsg}</span>
                    </div>
                    <button onClick={() => setErrorMsg('')} className="text-error hover:opacity-80 cursor-pointer">
                        ✕
                    </button>
                </div>
            )}

            {successMsg && (
                <div className="bg-success/15 border border-success/25 text-success px-4 py-3 rounded-xl flex justify-between items-center animate-fade-in text-xs font-semibold">
                    <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span>{successMsg}</span>
                    </div>
                    <button onClick={() => setSuccessMsg('')} className="text-success hover:opacity-80 cursor-pointer">
                        ✕
                    </button>
                </div>
            )}

            {/* Quick Add Form */}
            {showAddForm && (
                <form onSubmit={handleCreate} className="bg-card-dark p-5 rounded-2xl border border-border-main shadow-xl mb-6 grid gap-4 grid-cols-1 sm:grid-cols-3 items-end animate-fade-in">
                    <div>
                        <label className="block text-xs text-text-muted mb-1.5 uppercase font-semibold tracking-wide">Name *</label>
                        <input
                            type="text"
                            required
                            placeholder="Full Name"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="w-full bg-bg-dark border border-border-main rounded-xl px-3.5 py-2.5 outline-none focus:border-primary text-sm text-text-main placeholder-text-muted font-semibold"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-text-muted mb-1.5 uppercase font-semibold tracking-wide">Phone (Optional)</label>
                        <input
                            type="text"
                            placeholder="Phone Number"
                            value={newPhone}
                            onChange={(e) => setNewPhone(e.target.value)}
                            className="w-full bg-bg-dark border border-border-main rounded-xl px-3.5 py-2.5 outline-none focus:border-primary text-sm text-text-main placeholder-text-muted font-mono"
                        />
                    </div>
                    <div className="flex gap-2.5 items-end">
                        <div className="flex-1">
                            <label className="block text-xs text-text-muted mb-1.5 uppercase font-semibold tracking-wide">Email (Optional)</label>
                            <input
                                type="email"
                                placeholder="email@address.com"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                className="w-full bg-bg-dark border border-border-main rounded-xl px-3.5 py-2.5 outline-none focus:border-primary text-sm text-text-main placeholder-text-muted"
                            />
                        </div>
                        <button
                            type="submit"
                            className="bg-secondary hover:bg-secondary-hover text-black font-extrabold h-[42px] px-5 rounded-xl transition-all shadow-md cursor-pointer shrink-0 text-xs uppercase"
                        >
                            Save
                        </button>
                    </div>
                </form>
            )}

            {selectedLedger ? (
                <LedgerHistoryView 
                    ledger={selectedLedger}
                    transactions={ledgerTransactions}
                    loading={transactionsLoading}
                    searchQuery={historySearchQuery}
                    setSearchQuery={setHistorySearchQuery}
                    onBack={() => {
                        setSelectedLedger(null);
                        setHistorySearchQuery('');
                    }}
                />
            ) : (
                <>
                    {/* Search Bar */}
                    <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <svg className="h-4 w-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </span>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search ledger by name, contact, phone..."
                            className="w-full bg-card-dark border border-border-main rounded-2xl pl-11 pr-4 py-3.5 outline-none focus:border-primary text-text-main placeholder-text-muted transition-all text-sm font-semibold"
                        />
                    </div>

                    {/* Ledgers List */}
                    <div className="bg-card-dark rounded-2xl border border-border-main overflow-hidden shadow-xl">
                        {loading ? (
                            <div className="text-center py-20 text-text-muted flex flex-col justify-center items-center gap-3">
                                <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                                <p className="text-sm font-semibold">Syncing contact indexes...</p>
                            </div>
                        ) : filteredLedgers.length === 0 ? (
                            <div className="text-center py-16 text-text-muted text-sm font-semibold">
                                {searchQuery ? "No matching ledger records found." : "No ledgers created yet. Click 'New Ledger' to register contacts."}
                            </div>
                        ) : (
                            <>
                                {/* Desktop Table View */}
                                <div className="hidden md:block overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-border-main bg-bg-dark/40 text-text-muted text-[10px] font-bold uppercase tracking-wider">
                                                <th className="py-4 px-5">Name</th>
                                                <th className="py-4 px-5">Contact Details</th>
                                                <th className="py-4 px-5 text-center">Debts linked</th>
                                                <th className="py-4 px-5 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border-main/50">
                                            {filteredLedgers.map(ledger => {
                                                const isEditing = editingId === ledger.id;
                                                return (
                                                    <tr key={ledger.id} className="hover:bg-bg-dark/20 transition-all">
                                                        {/* Name Column */}
                                                        <td className="py-4 px-5 text-sm font-semibold">
                                                            {isEditing ? (
                                                                <input
                                                                    type="text"
                                                                    value={editName}
                                                                    onChange={(e) => setEditName(e.target.value)}
                                                                    className="bg-bg-dark border border-border-main rounded-xl px-2.5 py-1.5 w-full outline-none focus:border-primary text-text-main text-xs font-semibold"
                                                                />
                                                            ) : (
                                                                <span 
                                                                    onClick={() => setSelectedLedger(ledger)}
                                                                    className="text-text-main hover:text-primary cursor-pointer hover:underline font-bold"
                                                                >
                                                                    {ledger.name}
                                                                </span>
                                                            )}
                                                        </td>

                                                        {/* Contact Details Column */}
                                                        <td className="py-4 px-5 text-sm">
                                                            {isEditing ? (
                                                                <div className="flex flex-col gap-2">
                                                                    <input
                                                                        type="text"
                                                                        placeholder="Phone"
                                                                        value={editPhone}
                                                                        onChange={(e) => setEditPhone(e.target.value)}
                                                                        className="bg-bg-dark border border-border-main rounded-xl px-2.5 py-1.5 w-full outline-none focus:border-primary text-text-main text-xs font-mono"
                                                                    />
                                                                    <input
                                                                        type="email"
                                                                        placeholder="Email"
                                                                        value={editEmail}
                                                                        onChange={(e) => setEditEmail(e.target.value)}
                                                                        className="bg-bg-dark border border-border-main rounded-xl px-2.5 py-1.5 w-full outline-none focus:border-primary text-text-main text-xs font-semibold"
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <div className="flex flex-col gap-1 text-xs text-text-muted">
                                                                    {ledger.phone && (
                                                                        <span className="flex items-center gap-1.5 font-mono text-text-muted font-semibold">
                                                                            📞 {ledger.phone}
                                                                        </span>
                                                                    )}
                                                                    {ledger.email && (
                                                                        <span className="flex items-center gap-1.5 text-text-muted font-semibold">
                                                                            ✉️ {ledger.email}
                                                                        </span>
                                                                    )}
                                                                    {!ledger.phone && !ledger.email && (
                                                                        <span className="text-text-muted/60 italic">No contact info</span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </td>

                                                        {/* Linked Debts Count */}
                                                        <td className="py-4 px-5 text-center">
                                                            <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase leading-none border ${
                                                                ledger.debt_count > 0 
                                                                    ? 'bg-primary/10 text-primary border-primary/20' 
                                                                    : 'bg-bg-dark text-text-muted border-border-main/55'
                                                            }`}>
                                                                {ledger.debt_count} linked
                                                            </span>
                                                        </td>

                                                        {/* Actions Column */}
                                                        <td className="py-4 px-5 text-right text-sm">
                                                            {isEditing ? (
                                                                <div className="flex justify-end gap-2">
                                                                    <button 
                                                                        onClick={() => handleSaveEdit(ledger.id)} 
                                                                        className="bg-success text-black px-3 py-1.5 rounded-lg text-xs font-extrabold shadow cursor-pointer active:scale-95"
                                                                    >
                                                                        Save
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => setEditingId(null)} 
                                                                        className="bg-bg-dark border border-border-main text-text-muted px-3 py-1.5 rounded-lg text-xs font-extrabold cursor-pointer"
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <div className="flex justify-end gap-3.5">
                                                                    <button 
                                                                        onClick={() => setSelectedLedger(ledger)} 
                                                                        className="text-secondary hover:underline font-bold text-xs flex items-center gap-1 cursor-pointer"
                                                                    >
                                                                        📜 History
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => handleStartEdit(ledger)} 
                                                                        className="text-primary hover:underline font-bold text-xs flex items-center gap-1 cursor-pointer"
                                                                    >
                                                                        ✏️ Edit
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => handleDelete(ledger)} 
                                                                        className="text-error hover:underline font-bold text-xs flex items-center gap-1 cursor-pointer"
                                                                    >
                                                                        🗑️ Delete
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile List View */}
                                <div className="md:hidden divide-y divide-border-main/50">
                                    {filteredLedgers.map(ledger => {
                                        const isEditing = editingId === ledger.id;
                                        return (
                                            <div key={ledger.id} className="p-4 flex flex-col gap-3">
                                                {isEditing ? (
                                                    <div className="space-y-2">
                                                        <input
                                                            type="text"
                                                            value={editName}
                                                            onChange={(e) => setEditName(e.target.value)}
                                                            placeholder="Name"
                                                            className="bg-bg-dark border border-border-main rounded-xl px-2.5 py-1.5 w-full outline-none focus:border-primary text-text-main text-xs font-semibold"
                                                        />
                                                        <input
                                                            type="text"
                                                            placeholder="Phone"
                                                            value={editPhone}
                                                            onChange={(e) => setEditPhone(e.target.value)}
                                                            className="bg-bg-dark border border-border-main rounded-xl px-2.5 py-1.5 w-full outline-none focus:border-primary text-text-main text-xs font-mono"
                                                        />
                                                        <input
                                                            type="email"
                                                            placeholder="Email"
                                                            value={editEmail}
                                                            onChange={(e) => setEditEmail(e.target.value)}
                                                            className="bg-bg-dark border border-border-main rounded-xl px-2.5 py-1.5 w-full outline-none focus:border-primary text-text-main text-xs font-semibold"
                                                        />
                                                        <div className="flex gap-2 justify-end pt-2">
                                                            <button 
                                                                onClick={() => setEditingId(null)} 
                                                                className="bg-bg-dark border border-border-main text-text-muted px-3 py-1.5 rounded-lg text-xs font-extrabold cursor-pointer"
                                                            >
                                                                Cancel
                                                            </button>
                                                            <button 
                                                                onClick={() => handleSaveEdit(ledger.id)} 
                                                                className="bg-success text-black px-4 py-1.5 rounded-lg text-xs font-extrabold shadow cursor-pointer"
                                                            >
                                                                Save
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="flex justify-between items-start gap-2">
                                                            <div>
                                                                <h4 
                                                                    onClick={() => setSelectedLedger(ledger)}
                                                                    className="font-extrabold text-base text-text-main hover:text-primary cursor-pointer hover:underline"
                                                                >
                                                                    {ledger.name}
                                                                </h4>
                                                                <div className="flex flex-col gap-1 text-[11px] text-text-muted mt-1.5 font-semibold">
                                                                    {ledger.phone && <span>📞 {ledger.phone}</span>}
                                                                    {ledger.email && <span>✉️ {ledger.email}</span>}
                                                                    {!ledger.phone && !ledger.email && <span className="italic text-text-muted/60">No contact info</span>}
                                                                </div>
                                                            </div>
                                                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                                                                ledger.debt_count > 0 ? 'bg-primary/10 text-primary border-primary/20' : 'bg-bg-dark text-text-muted border-border-main'
                                                            }`}>
                                                                {ledger.debt_count} linked
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-end gap-4 border-t border-border-main/30 pt-2">
                                                            <button 
                                                                onClick={() => setSelectedLedger(ledger)} 
                                                                className="text-secondary hover:underline font-bold text-xs flex items-center gap-1 cursor-pointer"
                                                            >
                                                                📜 History
                                                            </button>
                                                            <button 
                                                                onClick={() => handleStartEdit(ledger)} 
                                                                className="text-primary hover:underline font-bold text-xs flex items-center gap-1 cursor-pointer"
                                                            >
                                                                ✏️ Edit
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDelete(ledger)} 
                                                                className="text-error hover:underline font-bold text-xs flex items-center gap-1 cursor-pointer"
                                                            >
                                                                🗑️ Delete
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

const LedgerHistoryView = ({ ledger, transactions, loading, searchQuery, setSearchQuery, onBack }) => {
    const [filterType, setFilterType] = useState('all'); // all, inflow, outflow

    const getTransactionStatusInfo = (txn) => {
        const type = txn.transaction_type;
        
        if (['DEBT_TAKEN', 'DEBT_GIVEN'].includes(type)) {
            const isCleared = txn.debt_is_cleared;
            const remaining = txn.debt_remaining_amount;
            const totalRepaid = txn.debt_total_repaid;
            
            if (isCleared || remaining <= 0) {
                return {
                    label: 'Cleared',
                    colorClass: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
                };
            }
            if (totalRepaid > 0) {
                return {
                    label: 'Partially Cleared',
                    colorClass: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20'
                };
            }
            return {
                label: 'Active',
                colorClass: 'text-rose-500 bg-rose-500/10 border-rose-500/20'
            };
        }
        
        if (['FUND_MANAGEMENT_INC', 'FUND_MANAGEMENT_DEC'].includes(type)) {
            const fundStatus = txn.fund_status;
            if (fundStatus === 'CLOSED') {
                return {
                    label: 'Closed',
                    colorClass: 'text-text-muted bg-bg-dark border-border-main/55'
                };
            }
            return {
                label: 'Active',
                colorClass: 'text-rose-500 bg-rose-500/10 border-rose-500/20'
            };
        }
        
        return {
            label: 'Completed',
            colorClass: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
        };
    };

    const getCategoryEmoji = (catName) => {
        if (!catName) return '💰';
        const name = catName.toLowerCase();
        if (name.includes('food') || name.includes('eat') || name.includes('restaurant')) return '🍔';
        if (name.includes('rent') || name.includes('flat') || name.includes('house')) return '🏠';
        if (name.includes('travel') || name.includes('cab') || name.includes('metro') || name.includes('fuel') || name.includes('bike')) return '🚗';
        if (name.includes('movie') || name.includes('show') || name.includes('entertainment') || name.includes('game')) return '🎬';
        if (name.includes('shop') || name.includes('clothes') || name.includes('store')) return '🛍️';
        if (name.includes('salary') || name.includes('wage') || name.includes('work')) return '💼';
        if (name.includes('medical') || name.includes('health') || name.includes('doctor') || name.includes('medicine')) return '💊';
        if (name.includes('loan') || name.includes('debt') || name.includes('borrow')) return '🤝';
        if (name.includes('invest') || name.includes('stock') || name.includes('mutual')) return '📈';
        if (name.includes('bill') || name.includes('recharge') || name.includes('phone') || name.includes('wifi')) return '⚡';
        return '💰';
    };

    const getTxnTypeBadge = (type) => {
        const isInflow = ['INCOME', 'DEBT_TAKEN', 'DEBT_GIVEN_RETURN', 'FUND_MANAGEMENT_INC'].includes(type);
        let label = type;
        switch (type) {
            case 'INCOME': label = 'Income'; break;
            case 'EXPENSE': label = 'Expense'; break;
            case 'INVESTMENT': label = 'Investment'; break;
            case 'DEBT_TAKEN': label = 'Debt Taken'; break;
            case 'DEBT_GIVEN': label = 'Debt Given'; break;
            case 'DEBT_TAKEN_RETURN': label = 'Debt Repaid'; break;
            case 'DEBT_GIVEN_RETURN': label = 'Debt Returned'; break;
            case 'FUND_MANAGEMENT_INC': label = 'Fund Addition'; break;
            case 'FUND_MANAGEMENT_DEC': label = 'Fund Expense'; break;
        }

        return {
            label,
            colorClass: isInflow ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' : 'text-rose-500 bg-rose-500/10 border-rose-500/20',
            isInflow
        };
    };

    // Calculate dynamic stats
    const totals = transactions.reduce((acc, txn) => {
        const amount = parseFloat(txn.amount);
        const type = txn.transaction_type;
        const isInflow = ['INCOME', 'DEBT_TAKEN', 'DEBT_GIVEN_RETURN', 'FUND_MANAGEMENT_INC'].includes(type);
        const isOutflow = ['EXPENSE', 'INVESTMENT', 'DEBT_GIVEN', 'DEBT_TAKEN_RETURN', 'FUND_MANAGEMENT_DEC'].includes(type);

        if (isInflow) acc.inflow += amount;
        if (isOutflow) acc.outflow += amount;
        return acc;
    }, { inflow: 0, outflow: 0 });
    
    const netBalance = totals.inflow - totals.outflow;

    // Filter transactions
    const filteredTxns = transactions.filter(txn => {
        const badgeInfo = getTxnTypeBadge(txn.transaction_type);
        
        // Filter by flow type
        if (filterType === 'inflow' && !badgeInfo.isInflow) return false;
        if (filterType === 'outflow' && badgeInfo.isInflow) return false;

        // Search text matching
        const q = searchQuery.toLowerCase();
        const categoryMatch = txn.category_name && txn.category_name.toLowerCase().includes(q);
        const descMatch = txn.description && txn.description.toLowerCase().includes(q);
        const amountMatch = txn.amount.toString().includes(q);
        const typeMatch = badgeInfo.label.toLowerCase().includes(q);
        const modeMatch = txn.payment_mode.toLowerCase().includes(q);
        
        return categoryMatch || descMatch || amountMatch || typeMatch || modeMatch;
    });

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header Control */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={onBack}
                        className="bg-bg-dark border border-border-main hover:bg-border-main/20 text-text-muted hover:text-text-main p-2.5 rounded-xl transition-all cursor-pointer shadow active:scale-95 flex items-center justify-center"
                    >
                        <svg className="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>
                    <div>
                        <h2 className="text-xl sm:text-2xl font-black text-secondary tracking-tight">
                            {ledger.name}
                        </h2>
                        <p className="text-xs text-text-muted mt-0.5 font-semibold">
                            {ledger.phone || ledger.email ? (
                                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                    {ledger.phone && <span>📞 {ledger.phone}</span>}
                                    {ledger.phone && ledger.email && <span className="text-border-main">|</span>}
                                    {ledger.email && <span>✉️ {ledger.email}</span>}
                                </span>
                            ) : (
                                "No contact details registered for this profile."
                            )}
                        </p>
                    </div>
                </div>
            </div>

            {/* Inflow/Outflow/Net Balance Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-2xl shadow-md">
                    <h4 className="text-text-muted text-[10px] sm:text-xs uppercase font-extrabold tracking-widest mb-1.5">Total Inflow</h4>
                    <div className="text-lg sm:text-2xl font-black text-emerald-500">
                        ₹{totals.inflow.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                </div>
                <div className="bg-rose-500/5 border border-rose-500/20 p-4 rounded-2xl shadow-md">
                    <h4 className="text-text-muted text-[10px] sm:text-xs uppercase font-extrabold tracking-widest mb-1.5">Total Outflow</h4>
                    <div className="text-lg sm:text-2xl font-black text-rose-500">
                        ₹{totals.outflow.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                </div>
                <div className={`p-4 rounded-2xl border shadow-md ${
                    netBalance >= 0 ? 'bg-primary/5 border-primary/20' : 'bg-rose-500/5 border-rose-500/20'
                }`}>
                    <h4 className="text-text-muted text-[10px] sm:text-xs uppercase font-extrabold tracking-widest mb-1.5">Net Balance</h4>
                    <div className={`text-lg sm:text-2xl font-black ${
                        netBalance >= 0 ? 'text-primary' : 'text-rose-500'
                    }`}>
                        {netBalance < 0 ? '-' : ''}₹{Math.abs(netBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                </div>
            </div>

            {/* Filter and Search Actions */}
            <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <svg className="h-4 w-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </span>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by amount, type, payment mode, desc..."
                        className="w-full bg-card-dark border border-border-main rounded-2xl pl-11 pr-4 py-3 outline-none focus:border-primary text-text-main placeholder-text-muted transition-all text-sm font-semibold"
                    />
                </div>
                <div className="flex bg-bg-dark border border-border-main p-1 rounded-xl shrink-0">
                    <button
                        onClick={() => setFilterType('all')}
                        className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                            filterType === 'all' ? 'bg-card-dark text-primary shadow' : 'text-text-muted hover:text-text-main'
                        }`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setFilterType('inflow')}
                        className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                            filterType === 'inflow' ? 'bg-card-dark text-emerald-500 shadow' : 'text-text-muted hover:text-text-main'
                        }`}
                    >
                        Inflows
                    </button>
                    <button
                        onClick={() => setFilterType('outflow')}
                        className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                            filterType === 'outflow' ? 'bg-card-dark text-rose-500 shadow' : 'text-text-muted hover:text-text-main'
                        }`}
                    >
                        Outflows
                    </button>
                </div>
            </div>

            {/* History Table / Card List */}
            <div className="bg-card-dark rounded-2xl border border-border-main overflow-hidden shadow-xl animate-fade-in">
                {loading ? (
                    <div className="text-center py-20 text-text-muted flex flex-col justify-center items-center gap-3">
                        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                        <p className="text-sm font-semibold">Retrieving statement history...</p>
                    </div>
                ) : filteredTxns.length === 0 ? (
                    <div className="text-center py-16 text-text-muted text-sm font-semibold">
                        {searchQuery || filterType !== 'all' ? "No matching statements found." : "No transactions linked to this ledger contact yet."}
                    </div>
                ) : (
                    <>
                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-border-main bg-bg-dark/40 text-text-muted text-[10px] font-bold uppercase tracking-wider">
                                        <th className="py-4 px-5">Date</th>
                                        <th className="py-4 px-5">Type / Category</th>
                                        <th className="py-4 px-5">Description</th>
                                        <th className="py-4 px-5">Payment Mode</th>
                                        <th className="py-4 px-5">Status</th>
                                        <th className="py-4 px-5 text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border-main/50">
                                    {filteredTxns.map(txn => {
                                        const badge = getTxnTypeBadge(txn.transaction_type);
                                        return (
                                            <tr key={txn.id} className="hover:bg-bg-dark/20 transition-all">
                                                <td className="py-4 px-5 text-xs text-text-muted font-mono">{txn.date}</td>
                                                <td className="py-4 px-5">
                                                    <div className="flex flex-col gap-1">
                                                        <span className={`text-[10px] border px-2 py-0.5 rounded font-bold uppercase tracking-wider w-fit ${badge.colorClass}`}>
                                                            {badge.label}
                                                        </span>
                                                        <span className="text-xs text-text-main flex items-center gap-1 font-semibold mt-0.5">
                                                            {getCategoryEmoji(txn.category_name)} {txn.category_name || 'Uncategorized'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-5 text-xs text-text-main font-semibold">
                                                    <div>
                                                        <span>{txn.description || <span className="italic text-text-muted/65">No description</span>}</span>
                                                        <div className="flex gap-1.5 mt-1">
                                                            {txn.related_debt && (
                                                                <span className="text-[9px] bg-purple-950/40 text-purple-400 border border-purple-900/30 px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider">
                                                                    🤝 Debt Record
                                                                </span>
                                                            )}
                                                            {txn.related_fund && (
                                                                <span className="text-[9px] bg-secondary/15 text-secondary border border-secondary/20 px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider">
                                                                    💰 Fund: {txn.related_fund_title}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-5">
                                                    <span className={`text-[10px] border px-2 py-0.5 rounded font-bold uppercase ${
                                                        txn.payment_mode === 'CASH' 
                                                            ? 'bg-yellow-950/60 text-yellow-400 border-yellow-900/40' 
                                                            : 'bg-blue-950/60 text-blue-400 border-blue-900/40'
                                                    }`}>
                                                        {txn.payment_mode}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-5">
                                                    <span className={`text-[9px] border px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${getTransactionStatusInfo(txn).colorClass}`}>
                                                        {getTransactionStatusInfo(txn).label}
                                                    </span>
                                                </td>
                                                <td className={`py-4 px-5 text-right font-extrabold text-sm ${
                                                    badge.isInflow ? 'text-emerald-500' : 'text-rose-500'
                                                }`}>
                                                    {badge.isInflow ? '+' : '-'}₹{parseFloat(txn.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card List View */}
                        <div className="md:hidden divide-y divide-border-main/50">
                            {filteredTxns.map(txn => {
                                const badge = getTxnTypeBadge(txn.transaction_type);
                                return (
                                    <div key={txn.id} className="p-4 flex flex-col gap-2">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-lg bg-bg-dark border border-border-main flex items-center justify-center text-sm shrink-0">
                                                    {getCategoryEmoji(txn.category_name)}
                                                </div>
                                                <div>
                                                    <span className="text-xs text-text-muted font-bold font-mono block">{txn.date}</span>
                                                    <span className="text-sm text-text-main font-semibold block mt-0.5">{txn.category_name || 'Uncategorized'}</span>
                                                </div>
                                            </div>
                                            <span className={`text-base font-extrabold ${badge.isInflow ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                {badge.isInflow ? '+' : '-'}₹{parseFloat(txn.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                        <div className="text-xs text-text-main pl-10 font-semibold leading-relaxed">
                                            {txn.description}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-1.5 pl-10 mt-1">
                                            <span className={`text-[9px] border px-2 py-0.5 rounded font-bold uppercase tracking-wider ${badge.colorClass}`}>
                                                {badge.label}
                                            </span>
                                            <span className={`text-[9px] border px-2 py-0.5 rounded font-bold uppercase tracking-wider ${getTransactionStatusInfo(txn).colorClass}`}>
                                                {getTransactionStatusInfo(txn).label}
                                            </span>
                                            <span className={`text-[9px] border px-2 py-0.5 rounded font-bold uppercase ${
                                                txn.payment_mode === 'CASH' 
                                                    ? 'bg-yellow-950/60 text-yellow-400 border-yellow-900/40' 
                                                    : 'bg-blue-950/60 text-blue-400 border-blue-900/40'
                                            }`}>
                                                {txn.payment_mode}
                                            </span>
                                            {txn.related_debt && (
                                                <span className="text-[9px] bg-purple-950/40 text-purple-400 border border-purple-900/30 px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider">
                                                    🤝 Debt Record
                                                </span>
                                            )}
                                            {txn.related_fund && (
                                                <span className="text-[9px] bg-secondary/15 text-secondary border border-secondary/20 px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider">
                                                    💰 Fund: {txn.related_fund_title}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default LedgerManager;
