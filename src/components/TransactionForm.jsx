import React, { useState, useEffect, useCallback } from 'react';
import { createTransaction, updateTransaction, getCategories, getDebtPeople } from '../api';
import Autocomplete from './Autocomplete';

const INITIAL_FORM_STATE = {
    amount: '',
    description: '',
    payment_mode: 'CASH',
    transaction_type: 'EXPENSE',
    category: '',
    date: '',
    related_debt: '',
    related_event: '',
    debt_description: ''
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
    const [people, setPeople] = useState([]);

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
            const res = await getDebtPeople();
            setPeople(res.data);
        } catch (err) {
            console.error("Failed to fetch people list", err);
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
                category: editingTransaction.category, // This should be ID
                date: editingTransaction.date,
                related_debt: editingTransaction.related_debt || '',
                related_event: editingTransaction.related_event || '',
                debt_description: editingTransaction.debt_description || ''
            });
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
        } else if (prefillEvent) {
             setFormData({
                ...INITIAL_FORM_STATE,
                description: `Event: ${prefillEvent.name}`,
                related_event: prefillEvent.id,
                date: selectedDate || today
            });
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
        } else if (!editingTransaction && !prefillDebt && !prefillInvestment) {
             setFormData(prev => ({
                ...INITIAL_FORM_STATE,
                date: selectedDate || today,
                category: prev.category // Keep existing default
            }));
        }
    }, [editingTransaction, selectedDate, prefillDebt, prefillEvent, prefillInvestment, categories]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editingTransaction) {
                await updateTransaction(editingTransaction.id, formData);
                onCancelEdit(); 
            } else {
                await createTransaction(formData);
                if (onCancelRepayment) onCancelRepayment();
                if (onCancelInvestment) onCancelInvestment();
            }
            try {
                const res = await getDebtPeople();
                setPeople(res.data);
            } catch (err) {
                console.error("Failed to fetch people list", err);
            }
            onTransactionAdded(); 
            if (!editingTransaction) {
                 const defaultCat = categories.find(c => c.name.toLowerCase() === 'food') || categories[0];
                 setFormData({ ...INITIAL_FORM_STATE, date: selectedDate || getTodayDateString(), category: defaultCat ? defaultCat.id : '' }); 
            }
        } catch (error) {
            console.error(error);
            alert("Failed to save transaction");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className={`bg-card-dark p-4 sm:p-5 rounded-xl shadow-lg mb-6 border ${editingTransaction ? 'border-primary' : 'border-gray-700/60'}`}>
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-800/40">
                 <h3 className="text-lg sm:text-xl font-bold text-secondary truncate pr-2">
                    {editingTransaction ? 'Edit Transaction' : prefillDebt ? 'Settle Debt' : prefillEvent ? `Add to Event: ${prefillEvent.name}` : prefillInvestment ? 'Convert Net Balance to Investment' : 'Add Transaction'}
                 </h3>
                 {(editingTransaction || prefillDebt || prefillEvent || prefillInvestment) && (
                     <button type="button" onClick={editingTransaction ? onCancelEdit : prefillDebt ? onCancelRepayment : prefillEvent ? onCancelEventTxn : onCancelInvestment} className="text-gray-400 hover:text-white text-xs sm:text-sm underline whitespace-nowrap">
                          Cancel
                     </button>
                 )}
            </div>
           
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4 items-stretch sm:items-end">
                {/* Date - Visible when settling debt or adding to an event */}
                {(prefillDebt || prefillEvent) && (
                    <div className="w-full sm:w-[calc(50%-8px)] md:w-auto md:min-w-[130px]">
                        <label className="block text-xs text-gray-400 mb-1 font-semibold">Date</label>
                        <input 
                            type="date" 
                            name="date" 
                            value={formData.date} 
                            onChange={handleChange}
                            required
                            className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 focus:border-primary outline-none text-white text-sm"
                        />
                    </div>
                )}

                {/* Amount */}
                <div className="w-full sm:w-[calc(50%-8px)] md:flex-1 md:min-w-[110px]">
                    <label className="block text-xs text-gray-400 mb-1 font-semibold">Amount</label>
                    <input 
                        type="number" 
                        name="amount" 
                        value={formData.amount} 
                        onChange={handleChange}
                        required
                        min="1"
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 focus:border-primary outline-none text-white text-sm"
                    />
                </div>

                {/* Description / Person Name */}
                {['DEBT_TAKEN', 'DEBT_GIVEN'].includes(formData.transaction_type) ? (
                    <>
                        <div className="w-full md:flex-1 md:min-w-[160px]">
                            <label className="block text-xs text-gray-400 mb-1 font-semibold">Person</label>
                            <Autocomplete
                                value={formData.description}
                                onChange={(val) => setFormData(prev => ({ ...prev, description: val }))}
                                suggestions={people}
                                placeholder="Search or add person..."
                                required={true}
                                className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 focus:border-primary focus:ring-1 focus:ring-primary outline-none text-white placeholder-gray-600 transition-all font-sans text-sm"
                            />
                        </div>
                        <div className="w-full md:flex-1 md:min-w-[160px]">
                            <label className="block text-xs text-gray-400 mb-1 font-semibold">Debt Notes (Optional)</label>
                            <input 
                                type="text" 
                                name="debt_description" 
                                value={formData.debt_description} 
                                onChange={handleChange}
                                placeholder="e.g. For dinner"
                                className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 focus:border-primary outline-none text-white text-sm"
                            />
                        </div>
                    </>
                ) : (
                    <div className="w-full md:flex-[2] md:min-w-[180px]">
                        <label className="block text-xs text-gray-400 mb-1 font-semibold">Description</label>
                        <input 
                            type="text" 
                            name="description" 
                            value={formData.description} 
                            onChange={handleChange}
                            required
                            className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 focus:border-primary outline-none text-white text-sm"
                        />
                    </div>
                )}

                {/* Type */}
                <div className="w-full sm:w-[calc(50%-8px)] md:w-auto md:min-w-[130px]">
                    <label className="block text-xs text-gray-400 mb-1 font-semibold">Type</label>
                    <select 
                        name="transaction_type" 
                        value={formData.transaction_type} 
                        onChange={handleChange}
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 focus:border-primary outline-none text-white text-sm cursor-pointer"
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
                    <label className="block text-xs text-gray-400 mb-1 font-semibold">Category</label>
                    <select 
                        name="category" 
                        value={formData.category} 
                        onChange={handleChange}
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 focus:border-primary outline-none text-white text-sm cursor-pointer"
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
                            className="w-4 h-4 text-primary focus:ring-primary bg-gray-800 border-gray-600"
                        />
                        <span className="text-sm text-gray-200">Cash</span>
                    </label>
                    <label className="cursor-pointer flex items-center gap-2 select-none">
                        <input 
                            type="radio" 
                            name="payment_mode" 
                            value="ACCOUNT"
                            checked={formData.payment_mode === 'ACCOUNT'}
                            onChange={handleChange}
                            className="w-4 h-4 text-primary focus:ring-primary bg-gray-800 border-gray-600"
                        />
                        <span className="text-sm text-gray-200">Account</span>
                    </label>
                </div>

                {/* Submit button */}
                <div className="w-full sm:w-auto flex justify-end">
                     <button 
                        type="submit" 
                        disabled={loading}
                        className={`w-full sm:w-auto font-bold py-2.5 px-6 rounded-lg transition-colors border text-sm ${editingTransaction ? 'bg-secondary text-black hover:bg-teal-400 border-teal-500' : 'bg-purple-600 text-white hover:bg-purple-700 border-purple-400'}`}
                    >
                        {loading ? '...' : editingTransaction ? 'Update' : prefillDebt ? 'Record Payment' : prefillEvent ? 'Add to Event' : 'Add'}
                    </button>
                </div>
            </div>
        </form>
    );
};

export default TransactionForm;
