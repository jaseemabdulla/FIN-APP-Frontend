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
        <div className="max-w-4xl mx-auto px-4 text-white animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-primary">Ledger Management</h2>
                    <p className="text-gray-400 text-sm mt-1">Manage people, contact profiles, and trace their debt associations.</p>
                </div>
                <button
                    onClick={() => {
                        clearMessages();
                        setShowAddForm(!showAddForm);
                    }}
                    className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white font-bold py-2.5 px-5 rounded-lg shadow-lg transition-all transform active:scale-95 flex items-center gap-2 cursor-pointer"
                >
                    {showAddForm ? (
                        <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            Cancel
                        </>
                    ) : (
                        <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                            New Ledger
                        </>
                    )}
                </button>
            </div>

            {/* Error and Success Alerts */}
            {errorMsg && (
                <div className="bg-red-900/30 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg mb-6 flex justify-between items-center animate-fade-in">
                    <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span className="text-sm font-medium">{errorMsg}</span>
                    </div>
                    <button onClick={() => setErrorMsg('')} className="text-red-400 hover:text-red-200 ml-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            )}

            {successMsg && (
                <div className="bg-green-950/40 border border-green-500/50 text-green-200 px-4 py-3 rounded-lg mb-6 flex justify-between items-center animate-fade-in">
                    <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-green-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span className="text-sm font-medium">{successMsg}</span>
                    </div>
                    <button onClick={() => setSuccessMsg('')} className="text-green-400 hover:text-green-200 ml-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            )}

            {/* Quick Add Form */}
            {showAddForm && (
                <form onSubmit={handleCreate} className="bg-card-dark p-6 rounded-xl border border-gray-800 shadow-xl mb-6 grid gap-4 grid-cols-1 sm:grid-cols-3 items-end animate-fade-in">
                    <div>
                        <label className="block text-xs text-gray-400 mb-1.5 uppercase font-semibold tracking-wide">Name</label>
                        <input
                            type="text"
                            required
                            placeholder="Full Name"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3.5 py-2.5 outline-none focus:border-primary text-sm text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1.5 uppercase font-semibold tracking-wide">Phone (Optional)</label>
                        <input
                            type="text"
                            placeholder="Phone Number"
                            value={newPhone}
                            onChange={(e) => setNewPhone(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3.5 py-2.5 outline-none focus:border-primary text-sm text-white font-mono"
                        />
                    </div>
                    <div className="flex gap-2 items-end">
                        <div className="flex-1">
                            <label className="block text-xs text-gray-400 mb-1.5 uppercase font-semibold tracking-wide">Email (Optional)</label>
                            <input
                                type="email"
                                placeholder="email@address.com"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3.5 py-2.5 outline-none focus:border-primary text-sm text-white"
                            />
                        </div>
                        <button
                            type="submit"
                            className="bg-secondary text-black font-bold h-[42px] px-5 rounded-lg hover:bg-opacity-95 transition-all shadow-md cursor-pointer shrink-0"
                        >
                            Save
                        </button>
                    </div>
                </form>
            )}

            {/* Search Bar */}
            <div className="relative mb-6">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </span>
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search ledgers by name, phone, or email..."
                    className="w-full bg-card-dark border border-gray-800 rounded-xl pl-11 pr-4 py-3.5 outline-none focus:border-primary text-white transition-all text-sm shadow-md"
                />
            </div>

            {/* Ledgers List */}
            <div className="bg-card-dark rounded-xl border border-gray-800 overflow-hidden shadow-xl">
                {loading ? (
                    <div className="text-center py-10 text-gray-400 flex flex-col justify-center items-center gap-3">
                        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                        Loading ledger directory...
                    </div>
                ) : filteredLedgers.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        {searchQuery ? "No matching ledgers found." : "No ledgers defined yet. Click 'New Ledger' to create one."}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-800 bg-gray-900/40 text-gray-400 text-xs font-bold uppercase tracking-wider">
                                    <th className="py-4 px-5">Name</th>
                                    <th className="py-4 px-5">Contact Details</th>
                                    <th className="py-4 px-5 text-center">Debts Linked</th>
                                    <th className="py-4 px-5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800/60">
                                {filteredLedgers.map(ledger => {
                                    const isEditing = editingId === ledger.id;
                                    return (
                                        <tr key={ledger.id} className="hover:bg-gray-800/20 transition-all">
                                            {/* Name Column */}
                                            <td className="py-4 px-5 text-sm font-medium">
                                                {isEditing ? (
                                                    <input
                                                        type="text"
                                                        value={editName}
                                                        onChange={(e) => setEditName(e.target.value)}
                                                        className="bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 w-full outline-none focus:border-primary text-white"
                                                    />
                                                ) : (
                                                    <span className="font-semibold text-white">{ledger.name}</span>
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
                                                            className="bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 w-full outline-none focus:border-primary text-white text-xs font-mono"
                                                        />
                                                        <input
                                                            type="email"
                                                            placeholder="Email"
                                                            value={editEmail}
                                                            onChange={(e) => setEditEmail(e.target.value)}
                                                            className="bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 w-full outline-none focus:border-primary text-white text-xs"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col gap-1 text-xs text-gray-400">
                                                        {ledger.phone && (
                                                            <span className="flex items-center gap-1.5 font-mono text-gray-300">
                                                                📞 {ledger.phone}
                                                            </span>
                                                        )}
                                                        {ledger.email && (
                                                            <span className="flex items-center gap-1.5 text-gray-300">
                                                                ✉️ {ledger.email}
                                                            </span>
                                                        )}
                                                        {!ledger.phone && !ledger.email && (
                                                            <span className="text-gray-600 italic">No contact info</span>
                                                        )}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Linked Debts Count */}
                                            <td className="py-4 px-5 text-center">
                                                <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold leading-none ${
                                                    ledger.debt_count > 0 
                                                        ? 'bg-purple-900/40 text-primary border border-primary/20' 
                                                        : 'bg-gray-800 text-gray-500'
                                                }`}>
                                                    {ledger.debt_count}
                                                </span>
                                            </td>

                                            {/* Actions Column */}
                                            <td className="py-4 px-5 text-right text-sm">
                                                {isEditing ? (
                                                    <div className="flex justify-end gap-2">
                                                        <button 
                                                            onClick={() => handleSaveEdit(ledger.id)} 
                                                            className="bg-green-600 hover:bg-green-750 text-white px-3 py-1.5 rounded text-xs font-bold shadow transition-all cursor-pointer"
                                                        >
                                                            Save
                                                        </button>
                                                        <button 
                                                            onClick={() => setEditingId(null)} 
                                                            className="bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex justify-end gap-2.5">
                                                        <button 
                                                            onClick={() => handleStartEdit(ledger)} 
                                                            className="text-primary hover:text-purple-300 font-semibold text-xs flex items-center gap-1 cursor-pointer"
                                                        >
                                                            ✏️ Edit
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDelete(ledger)} 
                                                            className="text-red-400 hover:text-red-300 font-semibold text-xs flex items-center gap-1 cursor-pointer"
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
                )}
            </div>
        </div>
    );
};

export default LedgerManager;
