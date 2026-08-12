import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { 
    getFundReports, 
    getFundDetails, 
    createFund, 
    updateFund,
    deleteFund, 
    createFundAddition, 
    updateFundAddition,
    deleteFundAddition, 
    createFundExpense, 
    updateFundExpense,
    deleteFundExpense,
    getLedgers,
    createLedger,
    BACKEND_URL
} from '../api';

const FundList = () => {
    const location = useLocation();
    const [reports, setReports] = useState(null);
    const [selectedFund, setSelectedFund] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('ACTIVE'); // ACTIVE or SETTLED

    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showAdditionModal, setShowAdditionModal] = useState(false);
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    
    // Edit Modals
    const [showEditFundModal, setShowEditFundModal] = useState(false);
    const [showEditAdditionModal, setShowEditAdditionModal] = useState(false);
    const [showEditExpenseModal, setShowEditExpenseModal] = useState(false);

    // Submission states (loading & anti-duplicate)
    const [savingCreate, setSavingCreate] = useState(false);
    const [savingAddition, setSavingAddition] = useState(false);
    const [savingExpense, setSavingExpense] = useState(false);
    
    const [savingEditFund, setSavingEditFund] = useState(false);
    const [savingEditAddition, setSavingEditAddition] = useState(false);
    const [savingEditExpense, setSavingEditExpense] = useState(false);

    // Ledger Autocomplete states
    const [ledgers, setLedgers] = useState([]);
    const [ledgerQuery, setLedgerQuery] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [showCreateLedgerInline, setShowCreateLedgerInline] = useState(false);
    const [newPhone, setNewPhone] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [inlineError, setInlineError] = useState('');
    const ledgerContainerRef = useRef(null);

    // Form states
    const [createForm, setCreateForm] = useState({
        title: '',
        ledger: '',
        initial_amount: '',
        received_date: new Date().toISOString().split('T')[0],
        notes: '',
        payment_mode: 'ACCOUNT'
    });

    const [additionForm, setAdditionForm] = useState({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        notes: '',
        payment_mode: 'ACCOUNT'
    });

    const [expenseForm, setExpenseForm] = useState({
        title: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
        attachment: null,
        payment_mode: 'ACCOUNT'
    });

    const [editFundForm, setEditFundForm] = useState({
        id: '',
        title: '',
        ledger: '',
        initial_amount: '',
        received_date: '',
        notes: '',
        payment_mode: 'ACCOUNT'
    });

    const [editAdditionForm, setEditAdditionForm] = useState({
        id: '',
        amount: '',
        date: '',
        notes: '',
        payment_mode: 'ACCOUNT'
    });

    const [editExpenseForm, setEditExpenseForm] = useState({
        id: '',
        title: '',
        amount: '',
        date: '',
        description: '',
        attachment: null,
        payment_mode: 'ACCOUNT',
        attachment_url: ''
    });

    const fetchReports = useCallback(async (showPageLoader = true) => {
        if (showPageLoader) setLoading(true);
        try {
            const res = await getFundReports();
            setReports(res.data);
            
            // If a fund is currently selected, refresh its details
            if (selectedFund) {
                const detailRes = await getFundDetails(selectedFund.id);
                setSelectedFund(detailRes.data);
            }
        } catch (error) {
            console.error("Error fetching funds", error);
        } finally {
            if (showPageLoader) setLoading(false);
        }
    }, [selectedFund]);

    const fetchLedgers = async () => {
        try {
            const res = await getLedgers();
            setLedgers(res.data);
        } catch (error) {
            console.error("Error fetching ledgers list:", error);
        }
    };

    useEffect(() => {
        fetchReports();
        fetchLedgers();
    }, []);

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (ledgerContainerRef.current && !ledgerContainerRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleQueryChange = (val) => {
        setLedgerQuery(val);
        if (createForm.ledger) {
            const currentLedger = ledgers.find(l => l.id === createForm.ledger);
            if (currentLedger && currentLedger.name !== val) {
                setCreateForm(prev => ({
                    ...prev,
                    ledger: '',
                }));
            }
        }
        setIsDropdownOpen(true);
    };

    const handleSelectLedger = (ledger) => {
        if (showCreateModal) {
            setCreateForm(prev => ({
                ...prev,
                ledger: ledger.id,
            }));
        } else if (showEditFundModal) {
            setEditFundForm(prev => ({
                ...prev,
                ledger: ledger.id,
            }));
        }
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
            if (showCreateModal) {
                setCreateForm(prev => ({
                    ...prev,
                    ledger: res.data.id,
                }));
            } else if (showEditFundModal) {
                setEditFundForm(prev => ({
                    ...prev,
                    ledger: res.data.id,
                }));
            }
            setShowCreateLedgerInline(false);
        } catch (err) {
            console.error(err);
            const detail = err.response?.data?.name?.[0] || err.response?.data?.detail || "Failed to create ledger.";
            setInlineError(detail);
        }
    };

    const filteredLedgers = ledgerQuery.trim()
        ? ledgers.filter(l => l.name.toLowerCase().includes(ledgerQuery.toLowerCase().trim()))
        : ledgers;

    const exactMatch = ledgers.some(l => l.name.toLowerCase() === ledgerQuery.toLowerCase().trim());

    useEffect(() => {
        if (reports) {
            const queryParams = new URLSearchParams(location.search);
            const fundIdParam = queryParams.get('id');
            if (fundIdParam) {
                const fundId = parseInt(fundIdParam);
                const allFunds = [
                    ...(reports.active_funds || []),
                    ...(reports.settled_funds || [])
                ];
                const fundToSelect = allFunds.find(f => f.id === fundId);
                if (fundToSelect) {
                    setActiveTab(fundToSelect.status);
                    getFundDetails(fundId).then(res => {
                        setSelectedFund(res.data);
                    }).catch(err => {
                        console.error("Failed to fetch fund details from query parameter", err);
                    });
                }
            }
        }
    }, [location.search, reports]);

    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        if (savingCreate) return;
        if (!createForm.ledger) {
            alert("Please select a Ledger or create a new one first.");
            return;
        }
        setSavingCreate(true);
        try {
            await createFund(createForm);
            alert("Purpose fund created successfully!");
            setShowCreateModal(false);
            setCreateForm({
                title: '',
                ledger: '',
                initial_amount: '',
                received_date: new Date().toISOString().split('T')[0],
                notes: '',
                payment_mode: 'ACCOUNT'
            });
            setLedgerQuery('');
            await fetchReports(false);
        } catch (error) {
            console.error("Failed to create fund", error);
            alert("Error creating fund: " + (error.response?.data?.detail || error.message));
        } finally {
            setSavingCreate(false);
        }
    };

    const handleAdditionSubmit = async (e) => {
        e.preventDefault();
        if (savingAddition) return;
        setSavingAddition(true);
        try {
            await createFundAddition({
                fund: selectedFund.id,
                amount: additionForm.amount,
                date: additionForm.date,
                notes: additionForm.notes,
                payment_mode: additionForm.payment_mode
            });
            alert("Funding entry (addition) added successfully!");
            setShowAdditionModal(false);
            setAdditionForm({
                amount: '',
                date: new Date().toISOString().split('T')[0],
                notes: '',
                payment_mode: 'ACCOUNT'
            });
            await fetchReports(false);
        } catch (error) {
            console.error("Failed to add funds", error);
            alert("Error adding funds: " + (error.response?.data?.detail || error.message));
        } finally {
            setSavingAddition(false);
        }
    };

    const handleExpenseSubmit = async (e) => {
        e.preventDefault();
        if (savingExpense) return;
        setSavingExpense(true);
        const formData = new FormData();
        formData.append('fund', selectedFund.id);
        formData.append('title', expenseForm.title);
        formData.append('amount', expenseForm.amount);
        formData.append('date', expenseForm.date);
        formData.append('description', expenseForm.description);
        formData.append('payment_mode', expenseForm.payment_mode);
        if (expenseForm.attachment) {
            formData.append('attachment', expenseForm.attachment);
        }

        try {
            await createFundExpense(formData);
            alert("Fund entry (expense) saved successfully!");
            setShowExpenseModal(false);
            setExpenseForm({
                title: '',
                amount: '',
                date: new Date().toISOString().split('T')[0],
                description: '',
                attachment: null,
                payment_mode: 'ACCOUNT'
            });
            await fetchReports(false);
        } catch (error) {
            console.error("Failed to add expense", error);
            alert("Error recording expense: " + (error.response?.data?.detail || error.message));
        } finally {
            setSavingExpense(false);
        }
    };

    const handleOpenEditFund = (fund) => {
        setEditFundForm({
            id: fund.id,
            title: fund.title,
            ledger: fund.ledger || '',
            initial_amount: fund.initial_amount.toString(),
            received_date: fund.received_date,
            notes: fund.notes || '',
            payment_mode: fund.payment_mode || 'ACCOUNT'
        });
        setLedgerQuery(fund.ledger_details?.name || '');
        setIsDropdownOpen(false);
        setShowCreateLedgerInline(false);
        setShowEditFundModal(true);
    };

    const handleEditFundSubmit = async (e) => {
        e.preventDefault();
        if (savingEditFund) return;
        if (!editFundForm.ledger) {
            alert("Please select a Ledger or create a new one first.");
            return;
        }
        setSavingEditFund(true);
        try {
            await updateFund(editFundForm.id, editFundForm);
            alert("Purpose fund updated successfully!");
            setShowEditFundModal(false);
            await fetchReports(false);
        } catch (error) {
            console.error("Failed to update fund", error);
            alert("Error updating fund: " + (error.response?.data?.detail || error.message));
        } finally {
            setSavingEditFund(false);
        }
    };

    const handleDeleteInitial = async (fundId) => {
        if (!window.confirm("Are you sure you want to delete the initial entry? This will set the initial amount to 0.")) return;
        try {
            const currentFund = reports.active_funds.find(f => f.id === fundId) || reports.settled_funds.find(f => f.id === fundId);
            if (!currentFund) return;
            const updatedData = {
                title: currentFund.title,
                ledger: currentFund.ledger,
                initial_amount: "0.00",
                received_date: currentFund.received_date,
                notes: currentFund.notes || '',
                payment_mode: currentFund.payment_mode || 'ACCOUNT'
            };
            await updateFund(fundId, updatedData);
            alert("Initial entry deleted (set to 0) successfully!");
            await fetchReports(false);
        } catch (error) {
            console.error("Failed to delete initial entry", error);
            alert("Error deleting initial entry: " + (error.response?.data?.detail || error.message));
        }
    };

    const handleOpenEditAddition = (item) => {
        const additionId = item.id.replace('addition_', '');
        setEditAdditionForm({
            id: additionId,
            amount: item.amount.toString(),
            date: item.date,
            notes: item.notes || '',
            payment_mode: item.payment_mode || 'ACCOUNT'
        });
        setShowEditAdditionModal(true);
    };

    const handleEditAdditionSubmit = async (e) => {
        e.preventDefault();
        if (savingEditAddition) return;
        setSavingEditAddition(true);
        try {
            await updateFundAddition(editAdditionForm.id, {
                fund: selectedFund.id,
                amount: editAdditionForm.amount,
                date: editAdditionForm.date,
                notes: editAdditionForm.notes,
                payment_mode: editAdditionForm.payment_mode
            });
            alert("Funding entry updated successfully!");
            setShowEditAdditionModal(false);
            await fetchReports(false);
        } catch (error) {
            console.error("Failed to update funding entry", error);
            alert("Error updating funding entry: " + (error.response?.data?.detail || error.message));
        } finally {
            setSavingEditAddition(false);
        }
    };

    const handleOpenEditExpense = (item) => {
        const expenseId = item.id.replace('expense_', '');
        setEditExpenseForm({
            id: expenseId,
            title: item.title,
            amount: item.amount.toString(),
            date: item.date,
            description: item.notes || '',
            attachment: null,
            payment_mode: item.payment_mode || 'ACCOUNT',
            attachment_url: item.attachment_url || ''
        });
        setShowEditExpenseModal(true);
    };

    const handleEditExpenseSubmit = async (e) => {
        e.preventDefault();
        if (savingEditExpense) return;
        setSavingEditExpense(true);
        const formData = new FormData();
        formData.append('fund', selectedFund.id);
        formData.append('title', editExpenseForm.title);
        formData.append('amount', editExpenseForm.amount);
        formData.append('date', editExpenseForm.date);
        formData.append('description', editExpenseForm.description);
        formData.append('payment_mode', editExpenseForm.payment_mode);
        if (editExpenseForm.attachment) {
            formData.append('attachment', editExpenseForm.attachment);
        }
        try {
            await updateFundExpense(editExpenseForm.id, formData);
            alert("Expense entry updated successfully!");
            setShowEditExpenseModal(false);
            await fetchReports(false);
        } catch (error) {
            console.error("Failed to update expense entry", error);
            alert("Error updating expense entry: " + (error.response?.data?.detail || error.message));
        } finally {
            setSavingEditExpense(false);
        }
    };

    const handleDeleteFund = async (fundId) => {
        if (!window.confirm("Are you sure you want to delete this fund permanently? All additions and expenses will be deleted.")) return;
        try {
            await deleteFund(fundId);
            setSelectedFund(null);
            fetchReports();
        } catch (error) {
            console.error("Failed to delete fund", error);
        }
    };

    const handleDeleteAddition = async (id) => {
        if (!window.confirm("Delete this funding addition?")) return;
        try {
            await deleteFundAddition(id);
            fetchReports(false);
        } catch (error) {
            console.error("Failed to delete addition", error);
        }
    };

    const handleDeleteExpense = async (id) => {
        if (!window.confirm("Delete this expense item?")) return;
        try {
            await deleteFundExpense(id);
            fetchReports(false);
        } catch (error) {
            console.error("Failed to delete expense", error);
        }
    };

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(val);
    };

    // Helper for timeline items styling and icons
    const renderTimelineIcon = (type) => {
        switch (type) {
            case 'INITIAL_FUND':
                return (
                    <div className="w-8 h-8 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-semibold text-xs shadow-sm">
                        🚀
                    </div>
                );
            case 'ADDITIONAL_FUND':
                return (
                    <div className="w-8 h-8 rounded-full bg-secondary/15 border border-secondary/30 flex items-center justify-center text-secondary font-semibold text-xs shadow-sm">
                        ➕
                    </div>
                );
            case 'EXPENSE':
                return (
                    <div className="w-8 h-8 rounded-full bg-error/15 border border-error/30 flex items-center justify-center text-error font-semibold text-xs shadow-sm">
                        💸
                    </div>
                );
            case 'SETTLEMENT':
                return (
                    <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-primary font-semibold text-xs shadow-sm">
                        🏁
                    </div>
                );
            default:
                return null;
        }
    };

    if (loading && !reports) {
        return (
            <div className="max-w-4xl mx-auto p-4 text-center py-20 flex flex-col justify-center items-center gap-3">
                <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                <p className="text-text-muted text-sm font-semibold">Loading Fund Manager...</p>
            </div>
        );
    }

    const { summary, active_funds = [], settled_funds = [] } = reports || { summary: {}, active_funds: [], settled_funds: [] };
    const displayedFunds = activeTab === 'ACTIVE' ? active_funds : settled_funds;

    return (
        <div className="max-w-4xl mx-auto px-4 space-y-6 text-text-main animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                     <h2 className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">Fund Management</h2>
                     <p className="text-xs sm:text-sm text-text-muted mt-0.5">Track specialized funding (events, grants, sponsorships) separate from personal cashflow.</p>
                </div>
                <button 
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary to-secondary text-black rounded-xl text-sm font-extrabold transition-transform active:scale-95 cursor-pointer shadow-lg w-full sm:w-auto"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                    Create New Fund
                </button>
            </div>



            {/* Fund Selection detail view */}
            {selectedFund && (
                <div className="bg-card-dark p-5 sm:p-6 rounded-2xl border border-border-main shadow-2xl animate-fade-in space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-border-main pb-4 gap-4">
                        <div>
                            <div className="flex items-center gap-3">
                                <h3 className="text-xl sm:text-2xl font-black text-primary">{selectedFund.title}</h3>
                                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                    selectedFund.status === 'ACTIVE' ? 'bg-success/15 text-success border-success/20' : 'bg-bg-dark text-text-muted border-border-main'
                                }`}>
                                    {selectedFund.status}
                                </span>
                            </div>
                            <p className="text-text-muted text-xs sm:text-sm mt-1.5"><strong className="text-text-main font-semibold">Ledger Profile:</strong> {selectedFund.ledger_details?.name || "Unknown"}</p>
                            {selectedFund.notes && (
                                <p className="text-[11px] text-text-muted mt-1"><strong className="text-text-muted">Notes:</strong> {selectedFund.notes}</p>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2 w-full md:w-auto">
                            <button 
                                onClick={() => handleDeleteFund(selectedFund.id)}
                                className="flex-1 md:flex-initial px-4 py-2 bg-error/15 hover:bg-error/25 border border-error/20 text-error rounded-xl text-xs font-extrabold transition-colors cursor-pointer"
                            >
                                Delete Fund
                            </button>
                            <button 
                                onClick={() => setSelectedFund(null)}
                                className="px-4 py-2 bg-bg-dark border border-border-main text-text-muted hover:text-text-main rounded-xl text-xs font-extrabold transition-colors cursor-pointer"
                            >
                                Close Detail
                            </button>
                        </div>
                    </div>

                    {/* Detail calculations */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-bg-dark/40 p-4 rounded-xl border border-border-main">
                        <div>
                            <span className="text-[10px] text-text-muted uppercase font-bold block mb-0.5">Received Budget</span>
                            <span className="text-base font-bold text-emerald-500">{formatCurrency(selectedFund.total_received)}</span>
                        </div>
                        <div>
                            <span className="text-[10px] text-text-muted uppercase font-bold block mb-0.5">Total Spent</span>
                            <span className="text-base font-bold text-error">{formatCurrency(selectedFund.total_spent)}</span>
                        </div>
                        <div>
                            <span className="text-[10px] text-text-muted uppercase font-bold block mb-0.5">Remaining Balance</span>
                            <span className={`text-base font-bold ${parseFloat(selectedFund.remaining_balance) >= 0 ? 'text-secondary' : 'text-error'}`}>
                                {formatCurrency(selectedFund.remaining_balance)}
                            </span>
                        </div>
                        <div>
                            <span className="text-[10px] text-text-muted uppercase font-bold block mb-0.5">Activity Count</span>
                            <span className="text-base font-bold text-primary">{selectedFund.number_of_transactions} actions</span>
                        </div>
                    </div>

                    {/* Action buttons inside selected fund */}
                    {(selectedFund.status === 'ACTIVE' || selectedFund.status === 'CLOSED') && (
                        <div className="flex flex-col sm:flex-row gap-3">
                            <button 
                                onClick={() => setShowAdditionModal(true)}
                                className="flex-1 py-2.5 bg-bg-dark hover:bg-bg-dark/80 border border-border-main rounded-xl text-xs font-extrabold text-secondary flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                            >
                                ➕ Add Money to Budget
                            </button>
                            <button 
                                onClick={() => setShowExpenseModal(true)}
                                className="flex-1 py-2.5 bg-bg-dark hover:bg-bg-dark/80 border border-border-main rounded-xl text-xs font-extrabold text-error flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                            >
                                💸 Record Fund Expense
                            </button>
                        </div>
                    )}

                    {/* Chronological Timeline */}
                    <div className="space-y-4 pt-2">
                        <h4 className="text-base font-extrabold text-text-main">Activity Ledger Timeline</h4>
                        <div className="relative border-l-2 border-border-main ml-4 pl-6 space-y-6">
                            {selectedFund.timeline && selectedFund.timeline.map((item) => (
                                <div key={item.id} className="relative group">
                                    {/* Timeline dot */}
                                    <div className="absolute -left-10 top-0.5">
                                        {renderTimelineIcon(item.type)}
                                    </div>
                                    <div className="bg-bg-dark/30 p-4 rounded-xl border border-border-main shadow-sm relative hover:border-border-main/80 transition-colors">
                                        
                                        {/* Action Edit/Delete buttons */}
                                        <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                            {item.type === 'INITIAL_FUND' && (
                                                <>
                                                    <button 
                                                        onClick={() => handleOpenEditFund(selectedFund)}
                                                        className="text-[10px] text-secondary hover:text-secondary-hover bg-secondary/10 px-2 py-0.5 border border-secondary/20 rounded cursor-pointer font-bold"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteInitial(selectedFund.id)}
                                                        className="text-[10px] text-error hover:text-red-400 bg-error/10 px-2 py-0.5 border border-error/20 rounded cursor-pointer font-bold"
                                                    >
                                                        Delete
                                                    </button>
                                                </>
                                            )}
                                            {item.type === 'ADDITIONAL_FUND' && (
                                                <>
                                                    <button 
                                                        onClick={() => handleOpenEditAddition(item)}
                                                        className="text-[10px] text-secondary hover:text-secondary-hover bg-secondary/10 px-2 py-0.5 border border-secondary/20 rounded cursor-pointer font-bold"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteAddition(item.id.replace('addition_', ''))}
                                                        className="text-[10px] text-error hover:text-red-400 bg-error/10 px-2 py-0.5 border border-error/20 rounded cursor-pointer font-bold"
                                                    >
                                                        Delete
                                                    </button>
                                                </>
                                            )}
                                            {item.type === 'EXPENSE' && (
                                                <>
                                                    <button 
                                                        onClick={() => handleOpenEditExpense(item)}
                                                        className="text-[10px] text-secondary hover:text-secondary-hover bg-secondary/10 px-2 py-0.5 border border-secondary/20 rounded cursor-pointer font-bold"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteExpense(item.id.replace('expense_', ''))}
                                                        className="text-[10px] text-error hover:text-red-400 bg-error/10 px-2 py-0.5 border border-error/20 rounded cursor-pointer font-bold"
                                                    >
                                                        Delete
                                                    </button>
                                                </>
                                            )}
                                        </div>

                                        <div className="flex justify-between items-start gap-4">
                                            <div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-sm font-bold text-text-main">{item.title}</span>
                                                </div>
                                                <span className="text-[10px] text-text-muted font-semibold mt-1 block">{item.date}</span>
                                                <p className="text-xs text-text-muted mt-2 leading-relaxed">{item.notes || item.description}</p>
                                                
                                                {/* Attachment Section */}
                                                {item.attachment_url && (
                                                    <div className="mt-3">
                                                        <a 
                                                            href={item.attachment_url.startsWith('http') ? item.attachment_url : `${BACKEND_URL}${item.attachment_url}`} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1.5 text-[11px] text-secondary hover:underline bg-secondary/10 px-2.5 py-1 rounded border border-secondary/20 font-bold"
                                                        >
                                                            <span>📄 View Receipt/Attachment</span>
                                                        </a>
                                                        {/* Optional thumbnail if image */}
                                                        {/\.(jpg|jpeg|png|webp|gif)$/i.test(item.attachment_url) && (
                                                            <div className="mt-2 rounded-xl border border-border-main overflow-hidden w-20 h-20 bg-black flex items-center justify-center shadow-sm">
                                                                <img 
                                                                    src={item.attachment_url.startsWith('http') ? item.attachment_url : `${BACKEND_URL}${item.attachment_url}`} 
                                                                    alt="receipt thumb"
                                                                    className="max-w-full max-h-full object-cover" 
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                {item.type === 'EXPENSE' ? (
                                                    <span className="text-sm sm:text-base font-extrabold text-error">-{formatCurrency(item.amount)}</span>
                                                ) : item.type === 'INITIAL_FUND' || item.type === 'ADDITIONAL_FUND' ? (
                                                    <span className="text-sm sm:text-base font-extrabold text-emerald-500">+{formatCurrency(item.amount)}</span>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Tabs / Segmented Control */}
            <div className="flex border-b border-border-main bg-bg-dark/40 rounded-xl overflow-hidden p-1 border">
                <button 
                    onClick={() => setActiveTab('ACTIVE')}
                    className={`flex-1 py-2.5 text-xs sm:text-sm font-bold transition-all text-center rounded-lg cursor-pointer ${
                        activeTab === 'ACTIVE' 
                        ? 'bg-card-dark text-primary shadow' 
                        : 'text-text-muted hover:text-text-main'
                    }`}
                >
                    🟢 Active Funds ({active_funds.length})
                </button>
                <button 
                    onClick={() => setActiveTab('SETTLED')}
                    className={`flex-1 py-2.5 text-xs sm:text-sm font-bold transition-all text-center rounded-lg cursor-pointer ${
                        activeTab === 'SETTLED' 
                        ? 'bg-card-dark text-text-muted shadow' 
                        : 'text-text-muted hover:text-text-main'
                    }`}
                >
                    🏁 Closed Funds ({settled_funds.length})
                </button>
            </div>

            {/* Funds List Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayedFunds.length > 0 ? (
                    displayedFunds.map(fund => (
                        <div 
                            key={fund.id} 
                            onClick={async () => {
                                setSelectedFund(fund);
                                // Fetch full details (with timeline)
                                try {
                                    const res = await getFundDetails(fund.id);
                                    setSelectedFund(res.data);
                                    window.scrollTo({ top: 120, behavior: 'smooth' });
                                } catch (e) {
                                    console.error(e);
                                }
                            }}
                            className={`p-5 rounded-2xl border transition-all cursor-pointer shadow-sm flex flex-col justify-between ${
                                selectedFund?.id === fund.id
                                ? 'bg-bg-dark border-primary shadow-lg ring-1 ring-primary'
                                : 'bg-card-dark border-border-main hover:border-border-main/80 hover:shadow-md'
                            }`}
                        >
                            <div>
                                <div className="flex justify-between items-start gap-2 mb-2">
                                    <h4 className="font-extrabold text-base text-text-main line-clamp-1">{fund.title}</h4>
                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                        fund.status === 'ACTIVE' ? 'bg-success/15 text-success border border-success/20' : 'bg-bg-dark text-text-muted'
                                    }`}>
                                        {fund.status}
                                    </span>
                                </div>
                                <span className="text-[10px] text-text-muted font-bold block">Ledger Profile: {fund.ledger_details?.name || "Unknown"}</span>
                            </div>

                            <div className="mt-4 pt-3 border-t border-border-main grid grid-cols-3 gap-2 text-xs">
                                <div>
                                    <span className="text-text-muted block text-[9px] uppercase font-semibold">Received</span>
                                    <span className="font-bold text-emerald-500">{formatCurrency(fund.total_received)}</span>
                                </div>
                                <div>
                                    <span className="text-text-muted block text-[9px] uppercase font-semibold">Spent</span>
                                    <span className="font-bold text-error">{formatCurrency(fund.total_spent)}</span>
                                </div>
                                <div>
                                    <span className="text-text-muted block text-[9px] uppercase font-semibold">Remaining</span>
                                    <span className={`font-bold ${parseFloat(fund.remaining_balance) >= 0 ? 'text-secondary' : 'text-error'}`}>
                                        {formatCurrency(fund.remaining_balance)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-2 py-16 text-center text-text-muted bg-card-dark rounded-2xl border border-border-main">
                        <p className="text-sm font-semibold">No {activeTab.toLowerCase()} purpose funds found.</p>
                        <p className="text-xs text-text-muted mt-1">Initiate a purpose fund using the "Create New Fund" action.</p>
                    </div>
                )}
            </div>

            {/* MODALS SECTION */}
            
            {/* Create Fund Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
                    <div className="bg-card-dark p-6 rounded-2xl border border-border-main w-full max-w-md shadow-2xl relative">
                        <button 
                            onClick={() => setShowCreateModal(false)}
                            className="absolute right-4 top-4 text-text-muted hover:text-text-main cursor-pointer"
                        >
                            ✕
                        </button>
                        <h3 className="text-lg font-black text-primary mb-4 uppercase tracking-wider">Create Purpose Fund</h3>
                        <form onSubmit={handleCreateSubmit} className="space-y-4">
                            <div>
                                <label className="text-xs text-text-muted block mb-1 font-semibold uppercase">Fund Title *</label>
                                <input 
                                    type="text" 
                                    required 
                                    className="w-full bg-bg-dark border border-border-main rounded-xl p-2.5 text-sm text-text-main placeholder-text-muted focus:outline-none focus:border-primary"
                                    value={createForm.title}
                                    onChange={e => setCreateForm({...createForm, title: e.target.value})}
                                    placeholder="e.g. Office Tech Fest 2026"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                 <div>
                                     <label className="text-xs text-text-muted block mb-1 font-semibold uppercase">Amount Received *</label>
                                     <input 
                                         type="number" 
                                         required 
                                         min="0"
                                         step="0.01"
                                         className="w-full bg-bg-dark border border-border-main rounded-xl p-2.5 text-sm text-text-main placeholder-text-muted focus:outline-none focus:border-primary font-mono"
                                         value={createForm.initial_amount}
                                         onChange={e => setCreateForm({...createForm, initial_amount: e.target.value})}
                                         placeholder="0.00"
                                     />
                                 </div>
                                 <div>
                                     <label className="text-xs text-text-muted block mb-1 font-semibold uppercase">Payment Mode *</label>
                                     <select 
                                         className="w-full bg-bg-dark border border-border-main rounded-xl p-2.5 text-sm text-text-main focus:outline-none focus:border-primary cursor-pointer"
                                         value={createForm.payment_mode}
                                         onChange={e => setCreateForm({...createForm, payment_mode: e.target.value})}
                                     >
                                         <option value="ACCOUNT">Account</option>
                                         <option value="CASH">Cash</option>
                                     </select>
                                 </div>
                             </div>
                            <div className="grid grid-cols-1 gap-3">
                                <div ref={ledgerContainerRef} className="relative w-full">
                                    <label className="text-xs text-text-muted block mb-1 font-semibold uppercase">Ledger Profile *</label>
                                    <div className="relative">
                                        <input 
                                            type="text" 
                                            required 
                                            value={ledgerQuery}
                                            onChange={e => handleQueryChange(e.target.value)}
                                            onFocus={() => setIsDropdownOpen(true)}
                                            placeholder="Type to search or create a Ledger..."
                                            className="w-full bg-bg-dark border border-border-main rounded-xl p-2.5 text-sm text-text-main placeholder-text-muted focus:outline-none focus:border-primary"
                                        />
                                        
                                        {isDropdownOpen && (
                                            <ul className="absolute z-50 w-full mt-1.5 bg-card-dark border border-border-main rounded-xl shadow-2xl max-h-48 overflow-y-auto divide-y divide-border-main animate-fade-in">
                                                {filteredLedgers.map((ledger) => (
                                                    <li
                                                        key={ledger.id}
                                                        onClick={() => handleSelectLedger(ledger)}
                                                        className="px-4 py-2.5 text-sm text-text-muted cursor-pointer hover:bg-bg-dark/40 transition-colors flex justify-between items-center"
                                                    >
                                                        <span className="font-semibold text-text-main">{ledger.name}</span>
                                                        {ledger.phone && <span className="text-xs text-text-muted font-mono">{ledger.phone}</span>}
                                                    </li>
                                                ))}
                                                
                                                {ledgerQuery.trim() && !exactMatch && (
                                                    <li
                                                        onClick={handleStartCreateInline}
                                                        className="px-4 py-2.5 text-sm text-secondary hover:bg-bg-dark/40 cursor-pointer font-extrabold transition-colors flex items-center gap-1.5 border-t border-border-main"
                                                    >
                                                        ➕ Create Ledger: "{ledgerQuery.trim()}"
                                                    </li>
                                                )}
                                                
                                                {filteredLedgers.length === 0 && !ledgerQuery.trim() && (
                                                    <li className="px-4 py-2.5 text-sm text-text-muted italic">
                                                        No ledgers found. Start typing to create.
                                                    </li>
                                                )}
                                            </ul>
                                        )}
                                    </div>
                                    {createForm.ledger ? (
                                        <div className="mt-1 text-xs text-success flex items-center gap-1">
                                            <span>✓ Linked to: <span className="font-bold text-text-main">{ledgers.find(l => l.id === createForm.ledger)?.name}</span></span>
                                        </div>
                                    ) : (
                                        <div className="mt-1 text-xs text-text-muted">
                                            Select a ledger contact for this fund.
                                        </div>
                                    )}
                                </div>
                                
                                {showCreateLedgerInline && (
                                    <div className="bg-bg-dark border border-border-main p-3 rounded-xl animate-fade-in text-sm grid gap-2">
                                        <div className="font-extrabold text-secondary text-[10px] uppercase tracking-wider">
                                            Create New Ledger: "{ledgerQuery.trim()}"
                                        </div>
                                        {inlineError && (
                                            <div className="text-xs text-error">{inlineError}</div>
                                        )}
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-[9px] text-text-muted mb-0.5 uppercase font-semibold">Phone</label>
                                                <input
                                                    type="text"
                                                    placeholder="Phone number"
                                                    value={newPhone}
                                                    onChange={(e) => setNewPhone(e.target.value)}
                                                    className="w-full bg-card-dark border border-border-main rounded-lg px-2.5 py-1.5 text-xs text-text-main font-mono outline-none focus:border-primary"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[9px] text-text-muted mb-0.5 uppercase font-semibold">Email</label>
                                                <input
                                                    type="email"
                                                    placeholder="email@address.com"
                                                    value={newEmail}
                                                    onChange={(e) => setNewEmail(e.target.value)}
                                                    className="w-full bg-card-dark border border-border-main rounded-lg px-2.5 py-1.5 text-xs text-text-main outline-none focus:border-primary"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex gap-2 justify-end mt-1">
                                            <button
                                                type="button"
                                                onClick={() => setShowCreateLedgerInline(false)}
                                                className="bg-card-dark border border-border-main hover:bg-bg-dark text-text-muted px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleCreateInlineSubmit}
                                                className="bg-secondary hover:bg-secondary-hover text-black px-2.5 py-1 rounded text-xs font-extrabold transition-all cursor-pointer"
                                            >
                                                Create & Select
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-text-muted block mb-1 font-semibold uppercase">Received Date *</label>
                                    <input 
                                        type="date" 
                                        required 
                                        className="w-full bg-bg-dark border border-border-main rounded-xl p-2.5 text-sm text-text-main focus:outline-none focus:border-primary cursor-pointer"
                                        value={createForm.received_date}
                                        onChange={e => setCreateForm({...createForm, received_date: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-text-muted block mb-1 font-semibold uppercase">Notes (Optional)</label>
                                    <input 
                                        type="text" 
                                        className="w-full bg-bg-dark border border-border-main rounded-xl p-2.5 text-sm text-text-main placeholder-text-muted focus:outline-none focus:border-primary"
                                        value={createForm.notes}
                                        onChange={e => setCreateForm({...createForm, notes: e.target.value})}
                                        placeholder="Any comments"
                                    />
                                </div>
                            </div>
                            <button 
                                type="submit" 
                                disabled={savingCreate}
                                className={`w-full py-3 bg-primary hover:bg-primary-hover text-black font-extrabold rounded-xl text-sm transition-all mt-2 cursor-pointer shadow active:scale-95 flex items-center justify-center gap-2 ${savingCreate ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {savingCreate ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                                        <span>Saving...</span>
                                    </>
                                ) : (
                                    <span>Initialize Purpose Fund</span>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Additional Money Modal */}
            {showAdditionModal && selectedFund && (
                <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
                    <div className="bg-card-dark p-6 rounded-2xl border border-border-main w-full max-w-sm shadow-2xl relative">
                        <button 
                            onClick={() => setShowAdditionModal(false)}
                            className="absolute right-4 top-4 text-text-muted hover:text-text-main cursor-pointer"
                        >
                            ✕
                        </button>
                        <h3 className="text-lg font-black text-secondary mb-4 uppercase tracking-wider">Add money to Fund</h3>
                        <p className="text-xs text-text-muted mb-4 pb-2 border-b border-border-main/50">Adding to: <span className="text-text-main font-semibold">{selectedFund.title}</span></p>
                        <form onSubmit={handleAdditionSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-text-muted block mb-1 font-semibold uppercase">Amount *</label>
                                    <input 
                                        type="number" 
                                        required 
                                        min="0"
                                        step="0.01"
                                        className="w-full bg-bg-dark border border-border-main rounded-xl p-2.5 text-sm text-text-main placeholder-text-muted focus:outline-none focus:border-secondary font-mono"
                                        value={additionForm.amount}
                                        onChange={e => setAdditionForm({...additionForm, amount: e.target.value})}
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-text-muted block mb-1 font-semibold uppercase">Mode *</label>
                                    <select 
                                        className="w-full bg-bg-dark border border-border-main rounded-xl p-2.5 text-sm text-text-main focus:outline-none focus:border-secondary cursor-pointer"
                                        value={additionForm.payment_mode}
                                        onChange={e => setAdditionForm({...additionForm, payment_mode: e.target.value})}
                                    >
                                        <option value="ACCOUNT">Account</option>
                                        <option value="CASH">Cash</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-text-muted block mb-1 font-semibold uppercase">Received Date *</label>
                                <input 
                                    type="date" 
                                    required 
                                    className="w-full bg-bg-dark border border-border-main rounded-xl p-2.5 text-sm text-text-main focus:outline-none focus:border-secondary cursor-pointer"
                                    value={additionForm.date}
                                    onChange={e => setAdditionForm({...additionForm, date: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="text-xs text-text-muted block mb-1 font-semibold uppercase">Notes (Optional)</label>
                                <input 
                                    type="text" 
                                    className="w-full bg-bg-dark border border-border-main rounded-xl p-2.5 text-sm text-text-main placeholder-text-muted focus:outline-none focus:border-secondary"
                                    value={additionForm.notes}
                                    onChange={e => setAdditionForm({...additionForm, notes: e.target.value})}
                                    placeholder="e.g. Budget top-up"
                                />
                            </div>
                            <button 
                                type="submit" 
                                disabled={savingAddition}
                                className={`w-full py-3 bg-secondary hover:bg-secondary-hover text-black font-extrabold rounded-xl text-sm transition-all mt-2 cursor-pointer shadow active:scale-95 flex items-center justify-center gap-2 ${savingAddition ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {savingAddition ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                                        <span>Saving...</span>
                                    </>
                                ) : (
                                    <span>Confirm Top-up</span>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Record Expense Modal */}
            {showExpenseModal && selectedFund && (
                <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
                    <div className="bg-card-dark p-6 rounded-2xl border border-border-main w-full max-w-md shadow-2xl relative">
                        <button 
                            onClick={() => setShowExpenseModal(false)}
                            className="absolute right-4 top-4 text-text-muted hover:text-text-main cursor-pointer"
                        >
                            ✕
                        </button>
                        <h3 className="text-lg font-black text-error mb-4 uppercase tracking-wider">Record Fund Expense</h3>
                        <p className="text-xs text-text-muted mb-4 pb-2 border-b border-border-main/50">Charging: <span className="text-text-main font-semibold">{selectedFund.title}</span></p>
                        <form onSubmit={handleExpenseSubmit} className="space-y-4">
                            <div>
                                <label className="text-xs text-text-muted block mb-1 font-semibold uppercase">Expense Title *</label>
                                <input 
                                    type="text" 
                                    required 
                                    className="w-full bg-bg-dark border border-border-main rounded-xl p-2.5 text-sm text-text-main placeholder-text-muted focus:outline-none focus:border-error"
                                    value={expenseForm.title}
                                    onChange={e => setExpenseForm({...expenseForm, title: e.target.value})}
                                    placeholder="e.g. Purchase refreshments"
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-text-muted block mb-1 font-semibold uppercase">Expense Date *</label>
                                    <input 
                                        type="date" 
                                        required 
                                        className="w-full bg-bg-dark border border-border-main rounded-xl p-2.5 text-sm text-text-main focus:outline-none focus:border-error cursor-pointer"
                                        value={expenseForm.date}
                                        onChange={e => setExpenseForm({...expenseForm, date: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-text-muted block mb-1 font-semibold uppercase">Amount Spent *</label>
                                    <input 
                                        type="number" 
                                        required 
                                        min="0"
                                        step="0.01"
                                        className="w-full bg-bg-dark border border-border-main rounded-xl p-2.5 text-sm text-text-main placeholder-text-muted focus:outline-none focus:border-error font-mono"
                                        value={expenseForm.amount}
                                        onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})}
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-text-muted block mb-1 font-semibold uppercase">Payment Mode *</label>
                                    <select 
                                        className="w-full bg-bg-dark border border-border-main rounded-xl p-2.5 text-sm text-text-main focus:outline-none focus:border-error cursor-pointer"
                                        value={expenseForm.payment_mode}
                                        onChange={e => setExpenseForm({...expenseForm, payment_mode: e.target.value})}
                                    >
                                        <option value="ACCOUNT">Account</option>
                                        <option value="CASH">Cash</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-text-muted block mb-1 font-semibold uppercase">Attachment (Receipt)</label>
                                    <input 
                                        type="file" 
                                        className="w-full text-xs text-text-muted file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-bg-dark file:text-text-main hover:file:bg-bg-dark/80 cursor-pointer"
                                        onChange={e => setExpenseForm({...expenseForm, attachment: e.target.files[0]})}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-text-muted block mb-1 font-semibold uppercase">Notes / description</label>
                                <input 
                                    type="text" 
                                    className="w-full bg-bg-dark border border-border-main rounded-xl p-2.5 text-sm text-text-main placeholder-text-muted focus:outline-none focus:border-error"
                                    value={expenseForm.description}
                                    onChange={e => setExpenseForm({...expenseForm, description: e.target.value})}
                                    placeholder="Details of expense"
                                />
                            </div>
                            <button 
                                type="submit" 
                                disabled={savingExpense}
                                className={`w-full py-3 bg-error hover:bg-red-500 text-white font-extrabold rounded-xl text-sm transition-colors mt-2 cursor-pointer shadow active:scale-95 flex items-center justify-center gap-2 ${savingExpense ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {savingExpense ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                        <span>Saving...</span>
                                    </>
                                ) : (
                                    <span>Record Expense</span>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Fund (Initial Entry) Modal */}
            {showEditFundModal && (
                <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
                    <div className="bg-card-dark p-6 rounded-2xl border border-border-main w-full max-w-md shadow-2xl relative">
                        <button 
                            onClick={() => setShowEditFundModal(false)}
                            className="absolute right-4 top-4 text-text-muted hover:text-text-main cursor-pointer"
                        >
                            ✕
                        </button>
                        <h3 className="text-lg font-black text-primary mb-4 uppercase tracking-wider">Edit Fund Info</h3>
                        <form onSubmit={handleEditFundSubmit} className="space-y-4">
                            <div>
                                <label className="text-xs text-text-muted block mb-1 font-semibold uppercase">Fund Title *</label>
                                <input 
                                    type="text" 
                                    required 
                                    className="w-full bg-bg-dark border border-border-main rounded-xl p-2.5 text-sm text-text-main placeholder-text-muted focus:outline-none focus:border-primary"
                                    value={editFundForm.title}
                                    onChange={e => setEditFundForm({...editFundForm, title: e.target.value})}
                                    placeholder="e.g. Office Tech Fest 2026"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                 <div>
                                     <label className="text-xs text-text-muted block mb-1 font-semibold uppercase">Initial Amount *</label>
                                     <input 
                                         type="number" 
                                         required 
                                         min="0"
                                         step="0.01"
                                         className="w-full bg-bg-dark border border-border-main rounded-xl p-2.5 text-sm text-text-main placeholder-text-muted focus:outline-none focus:border-primary font-mono"
                                         value={editFundForm.initial_amount}
                                         onChange={e => setEditFundForm({...editFundForm, initial_amount: e.target.value})}
                                         placeholder="0.00"
                                     />
                                 </div>
                                 <div>
                                     <label className="text-xs text-text-muted block mb-1 font-semibold uppercase">Payment Mode *</label>
                                     <select 
                                         className="w-full bg-bg-dark border border-border-main rounded-xl p-2.5 text-sm text-text-main focus:outline-none focus:border-primary cursor-pointer"
                                         value={editFundForm.payment_mode}
                                         onChange={e => setEditFundForm({...editFundForm, payment_mode: e.target.value})}
                                     >
                                         <option value="ACCOUNT">Account</option>
                                         <option value="CASH">Cash</option>
                                     </select>
                                 </div>
                             </div>
                             
                            <div className="grid grid-cols-1 gap-3">
                                <div ref={ledgerContainerRef} className="relative w-full">
                                    <label className="text-xs text-text-muted block mb-1 font-semibold uppercase">Ledger Profile *</label>
                                    <div className="relative">
                                        <input 
                                            type="text" 
                                            required 
                                            value={ledgerQuery}
                                            onChange={e => handleQueryChange(e.target.value)}
                                            onFocus={() => setIsDropdownOpen(true)}
                                            placeholder="Type to search or create a Ledger..."
                                            className="w-full bg-bg-dark border border-border-main rounded-xl p-2.5 text-sm text-text-main placeholder-text-muted focus:outline-none focus:border-primary"
                                        />
                                        
                                        {isDropdownOpen && (
                                            <ul className="absolute z-50 w-full mt-1.5 bg-card-dark border border-border-main rounded-xl shadow-2xl max-h-48 overflow-y-auto divide-y divide-border-main animate-fade-in">
                                                {filteredLedgers.map((ledger) => (
                                                    <li
                                                        key={ledger.id}
                                                        onClick={() => handleSelectLedger(ledger)}
                                                        className="px-4 py-2.5 text-sm text-text-muted cursor-pointer hover:bg-bg-dark/40 transition-colors flex justify-between items-center"
                                                    >
                                                        <span className="font-semibold text-text-main">{ledger.name}</span>
                                                        {ledger.phone && <span className="text-xs text-text-muted font-mono">{ledger.phone}</span>}
                                                    </li>
                                                ))}
                                                
                                                {ledgerQuery.trim() && !exactMatch && (
                                                    <li
                                                        onClick={handleStartCreateInline}
                                                        className="px-4 py-2.5 text-sm text-secondary hover:bg-bg-dark/40 cursor-pointer font-extrabold transition-colors flex items-center gap-1.5 border-t border-border-main"
                                                    >
                                                        ➕ Create Ledger: "{ledgerQuery.trim()}"
                                                    </li>
                                                )}
                                                
                                                {filteredLedgers.length === 0 && !ledgerQuery.trim() && (
                                                    <li className="px-4 py-2.5 text-sm text-text-muted italic">
                                                        No ledgers found. Start typing to create.
                                                    </li>
                                                )}
                                            </ul>
                                        )}
                                    </div>
                                    {editFundForm.ledger ? (
                                        <div className="mt-1 text-xs text-success flex items-center gap-1">
                                            <span>✓ Linked to: <span className="font-bold text-text-main">{ledgers.find(l => l.id === editFundForm.ledger)?.name}</span></span>
                                        </div>
                                    ) : (
                                        <div className="mt-1 text-xs text-text-muted">
                                            Select a ledger contact for this fund.
                                        </div>
                                    )}
                                </div>
                                
                                {showCreateLedgerInline && (
                                    <div className="bg-bg-dark border border-border-main p-3 rounded-xl animate-fade-in text-sm grid gap-2">
                                        <div className="font-extrabold text-secondary text-[10px] uppercase tracking-wider">
                                            Create New Ledger: "{ledgerQuery.trim()}"
                                        </div>
                                        {inlineError && (
                                            <div className="text-xs text-error">{inlineError}</div>
                                        )}
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-[9px] text-text-muted mb-0.5 uppercase font-semibold">Phone</label>
                                                <input
                                                    type="text"
                                                    placeholder="Phone number"
                                                    value={newPhone}
                                                    onChange={(e) => setNewPhone(e.target.value)}
                                                    className="w-full bg-card-dark border border-border-main rounded-lg px-2.5 py-1.5 text-xs text-text-main font-mono outline-none focus:border-primary"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[9px] text-text-muted mb-0.5 uppercase font-semibold">Email</label>
                                                <input
                                                    type="email"
                                                    placeholder="email@address.com"
                                                    value={newEmail}
                                                    onChange={(e) => setNewEmail(e.target.value)}
                                                    className="w-full bg-card-dark border border-border-main rounded-lg px-2.5 py-1.5 text-xs text-text-main outline-none focus:border-primary"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex gap-2 justify-end mt-1">
                                            <button
                                                type="button"
                                                onClick={() => setShowCreateLedgerInline(false)}
                                                className="bg-card-dark border border-border-main hover:bg-bg-dark text-text-muted px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleCreateInlineSubmit}
                                                className="bg-secondary hover:bg-secondary-hover text-black px-2.5 py-1 rounded text-xs font-extrabold transition-all cursor-pointer"
                                            >
                                                Create & Select
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-text-muted block mb-1 font-semibold uppercase">Received Date *</label>
                                    <input 
                                        type="date" 
                                        required 
                                        className="w-full bg-bg-dark border border-border-main rounded-xl p-2.5 text-sm text-text-main focus:outline-none focus:border-primary cursor-pointer"
                                        value={editFundForm.received_date}
                                        onChange={e => setEditFundForm({...editFundForm, received_date: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-text-muted block mb-1 font-semibold uppercase">Notes (Optional)</label>
                                    <input 
                                        type="text" 
                                        className="w-full bg-bg-dark border border-border-main rounded-xl p-2.5 text-sm text-text-main placeholder-text-muted focus:outline-none focus:border-primary"
                                        value={editFundForm.notes}
                                        onChange={e => setEditFundForm({...editFundForm, notes: e.target.value})}
                                        placeholder="Any comments"
                                    />
                                </div>
                            </div>
                            <button 
                                type="submit" 
                                disabled={savingEditFund}
                                className={`w-full py-3 bg-primary hover:bg-primary-hover text-black font-extrabold rounded-xl text-sm transition-all mt-2 cursor-pointer shadow active:scale-95 flex items-center justify-center gap-2 ${savingEditFund ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {savingEditFund ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                                        <span>Saving...</span>
                                    </>
                                ) : (
                                    <span>Update Fund Info</span>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Addition Modal */}
            {showEditAdditionModal && selectedFund && (
                <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
                    <div className="bg-card-dark p-6 rounded-2xl border border-border-main w-full max-w-sm shadow-2xl relative">
                        <button 
                            onClick={() => setShowEditAdditionModal(false)}
                            className="absolute right-4 top-4 text-text-muted hover:text-text-main cursor-pointer"
                        >
                            ✕
                        </button>
                        <h3 className="text-lg font-black text-secondary mb-4 uppercase tracking-wider">Edit Funding Entry</h3>
                        <form onSubmit={handleEditAdditionSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-text-muted block mb-1 font-semibold uppercase">Amount *</label>
                                    <input 
                                        type="number" 
                                        required 
                                        min="0"
                                        step="0.01"
                                        className="w-full bg-bg-dark border border-border-main rounded-xl p-2.5 text-sm text-text-main placeholder-text-muted focus:outline-none focus:border-secondary font-mono"
                                        value={editAdditionForm.amount}
                                        onChange={e => setEditAdditionForm({...editAdditionForm, amount: e.target.value})}
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-text-muted block mb-1 font-semibold uppercase">Mode *</label>
                                    <select 
                                        className="w-full bg-bg-dark border border-border-main rounded-xl p-2.5 text-sm text-text-main focus:outline-none focus:border-secondary cursor-pointer"
                                        value={editAdditionForm.payment_mode}
                                        onChange={e => setEditAdditionForm({...editAdditionForm, payment_mode: e.target.value})}
                                    >
                                        <option value="ACCOUNT">Account</option>
                                        <option value="CASH">Cash</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-text-muted block mb-1 font-semibold uppercase">Received Date *</label>
                                <input 
                                    type="date" 
                                    required 
                                    className="w-full bg-bg-dark border border-border-main rounded-xl p-2.5 text-sm text-text-main focus:outline-none focus:border-secondary cursor-pointer"
                                    value={editAdditionForm.date}
                                    onChange={e => setEditAdditionForm({...editAdditionForm, date: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="text-xs text-text-muted block mb-1 font-semibold uppercase">Notes (Optional)</label>
                                <input 
                                    type="text" 
                                    className="w-full bg-bg-dark border border-border-main rounded-xl p-2.5 text-sm text-text-main placeholder-text-muted focus:outline-none focus:border-secondary"
                                    value={editAdditionForm.notes}
                                    onChange={e => setEditAdditionForm({...editAdditionForm, notes: e.target.value})}
                                    placeholder="e.g. Budget top-up"
                                />
                            </div>
                            <button 
                                type="submit" 
                                disabled={savingEditAddition}
                                className={`w-full py-3 bg-secondary hover:bg-secondary-hover text-black font-extrabold rounded-xl text-sm transition-all mt-2 cursor-pointer shadow active:scale-95 flex items-center justify-center gap-2 ${savingEditAddition ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {savingEditAddition ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                                        <span>Saving...</span>
                                    </>
                                ) : (
                                    <span>Update Funding Entry</span>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Expense Modal */}
            {showEditExpenseModal && selectedFund && (
                <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
                    <div className="bg-card-dark p-6 rounded-2xl border border-border-main w-full max-w-md shadow-2xl relative">
                        <button 
                            onClick={() => setShowEditExpenseModal(false)}
                            className="absolute right-4 top-4 text-text-muted hover:text-text-main cursor-pointer"
                        >
                            ✕
                        </button>
                        <h3 className="text-lg font-black text-error mb-4 uppercase tracking-wider">Edit Fund Expense</h3>
                        <form onSubmit={handleEditExpenseSubmit} className="space-y-4">
                            <div>
                                <label className="text-xs text-text-muted block mb-1 font-semibold uppercase">Expense Title *</label>
                                <input 
                                    type="text" 
                                    required 
                                    className="w-full bg-bg-dark border border-border-main rounded-xl p-2.5 text-sm text-text-main placeholder-text-muted focus:outline-none focus:border-error"
                                    value={editExpenseForm.title}
                                    onChange={e => setEditExpenseForm({...editExpenseForm, title: e.target.value})}
                                    placeholder="e.g. Purchase refreshments"
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-text-muted block mb-1 font-semibold uppercase">Expense Date *</label>
                                    <input 
                                        type="date" 
                                        required 
                                        className="w-full bg-bg-dark border border-border-main rounded-xl p-2.5 text-sm text-text-main focus:outline-none focus:border-error cursor-pointer"
                                        value={editExpenseForm.date}
                                        onChange={e => setEditExpenseForm({...editExpenseForm, date: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-text-muted block mb-1 font-semibold uppercase">Amount Spent *</label>
                                    <input 
                                        type="number" 
                                        required 
                                        min="0"
                                        step="0.01"
                                        className="w-full bg-bg-dark border border-border-main rounded-xl p-2.5 text-sm text-text-main placeholder-text-muted focus:outline-none focus:border-error font-mono"
                                        value={editExpenseForm.amount}
                                        onChange={e => setEditExpenseForm({...editExpenseForm, amount: e.target.value})}
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-text-muted block mb-1 font-semibold uppercase">Payment Mode *</label>
                                    <select 
                                        className="w-full bg-bg-dark border border-border-main rounded-xl p-2.5 text-sm text-text-main focus:outline-none focus:border-error cursor-pointer"
                                        value={editExpenseForm.payment_mode}
                                        onChange={e => setEditExpenseForm({...editExpenseForm, payment_mode: e.target.value})}
                                    >
                                        <option value="ACCOUNT">Account</option>
                                        <option value="CASH">Cash</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-text-muted block mb-1 font-semibold uppercase">Attachment (Receipt)</label>
                                    <input 
                                        type="file" 
                                        className="w-full text-xs text-text-muted file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-bg-dark file:text-text-main hover:file:bg-bg-dark/80 cursor-pointer"
                                        onChange={e => setEditExpenseForm({...editExpenseForm, attachment: e.target.files[0]})}
                                    />
                                    {editExpenseForm.attachment_url && (
                                        <div className="mt-1 text-[10px] text-text-muted">
                                            Current: <a href={editExpenseForm.attachment_url.startsWith('http') ? editExpenseForm.attachment_url : `${BACKEND_URL}${editExpenseForm.attachment_url}`} target="_blank" rel="noopener noreferrer" className="text-secondary hover:underline font-bold">View Receipt</a>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-text-muted block mb-1 font-semibold uppercase">Notes / description</label>
                                <input 
                                    type="text" 
                                    className="w-full bg-bg-dark border border-border-main rounded-xl p-2.5 text-sm text-text-main placeholder-text-muted focus:outline-none focus:border-error"
                                    value={editExpenseForm.description}
                                    onChange={e => setEditExpenseForm({...editExpenseForm, description: e.target.value})}
                                    placeholder="Details of expense"
                                />
                            </div>
                            <button 
                                type="submit" 
                                disabled={savingEditExpense}
                                className={`w-full py-3 bg-error hover:bg-red-500 text-white font-extrabold rounded-xl text-sm transition-colors mt-2 cursor-pointer shadow active:scale-95 flex items-center justify-center gap-2 ${savingEditExpense ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {savingEditExpense ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                        <span>Saving...</span>
                                    </>
                                ) : (
                                    <span>Update Expense</span>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FundList;
