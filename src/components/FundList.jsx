import React, { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { 
    getFundReports, 
    getFundDetails, 
    createFund, 
    settleFund, 
    reopenFund, 
    deleteFund, 
    createFundAddition, 
    deleteFundAddition, 
    createFundExpense, 
    deleteFundExpense,
    getCategories,
    BACKEND_URL
} from '../api';

const FundList = () => {
    const location = useLocation();
    const [reports, setReports] = useState(null);
    const [categories, setCategories] = useState([]);
    const [selectedFund, setSelectedFund] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('ACTIVE'); // ACTIVE or SETTLED

    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showAdditionModal, setShowAdditionModal] = useState(false);
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [showSettleModal, setShowSettleModal] = useState(false);

    // Form states
    const [createForm, setCreateForm] = useState({
        title: '',
        purpose: '',
        provider: '',
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
        category: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
        attachment: null,
        payment_mode: 'ACCOUNT'
    });

    const [settleForm, setSettleForm] = useState({
        settlement_date: new Date().toISOString().split('T')[0],
        returned_amount: '0',
        additional_amount_required: '0',
        settlement_notes: '',
        settlement_payment_mode: 'ACCOUNT'
    });

    const fetchReports = useCallback(async () => {
        setLoading(true);
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
            setLoading(false);
        }
    }, [selectedFund]);

    const fetchCategories = async () => {
        try {
            const res = await getCategories();
            setCategories(res.data);
            if (res.data.length > 0) {
                setExpenseForm(prev => ({ ...prev, category: res.data[0].id }));
            }
        } catch (error) {
            console.error("Error fetching categories", error);
        }
    };

    useEffect(() => {
        fetchReports();
        fetchCategories();
    }, []);

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
        try {
            await createFund(createForm);
            setShowCreateModal(false);
            setCreateForm({
                title: '',
                purpose: '',
                provider: '',
                initial_amount: '',
                received_date: new Date().toISOString().split('T')[0],
                notes: '',
                payment_mode: 'ACCOUNT'
            });
            fetchReports();
        } catch (error) {
            console.error("Failed to create fund", error);
            alert("Error creating fund: " + (error.response?.data?.error || error.message));
        }
    };

    const handleAdditionSubmit = async (e) => {
        e.preventDefault();
        try {
            await createFundAddition({
                fund: selectedFund.id,
                amount: additionForm.amount,
                date: additionForm.date,
                notes: additionForm.notes,
                payment_mode: additionForm.payment_mode
            });
            setShowAdditionModal(false);
            setAdditionForm({
                amount: '',
                date: new Date().toISOString().split('T')[0],
                notes: '',
                payment_mode: 'ACCOUNT'
            });
            fetchReports();
        } catch (error) {
            console.error("Failed to add funds", error);
            alert("Error adding funds: " + (error.response?.data?.error || error.message));
        }
    };

    const handleExpenseSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('fund', selectedFund.id);
        formData.append('title', expenseForm.title);
        formData.append('category', expenseForm.category);
        formData.append('amount', expenseForm.amount);
        formData.append('date', expenseForm.date);
        formData.append('description', expenseForm.description);
        formData.append('payment_mode', expenseForm.payment_mode);
        if (expenseForm.attachment) {
            formData.append('attachment', expenseForm.attachment);
        }

        try {
            await createFundExpense(formData);
            setShowExpenseModal(false);
            setExpenseForm({
                title: '',
                category: categories[0]?.id || '',
                amount: '',
                date: new Date().toISOString().split('T')[0],
                description: '',
                attachment: null,
                payment_mode: 'ACCOUNT'
            });
            fetchReports();
        } catch (error) {
            console.error("Failed to add expense", error);
            alert("Error adding expense: " + (error.response?.data?.error || error.message));
        }
    };

    const handleSettleSubmit = async (e) => {
        e.preventDefault();
        try {
            await settleFund(selectedFund.id, settleForm);
            setShowSettleModal(false);
            setSettleForm({
                settlement_date: new Date().toISOString().split('T')[0],
                returned_amount: '0',
                additional_amount_required: '0',
                settlement_notes: '',
                settlement_payment_mode: 'ACCOUNT'
            });
            fetchReports();
        } catch (error) {
            console.error("Failed to settle fund", error);
            alert("Error settling fund: " + (error.response?.data?.error || error.message));
        }
    };

    const handleReopen = async (fundId) => {
        if (!window.confirm("Are you sure you want to reopen this settled fund?")) return;
        try {
            await reopenFund(fundId);
            fetchReports();
        } catch (error) {
            console.error("Failed to reopen fund", error);
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
            fetchReports();
        } catch (error) {
            console.error("Failed to delete addition", error);
        }
    };

    const handleDeleteExpense = async (id) => {
        if (!window.confirm("Delete this expense item?")) return;
        try {
            await deleteFundExpense(id);
            fetchReports();
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

            {/* Overall Summary Cards */}
            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in">
                    <div className="bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/20 shadow-md">
                        <span className="text-[10px] text-text-muted font-bold block uppercase tracking-wider">Total Received</span>
                        <span className="text-lg sm:text-xl font-black text-emerald-500 mt-1 block">{formatCurrency(summary.total_received)}</span>
                    </div>
                    <div className="bg-rose-500/5 p-4 rounded-2xl border border-rose-500/20 shadow-md">
                        <span className="text-[10px] text-text-muted font-bold block uppercase tracking-wider">Total Spent</span>
                        <span className="text-lg sm:text-xl font-black text-rose-500 mt-1 block">{formatCurrency(summary.total_spent)}</span>
                    </div>
                    <div className="bg-secondary/5 p-4 rounded-2xl border border-secondary/20 shadow-md">
                        <span className="text-[10px] text-text-muted font-bold block uppercase tracking-wider">Remaining</span>
                        <span className="text-lg sm:text-xl font-black text-secondary mt-1 block">{formatCurrency(summary.remaining_balance)}</span>
                    </div>
                    <div className="bg-primary/5 p-4 rounded-2xl border border-primary/20 shadow-md">
                        <span className="text-[10px] text-text-muted font-bold block uppercase tracking-wider">Active / Closed</span>
                        <span className="text-lg sm:text-xl font-black text-primary mt-1 block">{summary.active_count}A / {summary.settled_count}C</span>
                    </div>
                </div>
            )}

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
                            <p className="text-text-muted text-xs sm:text-sm mt-1.5"><strong className="text-text-main font-semibold">Provider:</strong> {selectedFund.provider} | <strong className="text-text-main font-semibold">Purpose:</strong> {selectedFund.purpose}</p>
                            {selectedFund.notes && (
                                <p className="text-[11px] text-text-muted mt-1"><strong className="text-text-muted">Notes:</strong> {selectedFund.notes}</p>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2 w-full md:w-auto">
                            {selectedFund.status === 'ACTIVE' ? (
                                <button 
                                    onClick={() => {
                                        setSettleForm(prev => ({
                                            ...prev,
                                            returned_amount: Math.max(0, parseFloat(selectedFund.remaining_balance)).toString(),
                                            additional_amount_required: Math.max(0, -parseFloat(selectedFund.remaining_balance)).toString()
                                        }));
                                        setShowSettleModal(true);
                                    }}
                                    className="flex-1 md:flex-initial px-4 py-2 bg-success text-black rounded-xl text-xs font-extrabold transition-all cursor-pointer active:scale-95 shadow"
                                >
                                    Settle/Close
                                </button>
                            ) : (
                                <button 
                                    onClick={() => handleReopen(selectedFund.id)}
                                    className="flex-1 md:flex-initial px-4 py-2 bg-warning text-black rounded-xl text-xs font-extrabold transition-all cursor-pointer active:scale-95 shadow"
                                >
                                    Reopen Fund
                                </button>
                            )}
                            <button 
                                onClick={() => handleDeleteFund(selectedFund.id)}
                                className="flex-1 md:flex-initial px-4 py-2 bg-error/15 hover:bg-error/25 border border-error/20 text-error rounded-xl text-xs font-extrabold transition-colors cursor-pointer"
                            >
                                Delete
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
                    {selectedFund.status === 'ACTIVE' && (
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
                                        
                                        {/* Action deletion buttons */}
                                        {selectedFund.status === 'ACTIVE' && (
                                            <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {item.type === 'ADDITIONAL_FUND' && (
                                                    <button 
                                                        onClick={() => handleDeleteAddition(item.id.replace('addition_', ''))}
                                                        className="text-[10px] text-error hover:text-red-400 bg-error/10 px-2 py-0.5 border border-error/20 rounded cursor-pointer font-bold"
                                                    >
                                                        Delete
                                                    </button>
                                                )}
                                                {item.type === 'EXPENSE' && (
                                                    <button 
                                                        onClick={() => handleDeleteExpense(item.id.replace('expense_', ''))}
                                                        className="text-[10px] text-error hover:text-red-400 bg-error/10 px-2 py-0.5 border border-error/20 rounded cursor-pointer font-bold"
                                                    >
                                                        Delete
                                                    </button>
                                                )}
                                            </div>
                                        )}

                                        <div className="flex justify-between items-start gap-4">
                                            <div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-sm font-bold text-text-main">{item.title}</span>
                                                    {item.category && (
                                                        <span className="px-2 py-0.5 bg-card-dark text-text-muted rounded text-[9px] uppercase font-bold tracking-wide border border-border-main/50">
                                                            {item.category}
                                                        </span>
                                                    )}
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
                                                ) : item.type === 'SETTLEMENT' ? (
                                                    <div className="space-y-1 text-right text-xs">
                                                        {item.returned_amount > 0 && (
                                                            <div>
                                                                <span className="text-text-muted block text-[10px]">Returned</span>
                                                                <span className="text-xs sm:text-sm font-extrabold text-emerald-500">{formatCurrency(item.returned_amount)}</span>
                                                            </div>
                                                        )}
                                                        {item.additional_amount_required > 0 && (
                                                            <div>
                                                                <span className="text-text-muted block text-[10px]">Exceeded Cost</span>
                                                                <span className="text-xs sm:text-sm font-extrabold text-error">{formatCurrency(item.additional_amount_required)}</span>
                                                            </div>
                                                        )}
                                                    </div>
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
                                <span className="text-[10px] text-text-muted font-bold block">Provided by: {fund.provider}</span>
                                <p className="text-xs text-text-muted mt-2 line-clamp-2 leading-relaxed">{fund.purpose}</p>
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
                            <div>
                                <label className="text-xs text-text-muted block mb-1 font-semibold uppercase">Purpose *</label>
                                <textarea 
                                    required 
                                    rows={2}
                                    className="w-full bg-bg-dark border border-border-main rounded-xl p-2.5 text-sm text-text-main placeholder-text-muted focus:outline-none focus:border-primary resize-none"
                                    value={createForm.purpose}
                                    onChange={e => setCreateForm({...createForm, purpose: e.target.value})}
                                    placeholder="Brief purpose description"
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
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-text-muted block mb-1 font-semibold uppercase">Provider Name *</label>
                                    <input 
                                        type="text" 
                                        required 
                                        className="w-full bg-bg-dark border border-border-main rounded-xl p-2.5 text-sm text-text-main placeholder-text-muted focus:outline-none focus:border-primary"
                                        value={createForm.provider}
                                        onChange={e => setCreateForm({...createForm, provider: e.target.value})}
                                        placeholder="Provider Person/Org"
                                    />
                                </div>
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
                            </div>
                            <div>
                                <label className="text-xs text-text-muted block mb-1 font-semibold uppercase">Notes (Optional)</label>
                                <input 
                                    type="text" 
                                    className="w-full bg-bg-dark border border-border-main rounded-xl p-2.5 text-sm text-text-main placeholder-text-muted focus:outline-none focus:border-primary"
                                    value={createForm.notes}
                                    onChange={e => setCreateForm({...createForm, notes: e.target.value})}
                                    placeholder="Any additional comments"
                                />
                            </div>
                            <button 
                                type="submit" 
                                className="w-full py-3 bg-primary hover:bg-primary-hover text-black font-extrabold rounded-xl text-sm transition-all mt-2 cursor-pointer shadow active:scale-95"
                            >
                                Initialize Purpose Fund
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
                                className="w-full py-3 bg-secondary hover:bg-secondary-hover text-black font-extrabold rounded-xl text-sm transition-all mt-2 cursor-pointer shadow active:scale-95"
                            >
                                Confirm Top-up
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
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-text-muted block mb-1 font-semibold uppercase">Category *</label>
                                    <select 
                                        required 
                                        className="w-full bg-bg-dark border border-border-main rounded-xl p-2.5 text-sm text-text-main focus:outline-none focus:border-error cursor-pointer"
                                        value={expenseForm.category}
                                        onChange={e => setExpenseForm({...expenseForm, category: e.target.value})}
                                    >
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>
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
                            </div>
                            <div className="grid grid-cols-2 gap-3">
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
                            <div>
                                <label className="text-xs text-text-muted block mb-1 font-semibold uppercase">Attachment (Receipt)</label>
                                <input 
                                    type="file" 
                                    className="w-full text-xs text-text-muted file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-bg-dark file:text-text-main hover:file:bg-bg-dark/80 cursor-pointer"
                                    onChange={e => setExpenseForm({...expenseForm, attachment: e.target.files[0]})}
                                />
                            </div>
                            <button 
                                type="submit" 
                                className="w-full py-3 bg-error hover:bg-red-500 text-white font-extrabold rounded-xl text-sm transition-colors mt-2 cursor-pointer shadow active:scale-95"
                            >
                                Record Expense
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Settle Fund Modal */}
            {showSettleModal && selectedFund && (
                <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
                    <div className="bg-card-dark p-6 rounded-2xl border border-border-main w-full max-w-md shadow-2xl relative">
                        <button 
                            onClick={() => setShowSettleModal(false)}
                            className="absolute right-4 top-4 text-text-muted hover:text-text-main cursor-pointer"
                        >
                            ✕
                        </button>
                        <h3 className="text-lg font-black text-primary mb-4 uppercase tracking-wider">Settle & Close Fund</h3>
                        <p className="text-xs text-text-muted mb-4 pb-2 border-b border-border-main/50">Settling: <span className="text-text-main font-semibold">{selectedFund.title}</span></p>
                        <form onSubmit={handleSettleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-text-muted block mb-1 font-semibold uppercase">Settlement Date *</label>
                                    <input 
                                        type="date" 
                                        required 
                                        className="w-full bg-bg-dark border border-border-main rounded-xl p-2.5 text-sm text-text-main focus:outline-none focus:border-primary cursor-pointer"
                                        value={settleForm.settlement_date}
                                        onChange={e => setSettleForm({...settleForm, settlement_date: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-text-muted block mb-1 font-semibold uppercase">Returned Leftover</label>
                                    <input 
                                        type="number" 
                                        min="0"
                                        step="0.01"
                                        className="w-full bg-bg-dark border border-border-main rounded-xl p-2.5 text-sm text-text-main focus:outline-none focus:border-primary font-mono"
                                        value={settleForm.returned_amount}
                                        onChange={e => setSettleForm({...settleForm, returned_amount: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-text-muted block mb-1 font-semibold uppercase">Exceeded Required</label>
                                    <input 
                                        type="number" 
                                        min="0"
                                        step="0.01"
                                        className="w-full bg-bg-dark border border-border-main rounded-xl p-2.5 text-sm text-text-main focus:outline-none focus:border-primary font-mono"
                                        value={settleForm.additional_amount_required}
                                        onChange={e => setSettleForm({...settleForm, additional_amount_required: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-text-muted block mb-1 font-semibold uppercase">Payment Mode *</label>
                                    <select 
                                        className="w-full bg-bg-dark border border-border-main rounded-xl p-2.5 text-sm text-text-main focus:outline-none focus:border-primary cursor-pointer"
                                        value={settleForm.settlement_payment_mode}
                                        onChange={e => setSettleForm({...settleForm, settlement_payment_mode: e.target.value})}
                                    >
                                        <option value="ACCOUNT">Account</option>
                                        <option value="CASH">Cash</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-text-muted block mb-1 font-semibold uppercase">Settlement Notes *</label>
                                <textarea 
                                    required 
                                    rows={2}
                                    className="w-full bg-bg-dark border border-border-main rounded-xl p-2.5 text-sm text-text-main placeholder-text-muted focus:outline-none focus:border-primary resize-none"
                                    value={settleForm.settlement_notes}
                                    onChange={e => setSettleForm({...settleForm, settlement_notes: e.target.value})}
                                    placeholder="e.g. Leftover returned to sponsor"
                                />
                            </div>
                            <button 
                                type="submit" 
                                className="w-full py-3 bg-primary hover:bg-primary-hover text-black font-extrabold rounded-xl text-sm transition-all mt-2 cursor-pointer shadow active:scale-95"
                            >
                                Finalize Settlement & Close
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FundList;
