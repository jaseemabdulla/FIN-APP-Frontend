import React, { useState, useEffect } from 'react';
import { getLedgers, createLedger, updateLedger, deleteLedger } from '../api';

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
                                                        <span className="text-text-main">{ledger.name}</span>
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
                                                        <h4 className="font-extrabold text-base text-text-main">{ledger.name}</h4>
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
        </div>
    );
};

export default LedgerManager;
