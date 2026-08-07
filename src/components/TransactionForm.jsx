import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createTransaction, updateTransaction, getCategories, getLedgers, createLedger } from '../api';

const INITIAL_FORM_STATE = {
    amount: '',
    description: '',
    payment_mode: 'CASH',
    transaction_type: 'EXPENSE',
    category: '',
    date: '',
    related_debt: '',
    related_event: '',
    debt_description: '',
    ledger: ''
};

const getTodayDateString = () => new Date().toISOString().split('T')[0];

const TransactionForm = ({ 
    onTransactionAdded, 
    editingTransaction, 
    onCancelEdit, 
    selectedDate, 
    prefillDebt, 
    onCancelRepayment, 
    prefillEvent, 
    onCancelEventTxn, 
    prefillInvestment, 
    onCancelInvestment 
}) => {
    const [formData, setFormData] = useState(() => ({
        ...INITIAL_FORM_STATE,
        date: selectedDate || getTodayDateString()
    }));
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState([]);
    
    // Ledger autocomplete states
    const [ledgers, setLedgers] = useState([]);
    const [ledgerQuery, setLedgerQuery] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const containerRef = useRef(null);

    // Inline Ledger Creation state
    const [showCreateLedgerInline, setShowCreateLedgerInline] = useState(false);
    const [newPhone, setNewPhone] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [inlineError, setInlineError] = useState('');

    const fetchInitialData = useCallback(async () => {
        try {
            const res = await getCategories();
            setCategories(res.data);
            
            // Set default category if not editing/prefilling
            if (!editingTransaction && !prefillDebt && !prefillInvestment && res.data.length > 0) {
                const defaultCat = res.data.find(c => c.name.toLowerCase() === 'food') || res.data[0];
                setFormData(prev => ({ ...prev, category: defaultCat.id }));
            }
        } catch (err) {
            console.error("Failed to fetch categories", err);
        }

        try {
            const res = await getLedgers();
            setLedgers(res.data);
        } catch (err) {
            console.error("Failed to fetch ledgers list", err);
        }
    }, [editingTransaction, prefillDebt, prefillInvestment]);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    useEffect(() => {
        const today = getTodayDateString();
        if (editingTransaction) {
            setFormData({
                ...editingTransaction,
                amount: editingTransaction.amount,
                description: editingTransaction.description,
                payment_mode: editingTransaction.payment_mode,
                transaction_type: editingTransaction.transaction_type,
                category: editingTransaction.category,
                date: editingTransaction.date,
                related_debt: editingTransaction.related_debt || '',
                related_event: editingTransaction.related_event || '',
                debt_description: editingTransaction.debt_description || '',
                ledger: editingTransaction.ledger || ''
            });
            if (['DEBT_TAKEN', 'DEBT_GIVEN'].includes(editingTransaction.transaction_type)) {
                setLedgerQuery(editingTransaction.description);
            } else {
                setLedgerQuery('');
            }
        } else if (prefillDebt && categories.length > 0) {
            const loanCat = categories.find(c => c.name.toLowerCase().includes('loan') || c.name.toLowerCase().includes('debt')) || categories[0];
            setFormData({
                ...INITIAL_FORM_STATE,
                amount: prefillDebt.remaining_amount || prefillDebt.amount,
                description: `Repayment: ${prefillDebt.person_name}`,
                transaction_type: prefillDebt.debt_type === 'TAKEN' ? 'DEBT_TAKEN_RETURN' : 'DEBT_GIVEN_RETURN',
                category: loanCat ? loanCat.id : '',
                related_debt: prefillDebt.id,
                date: selectedDate || today
            });
            setLedgerQuery('');
        } else if (prefillEvent) {
             setFormData({
                ...INITIAL_FORM_STATE,
                description: `Event: ${prefillEvent.name}`,
                related_event: prefillEvent.id,
                date: selectedDate || today
            });
             setLedgerQuery('');
        } else if (prefillInvestment && categories.length > 0) {
            const investCat = categories.find(c => c.name.toLowerCase().includes('invest')) || categories[0];
            setFormData({
                ...INITIAL_FORM_STATE,
                amount: prefillInvestment.amount,
                description: `Monthly Surplus Investment`,
                transaction_type: 'INVESTMENT',
                category: investCat ? investCat.id : '',
                date: selectedDate || today
            });
            setLedgerQuery('');
        } else if (!editingTransaction && !prefillDebt && !prefillInvestment) {
             setFormData(prev => ({
                ...INITIAL_FORM_STATE,
                date: selectedDate || today,
                category: prev.category
            }));
             setLedgerQuery('');
        }
        setShowCreateLedgerInline(false);
    }, [editingTransaction, selectedDate, prefillDebt, prefillEvent, prefillInvestment, categories]);

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
            description: ledger.name
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
                description: res.data.name
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

        // Validate that ledger is selected for new debt transactions
        if (['DEBT_TAKEN', 'DEBT_GIVEN'].includes(formData.transaction_type) && !formData.ledger) {
            alert("Please select a Ledger or create a new one first.");
            return;
        }

        setLoading(true);
        try {
            const payload = {
                ...formData,
                ledger: formData.ledger || null
            };

            if (editingTransaction) {
                await updateTransaction(editingTransaction.id, payload);
                onCancelEdit(); 
            } else {
                await createTransaction(payload);
                if (onCancelRepayment) onCancelRepayment();
                if (onCancelInvestment) onCancelInvestment();
            }
            
            // Refresh ledgers list
            try {
                const res = await getLedgers();
                setLedgers(res.data);
            } catch (err) {
                console.error("Failed to fetch ledgers list", err);
            }

            onTransactionAdded(); 
            if (!editingTransaction) {
                 const defaultCat = categories.find(c => c.name.toLowerCase() === 'food') || categories[0];
                 setFormData({ ...INITIAL_FORM_STATE, date: selectedDate || getTodayDateString(), category: defaultCat ? defaultCat.id : '' }); 
                 setLedgerQuery('');
            }
        } catch (error) {
            console.error(error);
            alert("Failed to save transaction: " + (error.response?.data?.detail || error.message));
        } finally {
            setLoading(false);
        }
    };

    // Calculate computed values
    const filteredLedgers = ledgerQuery.trim()
        ? ledgers.filter(l => l.name && l.name.toLowerCase().includes(ledgerQuery.toLowerCase().trim()))
        : ledgers.filter(l => l.name); // Filter out any empty/null name ledgers to prevent blank items

    const exactMatch = ledgers.some(l => l.name && l.name.toLowerCase() === ledgerQuery.toLowerCase().trim());

    return (
        <form onSubmit={handleSubmit} className={`bg-card-dark p-4 sm:p-5 rounded-2xl shadow-lg mb-6 border ${editingTransaction ? 'border-primary' : 'border-border-main'}`}>
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-border-main">
                 <h3 className="text-base sm:text-lg font-bold text-secondary truncate pr-2">
                    {editingTransaction ? 'Edit Transaction' : prefillDebt ? 'Settle Debt' : prefillEvent ? `Add to Event: ${prefillEvent.name}` : prefillInvestment ? 'Convert Net Balance to Investment' : 'Add Transaction'}
                 </h3>
                 {(editingTransaction || prefillDebt || prefillEvent || prefillInvestment) && (
                     <button type="button" onClick={editingTransaction ? onCancelEdit : prefillDebt ? onCancelRepayment : prefillEvent ? onCancelEventTxn : onCancelInvestment} className="text-text-muted hover:text-text-main text-xs sm:text-sm underline whitespace-nowrap cursor-pointer">
                          Cancel
                     </button>
                 )}
            </div>
           
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4 items-stretch sm:items-end">
                {/* Date - Visible when settling debt or adding to an event */}
                {(prefillDebt || prefillEvent) && (
                    <div className="w-full sm:w-[calc(50%-8px)] md:w-auto md:min-w-[130px]">
                        <label className="block text-xs text-text-muted mb-1 font-semibold uppercase tracking-wider">Date</label>
                        <input 
                            type="date" 
                            name="date" 
                            value={formData.date} 
                            onChange={handleChange}
                            required
                            className="w-full bg-bg-dark border border-border-main rounded-xl px-3 py-2 focus:border-primary outline-none text-text-main text-sm cursor-pointer"
                        />
                    </div>
                )}

                {/* Amount */}
                <div className="w-full sm:w-[calc(50%-8px)] md:flex-1 md:min-w-[110px]">
                    <label className="block text-xs text-text-muted mb-1 font-semibold uppercase tracking-wider">Amount</label>
                    <input 
                        type="number" 
                        name="amount" 
                        value={formData.amount} 
                        onChange={handleChange}
                        required
                        min="1"
                        placeholder="0.00"
                        className="w-full bg-bg-dark border border-border-main rounded-xl px-3 py-2 focus:border-primary outline-none text-text-main text-sm"
                    />
                </div>

                {/* Description / Person Name */}
                {['DEBT_TAKEN', 'DEBT_GIVEN'].includes(formData.transaction_type) ? (
                    <>
                        <div ref={containerRef} className="relative w-full md:flex-[1.5] md:min-w-[200px]">
                            <label className="block text-xs text-text-muted mb-1 font-semibold uppercase tracking-wider">Person (Ledger Profile)</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={ledgerQuery}
                                    onChange={(e) => handleQueryChange(e.target.value)}
                                    onFocus={() => setIsDropdownOpen(true)}
                                    placeholder="Search or create ledger..."
                                    className="w-full bg-bg-dark border border-border-main rounded-xl px-3 py-2 focus:border-primary outline-none text-text-main placeholder-text-muted transition-all font-sans text-sm pr-8"
                                    required={true}
                                />
                                
                                {/* Dropdown Suggestions */}
                                {isDropdownOpen && (
                                    <ul className="absolute left-0 right-0 z-50 mt-1.5 bg-card-dark border border-border-main rounded-xl shadow-2xl max-h-60 overflow-y-auto divide-y divide-border-main animate-fade-in">
                                        {filteredLedgers.map((ledger) => (
                                            <li
                                                key={ledger.id}
                                                onClick={() => handleSelectLedger(ledger)}
                                                className="px-3.5 py-2.5 text-xs sm:text-sm text-text-muted cursor-pointer hover:bg-bg-dark/40 transition-colors flex justify-between items-center"
                                            >
                                                <span className="font-semibold text-text-main">{ledger.name}</span>
                                                {ledger.phone && <span className="text-[10px] text-text-muted font-mono">{ledger.phone}</span>}
                                            </li>
                                        ))}
                                        
                                        {/* Create Suggestion */}
                                        {ledgerQuery.trim() && !exactMatch && (
                                            <li
                                                onClick={handleStartCreateInline}
                                                className="px-3.5 py-2.5 text-xs sm:text-sm text-secondary hover:bg-bg-dark/40 cursor-pointer font-extrabold transition-colors flex items-center gap-1.5 border-t border-border-main"
                                            >
                                                ➕ Create Ledger: "{ledgerQuery.trim()}"
                                            </li>
                                        )}
                                        
                                        {filteredLedgers.length === 0 && !ledgerQuery.trim() && (
                                            <li className="px-3.5 py-2.5 text-xs text-text-muted italic">
                                                No ledgers found. Start typing to create.
                                            </li>
                                        )}
                                    </ul>
                                )}
                            </div>
                            
                            {/* Selected / Status indicator */}
                            {formData.ledger ? (
                                <div className="absolute right-2.5 top-8 flex items-center justify-center w-4 h-4 bg-success/15 text-success rounded-full border border-success/20 text-[9px]" title="Linked to Ledger">
                                    ✓
                                </div>
                            ) : (
                                <div className="absolute right-2.5 top-8 flex items-center justify-center w-4 h-4 bg-warning/15 text-warning rounded-full border border-warning/20 text-[9px]" title="No Ledger selected yet">
                                    !
                                </div>
                            )}
                        </div>

                        {/* Inline Ledger Creation Form */}
                        {showCreateLedgerInline && (
                            <div className="w-full bg-bg-dark border border-border-main p-3 rounded-xl animate-fade-in text-xs grid gap-2 md:w-full md:col-span-full">
                                <div className="font-extrabold text-secondary text-[10px] uppercase tracking-wider">
                                    Create New Ledger: "{ledgerQuery.trim()}"
                                </div>
                                {inlineError && (
                                    <div className="text-[10px] text-error">{inlineError}</div>
                                )}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[9px] text-text-muted mb-0.5 uppercase font-semibold">Phone</label>
                                        <input
                                            type="text"
                                            placeholder="Phone number"
                                            value={newPhone}
                                            onChange={(e) => setNewPhone(e.target.value)}
                                            className="w-full bg-card-dark border border-border-main rounded-lg px-2.5 py-1.5 text-[11px] text-text-main font-mono outline-none focus:border-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] text-text-muted mb-0.5 uppercase font-semibold">Email</label>
                                        <input
                                            type="email"
                                            placeholder="email@address.com"
                                            value={newEmail}
                                            onChange={(e) => setNewEmail(e.target.value)}
                                            className="w-full bg-card-dark border border-border-main rounded-lg px-2.5 py-1.5 text-[11px] text-text-main outline-none focus:border-primary"
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-2 justify-end mt-1">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateLedgerInline(false)}
                                        className="bg-card-dark border border-border-main hover:bg-bg-dark text-text-muted px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleCreateInlineSubmit}
                                        className="bg-secondary hover:bg-secondary-hover text-black px-3 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer"
                                    >
                                        Create & Select
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="w-full md:flex-1 md:min-w-[160px]">
                            <label className="block text-xs text-text-muted mb-1 font-semibold uppercase tracking-wider">Debt Notes (Optional)</label>
                            <input 
                                type="text" 
                                name="debt_description" 
                                value={formData.debt_description} 
                                onChange={handleChange}
                                placeholder="e.g. Dinner share"
                                className="w-full bg-bg-dark border border-border-main rounded-xl px-3 py-2 focus:border-primary outline-none text-text-main text-sm"
                            />
                        </div>
                    </>
                ) : (
                    <div className="w-full md:flex-[2] md:min-w-[180px]">
                        <label className="block text-xs text-text-muted mb-1 font-semibold uppercase tracking-wider">Description</label>
                        <input 
                            type="text" 
                            name="description" 
                            value={formData.description} 
                            onChange={handleChange}
                            required
                            placeholder="e.g. Grocery shopping"
                            className="w-full bg-bg-dark border border-border-main rounded-xl px-3 py-2 focus:border-primary outline-none text-text-main text-sm"
                        />
                    </div>
                )}

                {/* Type */}
                <div className="w-full sm:w-[calc(50%-8px)] md:w-auto md:min-w-[130px]">
                    <label className="block text-xs text-text-muted mb-1 font-semibold uppercase tracking-wider">Type</label>
                    <select 
                        name="transaction_type" 
                        value={formData.transaction_type} 
                        onChange={handleChange}
                        className="w-full bg-bg-dark border border-border-main rounded-xl px-3 py-2.5 focus:border-primary outline-none text-text-main text-sm cursor-pointer"
                        disabled={!!prefillDebt}
                    >
                        <option value="EXPENSE">Expense</option>
                        <option value="INCOME">Income</option>
                        <option value="DEBT_TAKEN">Debt Taken</option>
                        <option value="DEBT_GIVEN">Debt Given</option>
                        <option value="DEBT_TAKEN_RETURN">Debt Taken Return</option>
                        <option value="DEBT_GIVEN_RETURN">Debt Given Return</option>
                        <option value="CASH_WITHDRAWAL">Cash Withdrawal</option>
                        <option value="CASH_DEPOSIT">Cash Deposit</option>
                        <option value="INVESTMENT">Investment</option>
                    </select>
                </div>

                 {/* Category */}
                 <div className="w-full sm:w-[calc(50%-8px)] md:w-auto md:min-w-[130px]">
                    <label className="block text-xs text-text-muted mb-1 font-semibold uppercase tracking-wider">Category</label>
                    <select 
                        name="category" 
                        value={formData.category} 
                        onChange={handleChange}
                        className="w-full bg-bg-dark border border-border-main rounded-xl px-3 py-2.5 focus:border-primary outline-none text-text-main text-sm cursor-pointer"
                        disabled={!!prefillDebt}
                    >
                        <option value="" disabled>Select</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                </div>

                {/* Mode */}
                <div className="w-full sm:w-auto flex items-center gap-4 h-[42px] py-1">
                    <label className="cursor-pointer flex items-center gap-2 select-none">
                        <input 
                            type="radio" 
                            name="payment_mode" 
                            value="CASH"
                            checked={formData.payment_mode === 'CASH'}
                            onChange={handleChange}
                            className="w-4 h-4 text-primary focus:ring-primary border-border-main bg-bg-dark"
                        />
                        <span className="text-sm text-text-main font-semibold">Cash</span>
                    </label>
                    <label className="cursor-pointer flex items-center gap-2 select-none">
                        <input 
                            type="radio" 
                            name="payment_mode" 
                            value="ACCOUNT"
                            checked={formData.payment_mode === 'ACCOUNT'}
                            onChange={handleChange}
                            className="w-4 h-4 text-primary focus:ring-primary border-border-main bg-bg-dark"
                        />
                        <span className="text-sm text-text-main font-semibold">Account</span>
                    </label>
                </div>

                {/* Submit button */}
                <div className="w-full sm:w-auto flex justify-end">
                     <button 
                        type="submit" 
                        disabled={loading}
                        className={`w-full sm:w-auto font-extrabold py-2.5 px-6 rounded-xl transition-all shadow-md transform active:scale-95 border text-sm cursor-pointer ${
                            editingTransaction 
                            ? 'bg-secondary hover:bg-secondary-hover text-black border-secondary' 
                            : 'bg-primary hover:bg-primary-hover text-black border-primary'
                        }`}
                    >
                        {loading ? 'Saving...' : editingTransaction ? 'Update' : prefillDebt ? 'Record Payment' : prefillEvent ? 'Add to Event' : 'Add'}
                    </button>
                </div>
            </div>
        </form>
    );
};

export default TransactionForm;
