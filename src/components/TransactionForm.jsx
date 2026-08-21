import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
    createTransaction, 
    updateTransaction, 
    getCategories, 
    getLedgers, 
    createLedger, 
    getDebts, 
    getFunds, 
    createFundAddition, 
    createFundExpense,
    getInvestments
} from '../api';

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
    ledger: '',
    fund: '',
    title: '',
    attachment: null,
    related_investment: ''
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
    const [investments, setInvestments] = useState([]);
    const [ledgerQuery, setLedgerQuery] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const containerRef = useRef(null);

    // Debt autocomplete states
    const [debts, setDebts] = useState([]);
    const [debtQuery, setDebtQuery] = useState('');
    const [isDebtDropdownOpen, setIsDebtDropdownOpen] = useState(false);
    const [selectedDebtObj, setSelectedDebtObj] = useState(null);
    const debtContainerRef = useRef(null);

    // Fund autocomplete states
    const [funds, setFunds] = useState([]);
    const [fundQuery, setFundQuery] = useState('');
    const [isFundDropdownOpen, setIsFundDropdownOpen] = useState(false);
    const [selectedFundObj, setSelectedFundObj] = useState(null);
    const fundContainerRef = useRef(null);

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

        try {
            const res = await getDebts();
            setDebts(res.data);
        } catch (err) {
            console.error("Failed to fetch debts", err);
        }

        try {
            const res = await getFunds();
            setFunds(res.data);
        } catch (err) {
            console.error("Failed to fetch funds", err);
        }

        try {
            const res = await getInvestments();
            setInvestments(res.data);
        } catch (err) {
            console.error("Failed to fetch investments", err);
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
                ledger: editingTransaction.ledger || '',
                fund: editingTransaction.fund || '',
                title: editingTransaction.title || '',
                attachment: null,
                related_investment: editingTransaction.related_investment || ''
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
                amount: prefillInvestment.amount || '',
                description: prefillInvestment.description || `Surplus Investment`,
                transaction_type: prefillInvestment.transaction_type || 'INVESTMENT',
                related_investment: prefillInvestment.investmentId || '',
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

    // Handle click outside to close dropdowns
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
            if (debtContainerRef.current && !debtContainerRef.current.contains(event.target)) {
                setIsDebtDropdownOpen(false);
            }
            if (fundContainerRef.current && !fundContainerRef.current.contains(event.target)) {
                setIsFundDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Sync selectedDebtObj when related_debt changes
    useEffect(() => {
        if (formData.related_debt && debts.length > 0) {
            const currentDebt = debts.find(d => d.id === parseInt(formData.related_debt));
            if (currentDebt) {
                setSelectedDebtObj(currentDebt);
                setDebtQuery(currentDebt.person_name);
            }
        } else {
            setSelectedDebtObj(null);
            if (!isDebtDropdownOpen) {
                setDebtQuery('');
            }
        }
    }, [formData.related_debt, debts, isDebtDropdownOpen]);

    // Sync selectedFundObj when fund changes
    useEffect(() => {
        if (formData.fund && funds.length > 0) {
            const currentFund = funds.find(f => f.id === parseInt(formData.fund));
            if (currentFund) {
                setSelectedFundObj(currentFund);
                setFundQuery(currentFund.title);
            }
        } else {
            setSelectedFundObj(null);
            if (!isFundDropdownOpen) {
                setFundQuery('');
            }
        }
    }, [formData.fund, funds, isFundDropdownOpen]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'transaction_type') {
            setFormData(prev => ({
                ...prev,
                transaction_type: value,
                related_debt: '',
                ledger: '',
                fund: '',
                title: '',
                attachment: null,
                amount: '',
                description: '',
                debt_description: '',
                related_investment: '',
                category: ['INVESTMENT', 'INVESTMENT_RETURN'].includes(value) && categories.find(c => c.name.toLowerCase().includes('invest'))
                    ? categories.find(c => c.name.toLowerCase().includes('invest')).id 
                    : prev.category
            }));
            setLedgerQuery('');
            setDebtQuery('');
            setFundQuery('');
            setSelectedDebtObj(null);
            setSelectedFundObj(null);
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
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

        // Validate debt returns selection and return amount
        if (['DEBT_TAKEN_RETURN', 'DEBT_GIVEN_RETURN'].includes(formData.transaction_type)) {
            if (!formData.related_debt) {
                alert("Please select the Debt that is being returned.");
                return;
            }
            if (!selectedDebtObj) {
                alert("Please select a valid Debt.");
                return;
            }
            const enteredAmount = parseFloat(formData.amount);
            const remaining = parseFloat(selectedDebtObj.remaining_amount);
            
            let maxAllowed = remaining;
            if (editingTransaction && editingTransaction.related_debt === selectedDebtObj.id) {
                maxAllowed += parseFloat(editingTransaction.amount);
            }

            if (enteredAmount > maxAllowed) {
                alert(`Return amount cannot exceed the remaining debt amount: ₹${maxAllowed.toLocaleString(undefined, { minimumFractionDigits: 2 })}`);
                return;
            }
        }

        // Validate investment returns and additions
        if (['INVESTMENT', 'INVESTMENT_RETURN'].includes(formData.transaction_type)) {
            if (!formData.related_investment) {
                alert("Please select an Investment Profile.");
                return;
            }
            if (formData.transaction_type === 'INVESTMENT_RETURN') {
                const selectedInvest = investments.find(inv => inv.id === parseInt(formData.related_investment));
                if (!selectedInvest) {
                    alert("Please select a valid Investment Profile.");
                    return;
                }
                const enteredAmount = parseFloat(formData.amount);
                let maxAllowed = parseFloat(selectedInvest.remaining_balance);
                if (editingTransaction && editingTransaction.related_investment === selectedInvest.id) {
                    maxAllowed += parseFloat(editingTransaction.amount);
                }

                if (enteredAmount > maxAllowed) {
                    alert(`Withdrawal amount cannot exceed the available investment balance: ₹${maxAllowed.toLocaleString(undefined, { minimumFractionDigits: 2 })}`);
                    return;
                }
            }
        }

        // Validate fund selection
        if (['FUND_CREDIT', 'FUND_EXPENSE'].includes(formData.transaction_type)) {
            if (!formData.fund) {
                alert("Please select a Fund.");
                return;
            }
            if (!selectedFundObj) {
                alert("Please select a valid Fund.");
                return;
            }
        }

        setLoading(true);
        try {
            if (formData.transaction_type === 'FUND_CREDIT') {
                await createFundAddition({
                    fund: formData.fund,
                    amount: formData.amount,
                    date: formData.date,
                    notes: formData.description,
                    payment_mode: formData.payment_mode
                });
            } else if (formData.transaction_type === 'FUND_EXPENSE') {
                const uploadData = new FormData();
                uploadData.append('fund', formData.fund);
                uploadData.append('title', formData.title || formData.description || 'Expense from Home');
                uploadData.append('amount', formData.amount);
                uploadData.append('date', formData.date);
                uploadData.append('description', formData.description);
                uploadData.append('payment_mode', formData.payment_mode);
                if (formData.attachment) {
                    uploadData.append('attachment', formData.attachment);
                }
                await createFundExpense(uploadData);
            } else {
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
            }
            
            // Refresh initial list
            await fetchInitialData();

            onTransactionAdded(); 
            if (!editingTransaction) {
                 const defaultCat = categories.find(c => c.name.toLowerCase() === 'food') || categories[0];
                 setFormData({ 
                     ...INITIAL_FORM_STATE, 
                     date: selectedDate || getTodayDateString(), 
                     category: defaultCat ? defaultCat.id : '' 
                 }); 
                 setLedgerQuery('');
                 setDebtQuery('');
                 setFundQuery('');
                 setSelectedDebtObj(null);
                 setSelectedFundObj(null);
            }
        } catch (error) {
            console.error(error);
            alert("Failed to save transaction: " + (error.response?.data?.detail || error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    // Calculate computed values
    const filteredLedgers = ledgerQuery.trim()
        ? ledgers.filter(l => l.name && l.name.toLowerCase().includes(ledgerQuery.toLowerCase().trim()))
        : ledgers.filter(l => l.name);

    const exactMatch = ledgers.some(l => l.name && l.name.toLowerCase() === ledgerQuery.toLowerCase().trim());

    const filteredDebts = debts.filter(d => {
        const expectedType = formData.transaction_type === 'DEBT_TAKEN_RETURN' ? 'TAKEN' : 'GIVEN';
        if (d.debt_type !== expectedType) return false;
        const isActiveOrCurrent = !d.is_cleared || d.id === parseInt(formData.related_debt);
        if (!isActiveOrCurrent) return false;
        if (debtQuery.trim()) {
            return d.person_name.toLowerCase().includes(debtQuery.toLowerCase().trim());
        }
        return true;
    });

    const filteredFunds = funds.filter(f => {
        if (fundQuery.trim()) {
            const query = fundQuery.toLowerCase().trim();
            const titleMatches = f.title && f.title.toLowerCase().includes(query);
            const providerMatches = f.ledger_details?.name && f.ledger_details.name.toLowerCase().includes(query);
            return titleMatches || providerMatches;
        }
        return true;
    });

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

            {/* Selected Debt / Fund Details Card */}
            {(selectedDebtObj || selectedFundObj) && (
                <div className="w-full mb-4">
                    {selectedDebtObj && (
                        <div className="bg-bg-dark border border-border-main p-3.5 rounded-xl animate-fade-in text-xs grid grid-cols-2 gap-2">
                            <div className="col-span-2 font-extrabold text-primary text-[10px] uppercase tracking-wider">
                                Linked Debt Details
                            </div>
                            <div>
                                <span className="text-text-muted block">Person:</span>
                                <span className="text-text-main font-semibold">{selectedDebtObj.person_name}</span>
                            </div>
                            <div>
                                <span className="text-text-muted block">Debt Type:</span>
                                <span className={`font-semibold ${selectedDebtObj.debt_type === 'TAKEN' ? 'text-rose-400' : 'text-emerald-400'}`}>
                                    Debt {selectedDebtObj.debt_type}
                                </span>
                            </div>
                            <div>
                                <span className="text-text-muted block">Remaining Balance:</span>
                                <span className="text-text-main font-mono font-bold">₹{parseFloat(selectedDebtObj.remaining_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div>
                                <span className="text-text-muted block">Original Amount:</span>
                                <span className="text-text-main font-mono">₹{parseFloat(selectedDebtObj.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                            {selectedDebtObj.description && (
                                <div className="col-span-2">
                                    <span className="text-text-muted block">Debt Note:</span>
                                    <span className="text-text-main italic">{selectedDebtObj.description}</span>
                                </div>
                            )}
                        </div>
                    )}
                    {selectedFundObj && (
                        <div className="bg-bg-dark border border-border-main p-3.5 rounded-xl animate-fade-in text-xs grid grid-cols-2 gap-2">
                            <div className="col-span-2 font-extrabold text-secondary text-[10px] uppercase tracking-wider">
                                Linked Fund Details
                            </div>
                            <div>
                                <span className="text-text-muted block">Fund Title:</span>
                                <span className="text-text-main font-semibold">{selectedFundObj.title}</span>
                            </div>
                            <div>
                                <span className="text-text-muted block">Status:</span>
                                <span className={`font-bold px-1.5 py-0.2 rounded text-[10px] ${selectedFundObj.status === 'ACTIVE' ? 'bg-emerald-950/60 text-emerald-400' : 'bg-red-950/60 text-red-400'}`}>
                                    {selectedFundObj.status}
                                </span>
                            </div>
                            <div>
                                <span className="text-text-muted block">Remaining Balance:</span>
                                <span className="text-text-main font-mono font-bold">₹{parseFloat(selectedFundObj.remaining_balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div>
                                <span className="text-text-muted block">Provider / Ledger:</span>
                                <span className="text-text-main font-semibold">{selectedFundObj.ledger_details?.name || "Unknown"}</span>
                            </div>
                            {selectedFundObj.notes && (
                                <div className="col-span-2">
                                    <span className="text-text-muted block">Notes:</span>
                                    <span className="text-text-main italic">{selectedFundObj.notes}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
           
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4 items-stretch sm:items-end">
                {/* Date */}
                {(prefillDebt || prefillEvent || ['DEBT_TAKEN_RETURN', 'DEBT_GIVEN_RETURN', 'FUND_CREDIT', 'FUND_EXPENSE'].includes(formData.transaction_type)) && (
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

                {/* Description / Person / Debt / Fund autocomplete */}
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
                ) : ['DEBT_TAKEN_RETURN', 'DEBT_GIVEN_RETURN'].includes(formData.transaction_type) ? (
                    <div ref={debtContainerRef} className="relative w-full md:flex-[1.5] md:min-w-[200px]">
                        <label className="block text-xs text-text-muted mb-1 font-semibold uppercase tracking-wider">Select Debt Record</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={debtQuery}
                                onChange={(e) => {
                                    setDebtQuery(e.target.value);
                                    if (formData.related_debt) {
                                        setFormData(prev => ({ ...prev, related_debt: '' }));
                                    }
                                    setIsDebtDropdownOpen(true);
                                }}
                                onFocus={() => setIsDebtDropdownOpen(true)}
                                placeholder="Search debt by name..."
                                className="w-full bg-bg-dark border border-border-main rounded-xl px-3 py-2 focus:border-primary outline-none text-text-main text-sm pr-8"
                                required={!formData.related_debt}
                            />
                            {isDebtDropdownOpen && (
                                <ul className="absolute left-0 right-0 z-50 mt-1.5 bg-card-dark border border-border-main rounded-xl shadow-2xl max-h-60 overflow-y-auto divide-y divide-border-main animate-fade-in">
                                    {filteredDebts.map((debt) => (
                                        <li
                                            key={debt.id}
                                            onClick={() => {
                                                const loanCat = categories.find(c => c.name.toLowerCase().includes('loan') || c.name.toLowerCase().includes('debt')) || categories[0];
                                                setFormData(prev => ({
                                                    ...prev,
                                                    related_debt: debt.id,
                                                    amount: debt.remaining_amount || debt.amount,
                                                    description: `Repayment: ${debt.person_name}`,
                                                    ledger: debt.ledger || '',
                                                    category: loanCat ? loanCat.id : prev.category
                                                }));
                                                setDebtQuery(debt.person_name);
                                                setIsDebtDropdownOpen(false);
                                            }}
                                            className="px-3.5 py-2.5 text-xs sm:text-sm text-text-muted cursor-pointer hover:bg-bg-dark/40 transition-colors flex flex-col gap-0.5"
                                        >
                                            <div className="flex justify-between items-center">
                                                <span className="font-semibold text-text-main">{debt.person_name}</span>
                                                <span className="font-mono text-xs font-bold text-primary">₹{parseFloat(debt.remaining_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} remaining</span>
                                            </div>
                                            <div className="flex justify-between items-center text-[10px] text-text-muted">
                                                <span>Original: ₹{parseFloat(debt.amount).toLocaleString(undefined, { minimumFractionDigits: 0 })} ({debt.date})</span>
                                                {debt.description && <span className="italic truncate max-w-[150px]">{debt.description}</span>}
                                            </div>
                                        </li>
                                    ))}
                                    {filteredDebts.length === 0 && (
                                        <li className="px-3.5 py-2.5 text-xs text-text-muted italic">
                                            No active debts found.
                                        </li>
                                    )}
                                </ul>
                            )}
                        </div>
                    </div>
                ) : ['FUND_CREDIT', 'FUND_EXPENSE'].includes(formData.transaction_type) ? (
                    <div ref={fundContainerRef} className="relative w-full md:flex-[1.5] md:min-w-[200px]">
                        <label className="block text-xs text-text-muted mb-1 font-semibold uppercase tracking-wider">Select Fund</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={fundQuery}
                                onChange={(e) => {
                                    setFundQuery(e.target.value);
                                    if (formData.fund) {
                                        setFormData(prev => ({ ...prev, fund: '' }));
                                    }
                                    setIsFundDropdownOpen(true);
                                }}
                                onFocus={() => setIsFundDropdownOpen(true)}
                                placeholder="Search fund..."
                                className="w-full bg-bg-dark border border-border-main rounded-xl px-3 py-2 focus:border-primary outline-none text-text-main text-sm pr-8"
                                required={!formData.fund}
                            />
                            {isFundDropdownOpen && (
                                <ul className="absolute left-0 right-0 z-50 mt-1.5 bg-card-dark border border-border-main rounded-xl shadow-2xl max-h-60 overflow-y-auto divide-y divide-border-main animate-fade-in">
                                    {filteredFunds.map((fund) => (
                                        <li
                                            key={fund.id}
                                            onClick={() => {
                                                setFormData(prev => ({
                                                    ...prev,
                                                    fund: fund.id
                                                }));
                                                setFundQuery(fund.title);
                                                setIsFundDropdownOpen(false);
                                            }}
                                            className="px-3.5 py-2.5 text-xs sm:text-sm text-text-muted cursor-pointer hover:bg-bg-dark/40 transition-colors flex flex-col gap-0.5"
                                        >
                                            <div className="flex justify-between items-center">
                                                <span className="font-semibold text-text-main">{fund.title}</span>
                                                <span className="font-mono text-xs font-bold text-secondary">₹{parseFloat(fund.remaining_balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-[10px] text-text-muted">
                                                <span>Provider: {fund.ledger_details?.name || "Unknown"}</span>
                                                <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${fund.status === 'ACTIVE' ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-900/40' : 'bg-red-950/60 text-red-400 border border-red-900/40'}`}>{fund.status}</span>
                                            </div>
                                        </li>
                                    ))}
                                    {filteredFunds.length === 0 && (
                                        <li className="px-3.5 py-2.5 text-xs text-text-muted italic">
                                            No funds found.
                                        </li>
                                    )}
                                </ul>
                            )}
                        </div>
                    </div>
                ) : ['INVESTMENT', 'INVESTMENT_RETURN'].includes(formData.transaction_type) ? (
                    <div className="w-full md:flex-[1.5] md:min-w-[200px]">
                        <label className="block text-xs text-text-muted mb-1 font-semibold uppercase tracking-wider">Select Investment Profile</label>
                        <select 
                            name="related_investment" 
                            value={formData.related_investment} 
                            onChange={handleChange}
                            required
                            className="w-full bg-bg-dark border border-border-main rounded-xl px-3 py-2.5 focus:border-primary outline-none text-text-main text-sm cursor-pointer"
                        >
                            <option value="" disabled>Select Investment</option>
                            {investments.map(inv => (
                                <option key={inv.id} value={inv.id}>
                                    {inv.name} ({inv.investment_type === 'OTHER' ? inv.custom_type || 'Custom' : inv.investment_type.replace('_', ' ')}) - Bal: ₹{parseFloat(inv.remaining_balance).toLocaleString()}
                                </option>
                            ))}
                        </select>
                    </div>
                ) : null}

                {/* Fund Expense Title Input */}
                {formData.transaction_type === 'FUND_EXPENSE' && (
                    <div className="w-full sm:w-[calc(50%-8px)] md:flex-1 md:min-w-[150px]">
                        <label className="block text-xs text-text-muted mb-1 font-semibold uppercase tracking-wider">Expense Title</label>
                        <input 
                            type="text" 
                            name="title" 
                            value={formData.title} 
                            onChange={handleChange}
                            required
                            placeholder="e.g. Server hosting"
                            className="w-full bg-bg-dark border border-border-main rounded-xl px-3 py-2 focus:border-primary outline-none text-text-main text-sm"
                        />
                    </div>
                )}

                {/* Fund Expense Attachment Input */}
                {formData.transaction_type === 'FUND_EXPENSE' && (
                    <div className="w-full sm:w-[calc(50%-8px)] md:flex-1 md:min-w-[150px]">
                        <label className="block text-xs text-text-muted mb-1 font-semibold uppercase tracking-wider">Attachment</label>
                        <input 
                            type="file" 
                            name="attachment" 
                            onChange={(e) => setFormData(prev => ({ ...prev, attachment: e.target.files[0] }))}
                            className="w-full bg-bg-dark border border-border-main rounded-xl px-3 py-1.5 focus:border-primary outline-none text-text-main text-xs cursor-pointer"
                        />
                    </div>
                )}

                {/* Notes / Description Input */}
                {!['DEBT_TAKEN', 'DEBT_GIVEN'].includes(formData.transaction_type) && (
                    <div className="w-full md:flex-[2] md:min-w-[180px]">
                        <label className="block text-xs text-text-muted mb-1 font-semibold uppercase tracking-wider">
                            {formData.transaction_type === 'FUND_CREDIT' ? 'Notes (Optional)' : 
                             formData.transaction_type === 'FUND_EXPENSE' ? 'Expense Details (Optional)' :
                             ['DEBT_TAKEN_RETURN', 'DEBT_GIVEN_RETURN'].includes(formData.transaction_type) ? 'Repayment Notes (Optional)' : 'Description'}
                        </label>
                        <input 
                            type="text" 
                            name="description" 
                            value={formData.description} 
                            onChange={handleChange}
                            required={!['FUND_CREDIT', 'FUND_EXPENSE', 'DEBT_TAKEN_RETURN', 'DEBT_GIVEN_RETURN'].includes(formData.transaction_type)}
                            placeholder={formData.transaction_type === 'FUND_CREDIT' ? "e.g. Monthly allocation" : 
                                         formData.transaction_type === 'FUND_EXPENSE' ? "e.g. Server hosting details" :
                                         ['DEBT_TAKEN_RETURN', 'DEBT_GIVEN_RETURN'].includes(formData.transaction_type) ? "e.g. Returned cash" : "e.g. Grocery shopping"}
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
                        <option value="FUND_CREDIT">Fund Credit</option>
                        <option value="FUND_EXPENSE">Fund Expense</option>
                        <option value="CASH_WITHDRAWAL">Cash Withdrawal</option>
                        <option value="CASH_DEPOSIT">Cash Deposit</option>
                        <option value="INVESTMENT">Investment</option>
                        <option value="INVESTMENT_RETURN">Investment Return</option>
                    </select>
                </div>

                 {/* Category */}
                 {!['FUND_CREDIT', 'FUND_EXPENSE'].includes(formData.transaction_type) && (
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
                 )}

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
