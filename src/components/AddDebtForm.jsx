import React, { useState, useEffect, useRef } from 'react';
import { createDebt, updateDebt, getLedgers, createLedger } from '../api';

const AddDebtForm = ({ onDebtAdded, onCancel, initialData }) => {
    const today = new Date().toISOString().split('T')[0];
    
    // Initialize with default or existing data
    const [formData, setFormData] = useState({
        ledger: '',
        person_name: '',
        amount: '',
        debt_type: 'TAKEN',
        date: today,
        payment_mode: 'CASH',
        description: ''
    });

    const [ledgers, setLedgers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingLedgers, setLoadingLedgers] = useState(false);

    // Ledger Autocomplete state
    const [ledgerQuery, setLedgerQuery] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const containerRef = useRef(null);

    // Inline Ledger Creation state
    const [showCreateLedgerInline, setShowCreateLedgerInline] = useState(false);
    const [newPhone, setNewPhone] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [inlineError, setInlineError] = useState('');

    const fetchLedgers = async () => {
        setLoadingLedgers(true);
        try {
            const res = await getLedgers();
            setLedgers(res.data);
        } catch (error) {
            console.error("Error fetching ledgers list:", error);
        } finally {
            setLoadingLedgers(false);
        }
    };

    useEffect(() => {
        fetchLedgers();
    }, []);

    useEffect(() => {
        if (initialData) {
            setFormData({
                ledger: initialData.ledger || '',
                person_name: initialData.person_name,
                amount: initialData.amount,
                debt_type: initialData.debt_type,
                date: initialData.date,
                payment_mode: initialData.payment_mode || 'CASH',
                description: initialData.description || ''
            });
            setLedgerQuery(initialData.person_name);
        } else {
            setFormData({
                ledger: '',
                person_name: '',
                amount: '',
                debt_type: 'TAKEN',
                date: today,
                payment_mode: 'CASH',
                description: ''
            });
            setLedgerQuery('');
        }
        setShowCreateLedgerInline(false);
    }, [initialData]);

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleQueryChange = (val) => {
        setLedgerQuery(val);
        // Clear selected ledger if they type something else
        if (formData.ledger) {
            const currentLedger = ledgers.find(l => l.id === formData.ledger);
            if (currentLedger && currentLedger.name !== val) {
                setFormData(prev => ({
                    ...prev,
                    ledger: '',
                }));
            }
        }
        setIsDropdownOpen(true);
    };

    const handleSelectLedger = (ledger) => {
        setFormData(prev => ({
            ...prev,
            ledger: ledger.id,
            person_name: ledger.name
        }));
        setLedgerQuery(ledger.name);
        setIsDropdownOpen(false);
        setShowCreateLedgerInline(false);
    };

    const handleStartCreateInline = () => {
        setNewPhone('');
        setNewEmail('');
        setInlineError('');
        setShowCreateLedgerInline(true);
        setIsDropdownOpen(false);
    };

    const handleCreateInlineSubmit = async (e) => {
        e.preventDefault();
        setInlineError('');
        const trimmedName = ledgerQuery.trim();
        if (!trimmedName) return;

        try {
            const payload = {
                name: trimmedName,
                phone: newPhone.trim(),
                email: newEmail.trim()
            };
            const res = await createLedger(payload);
            setLedgers(prev => [...prev, res.data]);
            setFormData(prev => ({
                ...prev,
                ledger: res.data.id,
                person_name: res.data.name
            }));
            setShowCreateLedgerInline(false);
        } catch (err) {
            console.error(err);
            const detail = err.response?.data?.name?.[0] || err.response?.data?.detail || "Failed to create ledger.";
            setInlineError(detail);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate that ledger is selected for new debts
        if (!initialData && !formData.ledger) {
            alert("Please select a Ledger or create a new one first.");
            return;
        }

        setLoading(true);
        try {
            const payload = {
                ...formData,
                ledger: formData.ledger || null
            };

            if (initialData) {
                 await updateDebt(initialData.id, payload);
            } else {
                 await createDebt(payload);
            }
            onDebtAdded();
            if (onCancel) onCancel();
        } catch (error) {
            console.error("Error saving debt:", error);
            alert("Failed to save debt: " + (error.response?.data?.detail || error.response?.data?.person_name?.[0] || error.message));
        } finally {
            setLoading(false);
        }
    };

    const filteredLedgers = ledgerQuery.trim()
        ? ledgers.filter(l => l.name.toLowerCase().includes(ledgerQuery.toLowerCase().trim()))
        : ledgers;

    const exactMatch = ledgers.some(l => l.name.toLowerCase() === ledgerQuery.toLowerCase().trim());

    return (
        <form onSubmit={handleSubmit} className="bg-card-dark p-6 rounded-xl border border-gray-700 shadow-2xl relative">
            <button 
                type="button" 
                onClick={onCancel}
                className="absolute top-4 right-4 text-gray-500 hover:text-white"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            <h3 className="text-xl font-bold text-primary mb-6">
                {initialData ? 'Edit Debt' : 'Add Existing Debt'}
            </h3>
            {!initialData && (
                <p className="text-gray-400 text-sm mb-6 -mt-4">
                    Record a debt from before you started using this app. This will not affect your current cash/account balance.
                </p>
            )}

            <div className="grid gap-5">
                {/* Ledger Select */}
                <div ref={containerRef} className="relative w-full">
                    <label className="block text-xs text-gray-400 mb-1 font-medium uppercase tracking-wide">
                        Ledger Profile (Contact)
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            value={ledgerQuery}
                            onChange={(e) => handleQueryChange(e.target.value)}
                            onFocus={() => setIsDropdownOpen(true)}
                            placeholder="Type to search or create a new Ledger..."
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:border-primary focus:ring-1 focus:ring-primary outline-none text-white placeholder-gray-650 transition-all text-sm font-sans"
                            required={!initialData} // Let legacy debts be edited/saved without forcing a ledger initially
                        />
                        
                        {/* Dropdown Suggestions */}
                        {isDropdownOpen && (
                            <ul className="absolute z-50 w-full mt-1.5 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl max-h-60 overflow-y-auto divide-y divide-gray-700/50 scrollbar-thin scrollbar-thumb-gray-700">
                                {filteredLedgers.map((ledger) => (
                                    <li
                                        key={ledger.id}
                                        onClick={() => handleSelectLedger(ledger)}
                                        className="px-4 py-2.5 text-sm text-gray-200 cursor-pointer hover:bg-gray-700/40 transition-colors flex justify-between items-center"
                                    >
                                        <span className="font-semibold">{ledger.name}</span>
                                        {ledger.phone && <span className="text-xs text-gray-500 font-mono">{ledger.phone}</span>}
                                    </li>
                                ))}
                                
                                {/* Create Suggestion */}
                                {ledgerQuery.trim() && !exactMatch && (
                                    <li
                                        onClick={handleStartCreateInline}
                                        className="px-4 py-3 text-sm text-secondary hover:bg-gray-700/40 cursor-pointer font-bold transition-colors flex items-center gap-1.5 border-t border-gray-700/60"
                                    >
                                        ➕ Create new Ledger: "{ledgerQuery.trim()}"
                                    </li>
                                )}
                                
                                {filteredLedgers.length === 0 && !ledgerQuery.trim() && (
                                    <li className="px-4 py-3 text-sm text-gray-500 italic">
                                        No ledgers found. Start typing to create.
                                    </li>
                                )}
                            </ul>
                        )}
                    </div>
                    
                    {/* Visual indicators for selected Ledger */}
                    {formData.ledger ? (
                        <div className="mt-2 text-xs text-green-400 flex items-center gap-1.5">
                            <span className="flex items-center justify-center w-4.5 h-4.5 bg-green-950 text-green-400 rounded-full border border-green-500/20 text-[10px]">✓</span>
                            <span>Linked to Ledger: <span className="font-bold text-white font-sans">{formData.person_name}</span></span>
                        </div>
                    ) : initialData ? (
                        <div className="mt-2 text-xs text-yellow-500/90 flex items-center gap-1.5">
                            <span className="flex items-center justify-center w-4.5 h-4.5 bg-yellow-950/45 text-yellow-500 rounded-full border border-yellow-500/25 text-[10px]">⚠</span>
                            <span>Legacy Debt (Not linked to any Ledger). Select one to migrate.</span>
                        </div>
                    ) : (
                        <div className="mt-2 text-xs text-gray-500">
                            Please search & select a ledger profile or create a new one.
                        </div>
                    )}
                </div>

                {/* Inline Ledger Creation Form */}
                {showCreateLedgerInline && (
                    <div className="bg-gray-900/60 border border-gray-700/60 p-4 rounded-lg animate-fade-in text-sm grid gap-3">
                        <div className="font-bold text-secondary text-xs uppercase tracking-wider">
                            Create New Ledger: "{ledgerQuery.trim()}"
                        </div>
                        {inlineError && (
                            <div className="text-xs text-red-400">{inlineError}</div>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] text-gray-400 mb-1 uppercase font-semibold">Phone</label>
                                <input
                                    type="text"
                                    placeholder="Phone number"
                                    value={newPhone}
                                    onChange={(e) => setNewPhone(e.target.value)}
                                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-xs text-white font-mono outline-none focus:border-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] text-gray-400 mb-1 uppercase font-semibold">Email</label>
                                <input
                                    type="email"
                                    placeholder="email@address.com"
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-xs text-white outline-none focus:border-primary"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2 justify-end mt-1">
                            <button
                                type="button"
                                onClick={() => setShowCreateLedgerInline(false)}
                                className="bg-gray-800 hover:bg-gray-700 text-gray-350 px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleCreateInlineSubmit}
                                className="bg-secondary text-black px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer"
                            >
                                Create & Select
                            </button>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Amount */}
                    <div>
                        <label className="block text-xs text-gray-400 mb-1 font-medium uppercase tracking-wide">Amount</label>
                        <input 
                            type="number" 
                            name="amount" 
                            value={formData.amount} 
                            onChange={handleChange}
                            required
                            min="0.01"
                            step="0.01"
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:border-primary focus:ring-1 focus:ring-primary outline-none text-white transition-all font-mono text-sm"
                            placeholder="0.00"
                        />
                    </div>
                    
                    {/* Date */}
                    <div>
                        <label className="block text-xs text-gray-400 mb-1 font-medium uppercase tracking-wide">Original Date</label>
                        <input 
                            type="date" 
                            name="date" 
                            value={formData.date} 
                            onChange={handleChange}
                            required
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:border-primary focus:ring-1 focus:ring-primary outline-none text-white transition-all text-sm"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Type */}
                    <div>
                        <label className="block text-xs text-gray-400 mb-1 font-medium uppercase tracking-wide">Type</label>
                        <select 
                            name="debt_type" 
                            value={formData.debt_type} 
                            onChange={handleChange}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:border-primary focus:ring-1 focus:ring-primary outline-none text-white transition-all appearance-none cursor-pointer text-sm"
                        >
                            <option value="TAKEN">Taken (To Pay)</option>
                            <option value="GIVEN">Given (To Receive)</option>
                        </select>
                    </div>

                    {/* Mode (Optional/Record) */}
                    <div>
                        <label className="block text-xs text-gray-400 mb-1 font-medium uppercase tracking-wide">Original Mode</label>
                        <select 
                            name="payment_mode" 
                            value={formData.payment_mode} 
                            onChange={handleChange}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:border-primary focus:ring-1 focus:ring-primary outline-none text-white transition-all appearance-none cursor-pointer text-sm"
                        >
                            <option value="CASH">Cash</option>
                            <option value="ACCOUNT">Account</option>
                        </select>
                    </div>
                </div>

                {/* Description */}
                <div>
                    <label className="block text-xs text-gray-400 mb-1 font-medium uppercase tracking-wide">Description (Optional)</label>
                    <textarea 
                        name="description" 
                        value={formData.description} 
                        onChange={handleChange}
                        rows="2"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:border-primary focus:ring-1 focus:ring-primary outline-none text-white placeholder-gray-600 transition-all resize-none text-sm animate-fade-in"
                        placeholder="Add notes, details, or items for this debt..."
                    />
                </div>

                <button 
                    type="submit" 
                    disabled={loading}
                    className="mt-2 w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white font-bold py-3 px-6 rounded-lg shadow-lg transform active:scale-[0.98] transition-all flex justify-center items-center gap-2 cursor-pointer"
                >
                    {loading ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            Saving...
                        </>
                    ) : (
                        <>{initialData ? 'Update Debt' : 'Record Debt'}</>
                    )}
                </button>
            </div>
        </form>
    );
};

export default AddDebtForm;
